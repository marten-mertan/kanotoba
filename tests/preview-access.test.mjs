import test from "node:test";
import assert from "node:assert/strict";
import { resolvePreviewMode } from "../backend/src/lib/preview-access.js";

const secret = "test-only-preview-key-0123456789abcdef";

test("normal public request does not enter preview mode", async () => {
  const request = new Request("https://api.example/api/public/grammar");
  assert.deepEqual(await resolvePreviewMode(request, new URL(request.url), { PREVIEW_API_KEY: secret }), { preview: false });
});

test("preview mode is denied without a key", async () => {
  const request = new Request("https://api.example/api/public/grammar?preview=1");
  const result = await resolvePreviewMode(request, new URL(request.url), { PREVIEW_API_KEY: secret });
  assert.equal(result.preview, false);
  assert.equal(result.status, 403);
});

test("preview mode is denied when a key is not configured", async () => {
  const request = new Request("https://api.example/api/public/grammar?preview=1", {
    headers: { "X-Kanotoba-Preview-Key": secret },
  });
  const result = await resolvePreviewMode(request, new URL(request.url), {});
  assert.equal(result.status, 503);
  assert.equal(result.error, "preview_not_configured");
});

test("preview mode is granted only with the configured header secret", async () => {
  const request = new Request("https://api.example/api/public/grammar?preview=1", {
    headers: { "X-Kanotoba-Preview-Key": secret },
  });
  assert.deepEqual(await resolvePreviewMode(request, new URL(request.url), { PREVIEW_API_KEY: secret }), { preview: true });
});
