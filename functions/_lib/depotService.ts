/**
 * Dépôt de documents commun — routes, droits, supports (Neon ↔ R2), liens
 * signés, modération. Contrat : docs/architecture/contrat-depot-fichiers.md.
 *
 * Portes d'entrée (chacune authentifie l'acteur puis appelle `routeurDepot`) :
 *   /api/cc/depot (cabinet), /api/client/depot (client), /api/cercles/espace/depot (pro),
 *   /api/projets/depot (membre de projet), /api/depot (lien personnel : en-tête x-acces),
 *   /api/depot/f/<id>?e=&s= (lecture d'un fichier par lien signé).
 * Support choisi seul : binding R2 « FICHIERS » présent → R2 (gros fichiers,
 * vidéos, envoi en plusieurs morceaux) ; sinon Neon (petits fichiers).
 */
import type { TypeCoordonnee } from "./coordonnees";
import {
  CONTEXTES_DEPOT, ID_DOCUMENT_RE, idDocument, lienSigne, lireMeta, marqueurPdfInterdit, nettoyerNom, nomNormalise, OBJET_DEPOT_RE, planifier,
  QUOTAS, statutApresEnvoi, typeReel, validerFichier, validerVignette, verifierLien, visible, vueDocument,
  type ContexteDepot, type LigneDocument, type Support,
} from "./depotRegles";
import type { DepotFichiers } from "./depotStockage";
import { depuisBase64, versHex } from "./images";

