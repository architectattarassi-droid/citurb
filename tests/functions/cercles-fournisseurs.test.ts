/**
 * Tests Cercles fournisseurs : inscription, accès par code, session, espace
 * protégé, fiches de prix (validation, conversion, aberrants, import,
 * historique), modération, champs privés.
 *   npx tsx tests/functions/cercles-fournisseurs.test.ts
 */
import assert from "node:assert/strict";
import {
  creerSessionFournisseur, hacherCode, lireSessionFournisseur, reinitialiserLimites, telephone,
} from "../../functions/_lib/cercles";
import { creerJetonSession } from "../../functions/_lib/adminSession";
import {
  codePourAdmin, demanderCode, enregistrerFiche, fichesAModerer, historiqueFiche, importerFiches, inscrire, listerPourAdmin,
  majProfil, modererFiche, modererFournisseur, moi, supprimerFiche, validerFiche, verifierCode, vuePublique,
} from "../../functions/_lib/fournisseurs";
import { verifierEspace } from "../../functions/api/cercles/espace/_middleware";
import { verifierRequete } from "../../functions/api/cc/_middleware";
import { depotMemoire } from "./depotMemoire";

let ok = 0;
async function t(nom: string, f: () => Promise<void>) {
  try { await f(); ok++; console.log(`  ✓ ${nom}`); } catch (e) { console.error(`  ✗ ${nom}`); throw e; }
}

