/**
 * Drapeaux de fonctionnalités (lus à la compilation, variables Vite).
 *
 * ACHAT_EN_LIGNE — phase 2 de la matériauthèque (commande + paiement en
 * ligne). DÉSACTIVÉ : les écrans s'affichent en « bientôt disponible ».
 * À n'activer (VITE_ACHAT_EN_LIGNE=on dans Cloudflare Pages) qu'une fois
 * réunis contrat fournisseur, compte marchand, CGV et séquestre
 * (docs/achat-en-ligne.md).
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const ACHAT_EN_LIGNE = env.VITE_ACHAT_EN_LIGNE === "on";
