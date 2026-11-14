const encoder = new TextEncoder();

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function constantTimeMatch(provided, expected) {
  if (!provided || !expected) return false;
  const [left, right] = await Promise.all([digest(provided), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

/**
 * Preview mode is opt-in (`?preview=1`) and requires a Worker secret in the
 * X-Kanotoba-Preview-Key header. Never put the secret in the URL or frontend.
 */
export async function resolvePreviewMode(request, url, env) {
  const requested = url.searchParams.get("preview") === "1";
  if (!requested) return { preview: false };

  const expected = String(env.PREVIEW_API_KEY || "");
  if (expected.length < 32) {
    return { preview: false, error: "preview_not_configured", status: 503 };
  }

  const provided = request.headers.get("X-Kanotoba-Preview-Key") || "";
  const valid = await constantTimeMatch(provided, expected);
  if (!valid) {
    return { preview: false, error: "preview_access_denied", status: 403 };
  }

  return { preview: true };
}
