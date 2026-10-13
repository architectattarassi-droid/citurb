/**
 * Dossier rempli par le client pendant l'appel vidéo : sections et libellés.
 * Les clés DOIVENT exister dans la liste blanche serveur (functions/_lib/rdv.ts,
 * CHAMPS_DOSSIER) — vérifié par rdv.test.ts. Aucune pièce contractuelle :
 * on demande seulement si un document existe, jamais son numéro.
 */

export type ChampUi = {
  cle: string;
  libelle: string;
  type: "texte" | "zone" | "nombre" | "choix" | "case";
  options?: [string, string][];
  suffixe?: string;
  aide?: string;
};

export type Section = { id: string; titre: string; champs: ChampUi[] };

export const SECTIONS: Section[] = [
  {
    id: "projet", titre: "Votre projet", champs: [
      { cle: "projetType", libelle: "Type de projet", type: "choix", options: [["MAISON", "Maison"], ["VILLA", "Villa"], ["IMMEUBLE", "Immeuble"], ["EXTENSION", "Extension / surélévation"], ["RENOVATION", "Rénovation"], ["COMMERCE", "Commerce / bureaux"], ["AUTRE", "Autre"]] },
      { cle: "ville", libelle: "Ville", type: "texte" },
      { cle: "quartier", libelle: "Quartier / lotissement", type: "texte" },
      { cle: "description", libelle: "Décrivez votre projet en quelques lignes", type: "zone" },
    ],
  },
  {
    id: "terrain", titre: "Le terrain", champs: [
      { cle: "surfaceTerrain", libelle: "Surface du terrain", type: "nombre", suffixe: "m²" },
      { cle: "situationFonciere", libelle: "Situation foncière", type: "choix", options: [["TITRE", "Titré"], ["REQUISITION", "Réquisition (titre en cours)"], ["MELK", "Melk (non titré)"], ["NE_SAIS_PAS", "Je ne sais pas"]] },
      { cle: "noteRenseignements", libelle: "Note de renseignements urbanistiques obtenue ?", type: "choix", options: [["OUI", "Oui"], ["NON", "Non"], ["EN_COURS", "Demandée"]] },
      { cle: "facades", libelle: "Nombre de façades sur rue", type: "choix", options: [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] },
    ],
  },
  {
    id: "programme", titre: "Le programme", champs: [
      { cle: "niveaux", libelle: "Nombre de niveaux (RDC compris)", type: "nombre", aide: "RDC = 1, R+1 = 2…" },
      { cle: "sousSol", libelle: "Sous-sol", type: "choix", options: [["OUI", "Oui"], ["NON", "Non"], ["A_VOIR", "À voir avec l'architecte"]] },
      { cle: "surfaceSouhaitee", libelle: "Surface habitable souhaitée", type: "nombre", suffixe: "m²" },
      { cle: "standing", libelle: "Standing", type: "choix", options: [["ECONOMIQUE", "Économique"], ["MOYEN", "Moyen standing"], ["STANDING", "Standing"], ["HAUT_STANDING", "Haut standing"]] },
    ],
  },
  {
    id: "budget", titre: "Budget et délais", champs: [
      { cle: "budget", libelle: "Budget envisagé (hors terrain)", type: "nombre", suffixe: "DH" },
      { cle: "delai", libelle: "Quand souhaitez-vous démarrer ?", type: "choix", options: [["MOINS_6", "Moins de 6 mois"], ["6_12", "6 à 12 mois"], ["PLUS_12", "Plus de 12 mois"], ["NE_SAIS_PAS", "Je ne sais pas"]] },
    ],
  },
  {
    id: "documents", titre: "Documents disponibles", champs: [
      { cle: "docTitreFoncier", libelle: "Titre foncier (ou certificat de propriété)", type: "case" },
      { cle: "docPlanCadastral", libelle: "Plan cadastral ou topographique", type: "case" },
      { cle: "docNru", libelle: "Note de renseignements urbanistiques (NRU)", type: "case" },
      { cle: "docPhotos", libelle: "Photos du terrain", type: "case" },
    ],
  },
  {
    id: "questions", titre: "Vos questions pour l'architecte", champs: [
      { cle: "questions", libelle: "Questions, contraintes, idées…", type: "zone" },
    ],
  },
];

export const CHAMPS: ChampUi[] = SECTIONS.flatMap((s) => s.champs);

/** Valeur à envoyer au serveur (les nombres saisis en texte, « facades » en nombre). */
export function valeurEnvoyee(c: ChampUi, v: unknown): unknown {
  if (c.cle === "facades" && typeof v === "string") return Number(v);
  return v;
}

/** Lien /chiffrage pré-rempli depuis le dossier, si les réponses le permettent. */
export function lienChiffrage(d: Record<string, unknown>): string | null {
  const type = d.projetType === "IMMEUBLE" ? "immeuble" : d.projetType === "VILLA" ? "villa" : d.projetType === "MAISON" ? "maison" : "";
  const q = new URLSearchParams();
  if (type) q.set("type", type);
  if (typeof d.surfaceSouhaitee === "number" && d.surfaceSouhaitee >= 30) q.set("surface", String(Math.round(d.surfaceSouhaitee)));
  if (typeof d.niveaux === "number") q.set("niveaux", String(Math.round(d.niveaux)));
  if (typeof d.surfaceTerrain === "number" && d.surfaceTerrain >= 30) q.set("terrain", String(Math.round(d.surfaceTerrain)));
  if (typeof d.ville === "string" && d.ville) q.set("ville", d.ville);
  // Standings du chiffrage : ULTRA_ECO « très économique », ECONOMIQUE « moyen standing », STANDARD « standing », STANDING « haut standing ».
  const st = ({ ECONOMIQUE: "ULTRA_ECO", MOYEN: "ECONOMIQUE", STANDING: "STANDARD", HAUT_STANDING: "STANDING" } as Record<string, string>)[String(d.standing)];
  if (st) q.set("standing", st);
  return [...q.keys()].length >= 2 ? `/chiffrage?${q}` : null;
}