// ── R2 (sous-ensemble utilisé) ──────────────────────────────────────────
export interface ObjetR2 { body: ReadableStream; size: number; range?: { offset?: number; length?: number }; arrayBuffer(): Promise<ArrayBuffer> }
export interface EnvoiMultipart { uploadPart(n: number, corps: ArrayBuffer | Uint8Array): Promise<{ partNumber: number; etag: string }>; complete(p: { partNumber: number; etag: string }[]): Promise<unknown>; abort(): Promise<void> }
export interface BucketR2 {
  put(cle: string, corps: ArrayBuffer | Uint8Array | ReadableStream, o?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(cle: string, o?: { range?: { offset: number; length?: number } | Headers }): Promise<ObjetR2 | null>;
  delete(cle: string): Promise<void>;
  createMultipartUpload(cle: string, o?: { httpMetadata?: { contentType?: string } }): Promise<{ uploadId: string }>;
  resumeMultipartUpload(cle: string, uploadId: string): EnvoiMultipart;
}

export interface EnvDepot {
  FICHIERS?: BucketR2;
  DEPOT_SECRET?: string;
  APPELS_SECRET?: string;
  ADMIN_SESSION_SECRET?: string;
  LEAD_NOTIFY_TO?: string;
  PUBLIC_WEB_URL?: string;
}

/** Qui agit (authentifié par la porte d'entrée). */
export type ActeurDepot = {
  genre: "admin" | "client" | "pro" | "membre" | "lien";
  cle: string;
  nom: string;
  dossierIds?: string[];
  projetId?: string;
  /** Accès par lien personnel : ce lien n'ouvre que CET objet. */
  lien?: { contexte: ContexteDepot; objetId: string };
};

/** Appartenance au contexte (Neon en production, faux en test). */
export interface Gardien { autorise(a: ActeurDepot, contexte: ContexteDepot, objetId: string): Promise<boolean> }

export type CtxDepot = {
  depot: DepotFichiers;
  gardien: Gardien;
  env: EnvDepot;
  maintenant: number;
  /** Red flag : coordonnées tentées dans un nom ou une légende (types seulement). */
  signaler?: (a: ActeurDepot, contexte: ContexteDepot, objetId: string, types: TypeCoordonnee[]) => Promise<void>;
  /** Archive Google Drive d'un document devenu VISIBLE (renvoie l'identifiant Drive). */
  archiver?: (d: LigneDocument, octets: () => Promise<Uint8Array | ReadableStream | null>) => Promise<string | null>;
  attendre?: (p: Promise<unknown>) => void;
};

export type Reponse = { status: number; json: Record<string, unknown> };
const ok = (json: Record<string, unknown> = {}, status = 200): Reponse => ({ status, json: { ok: true, ...json } });
const ko = (status: number, error: string): Reponse => ({ status, json: { ok: false, error } });
export const repondre = (r: Reponse): Response =>
  new Response(JSON.stringify(r.json), { status: r.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
export const indisponible = (): Reponse => ko(503, "depot_indisponible");
export const segments = (p: string | string[] | undefined): string[] => (Array.isArray(p) ? p : p ? [p] : []).filter(Boolean);

export function secretDepot(env: EnvDepot): string | null {
  const s = (env.DEPOT_SECRET || "").trim() || (env.APPELS_SECRET || "").trim() || (env.ADMIN_SESSION_SECRET || "").trim();
  return s.length >= 32 ? s : null;
}
export const supportDe = (env: EnvDepot): Support => (env.FICHIERS ? "R2" : "NEON");
const iso = (c: CtxDepot, delta = 0) => new Date(c.maintenant - delta).toISOString();
const cleR2De = (contexte: string, objetId: string, id: string) => `depot/${contexte}/${objetId.replace(/[^A-Za-z0-9_.-]/g, "_")}/${id}`;

async function lireJson(req: Request, max = 8 * 1024): Promise<Record<string, unknown> | null> {
  try { const t = await req.text(); if (t.length > max) return null; const v = JSON.parse(t); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { return null; }
}

// ── Envoi ───────────────────────────────────────────────────────────────

async function demarrer(c: CtxDepot, a: ActeurDepot, b: Record<string, unknown> | null): Promise<Reponse> {
  if (!b) return ko(400, "payload_invalid");
  const contexte = String(b.contexte) as ContexteDepot;
  const objetId = typeof b.objetId === "string" ? b.objetId.trim() : "";
  if (!(CONTEXTES_DEPOT as readonly string[]).includes(contexte) || !OBJET_DEPOT_RE.test(objetId)) return ko(400, "contexte_invalide");
  if (!(await c.gardien.autorise(a, contexte, objetId))) return ko(403, "interdit");
  const n = nettoyerNom(b.nom);
  const m = lireMeta(b.meta);
  const tentatives = [...new Set([...n.types, ...m.types])];
  if (tentatives.length) await c.signaler?.(a, contexte, objetId, tentatives).catch(() => undefined);
  const support = supportDe(c.env);
  const p = planifier(support, b.type, b.taille, n.nom);
  if (!p.ok) return ko(p.status, p.erreur);
  const cabinet = a.genre === "admin";
  if (!cabinet && (await c.depot.compterDeposant(a.cle, iso(c, 24 * 3600_000))) >= QUOTAS.depotsParJour) return ko(429, "trop_de_depots");
  const k = await c.depot.compterContexte(contexte, objetId);
  if (k.n >= QUOTAS.documentsParContexte) return ko(507, "quota_contexte");
  if (support === "NEON") {
    if (k.octetsNeon + p.taille > QUOTAS.octetsParContexteNeon) return ko(507, "quota_contexte");
    if ((await c.depot.totalNeon()) + p.taille > QUOTAS.totalNeon) return ko(507, "stockage_plein");
  }
  const id = idDocument();
  const cleR2 = support === "R2" ? cleR2De(contexte, objetId, id) : null;
  let uploadId: string | undefined;
  if (p.plan.mode === "r2-multipart") uploadId = (await c.env.FICHIERS!.createMultipartUpload(cleR2!, { httpMetadata: { contentType: p.type } })).uploadId;
  const le = iso(c);
  await c.depot.creer({
    id, contexte, objetId, deposantCle: a.cle, deposantNom: a.nom, nom: n.nom, nomNormalise: nomNormalise(n.nom), type: p.type, taille: p.taille, empreinte: null,
    support, cleR2, largeur: null, hauteur: null, meta: m.meta, version: 0, statut: "EN_COURS", motif: null, moderePar: null, modereLe: null,
    supprimePar: null, supprimeLe: null,
    // Cabinet : « brouillon » = déposé mais non publié (A_MODERER) jusqu'à POST /api/cc/depot/<id>/moderer { decision: "VISIBLE" }.
    televersement: { plan: p.plan, ...(uploadId ? { uploadId, parties: [] } : {}), ...(cabinet && b.brouillon === true ? { brouillon: true } : {}) }, aVignette: false, driveId: null, createdAt: le, updatedAt: le,
  });
  return ok({ id, ...p.plan, nom: n.nom, nomMasque: n.types.length > 0 }, 201);
}

async function envoyerPartie(c: CtxDepot, a: ActeurDepot, req: Request, id: string, partie: string): Promise<Reponse> {
  const d = await c.depot.lire(id);
  if (!d || d.statut !== "EN_COURS" || d.deposantCle !== a.cle || !d.televersement) return ko(404, "not_found");
  const plan = d.televersement.plan;
  const octets = new Uint8Array(await req.arrayBuffer());
  if (partie === "vignette") {
    const v = validerVignette(octets);
    if (!v) return ko(415, "vignette_invalide");
    if (d.support === "NEON") await c.depot.ecrireOctets(id, null, versHex(v));
    else { await c.env.FICHIERS!.put(`${d.cleR2}.v`, v, { httpMetadata: { contentType: "image/webp" } }); await c.depot.maj(id, { televersement: { ...d.televersement, vignette: "oui" } }); }
    return ok({ vignette: true });
  }
  const n = Number(partie);
  if (!Number.isInteger(n) || n < 1 || n > plan.parties) return ko(400, "partie_invalide");
  if (!octets.length || octets.length > plan.taillePartie || (n < plan.parties && octets.length !== plan.taillePartie && plan.mode === "r2-multipart")) return ko(400, "partie_invalide");
  if (plan.mode === "neon") { await c.depot.ecrireOctets(id, versHex(octets)); return ok({ partie: 1 }); }
  if (plan.mode === "r2") { await c.env.FICHIERS!.put(d.cleR2!, octets, { httpMetadata: { contentType: d.type } }); return ok({ partie: 1 }); }
  const r = await c.env.FICHIERS!.resumeMultipartUpload(d.cleR2!, d.televersement.uploadId!).uploadPart(n, octets);
  const parties = [...(d.televersement.parties || []).filter((x) => x.partNumber !== n), { partNumber: r.partNumber, etag: r.etag }].sort((x, y) => x.partNumber - y.partNumber);
  await c.depot.maj(id, { televersement: { ...d.televersement, parties } });
  return ok({ partie: n });
}

/** Refus à la vérification : octets effacés, trace gardée (statut REFUSE, motif). */
async function refuser(c: CtxDepot, d: LigneDocument, motif: string): Promise<Reponse> {
  if (d.support === "NEON") await c.depot.ecrireOctets(d.id, null);
  else await c.env.FICHIERS!.delete(d.cleR2!).catch(() => undefined);
  await c.depot.maj(d.id, { statut: "REFUSE", motif, moderePar: "controle-automatique", modereLe: iso(c) });
  return ko(415, motif);
}

/** PDF trop gros pour la mémoire : recherche des marqueurs interdits morceau par morceau. */
async function pdfSainEnFlux(flux: ReadableStream): Promise<boolean> {
  const lecteur = flux.getReader();
  let reste = new Uint8Array(0);
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) return true;
    const bloc = new Uint8Array(reste.length + value.length);
    bloc.set(reste); bloc.set(value, reste.length);
    if (marqueurPdfInterdit(bloc)) { await lecteur.cancel(); return false; }
    reste = bloc.subarray(Math.max(0, bloc.length - 32));
  }
}

async function terminer(c: CtxDepot, a: ActeurDepot, id: string): Promise<Reponse> {
  const d = await c.depot.lire(id);
  if (!d || d.statut !== "EN_COURS" || d.deposantCle !== a.cle || !d.televersement) return ko(404, "not_found");
  const plan = d.televersement.plan;
  let maj: Partial<LigneDocument> = {};
  if (d.support === "NEON") {
    const b64 = await c.depot.lireOctets(id, false);
    const o = b64 ? depuisBase64(b64) : null;
    if (!o) return ko(400, "fichier_incomplet");
    const v = await validerFichier(o, d.type, "NEON");
    if (!v.ok) return refuser(c, d, v.erreur);
    await c.depot.ecrireOctets(id, versHex(v.fichier.octets!));
    maj = { taille: v.fichier.octets!.length, empreinte: v.fichier.empreinte, largeur: v.fichier.largeur, hauteur: v.fichier.hauteur };
  } else {
    const r2 = c.env.FICHIERS!;
    if (plan.mode === "r2-multipart") {
      const parties = d.televersement.parties || [];
      if (parties.length !== plan.parties) return ko(400, "fichier_incomplet");
      await r2.resumeMultipartUpload(d.cleR2!, d.televersement.uploadId!).complete(parties);
    }
    const debut = await r2.get(d.cleR2!, { range: { offset: 0, length: 64 } });
    if (!debut) return ko(400, "fichier_incomplet");
    const lu = typeReel(new Uint8Array(await debut.arrayBuffer()));
    const famille = d.type.split("/")[0];
    if (!lu || (lu !== d.type && !(famille === "video" && lu.startsWith("video/")))) return refuser(c, d, "type_incoherent");
    if (famille === "image" || (d.type === "application/pdf" && d.taille <= 50 * 1024 * 1024)) {
      // En mémoire : contrôle complet (images nettoyées de leurs métadonnées puis réécrites).
      const tout = await r2.get(d.cleR2!);
      const o = new Uint8Array(await tout!.arrayBuffer());
      const v = await validerFichier(o, d.type, "R2");
      if (!v.ok) return refuser(c, d, v.erreur);
      if (famille === "image") await r2.put(d.cleR2!, v.fichier.octets!, { httpMetadata: { contentType: d.type } });
      maj = { taille: v.fichier.octets!.length, empreinte: v.fichier.empreinte, largeur: v.fichier.largeur, hauteur: v.fichier.hauteur };
    } else if (d.type === "application/pdf") {
      const tout = await r2.get(d.cleR2!);
      if (!tout || !(await pdfSainEnFlux(tout.body))) return refuser(c, d, "pdf_contenu_actif");
      maj = { taille: tout.size };
    } else {
      const tete = await r2.get(d.cleR2!, { range: { offset: 0, length: 1 } });
      maj = { taille: tete?.size ?? d.taille };
    }
  }
  const version = (await c.depot.versionMax(d.contexte, d.objetId, d.nomNormalise, d.meta.categorie ?? "")) + 1;
  const statut = statutApresEnvoi(a.genre === "admin" && !d.televersement.brouillon);
  await c.depot.maj(id, { ...maj, version, statut });
  const fini = (await c.depot.lire(id))!;
  if (statut === "VISIBLE") lancerArchive(c, fini);
  return ok({ document: vueDocument(fini, a.cle, a.genre === "admin") });
}

// ── Archive Google Drive ────────────────────────────────────────────────

function lancerArchive(c: CtxDepot, d: LigneDocument) {
  if (!c.archiver || d.driveId) return;
  const octets = async () => {
    if (d.support === "NEON") { const b = await c.depot.lireOctets(d.id, false); return b ? depuisBase64(b) : null; }
    return (await c.env.FICHIERS!.get(d.cleR2!))?.body ?? null;
  };
  const p = c.archiver(d, octets).then((driveId) => (driveId ? c.depot.maj(d.id, { driveId }) : undefined)).catch(() => console.error("[depot] archive Drive impossible"));
  if (c.attendre) c.attendre(p); else void p;
}

// ── Lecture, suppression, modération ────────────────────────────────────

async function lister(c: CtxDepot, a: ActeurDepot, url: URL): Promise<Reponse> {
  const contexte = url.searchParams.get("contexte") as ContexteDepot;
  const objetId = url.searchParams.get("objetId") || "";
  if (!(CONTEXTES_DEPOT as readonly string[]).includes(contexte) || !OBJET_DEPOT_RE.test(objetId)) return ko(400, "contexte_invalide");
  if (!(await c.gardien.autorise(a, contexte, objetId))) return ko(403, "interdit");
  const cabinet = a.genre === "admin";
  const l = (await c.depot.lister(contexte, objetId)).filter((d) => visible(d, a.cle, cabinet));
  return ok({ documents: l.map((d) => vueDocument(d, a.cle, cabinet)), support: supportDe(c.env) });
}

async function accessible(c: CtxDepot, a: ActeurDepot, id: string): Promise<LigneDocument | null> {
  if (!ID_DOCUMENT_RE.test(id)) return null;
  const d = await c.depot.lire(id);
  if (!d || !visible(d, a.cle, a.genre === "admin")) return null;
  return (await c.gardien.autorise(a, d.contexte, d.objetId)) ? d : null;
}

async function lien(c: CtxDepot, a: ActeurDepot, id: string, vignette: boolean): Promise<Reponse> {
  const d = await accessible(c, a, id);
  if (!d) return ko(404, "not_found");
  if (vignette && !d.aVignette) return ko(404, "pas_de_vignette");
  return ok(await lienSigne(secretDepot(c.env)!, d.id, vignette, c.maintenant));
}

async function supprimer(c: CtxDepot, a: ActeurDepot, id: string): Promise<Reponse> {
  const d = await accessible(c, a, id);
  if (!d) return ko(404, "not_found");
  if (d.deposantCle !== a.cle && a.genre !== "admin") return ko(403, "interdit");
  // Suppression LOGIQUE : les octets et l'historique restent (décision du fondateur).
  await c.depot.maj(id, { statut: "SUPPRIME", supprimePar: a.nom, supprimeLe: iso(c) });
  return ok({ supprime: true });
}

async function moderer(c: CtxDepot, a: ActeurDepot, id: string, b: Record<string, unknown> | null): Promise<Reponse> {
  if (a.genre !== "admin") return ko(403, "forbidden");
  const d = ID_DOCUMENT_RE.test(id) ? await c.depot.lire(id) : null;
  if (!d || d.statut === "EN_COURS") return ko(404, "not_found");
  const decision = b?.decision;
  if (decision !== "VISIBLE" && decision !== "REFUSE") return ko(400, "decision_invalide");
  const motif = typeof b?.motif === "string" ? b.motif.slice(0, 300) : null;
  await c.depot.maj(id, { statut: decision, motif: decision === "REFUSE" ? motif || "refusé par la modération" : null, moderePar: a.nom, modereLe: iso(c) });
  const fini = (await c.depot.lire(id))!;
  if (decision === "VISIBLE") lancerArchive(c, fini);
  return ok({ document: vueDocument(fini, a.cle, true) });
}

async function aModerer(c: CtxDepot, a: ActeurDepot): Promise<Reponse> {
  if (a.genre !== "admin") return ko(403, "forbidden");
  const l = await c.depot.aModerer(200);
  return ok({ documents: l.map((d) => vueDocument(d, a.cle, true)) });
}

/** Routeur commun (après authentification par la porte d'entrée). */
export async function routeurDepot(c: CtxDepot, req: Request, a: ActeurDepot, chemin: string[]): Promise<Reponse> {
  if (!secretDepot(c.env)) return ko(503, "depot_non_configure");
  if (!(await c.depot.tablePresente())) return indisponible();
  const m = req.method;
  const url = new URL(req.url);
  if (!chemin.length && m === "GET") return lister(c, a, url);
  if (chemin[0] === "a-moderer" && m === "GET") return aModerer(c, a);
  if (chemin[0] === "televersements") {
    if (chemin.length === 1 && m === "POST") return demarrer(c, a, await lireJson(req));
    if (chemin.length === 3 && m === "PUT") return envoyerPartie(c, a, req, chemin[1], chemin[2]);
    if (chemin.length === 3 && chemin[2] === "terminer" && m === "POST") return terminer(c, a, chemin[1]);
  }
  if (chemin.length === 2 && chemin[1] === "lien" && m === "GET") return lien(c, a, chemin[0], url.searchParams.get("taille") === "vignette");
  if (chemin.length === 2 && chemin[1] === "moderer" && m === "POST") return moderer(c, a, chemin[0], await lireJson(req));
  if (chemin.length === 1 && m === "DELETE") return supprimer(c, a, chemin[0]);
  return ko(404, "route_inconnue");
}

/** GET /api/depot/f/<id>?e=&s=[&taille=vignette] : fichier servi sur lien signé seulement. */
export async function servirFichier(c: CtxDepot, req: Request, id: string): Promise<Response> {
  const url = new URL(req.url);
  const vignette = url.searchParams.get("taille") === "vignette";
  const secret = secretDepot(c.env);
  const introuvable = () => new Response("Document introuvable ou lien expiré", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (!secret || !(await verifierLien(secret, id, url.searchParams.get("e"), url.searchParams.get("s"), vignette, c.maintenant))) return introuvable();
  const d = await c.depot.lire(id);
  if (!d || (d.statut !== "VISIBLE" && d.statut !== "A_MODERER" && d.statut !== "PRIVE")) return introuvable();
  const type = vignette ? "image/webp" : d.type;
  const entetes: Record<string, string> = {
    "content-type": type, "cache-control": "private, max-age=600", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; media-src 'self'",
    "content-disposition": `${d.type === "application/pdf" && !vignette ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(d.nom)}`,
    "accept-ranges": d.support === "R2" ? "bytes" : "none", "x-robots-tag": "noindex",
  };
  if (d.support === "NEON") {
    const b = await c.depot.lireOctets(id, vignette);
    const o = b ? depuisBase64(b) : null;
    return o ? new Response(o as Uint8Array<ArrayBuffer>, { headers: entetes }) : introuvable();
  }
  const cle = vignette ? `${d.cleR2}.v` : d.cleR2!;
  const plage = req.headers.get("range");
  const o = await c.env.FICHIERS!.get(cle, plage ? { range: req.headers } : undefined);
  if (!o) return introuvable();
  if (plage && o.range && typeof o.range.offset === "number") {
    const long = typeof o.range.length === "number" ? o.range.length : o.size - o.range.offset;
    entetes["content-range"] = `bytes ${o.range.offset}-${o.range.offset + long - 1}/${o.size}`;
    entetes["content-length"] = String(long);
    return new Response(o.body, { status: 206, headers: entetes });
  }
  entetes["content-length"] = String(o.size);
  return new Response(o.body, { headers: entetes });
}