const SECRET = "f".repeat(40);
const ENV = { FOURNISSEUR_SESSION_SECRET: SECRET };
const HOTE = "https://citurbarea.com";
let ipN = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.0.0.${++ipN}`, "user-agent": "test" });

const INSCRIPTION = {
  metier: "FOURNISSEUR_MATERIAUX", raisonSociale: "TEST Négoce Fictif", ville: "Témara", telephone: "06 12 34 56 78",
  email: "Test.Fournisseur@Exemple.ma", ice: "", categories: ["GROS_OEUVRE", "INCONNUE"], zonesLivraison: ["Rabat", "casablanca-settat", "Mars"],
  accepteConditions: true, idempotencyKey: "idem-1",
};

async function main() {
  console.log("Validation");
  await t("téléphone marocain et international", async () => {
    assert.equal(telephone("06 12 34 56 78"), "0612345678");
    assert.equal(telephone("00212 6 12 34 56 78"), "+212612345678");
    assert.equal(telephone("0412345678"), null);
  });

  console.log("Inscription");
  const { depot, fournisseurs, prix, historique } = depotMemoire();
  let id = "";
  await t("inscription valide → PENDING, champs normalisés", async () => {
    const r = await inscrire(INSCRIPTION, entetes(), depot, {});
    assert.equal(r.status, 201);
    const f = [...fournisseurs.values()][0];
    id = String(f.id);
    assert.equal(f.statut, "PENDING");
    assert.equal(f.email, "test.fournisseur@exemple.ma");
    assert.equal(f.region, "rabat-sale-kenitra");
    assert.deepEqual(f.categories, ["GROS_OEUVRE"]);
    assert.deepEqual(f.zonesLivraison, ["rabat-sale-kenitra", "casablanca-settat"]);
    assert.equal(f.slug, "test-negoce-fictif-temara");
    assert.equal((f.meta as Record<string, unknown>).fictif, true);
  });
  await t("idempotence et e-mail déjà inscrit : même réponse, rien de créé", async () => {
    await inscrire(INSCRIPTION, entetes(), depot, {});
    await inscrire({ ...INSCRIPTION, idempotencyKey: "autre" }, entetes(), depot, {});
    assert.equal(fournisseurs.size, 1);
  });
  await t("pot de miel : succès apparent, rien d'écrit", async () => {
    const r = await inscrire({ ...INSCRIPTION, email: "robot@exemple.ma", website: "http://spam" }, entetes(), depot, {});
    assert.equal(r.status, 201);
    assert.equal(fournisseurs.size, 1);
  });
  await t("champs invalides refusés", async () => {
    const cas: [Record<string, unknown>, string][] = [
      [{ metier: "PIRATE" }, "metier_invalid"], [{ raisonSociale: "x" }, "raison_sociale_invalid"], [{ telephone: "123" }, "phone_invalid"],
      [{ email: "pas-un-mail" }, "email_invalid"], [{ ice: "123" }, "ice_invalid"], [{ accepteConditions: false }, "conditions_required"],
      [{ logoUrl: "http://non-https.ma/logo.png" }, "logo_invalid"],
    ];
    for (const [modif, err] of cas) {
      const r = await inscrire({ ...INSCRIPTION, idempotencyKey: undefined, email: "neuf@exemple.ma", ...modif }, entetes(), depot, {});
      assert.equal(r.status, 400, err);
      assert.equal((r.json as { error: string }).error, err);
    }
  });
  await t("limite de débit par IP (5 / 10 min)", async () => {
    reinitialiserLimites();
    const h = new Headers({ "cf-connecting-ip": "9.9.9.9" });
    for (let i = 0; i < 5; i++) await inscrire({ ...INSCRIPTION, website: "x" }, h, depot, {});
    assert.equal((await inscrire(INSCRIPTION, h, depot, {})).status, 429);
  });

  console.log("Accès par code");
  await t("demande de code : réponse identique, adresse connue ou non (mode admin sans Resend)", async () => {
    const a = await demanderCode({ email: "inconnu@exemple.ma" }, entetes(), depot, {}, SECRET, HOTE);
    const b = await demanderCode({ email: "test.fournisseur@exemple.ma" }, entetes(), depot, {}, SECRET, HOTE);
    assert.deepEqual(a.json, b.json);
    assert.equal((b.json as { envoi: string }).envoi, "admin");
    assert.ok((fournisseurs.get(id)!.meta as Record<string, unknown>).codeDemandeLe, "demande visible par l'admin");
  });
  let code = "";
  await t("code généré par l'admin, haché en base", async () => {
    const r = await codePourAdmin(id, depot, SECRET);
    code = (r.json as { code: string }).code;
    assert.match(code, /^\d{6}$/);
    assert.equal(fournisseurs.get(id)!.codeHash, await hacherCode(SECRET, id, code));
    assert.ok(!JSON.stringify(fournisseurs.get(id)).includes(`"${code}"`), "code jamais stocké en clair");
  });
  await t("mauvais code : refus et tentative comptée ; bon code : consommé (usage unique)", async () => {
    const faux = code === "000000" ? "111111" : "000000";
    const r1 = await verifierCode({ email: "test.fournisseur@exemple.ma", code: faux }, entetes(), depot, SECRET);
    assert.equal((r1 as { status: number }).status, 401);
    assert.equal(fournisseurs.get(id)!.codeTentatives, 1);
    const r2 = await verifierCode({ email: "TEST.fournisseur@exemple.ma", code }, entetes(), depot, SECRET);
    assert.deepEqual(r2, { id });
    const r3 = await verifierCode({ email: "test.fournisseur@exemple.ma", code }, entetes(), depot, SECRET);
    assert.equal((r3 as { status: number }).status, 401, "rejeu refusé");
  });
  await t("5 essais max, code expiré refusé", async () => {
    const r = await codePourAdmin(id, depot, SECRET);
    const c = (r.json as { code: string }).code;
    fournisseurs.get(id)!.codeTentatives = 5;
    assert.equal((await verifierCode({ email: "test.fournisseur@exemple.ma", code: c }, entetes(), depot, SECRET) as { error?: string; json?: { error: string } }).json?.error, "code_expired");
    fournisseurs.get(id)!.codeTentatives = 0;
    const plusTard = Date.now() + 25 * 3600_000;
    assert.equal((await verifierCode({ email: "test.fournisseur@exemple.ma", code: c }, entetes(), depot, SECRET, plusTard) as unknown as { json: { error: string } }).json.error, "code_expired");
  });
  await t("compte rejeté : pas de code", async () => {
    await modererFournisseur(id, { statut: "REJECTED", motif: "doublon" }, "admin", depot);
    assert.equal((await codePourAdmin(id, depot, SECRET)).status, 409);
    assert.equal((await moi(id, depot)).status, 401);
    await modererFournisseur(id, { statut: "PENDING" }, "admin", depot);
  });

  console.log("Session fournisseur");
  await t("cookie signé : valide, falsifié, expiré, autre secret", async () => {
    const j = await creerSessionFournisseur(id, SECRET);
    assert.equal(await lireSessionFournisseur(j, SECRET), id);
    assert.equal(await lireSessionFournisseur(j.slice(0, -2) + "xx", SECRET), null);
    assert.equal(await lireSessionFournisseur(j, "g".repeat(40)), null);
    assert.equal(await lireSessionFournisseur(j, SECRET, Date.now() + 31 * 86400_000), null);
  });
  await t("garde de l'espace : sans cookie 401, cookie admin refusé, mutation sans Origin 403, sans secret 503", async () => {
    const url = `${HOTE}/api/cercles/espace/moi`;
    assert.equal((await verifierEspace(new Request(url), ENV) as { status: number }).status, 401);
    const admin = await creerJetonSession("admin@exemple.ma", SECRET);
    assert.equal((await verifierEspace(new Request(url, { headers: { cookie: `frn_session=${admin}` } }), ENV) as { status: number }).status, 401);
    const j = await creerSessionFournisseur(id, SECRET);
    assert.deepEqual(await verifierEspace(new Request(url, { headers: { cookie: `frn_session=${j}` } }), ENV), { ok: true, id });
    assert.equal((await verifierEspace(new Request(url, { method: "PUT", headers: { cookie: `frn_session=${j}`, origin: "https://evil.example" } }), ENV) as { status: number }).status, 403);
    assert.equal((await verifierEspace(new Request(url, { headers: { cookie: `frn_session=${j}` } }), {}) as { status: number }).status, 503);
  });
  await t("un cookie fournisseur n'ouvre pas le back-office /api/cc", async () => {
    const j = await creerSessionFournisseur(id, SECRET);
    const v = await verifierRequete(new Request(`${HOTE}/api/cc/fournisseurs`, { headers: { cookie: `cc_session=${j}` } }),
      { ADMIN_PASSWORD_HASH: "pbkdf2c$sha256$210000$c2Vs$aGFzaA==", ADMIN_SESSION_SECRET: SECRET });
    assert.equal(v.ok, false);
  });

  console.log("Fiches de prix");
  await t("validation : sac de ciment → prix par kg, TVA, validité par défaut", async () => {
    const v = validerFiche({ materiauCode: "cit-go-008", uniteVente: "sac50", prixHT: "78,5" }, new Date("2026-10-09"));
    assert.ok(v.ok);
    if (!v.ok) return;
    assert.equal(v.fiche.materiauCode, "CIT-GO-008");
    assert.equal(v.fiche.prixRefHT, 1.57);
    assert.equal(v.fiche.tvaPct, 20);
    assert.equal(v.fiche.validiteJusquau, "2027-01-07");
    assert.equal(v.fiche.statut, "APPROVED");
    assert.equal(v.fiche.signalement, null);
  });
  await t("validation : refus (matériau, unité, prix, TVA, dégressifs, validité passée)", async () => {
    const base = { materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: 80 };
    const cas: [Record<string, unknown>, string][] = [
      [{ materiauCode: "CIT-ZZ-001" }, "materiau_inconnu"], [{ uniteVente: "barre12" }, "unite_invalide"], [{ prixHT: -1 }, "prix_invalide"],
      [{ tvaPct: 19 }, "tva_invalide"], [{ degressifs: [{ aPartirDe: 100, prixHT: 90 }] }, "degressif_invalide"],
      [{ degressifs: [{ aPartirDe: 10, prixHT: 70 }, { aPartirDe: 100, prixHT: 75 }] }, "degressif_invalide"],
      [{ validiteJusquau: "2020-01-01" }, "validite_invalide"], [{ disponibilite: "PEUT_ETRE" }, "disponibilite_invalide"],
    ];
    for (const [m, err] of cas) {
      const v = validerFiche({ ...base, ...m }, new Date("2026-10-09"));
      assert.equal(v.ok ? "ok" : v.error, err);
    }
  });
  await t("prix hors ±50 % : enregistré mais signalé et en vérification (pas bloqué)", async () => {
    const v = validerFiche({ materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: 150 }, new Date("2026-10-09"));
    assert.ok(v.ok && v.fiche.statut === "PENDING" && v.fiche.signalement === "ABERRANT_HAUT");
    const b = validerFiche({ materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: 30 }, new Date("2026-10-09"));
    assert.ok(b.ok && b.fiche.signalement === "ABERRANT_BAS");
  });
  let ficheId = "";
  await t("saisie, mise à jour (même fiche), historique daté", async () => {
    const r = await enregistrerFiche(id, { materiauCode: "CIT-GO-024", uniteVente: "barre12", prixHT: 104, livraison: [{ zone: "Rabat", frais: 300, delaiJours: 2 }] }, depot);
    assert.equal(r.status, 200);
    const fiche = (r.json as { fiche: { id: string; prixRefHT: number; livraison: { zone: string }[] } }).fiche;
    ficheId = fiche.id;
    assert.equal(fiche.prixRefHT, 9.7598);
    assert.equal(fiche.livraison[0].zone, "rabat-sale-kenitra");
    await enregistrerFiche(id, { materiauCode: "CIT-GO-024", uniteVente: "tonne", prixHT: 9800 }, depot);
    assert.equal(prix.size, 1);
    const h = await historiqueFiche(id, ficheId, depot);
    const lignes = (h.json as { historique: { action: string }[] }).historique;
    assert.deepEqual(lignes.map((x) => x.action), ["MISE_A_JOUR", "CREATION"]);
  });
  await t("import en masse : lignes valides écrites, erreurs et doublons rapportés", async () => {
    const r = await importerFiches(id, { lignes: [
      { materiauCode: "CIT-GO-011", uniteVente: "m3", prixHT: 190 },
      { materiauCode: "CIT-GO-011", uniteVente: "m3", prixHT: 195 },
      { materiauCode: "CIT-XX-000", uniteVente: "u", prixHT: 1 },
      { materiauCode: "CIT-GO-003", uniteVente: "u", prixHT: 20 },
    ] }, depot);
    const j = r.json as { importees: number; erreurs: number; resultats: { error?: string; signalement?: string }[] };
    assert.equal(j.importees, 2);
    assert.equal(j.erreurs, 2);
    assert.equal(j.resultats[1].error, "doublon");
    assert.equal(j.resultats[3].signalement, "ABERRANT_HAUT");
    assert.equal((await importerFiches(id, { lignes: new Array(301).fill({}) }, depot)).status, 400);
  });
  await t("métier sans fiches (BET) : refus", async () => {
    await inscrire({ ...INSCRIPTION, metier: "BET_STRUCTURE", email: "bet@exemple.ma", idempotencyKey: "bet" }, entetes(), depot, {});
    const bet = [...fournisseurs.values()].find((f) => f.email === "bet@exemple.ma")!;
    assert.equal((await enregistrerFiche(String(bet.id), { materiauCode: "CIT-GO-008", prixHT: 1.6 }, depot)).status, 403);
  });
  await t("un fournisseur ne supprime pas la fiche d'un autre", async () => {
    const autre = [...fournisseurs.values()].find((f) => f.email === "bet@exemple.ma")!;
    assert.equal((await supprimerFiche(String(autre.id), ficheId, depot)).status, 404);
    assert.equal((await historiqueFiche(String(autre.id), ficheId, depot)).status, 404);
  });

  console.log("Modération et champs privés");
  await t("fiches à modérer : signalées, avec prix de référence", async () => {
    const r = await fichesAModerer(depot);
    const f = (r.json as { fiches: { materiauCode: string; prixReference: number }[] }).fiches;
    assert.deepEqual(f.map((x) => x.materiauCode), ["CIT-GO-003"]);
    assert.equal(f[0].prixReference, 7);
    const sp = [...prix.values()].find((p) => p.materiauCode === "CIT-GO-003")!;
    await modererFiche(String(sp.id), { statut: "APPROVED" }, "admin@exemple.ma", depot);
    assert.equal(((await fichesAModerer(depot)).json as { fiches: unknown[] }).fiches.length, 0);
    assert.equal(historique.at(-1)!.action, "MODERATION");
  });
  await t("approbation, commission, motif requis pour un rejet", async () => {
    assert.equal((await modererFournisseur(id, { statut: "REJECTED" }, "admin", depot)).status, 400);
    assert.equal((await modererFournisseur(id, { statut: "APPROVED", commissionPct: 99 }, "admin", depot)).status, 400);
    const r = await modererFournisseur(id, { statut: "APPROVED", commissionPct: 3.5 }, "admin", depot);
    assert.equal((r.json as { fournisseur: { statut: string; commissionPct: number } }).fournisseur.commissionPct, 3.5);
  });
  await t("vue publique : ni téléphone, ni e-mail, ni ICE, ni code", async () => {
    const f = fournisseurs.get(id)!;
    f.ice = "001234567000089";
    const pub = JSON.stringify(vuePublique(f));
    for (const secret of ["0612345678", "test.fournisseur@exemple.ma", "001234567000089", "codeHash", "idem-1", "10.0.0."]) assert.ok(!pub.includes(secret), secret);
    const admin = JSON.stringify((await listerPourAdmin(null, depot)).json);
    assert.ok(admin.includes("0612345678"), "l'admin voit les coordonnées");
    assert.ok(!admin.includes("codeHash"));
  });
  await t("profil : mise à jour bornée, téléphone revalidé", async () => {
    assert.equal((await majProfil(id, { telephone: "123" }, depot)).status, 400);
    const r = await majProfil(id, { ville: "Casablanca", zonesLivraison: ["national"], description: "Négoce fictif de test" }, depot);
    const f = (r.json as { fournisseur: { region: string; zonesLivraison: string[] } }).fournisseur;
    assert.equal(f.region, "casablanca-settat");
    assert.deepEqual(f.zonesLivraison, ["national"]);
  });

  console.log(`\n${ok} tests OK`);
}

main().catch((e) => { console.error(e); process.exit(1); });
