/**
 * Dépôt de documents commun : contrôles des octets, bascule Neon / R2 (envoi
 * en plusieurs morceaux), modération avant visibilité, liens signés à durée
 * limitée, droits par contexte, versions, suppression logique, quotas,
 * red flag sur les noms, archive Google Drive.
 */
import { describe, expect, it } from "vitest";
import {
  lienSigne, marqueurPdfInterdit, nettoyerNom, planifier, pngPropre, QUOTAS, typeReel, verifierLien,
} from "../../../../../functions/_lib/depotRegles";
import { depotFichiersMemoire } from "../../../../../functions/_lib/depotStockage";
import { routeurDepot, servirFichier, type ActeurDepot, type BucketR2, type CtxDepot } from "../../../../../functions/_lib/depotService";

const T0 = Date.parse("2026-10-15T10:00:00Z");
const SECRET = "d".repeat(40);

// ── Fichiers de test ────────────────────────────────────────────────────
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const morceau = (type: string, data: number[]) => [...u32(data.length), ...Array.from(type, (c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
function png(avecTexte = true): Uint8Array {
  const ihdr = [...u32(64), ...u32(48), 8, 2, 0, 0, 0];
  const texte = Array.from("Comment\u0000Tel 0661223344", (c) => c.charCodeAt(0));
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...morceau("IHDR", ihdr), ...(avecTexte ? morceau("tEXt", texte) : []), ...morceau("IDAT", [1, 2, 3, 4]), ...morceau("IEND", [])]);
}
const pdf = (corps = "1 0 obj << /Type /Catalog >> endobj") => new TextEncoder().encode(`%PDF-1.7\n${corps}\n%%EOF`);
const mp4 = (n: number) => { const o = new Uint8Array(n); o.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); return o; };

// ── Faux R2 (avec multipart) ────────────────────────────────────────────
function r2Memoire() {
  const objets = new Map<string, Uint8Array>();
  const envois = new Map<string, Map<number, Uint8Array>>();
  const objet = (o: Uint8Array, range?: { offset: number; length?: number }) => {
    const part = range ? o.subarray(range.offset, range.length ? range.offset + range.length : undefined) : o;
    return { body: new Blob([part as Uint8Array<ArrayBuffer>]).stream(), size: o.length, range: range ? { offset: range.offset, length: part.length } : undefined, arrayBuffer: async () => part.slice().buffer };
  };
  const b: BucketR2 = {
    put: async (cle, corps) => { objets.set(cle, corps instanceof Uint8Array ? corps.slice() : new Uint8Array(corps as ArrayBuffer)); },
    get: async (cle, o) => { const x = objets.get(cle); if (!x) return null; const r = o?.range && !(o.range instanceof Headers) ? o.range : undefined; return objet(x, r); },
    delete: async (cle) => { objets.delete(cle); },
    createMultipartUpload: async () => { const id = `up${envois.size + 1}`; envois.set(id, new Map()); return { uploadId: id }; },
    resumeMultipartUpload: (cle, uploadId) => ({
      uploadPart: async (n, corps) => { envois.get(uploadId)!.set(n, new Uint8Array(corps as ArrayBuffer).slice()); return { partNumber: n, etag: `e${n}` }; },
      complete: async (parties) => {
        const l = parties.map((p) => envois.get(uploadId)!.get(p.partNumber)!);
        const tout = new Uint8Array(l.reduce((s, x) => s + x.length, 0));
        let i = 0; for (const x of l) { tout.set(x, i); i += x.length; }
        objets.set(cle, tout);
      },
      abort: async () => { envois.delete(uploadId); },
    }),
  };
  return { b, objets };
}

const CLIENT: ActeurDepot = { genre: "client", cle: "usr:u1", nom: "Amina", dossierIds: ["dos_1"] };
const AUTRE: ActeurDepot = { genre: "client", cle: "usr:u2", nom: "Karim", dossierIds: ["dos_1"] };
const INTRUS: ActeurDepot = { genre: "client", cle: "usr:u9", nom: "Intrus", dossierIds: [] };
const CABINET: ActeurDepot = { genre: "admin", cle: "admin:cabinet", nom: "CITURBAREA" };

