import test from "node:test";
import assert from "node:assert/strict";
import worker from "../backend/src/index.js";

const previewKey = "local-preview-key-0123456789abcdef0123456789";

function makeGrammarEnv() {
  const basePattern = {
    id: 1, slug: "kamo-shirenai", pattern: "〜かもしれない", reading: "〜かもしれない",
    romaji: "kamo shirenai", meaning_en: "might; maybe", meaning_ru: "возможно; может быть",
    jlpt_level: "N4", jlpt_level_basis: "community_estimate_not_official", register: '["neutral"]',
    register_label_en: "Neutral / conversational", register_label_ru: "Нейтральный / разговорный",
    explanation_ru: "Выражает возможность.", explanation_en: "Expresses possibility.",
    formation_casual_en: "Plain form + かもしれない", formation_casual_ru: "Обычная форма + かもしれない",
    formation_polite_en: "Plain form + かもしれません", formation_polite_ru: "Обычная форма + かもしれません",
    connection_summary_en: "Plain clause + かもしれない", connection_summary_ru: "Обычная форма + かもしれない",
    notes_en: "A possibility, not a certainty.", notes_ru: "Возможность, а не уверенность.",
    tags_json: '["uncertainty"]', tag_labels_json: '[{"slug":"uncertainty","label_en":"Uncertainty","label_ru":"Неуверенность"}]',
    learning_priority: 1, is_core: 1, content_tier: "free", publication_status: "published", editorial_review_status: "native_reviewed",
    category_slug: "possibility-opinion", category_name_en: "Possibility & opinions", category_name_ru: "Возможность и мнения",
  };
  return {
    PREVIEW_API_KEY: previewKey,
    ALLOWED_ORIGINS: "https://app.example",
    DB: {
      prepare(sql) {
        let params = [];
        return {
          bind(...values) { params = values; return this; },
          async first() {
            if (sql.includes("FROM grammar_patterns p") && sql.includes("WHERE p.id = ?")) {
              if (params[0] !== 1) return null;
              return { ...basePattern, publication_status: sql.includes("<> 'archived'") ? "draft" : "published" };
            }
            throw new Error(`Unexpected first() SQL: ${sql}`);
          },
          async all() {
            if (sql.includes("FROM grammar_patterns p") && sql.includes("LEFT JOIN grammar_categories")) {
              return { results: [{ ...basePattern, publication_status: sql.includes("<> 'archived'") ? "draft" : "published" }] };
            }
            if (sql.includes("FROM grammar_examples")) return { results: [{
              japanese: "明日は少し遅れるかもしれない。", romaji: null,
              translation_en: "I might be a little late tomorrow.", translation_ru: "Возможно, завтра я немного опоздаю.",
              register: "casual", context_note_en: "A cautious prediction.", context_note_ru: "Осторожное предположение.",
              register_label_en: "Casual", register_label_ru: "Неформальный", sort_order: 1,
            }] };
            if (sql.includes("FROM grammar_relations")) return { results: [] };
            if (sql.includes("FROM grammar_senses")) return { results: [{ meaning_en: "might", meaning_ru: "возможно", nuance_en: "Uncertain possibility.", nuance_ru: "Неуверенная возможность.", sort_order: 1 }] };
            if (sql.includes("FROM grammar_connections")) return { results: [{
              target_type: "clause_or_verb", preceding_form_en: "Plain form", preceding_form_ru: "Обычная форма",
              result_pattern: "〜かもしれない", rule_ru: "Обычная форма + かもしれない", rule_en: "Plain form + かもしれない", sort_order: 1,
            }] };
            if (sql.includes("FROM content_provenance")) return { results: [{
              source_name: "Kanotoba Editorial Content", source_version: "2.0.0", source_url: null,
              license_identifier: "Proprietary — to be confirmed", license_url: null,
              attribution_text: "Original draft content.", relationship: "original", source_record_ref: null,
              modification_note: "Original Kanotoba writing.",
            }] };
            throw new Error(`Unexpected all() SQL: ${sql}`);
          },
        };
      },
    },
  };
}

test("public grammar list returns localized fields and editorial status", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/public/grammar?core=true"), makeGrammarEnv());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].meaningEn, "might; maybe");
  assert.equal(body.items[0].meaningRu, "возможно; может быть");
  assert.equal(body.items[0].category.nameEn, "Possibility & opinions");
  assert.equal(body.items[0].category.nameRu, "Возможность и мнения");
  assert.deepEqual(body.items[0].tags, ["uncertainty"]);
});

test("grammar detail returns bilingual nested fields and source attribution", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/public/grammar/1"), makeGrammarEnv());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.pattern, "〜かもしれない");
  assert.equal(body.senses[0].nuanceEn, "Uncertain possibility.");
  assert.equal(body.senses[0].nuanceRu, "Неуверенная возможность.");
  assert.equal(body.connections[0].precedingFormEn, "Plain form");
  assert.equal(body.connections[0].precedingFormRu, "Обычная форма");
  assert.equal(body.examples[0].contextNoteEn, "A cautious prediction.");
  assert.equal(body.examples[0].contextNoteRu, "Осторожное предположение.");
  assert.equal(body.sources[0].relationship, "original");
});

test("preview access can read drafts only with the preview header key", async () => {
  const denied = await worker.fetch(new Request("https://api.example/api/public/grammar?preview=1"), makeGrammarEnv());
  assert.equal(denied.status, 403);
  const allowed = await worker.fetch(new Request("https://api.example/api/public/grammar?preview=1", {
    headers: { "X-Kanotoba-Preview-Key": previewKey },
  }), makeGrammarEnv());
  const body = await allowed.json();
  assert.equal(allowed.status, 200);
  assert.equal(body.previewMode, true);
  assert.equal(body.items[0].publicationStatus, "draft");
  assert.equal(allowed.headers.get("Cache-Control"), "no-store");
});
