import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadProjectEnv } from "./load-env.mjs";

const DEFAULT_SOURCE_URL = "https://raw.githubusercontent.com/kanjialive/kanji-data-media/master/language-data/ka_data.csv";
const REQUIRED_COLUMNS = [
  "kanji", "kname", "kstroke", "kmeaning", "kgrade",
  "kunyomi_ja", "kunyomi", "onyomi_ja", "onyomi", "examples",
  "radical", "rad_order", "rad_stroke", "rad_name_ja", "rad_name",
  "rad_meaning", "rad_position_ja", "rad_position",
];

function argument(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length || row.length) {
    row.push(field.replace(/\r$/u, ""));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  if (!rows.length) throw new Error("CSV is empty.");
  const headers = rows[0].map((value, index) => index === 0 ? value.replace(/^\uFEFF/u, "") : value);
  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function clean(value) {
  const result = String(value ?? "").trim();
  return result === "" ? null : result;
}

function intOrNull(value) {
  const result = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(result) ? result : null;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function splitKana(value) {
  const text = clean(value);
  if (!text || text.toLowerCase() === "n/a") return [];
  return text.split(/[、，]/u).map((item) => item.trim()).filter(Boolean);
}

function splitRomaji(value) {
  const text = clean(value);
  if (!text || text.toLowerCase() === "n/a") return [];
  return text.split(/\s*,\s*/u).map((item) => item.trim()).filter(Boolean);
}

function insertBatches(table, columns, rows, batchSize = 40) {
  const statements = [];
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = batch.map((record) => `(${record.map(sql).join(", ")})`).join(",\n");
    statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values};`);
  }
  return statements;
}

async function loadCsv(env) {
  const file = argument("file");
  if (file) return await readFile(resolve(file), "utf8");
  const sourceUrl = argument("source") || env.KANOTOBA_KANJI_SOURCE_URL || DEFAULT_SOURCE_URL;
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "Kanotoba-kanji-importer/0.1" },
  });
  if (!response.ok) throw new Error(`KanjiAlive CSV download failed: HTTP ${response.status}`);
  return await response.text();
}

const env = await loadProjectEnv();
const sourceRevision = argument("revision") || env.KANOTOBA_KANJI_SOURCE_REVISION || "master";
const sourceUrl = argument("source") || env.KANOTOBA_KANJI_SOURCE_URL || DEFAULT_SOURCE_URL;
const csv = await loadCsv(env);
const records = parseCsv(csv);
const columns = Object.keys(records[0] || {});
const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}`);

const kanjiRows = [];
const readingRows = [];
const exampleRows = [];
const seen = new Set();

for (const record of records) {
  const character = clean(record.kanji);
  if (!character) continue;
  if (seen.has(character)) throw new Error(`Duplicate kanji character: ${character}`);
  seen.add(character);

  const id = kanjiRows.length + 1;
  kanjiRows.push([
    id, character, clean(record.kname), intOrNull(record.kstroke), clean(record.kmeaning),
    intOrNull(record.kgrade), clean(record.radical), intOrNull(record.rad_order),
    intOrNull(record.rad_stroke), clean(record.rad_name_ja), clean(record.rad_name),
    clean(record.rad_meaning), clean(record.rad_position_ja), clean(record.rad_position),
    "Kanji alive", sourceRevision,
  ]);

  for (const [type, kanaField, romajiField] of [
    ["kunyomi", "kunyomi_ja", "kunyomi"],
    ["onyomi", "onyomi_ja", "onyomi"],
  ]) {
    const kanaValues = splitKana(record[kanaField]);
    const romajiValues = splitRomaji(record[romajiField]);
    kanaValues.forEach((kana, index) => {
      readingRows.push([id, type, kana, romajiValues[index] ?? null, index + 1]);
    });
  }

  const rawExamples = clean(record.examples);
  if (rawExamples) {
    let examples;
    try {
      examples = JSON.parse(rawExamples);
    } catch (error) {
      throw new Error(`Invalid examples JSON for ${character}: ${error.message}`);
    }
    if (!Array.isArray(examples)) throw new Error(`Examples for ${character} are not an array.`);
    examples.forEach((example, index) => {
      if (!Array.isArray(example) || !example[0]) return;
      exampleRows.push([id, String(example[0]).trim(), clean(example[1]), index + 1]);
    });
  }
}

if (!process.argv.includes("--allow-small") && kanjiRows.length < 1000) {
  throw new Error(`Only ${kanjiRows.length} kanji rows were parsed. Refusing a likely partial production import. Use --allow-small only for a test fixture.`);
}

const statements = [
  "-- Generated by Kanotoba from Kanji alive language-data/ka_data.csv.",
  `-- Source: ${DEFAULT_SOURCE_URL}`,
  `-- Source URL: ${sourceUrl}` ,
  `-- Revision label: ${sourceRevision} (use an immutable commit SHA for reproducible imports).`,
  "-- Local IDs are generated by Kanotoba; source_key preserves upstream kname.",
  "DELETE FROM kanji_examples;",
  "DELETE FROM kanji_readings;",
  "DELETE FROM kanji;",
  ...insertBatches("kanji", [
    "id", "character", "source_key", "stroke_count", "meaning_en", "school_grade",
    "radical_character", "radical_order", "radical_stroke_count", "radical_name_ja",
    "radical_name_romaji", "radical_meaning_en", "radical_position_ja", "radical_position_romaji",
    "source_dataset", "source_revision",
  ], kanjiRows),
  ...insertBatches("kanji_readings", ["kanji_id", "reading_type", "kana", "romaji", "sort_order"], readingRows),
  ...insertBatches("kanji_examples", ["kanji_id", "word", "meaning_en", "sort_order"], exampleRows),
];

const outputPath = resolve(argument("output") || "database/seeds/kanji-seed.sql");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${statements.join("\n\n")}\n`, "utf8");

console.log(`Parsed ${kanjiRows.length} kanji, ${readingRows.length} readings and ${exampleRows.length} example compounds.`);
console.log(`Generated SQL: ${outputPath}`);
console.log("Only KanjiAlive-derived tables will be rebuilt when this seed is applied.");
console.log("Review the generated file before applying it to a remote D1 database.");
