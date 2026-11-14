import { json, parsePositiveInteger, parsePathInteger } from "../lib/http.js";
import { resolvePreviewMode } from "../lib/preview-access.js";

function visibilityWhere(alias, preview) {
  return preview
    ? `${alias}.publication_status <> 'archived'`
    : `${alias}.publication_status = 'published'
       AND ${alias}.content_tier = 'free'
       AND ${alias}.editorial_review_status IN ('editorially_reviewed', 'native_reviewed')`;
}

async function listQuiz(db, url, preview) {
  const grammarIdValue = url.searchParams.get("grammarId");
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 10, 30);
  let sql = `
    SELECT q.id, q.grammar_id, q.question_type, q.prompt_ru, q.prompt_en, q.prompt_ja,
           q.explanation_ru, q.explanation_en, q.difficulty, q.editorial_review_status,
           q.publication_status, q.content_tier
    FROM quiz_questions q
    WHERE q.is_active = 1 AND ${visibilityWhere("q", preview)}
      AND (q.grammar_id IS NULL OR EXISTS (
        SELECT 1 FROM grammar_patterns gp
        WHERE gp.id = q.grammar_id AND ${visibilityWhere("gp", preview)}
      ))
  `;
  const params = [];

  if (grammarIdValue !== null) {
    const grammarId = parsePathInteger(grammarIdValue);
    if (!grammarId) return { error: "invalid_grammar_id", status: 400 };
    sql += " AND q.grammar_id = ?";
    params.push(grammarId);
  }

  sql += " ORDER BY RANDOM() LIMIT ?";
  params.push(limit);

  const questionsResult = await db.prepare(sql).bind(...params).all();
  const questions = questionsResult.results || [];
  if (questions.length === 0) return preview ? { items: [], count: 0, previewMode: true } : { items: [], count: 0 };

  const questionIds = questions.map((question) => question.id);
  const placeholders = questionIds.map(() => "?").join(", ");
  const optionsResult = await db.prepare(`
    SELECT id, question_id, COALESCE(option_text_ja, option_text) AS option_text_ja,
           is_correct, explanation_en, explanation_ru, sort_order
    FROM quiz_options
    WHERE question_id IN (${placeholders})
    ORDER BY question_id, sort_order
  `).bind(...questionIds).all();

  const optionsByQuestion = new Map();
  for (const option of optionsResult.results || []) {
    const options = optionsByQuestion.get(option.question_id) || [];
    const publicOption = { id: option.id, textJa: option.option_text_ja, order: option.sort_order };
    if (preview) {
      publicOption.isCorrect = Boolean(option.is_correct);
      publicOption.explanationEn = option.explanation_en;
      publicOption.explanationRu = option.explanation_ru;
    }
    options.push(publicOption);
    optionsByQuestion.set(option.question_id, options);
  }

  const items = questions.map((question) => {
    const item = {
      id: question.id,
      grammarId: question.grammar_id,
      questionType: question.question_type,
      promptEn: question.prompt_en,
      promptRu: question.prompt_ru,
      promptJa: question.prompt_ja,
      difficulty: question.difficulty,
      editorialReviewStatus: question.editorial_review_status,
      publicationStatus: question.publication_status,
      contentTier: question.content_tier,
      options: optionsByQuestion.get(question.id) || [],
    };
    if (preview) {
      item.explanationEn = question.explanation_en;
      item.explanationRu = question.explanation_ru;
    }
    return item;
  });

  const response = { items, count: items.length };
  if (preview) response.previewMode = true;
  return response;
}

async function checkAnswer(request, db, questionId, preview) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: "content_type_must_be_application_json", status: 415 };
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 10_000) return { error: "request_body_too_large", status: 413 };

  let body;
  try { body = await request.json(); } catch { return { error: "invalid_json", status: 400 }; }
  if (!body || !Array.isArray(body.optionIds) || body.optionIds.length < 1 || body.optionIds.length > 10) {
    return { error: "invalid_option_ids", status: 400 };
  }

  const submittedIds = [...new Set(body.optionIds.map(Number))];
  if (submittedIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return { error: "invalid_option_ids", status: 400 };
  }

  const question = await db.prepare(`
    SELECT id, explanation_en, explanation_ru
    FROM quiz_questions q
    WHERE id = ? AND is_active = 1 AND ${visibilityWhere("q", preview)}
      AND (grammar_id IS NULL OR EXISTS (
        SELECT 1 FROM grammar_patterns gp
        WHERE gp.id = q.grammar_id AND ${visibilityWhere("gp", preview)}
      ))
    LIMIT 1
  `).bind(questionId).first();
  if (!question) return { error: "question_not_found", status: 404 };

  const placeholders = submittedIds.map(() => "?").join(", ");
  const [correctResult, submittedResult] = await Promise.all([
    db.prepare(`SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1`)
      .bind(questionId).all(),
    db.prepare(`SELECT id, explanation_en, explanation_ru FROM quiz_options
      WHERE question_id = ? AND id IN (${placeholders})`)
      .bind(questionId, ...submittedIds).all(),
  ]);

  const correctIds = (correctResult.results || []).map((row) => row.id).sort((a, b) => a - b);
  const validSubmittedIds = (submittedResult.results || []).map((row) => row.id).sort((a, b) => a - b);
  const normalizedSubmittedIds = [...submittedIds].sort((a, b) => a - b);
  if (validSubmittedIds.length !== normalizedSubmittedIds.length) {
    return { error: "option_does_not_belong_to_question", status: 400 };
  }

  return {
    correct: correctIds.length > 0
      && correctIds.length === normalizedSubmittedIds.length
      && correctIds.every((id, index) => id === normalizedSubmittedIds[index]),
    explanationEn: question.explanation_en,
    explanationRu: question.explanation_ru,
    correctOptionIds: correctIds,
    optionFeedback: (submittedResult.results || []).map((row) => ({
      optionId: row.id,
      explanationEn: row.explanation_en,
      explanationRu: row.explanation_ru,
    })),
    previewMode: preview,
  };
}

export async function handleQuiz({ request, env, url, segments, method, corsHeaders }) {
  const access = await resolvePreviewMode(request, url, env);
  if (access.error) return json({ error: access.error }, access.status, { ...corsHeaders, "Cache-Control": "no-store" });
  const preview = access.preview;
  const cacheHeaders = preview ? { ...corsHeaders, "Cache-Control": "no-store" } : corsHeaders;

  if (method === "GET" && segments.length === 1) {
    const result = await listQuiz(env.DB, url, preview);
    if (result.error) return json({ error: result.error }, result.status, cacheHeaders);
    return json(result, 200, cacheHeaders);
  }

  if (method === "POST" && segments.length === 3 && segments[2] === "answer") {
    const questionId = parsePathInteger(segments[1]);
    if (!questionId) return json({ error: "invalid_question_id" }, 400, corsHeaders);
    const result = await checkAnswer(request, env.DB, questionId, preview);
    if (result.error) {
      const { status, ...error } = result;
      return json(error, status, cacheHeaders);
    }
    return json(result, 200, cacheHeaders);
  }

  return null;
}
