import { json, parsePositiveInteger, parseNonNegativeInteger, parsePathInteger } from "../lib/http.js";
import { resolvePreviewMode } from "../lib/preview-access.js";

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function visibilityWhere(alias, preview) {
  return preview
    ? `${alias}.publication_status <> 'archived'`
    : `${alias}.publication_status = 'published'
       AND ${alias}.content_tier = 'free'
       AND ${alias}.editorial_review_status IN ('editorially_reviewed', 'native_reviewed')`;
}

async function readGrammar(db, id, preview) {
  const pattern = await db.prepare(`
    SELECT p.*, c.slug AS category_slug, c.name_en AS category_name_en,
           c.name_ru AS category_name_ru
    FROM grammar_patterns p
    LEFT JOIN grammar_categories c ON c.id = p.category_id
    WHERE p.id = ? AND ${visibilityWhere("p", preview)}
    LIMIT 1
  `).bind(id).first();

  if (!pattern) return null;

  const exampleVisibility = preview
    ? "1 = 1"
    : "content_tier = 'free' AND editorial_review_status IN ('editorially_reviewed', 'native_reviewed')";
  const relationVisibility = visibilityWhere("p", preview);

  const [examples, relations, senses, connections, sources] = await Promise.all([
    db.prepare(`
      SELECT japanese, romaji, translation_en, translation_ru, register,
             context_note_en, context_note_ru, register_label_en, register_label_ru, sort_order
      FROM grammar_examples
      WHERE grammar_id = ? AND ${exampleVisibility}
      ORDER BY sort_order
    `).bind(id).all(),
    db.prepare(`
      SELECT p.id, p.slug, p.pattern, p.meaning_en, p.meaning_ru,
             r.relation_type, r.note_en, r.note_ru
      FROM grammar_relations r
      JOIN grammar_patterns p ON p.id = r.related_grammar_id
      WHERE r.grammar_id = ? AND ${relationVisibility}
      ORDER BY p.learning_priority, p.id
    `).bind(id).all(),
    db.prepare(`
      SELECT meaning_en, meaning_ru, nuance_en, nuance_ru, sort_order
      FROM grammar_senses WHERE grammar_id = ? ORDER BY sort_order
    `).bind(id).all(),
    db.prepare(`
      SELECT target_type, preceding_form_en, preceding_form_ru, result_pattern,
             rule_en, rule_ru, sort_order
      FROM grammar_connections WHERE grammar_id = ? ORDER BY sort_order
    `).bind(id).all(),
    db.prepare(`
      SELECT s.source_name, s.source_version, s.source_url,
             s.license_identifier, s.license_url, s.attribution_text,
             cp.relationship, cp.source_record_ref, cp.modification_note
      FROM content_provenance cp
      JOIN content_sources s ON s.source_key = cp.source_key
      WHERE (cp.content_type = 'grammar_pattern' AND cp.content_key = ?)
         OR (cp.content_type = 'grammar_dataset' AND cp.content_key = 'grammar-daily-core-v2')
      ORDER BY s.source_name
    `).bind(pattern.slug).all(),
  ]);

  return {
    id: pattern.id,
    slug: pattern.slug,
    pattern: pattern.pattern,
    reading: pattern.reading,
    romaji: pattern.romaji,
    meaningEn: pattern.meaning_en,
    meaningRu: pattern.meaning_ru,
    jlptLevel: pattern.jlpt_level,
    jlptLevelBasis: pattern.jlpt_level_basis,
    register: parseJsonArray(pattern.register),
    registerLabelEn: pattern.register_label_en,
    registerLabelRu: pattern.register_label_ru,
    explanationEn: pattern.explanation_en,
    explanationRu: pattern.explanation_ru,
    formationCasualEn: pattern.formation_casual_en,
    formationCasualRu: pattern.formation_casual_ru,
    formationPoliteEn: pattern.formation_polite_en,
    formationPoliteRu: pattern.formation_polite_ru,
    connectionSummaryEn: pattern.connection_summary_en,
    connectionSummaryRu: pattern.connection_summary_ru,
    notesEn: pattern.notes_en,
    notesRu: pattern.notes_ru,
    tags: parseJsonArray(pattern.tags_json),
    tagLabels: parseJsonArray(pattern.tag_labels_json),
    learningPriority: pattern.learning_priority,
    isCore: Boolean(pattern.is_core),
    contentTier: pattern.content_tier,
    publicationStatus: pattern.publication_status,
    editorialReviewStatus: pattern.editorial_review_status,
    ...(preview ? { previewMode: true } : {}),
    category: pattern.category_slug ? {
      slug: pattern.category_slug,
      nameEn: pattern.category_name_en,
      nameRu: pattern.category_name_ru,
    } : null,
    senses: (senses.results || []).map((item) => ({
      meaningEn: item.meaning_en,
      meaningRu: item.meaning_ru,
      nuanceEn: item.nuance_en,
      nuanceRu: item.nuance_ru,
      order: item.sort_order,
    })),
    connections: (connections.results || []).map((item) => ({
      targetType: item.target_type,
      precedingFormEn: item.preceding_form_en,
      precedingFormRu: item.preceding_form_ru,
      resultPattern: item.result_pattern,
      ruleEn: item.rule_en,
      ruleRu: item.rule_ru,
      order: item.sort_order,
    })),
    examples: (examples.results || []).map((item) => ({
      japanese: item.japanese,
      romaji: item.romaji,
      translationEn: item.translation_en,
      translationRu: item.translation_ru,
      register: item.register,
      registerLabelEn: item.register_label_en,
      registerLabelRu: item.register_label_ru,
      contextNoteEn: item.context_note_en,
      contextNoteRu: item.context_note_ru,
      order: item.sort_order,
    })),
    related: (relations.results || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      pattern: item.pattern,
      meaningEn: item.meaning_en,
      meaningRu: item.meaning_ru,
      relationType: item.relation_type,
      noteEn: item.note_en,
      noteRu: item.note_ru,
    })),
    sources: (sources.results || []).map((item) => ({
      name: item.source_name,
      version: item.source_version,
      url: item.source_url,
      license: item.license_identifier,
      licenseUrl: item.license_url,
      attribution: item.attribution_text,
      relationship: item.relationship,
      sourceRecordRef: item.source_record_ref,
      modifications: item.modification_note,
    })),
  };
}

