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

/** Réseaux de l'architecte (Yassine Attarassi) : liens publics. */
export const RESEAUX = {
  youtube: "https://www.youtube.com/@citiestalkmaroc",
  facebook: "https://www.facebook.com/yassineattarassi",
  tiktok: "https://www.tiktok.com/@yassine.attarassi",
  instagram: "https://www.instagram.com/arc_bati_architecture",
} as const;

/**
 * Lien « Laisser un avis Google » de la fiche Google Business Profile
 * (Arc Bati Architecture). VIDE tant qu'il n'est pas configuré : le bouton
 * n'apparaît alors nulle part. À renseigner avec le lien court fourni par la
 * fiche (Google Business → « Demander des avis » → copier le lien, de la forme
 * https://g.page/r/XXXX/review) ou
 * https://search.google.com/local/writereview?placeid=<PLACE_ID>.
 */
export const AVIS_GOOGLE_URL = "";
