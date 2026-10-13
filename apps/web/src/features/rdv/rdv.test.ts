import { describe, expect, it } from "vitest";
import {
  avecDefauts, CHAMPS_DOSSIER, creneauPropose, filtrerDossier, fichierIcs, genererCreneaux, hacherJeton, heureMaroc, instantMaroc, JETON_RE,
  lienGoogleAgenda, nouveauJeton, PARAMETRES_DEFAUT, validerParametres, validerReservation, vueClient,
} from "../../../../../functions/_lib/rdv";
import { reserver } from "../../../../../functions/api/rdv/index";
import { listerCreneaux } from "../../../../../functions/api/rdv/creneaux";
import { lireRdv } from "../../../../../functions/api/rdv/[jeton]";
import { enregistrerDossier } from "../../../../../functions/api/rdv/[jeton]/dossier";
import { annulerRdv } from "../../../../../functions/api/rdv/[jeton]/annuler";
import { deplacerRdv } from "../../../../../functions/api/rdv/[jeton]/deplacer";
import { visioClient } from "../../../../../functions/api/rdv/[jeton]/visio";
import { modifierRdv } from "../../../../../functions/api/cc/rdv/[id]";
import { enregistrerParametres } from "../../../../../functions/api/cc/rdv/parametres";
import { traiterIntake } from "../../../../../functions/api/intake";
import { CHAMPS } from "./dossier";

// Lundi 12 octobre 2026, 09:00 au Maroc (UTC+1).
const LUNDI = Date.parse("2026-10-12T08:00:00Z");
const MARDI_10H = "2026-10-13T09:00:00.000Z";

type Requete = { q: string; v: unknown[] };
/** Faux client SQL : enregistre les requêtes, répond via `repondre`. */
function fauxSql(repondre: (q: string, v: unknown[]) => Record<string, unknown>[] | Error = () => []) {
  const requetes: Requete[] = [];
  const sql = (async (s: TemplateStringsArray, ...v: unknown[]) => {
    const q = s.join("?");
    requetes.push({ q, v });
    if (q.includes("to_regclass")) return [{ r: true, p: true, d: true, u: true, l: true, t: true }];
    const x = repondre(q, v);
    if (x instanceof Error) throw x;
    return x;
  }) as never;
  return { sql, requetes };
}

describe("rendez-vous : fuseau du Maroc", () => {
  it("convertit l'heure du Maroc en UTC (UTC+1 en temps normal)", () => {
    expect(new Date(instantMaroc("2026-10-13", "10:00")).toISOString()).toBe(MARDI_10H);
    expect(heureMaroc(Date.parse(MARDI_10H))).toBe("10:00");
  });
  it("suit le changement d'heure du Ramadan (UTC+0), sans décalage fixe", () => {
    expect(new Date(instantMaroc("2027-02-22", "10:00")).toISOString()).toBe("2027-02-22T10:00:00.000Z");
    expect(new Date(instantMaroc("2027-03-22", "10:00")).toISOString()).toBe("2027-03-22T09:00:00.000Z");
  });
});

