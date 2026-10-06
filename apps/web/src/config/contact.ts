/**
 * Coordonnées publiques du cabinet — source unique pour tout le front.
 * Le fixe est celui déclaré dans le JSON-LD et llms.txt (cohérence NAP pour
 * le SEO local) ; WhatsApp est la ligne mobile.
 */
export const CONTACT = {
  /** Numéro WhatsApp, format wa.me (indicatif sans « + »). */
  whatsapp: "212700127892",
  /** Téléphone du cabinet, format tel: (E.164). */
  tel: "+212530132323",
  /** Affichage lisible du téléphone. */
  telAffiche: "05 30 13 23 23",
} as const;

/** Lien WhatsApp avec message prérempli. */
export function lienWhatsApp(message?: string): string {
  return `https://wa.me/${CONTACT.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export const lienTel = `tel:${CONTACT.tel}`;
