/**
 * Tests de la garde /api/cc/* (Access + mot de passe), de login et de logout.
 *   npx tsx tests/functions/cc-auth.test.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  creerJetonSession, hacherMotDePasse, hashValide, lireJetonSession, verifierMotDePasse,
} from "../../functions/_lib/adminSession";
import { onRequest as garde, verifierJeton, verifierRequete } from "../../functions/api/cc/_middleware";
import { traiterLogin } from "../../functions/api/cc/login";
import { traiterLogout } from "../../functions/api/cc/logout";

let ok = 0;
async function t(nom: string, f: () => Promise<void>) {
  try { await f(); ok++; console.log(`  ✓ ${nom}`); } catch (e) { console.error(`  ✗ ${nom}`); throw e; }
}

const MDP = "une phrase de passe assez longue";
const SECRET = "s".repeat(40);
const HOTE = "https://admin.citurbarea.com";
const b64url = (u: Uint8Array) => Buffer.from(u).toString("base64url");

async function main() {
  const HASH = await hacherMotDePasse(MDP);
  const envMdp = { ADMIN_PASSWORD_HASH: HASH, ADMIN_SESSION_SECRET: SECRET, ADMIN_LOGIN_EMAIL: "Yassine@Exemple.ma" };

  console.log("Hash");
  await t("format et itérations", async () => {
    assert.match(HASH, /^pbkdf2c\$sha256\$210000\$[^$]+\$[^$]+$/);
    assert.ok(hashValide(HASH));
    assert.ok(!hashValide(HASH.replace("210000", "100000")), "< 210 000 refusé");
    assert.ok(!hashValide("pbkdf2$sha256$210000$a$b"));
  });
  await t("bon / mauvais mot de passe", async () => {
    assert.equal(await verifierMotDePasse(MDP, HASH), true);
    assert.equal(await verifierMotDePasse(MDP + "x", HASH), false);
    assert.equal(await verifierMotDePasse("", HASH), false);
    assert.equal(await verifierMotDePasse(MDP, "n'importe quoi"), false);
  });
  await t("le script node produit un hash compatible", async () => {
    const sortie = execFileSync(process.execPath, ["scripts/admin-password-hash.mjs"], { input: MDP + "\n", encoding: "utf8" });
    const h = /ADMIN_PASSWORD_HASH=(\S+)/.exec(sortie)?.[1] || "";
    const s = /ADMIN_SESSION_SECRET=(\S+)/.exec(sortie)?.[1] || "";
    assert.ok(hashValide(h));
    assert.equal(await verifierMotDePasse(MDP, h), true);
    assert.equal(await verifierMotDePasse("autre mot de passe!", h), false);
    assert.ok(s.length >= 32);
    assert.ok(!sortie.includes(MDP), "le mot de passe n'est jamais imprimé");
  });

  console.log("Cookie de session");
  const t0 = Date.UTC(2026, 9, 9, 10);
  await t("valide", async () => {
    const j = await creerJetonSession("a@b.ma", SECRET, t0);
    assert.equal(await lireJetonSession(j, SECRET, t0 + 3600_000), "a@b.ma");
  });
  await t("expiré", async () => {
    const j = await creerJetonSession("a@b.ma", SECRET, t0);
    assert.equal(await lireJetonSession(j, SECRET, t0 + 12 * 3600_000 + 2000), null);
  });
  await t("falsifié (expiration, e-mail, signature)", async () => {
    const j = await creerJetonSession("a@b.ma", SECRET, t0);
    const [v, exp, em, mac] = j.split(".");
    assert.equal(await lireJetonSession([v, String(Number(exp) + 86400), em, mac].join("."), SECRET, t0), null);
    assert.equal(await lireJetonSession([v, exp, b64url(new TextEncoder().encode("x@y.ma")), mac].join("."), SECRET, t0), null);
    assert.equal(await lireJetonSession([v, exp, em, mac.slice(0, -2) + (mac.endsWith("AA") ? "BB" : "AA")].join("."), SECRET, t0), null);
    assert.equal(await lireJetonSession("v1.1.2", SECRET, t0), null);
  });
  await t("autre secret", async () => {
    const j = await creerJetonSession("a@b.ma", SECRET, t0);
    assert.equal(await lireJetonSession(j, "t".repeat(40), t0), null);
  });

  console.log("Garde — mode Access (inchangé)");
  const paire = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const pub = (await crypto.subtle.exportKey("jwk", paire.publicKey)) as { n: string; e: string };
  const charger = async () => [{ kid: "k1", kty: "RSA", n: pub.n, e: pub.e }];
  const envAccess = { ACCESS_TEAM_DOMAIN: "citurbarea.cloudflareaccess.com", ACCESS_AUD: "aud-123", ADMIN_EMAILS: "yassine@exemple.ma, autre@exemple.ma" };
  const s0 = Math.floor(t0 / 1000);
  async function jwt(corps: Record<string, unknown>, kid = "k1") {
    const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
    const tete = `${enc({ alg: "RS256", kid })}.${enc(corps)}`;
    const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", paire.privateKey, new TextEncoder().encode(tete)));
    return `${tete}.${b64url(sig)}`;
  }
  const bon = { aud: ["aud-123"], iss: "https://citurbarea.cloudflareaccess.com", exp: s0 + 600, email: "Yassine@exemple.ma" };
  await t("jeton valide → ok", async () => {
    assert.deepEqual(await verifierJeton(await jwt(bon), envAccess, charger, t0), { ok: true, email: "yassine@exemple.ma" });
  });
  await t("aud, iss, exp, e-mail, signature, kid", async () => {
    assert.equal((await verifierJeton(await jwt({ ...bon, aud: ["x"] }), envAccess, charger, t0) as { status: number }).status, 401);
    assert.equal((await verifierJeton(await jwt({ ...bon, iss: "https://autre" }), envAccess, charger, t0) as { status: number }).status, 401);
    assert.deepEqual(await verifierJeton(await jwt({ ...bon, exp: s0 - 1 }), envAccess, charger, t0), { ok: false, status: 401, error: "token_expired" });
    assert.deepEqual(await verifierJeton(await jwt({ ...bon, email: "intrus@x.ma" }), envAccess, charger, t0), { ok: false, status: 403, error: "forbidden" });
    const j = await jwt(bon);
    assert.equal((await verifierJeton(j.slice(0, -4) + "AAAA", envAccess, charger, t0) as { status: number }).status, 401);
    assert.equal((await verifierJeton(await jwt(bon, "k2"), envAccess, charger, t0) as { status: number }).status, 401);
    assert.deepEqual(await verifierJeton("", envAccess, charger, t0), { ok: false, status: 401, error: "unauthenticated" });
  });
  await t("verifierRequete : Access seul, en-tête et cookie CF_Authorization", async () => {
    const j = await jwt(bon);
    const r1 = new Request(`${HOTE}/api/cc/leads`, { headers: { "cf-access-jwt-assertion": j } });
    assert.deepEqual(await verifierRequete(r1, envAccess, charger, t0), { ok: true, email: "yassine@exemple.ma" });
    const r2 = new Request(`${HOTE}/api/cc/leads`, { headers: { cookie: `CF_Authorization=${j}` } });
    assert.equal((await verifierRequete(r2, envAccess, charger, t0)).ok, true);
    const r3 = new Request(`${HOTE}/api/cc/leads`);
    assert.deepEqual(await verifierRequete(r3, envAccess, charger, t0), { ok: false, status: 401, error: "unauthenticated" });
  });

  console.log("Garde — fermée par défaut / mode mot de passe");
  const appel = async (req: Request, env: Record<string, string>) => {
    let atteint = false;
    const ctx = { request: req, env, data: {} as Record<string, unknown>, next: async () => { atteint = true; return new Response("{}"); } };
    const res = await garde(ctx);
    return { res, atteint, data: ctx.data };
  };
  await t("aucune config → 503, la route n'est pas atteinte", async () => {
    const { res, atteint } = await appel(new Request(`${HOTE}/api/cc/session`), {});
    assert.equal(res.status, 503);
    assert.equal(((await res.json()) as { error: string }).error, "access_not_configured");
    assert.equal(atteint, false);
  });
  await t("secret trop court ou hash faible → 503", async () => {
    assert.equal((await appel(new Request(`${HOTE}/api/cc/session`), { ...envMdp, ADMIN_SESSION_SECRET: "court" })).res.status, 503);
    assert.equal((await appel(new Request(`${HOTE}/api/cc/session`), { ...envMdp, ADMIN_PASSWORD_HASH: "pbkdf2c$sha256$1000$a$b" })).res.status, 503);
  });
  const cookieValide = `cc_session=${await creerJetonSession("yassine@exemple.ma", SECRET)}`;
  await t("cookie valide → passe, e-mail et mode exposés", async () => {
    const { res, atteint, data } = await appel(new Request(`${HOTE}/api/cc/session`, { headers: { cookie: `x=1; ${cookieValide}` } }), envMdp);
    assert.equal(res.status, 200);
    assert.equal(atteint, true);
    assert.equal(data.adminEmail, "yassine@exemple.ma");
    assert.equal(data.authMode, "password");
    assert.equal(res.headers.get("cache-control"), "no-store");
  });
  await t("sans cookie / cookie d'un autre secret → 401", async () => {
    assert.equal((await appel(new Request(`${HOTE}/api/cc/leads`), envMdp)).res.status, 401);
    const autre = `cc_session=${await creerJetonSession("yassine@exemple.ma", "t".repeat(40))}`;
    assert.equal((await appel(new Request(`${HOTE}/api/cc/leads`, { headers: { cookie: autre } }), envMdp)).res.status, 401);
  });
  await t("PATCH par cookie : Origin étranger ou absent → 403, même origine → passe", async () => {
    const req = (origin?: string) => new Request(`${HOTE}/api/cc/leads/abc`, {
      method: "PATCH", headers: { cookie: cookieValide, ...(origin ? { origin } : {}) }, body: "{}" });
    assert.equal((await appel(req("https://evil.example"), envMdp)).res.status, 403);
    assert.equal((await appel(req("https://citurbarea.com"), envMdp)).res.status, 403);
    assert.equal((await appel(req(), envMdp)).res.status, 403);
    assert.equal((await appel(req(HOTE), envMdp)).atteint, true);
  });
  await t("les deux modes configurés : cookie seul suffit, Access aussi", async () => {
    const env = { ...envAccess, ...envMdp };
    assert.equal((await verifierRequete(new Request(`${HOTE}/api/cc/leads`, { headers: { cookie: cookieValide } }), env, charger)).ok, true);
    const j = await jwt({ ...bon, exp: Math.floor(Date.now() / 1000) + 600 });
    assert.equal((await verifierRequete(new Request(`${HOTE}/api/cc/leads`, { headers: { "cf-access-jwt-assertion": j } }), env, charger)).ok, true);
    assert.equal((await verifierRequete(new Request(`${HOTE}/api/cc/leads`), env, charger)).ok, false);
  });
  await t("login et logout passent la garde sans session", async () => {
    assert.equal((await appel(new Request(`${HOTE}/api/cc/login`, { method: "POST" }), {})).atteint, true);
    assert.equal((await appel(new Request(`${HOTE}/api/cc/logout`, { method: "POST" }), {})).atteint, true);
  });

  console.log("Login / logout");
  const attentes: number[] = [];
  const opts = (compteurs = new Map()) => ({ compteurs, attendre: async (ms: number) => { attentes.push(ms); } });
  const login = (password: unknown, h: Record<string, string> = {}) => new Request(`${HOTE}/api/cc/login`, {
    method: "POST", headers: { origin: HOTE, "content-type": "application/json", "cf-connecting-ip": "1.2.3.4", ...h },
    body: JSON.stringify({ password }) });
  await t("bon mot de passe → 200 + cookie conforme, lisible par la garde", async () => {
    const r = await traiterLogin(login(MDP), envMdp, opts());
    assert.equal(r.status, 200);
    const sc = r.headers.get("set-cookie") || "";
    assert.match(sc, /^cc_session=v1\.[^;]+; Path=\/api\/cc; Max-Age=43200; HttpOnly; Secure; SameSite=Strict$/);
    const valeur = sc.split(";")[0].slice("cc_session=".length);
    assert.equal(await lireJetonSession(valeur, SECRET), "yassine@exemple.ma");
  });
  await t("mauvais mot de passe → 401 générique, délai, pas de cookie", async () => {
    attentes.length = 0;
    const r = await traiterLogin(login("mauvais mot de passe"), envMdp, opts());
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { ok: false, error: "invalid_credentials" });
    assert.equal(r.headers.get("set-cookie"), null);
    assert.deepEqual(attentes, [800]);
    const vide = await traiterLogin(new Request(`${HOTE}/api/cc/login`, { method: "POST", headers: { origin: HOTE }, body: "pas du json" }), envMdp, opts());
    assert.deepEqual(await vide.json(), { ok: false, error: "invalid_credentials" });
  });
  await t("5 échecs / 15 min par IP → 429, même avec le bon mot de passe ; autre IP non bloquée ; levée après 15 min", async () => {
    const compteurs = new Map();
    for (let i = 0; i < 5; i++) assert.equal((await traiterLogin(login("faux" + i), envMdp, { ...opts(compteurs), maintenant: t0 })).status, 401);
    const bloque = await traiterLogin(login(MDP), envMdp, { ...opts(compteurs), maintenant: t0 + 60_000 });
    assert.equal(bloque.status, 429);
    assert.ok(Number(bloque.headers.get("retry-after")) > 0);
    assert.equal((await traiterLogin(login(MDP, { "cf-connecting-ip": "5.6.7.8" }), envMdp, { ...opts(compteurs), maintenant: t0 })).status, 200);
    assert.equal((await traiterLogin(login(MDP), envMdp, { ...opts(compteurs), maintenant: t0 + 15 * 60_000 + 1 })).status, 200);
  });
  await t("Origin étranger ou absent → 403 ; non configuré → 503 ; GET → 405", async () => {
    assert.equal((await traiterLogin(login(MDP, { origin: "https://evil.example" }), envMdp, opts())).status, 403);
    const sansOrigin = new Request(`${HOTE}/api/cc/login`, { method: "POST", body: JSON.stringify({ password: MDP }) });
    assert.equal((await traiterLogin(sansOrigin, envMdp, opts())).status, 403);
    assert.equal((await traiterLogin(login(MDP), {}, opts())).status, 503);
    assert.equal((await traiterLogin(new Request(`${HOTE}/api/cc/login`), envMdp, opts())).status, 405);
  });
  await t("logout → cookie effacé ; Origin étranger → 403", async () => {
    const r = await traiterLogout(new Request(`${HOTE}/api/cc/logout`, { method: "POST", headers: { origin: HOTE } }));
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie") || "", /^cc_session=; Path=\/api\/cc; Max-Age=0; HttpOnly; Secure; SameSite=Strict$/);
    assert.equal((await traiterLogout(new Request(`${HOTE}/api/cc/logout`, { method: "POST", headers: { origin: "https://evil.example" } }))).status, 403);
  });

  console.log(`\n${ok} tests OK`);
}

main().catch((e) => { console.error(e); process.exit(1); });