function banc(avecR2 = false) {
  const depot = depotFichiersMemoire();
  const r2 = r2Memoire();
  const signalements: string[][] = [];
  const archives: string[] = [];
  const c: CtxDepot = {
    depot, maintenant: T0,
    env: { DEPOT_SECRET: SECRET, ...(avecR2 ? { FICHIERS: r2.b } : {}) },
    gardien: { autorise: async (a, contexte, objetId) => a.genre === "admin" || (contexte === "dossier" && !!a.dossierIds?.includes(objetId)) },
    signaler: async (_a, _c, _o, types) => { signalements.push(types); },
    archiver: async (d) => { archives.push(d.id); return `drive_${d.id}`; },
  };
  const req = (m: string, url: string, corps?: unknown) => new Request(`https://citurbarea.com${url}`, {
    method: m, ...(corps instanceof Uint8Array ? { body: corps as Uint8Array<ArrayBuffer> } : corps ? { body: JSON.stringify(corps), headers: { "content-type": "application/json" } } : {}),
  });
  const appel = (a: ActeurDepot, m: string, chemin: string[], corps?: unknown, q = "") => routeurDepot(c, req(m, `/api/x/${chemin.join("/")}${q}`, corps), a, chemin);
  /** Dépôt complet : démarrer, envoyer chaque morceau, terminer. */
  async function deposer(a: ActeurDepot, nom: string, type: string, octets: Uint8Array, meta?: Record<string, string>, brouillon?: boolean) {
    const d = await appel(a, "POST", ["televersements"], { contexte: "dossier", objetId: "dos_1", nom, type, taille: octets.length, meta, brouillon });
    if (d.status !== 201) return d;
    const { id, taillePartie, parties } = d.json as { id: string; taillePartie: number; parties: number };
    for (let n = 1; n <= parties; n++) {
      const r = await appel(a, "PUT", ["televersements", id, String(n)], octets.subarray((n - 1) * taillePartie, n * taillePartie));
      if (r.status !== 200) return r;
    }
    return appel(a, "POST", ["televersements", id, "terminer"]);
  }
  const liste = async (a: ActeurDepot) => ((await appel(a, "GET", [], undefined, "?contexte=dossier&objetId=dos_1")).json.documents as { id: string; statut: string; nom: string; version: number }[]) ?? [];
  return { c, depot, r2, signalements, archives, appel, deposer, liste };
}

