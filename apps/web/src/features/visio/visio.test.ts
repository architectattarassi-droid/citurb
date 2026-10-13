import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { acces, nouvelleSalle, salleValide, signerJetonJaas, visioConfiguree } from "../../../../../functions/_lib/visio";

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64(s)));

/** Paire RSA de test ; clé privée en PEM PKCS#8 avec retours à la ligne échappés (comme dans une variable Cloudflare). */
async function paire() {
  const k = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", k.privateKey));
  const corps = btoa(String.fromCharCode(...der)).match(/.{1,64}/g)!.join("\\n");
  return { publique: k.publicKey, pem: `-----BEGIN PRIVATE KEY-----\\n${corps}\\n-----END PRIVATE KEY-----` };
}

describe("visio : salles", () => {
  it("nom non devinable, propre au contexte", () => {
    const a = nouvelleSalle("rdv"), b = nouvelleSalle("rdv");
    expect(a).toMatch(/^rdv-[a-z0-9]{24}$/);
    expect(a).not.toBe(b);
    expect(salleValide("rdv", a)).toBe(true);
    expect(salleValide("chantier", a)).toBe(false);
    expect(salleValide("rdv", "rdv-*")).toBe(false);
  });
});

describe("visio : jeton JaaS RS256 (WebCrypto)", () => {
  it("signe un jeton vérifiable, limité à UNE salle", async () => {
    const { publique, pem } = await paire();
    const env = { JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "cle01", JAAS_PRIVATE_KEY_PEM: pem };
    const t0 = Date.parse("2026-10-13T09:00:00Z");
    const jwt = await signerJetonJaas(env, "rdv-abcdefghijklmnopqrstuvwx", { id: "client-rdv_1", nom: "Test QA", email: "qa-test@example.test" }, false, t0);
    const [h, p, s] = jwt.split(".");
    expect(json(h)).toEqual({ alg: "RS256", kid: "vpaas-magic-cookie-test/cle01", typ: "JWT" });
    const c = json(p);
    expect(c).toMatchObject({ aud: "jitsi", iss: "chat", sub: "vpaas-magic-cookie-test", room: "rdv-abcdefghijklmnopqrstuvwx", iat: t0 / 1000, exp: t0 / 1000 + 7200 });
    expect(c.context.user).toMatchObject({ moderator: false, name: "Test QA", id: "client-rdv_1" });
    expect(c.context.features).toMatchObject({ recording: false, livestreaming: false, "outbound-call": false });
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publique, b64(s), new TextEncoder().encode(`${h}.${p}`));
    expect(ok).toBe(true);
    const falsifie = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publique, b64(s), new TextEncoder().encode(`${h}.${p}x`));
    expect(falsifie).toBe(false);
  });

  it("accepte aussi une clé PKCS#1 (« BEGIN RSA PRIVATE KEY »)", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const env = { JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "cle01", JAAS_PRIVATE_KEY_PEM: privateKey };
    const jwt = await signerJetonJaas(env, "rdv-abcdefghijklmnopqrstuvwx", { id: "x", nom: "Test QA" }, false);
    const [h, p, s] = jwt.split(".");
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(b64(s)))).toBe(true);
  });

  it("acces() : configuration complète, ou refus propre", async () => {
    const { pem } = await paire();
    const env = { JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "vpaas-magic-cookie-test/cle01", JAAS_PRIVATE_KEY_PEM: pem };
    expect(visioConfiguree({})).toBe(false);
    expect(await acces({}, "rdv", nouvelleSalle("rdv"), { id: "x", nom: "Test QA" }, false)).toEqual({ ok: false, error: "visio_non_configuree" });
    expect(await acces(env, "rdv", "salle-devinable", { id: "x", nom: "Test QA" }, false)).toEqual({ ok: false, error: "salle_invalide" });
    const salle = nouvelleSalle("rdv");
    const a = await acces(env, "rdv", salle, { id: "architecte", nom: "Architecte" }, true);
    if (!a.ok) throw new Error(a.error);
    expect(a.config.domain).toBe("8x8.vc");
    expect(a.config.roomName).toBe(`vpaas-magic-cookie-test/${salle}`);
    expect(json(a.config.jwt.split(".")[0]).kid).toBe("vpaas-magic-cookie-test/cle01");
    expect(json(a.config.jwt.split(".")[1]).context.user.moderator).toBe(true);
    expect(await acces({ ...env, JAAS_PRIVATE_KEY_PEM: "pas une clé" }, "rdv", salle, { id: "x", nom: "y" }, false)).toEqual({ ok: false, error: "visio_indisponible" });
  });
});
