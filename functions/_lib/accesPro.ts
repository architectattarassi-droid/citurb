/**
 * Outils pro réservés aux membres agréés par CITURBAREA (contrat :
 * docs/architecture/contrat-acces-pro.md). Contrôle côté serveur :
 *   - `exigerAcces(depot, fournisseurId, outil)` dans chaque Function d'outil ;
 *   - et, d'office, le middleware functions/api/cercles/espace/outils/_middleware.ts
 *     pour toute route placée sous /api/cercles/espace/outils/<segment>/….
 * Règle unique (domain/cercles/accesPro.ts, aAcces) : pro agréé ET (formule PREMIUM
 * sauf retrait explicite de l'outil, OU accord manuel de l'admin). Membre de base,
 * pro non agréé ou suspendu → 403 « acces_reserve ».
 */
import { aAcces, estOutil, FORMULE_PREMIUM, sourceAcces, LISTE_OUTILS, OUTIL_PAR_SEGMENT, OUTILS_PRO, type DemandeAcces, type DroitOutil, type OutilPro } from "../../apps/web/src/domain/cercles/accesPro";
import { clip, destinatairesAdmin, echapperHtml, envoyerEmail, erreur, maintenantIso, type EnvCercles, type Reponse } from "./cercles";
import type { Depot, Ligne } from "./fournisseursDepot";

export { aAcces, type OutilPro };
const obj = (v: unknown): Ligne => (v && typeof v === "object" && !Array.isArray(v) ? (v as Ligne) : {});
export const droitsDe = (f: Ligne): Record<string, DroitOutil> => obj(f.acces) as Record<string, DroitOutil>;
export const demandesDe = (f: Ligne): DemandeAcces[] => (Array.isArray(f.accesDemandes) ? (f.accesDemandes as DemandeAcces[]) : []);

/** Vue des accès (espace pro et back-office) : un état par outil, demandes en attente. */
export function vueAcces(f: Ligne) {
  const droits = droitsDe(f), demandes = demandesDe(f);
  return {
    outils: LISTE_OUTILS.map((outil) => ({
      outil, actif: aAcces(f, outil), source: sourceAcces(f, outil), retire: droits[outil]?.actif === false, depuis: droits[outil]?.depuis ?? null, expireLe: droits[outil]?.expireLe ?? null,
      demandeLe: demandes.find((d) => d.outil === outil)?.le ?? null,
    })),
    demandes, premium: f.formule === FORMULE_PREMIUM,
  };
}

/** Garde serveur : null si l'accès est accordé, sinon la réponse d'erreur à renvoyer. */
export async function exigerAcces(depot: Pick<Depot, "fParId">, fournisseurId: string, outil: OutilPro): Promise<Reponse | null> {
  const f = await depot.fParId(fournisseurId);
  if (!f || (f.statut !== "PENDING" && f.statut !== "APPROVED")) return erreur(401, "unauthenticated");
  return aAcces(f, outil) ? null : erreur(403, "acces_reserve", { outil });
}

/** POST /api/cercles/espace/acces/demande {outil, message?} — demande transmise à l'admin (aucune coordonnée échangée). */
export async function demanderAcces(fid: string, body: unknown, depot: Depot, env: EnvCercles, attendre?: (p: Promise<unknown>) => void): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!f || (f.statut !== "PENDING" && f.statut !== "APPROVED")) return erreur(401, "unauthenticated");
  const b = obj(body);
  if (!estOutil(b.outil)) return erreur(400, "outil_invalide");
  const outil = b.outil;
  if (aAcces(f, outil)) return { status: 200, json: { ok: true, acces: vueAcces(f) } };
  const demandes = demandesDe(f).filter((d) => d.outil !== outil);
  const demande: DemandeAcces = { outil, le: maintenantIso(), message: clip(b.message, 300) || null };
  const maj = await depot.fMajAcces(fid, droitsDe(f), [...demandes, demande], { at: demande.le, kind: "ACCES_DEMANDE", payload: { outil } });
  const alerte = envoyerEmail(env, {
    to: destinatairesAdmin(env),
    subject: `Demande d'accès « ${OUTILS_PRO[outil].libelle.fr} » — ${String(f.raisonSociale)}`,
    text: `${String(f.raisonSociale)} demande l'accès à ${OUTILS_PRO[outil].libelle.fr}.\nÀ décider : https://admin.citurbarea.com/cc/fournisseurs`,
    html: `<p><strong>${echapperHtml(String(f.raisonSociale))}</strong> demande l'accès à ${echapperHtml(OUTILS_PRO[outil].libelle.fr)}.</p><p><a href="https://admin.citurbarea.com/cc/fournisseurs">Décider dans le back-office</a></p>`,
  });
  if (attendre) attendre(alerte);
  return { status: 200, json: { ok: true, acces: vueAcces(maj || f) } };
}

/** PATCH /api/cc/fournisseurs/:id/acces {outil, actif, expireLe?, motif?} — accorder ou retirer un outil (daté, tracé). */
export async function modifierAcces(fid: string, body: unknown, auteur: string, depot: Depot): Promise<Reponse> {
  const f = await depot.fParId(fid);
  if (!f) return erreur(404, "not_found");
  const b = obj(body);
  if (!estOutil(b.outil) || typeof b.actif !== "boolean") return erreur(400, "outil_invalide");
  const outil = b.outil, actif = b.actif;
  const expireLe = clip(b.expireLe, 10) || null;
  if (expireLe && (!/^\d{4}-\d{2}-\d{2}$/.test(expireLe) || Number.isNaN(Date.parse(expireLe)))) return erreur(400, "date_invalide");
  if (actif && f.statut !== "APPROVED") return erreur(409, "pro_non_verifie");
  const le = maintenantIso();
  const droits = { ...droitsDe(f), [outil]: { actif, depuis: le, par: auteur, expireLe: actif ? expireLe : null } };
  const maj = await depot.fMajAcces(fid, droits, demandesDe(f).filter((d) => d.outil !== outil),
    { at: le, kind: actif ? "ACCES_ACCORDE" : "ACCES_RETIRE", payload: { outil, auteur, expireLe, motif: clip(b.motif, 300) || null } });
  return { status: 200, json: { ok: true, acces: vueAcces(maj || f) } };
}

export const OUTILS = LISTE_OUTILS;

/** Garde du middleware des outils : outil déduit du chemin (/api/cercles/espace/outils/<segment>/…), null si l'accès est accordé. */
export async function garderOutil(chemin: string, fournisseurId: string, depot: Pick<Depot, "fParId"> | null): Promise<Reponse | null> {
  const segment = chemin.split("/api/cercles/espace/outils/")[1]?.split("/")[0] || "";
  const outil = OUTIL_PAR_SEGMENT[segment];
  if (!outil) return erreur(404, "not_found");
  if (!depot) return erreur(503, "storage_unavailable");
  return exigerAcces(depot, fournisseurId, outil);
}