describe("dépôt : contrôles purs", () => {
  it("type lu dans les octets", () => {
    expect(typeReel(png())).toBe("image/png");
    expect(typeReel(pdf())).toBe("application/pdf");
    expect(typeReel(mp4(64))).toBe("video/mp4");
    expect(typeReel(new TextEncoder().encode("<svg></svg>"))).toBeNull();
  });
  it("bascule automatique : Neon petit fichier, R2 direct, R2 en plusieurs morceaux ; vidéo refusée sans R2", () => {
    expect(planifier("NEON", "image/png", 1000, "plan.png")).toMatchObject({ ok: true, plan: { mode: "neon", parties: 1 } });
    expect(planifier("NEON", "video/mp4", 1000, "visite.mp4")).toMatchObject({ ok: false, erreur: "video_r2_requis" });
    expect(planifier("NEON", "application/pdf", 3 * 1024 * 1024, "aps.pdf")).toMatchObject({ ok: false, erreur: "fichier_trop_lourd" });
    expect(planifier("R2", "application/pdf", 10 * 1024 * 1024, "aps.pdf")).toMatchObject({ ok: true, plan: { mode: "r2", parties: 1 } });
    expect(planifier("R2", "video/mp4", 2 * 1024 * 1024 * 1024, "visite.mp4")).toMatchObject({ ok: true, plan: { mode: "r2-multipart", parties: 103 } });
    expect(planifier("R2", "image/png", 1000, "plan.pdf")).toMatchObject({ ok: false, erreur: "extension_incoherente" });
    expect(planifier("R2", "application/x-msdownload", 1000, "virus.exe")).toMatchObject({ ok: false, erreur: "type_refuse" });
  });
  it("PNG : métadonnées texte retirées ; PDF : JavaScript, lancement et fichiers joints détectés", () => {
    const p = pngPropre(png())!;
    expect(p.largeur).toBe(64);
    expect(new TextDecoder("latin1").decode(p.octets)).not.toContain("0661223344");
    expect(marqueurPdfInterdit(pdf("/OpenAction << /S /JavaScript /JS (app.alert(1)) >>"))).toBe("/JavaScript");
    expect(marqueurPdfInterdit(pdf("/Type /EmbeddedFile"))).toBe("/EmbeddedFile");
    expect(marqueurPdfInterdit(pdf())).toBeNull();
  });
  it("nom : chemin retiré, coordonnées masquées et signalées", () => {
    const n = nettoyerNom("../plans/APS appelez 0661223344.pdf");
    expect(n.nom).not.toMatch(/0661223344|\.\.\//);
    expect(n.types).toEqual(["telephone"]);
  });
  it("lien signé : valable 15 min, pour CE fichier seulement", async () => {
    const { url } = await lienSigne(SECRET, "doc_abcdefghijklmnopqrstuv", false, T0);
    const q = new URL(`https://x${url}`).searchParams;
    expect(await verifierLien(SECRET, "doc_abcdefghijklmnopqrstuv", q.get("e"), q.get("s"), false, T0 + 60_000)).toBe(true);
    expect(await verifierLien(SECRET, "doc_abcdefghijklmnopqrstuv", q.get("e"), q.get("s"), false, T0 + 16 * 60_000)).toBe(false);
    expect(await verifierLien(SECRET, "doc_bbcdefghijklmnopqrstuv", q.get("e"), q.get("s"), false, T0)).toBe(false);
    expect(await verifierLien(SECRET, "doc_abcdefghijklmnopqrstuv", q.get("e"), q.get("s"), true, T0)).toBe(false);
  });
});

describe("dépôt : parcours", () => {
  it("Neon : le client dépose, le document attend la modération, puis devient visible et archivé ; lien signé requis", async () => {
    const { c, appel, deposer, liste, archives } = banc();
    const r = await deposer(CLIENT, "Plan RDC.png", "image/png", png(), { phase: "APS", categorie: "plan-niveau", niveau: "RDC" });
    expect(r.status).toBe(200);
    const doc = (r.json.document as { id: string; statut: string; meta: Record<string, string> });
    expect(doc.statut).toBe("A_MODERER");
    expect(doc.meta).toEqual({ phase: "APS", categorie: "plan-niveau", niveau: "RDC" });
    expect((await liste(AUTRE)).map((d) => d.id)).toEqual([]);
    expect((await liste(CLIENT)).map((d) => d.id)).toEqual([doc.id]);
    expect((await appel(INTRUS, "GET", [], undefined, "?contexte=dossier&objetId=dos_1")).status).toBe(403);
    expect((await appel(AUTRE, "GET", [doc.id, "lien"])).status).toBe(404);
    expect((await appel(CLIENT, "POST", [doc.id, "moderer"], { decision: "VISIBLE" })).status).toBe(403);
    expect((await appel(CABINET, "POST", [doc.id, "moderer"], { decision: "VISIBLE" })).status).toBe(200);
    expect(archives).toEqual([doc.id]);
    expect((await liste(AUTRE)).map((d) => d.id)).toEqual([doc.id]);
    const l = await appel(AUTRE, "GET", [doc.id, "lien"]);
    const url = String(l.json.url);
    const fichier = await servirFichier(c, new Request(`https://citurbarea.com${url}`), doc.id);
    expect(fichier.status).toBe(200);
    expect(fichier.headers.get("content-type")).toBe("image/png");
    expect(new TextDecoder("latin1").decode(new Uint8Array(await fichier.arrayBuffer()))).not.toContain("0661223344");
    expect((await servirFichier(c, new Request(`https://citurbarea.com/api/depot/f/${doc.id}`), doc.id)).status).toBe(404);
    c.maintenant = T0 + 20 * 60_000;
    expect((await servirFichier(c, new Request(`https://citurbarea.com${url}`), doc.id)).status).toBe(404);
  });

  it("le cabinet dépose : visible d'emblée ; même nom → version 2, l'ancienne reste", async () => {
    const { deposer, liste } = banc();
    await deposer(CABINET, "APS façades.pdf", "application/pdf", pdf(), { categorie: "facade" });
    await deposer(CABINET, "aps-facades.pdf", "application/pdf", pdf("2 0 obj << >> endobj"), { categorie: "facade" });
    const l = await liste(CLIENT);
    expect(l.map((d) => [d.statut, d.version])).toEqual([["VISIBLE", 2], ["VISIBLE", 1]]);
  });

  it("brouillon du cabinet : non publié (visible du cabinet seul) jusqu'à la publication ; ignoré pour un client", async () => {
    const { deposer, liste, appel } = banc();
    const r = await deposer(CABINET, "APS-plan-niveau-r-1.pdf", "application/pdf", pdf(), { phase: "APS" }, true);
    const id = (r.json.document as { id: string; statut: string }).id;
    expect((r.json.document as { statut: string }).statut).toBe("A_MODERER");
    expect(await liste(CLIENT)).toEqual([]);
    expect((await appel(CABINET, "GET", ["a-moderer"])).json.documents).toEqual([]); // un brouillon n'est pas « à vérifier »
    expect((await appel(CABINET, "POST", [id, "moderer"], { decision: "VISIBLE" })).status).toBe(200);
    expect((await liste(CLIENT)).map((d) => d.id)).toEqual([id]);
    const c = await deposer(CLIENT, "photo.png", "image/png", png(false), undefined, true);
    expect((c.json.document as { statut: string }).statut).toBe("A_MODERER");
  });

  it("refus automatiques : PDF actif, type incohérent, vidéo sans R2 ; trace gardée sans octets", async () => {
    const { depot, deposer, appel } = banc();
    const r = await deposer(CLIENT, "devis.pdf", "application/pdf", pdf("/AA << /JS (x) >>"));
    expect(r.json.error).toBe("pdf_contenu_actif");
    const refuse = [...depot.lignes.values()][0];
    expect(refuse.statut).toBe("REFUSE");
    expect(refuse.octets).toBeNull();
    expect((await deposer(CLIENT, "faux.pdf", "application/pdf", png())).json.error).toBe("type_incoherent");
    expect((await appel(CLIENT, "POST", ["televersements"], { contexte: "dossier", objetId: "dos_1", nom: "visite.mp4", type: "video/mp4", taille: 1000 })).json.error).toBe("video_r2_requis");
  });

  it("R2 : vidéo de 45 Mo envoyée en 3 morceaux, lecture par plage (Range)", async () => {
    const { c, r2, deposer } = banc(true);
    const v = mp4(45 * 1024 * 1024);
    const r = await deposer(CABINET, "Visite 3D.mp4", "video/mp4", v, { categorie: "video", phase: "APD" });
    expect(r.status).toBe(200);
    const id = (r.json.document as { id: string }).id;
    expect([...r2.objets.values()][0].length).toBe(v.length);
    const { url } = await lienSigne(SECRET, id, false, T0);
    const plage = await servirFichier(c, new Request(`https://citurbarea.com${url}`, { headers: { range: "bytes=0-99" } }), id);
    expect(plage.headers.get("content-type")).toBe("video/mp4");
  });

  it("suppression logique : plus visible des autres, conservée (octets et auteur) pour le cabinet", async () => {
    const { depot, deposer, appel, liste } = banc();
    const r = await deposer(CABINET, "notice.pdf", "application/pdf", pdf());
    const id = (r.json.document as { id: string }).id;
    expect((await appel(CLIENT, "DELETE", [id])).status).toBe(403);
    expect((await appel(CABINET, "DELETE", [id])).status).toBe(200);
    expect(await liste(CLIENT)).toEqual([]);
    expect((await liste(CABINET))[0]).toMatchObject({ id, statut: "SUPPRIME" });
    expect(depot.lignes.get(id)!.octets).toBeTruthy();
  });

  it("red flag et quotas : nom avec numéro masqué et signalé ; 60 documents au plus par contexte", async () => {
    const { depot, deposer, signalements, appel } = banc();
    const r = await deposer(CLIENT, "WhatsApp 0661223344.png", "image/png", png(false));
    expect((r.json.document as { nom: string }).nom).not.toContain("0661223344");
    expect(signalements[0]).toEqual(expect.arrayContaining(["telephone"]));
    for (let i = 0; i < QUOTAS.documentsParContexte; i++) {
      const id = `doc_quota${String(i).padStart(13, "0")}`;
      depot.lignes.set(id, { ...depot.lignes.values().next().value!, id, statut: "VISIBLE", createdAt: new Date(T0 - 3 * 86400_000).toISOString() });
    }
    expect((await appel(CABINET, "POST", ["televersements"], { contexte: "dossier", objetId: "dos_1", nom: "x.pdf", type: "application/pdf", taille: 100 })).json.error).toBe("quota_contexte");
  });
});
