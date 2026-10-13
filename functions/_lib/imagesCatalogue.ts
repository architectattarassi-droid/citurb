/**
 * Images des fiches Cercles (galerie d'un produit, d'une prestation ou de la
 * société) : dépôt par le pro, ordre, légende FR/AR, image principale,
 * modération, lecture publique. Une image n'est jamais servie au public
 * avant d'être approuvée (avec son pro et sa fiche). Contrat :
 * docs/architecture/contrat-catalogue.md, « Images ».
 */
import { clip, erreur, nombre, type Reponse } from "./cercles";
import type { DepotCatalogue } from "./catalogueDepot";
import type { Depot, Ligne } from "./fournisseursDepot";
import {
  IMAGE_MAX_COTE, IMAGE_MAX_OCTETS, IMAGES_PAR_FOURNISSEUR, IMAGES_PAR_OBJET, OCTETS_PAR_FOURNISSEUR, VIGNETTE_MAX_COTE, VIGNETTE_MAX_OCTETS,
  depuisBase64, empreinte, idImage, validerImage, versHex,
} from "./images";
import type { DepotImages, OctetsImage } from "./imagesDepot";

type DepotI = Depot & DepotCatalogue & DepotImages;
export const OBJETS_IMAGE = ["PRODUIT", "SERVICE", "SOCIETE"] as const;
const accesOuvert = (f: Ligne | null): f is Ligne => !!f && (f.statut === "PENDING" || f.statut === "APPROVED");
const obj = (v: unknown): Ligne => (v && typeof v === "object" && !Array.isArray(v) ? (v as Ligne) : {});
const txt = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Adresse publique d'une image (empreinte dans l'URL : cache immuable, nouvelle URL si l'image change). */
export const urlImage = (id: string, emp: string, vignette = false) => `/api/catalogue/images/${id}?v=${emp}${vignette ? "&taille=vignette" : ""}`;

export function vueImagePublique(i: Ligne) {
  const id = String(i.id), emp = String(i.empreinte);
  const fr = txt(i.legendeFr), ar = txt(i.legendeAr);
  return {
    id, url: urlImage(id, emp), vignette: urlImage(id, emp, true), principale: i.principale === true, ordre: Number(i.ordre ?? 0),
    legende: fr || ar ? { fr: fr || ar!, ...(ar ? { ar } : {}) } : null, largeur: Number(i.largeur), hauteur: Number(i.hauteur),
  };
}

export function vueImageProprietaire(i: Ligne) {
  const id = String(i.id);
  return {
    id, objetType: String(i.objetType), objetId: String(i.objetId), ordre: Number(i.ordre ?? 0), principale: i.principale === true,
    legendeFr: txt(i.legendeFr), legendeAr: txt(i.legendeAr), statut: String(i.statut), motifRejet: i.statut === "REJECTED" ? txt(i.motifRejet) : null,
    largeur: Number(i.largeur), hauteur: Number(i.hauteur), taille: Number(i.taille) + Number(i.vignetteTaille ?? 0),
    url: `/api/cercles/espace/images/${id}`, vignette: `/api/cercles/espace/images/${id}?taille=vignette`,
  };
}

/** Images publiques regroupées par objet (principale d'abord, puis ordre). */
export function imagesParObjet(l: Ligne[]): Map<string, ReturnType<typeof vueImagePublique>[]> {
  const m = new Map<string, ReturnType<typeof vueImagePublique>[]>();
  for (const i of l) {
    const cle = `${i.objetType}:${i.objetId}`;
    m.set(cle, [...(m.get(cle) || []), vueImagePublique(i)]);
  }
  for (const v of m.values()) v.sort((a, b) => Number(b.principale) - Number(a.principale) || a.ordre - b.ordre);
  return m;
}

async function objetDuPro(fid: string, type: string, id: string, depot: DepotI): Promise<boolean> {
  if (type === "SOCIETE") return id === fid;
  const o = type === "PRODUIT" ? await depot.prParId(id) : type === "SERVICE" ? await depot.svParId(id) : null;
  return !!o && o.fournisseurId === fid;
}

