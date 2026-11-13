import { json } from "../lib/http.js";

export async function handleHealth({ env, corsHeaders }) {
  const result = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM kanji")
    .first();

  return json({
    ok: true,
    service: "kanotoba-api",
    database: "connected",
    kanjiCount: result?.count ?? 0,
  }, 200, corsHeaders);
}
