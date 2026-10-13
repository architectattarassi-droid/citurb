/**
 * Espace projet — client des Pages Functions.
 * Même interface pour les membres (base /api/projets, cookie de session) et le
 * back-office (base /api/cc/projets, session d'administration) : la vue est commune.
 */
import type { Exigence, ModeleDocument, Norme, PointChecklist, Role } from "../../domain/referentiel/types";
import type { ConfigVisio } from "../visio/SalleVisio";

export const BASE_MEMBRE = "/api/projets";
export const BASE_ADMIN = "/api/cc/projets";

export type StatutJalon = "A_FAIRE" | "EN_COURS" | "EN_ATTENTE_VALIDATION" | "VALIDE" | "BLOQUE" | "SANS_OBJET";

export type ResumeJalon = {
  code: string; phase: string; phaseGabarit: string | null; niveau: string | null; titre: string; ordre: number; lot: string | null;
  pointArret: boolean; acteurs: Role[]; validateurs: Role[]; prerequis: string[]; statut: StatutJalon;
  nbPoints: number; nbFaits: number; nbDocuments: number; valideLe: string | null; maPart: boolean; aValider: boolean;
};
export type Membre = { id: string; role: Role; nom: string; entreprise: string | null; actif: boolean; telephone?: string | null; email?: string | null; dernierAcces?: string | null; createdAt?: string };
export type Message = { id: string; jalonCode: string; jalonTitre?: string; auteurNom: string; auteurRole: string; createdAt: string; masque: boolean; texte: string; pieceIds: string[] };
export type Fichier = { id: string; jalonCode: string | null; pointId: string | null; auteurNom: string; nom: string; type: string; taille: number; nature: string; createdAt: string };
export type Caracteristiques = { type: string; sousSols: number; etagesHorsSol: number; hauteurM?: number; zoneSismique?: number; erp: boolean; ascenseur: boolean; piscine: boolean };

export type VueProjetDonnees = {
  projet: { id: string; titre: string; dossierId: string | null; caracteristiques: Caracteristiques; referentielVersion: string; phases: Record<string, string>; createdAt: string };
  moi: { kind: "admin" | "membre"; role: Role; nom: string; superviseur: boolean; membreId: string | null };
  jalons: ResumeJalon[]; membres: Membre[]; derniersMessages: Message[]; dernieresPhotos: Fichier[]; stockage: boolean; visio: boolean;
};

export type EtatPoint = { fait: boolean; par: string; role: Role; le: string; preuveIds: string[]; commentaire: string };
export type Signature = { membreId: string | null; nom: string; role: Role; le: string };
export type DocumentRempli = { id: string; jalonCode: string; modeleId: string; valeurs: Record<string, unknown>; statut: "BROUILLON" | "SIGNE"; signatures: Signature[]; auteurNom: string | null; createdAt: string; updatedAt: string };

export type DetailJalon = {
  jalon: {
    code: string; phase: string; phaseGabarit?: string; niveau?: string; lot?: string; titre: string; objectif: string; prerequis: string[];
    acteurs: Role[]; validateurs: Role[]; checklist: PointChecklist[]; documents: string[]; pointArret: boolean;
    statut: StatutJalon; checklistEtat: Record<string, EtatPoint>; validePar: string | null; valideLe: string | null; phaseTitre: string | null;
  };
  prerequisEtat: { code: string; statut: StatutJalon | null; pointArret: boolean }[];
  exigences: Exigence[]; normes: Norme[]; modeles: ModeleDocument[]; documents: DocumentRempli[]; fichiers: Fichier[];
  droits: { contribuer: boolean; rediger: boolean; signerModeles: string[]; cocher: string[]; statuts: StatutJalon[]; moderateur: boolean };
  stockage: boolean; visio: boolean;
};

export type Resultat<T> = { ok: true; data: T } | { ok: false; error: string; status: number; data?: Record<string, unknown> };

export async function appel<T>(url: string, init?: RequestInit): Promise<Resultat<T>> {
  try {
    const r = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init, headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...(init?.headers || {}) } });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    if (r.ok && j?.ok) return { ok: true, data: j as T };
    return { ok: false, error: j?.error || `http_${r.status}`, status: r.status, data: j ?? undefined };
  } catch {
    return { ok: false, error: "reseau", status: 0 };
  }
}

const e = encodeURIComponent;
const corps = (methode: string, b: unknown): RequestInit => ({ method: methode, body: JSON.stringify(b) });

export const echangerJeton = (jeton: string) => appel<{ projetId: string }>(`${BASE_MEMBRE}/acces`, corps("POST", { jeton }));
export const moi = () => appel<{ membre: Membre; projet: { id: string; titre: string } }>(`${BASE_MEMBRE}/moi`);
export const sortir = () => appel<Record<string, never>>(`${BASE_MEMBRE}/sortie`, corps("POST", {}));

