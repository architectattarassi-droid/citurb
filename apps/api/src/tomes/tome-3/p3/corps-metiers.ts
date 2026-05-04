/**
 * Registry CORPS DE MÉTIERS du bâtiment — Maroc
 *
 * Référence:
 *  - Décret n° 2-93-66 (RGC : Règlement Général de Construction, Maroc)
 *  - Lois 12-90 (urbanisme) et 25-90 (lotissements)
 *  - Pratique professionnelle FNBTP / FMC / Ordre Architectes 2024
 *
 * Pour la Maîtrise d'Ouvrage Déléguée (porte P3), CITURBAREA orchestre
 * la convocation, la coordination et le paiement (escrow) de chaque
 * entreprise par corps d'état.
 *
 * Structure: groupe → lot → corps de métier (slug technique + label).
 */

export type CorpsMetierGroupe = "GROS_OEUVRE" | "SECOND_OEUVRE" | "FINITIONS" | "EQUIPEMENTS" | "VRD_AMENAGEMENT" | "SPECIALITES";

export type CorpsMetier = {
  slug: string;
  label: string;
  groupe: CorpsMetierGroupe;
  lotNumero?: string; // lot type FFB / RGC
  obligatoireQualification?: boolean; // qualification professionnelle requise (ex: chauffe-eau gaz, ascenseurs, désenfumage)
  notes?: string;
};

export const CORPS_METIERS: CorpsMetier[] = [
  // ─── GROS ŒUVRE (lot 0-2 RGC) ─────────────────────────────────────────
  { slug: "terrassement", label: "Terrassement / Excavation", groupe: "GROS_OEUVRE", lotNumero: "0" },
  { slug: "fondations", label: "Fondations / Béton armé", groupe: "GROS_OEUVRE", lotNumero: "1", obligatoireQualification: true },
  { slug: "maconnerie", label: "Maçonnerie / Brique / Parpaing", groupe: "GROS_OEUVRE", lotNumero: "2" },
  { slug: "charpente_beton", label: "Charpente béton", groupe: "GROS_OEUVRE", lotNumero: "3", obligatoireQualification: true },
  { slug: "charpente_metallique", label: "Charpente métallique", groupe: "GROS_OEUVRE", lotNumero: "3b", obligatoireQualification: true },
  { slug: "charpente_bois", label: "Charpente bois", groupe: "GROS_OEUVRE", lotNumero: "3c" },
  { slug: "couverture", label: "Couverture (tuiles, étanchéité bitumineuse, EPDM)", groupe: "GROS_OEUVRE", lotNumero: "4" },
  { slug: "etancheite", label: "Étanchéité (toitures, terrasses, sous-sols)", groupe: "GROS_OEUVRE", lotNumero: "5", obligatoireQualification: true },
  { slug: "ravalement_facade", label: "Ravalement de façade (béton apparent, enduit)", groupe: "GROS_OEUVRE", lotNumero: "6" },

  // ─── SECOND ŒUVRE (lot 7-12) ──────────────────────────────────────────
  { slug: "cloisonnement_placo", label: "Cloisonnement / Placo / Plâtrerie", groupe: "SECOND_OEUVRE", lotNumero: "7" },
  { slug: "menuiserie_alu", label: "Menuiserie aluminium (fenêtres, baies, vitrines)", groupe: "SECOND_OEUVRE", lotNumero: "8a" },
  { slug: "menuiserie_pvc", label: "Menuiserie PVC", groupe: "SECOND_OEUVRE", lotNumero: "8b" },
  { slug: "menuiserie_bois", label: "Menuiserie bois (portes, placards, parquet)", groupe: "SECOND_OEUVRE", lotNumero: "8c" },
  { slug: "menuiserie_acier", label: "Menuiserie acier / Serrurerie", groupe: "SECOND_OEUVRE", lotNumero: "8d" },
  { slug: "vitrerie_miroiterie", label: "Vitrerie / Miroiterie / Façade rideau", groupe: "SECOND_OEUVRE", lotNumero: "8e" },
  { slug: "plomberie_sanitaire", label: "Plomberie sanitaire", groupe: "SECOND_OEUVRE", lotNumero: "9", obligatoireQualification: true },
  { slug: "electricite_courant_fort", label: "Électricité courant fort (TGBT, distribution, éclairage)", groupe: "SECOND_OEUVRE", lotNumero: "10a", obligatoireQualification: true },
  { slug: "electricite_courant_faible", label: "Électricité courant faible (téléphone, internet, alarme, vidéo, contrôle accès)", groupe: "SECOND_OEUVRE", lotNumero: "10b" },
  { slug: "cvc", label: "CVC : Climatisation / Ventilation / Chauffage", groupe: "SECOND_OEUVRE", lotNumero: "11", obligatoireQualification: true },
  { slug: "isolation_thermique", label: "Isolation thermique et acoustique", groupe: "SECOND_OEUVRE", lotNumero: "12" },

  // ─── FINITIONS (lot 13-17) ────────────────────────────────────────────
  { slug: "carrelage_faience", label: "Carrelage / Faïence", groupe: "FINITIONS", lotNumero: "13" },
  { slug: "revetement_sol", label: "Revêtement de sol (parquet, vinyle, moquette, résine)", groupe: "FINITIONS", lotNumero: "14" },
  { slug: "marbrerie", label: "Marbrerie / Pierre naturelle", groupe: "FINITIONS", lotNumero: "15" },
  { slug: "peinture", label: "Peinture intérieure et extérieure", groupe: "FINITIONS", lotNumero: "16" },
  { slug: "faux_plafond", label: "Faux-plafonds (plâtre, dalles minérales, métalliques, gypse)", groupe: "FINITIONS", lotNumero: "17" },
  { slug: "papier_peint", label: "Papier peint / Toile de verre", groupe: "FINITIONS", lotNumero: "17b" },

  // ─── ÉQUIPEMENTS (lot 18-23) ──────────────────────────────────────────
  { slug: "ascenseurs", label: "Ascenseurs / Monte-charges", groupe: "EQUIPEMENTS", lotNumero: "18", obligatoireQualification: true, notes: "Réception agent agréé obligatoire" },
  { slug: "escalators", label: "Escalators / Tapis roulants", groupe: "EQUIPEMENTS", lotNumero: "18b", obligatoireQualification: true },
  { slug: "domotique_supervision", label: "Domotique / GTB / Supervision", groupe: "EQUIPEMENTS", lotNumero: "19" },
  { slug: "securite_incendie", label: "Sécurité incendie (sprinkler, RIA, désenfumage, détection)", groupe: "EQUIPEMENTS", lotNumero: "20", obligatoireQualification: true, notes: "Visa Protection Civile obligatoire" },
  { slug: "cuisine_equipee", label: "Cuisine équipée résidentielle", groupe: "EQUIPEMENTS", lotNumero: "21" },
  { slug: "cuisine_pro", label: "Cuisine professionnelle (restaurants, hôtels, collectivités)", groupe: "EQUIPEMENTS", lotNumero: "21b", obligatoireQualification: true },
  { slug: "audiovisuel", label: "Sonorisation / Audiovisuel / Projection", groupe: "EQUIPEMENTS", lotNumero: "22" },
  { slug: "photovoltaique", label: "Photovoltaïque / Solaire thermique", groupe: "EQUIPEMENTS", lotNumero: "23", obligatoireQualification: true },

  // ─── VRD & AMÉNAGEMENT (lot 24-28) ────────────────────────────────────
  { slug: "vrd_voirie", label: "VRD : Voirie / Réseaux / Assainissement", groupe: "VRD_AMENAGEMENT", lotNumero: "24" },
  { slug: "espaces_verts", label: "Espaces verts / Paysagisme", groupe: "VRD_AMENAGEMENT", lotNumero: "25" },
  { slug: "cloture_portail", label: "Clôtures / Portails / Garde-corps extérieurs", groupe: "VRD_AMENAGEMENT", lotNumero: "26" },
  { slug: "piscine", label: "Piscine (gros œuvre + traitement eau + équipements)", groupe: "VRD_AMENAGEMENT", lotNumero: "27", obligatoireQualification: true },
  { slug: "eclairage_exterieur", label: "Éclairage extérieur / Mise en lumière", groupe: "VRD_AMENAGEMENT", lotNumero: "28" },

  // ─── SPÉCIALITÉS (lot 29+) ────────────────────────────────────────────
  { slug: "blocs_operatoires", label: "Blocs opératoires / Salles propres (cliniques)", groupe: "SPECIALITES", lotNumero: "29", obligatoireQualification: true, notes: "Norme ISO 14644 / Ministère Santé" },
  { slug: "equipements_medicaux_fixes", label: "Équipements médicaux fixes (radiologie, scanner, IRM)", groupe: "SPECIALITES", lotNumero: "29b", obligatoireQualification: true, notes: "Plombs, blindages, agréments AMSSNuR" },
  { slug: "datacenter_serveurs", label: "Salle serveurs / Datacenter (climatisation precision, onduleurs)", groupe: "SPECIALITES", lotNumero: "30", obligatoireQualification: true },
  { slug: "scenographie", label: "Scénographie / Décors muséographiques", groupe: "SPECIALITES", lotNumero: "31" },
  { slug: "acoustique_studios", label: "Acoustique / Studios enregistrement / Salles spectacles", groupe: "SPECIALITES", lotNumero: "32" },
];

