/**
 * Questions encore ouvertes (fondateur, 15/10/2026) — laissées paramétrables.
 * Valeurs par défaut ici ; l'admin les change dans /cc (table "Parametre",
 * clé « gestion-projet », déjà créée par docs/sql/rendezvous-neon.sql).
 */
export interface ParametresGestion {
  /** Les raccordements définitifs doivent-ils précéder le permis d'habiter ? (défaut : non — les distributeurs demandent souvent le permis d'habiter pour l'abonnement définitif) */
  raccordementsAvantPermisHabiter: boolean;
  /** La levée de TOUTES les réserves doit-elle précéder le permis d'habiter ? (défaut : non — la levée est contractuelle, le permis administratif) */
  leveeReservesAvantPermisHabiter: boolean;
  /** Article 770 du DOC : délai (jours) pour agir après un désordre décennal ; null = à trancher par un juriste (aucun délai affiché). */
  article770DelaiJours: number | null;
  /** Le client voit-il le budget (estimation, marché) avant la signature du contrat ? (défaut : non) */
  budgetVisibleClientAvantSignature: boolean;
}

export const CLE_PARAMETRES_GESTION = "gestion-projet";

export const PARAMETRES_GESTION_DEFAUT: ParametresGestion = {
  raccordementsAvantPermisHabiter: false,
  leveeReservesAvantPermisHabiter: false,
  article770DelaiJours: null,
  budgetVisibleClientAvantSignature: false,
};

export function validerParametresGestion(v: unknown): ParametresGestion {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const b = (k: keyof ParametresGestion) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (PARAMETRES_GESTION_DEFAUT[k] as boolean));
  const j = Number(o.article770DelaiJours);
  return {
    raccordementsAvantPermisHabiter: b("raccordementsAvantPermisHabiter"),
    leveeReservesAvantPermisHabiter: b("leveeReservesAvantPermisHabiter"),
    article770DelaiJours: o.article770DelaiJours != null && o.article770DelaiJours !== "" && Number.isInteger(j) && j > 0 && j <= 3650 ? j : null,
    budgetVisibleClientAvantSignature: b("budgetVisibleClientAvantSignature"),
  };
}

export const LIBELLES_PARAMETRES: Record<keyof ParametresGestion, string> = {
  raccordementsAvantPermisHabiter: "Les raccordements définitifs (eau, électricité) doivent être faits avant le permis d'habiter",
  leveeReservesAvantPermisHabiter: "Toutes les réserves doivent être levées avant la demande de permis d'habiter",
  article770DelaiJours: "Article 770 du DOC : délai pour agir après un désordre (jours) — vide tant qu'un juriste n'a pas tranché",
  budgetVisibleClientAvantSignature: "Le client voit le budget avant de signer le contrat",
};