export const lireProjet = (base: string, id: string) => appel<VueProjetDonnees>(`${base}/${e(id)}`);
export const lireJalon = (base: string, id: string, code: string) => appel<DetailJalon>(`${base}/${e(id)}/jalons/${e(code)}`);
export const changerStatut = (base: string, id: string, code: string, statut: StatutJalon) => appel<{ statut: StatutJalon }>(`${base}/${e(id)}/jalons/${e(code)}`, corps("PATCH", { statut }));
export const cocher = (base: string, id: string, code: string, point: { id: string; fait: boolean; preuveIds?: string[]; commentaire?: string }) =>
  appel<{ point: EtatPoint }>(`${base}/${e(id)}/jalons/${e(code)}`, corps("PATCH", { point }));

export const lireMessages = (base: string, id: string, code: string, o: { apres?: string; avant?: string } = {}) => {
  const q = new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
  return appel<{ messages: Message[]; pieces: Fichier[]; peutEcrire: boolean }>(`${base}/${e(id)}/jalons/${e(code)}/messages${q ? `?${q}` : ""}`);
};
export const posterMessage = (base: string, id: string, code: string, texte: string, pieceIds: string[] = []) =>
  appel<{ message: Message }>(`${base}/${e(id)}/jalons/${e(code)}/messages`, corps("POST", { texte, pieceIds }));
export const masquerMessage = (id: string, mid: string, masque: boolean) => appel(`${BASE_ADMIN}/${e(id)}/messages/${e(mid)}`, corps("PATCH", { masque }));

export const creerDocument = (base: string, id: string, code: string, modeleId: string, valeurs: Record<string, unknown> = {}) =>
  appel<{ document: DocumentRempli }>(`${base}/${e(id)}/jalons/${e(code)}/documents`, corps("POST", { modeleId, valeurs }));
export const enregistrerDocument = (base: string, id: string, did: string, valeurs: Record<string, unknown>) =>
  appel<{ document: DocumentRempli }>(`${base}/${e(id)}/documents/${e(did)}`, corps("PATCH", { valeurs }));
export const signerDocument = (base: string, id: string, did: string) => appel<{ document: DocumentRempli }>(`${base}/${e(id)}/documents/${e(did)}`, corps("PATCH", { signer: true }));

export const ouvrirVisio = (base: string, id: string, code: string) => appel<{ config: ConfigVisio }>(`${base}/${e(id)}/jalons/${e(code)}/visio`, corps("POST", {}));

export const urlFichier = (base: string, id: string, fid: string) => `${base}/${e(id)}/fichiers/${e(fid)}`;

// ── Membres (architecte / administration) ───────────────────────────────

export type Invitation = { role: Role; nom: string; telephone?: string; email?: string; entreprise?: string; envoyerEmail?: boolean };
export const lireMembres = (base: string, id: string) => appel<{ membres: Membre[] }>(`${base}/${e(id)}/membres`);
export const inviter = (base: string, id: string, m: Invitation) => appel<{ membre: Membre; lien: string; emailEnvoye: boolean }>(`${base}/${e(id)}/membres`, corps("POST", m));
export const activerMembre = (base: string, id: string, mid: string, actif: boolean) => appel<{ membre: Membre }>(`${base}/${e(id)}/membres/${e(mid)}`, corps("PATCH", { actif }));
export const regenererLien = (base: string, id: string, mid: string, envoyerEmail = false) => appel<{ lien: string; emailEnvoye: boolean }>(`${base}/${e(id)}/membres/${e(mid)}/lien`, corps("POST", { envoyerEmail }));
export const lireJournal = (base: string, id: string) => appel<{ evenements: { id: string; auteur: string; action: string; cible: string | null; details: Record<string, unknown> | null; createdAt: string }[] }>(`${base}/${e(id)}/journal`);

// ── Dépôt de fichier (PUT en flux, progression) ─────────────────────────

/** Réduit une photo lourde avant envoi (3G de chantier) : 2 560 px max, JPEG 85 %. Sinon renvoie l'original. */
export async function reduirePhoto(f: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function") return f;
  try {
    const img = await createImageBitmap(f);
    const k = Math.min(1, 2560 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    img.close?.();
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.(png|webp)$/i, ".jpg"), { type: "image/jpeg" });
  } catch {
    return f;
  }
}

export function deposer(base: string, id: string, f: File, o: { jalon?: string; point?: string; nature?: string }, progression?: (p: number) => void): Promise<Resultat<{ fichier: Fichier }>> {
  return new Promise((resoudre) => {
    const x = new XMLHttpRequest();
    x.open("PUT", `${base}/${e(id)}/fichiers`);
    x.setRequestHeader("content-type", f.type || "application/octet-stream");
    x.setRequestHeader("x-nom", e(f.name));
    if (o.jalon) x.setRequestHeader("x-jalon", o.jalon);
    if (o.point) x.setRequestHeader("x-point", o.point);
    if (o.nature) x.setRequestHeader("x-nature", o.nature);
    x.upload.onprogress = (ev) => { if (ev.lengthComputable) progression?.(ev.loaded / ev.total); };
    x.onload = () => {
      let j: Record<string, unknown> | null = null;
      try { j = JSON.parse(x.responseText); } catch { j = null; }
      if (x.status >= 200 && x.status < 300 && j?.ok) resoudre({ ok: true, data: j as { fichier: Fichier } });
      else resoudre({ ok: false, error: String(j?.error || `http_${x.status}`), status: x.status });
    };
    x.onerror = () => resoudre({ ok: false, error: "reseau", status: 0 });
    x.send(f);
  });
}
