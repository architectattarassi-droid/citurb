/**
 * Tests du middleware global Pages : asset absent (fallback SPA en HTML)
 * → vrai 404 non mis en cache ; noindex hors citurbarea.com.
 *   npx tsx tests/functions/middleware-assets.test.ts
 */
import assert from "node:assert/strict";
import { onRequest } from "../../functions/_middleware";

let ok = 0;
async function t(nom: string, f: () => Promise<void>) {
  try { await f(); ok++; console.log(`  ✓ ${nom}`); } catch (e) { console.error(`  ✗ ${nom}`); throw e; }
}

const html = () => new Response("<!doctype html>", {
  headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" },
});
const js = () => new Response("export{}", { headers: { "content-type": "application/javascript" } });
const ctx = (url: string, res: () => Response) => ({ request: new Request(url), next: async () => res() });

async function main() {
  console.log("Middleware global");
  await t("chunk absent servi en HTML → 404 no-store", async () => {
    const r = await onRequest(ctx("https://citurbarea.com/assets/ChiffragePage-Bh1l95Wy.js", html));
    assert.equal(r.status, 404);
    assert.equal(r.headers.get("cache-control"), "no-store");
  });
  await t("chunk présent inchangé", async () => {
    const r = await onRequest(ctx("https://citurbarea.com/assets/index-abc.js", js));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "application/javascript");
  });
  await t("route SPA en HTML inchangée", async () => {
    const r = await onRequest(ctx("https://citurbarea.com/chiffrage", html));
    assert.equal(r.status, 200);
  });
  await t("noindex hors domaine principal", async () => {
    const r = await onRequest(ctx("https://x.citurbarea.pages.dev/chiffrage", html));
    assert.equal(r.headers.get("x-robots-tag"), "noindex, nofollow");
  });
  console.log(`\n${ok} tests OK`);
}

main().catch(() => process.exit(1));