describe("rendez-vous : créneaux", () => {
  it("respecte le délai minimum, les plages, le dimanche fermé", () => {
    const jours = genererCreneaux(PARAMETRES_DEFAUT, LUNDI);
    expect(jours[0].date).toBe("2026-10-13"); // aujourd'hui : plus rien après le délai de 12 h
    expect(jours[0].creneaux).toHaveLength(11); // 10:00→12:00 (5) + 15:00→17:30 (6)
    expect(jours[0].creneaux[0]).toEqual({ debut: MARDI_10H, heure: "10:00" });
    expect(jours.some((j) => j.jour === "dimanche")).toBe(false);
    expect(jours.find((j) => j.jour === "samedi")!.creneaux.map((c) => c.heure)).toEqual(["10:00", "10:30", "11:00", "11:30", "12:00"]);
    expect(jours.at(-1)!.date <= "2026-11-01").toBe(true);
  });
  it("exclut fermetures et créneaux occupés (chevauchement)", () => {
    const p = { ...PARAMETRES_DEFAUT, fermetures: ["2026-10-14"] };
    const jours = genererCreneaux(p, LUNDI, [{ debut: Date.parse("2026-10-13T09:15:00Z"), dureeMin: 30 }]);
    expect(jours.some((j) => j.date === "2026-10-14")).toBe(false);
    expect(jours[0].creneaux.map((c) => c.heure).slice(0, 2)).toEqual(["11:00", "11:30"]);
  });
  it("ne propose que les créneaux de la grille", () => {
    expect(creneauPropose(PARAMETRES_DEFAUT, Date.parse(MARDI_10H), LUNDI)).toBe(true);
    expect(creneauPropose(PARAMETRES_DEFAUT, Date.parse("2026-10-13T09:15:00Z"), LUNDI)).toBe(false);
    expect(creneauPropose(PARAMETRES_DEFAUT, Date.parse("2026-10-12T14:00:00Z"), LUNDI)).toBe(false); // avant le délai
  });
});

describe("rendez-vous : paramètres", () => {
  it("valide strictement, lit avec des valeurs par défaut", () => {
    expect(validerParametres(PARAMETRES_DEFAUT).ok).toBe(true);
    expect(validerParametres({ ...PARAMETRES_DEFAUT, dureeMin: 17 })).toEqual({ ok: false, erreur: "dureeMin_invalide" });
    expect(validerParametres({ ...PARAMETRES_DEFAUT, lienVisio: "javascript:alert(1)" })).toEqual({ ok: false, erreur: "lienVisio_invalide" });
    expect(validerParametres({ ...PARAMETRES_DEFAUT, plages: { ...PARAMETRES_DEFAUT.plages, lundi: [["12:00", "10:00"]] } })).toEqual({ ok: false, erreur: "plages_invalide" });
    expect(avecDefauts({ dureeMin: 45, horizonJours: "x" })).toMatchObject({ dureeMin: 45, horizonJours: 21 });
  });
  it("enregistre (upsert) depuis le back-office", async () => {
    const { sql, requetes } = fauxSql();
    const r = await enregistrerParametres(sql, { ...PARAMETRES_DEFAUT, lienVisio: "https://meet.google.com/abc-defg-hij" });
    expect(r.status).toBe(200);
    expect(requetes.some((x) => x.q.includes('INSERT INTO "Parametre"') && x.q.includes("ON CONFLICT"))).toBe(true);
  });
});

describe("rendez-vous : jeton d'accès", () => {
  it("256 bits aléatoires, base64url, haché SHA-256", async () => {
    const a = nouveauJeton(), b = nouveauJeton();
    expect(a).toMatch(JETON_RE);
    expect(a).not.toBe(b);
    const h = await hacherJeton(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hacherJeton(a)).toBe(h);
  });
});

