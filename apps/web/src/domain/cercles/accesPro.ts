/**
 * Outils réservés (décision du fondateur, 15/10/2026). Deux voies d'ouverture :
 *   (a) accord de l'administration, outil par outil, membre par membre ;
 *   (b) formule PREMIUM ("Fournisseur"."formule", activée par l'admin, paiement
 *       plus tard) : tous les outils, sauf retrait explicite d'un outil.
 * Membre de base (GRATUIT) : fiche, catalogue, messagerie, demandes de prix,
 * appels vidéo — aucun outil réservé. La matériauthèque publique (/materiaux, prix de
 * référence, demande de prix) reste ouverte à tous. Contrat :
 * docs/architecture/contrat-acces-pro.md. Partagé front / Pages Functions.
 */
import type { L3 } from "./libelles";

const l = (fr: string, ar: string, en: string): L3 => ({ fr, ar, en });

export const OUTILS_PRO = {
  MATERIAUTHEQUE_PRO: { libelle: l("Matériauthèque pro (prix marché détaillés, position de mes prix)", "مكتبة المواد للمهنيين (أسعار السوق المفصلة، موقع أسعاري)", "Pro materials library (detailed market prices, my price position)"), segment: "materiautheque-pro" },
  CHIFFRAGE_PRO: { libelle: l("Calcul et chiffrage pro", "الحساب والتقدير المهني", "Pro calculation and estimating"), segment: "chiffrage-pro" },
  CPS: { libelle: l("Cahier des prescriptions spéciales (CPS)", "دفتر الشروط الخاصة", "Special specifications (CPS)"), segment: "cps" },
  BUDGETISATION: { libelle: l("Budgétisation", "إعداد الميزانية", "Budgeting"), segment: "budgetisation" },
  FACTURATION: { libelle: l("Devis et facturation", "عروض الأسعار والفوترة", "Quotes and invoicing"), segment: "facturation" },
} as const;

export type OutilPro = keyof typeof OUTILS_PRO;
export const LISTE_OUTILS = Object.keys(OUTILS_PRO) as OutilPro[];
export const estOutil = (v: unknown): v is OutilPro => typeof v === "string" && v in OUTILS_PRO;
/** Segment d'URL → outil (routes protégées sous /api/cercles/espace/outils/<segment>/…). */
export const OUTIL_PAR_SEGMENT: Record<string, OutilPro> = Object.fromEntries(LISTE_OUTILS.map((o) => [OUTILS_PRO[o].segment, o]));

/** Droit stocké dans "Fournisseur"."acces" : { OUTIL: { actif, depuis, par, expireLe? } }. */
export interface DroitOutil { actif: boolean; depuis: string; par: string; expireLe?: string | null }
export interface DemandeAcces { outil: OutilPro; le: string; message?: string | null }

export const FORMULE_PREMIUM = "PREMIUM";
export type SourceAcces = "accord" | "premium" | null;

/**
 * Origine de l'accès : "accord" (droit actif, non expiré), "premium" (formule PREMIUM sans retrait
 * explicite de l'outil), sinon null. Toujours null si le pro n'est pas agréé (APPROVED).
 */
export function sourceAcces(f: { statut?: unknown; acces?: unknown; formule?: unknown } | null | undefined, outil: OutilPro, maintenant = Date.now()): SourceAcces {
  if (!f || f.statut !== "APPROVED") return null;
  const d = (f.acces && typeof f.acces === "object" ? (f.acces as Record<string, DroitOutil>)[outil] : undefined);
  if (d && d.actif === true && (!d.expireLe || Date.parse(d.expireLe) >= maintenant)) return "accord";
  if (f.formule === FORMULE_PREMIUM && !(d && d.actif === false)) return "premium";
  return null;
}

/** Règle unique : PREMIUM (sauf retrait explicite) OU accord manuel de l'admin, pour un pro agréé. */
export const aAcces = (f: Parameters<typeof sourceAcces>[0], outil: OutilPro, maintenant = Date.now()): boolean => sourceAcces(f, outil, maintenant) !== null;

export const MESSAGE_RESERVE = l(
  "Réservé aux membres Premium ou agréés par CITURBAREA — demander l'accès",
  "مخصص لأعضاء بريميوم أو المعتمدين من طرف سيتوربارية — اطلب الولوج",
  "Reserved for Premium members or professionals approved by CITURBAREA — request access",
);