/**
 * POST /api/cercles/espace/images {objetType, objetId, image (base64), vignette (base64), legendeFr?, legendeAr?}.
 * Type réel vérifié, métadonnées retirées, quotas par fiche et par pro ; statut PENDING (modération).
 */
export async function deposerImage(fid: string, body: unknown, depot: DepotI): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const b = obj(body);
  const objetType = clip(b.objetType, 10), objetId = clip(b.objetId, 40);
  if (!(OBJETS_IMAGE as readonly string[]).includes(objetType) || !objetId) return erreur(400, "image_objet_invalide");
  if (!(await objetDuPro(fid, objetType, objetId, depot))) return erreur(404, "not_found");
  const brute = typeof b.image === "string" ? depuisBase64(b.image) : null, bruteV = typeof b.vignette === "string" ? depuisBase64(b.vignette) : null;
  if (!brute || !bruteV) return erreur(400, "image_vide");
  const im = validerImage(brute, IMAGE_MAX_OCTETS, IMAGE_MAX_COTE);
  if (!im.ok) return erreur(400, im.error);
  const vi = validerImage(bruteV, VIGNETTE_MAX_OCTETS, VIGNETTE_MAX_COTE);
  if (!vi.ok) return erreur(400, "vignette_invalide");

  const existantes = (await depot.imListerFournisseur(fid));
  const memeObjet = existantes.filter((i) => i.objetType === objetType && i.objetId === objetId);
  if (memeObjet.length >= IMAGES_PAR_OBJET) return erreur(400, "trop_d_images_fiche", { max: IMAGES_PAR_OBJET });
  const stats = await depot.imStats(fid);
  const poids = im.image.octets.length + vi.image.octets.length;
  if (stats.nb >= IMAGES_PAR_FOURNISSEUR || stats.octets + poids > OCTETS_PAR_FOURNISSEUR) return erreur(400, "quota_images", { max: IMAGES_PAR_FOURNISSEUR, octets: OCTETS_PAR_FOURNISSEUR });

  const ligne = await depot.imInserer({
    id: idImage(), fournisseurId: fid, objetType, objetId, ordre: memeObjet.length, principale: memeObjet.length === 0,
    legendeFr: clip(b.legendeFr, 140) || null, legendeAr: clip(b.legendeAr, 140) || null,
    type: im.image.type, largeur: im.image.largeur, hauteur: im.image.hauteur, taille: im.image.octets.length, octetsHex: versHex(im.image.octets),
    vignetteType: vi.image.type, vignetteTaille: vi.image.octets.length, vignetteHex: versHex(vi.image.octets), empreinte: await empreinte(im.image.octets),
  });
  return { status: 201, json: { ok: true, image: vueImageProprietaire(ligne) } };
}

/** PATCH /api/cercles/espace/images/:id {ordre?, legendeFr?, legendeAr?, principale?: true}. Une légende modifiée repasse en vérification. */
export async function majImage(fid: string, id: string, body: unknown, depot: DepotI): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const i = await depot.imParId(id);
  if (!i || i.fournisseurId !== fid) return erreur(404, "not_found");
  const b = obj(body);
  const ordre = b.ordre === undefined ? Number(i.ordre) : nombre(b.ordre);
  if (ordre === null || ordre < 0 || ordre > 100) return erreur(400, "image_ordre_invalide");
  const legendeFr = b.legendeFr === undefined ? txt(i.legendeFr) : clip(b.legendeFr, 140) || null;
  const legendeAr = b.legendeAr === undefined ? txt(i.legendeAr) : clip(b.legendeAr, 140) || null;
  await depot.imMaj(id, { ordre: Math.round(ordre), legendeFr, legendeAr });
  if ((legendeFr !== txt(i.legendeFr) || legendeAr !== txt(i.legendeAr)) && i.statut === "APPROVED") await depot.imModerer(id, "PENDING", null, `fournisseur:${fid}`);
  if (b.principale === true) await depot.imPrincipale(id);
  return { status: 200, json: { ok: true, image: vueImageProprietaire((await depot.imParId(id)) || i) } };
}

