"use strict";
/**
 * Catalogue des natures de projet — dérivé du barème, pas l'inverse.
 *
 * Remplace NATURE_FAMILIES / NATURE_PROJET_OPTIONS de P2Home.tsx, qui
 * contredisaient le barème : « petit collectif ≤ R+4 » alors que la catégorie
 * 3.1 dit « R+4 et plus », collectif démarrant à R+5, école et mosquée
 * séparées alors que 5.3 les regroupe, aménagement découpé par activité alors
 * que 6.1/6.2 se découpent par surface.
 *
 * Règle unique : chaque sous-type mène à UNE catégorie du barème. Quand le
 * niveau choisit la catégorie (collectif, villas), `categorieParNiveau` porte
 * la correspondance — le niveau ne multiplie jamais un coût.
 *
 * Les libellés sont en français ; le front les traduit par clé i18n
 * (`portes.p2.nature.<value>`) et retombe sur `label` en l'absence de clé.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOUS_TYPES = exports.FAMILLES = exports.SEUIL_AMG_M2 = exports.SEUIL_1_1_M2 = void 0;
exports.sousTypesDeFamille = sousTypesDeFamille;
exports.sousTypeDe = sousTypeDe;
exports.niveauxDeSousType = niveauxDeSousType;
exports.resoudreCategorie = resoudreCategorie;
const grille_1 = require("./grille");
/** 1.1 est plafonnée à 500 m² de plancher par le barème lui-même. */
exports.SEUIL_1_1_M2 = 500;
/** 6.1 s'arrête à 50 m² ; au-delà c'est 6.2 — critère de surface, pas d'activité. */
exports.SEUIL_AMG_M2 = 50;
exports.FAMILLES = [
    { code: "habitat_r3", categorie: "HABITAT ≤ R+3", titre: "Habitat RDC à R+3", sous: "Jusqu'à R+3 et 500 m² de plancher. Au-delà de 500 m², le barème bascule en collectif." },
    { code: "collectif", categorie: "COLLECTIF R+4 ET PLUS", titre: "Immeuble collectif ou bureaux", sous: "R+4 et plus — le barème CNOA classe R+4 en collectif, pas en petit habitat." },
    { code: "villa", categorie: "RÉSIDENTIEL", titre: "Villas", sous: "En bande, jumelée ou isolée — version standard ou de standing." },
    { code: "gr", categorie: "OPÉRATION GROUPÉE", titre: "Groupement résidentiel", sous: "Plusieurs bâtiments sur un même projet (résidence, complexe)." },
    { code: "lot", categorie: "FONCIER", titre: "Lotissement", sous: "Découpage / morcellement / viabilisation (loi 25-90) — devis personnalisé." },
    { code: "epig", categorie: "ÉQUIPEMENT", titre: "Équipement privé", sous: "Hôtel, école, mosquée, clinique, hangar, usine, laboratoire." },
    { code: "amg", categorie: "TRANSFORMATION", titre: "Aménagement", sous: "Réagencement d'un local existant. La catégorie dépend de la surface." },
    { code: "expertise", categorie: "EXPERTISE & QUALIFICATION", titre: "Je ne sais pas — Expertise", sous: "Une mission d'expertise CITURBAREA qualifie votre projet. Mission facturable, livrable = rapport." },
    { code: "autre", categorie: "AUTRE", titre: "Autre — à préciser", sous: "Votre projet ne correspond à aucune des familles ci-dessus." },
];
/** Collectif : le niveau choisit 3.1 / 3.2 / 3.3. */
const COLLECTIF_PAR_NIVEAU = {
    economique: "3.1",
    moyen: "3.2",
    haut: "3.3",
    luxe: "3.3",
};
exports.SOUS_TYPES = [
    // Habitat ≤ R+3 → 1.1 (bascule en 3.1 au-delà de 500 m² de plancher)
    { value: "habitat_rdc", label: "Habitat RDC (plain-pied)", famille: "habitat_r3", categorie: "1.1" },
    { value: "habitat_r1", label: "Habitat R+1", famille: "habitat_r3", categorie: "1.1" },
    { value: "habitat_r2", label: "Habitat R+2", famille: "habitat_r3", categorie: "1.1" },
    { value: "habitat_r3", label: "Habitat R+3", famille: "habitat_r3", categorie: "1.1" },
    { value: "habitat_social", label: "Habitat social conventionné (250 000 / 140 000 DH) — lotissement obligatoire", famille: "habitat_r3", categorie: "1.2" },
    // Collectif et bureaux R+4 et plus → 3.x selon le niveau
    { value: "collectif_r4", label: "Immeuble R+4", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "collectif_r5", label: "Immeuble R+5", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "collectif_r6", label: "Immeuble R+6", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "collectif_r7", label: "Immeuble R+7", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "collectif_r8plus", label: "Immeuble R+8 et plus", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "bureaux", label: "Immeuble de bureaux (R+4 et plus)", famille: "collectif", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    // Villas → la forme et le niveau choisissent 4.1…4.6
    { value: "villa_bande", label: "Villa en bande", famille: "villa", categorieParNiveau: { standard: "4.1", standing: "4.2" } },
    { value: "villa_jumelee", label: "Villa jumelée", famille: "villa", categorieParNiveau: { standard: "4.3", standing: "4.4" } },
    { value: "villa_isolee", label: "Villa isolée", famille: "villa", categorieParNiveau: { standard: "4.5", standing: "4.6", luxe: "4.6" } },
    // Groupement résidentiel — plusieurs bâtiments, catégorie selon le bâti
    { value: "gr_residence", label: "Résidence (plusieurs immeubles R+4+)", famille: "gr", categorieParNiveau: COLLECTIF_PAR_NIVEAU },
    { value: "gr_villas", label: "Groupement de villas", famille: "gr", categorieParNiveau: { standard: "4.5", standing: "4.6", luxe: "4.6" } },
    // Lotissement — hors barème, jamais de calcul automatique
    { value: "lot_residentiel", label: "Lotissement résidentiel", famille: "lot", horsBareme: "LOT" },
    { value: "lot_industriel", label: "Lotissement industriel", famille: "lot", horsBareme: "LOT" },
    { value: "lot_morcellement", label: "Morcellement (loi 25-90)", famille: "lot", horsBareme: "LOT" },
    // EPIG — un sous-type par catégorie 5.x, regroupements du barème respectés
    { value: "epig_hangar_agri", label: "Hangar agricole", famille: "epig", categorie: "5.1" },
    { value: "epig_hangar_indus", label: "Hangar ou dépôt industriel", famille: "epig", categorie: "5.2" },
    { value: "epig_enseignement_culte", label: "École, collège, lycée ou mosquée", famille: "epig", categorie: "5.3" },
    { value: "epig_usine", label: "Usine", famille: "epig", categorie: "5.4" },
    { value: "epig_hebergement_sante", label: "Hôtel 2★, résidence touristique, maison d'hôte, hémodialyse ou laboratoire", famille: "epig", categorie: "5.5" },
    { value: "epig_hotel3", label: "Hôtel 3★", famille: "epig", categorie: "5.6" },
    { value: "epig_clinique", label: "Clinique", famille: "epig", categorie: "5.7" },
    { value: "epig_hotel4", label: "Hôtel 4★", famille: "epig", categorie: "5.8" },
    { value: "epig_hotel5", label: "Hôtel 5★ ou équipement haut standing", famille: "epig", categorie: "5.9" },
    // Changement d'affectation : la destination commande, pas les travaux.
    { value: "epig_changement_affectation", label: "Changement d'affectation (villa → équipement) — catégorie selon la destination", famille: "epig", categorie: "5.5" },
    // Aménagement — 6.1 / 6.2 tranchés par la surface saisie
    { value: "amg_local", label: "Aménagement d'un local existant (agence, show-room, restaurant, bureau…)", famille: "amg", categorie: "6.2" },
    // Hors barème
    { value: "expertise_qualif", label: "Expertise et qualification du projet", famille: "expertise", horsBareme: "EXPERTISE" },
    { value: "autre", label: "Autre — à préciser", famille: "autre", horsBareme: "AUTRE" },
];
function sousTypesDeFamille(famille) {
    return exports.SOUS_TYPES.filter((s) => s.famille === famille);
}
function sousTypeDe(value) {
    return exports.SOUS_TYPES.find((s) => s.value === value);
}
/** Niveaux proposés pour un sous-type (union des catégories qu'il peut viser). */
function niveauxDeSousType(sousType) {
    if (sousType.categorieParNiveau)
        return Object.keys(sousType.categorieParNiveau);
    if (sousType.categorie)
        return (0, grille_1.niveauxDe)(sousType.categorie);
    return [];
}
/**
 * Catégorie finale, après application des règles de surface du barème.
 *
 * - 1.1 au-delà de 500 m² de plancher → 3.1 (le barème plafonne 1.1).
 * - AMG : 6.1 en deçà de 50 m², 6.2 au-delà — quelle que soit l'activité.
 *
 * Appliquée des DEUX côtés (front hors ligne et API) pour que les deux
 * calculs donnent le même résultat.
 */
function resoudreCategorie(categorie, surfacePlancherM2) {
    const sp = typeof surfacePlancherM2 === "number" && Number.isFinite(surfacePlancherM2) ? surfacePlancherM2 : null;
    if (categorie === "1.1" && sp !== null && sp > exports.SEUIL_1_1_M2) {
        return { categorie: "3.1", bascule: { de: "1.1", vers: "3.1", raison: "surface_sup_500" } };
    }
    if ((categorie === "6.1" || categorie === "6.2") && sp !== null) {
        const voulue = sp <= exports.SEUIL_AMG_M2 ? "6.1" : "6.2";
        if (voulue !== categorie) {
            return {
                categorie: voulue,
                bascule: { de: categorie, vers: voulue, raison: voulue === "6.1" ? "amg_petite_surface" : "amg_grande_surface" },
            };
        }
    }
    return { categorie };
}
