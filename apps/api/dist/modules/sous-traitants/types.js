"use strict";
/**
 * Sous-Traitants — Types (Tome 3 / P3 — MOD délégué)
 *
 * Module : assigner, suivre, contracter, évaluer et payer chaque sous-traitant
 * par lot dans le cadre d'une opération de Maîtrise d'Ouvrage Déléguée.
 *
 * Conformité : loi marocaine 32-99 sur la sous-traitance dans le BTP
 *   (articles 2 à 13 : déclaration, contrat écrit, agrément, paiement direct).
 *
 * Persistance MVP : JSON in Dossier.payload.sousTraitants (cf. INTEGRATION.md
 * pour la migration Prisma future).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOTS_TPHI = exports.ST_PAYLOAD_KEY = void 0;
exports.ST_PAYLOAD_KEY = "sousTraitants";
exports.LOTS_TPHI = [
    { code: "LOT-01-TERRASSEMENT", intitule: "Terrassement / Excavation", numero: 1 },
    { code: "LOT-02-FONDATIONS", intitule: "Fondations", numero: 2, agrementRequis: true },
    { code: "LOT-03-GROS-OEUVRE-BETON", intitule: "Gros œuvre béton armé", numero: 3, agrementRequis: true },
    { code: "LOT-04-CHARPENTE", intitule: "Charpente", numero: 4, agrementRequis: true },
    { code: "LOT-05-COUVERTURE", intitule: "Couverture", numero: 5 },
    { code: "LOT-06-ETANCHEITE", intitule: "Étanchéité", numero: 6, agrementRequis: true },
    { code: "LOT-07-FACADE-RAVALEMENT", intitule: "Façade / Ravalement", numero: 7 },
    { code: "LOT-08-CLOISONS-PLATRERIE", intitule: "Cloisons / Plâtrerie", numero: 8 },
    { code: "LOT-09-MENUISERIE-EXT", intitule: "Menuiserie extérieure", numero: 9 },
    { code: "LOT-10-MENUISERIE-INT", intitule: "Menuiserie intérieure", numero: 10 },
    { code: "LOT-11-PLOMBERIE-SANITAIRE", intitule: "Plomberie sanitaire", numero: 11, agrementRequis: true },
    { code: "LOT-12-ELECTRICITE-CFO", intitule: "Électricité courant fort", numero: 12, agrementRequis: true },
    { code: "LOT-13-ELECTRICITE-CFA", intitule: "Électricité courant faible", numero: 13 },
    { code: "LOT-14-CVC-CLIM", intitule: "CVC / Climatisation", numero: 14, agrementRequis: true },
    { code: "LOT-15-ASCENSEURS", intitule: "Ascenseurs / Monte-charges", numero: 15, agrementRequis: true },
    { code: "LOT-16-ISOLATION", intitule: "Isolation thermique/acoustique", numero: 16 },
    { code: "LOT-17-CARRELAGE-FAIENCE", intitule: "Carrelage / Faïence", numero: 17 },
    { code: "LOT-18-REVETEMENT-SOL", intitule: "Revêtement de sol", numero: 18 },
    { code: "LOT-19-MARBRERIE", intitule: "Marbrerie / Pierre", numero: 19 },
    { code: "LOT-20-PEINTURE", intitule: "Peinture", numero: 20 },
    { code: "LOT-21-FAUX-PLAFOND", intitule: "Faux-plafond", numero: 21 },
    { code: "LOT-22-MENUISERIE-METAL", intitule: "Menuiserie métallique / Serrurerie", numero: 22 },
    { code: "LOT-23-VRD-AMENAGEMENT", intitule: "VRD / Aménagement extérieur", numero: 23 },
    { code: "LOT-24-ESPACES-VERTS", intitule: "Espaces verts", numero: 24 },
    { code: "LOT-25-EQUIPEMENTS-SPECIFIQUES", intitule: "Équipements spécifiques", numero: 25 },
];
