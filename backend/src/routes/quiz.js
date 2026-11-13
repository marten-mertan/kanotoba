import { json, parsePositiveInteger, parsePathInteger } from "../lib/http.js";

async function listQuiz(db, url) {
  const grammarIdValue = url.searchParams.get("grammarId");
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 10, 30);
  let sql = `
    SELECT id, grammar_id, question_type, prompt_ru, prompt_en, prompt_ja, difficulty
    FROM quiz_questions
    WHERE is_active = 1
  `;
  const params = [];

  if (grammarIdValue !== null) {
    const grammarId = parsePathInteger(grammarIdValue);
    if (!grammarId) return { error: "invalid_grammar_id", status: 400 };
    sql += " AND grammar_id = ?";
    params.push(grammarId);
  }

  sql += " ORDER BY RANDOM() LIMIT ?";
  params.push(limit);

  const questionsResult = await db.prepare(sql).bind(...params).all();
  const questions = questionsResult.results || [];
  if (questions.length === 0) return { items: [], count: 0 };

  const questionIds = questions.map((question) => question.id);
  const placeholders = questionIds.map(() => "?").join(", ");
  const optionsResult = await db.prepare(`
    SELECT id, question_id, option_text, sort_order
    FROM quiz_options
    WHERE question_id IN (${placeholders})
    ORDER BY question_id, sort_order
  `).bind(...questionIds).all();

  const optionsByQuestion = new Map();
  for (const option of optionsResult.results || []) {
    const options = optionsByQuestion.get(option.question_id) || [];
    options.push({ id: option.id, text: option.option_text, order: option.sort_order });
    optionsByQuestion.set(option.question_id, options);
  }

  const items = questions.map((question) => ({
    id: question.id,
    grammarId: question.grammar_id,
    questionType: question.question_type,
    promptRu: question.prompt_ru,
    promptEn: question.prompt_en,
    promptJa: question.prompt_ja,
    difficulty: question.difficulty,
    options: optionsByQuestion.get(question.id) || [],
  }));

  return { items, count: items.length };
}

async function checkAnswer(request, db, questionId) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: "content_type_must_be_application_json", status: 415 };
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 10_000) {
    return { error: "request_body_too_large", status: 413 };
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return { error: "invalid_json", status: 400 };
  }

  if (!body || !Array.isArray(body.optionIds) || body.optionIds.length < 1 || body.optionIds.length > 10) {
    return { error: "invalid_option_ids", status: 400 };
  }

  const submittedIds = [...new Set(body.optionIds.map(Number))];
  if (submittedIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return { error: "invalid_option_ids", status: 400 };
  }

  const question = await db.prepare(`
    SELECT id, explanation_ru
    FROM quiz_questions
    WHERE id = ? AND is_active = 1
    LIMIT 1
  `).bind(questionId).first();
  if (!question) return { error: "question_not_found", status: 404 };

  const placeholders = submittedIds.map(() => "?").join(", ");
  const [correctResult, submittedResult] = await Promise.all([
    db.prepare(`
      SELECT id FROM quiz_options
      WHERE question_id = ? AND is_correct = 1
    `).bind(questionId).all(),
    db.prepare(`
      SELECT id FROM quiz_options
      WHERE question_id = ? AND id IN (${placeholders})
    `).bind(questionId, ...submittedIds).all(),
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
    explanationRu: question.explanation_ru,
    correctOptionIds: correctIds,
  };
}

export async function handleQuiz({ request, env, url, segments, method, corsHeaders }) {
  if (method === "GET" && segments.length === 1) {
    const result = await listQuiz(env.DB, url);
    if (result.error) return json({ error: result.error }, result.status, corsHeaders);
    return json(result, 200, { ...corsHeaders, "Cache-Control": "no-store" });
  }

  if (method === "POST" && segments.length === 3 && segments[2] === "answer") {
    const questionId = parsePathInteger(segments[1]);
    if (!questionId) return json({ error: "invalid_question_id" }, 400, corsHeaders);

    const result = await checkAnswer(request, env.DB, questionId);
    if (result.error) {
      const { status, ...error } = result;
      return json(error, status, corsHeaders);
    }

    return json(result, 200, { ...corsHeaders, "Cache-Control": "no-store" });
  }

  return null;
}