describe("rendez-vous : validation et dossier", () => {
  const BASE = { debut: MARDI_10H, nom: "Test QA", telephone: "+212600000000", email: "qa-test@example.test", objet: "PERMIS", consentement: true };
  it("valide la réservation", () => {
    expect(validerReservation(BASE)).toMatchObject({ nom: "Test QA", porte: "P1", objet: "PERMIS" });
    expect(validerReservation({ ...BASE, consentement: false })).toEqual({ erreur: "consentement_requis" });
    expect(validerReservation({ ...BASE, telephone: "123" })).toEqual({ erreur: "telephone_invalide" });
    expect(validerReservation({ ...BASE, email: "pas-un-mail" })).toEqual({ erreur: "email_invalide" });
    expect(validerReservation({ ...BASE, objet: "TERRAIN" })).toMatchObject({ porte: "P4" });
  });
  it("liste blanche du dossier : jamais CIN / RC / ICE / n° de titre, valeurs bornées", () => {
    const d = filtrerDossier({ cin: "AB123456", rc: "1", ice: "2", numeroTitre: "T-1", projetType: "VILLA", surfaceTerrain: "300", facades: 9, standing: "INCONNU", description: "x".repeat(5000), docNru: true, docPhotos: "oui" });
    expect(d).toEqual({ projetType: "VILLA", surfaceTerrain: 300, description: "x".repeat(2000), docNru: true });
    expect(filtrerDossier("texte")).toBeNull();
  });
  it("les champs du formulaire client sont tous dans la liste blanche", () => {
    for (const c of CHAMPS) expect(Object.keys(CHAMPS_DOSSIER), c.cle).toContain(c.cle);
  });
  it("agenda : lien Google et fichier .ics en UTC", () => {
    const l = lienGoogleAgenda(Date.parse(MARDI_10H), 30, "https://citurbarea.com/rdv/x");
    expect(l).toContain("dates=20261013T090000Z%2F20261013T093000Z");
    const ics = fichierIcs("rdv_test", Date.parse(MARDI_10H), 30, "https://citurbarea.com/rdv/x", LUNDI);
    expect(ics).toContain("DTSTART:20261013T090000Z");
    expect(ics).toContain("\r\nEND:VCALENDAR");
  });
});

