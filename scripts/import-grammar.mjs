import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectEnv } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = await loadProjectEnv();
const inputPath = resolve(root, env.KANOTOBA_GRAMMAR_SOURCE_PATH || "database/content/grammar-daily-core-v2-bilingual.json");
const outputPath = resolve(root, env.KANOTOBA_GRAMMAR_SEED_PATH || "database/seeds/grammar-seed.sql");

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insert(table, columns, values, conflictSql = "") {
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.map(sql).join(", ")})${conflictSql};`;
}

function requireText(object, key, label) {
  if (typeof object[key] !== "string" || !object[key].trim()) {
    throw new Error(`${label}: missing non-empty ${key}`);
  }
}

const dataset = JSON.parse(await readFile(inputPath, "utf8"));
if (dataset.dataset?.schema_version !== "2.0.0" || dataset.dataset?.version !== "2.0.0") {
  throw new Error("Expected grammar dataset schema/version 2.0.0. Use grammar-daily-core-v2-bilingual.json.");
}
if (!Array.isArray(dataset.patterns) || dataset.patterns.length < 30 || dataset.patterns.length > 50) {
  throw new Error("Grammar dataset must contain between 30 and 50 patterns.");
}

const patternRequired = [
  "slug", "pattern", "meaning_en", "meaning_ru", "explanation_en", "explanation_ru",
  "formation_casual_en", "formation_casual_ru", "formation_polite_en", "formation_polite_ru",
  "notes_en", "notes_ru", "connection_summary_en", "connection_summary_ru",
  "register_label_en", "register_label_ru", "category_slug",
];
const slugSet = new Set();
const idSet = new Set();

for (const pattern of dataset.patterns) {
  if (!Number.isSafeInteger(pattern.id) || pattern.id < 1) throw new Error(`${pattern.slug || "pattern"}: id must be a positive integer.`);
  for (const field of patternRequired) requireText(pattern, field, pattern.slug || "pattern");
  if (slugSet.has(pattern.slug)) throw new Error(`Duplicate grammar slug: ${pattern.slug}`);
  if (idSet.has(pattern.id)) throw new Error(`Duplicate grammar id: ${pattern.id}`);
  slugSet.add(pattern.slug);
  idSet.add(pattern.id);
  if (!Array.isArray(pattern.register) || !pattern.register.length) throw new Error(`${pattern.slug}: register must be a non-empty array of codes.`);
  if (!pattern.quiz || typeof pattern.quiz !== "object") throw new Error(`${pattern.slug}: quiz must be an object.`);
  if (!Array.isArray(pattern.tags) || !Array.isArray(pattern.tag_labels)) throw new Error(`${pattern.slug}: tags and tag_labels must be arrays.`);
  if (!Array.isArray(pattern.examples) || pattern.examples.length < 2) throw new Error(`${pattern.slug}: expected at least two examples.`);
  if (!Array.isArray(pattern.senses) || pattern.senses.length < 1) throw new Error(`${pattern.slug}: expected at least one sense.`);
  if (!Array.isArray(pattern.connections) || pattern.connections.length < 1) throw new Error(`${pattern.slug}: expected at least one connection.`);

  for (const [index, example] of pattern.examples.entries()) {
    for (const field of ["japanese", "translation_en", "translation_ru", "context_note_en", "context_note_ru", "register_label_en", "register_label_ru"]) {
      requireText(example, field, `${pattern.slug}.examples[${index}]`);
    }
  }
  for (const [index, sense] of pattern.senses.entries()) {
    for (const field of ["meaning_en", "meaning_ru", "nuance_en", "nuance_ru"]) {
      requireText(sense, field, `${pattern.slug}.senses[${index}]`);
    }
  }
  for (const [index, connection] of pattern.connections.entries()) {
    for (const field of ["preceding_form_en", "preceding_form_ru", "rule_en", "rule_ru", "result_pattern"]) {
      requireText(connection, field, `${pattern.slug}.connections[${index}]`);
    }
  }

  const quiz = pattern.quiz;
  for (const field of ["question_key", "prompt_en", "prompt_ru", "prompt_ja", "explanation_en", "explanation_ru", "question_type"]) {
    requireText(quiz, field, `${pattern.slug}.quiz`);
  }
  if (!Array.isArray(quiz.options) || quiz.options.length !== 4) throw new Error(`${pattern.slug}: quiz must have four options.`);
  if (quiz.options.filter((option) => option.correct).length !== 1) throw new Error(`${pattern.slug}: quiz must have exactly one correct option.`);
  for (const [index, option] of quiz.options.entries()) {
    for (const field of ["option_key", "text_ja", "explanation_en", "explanation_ru"]) {
      requireText(option, field, `${pattern.slug}.quiz.options[${index}]`);
    }
  }

  if (pattern.publication_status !== "draft" || pattern.editorial_review_status !== "ai_drafted") {
    throw new Error(`${pattern.slug}: starter import must remain draft + ai_drafted until human review.`);
  }
  if (!new Set(["free", "premium"]).has(pattern.content_tier)) throw new Error(`${pattern.slug}: invalid content_tier.`);
}

for (const category of dataset.categories || []) {
  requireText(category, "name_en", `category ${category.slug}`);
  requireText(category, "name_ru", `category ${category.slug}`);
}
for (const relation of dataset.relations || []) {
  requireText(relation, "note_en", `relation ${relation.from}->${relation.to}`);
  requireText(relation, "note_ru", `relation ${relation.from}->${relation.to}`);
}

const sources = [
  {
    source_key: "kanotoba-editorial-v2",
    source_name: "Kanotoba Editorial Content",
    source_version: dataset.dataset.version,
    source_url: null,
    creator: "Kanotoba",
    license_identifier: "Proprietary — final terms to be confirmed",
    license_url: null,
    license_status: "not_assessed",
    usage_scope: "Original Kanotoba draft explanations, translations, examples and quizzes. Confirm contributor ownership and final terms before commercial launch.",
    attribution_text: "Original educational content prepared for Kanotoba; final licensing terms to be confirmed by the project owner.",
    notes: "AI-assisted editorial drafts. Not native-reviewed. External sources listed in dataset metadata were consulted as references; their prose and example sentences are not imported.",
    reviewed_at: null,
  },
  {
    source_key: "ninjal-bunkei-2026-01",
    source_name: "NINJAL Nihongo Bunkei Database",
    source_version: "2026.01",
    source_url: "https://repository.ninjal.ac.jp/records/2000610",
    creator: "NINJAL Research Department",
    license_identifier: null,
    license_url: null,
    license_status: "verify_before_redistribution",
    usage_scope: "reference_only; no NINJAL prose or examples are redistributed in this content pack",
    attribution_text: "Reference consulted: 日本語文型データベース（バージョン2026.01）, NINJAL Research Department.",
    notes: "The exact file-level license of the 2026.01 archive must be verified before redistributing any source material.",
    reviewed_at: null,
  },
  {
    source_key: "openjlpt-main",
    source_name: "OpenJLPT",
    source_version: "main",
    source_url: "https://github.com/evanclan/OpenJLPT",
    creator: "Evan Clan and contributors",
    license_identifier: "CC BY-SA 4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    license_status: "verified",
    usage_scope: "reference_only; no OpenJLPT explanations or examples are copied into this pack",
    attribution_text: "OpenJLPT, https://github.com/evanclan/OpenJLPT, licensed under CC BY-SA 4.0.",
    notes: "Consulted only for coverage and approximate JLPT study grouping.",
    reviewed_at: "2026-11-14",
  },
  {
    source_key: "yokubi-main",
    source_name: "Yokubi — The Common Grammar Guide",
    source_version: "main",
    source_url: "https://yoku.bi/",
    creator: "Morgawr and Yokubi contributors",
    license_identifier: "CC BY 4.0",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    license_status: "verified",
    usage_scope: "reference_only; no Yokubi prose or examples are copied into this pack",
    attribution_text: "Yokubi — The Common Grammar Guide, https://yoku.bi/, licensed under CC BY 4.0.",
    notes: "Consulted as a reference for conversational usage and grammar grouping.",
    reviewed_at: "2026-11-14",
  },
];

const lines = [
  "-- Generated by scripts/import-grammar.mjs. Do not edit by hand.",
  `-- Dataset: ${dataset.dataset.id} v${dataset.dataset.version}`,
  "PRAGMA foreign_keys = ON;",
  "",
];

for (const source of sources) {
  lines.push(insert("content_sources", [
    "source_key", "source_name", "source_version", "source_url", "creator", "license_identifier",
    "license_url", "license_status", "usage_scope", "attribution_text", "reviewed_at", "notes",
  ], [
    source.source_key, source.source_name, source.source_version, source.source_url, source.creator,
    source.license_identifier, source.license_url, source.license_status, source.usage_scope,
    source.attribution_text, source.reviewed_at, source.notes,
  ], ` ON CONFLICT(source_key) DO UPDATE SET
      source_name=excluded.source_name, source_version=excluded.source_version,
      source_url=excluded.source_url, creator=excluded.creator,
      license_identifier=excluded.license_identifier, license_url=excluded.license_url,
      license_status=excluded.license_status, usage_scope=excluded.usage_scope,
      attribution_text=excluded.attribution_text, reviewed_at=excluded.reviewed_at,
      notes=excluded.notes`));
}

function addProvenance(type, key, sourceKey, relationship, modification, attribution, sourceRef = null) {
  lines.push(insert("content_provenance", [
    "content_type", "content_key", "source_key", "relationship", "source_record_ref", "modification_note", "attribution_text",
  ], [type, key, sourceKey, relationship, sourceRef, modification, attribution],
  " ON CONFLICT(content_type, content_key, source_key, relationship) DO NOTHING"));
}

addProvenance("grammar_dataset", dataset.dataset.id, "kanotoba-editorial-v2", "original",
  "Original Kanotoba bilingual dataset. AI-assisted draft; pending human Japanese-language review.",
  "Original Kanotoba editorial content.");
for (const sourceKey of ["ninjal-bunkei-2026-01", "openjlpt-main", "yokubi-main"]) {
  addProvenance("grammar_dataset", dataset.dataset.id, sourceKey, "reference_consulted",
    "Consulted as a reference for grammar coverage and grouping. No source prose or example sentences copied.", null);
}

for (const category of dataset.categories) {
  lines.push(insert("grammar_categories", ["slug", "name_en", "name_ru", "sort_order"],
    [category.slug, category.name_en, category.name_ru, category.sort_order],
    ` ON CONFLICT(slug) DO UPDATE SET name_en=excluded.name_en, name_ru=excluded.name_ru, sort_order=excluded.sort_order`));
  addProvenance("grammar_category", category.slug, "kanotoba-editorial-v2", "original",
    "Category name and grouping written for Kanotoba.", "Original Kanotoba editorial content.");
}

for (const pattern of dataset.patterns) {
  const registerJson = JSON.stringify(pattern.register);
  const tagsJson = JSON.stringify(pattern.tags);
  const tagLabelsJson = JSON.stringify(pattern.tag_labels);
  const patternColumns = [
    "id", "slug", "pattern", "romaji", "meaning_en", "meaning_ru", "jlpt_level", "category_id", "register",
    "explanation_ru", "formation_casual", "formation_polite", "notes_ru", "reading", "explanation_en",
    "formation_summary", "tags_json", "learning_priority", "is_core", "content_tier", "publication_status",
    "jlpt_level_basis", "editorial_version", "reviewed_at", "editorial_review_status",
    "formation_casual_en", "formation_casual_ru", "formation_polite_en", "formation_polite_ru", "notes_en",
    "connection_summary_en", "connection_summary_ru", "register_label_en", "register_label_ru", "tag_labels_json",
  ];
  const patternValues = [
    pattern.id, pattern.slug, pattern.pattern, pattern.romaji, pattern.meaning_en, pattern.meaning_ru,
    pattern.jlpt_level, null, registerJson, pattern.explanation_ru, pattern.formation_casual_ru,
    pattern.formation_polite_ru, pattern.notes_ru, pattern.reading, pattern.explanation_en,
    pattern.connection_summary_ru, tagsJson, pattern.learning_priority, pattern.is_core,
    pattern.content_tier, pattern.publication_status, pattern.jlpt_level_basis, dataset.dataset.version,
    null, pattern.editorial_review_status, pattern.formation_casual_en, pattern.formation_casual_ru,
    pattern.formation_polite_en, pattern.formation_polite_ru, pattern.notes_en,
    pattern.connection_summary_en, pattern.connection_summary_ru, pattern.register_label_en,
    pattern.register_label_ru, tagLabelsJson,
  ];
  lines.push(insert("grammar_patterns", patternColumns, patternValues, ` ON CONFLICT(slug) DO UPDATE SET
      pattern=excluded.pattern, romaji=excluded.romaji, meaning_en=excluded.meaning_en,
      meaning_ru=excluded.meaning_ru, jlpt_level=excluded.jlpt_level,
      register=excluded.register, explanation_ru=excluded.explanation_ru,
      formation_casual=excluded.formation_casual, formation_polite=excluded.formation_polite,
      notes_ru=excluded.notes_ru, reading=excluded.reading, explanation_en=excluded.explanation_en,
      formation_summary=excluded.formation_summary, tags_json=excluded.tags_json,
      learning_priority=excluded.learning_priority, is_core=excluded.is_core,
      content_tier=excluded.content_tier, publication_status=excluded.publication_status,
      jlpt_level_basis=excluded.jlpt_level_basis, editorial_version=excluded.editorial_version,
      reviewed_at=excluded.reviewed_at, editorial_review_status=excluded.editorial_review_status,
      formation_casual_en=excluded.formation_casual_en, formation_casual_ru=excluded.formation_casual_ru,
      formation_polite_en=excluded.formation_polite_en, formation_polite_ru=excluded.formation_polite_ru,
      notes_en=excluded.notes_en,
      connection_summary_en=excluded.connection_summary_en, connection_summary_ru=excluded.connection_summary_ru,
      register_label_en=excluded.register_label_en, register_label_ru=excluded.register_label_ru,
      tag_labels_json=excluded.tag_labels_json, category_id=(SELECT id FROM grammar_categories WHERE slug=${sql(pattern.category_slug)}),
      updated_at=CURRENT_TIMESTAMP`));
  lines.push(`UPDATE grammar_patterns SET category_id=(SELECT id FROM grammar_categories WHERE slug=${sql(pattern.category_slug)}) WHERE slug=${sql(pattern.slug)};`);
  addProvenance("grammar_pattern", pattern.slug, "kanotoba-editorial-v2", "original",
    "Original Kanotoba explanation, translations and formation notes.", "Original Kanotoba editorial content.");

  for (const sense of pattern.senses) {
    lines.push(`INSERT INTO grammar_senses (sense_key, grammar_id, meaning_en, meaning_ru, nuance_ru, sort_order, nuance_en)
      SELECT ${sql(sense.sense_key)}, id, ${sql(sense.meaning_en)}, ${sql(sense.meaning_ru)}, ${sql(sense.nuance_ru)}, ${sql(sense.sort_order)}, ${sql(sense.nuance_en)}
      FROM grammar_patterns WHERE slug=${sql(pattern.slug)}
      ON CONFLICT(sense_key) DO UPDATE SET grammar_id=excluded.grammar_id,
        meaning_en=excluded.meaning_en, meaning_ru=excluded.meaning_ru,
        nuance_ru=excluded.nuance_ru, nuance_en=excluded.nuance_en, sort_order=excluded.sort_order;`);
    addProvenance("grammar_sense", sense.sense_key, "kanotoba-editorial-v2", "original",
      "Original bilingual sense description and nuance written for Kanotoba.", "Original Kanotoba editorial content.");
  }

  for (const connection of pattern.connections) {
    lines.push(`INSERT INTO grammar_connections (
      connection_key, grammar_id, target_type, preceding_form, preceding_form_en, preceding_form_ru,
      result_pattern, rule_ru, rule_en, sort_order
    ) SELECT ${sql(connection.connection_key)}, id, ${sql(connection.target_type)}, ${sql(connection.preceding_form_ru)},
      ${sql(connection.preceding_form_en)}, ${sql(connection.preceding_form_ru)}, ${sql(connection.result_pattern)},
      ${sql(connection.rule_ru)}, ${sql(connection.rule_en)}, ${sql(connection.sort_order)}
      FROM grammar_patterns WHERE slug=${sql(pattern.slug)}
      ON CONFLICT(connection_key) DO UPDATE SET grammar_id=excluded.grammar_id,
        target_type=excluded.target_type, preceding_form=excluded.preceding_form,
        preceding_form_en=excluded.preceding_form_en, preceding_form_ru=excluded.preceding_form_ru,
        result_pattern=excluded.result_pattern, rule_ru=excluded.rule_ru,
        rule_en=excluded.rule_en, sort_order=excluded.sort_order;`);
    addProvenance("grammar_connection", connection.connection_key, "kanotoba-editorial-v2", "original",
      "Original bilingual connection rule written for Kanotoba.", "Original Kanotoba editorial content.");
  }

  for (let index = 0; index < pattern.examples.length; index += 1) {
    const example = pattern.examples[index];
    const contentKey = `${pattern.slug}-example-${index + 1}`;
    lines.push(`INSERT INTO grammar_examples (
      content_key, grammar_id, japanese, romaji, translation_en, translation_ru,
      register, context_note_ru, context_note_en, register_label_en, register_label_ru,
      sort_order, content_tier, editorial_review_status
    ) SELECT ${sql(contentKey)}, id, ${sql(example.japanese)}, NULL, ${sql(example.translation_en)}, ${sql(example.translation_ru)},
      ${sql(example.register)}, ${sql(example.context_note_ru)}, ${sql(example.context_note_en)},
      ${sql(example.register_label_en)}, ${sql(example.register_label_ru)}, ${index + 1},
      ${sql(pattern.content_tier)}, ${sql(pattern.editorial_review_status)}
      FROM grammar_patterns WHERE slug=${sql(pattern.slug)}
      ON CONFLICT(content_key) DO UPDATE SET grammar_id=excluded.grammar_id,
        japanese=excluded.japanese, translation_en=excluded.translation_en,
        translation_ru=excluded.translation_ru, register=excluded.register,
        context_note_ru=excluded.context_note_ru, context_note_en=excluded.context_note_en,
        register_label_en=excluded.register_label_en, register_label_ru=excluded.register_label_ru,
        sort_order=excluded.sort_order, content_tier=excluded.content_tier,
        editorial_review_status=excluded.editorial_review_status;`);
    addProvenance("grammar_example", contentKey, "kanotoba-editorial-v2", "original",
      "Original Japanese sentence, bilingual translations and context note written for Kanotoba.",
      "Original Kanotoba example and translations.");
  }

  const quiz = pattern.quiz;
  lines.push(`INSERT INTO quiz_questions (
    content_key, grammar_id, question_type, prompt_ru, prompt_en, prompt_ja,
    explanation_ru, explanation_en, difficulty, is_active, content_tier, publication_status, editorial_review_status
  ) SELECT ${sql(quiz.question_key)}, id, ${sql(quiz.question_type)}, ${sql(quiz.prompt_ru)}, ${sql(quiz.prompt_en)},
    ${sql(quiz.prompt_ja)}, ${sql(quiz.explanation_ru)}, ${sql(quiz.explanation_en)}, ${sql(quiz.difficulty)},
    1, ${sql(pattern.content_tier)}, ${sql(pattern.publication_status)}, ${sql(pattern.editorial_review_status)}
    FROM grammar_patterns WHERE slug=${sql(pattern.slug)}
    ON CONFLICT(content_key) DO UPDATE SET grammar_id=excluded.grammar_id,
      question_type=excluded.question_type, prompt_ru=excluded.prompt_ru, prompt_en=excluded.prompt_en,
      prompt_ja=excluded.prompt_ja, explanation_ru=excluded.explanation_ru,
      explanation_en=excluded.explanation_en, difficulty=excluded.difficulty,
      is_active=excluded.is_active, content_tier=excluded.content_tier,
      publication_status=excluded.publication_status, editorial_review_status=excluded.editorial_review_status;`);
  addProvenance("quiz_question", quiz.question_key, "kanotoba-editorial-v2", "original",
    "Original bilingual question prompt and explanations written for Kanotoba.", "Original Kanotoba quiz content.");

  for (let index = 0; index < quiz.options.length; index += 1) {
    const option = quiz.options[index];
    lines.push(`INSERT INTO quiz_options (
      option_key, question_id, option_text, option_text_ja, is_correct, explanation_ru, explanation_en, sort_order
    ) SELECT ${sql(option.option_key)}, id, ${sql(option.text_ja)}, ${sql(option.text_ja)},
      ${option.correct ? 1 : 0}, ${sql(option.explanation_ru)}, ${sql(option.explanation_en)}, ${index + 1}
      FROM quiz_questions WHERE content_key=${sql(quiz.question_key)}
      ON CONFLICT(option_key) DO UPDATE SET question_id=excluded.question_id,
        option_text=excluded.option_text, option_text_ja=excluded.option_text_ja,
        is_correct=excluded.is_correct, explanation_ru=excluded.explanation_ru,
        explanation_en=excluded.explanation_en, sort_order=excluded.sort_order;`);
    addProvenance("quiz_option", option.option_key, "kanotoba-editorial-v2", "original",
      "Original Japanese answer option and bilingual feedback written for Kanotoba.", "Original Kanotoba quiz content.");
  }
}

for (const relation of dataset.relations || []) {
  const relationKey = `${relation.from}->${relation.to}:${relation.type}`;
  lines.push(`INSERT INTO grammar_relations (grammar_id, related_grammar_id, relation_type, note_ru, note_en)
    SELECT (SELECT id FROM grammar_patterns WHERE slug=${sql(relation.from)}),
           (SELECT id FROM grammar_patterns WHERE slug=${sql(relation.to)}),
           ${sql(relation.type)}, ${sql(relation.note_ru)}, ${sql(relation.note_en)}
    WHERE EXISTS (SELECT 1 FROM grammar_patterns WHERE slug=${sql(relation.from)})
      AND EXISTS (SELECT 1 FROM grammar_patterns WHERE slug=${sql(relation.to)})
    ON CONFLICT(grammar_id, related_grammar_id, relation_type) DO UPDATE SET
      note_ru=excluded.note_ru, note_en=excluded.note_en;`);
  addProvenance("grammar_relation", relationKey, "kanotoba-editorial-v2", "original",
    "Original bilingual comparison note written for Kanotoba.", "Original Kanotoba editorial content.");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Generated ${outputPath}`);
console.log(`Patterns: ${dataset.patterns.length}`);
console.log(`Categories: ${dataset.categories.length}`);
console.log(`Examples: ${dataset.patterns.reduce((sum, item) => sum + item.examples.length, 0)}`);
console.log(`Quiz questions: ${dataset.patterns.length}`);
console.log(`Quiz options: ${dataset.patterns.reduce((sum, item) => sum + item.quiz.options.length, 0)}`);
console.log("All learner-facing descriptions passed bilingual import validation.");
