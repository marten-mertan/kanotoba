import { getCorsContext } from "./lib/cors.js";
import { json } from "./lib/http.js";
import { handleHealth } from "./routes/health.js";
import { handleKanji } from "./routes/kanji.js";
import { handleGrammar } from "./routes/grammar.js";
import { handleQuiz } from "./routes/quiz.js";

const API_PREFIX = "/api/public";
const ALLOWED_METHODS = new Set(["GET", "POST"]);

const ROUTES = [
  ({ method, segments, ...context }) => method === "GET" && segments[0] === "health" && segments.length === 1
    ? handleHealth(context)
    : null,
  ({ method, segments, ...context }) => method === "GET" && segments[0] === "kanji"
    ? handleKanji({ ...context, segments })
    : null,
  ({ method, segments, ...context }) => method === "GET" && segments[0] === "grammar"
    ? handleGrammar({ ...context, segments })
    : null,
  ({ method, segments, ...context }) => segments[0] === "quiz"
    ? handleQuiz({ ...context, segments, method })
    : null,
];

function availableEndpoints() {
  return [
    "GET /api/public/health",
    "GET /api/public/kanji/{character}",
    "GET /api/public/kanji?grade=6&limit=20",
    "GET /api/public/grammar",
    "GET /api/public/grammar/{id}",
    "GET /api/public/quiz?grammarId=11",
    "POST /api/public/quiz/{id}/answer",
  ];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCorsContext(request, env);

    if (!cors.isAllowed) {
      return json({ error: "origin_not_allowed" }, 403, cors.headers);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors.headers });
    }

    const method = request.method.toUpperCase();
    if (!ALLOWED_METHODS.has(method)) {
      return json({ error: "method_not_allowed" }, 405, {
        ...cors.headers,
        Allow: "GET, POST, OPTIONS",
      });
    }

    if (url.pathname !== API_PREFIX && !url.pathname.startsWith(`${API_PREFIX}/`)) {
      return json({ error: "not_found" }, 404, cors.headers);
    }

    const relativePath = url.pathname.slice(API_PREFIX.length);
    const segments = relativePath.split("/").filter(Boolean);
    const context = { request, env, url, segments, method, corsHeaders: cors.headers };

    try {
      for (const route of ROUTES) {
        const response = await route(context);
        if (response) return response;
      }

      return json({ error: "not_found", availableEndpoints: availableEndpoints() }, 404, cors.headers);
    } catch (error) {
      console.error("Kanotoba API error:", error);
      return json({ error: "internal_server_error" }, 500, cors.headers);
    }
  },
};
