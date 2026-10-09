/**
 * Hypothèses du métré paramétrique : chaque ratio est nommé, chiffré, borné,
 * justifié, et peut être écrasé par le client ou l'architecte
 * (ProjetInput.hypotheses[id]). Aucun de ces ratios n'est publié par une
 * source marocaine : ce sont des règles de l'art (ordre de grandeur BET)
 * signalées « H » ; les rares recoupements sourcés sont cités en note.
 */
import type { SourceRef } from "./referentiel";

export type Hypothese = {
  id: string;
  libelle: string;
  valeur: number;
  unite: string;
  min: number;
  max: number;
  groupe: "Géométrie" | "Structure" | "Fondations" | "Sous-sol" | "Pente" | "Second œuvre" | "Équipements" | "Frais";
  source: SourceRef;
};

const H = (id: string, groupe: Hypothese["groupe"], libelle: string, valeur: number, unite: string, min: number, max: number, note: string): Hypothese =>
  ({ id, groupe, libelle, valeur, unite, min, max, source: { fichier: "hypothese", ids: [], fiabilite: "H", date: "2026-10", note } });

export const HYPOTHESES: Record<string, Hypothese> = Object.fromEntries([
  // Géométrie
  H("geo.coefPerimetre", "Géométrie", "Périmètre = coefficient × √(surface)", 4.5, "—", 4.0, 5.5, "Rectangle 1 × 1,5 (4,08) + décrochements ≈ 10 %"),
  H("geo.epaisseurPlancher", "Géométrie", "Épaisseur plancher + revêtements (hauteur d'étage = HSP + ce chiffre)", 0.25, "m", 0.2, 0.35, "Plancher 16+4 + chape + carrelage"),
  H("geo.ratioCloisons", "Géométrie", "Cloisons intérieures par m² de plancher (HSP 2,9 m)", 0.85, "m²/m²", 0.6, 1.1, "≈ 0,3 ml de cloison par m² × 2,9 m"),
  H("geo.ratioSols", "Géométrie", "Surface des sols intérieurs / surface de plancher", 0.88, "—", 0.82, 0.92, "Emprise des murs et gaines ≈ 12 %"),
  H("geo.plinthes", "Géométrie", "Plinthes par m² de sol", 0.6, "ml/m²", 0.4, 0.9, "Pièces de 12 à 20 m²"),
  H("geo.faienceSdb", "Géométrie", "Faïence par salle de bain", 18, "m²", 10, 30, "Toute hauteur sur 3 faces d'une pièce de 5 m²"),
  H("geo.faienceCuisine", "Géométrie", "Faïence par cuisine (crédence)", 6, "m²", 3, 15, "Crédence sur 4 à 6 ml"),
  H("geo.partDallePleine", "Structure", "Part des planchers en dalle pleine (balcons, paliers)", 0.1, "—", 0, 0.3, ""),
  H("geo.epDallePleine", "Structure", "Épaisseur des dalles pleines", 0.18, "m", 0.15, 0.25, ""),
  // Structure
  H("str.poteaux", "Structure", "Béton des poteaux par m² de plancher", 0.022, "m³/m²", 0.015, 0.035, "Trame 4-5 m, poteaux 25×25 à 30×30"),
  H("str.poutres", "Structure", "Béton des poutres, chaînages et linteaux par m² de plancher", 0.04, "m³/m²", 0.035, 0.07, "Portées 4-5 m"),
  H("str.escalier", "Structure", "Béton par volée d'escalier", 1.8, "m³", 1.2, 2.5, "Escalier 1,10 m, paillasse 15 cm, 17 marches"),
  H("str.voilesImmeuble", "Structure", "Voiles de cage d'escalier / ascenseur par niveau (immeuble)", 3, "m³/niveau", 1.5, 6, ""),
  // Fondations
  H("fon.ratio.ROCHER", "Fondations", "Fondations sur rocher : semelles isolées par m² de plancher", 0.045, "m³/m²", 0.03, 0.06, "Contrainte admissible ≥ 4 bars (étude de sol à confirmer)"),
  H("fon.ratio.BON", "Fondations", "Bon sol : semelles isolées par m² de plancher", 0.065, "m³/m²", 0.05, 0.08, "Contrainte admissible 2 à 3 bars"),
  H("fon.ratio.MOYEN", "Fondations", "Sol moyen : semelles filantes par m² de plancher", 0.1, "m³/m²", 0.08, 0.13, "Contrainte admissible 1,2 à 2 bars"),
  H("fon.radierEpaisseur", "Fondations", "Radier (argile, remblai, nappe) : épaisseur moyenne nervures comprises, pour R+1", 0.35, "m", 0.3, 0.5, "+ 5 cm par niveau supplémentaire"),
  H("fon.purge", "Fondations", "Argile / remblai : purge et substitution sous radier", 0.4, "m", 0.2, 0.8, "À fixer par l'étude géotechnique"),
  H("fon.longrines", "Fondations", "Longrines par m² d'emprise", 0.035, "m³/m²", 0.025, 0.05, ""),
  H("fon.amorces", "Fondations", "Amorces de poteaux par m² d'emprise", 0.008, "m³/m²", 0.005, 0.012, ""),
  H("fon.hauteurSemelle", "Fondations", "Hauteur moyenne des semelles (pour le béton de propreté)", 0.35, "m", 0.3, 0.5, ""),
  H("fon.surlargeurFouilles", "Fondations", "Fouilles / volume de béton de fondation", 1.6, "—", 1.3, 2.2, "Surlargeur de travail et talus"),
  H("ter.foisonnement", "Fondations", "Foisonnement des déblais évacués", 1.25, "—", 1.1, 1.4, ""),
  H("ter.abords", "Fondations", "Bande décapée autour de l'emprise", 2, "m", 1, 4, ""),
  // Sous-sol
  H("ss.surlargeur", "Sous-sol", "Surlargeur de terrassement autour du sous-sol", 1, "m", 0.6, 1.5, "Travail + talus ; remplacée par un blindage côté mitoyen"),
  H("ss.semelleVoile", "Sous-sol", "Semelle filante sous voile périphérique", 0.21, "m³/ml", 0.15, 0.35, "0,60 × 0,35 m"),
  H("ss.semainesEpuisement", "Sous-sol", "Durée d'épuisement de la nappe", 6, "semaines", 3, 12, "Durée du gros œuvre enterré"),
  // Pente
  H("pente.seuil", "Pente", "Pente à partir de laquelle des soutènements sont nécessaires", 5, "%", 3, 8, ""),
  H("pente.zoneTerrassee", "Pente", "Zone mise à niveau / emprise", 3, "—", 1.5, 5, "Bâtiment + accès + jardin plat"),
  H("pente.surcoutFondations", "Pente", "Fondations en redans : surcroît de béton par % de pente", 1, "% / %", 0.5, 2, ""),
  // Second œuvre
  H("so.pointsLumineux", "Second œuvre", "Points lumineux par m² de plancher", 0.15, "u/m²", 0.08, 0.25, "≥ 1 point par pièce (NF C 15-100 comme repère)"),
  H("so.prises", "Second œuvre", "Prises par m² de plancher", 0.25, "u/m²", 0.15, 0.4, ""),
  H("so.circuitsSpecialises", "Second œuvre", "Circuits spécialisés par logement (hors clim)", 6, "u", 3, 8, "Plaque, four, lave-linge, lave-vaisselle, chauffe-eau"),
  H("so.gardeCorpsBalcons", "Second œuvre", "Garde-corps par m² de balcon / terrasse", 0.4, "ml/m²", 0.2, 0.8, ""),
  H("so.gardeCorpsEscalier", "Second œuvre", "Garde-corps par volée d'escalier", 4, "ml", 3, 8, ""),
  H("so.etancheiteSdb", "Second œuvre", "Étanchéité sous carrelage par salle de bain", 5, "m²", 3, 10, ""),
  H("so.collecteurs", "Second œuvre", "Chutes et collecteurs : ml par salle d'eau et cuisine, par niveau desservi", 6, "ml", 3, 10, "Colonne de chute + collecteur sous dallage"),
  H("so.placards", "Second œuvre", "Placards par chambre", 2, "ml", 0, 4, ""),
  H("so.partiesCommunes", "Second œuvre", "Parties communes (hall, paliers) par niveau, immeuble", 18, "m²", 10, 40, ""),
  H("vrd.longueurReseau", "Équipements", "Réseau d'assainissement extérieur : longueur fixe ajoutée à √(terrain)", 10, "ml", 0, 40, ""),
  H("vrd.regards", "Équipements", "Regards d'assainissement", 3, "u", 2, 8, ""),
  // Frais
  H("frais.installation", "Frais", "Installation de chantier, en % des travaux", 0.02, "—", 0.015, 0.04, "Poids INS de costRangesMA (2 %)"),
  H("frais.aleas", "Frais", "Provision pour aléas et imprévus, en % des travaux", 0.05, "—", 0, 0.15, "Francobat, Archiplan : 5-15 % ; dépassements constatés 20-40 % (LesMRE)"),
].map((h) => [h.id, h]));
