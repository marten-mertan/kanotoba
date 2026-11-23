import { json } from "../lib/http.js";
import { getPaginationParams, createPagination } from "../lib/pagination.js";

const KANJI_SOURCE_REPOSITORY = "https://github.com/kanjialive/kanji-data-media";
const KANJI_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

async function readKanji(db, character) {
  const kanji = await db.prepare(`
    SELECT id, character, source_key, stroke_count, meaning_en, school_grade,
           radical_character, radical_order, radical_stroke_count,
           radical_name_ja, radical_name_romaji, radical_meaning_en,
           radical_position_ja, radical_position_romaji,
           source_dataset, source_revision
    FROM kanji
    WHERE character = ?
    LIMIT 1
  `).bind(character).first();

  if (!kanji) return null;

  const [readingsResult, examplesResult] = await Promise.all([
    db.prepare(`
      SELECT reading_type, kana, romaji, sort_order
      FROM kanji_readings
      WHERE kanji_id = ?
      ORDER BY reading_type, sort_order
    `).bind(kanji.id).all(),
    db.prepare(`
      SELECT word, meaning_en, sort_order
      FROM kanji_examples
      WHERE kanji_id = ?
      ORDER BY sort_order
    `).bind(kanji.id).all(),
  ]);

  const readings = { kunyomi: [], onyomi: [] };
  for (const reading of readingsResult.results || []) {
    readings[reading.reading_type].push({
      kana: reading.kana,
      romaji: reading.romaji,
      order: reading.sort_order,
    });
  }

  return {
    id: kanji.id,
    character: kanji.character,
    sourceKey: kanji.source_key,
    strokeCount: kanji.stroke_count,
    meaningEn: kanji.meaning_en,
    schoolGrade: kanji.school_grade,
    readings,
    radical: kanji.radical_character ? {
      character: kanji.radical_character,
      order: kanji.radical_order,
      strokeCount: kanji.radical_stroke_count,
      nameJa: kanji.radical_name_ja,
      nameRomaji: kanji.radical_name_romaji,
      meaningEn: kanji.radical_meaning_en,
      positionJa: kanji.radical_position_ja,
      positionRomaji: kanji.radical_position_romaji,
    } : null,
    examples: (examplesResult.results || []).map((example) => ({
      word: example.word,
      meaningEn: example.meaning_en,
      order: example.sort_order,
    })),
    attribution: {
      dataset: kanji.source_dataset,
      revision: kanji.source_revision,
      repository: KANJI_SOURCE_REPOSITORY,
      license: "CC BY 4.0",
      licenseUrl: KANJI_LICENSE_URL,
      notice: "Kanji alive language data by Harumi Hibino Lory and Arno Bosse; adapted by Kanotoba.",
    },
  };
}

async function listKanji(db, url) {
  const grade = url.searchParams.get("grade");
  const query = url.searchParams.get("q")?.trim();
  const { limit, offset } = getPaginationParams(url, { defaultLimit: 25 });

  const conditions = ["1 = 1"];
  const params = [];

  if (grade !== null) {
    if (!/^\d+$/u.test(grade)) {
      return { error: "invalid_grade", status: 400 };
    }
    const gradeNumber = Number(grade);
    if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 6) {
      return { error: "invalid_grade", status: 400 };
    }
    conditions.push("school_grade = ?");
    params.push(gradeNumber);
  }

  if (query) {
    conditions.push("(character = ? OR meaning_en LIKE ?)");
    params.push(query, `%${query}%`);
  }

  const fromWhere = `FROM kanji WHERE ${conditions.join(" AND ")}`;

  const [result, countResult] = await Promise.all([
    db.prepare(`
      SELECT id, character, stroke_count, meaning_en, school_grade
      ${fromWhere}
      ORDER BY school_grade, id
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all(),
    db.prepare(`
      SELECT COUNT(*) AS total
      ${fromWhere}
    `).bind(...params).first(),
  ]);

  const items = (result.results || []).map((row) => ({
    id: row.id,
    character: row.character,
    strokeCount: row.stroke_count,
    meaningEn: row.meaning_en,
    schoolGrade: row.school_grade,
  }));

  return {
    items,
    pagination: createPagination({
      limit,
      offset,
      returned: items.length,
      total: countResult?.total ?? 0,
    }),
  };
}

export async function handleKanji({ env, url, segments, corsHeaders }) {
  if (segments.length === 1) {
    const result = await listKanji(env.DB, url);
    if (result.error) return json({ error: result.error }, result.status, corsHeaders);
    return json(result, 200, corsHeaders);
  }

  if (segments.length !== 2) return null;

  let character;
  try {
    character = decodeURIComponent(segments[1]);
  } catch {
    return json({ error: "invalid_url_encoding" }, 400, corsHeaders);
  }

  if (!character || Array.from(character).length !== 1 || character.includes("/")) {
    return json({
      error: "invalid_kanji_parameter",
      message: "Provide exactly one kanji character.",
    }, 400, corsHeaders);
  }

  const result = await readKanji(env.DB, character);
  if (!result) return json({ error: "kanji_not_found", character }, 404, corsHeaders);
  return json(result, 200, corsHeaders);
}