export async function supprimerImage(fid: string, id: string, depot: DepotI): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const r = await depot.imSupprimer(fid, id);
  if (!r) return erreur(404, "not_found");
  // La principale retirée : la suivante de la fiche prend le relais.
  if (r.principale === true) {
    const reste = (await depot.imListerFournisseur(fid)).filter((x) => x.objetType === r.objetType && x.objetId === r.objetId);
    if (reste[0]) await depot.imPrincipale(String(reste[0].id));
  }
  return { status: 200, json: { ok: true } };
}

export async function imagesDuPro(fid: string, depot: DepotI): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!accesOuvert(f)) return erreur(401, "unauthenticated");
  const [l, stats] = await Promise.all([depot.imListerFournisseur(fid), depot.imStats(fid)]);
  return { status: 200, json: { ok: true, images: l.map(vueImageProprietaire), quota: { nb: stats.nb, octets: stats.octets, maxNb: IMAGES_PAR_FOURNISSEUR, maxOctets: OCTETS_PAR_FOURNISSEUR, parFiche: IMAGES_PAR_OBJET } } };
}

/** Octets d'une image pour son propriétaire (aperçu avant modération). */
export async function octetsProprietaire(fid: string, id: string, vignette: boolean, depot: DepotI): Promise<OctetsImage | null> {
  const i = await depot.imParId(id);
  if (!i || i.fournisseurId !== fid) return null;
  return depot.imOctets(id, vignette);
}

// ───── modération ─────

export async function imagesAModerer(statut: string | null, depot: DepotI): Promise<Reponse> {
  if (statut && !["PENDING", "APPROVED", "REJECTED"].includes(statut)) return erreur(400, "statut_invalide");
  const l = await depot.imAModerer(statut);
  return {
    status: 200,
    json: {
      ok: true,
      images: l.map((i) => ({
        ...vueImageProprietaire(i), motifRejet: txt(i.motifRejet), fournisseurId: String(i.fournisseurId), raisonSociale: txt(i.raisonSociale),
        ville: txt(i.ville), objetLibelle: txt(i.objetLibelle), statutObjet: txt(i.statutObjet), statutFournisseur: txt(i.statutFournisseur),
        url: `/api/cc/images/${String(i.id)}`, vignette: `/api/cc/images/${String(i.id)}?taille=vignette`,
      })),
    },
  };
}

/** PATCH /api/cc/images/:id {statut: APPROVED | REJECTED, motif?}. */
export async function modererImage(id: string, body: unknown, auteur: string, depot: DepotI): Promise<Reponse> {
  const b = obj(body);
  const statut = clip(b.statut, 10);
  if (statut !== "APPROVED" && statut !== "REJECTED") return erreur(400, "statut_invalide");
  const motif = clip(b.motif, 300) || null;
  if (statut === "REJECTED" && !motif) return erreur(400, "motif_requis");
  const r = await depot.imModerer(id, statut, statut === "REJECTED" ? motif : null, auteur);
  return r ? { status: 200, json: { ok: true } } : erreur(404, "not_found");
}

// ───── réponse binaire ─────

export function reponseImage(o: OctetsImage | null, req: Request, publique: boolean): Response {
  if (!o || !o.base64) return new Response("Image introuvable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  const etag = `"${o.empreinte}"`;
  const cache = publique ? "public, max-age=31536000, immutable" : "private, no-store";
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag, "cache-control": cache } });
  const octets = depuisBase64(o.base64);
  if (!octets) return new Response("Image illisible", { status: 500 });
  return new Response(octets as Uint8Array<ArrayBuffer>, {
    headers: { "content-type": o.type, "cache-control": cache, etag, "x-content-type-options": "nosniff", "content-disposition": "inline", "content-security-policy": "default-src 'none'" },
  });
}