describe("rendez-vous : fonctions (fausse base)", () => {
  const BASE = { debut: MARDI_10H, nom: "Test QA", telephone: "+212600000000", email: "qa-test@example.test", objet: "MAISON", consentement: true, website: "" };
  const ip = (n: string) => new Headers({ "cf-connecting-ip": n });

  it("liste les créneaux en excluant les réservés", async () => {
    const { sql } = fauxSql((q) => (q.includes('FROM "RendezVous"') ? [{ debut: new Date(MARDI_10H), dureeMin: 30 }] : []));
    const r = await listerCreneaux(sql, LUNDI);
    expect(r.status).toBe(200);
    const jours = r.json.jours as { creneaux: { debut: string }[] }[];
    expect(jours[0].creneaux.some((c) => c.debut === MARDI_10H)).toBe(false);
  });

  it("réserve : RDV (jeton haché), lead WEB_RDV, compte et dossier", async () => {
    const { sql, requetes } = fauxSql((q) => (q.startsWith('SELECT "id" FROM "User"') ? [] : []));
    const r = await reserver(BASE, sql, ip("10.0.0.1"), LUNDI);
    expect(r.status).toBe(201);
    const jeton = String(r.json.jeton);
    expect(jeton).toMatch(JETON_RE);
    const ins = requetes.find((x) => x.q.startsWith('INSERT INTO "RendezVous"'))!;
    expect(ins.v).toContain(await hacherJeton(jeton));
    expect(ins.v).not.toContain(jeton);
    expect(String(ins.v[2])).toMatch(/^rdv-[a-z0-9]{24}$/);
    const lead = requetes.find((x) => x.q.includes('INSERT INTO "Lead"'))!;
    expect(lead.v).toContain("WEB_RDV");
    expect(requetes.some((x) => x.q.includes('INSERT INTO "User"'))).toBe(true);
    expect(requetes.some((x) => x.q.includes('INSERT INTO "Dossier"'))).toBe(true);
    expect(requetes.some((x) => x.q.startsWith('UPDATE "RendezVous" SET "dossierId"'))).toBe(true);
  });

  it("créneau déjà pris → 409, rien d'écrit", async () => {
    const { sql, requetes } = fauxSql((q) => (q.includes('SELECT "debut", "dureeMin" FROM "RendezVous"') ? [{ debut: MARDI_10H, dureeMin: 30 }] : []));
    const r = await reserver(BASE, sql, ip("10.0.0.2"), LUNDI);
    expect(r).toMatchObject({ status: 409, json: { error: "creneau_pris" } });
    expect(requetes.some((x) => x.q.startsWith("INSERT"))).toBe(false);
  });

  it("course perdue (index unique partiel) → 409", async () => {
    const err = Object.assign(new Error("dup"), { code: "23505" });
    const { sql } = fauxSql((q) => (q.startsWith('INSERT INTO "RendezVous"') ? err : []));
    expect((await reserver(BASE, sql, ip("10.0.0.3"), LUNDI)).status).toBe(409);
  });

  it("refuse un créneau hors grille et simule le succès pour le pot de miel", async () => {
    const { sql, requetes } = fauxSql();
    expect((await reserver({ ...BASE, debut: "2026-10-13T09:10:00Z" }, sql, ip("10.0.0.4"), LUNDI)).json.error).toBe("creneau_invalide");
    const pot = await reserver({ ...BASE, website: "http://spam" }, sql, ip("10.0.0.5"), LUNDI);
    expect(pot.status).toBe(201);
    expect(requetes.some((x) => x.q.startsWith("INSERT"))).toBe(false);
  });

  const ligne = async (jeton: string, debut = MARDI_10H, statut = "CONFIRME") => ({
    id: "rdv_test123456", jetonHash: await hacherJeton(jeton), salle: "rdv-abcdefghijklmnopqrstuvwx", debut: new Date(debut), dureeMin: 30, statut,
    nom: "Test QA", telephone: "+212600000000", email: "qa-test@example.test", objet: "MAISON", porte: "P1", dossierId: "dos_test", dossierRdv: { ville: "Kénitra" },
  });

  it("espace client : ce rendez-vous seulement, sans jeton, salle ni téléphone", async () => {
    const jeton = nouveauJeton();
    const row = await ligne(jeton);
    const { sql } = fauxSql((q, v) => (q.includes('"jetonHash" =') && v[0] === row.jetonHash ? [row] : []));
    const r = await lireRdv(sql, jeton, false, LUNDI);
    expect(r.status).toBe(200);
    const s = JSON.stringify(r.json);
    expect(s).not.toMatch(/jetonHash|rdv-abcdef|212600000000/);
    expect(r.json.rdv).toMatchObject({ statut: "CONFIRME", peutModifier: true, visio: { integree: false, secours: { type: "whatsapp" } } });
    expect((await lireRdv(sql, nouveauJeton(), false, LUNDI)).status).toBe(404);
    expect((await lireRdv(sql, "court", false, LUNDI)).status).toBe(404);
  });

  it("vue client : lien de secours = paramètre lienVisio s'il est renseigné", async () => {
    const v = vueClient(await ligne(nouveauJeton()), { ...PARAMETRES_DEFAUT, lienVisio: "https://meet.google.com/abc-defg-hij" }, false, LUNDI);
    expect(v.visio.secours).toEqual({ type: "lien", url: "https://meet.google.com/abc-defg-hij" });
  });

  it("dossier : enregistré (liste blanche) dans le RDV et le Dossier", async () => {
    const jeton = nouveauJeton();
    const row = await ligne(jeton);
    const { sql, requetes } = fauxSql((q) => (q.includes('"jetonHash" =') ? [row] : []));
    const r = await enregistrerDossier(sql, jeton, { reponses: { ville: "Kénitra", cin: "AB123456", niveaux: 2 } }, LUNDI);
    expect(r.status).toBe(200);
    const maj = requetes.find((x) => x.q.startsWith('UPDATE "RendezVous" SET "dossierRdv"'))!;
    expect(JSON.parse(String(maj.v[0]))).toEqual({ ville: "Kénitra", niveaux: 2, majLe: new Date(LUNDI).toISOString() });
    expect(requetes.some((x) => x.q.startsWith('UPDATE "Dossier" SET "payload" = jsonb_set'))).toBe(true);
    expect((await enregistrerDossier(sql, jeton, { reponses: { description: "x".repeat(20000) } })).status).toBe(400);
  });

  it("annuler / déplacer : jusqu'à 2 h avant", async () => {
    const jeton = nouveauJeton();
    const row = await ligne(jeton);
    const { sql, requetes } = fauxSql((q) => (q.includes('"jetonHash" =') ? [row] : []));
    expect((await annulerRdv(sql, jeton, Date.parse(MARDI_10H) - 3600_000)).json.error).toBe("trop_tard");
    expect((await annulerRdv(sql, jeton, LUNDI)).status).toBe(200);
    expect(requetes.some((x) => x.q.includes(`SET "statut" = 'ANNULE'`))).toBe(true);
    const d = await deplacerRdv(sql, jeton, { debut: "2026-10-13T10:00:00.000Z" }, LUNDI);
    expect(d).toMatchObject({ status: 200, json: { debut: "2026-10-13T10:00:00.000Z" } });
    expect((await deplacerRdv(sql, jeton, { debut: "2026-10-13T10:10:00Z" }, LUNDI)).status).toBe(400);
  });

  it("visio client : fermée sans JaaS, puis hors fenêtre (15 min avant → 2 h après)", async () => {
    const jeton = nouveauJeton();
    const row = await ligne(jeton);
    const { sql } = fauxSql((q) => (q.includes('"jetonHash" =') ? [row] : []));
    expect((await visioClient(sql, {}, jeton, LUNDI)).json.error).toBe("visio_non_configuree");
    const env = { JAAS_APP_ID: "vpaas-magic-cookie-test", JAAS_KEY_ID: "cle", JAAS_PRIVATE_KEY_PEM: "x" };
    expect((await visioClient(sql, env, jeton, Date.parse(MARDI_10H) - 20 * 60_000)).json.error).toBe("trop_tot");
    expect((await visioClient(sql, env, jeton, Date.parse(MARDI_10H) + 3 * 3600_000)).json.error).toBe("termine");
  });

  it("back-office : statut et note validés", async () => {
    const { sql } = fauxSql((q) => (q.startsWith('UPDATE "RendezVous"') ? [{ id: "rdv_test123456" }] : []));
    expect((await modifierRdv(sql, "rdv_test123456", { statut: "TERMINE", noteArchitecte: "RAS" })).status).toBe(200);
    expect((await modifierRdv(sql, "rdv_test123456", { statut: "PAYE" })).status).toBe(400);
    expect((await modifierRdv(sql, "rdv_test123456", {})).status).toBe(400);
    expect((await modifierRdv(sql, "1 OR 1=1", { statut: "TERMINE" })).status).toBe(400);
  });
});

