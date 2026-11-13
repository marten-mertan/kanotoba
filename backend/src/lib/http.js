export function json(data, status = 200, extraHeaders = {}) {
  const cacheControl = status === 200
    ? "public, max-age=300, s-maxage=3600"
    : "no-store";

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      ...extraHeaders,
    },
  });
}

export function parsePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function parseNonNegativeInteger(value, fallback, max) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export function parsePathInteger(value) {
  if (!/^\d+$/u.test(String(value ?? ""))) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
