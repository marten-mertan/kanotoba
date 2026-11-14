function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsContext(request, env) {
  const origin = request.headers.get("Origin");
  const allowList = allowedOrigins(env);
  const isAllowed = !origin || allowList.includes(origin);

  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Kanotoba-Preview-Key",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && isAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return { origin, isAllowed, headers };
}
