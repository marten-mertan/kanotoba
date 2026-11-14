import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const datasetPath = resolve("database/content/grammar-daily-core-v2-bilingual.json");
const dataset = JSON.parse(await readFile(datasetPath, "utf8"));

function nonEmpty(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.trim().length > 0, `${label} must not be empty`);
}

test("v2 grammar dataset contains 30–50 unique unpublished patterns", () => {
  assert.equal(dataset.dataset.schema_version, "2.0.0");
  assert.equal(dataset.patterns.length, 47);
  assert.equal(new Set(dataset.patterns.map((item) => item.slug)).size, dataset.patterns.length);
  assert.equal(new Set(dataset.patterns.map((item) => item.id)).size, dataset.patterns.length);
  assert.ok(dataset.patterns.every((item) => item.publication_status === "draft"));
  assert.ok(dataset.patterns.every((item) => item.editorial_review_status === "ai_drafted"));
});

test("dataset metadata and categories are bilingual", () => {
  for (const field of ["title_en", "title_ru", "description_en", "description_ru", "jlpt_notice_en", "jlpt_notice_ru", "review_policy_en", "review_policy_ru"]) {
    nonEmpty(dataset.dataset[field], `dataset.${field}`);
  }
  for (const category of dataset.categories) {
    nonEmpty(category.name_en, `${category.slug}.name_en`);
    nonEmpty(category.name_ru, `${category.slug}.name_ru`);
  }
});

test("all learner-facing pattern descriptions have explicit English and Russian values", () => {
  const fields = [
    "meaning_en", "meaning_ru", "explanation_en", "explanation_ru",
    "formation_casual_en", "formation_casual_ru", "formation_polite_en", "formation_polite_ru",
    "notes_en", "notes_ru", "connection_summary_en", "connection_summary_ru",
    "register_label_en", "register_label_ru",
  ];
  for (const pattern of dataset.patterns) {
    for (const field of fields) nonEmpty(pattern[field], `${pattern.slug}.${field}`);
  }
});

test("nested senses, connections, examples, relations and quizzes are bilingual", () => {
  for (const pattern of dataset.patterns) {
    for (const sense of pattern.senses) {
      for (const field of ["meaning_en", "meaning_ru", "nuance_en", "nuance_ru"]) nonEmpty(sense[field], `${pattern.slug}.sense.${field}`);
    }
    for (const connection of pattern.connections) {
      for (const field of ["preceding_form_en", "preceding_form_ru", "rule_en", "rule_ru"]) nonEmpty(connection[field], `${pattern.slug}.connection.${field}`);
    }
    assert.ok(pattern.examples.length >= 2, `${pattern.slug}: expected two examples`);
    for (const example of pattern.examples) {
      for (const field of ["japanese", "translation_en", "translation_ru", "context_note_en", "context_note_ru", "register_label_en", "register_label_ru"]) nonEmpty(example[field], `${pattern.slug}.example.${field}`);
    }
    const quiz = pattern.quiz;
    for (const field of ["prompt_en", "prompt_ru", "prompt_ja", "explanation_en", "explanation_ru"]) nonEmpty(quiz[field], `${pattern.slug}.quiz.${field}`);
    assert.equal(quiz.options.length, 4, pattern.slug);
    assert.equal(quiz.options.filter((option) => option.correct).length, 1, pattern.slug);
    for (const option of quiz.options) {
      for (const field of ["text_ja", "explanation_en", "explanation_ru"]) nonEmpty(option[field], `${pattern.slug}.option.${field}`);
    }
  }
  for (const relation of dataset.relations) {
    nonEmpty(relation.note_en, `relation ${relation.from}->${relation.to}.note_en`);
    nonEmpty(relation.note_ru, `relation ${relation.from}->${relation.to}.note_ru`);
  }
});
