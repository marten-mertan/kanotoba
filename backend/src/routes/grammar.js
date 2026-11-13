import { json, parsePositiveInteger, parseNonNegativeInteger, parsePathInteger } from "../lib/http.js";

async function readGrammar(db, id) {
  const pattern = await db.prepare(`
    SELECT p.*, c.slug AS category_slug, c.name_en AS category_name_en,
           c.name_ru AS category_name_ru
    FROM grammar_patterns p
    LEFT JOIN grammar_categories c ON c.id = p.category_id
    WHERE p.id = ?
    LIMIT 1
  `).bind(id).first();

  if (!pattern) return null;

  const [examples, relations] = await Promise.all([
    db.prepare(`
      SELECT japanese, romaji, translation_en, translation_ru,
             register, context_note_ru, sort_order
      FROM grammar_examples
      WHERE grammar_id = ?
      ORDER BY sort_order
    `).bind(id).all(),
    db.prepare(`
      SELECT p.id, p.slug, p.pattern, p.meaning_ru, r.relation_type, r.note_ru
      FROM grammar_relations r
      JOIN grammar_patterns p ON p.id = r.related_grammar_id
      WHERE r.grammar_id = ?
      ORDER BY p.id
    `).bind(id).all(),
  ]);

  return {
    id: pattern.id,
    slug: pattern.slug,
    pattern: pattern.pattern,
    romaji: pattern.romaji,
    meaningEn: pattern.meaning_en,
    meaningRu: pattern.meaning_ru,
    jlptLevel: pattern.jlpt_level,
    register: pattern.register,
    explanationRu: pattern.explanation_ru,
    formationCasual: pattern.formation_casual,
    formationPolite: pattern.formation_polite,
    notesRu: pattern.notes_ru,
    category: pattern.category_slug ? {
      slug: pattern.category_slug,
      nameEn: pattern.category_name_en,
      nameRu: pattern.category_name_ru,
    } : null,
    examples: (examples.results || []).map((item) => ({
      japanese: item.japanese,
      romaji: item.romaji,
      translationEn: item.translation_en,
      translationRu: item.translation_ru,
      register: item.register,
      contextNoteRu: item.context_note_ru,
      order: item.sort_order,
    })),
    related: (relations.results || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      pattern: item.pattern,
      meaningRu: item.meaning_ru,
      relationType: item.relation_type,
      noteRu: item.note_ru,
    })),
  };
}

async function listGrammar(db, url) {
  const category = url.searchParams.get("category");
  const level = url.searchParams.get("level");
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 50, 100);
  const offset = parseNonNegativeInteger(url.searchParams.get("offset"), 0, 100000);

  let sql = `
    SELECT p.id, p.slug, p.pattern, p.romaji, p.meaning_en,
           p.meaning_ru, p.jlpt_level, p.register,
           c.slug AS category_slug, c.name_ru AS category_name_ru
    FROM grammar_patterns p
    LEFT JOIN grammar_categories c ON c.id = p.category_id
    WHERE 1 = 1
  `;
  const params = [];

  if (category) {
    sql += " AND c.slug = ?";
    params.push(category);
  }
  if (level) {
    sql += " AND p.jlpt_level = ?";
    params.push(level.toUpperCase());
  }

  sql += " ORDER BY COALESCE(c.sort_order, 999), p.id LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await db.prepare(sql).bind(...params).all();
  const items = (result.results || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    pattern: row.pattern,
    romaji: row.romaji,
    meaningEn: row.meaning_en,
    meaningRu: row.meaning_ru,
    jlptLevel: row.jlpt_level,
    register: row.register,
    category: row.category_slug ? {
      slug: row.category_slug,
      nameRu: row.category_name_ru,
    } : null,
  }));

  return { items, pagination: { limit, offset, returned: items.length } };
}

export async function handleGrammar({ env, url, segments, corsHeaders }) {
  if (segments.length === 1) {
    return json(await listGrammar(env.DB, url), 200, corsHeaders);
  }

  if (segments.length !== 2) return null;

  const id = parsePathInteger(segments[1]);
  if (!id) return json({ error: "invalid_grammar_id" }, 400, corsHeaders);

  const pattern = await readGrammar(env.DB, id);
  if (!pattern) return json({ error: "grammar_not_found", id }, 404, corsHeaders);
  return json(pattern, 200, corsHeaders);
}
