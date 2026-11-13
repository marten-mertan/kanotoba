import test from "node:test";
import assert from "node:assert/strict";
import worker from "../backend/src/index.js";

function createEnv(allowedOrigins = "https://app.example") {
  const sampleKanji = {
    id: 1,
    character: "泉",
    source_key: "izumi",
    stroke_count: 9,
    meaning_en: "spring, fountain",
    school_grade: 6,
    radical_character: "⽔",
    radical_order: 109,
    radical_stroke_count: 4,
    radical_name_ja: "みず",
    radical_name_romaji: "mizu",
    radical_meaning_en: "water",
    radical_position_ja: "へん",
    radical_position_romaji: "hen",
    source_dataset: "Kanji alive",
    source_revision: "fixture-test",
  };

  return {
    ALLOWED_ORIGINS: allowedOrigins,
    DB: {
      prepare(sql) {
        return {
          params: [],
          bind(...params) { this.params = params; return this; },
          async first() {
            if (sql.includes("COUNT(*) AS count FROM kanji")) return { count: 1235 };
            if (sql.includes("FROM kanji") && sql.includes("WHERE character = ?")) {
              return this.params[0] === "泉" ? sampleKanji : null;
            }
            throw new Error(`Unexpected SQL in test: ${sql}`);
          },
          async all() {
            if (sql.includes("FROM kanji_readings")) {
              return { results: [
                { reading_type: "kunyomi", kana: "いずみ", romaji: "izumi", sort_order: 1 },
                { reading_type: "onyomi", kana: "セン", romaji: "sen", sort_order: 1 },
              ] };
            }
            if (sql.includes("FROM kanji_examples")) {
              return { results: [{ word: "温泉（おんせん）", meaning_en: "hot spring", sort_order: 1 }] };
            }
            if (sql.includes("FROM quiz_questions")) return { results: [] };
            if (sql.includes("FROM kanji") && sql.includes("LIMIT ? OFFSET ?")) {
              return { results: [{ id: 1, character: "泉", stroke_count: 9, meaning_en: "spring, fountain", school_grade: 6 }] };
            }
            throw new Error(`Unexpected SQL in test: ${sql}`);
          },
        };
      },
    },
  };
}

test("health endpoint returns Worker and database status", async () => {
  const request = new Request("https://api.example/api/public/health", {
    headers: { Origin: "https://app.example" },
  });
  const response = await worker.fetch(request, createEnv());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://app.example");
  assert.deepEqual(body, {
    ok: true,
    service: "kanotoba-api",
    database: "connected",
    kanjiCount: 1235,
  });
});

test("requests from an unlisted browser origin are rejected", async () => {
  const request = new Request("https://api.example/api/public/health", {
    headers: { Origin: "https://untrusted.example" },
  });
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "origin_not_allowed" });
});

test("CORS preflight is answered without touching D1", async () => {
  const request = new Request("https://api.example/api/public/kanji/%E6%B3%89", {
    method: "OPTIONS",
    headers: {
      Origin: "https://app.example",
      "Access-Control-Request-Method": "GET",
    },
  });
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://app.example");
});

test("unknown routes return 404", async () => {
  const request = new Request("https://api.example/api/public/not-a-route");
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "not_found");
});

test("unsupported methods return 405", async () => {
  const request = new Request("https://api.example/api/public/health", { method: "DELETE" });
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, POST, OPTIONS");
});


test("kanji endpoint decodes the character and returns readings", async () => {
  const request = new Request("https://api.example/api/public/kanji/%E6%B3%89");
  const response = await worker.fetch(request, createEnv());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.character, "泉");
  assert.equal(body.meaningEn, "spring, fountain");
  assert.equal(body.readings.kunyomi[0].kana, "いずみ");
  assert.equal(body.readings.onyomi[0].kana, "セン");
  assert.equal(body.examples[0].word, "温泉（おんせん）");
});

test("kanji collection endpoint returns a paginated list", async () => {
  const request = new Request("https://api.example/api/public/kanji?grade=6&limit=10");
  const response = await worker.fetch(request, createEnv());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].character, "泉");
  assert.deepEqual(body.pagination, { limit: 10, offset: 0, returned: 1 });
});


test("grammar detail rejects a non-numeric ID", async () => {
  const request = new Request("https://api.example/api/public/grammar/not-an-id");
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_grammar_id" });
});

test("quiz collection endpoint returns an empty collection when no questions are seeded", async () => {
  const request = new Request("https://api.example/api/public/quiz");
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [], count: 0 });
});

test("quiz endpoint validates the grammar filter", async () => {
  const request = new Request("https://api.example/api/public/quiz?grammarId=invalid");
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_grammar_id" });
});