describe("intake : inchangé après extraction de la logique compte + dossier", () => {
  it("crée compte et dossier, rattache le lead", async () => {
    const { sql, requetes } = fauxSql();
    const r = await traiterIntake({ porteType: "P2", clientNom: "Test QA", clientTel: "+212600000000", clientEmail: "qa-test@example.test", nbNiveaux: "2.4" }, sql, "10.0.1.1");
    expect(r.status).toBe(201);
    expect(requetes.some((x) => x.q.includes('INSERT INTO "User"'))).toBe(true);
    const d = requetes.find((x) => x.q.includes('INSERT INTO "Dossier"'))!;
    expect(d.v).toContain("P2");
    expect(d.v).toContain(2);
    expect(requetes.some((x) => x.q.includes('UPDATE "Lead" SET "convertedDossierId"'))).toBe(true);
  });
  it("renvoie le dossier existant de moins de 24 h", async () => {
    const { sql } = fauxSql((q) => (q.startsWith('SELECT "id" FROM "Dossier"') ? [{ id: "dos_existant" }] : []));
    const r = await traiterIntake({ porteType: "P1", clientNom: "Test QA", clientTel: "+212600000000" }, sql, "10.0.1.2");
    expect(r.json).toMatchObject({ ok: true, dossierId: "dos_existant", deja: true });
  });
});