async function listGrammar(db, url, preview) {
  const category = url.searchParams.get("category");
  const level = url.searchParams.get("level");
  const coreOnly = url.searchParams.get("core");
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 50, 100);
  const offset = parseNonNegativeInteger(url.searchParams.get("offset"), 0, 100000);

  let sql = `
    SELECT p.id, p.slug, p.pattern, p.reading, p.romaji, p.meaning_en, p.meaning_ru,
           p.explanation_en, p.explanation_ru, p.jlpt_level, p.jlpt_level_basis,
           p.register, p.register_label_en, p.register_label_ru,
           p.learning_priority, p.is_core, p.content_tier, p.publication_status,
           p.editorial_review_status, p.tags_json, p.tag_labels_json,
           c.slug AS category_slug, c.name_en AS category_name_en, c.name_ru AS category_name_ru
    FROM grammar_patterns p
    LEFT JOIN grammar_categories c ON c.id = p.category_id
    WHERE ${visibilityWhere("p", preview)}
  `;
  const params = [];

  if (category) { sql += " AND c.slug = ?"; params.push(category); }
  if (level) { sql += " AND p.jlpt_level = ?"; params.push(level.toUpperCase()); }
  if (coreOnly === "true" || coreOnly === "1") { sql += " AND p.is_core = 1"; }

  sql += " ORDER BY COALESCE(p.learning_priority, 9999), COALESCE(c.sort_order, 999), p.id LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  const items = (result.results || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    pattern: row.pattern,
    reading: row.reading,
    romaji: row.romaji,
    meaningEn: row.meaning_en,
    meaningRu: row.meaning_ru,
    explanationEn: row.explanation_en,
    explanationRu: row.explanation_ru,
    jlptLevel: row.jlpt_level,
    jlptLevelBasis: row.jlpt_level_basis,
    register: parseJsonArray(row.register),
    registerLabelEn: row.register_label_en,
    registerLabelRu: row.register_label_ru,
    learningPriority: row.learning_priority,
    isCore: Boolean(row.is_core),
    contentTier: row.content_tier,
    publicationStatus: row.publication_status,
    editorialReviewStatus: row.editorial_review_status,
    tags: parseJsonArray(row.tags_json),
    tagLabels: parseJsonArray(row.tag_labels_json),
    category: row.category_slug ? {
      slug: row.category_slug,
      nameEn: row.category_name_en,
      nameRu: row.category_name_ru,
    } : null,
  }));

  const response = { items, pagination: { limit, offset, returned: items.length } };
  if (preview) response.previewMode = true;
  return response;
}

export async function handleGrammar({ request, env, url, segments, corsHeaders }) {
  const access = await resolvePreviewMode(request, url, env);
  if (access.error) return json({ error: access.error }, access.status, { ...corsHeaders, "Cache-Control": "no-store" });
  const preview = access.preview;
  const cacheHeaders = preview ? { ...corsHeaders, "Cache-Control": "no-store" } : corsHeaders;

  if (segments.length === 1) {
    return json(await listGrammar(env.DB, url, preview), 200, cacheHeaders);
  }
  if (segments.length !== 2) return null;

  const id = parsePathInteger(segments[1]);
  if (!id) return json({ error: "invalid_grammar_id" }, 400, corsHeaders);

  const pattern = await readGrammar(env.DB, id, preview);
  if (!pattern) return json({ error: "grammar_not_found", id }, 404, cacheHeaders);
  return json(pattern, 200, cacheHeaders);
}
