"use strict";
/**
 * @citurbarea/pricing-cnoa — source unique de la tarification P2.
 *
 * Barème CNOA 2021 (plancher), grille des coûts réels (prix), catalogue des
 * natures de projet et calcul du devis. Importé par l'API (tome-2/p2) et par
 * le front (Porte 2) : aucune valeur de coût, de taux ou de libellé de
 * catégorie ne doit être redéfinie ailleurs.
 *
 * Le calcul est pur : le front le fait tourner tel quel quand l'API ne répond
 * pas, et /p2/quote doit rendre exactement le même résultat.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resoudreNiveau = exports.computeQuote = exports.VISA_CROA_NOTE = exports.ErreurDevis = exports.sousTypesDeFamille = exports.sousTypeDe = exports.resoudreCategorie = exports.niveauxDeSousType = exports.SOUS_TYPES = exports.SEUIL_AMG_M2 = exports.SEUIL_1_1_M2 = exports.FAMILLES = exports.plancherDe = exports.niveauxDe = exports.fourchetteDe = exports.estNiveauValide = exports.basFourchette = exports.GRILLE_REELLE = exports.estCategorieConnue = exports.categoriesDeSection = exports.PHASE_C_PHOTOS_RATE = exports.PHASE_C_ON_SITE_RATE = exports.PHASE_B_RATE = exports.PHASE_A_RATE = exports.TVA_RATE = exports.HONORAIRES_RATE = exports.SECTION_LABELS = exports.CATEGORY_CODES = exports.BAREME_CNOA_2021 = void 0;
var bareme_1 = require("./bareme");
Object.defineProperty(exports, "BAREME_CNOA_2021", { enumerable: true, get: function () { return bareme_1.BAREME_CNOA_2021; } });
Object.defineProperty(exports, "CATEGORY_CODES", { enumerable: true, get: function () { return bareme_1.CATEGORY_CODES; } });
Object.defineProperty(exports, "SECTION_LABELS", { enumerable: true, get: function () { return bareme_1.SECTION_LABELS; } });
Object.defineProperty(exports, "HONORAIRES_RATE", { enumerable: true, get: function () { return bareme_1.HONORAIRES_RATE; } });
Object.defineProperty(exports, "TVA_RATE", { enumerable: true, get: function () { return bareme_1.TVA_RATE; } });
Object.defineProperty(exports, "PHASE_A_RATE", { enumerable: true, get: function () { return bareme_1.PHASE_A_RATE; } });
Object.defineProperty(exports, "PHASE_B_RATE", { enumerable: true, get: function () { return bareme_1.PHASE_B_RATE; } });
Object.defineProperty(exports, "PHASE_C_ON_SITE_RATE", { enumerable: true, get: function () { return bareme_1.PHASE_C_ON_SITE_RATE; } });
Object.defineProperty(exports, "PHASE_C_PHOTOS_RATE", { enumerable: true, get: function () { return bareme_1.PHASE_C_PHOTOS_RATE; } });
Object.defineProperty(exports, "categoriesDeSection", { enumerable: true, get: function () { return bareme_1.categoriesDeSection; } });
Object.defineProperty(exports, "estCategorieConnue", { enumerable: true, get: function () { return bareme_1.estCategorieConnue; } });
var grille_1 = require("./grille");
Object.defineProperty(exports, "GRILLE_REELLE", { enumerable: true, get: function () { return grille_1.GRILLE_REELLE; } });
Object.defineProperty(exports, "basFourchette", { enumerable: true, get: function () { return grille_1.basFourchette; } });
Object.defineProperty(exports, "estNiveauValide", { enumerable: true, get: function () { return grille_1.estNiveauValide; } });
Object.defineProperty(exports, "fourchetteDe", { enumerable: true, get: function () { return grille_1.fourchetteDe; } });
Object.defineProperty(exports, "niveauxDe", { enumerable: true, get: function () { return grille_1.niveauxDe; } });
Object.defineProperty(exports, "plancherDe", { enumerable: true, get: function () { return grille_1.plancherDe; } });
var catalogue_1 = require("./catalogue");
Object.defineProperty(exports, "FAMILLES", { enumerable: true, get: function () { return catalogue_1.FAMILLES; } });
Object.defineProperty(exports, "SEUIL_1_1_M2", { enumerable: true, get: function () { return catalogue_1.SEUIL_1_1_M2; } });
Object.defineProperty(exports, "SEUIL_AMG_M2", { enumerable: true, get: function () { return catalogue_1.SEUIL_AMG_M2; } });
Object.defineProperty(exports, "SOUS_TYPES", { enumerable: true, get: function () { return catalogue_1.SOUS_TYPES; } });
Object.defineProperty(exports, "niveauxDeSousType", { enumerable: true, get: function () { return catalogue_1.niveauxDeSousType; } });
Object.defineProperty(exports, "resoudreCategorie", { enumerable: true, get: function () { return catalogue_1.resoudreCategorie; } });
Object.defineProperty(exports, "sousTypeDe", { enumerable: true, get: function () { return catalogue_1.sousTypeDe; } });
Object.defineProperty(exports, "sousTypesDeFamille", { enumerable: true, get: function () { return catalogue_1.sousTypesDeFamille; } });
var quote_1 = require("./quote");
Object.defineProperty(exports, "ErreurDevis", { enumerable: true, get: function () { return quote_1.ErreurDevis; } });
Object.defineProperty(exports, "VISA_CROA_NOTE", { enumerable: true, get: function () { return quote_1.VISA_CROA_NOTE; } });
Object.defineProperty(exports, "computeQuote", { enumerable: true, get: function () { return quote_1.computeQuote; } });
Object.defineProperty(exports, "resoudreNiveau", { enumerable: true, get: function () { return quote_1.resoudreNiveau; } });
