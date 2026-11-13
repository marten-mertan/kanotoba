import { loadProjectEnv } from "./load-env.mjs";

await loadProjectEnv();
const baseUrl = (process.env.KANOTOBA_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/u, "");

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const health = await get("/api/public/health");
if (!health.ok || health.database !== "connected") {
  throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
}
console.log(`✓ API and D1 connected; ${health.kanjiCount} kanji rows.`);

if (health.kanjiCount > 0) {
  const sample = await get(`/api/public/kanji/${encodeURIComponent("泉")}`);
  if (sample.character !== "泉") throw new Error("Expected the 泉 kanji record.");
  if (!sample.meaningEn || !Array.isArray(sample.readings?.kunyomi) || !Array.isArray(sample.readings?.onyomi)) {
    throw new Error("The 泉 response is missing meaning or reading arrays.");
  }
  console.log(`✓ Kanji lookup: ${sample.character} — ${sample.meaningEn}`);
  console.log(`  Kun'yomi: ${sample.readings.kunyomi.map((item) => item.kana).join(", ") || "—"}`);
  console.log(`  On'yomi: ${sample.readings.onyomi.map((item) => item.kana).join(", ") || "—"}`);
  console.log(`  Examples: ${sample.examples.length}; radical: ${sample.radical?.character ?? "—"}`);
} else {
  console.log("! D1 is empty. Import KanjiAlive data, then run this test again.");
}

const missing = await fetch(`${baseUrl}/api/public/kanji/${encodeURIComponent("🦊")}`);
if (missing.status !== 404) throw new Error(`Expected a missing kanji to return 404, got ${missing.status}.`);
console.log("✓ Unknown character returns HTTP 404.");
console.log("All API smoke tests passed.");
