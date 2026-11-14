import test from "node:test";
import assert from "node:assert/strict";
import worker from "../backend/src/index.js";

const previewKey = "local-preview-key-0123456789abcdef0123456789";

function makeQuizEnv() {
  return {
    PREVIEW_API_KEY: previewKey,
    DB: {
      prepare(sql) {
        let params = [];
        return {
          bind(...values) { params = values; return this; },
          async first() {
            if (sql.includes("FROM quiz_questions q") && sql.includes("WHERE id = ?")) {
              return params[0] === 7 ? { id: 7, explanation_en: "The pattern expresses possibility.", explanation_ru: "Конструкция выражает возможность." } : null;
            }
            throw new Error(`Unexpected first() SQL: ${sql}`);
          },
          async all() {
            if (sql.includes("FROM quiz_questions q") && sql.includes("ORDER BY RANDOM()")) {
              return { results: [{
                id: 7, grammar_id: 1, question_type: "multiple_choice",
                prompt_ru: "Выберите подходящую конструкцию.", prompt_en: "Choose the suitable pattern.",
                prompt_ja: "明日は雨が ______。", difficulty: "beginner",
                editorial_review_status: sql.includes("<> 'archived'") ? "ai_drafted" : "native_reviewed",
                publication_status: sql.includes("<> 'archived'") ? "draft" : "published", content_tier: "free",
                explanation_en: "The plain form + かもしれない expresses possibility.",
                explanation_ru: "Обычная форма + かもしれない выражает возможность.",
              }] };
            }
            if (sql.includes("SELECT id FROM quiz_options") && sql.includes("is_correct = 1")) return { results: [{ id: 21 }] };
            if (sql.includes("SELECT id, explanation_en, explanation_ru FROM quiz_options")) {
              return { results: [{ id: 21, explanation_en: "Correct pattern.", explanation_ru: "Правильная конструкция." }] };
            }
            if (sql.includes("FROM quiz_options") && sql.includes("IN (")) {
              return { results: [
                { id: 21, question_id: 7, option_text_ja: "降るかもしれない", is_correct: 1, explanation_en: "Correct.", explanation_ru: "Верно.", sort_order: 1 },
                { id: 22, question_id: 7, option_text_ja: "降りたい", is_correct: 0, explanation_en: "Desire, not possibility.", explanation_ru: "Желание, а не возможность.", sort_order: 2 },
              ] };
            }
            throw new Error(`Unexpected all() SQL: ${sql}`);
          },
        };
      },
    },
  };
}

test("public quiz GET does not expose correctness or option feedback", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/public/quiz?grammarId=1"), makeQuizEnv());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.items[0].promptEn, "Choose the suitable pattern.");
  assert.equal(body.items[0].promptRu, "Выберите подходящую конструкцию.");
  assert.equal(body.items[0].options.length, 2);
  assert.equal("isCorrect" in body.items[0].options[0], false);
  assert.equal("explanationEn" in body.items[0].options[0], false);
  assert.equal("explanationRu" in body.items[0].options[0], false);
});

test("preview quiz GET includes drafts, correctness and bilingual feedback", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/public/quiz?grammarId=1&preview=1", {
    headers: { "X-Kanotoba-Preview-Key": previewKey },
  }), makeQuizEnv());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.previewMode, true);
  assert.equal(body.items[0].publicationStatus, "draft");
  assert.equal(body.items[0].options[0].isCorrect, true);
  assert.equal(body.items[0].options[0].explanationEn, "Correct.");
  assert.equal(body.items[0].options[0].explanationRu, "Верно.");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("quiz answer endpoint evaluates submitted IDs and returns bilingual feedback", async () => {
  const request = new Request("https://api.example/api/public/quiz/7/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIds: [21] }),
  });
  const response = await worker.fetch(request, makeQuizEnv());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.correct, true);
  assert.deepEqual(body.correctOptionIds, [21]);
  assert.equal(body.optionFeedback[0].explanationEn, "Correct pattern.");
  assert.equal(body.optionFeedback[0].explanationRu, "Правильная конструкция.");
});