export const GROUPES_LABELS: Record<CorpsMetierGroupe, string> = {
  GROS_OEUVRE: "Gros œuvre",
  SECOND_OEUVRE: "Second œuvre",
  FINITIONS: "Finitions",
  EQUIPEMENTS: "Équipements",
  VRD_AMENAGEMENT: "VRD & Aménagement extérieur",
  SPECIALITES: "Spécialités (santé, IT, scénographie)",
};

/**
 * Retourne le nombre maximal de corps de métiers définis (= max entreprises possibles
 * sur un dossier P3, hors doublons fournisseurs).
 */
export function maxCorpsMetiers(): number {
  return CORPS_METIERS.length;
}

/**
 * Liste les corps de métiers groupés (pour formulaire wizard frontend).
 */
export function listCorpsMetiersGrouped() {
  const result: Record<CorpsMetierGroupe, CorpsMetier[]> = {
    GROS_OEUVRE: [],
    SECOND_OEUVRE: [],
    FINITIONS: [],
    EQUIPEMENTS: [],
    VRD_AMENAGEMENT: [],
    SPECIALITES: [],
  };
  CORPS_METIERS.forEach(c => result[c.groupe].push(c));
  return Object.entries(result).map(([groupe, items]) => ({
    groupe: groupe as CorpsMetierGroupe,
    label: GROUPES_LABELS[groupe as CorpsMetierGroupe],
    items,
  }));
}
