/**
 * Référentiel de prix élémentaires du chiffrage (matériaux, main-d'œuvre,
 * coefficients). Chaque valeur cite son entrée dans docs/prix/recherche/*.json
 * (champ `id`), sa fiabilité et sa date. Fiabilité :
 *   A = source réglementaire ou prix réel constaté (DQE du dossier Kénitra) ;
 *   B = prix publié par un distributeur ou un guide daté (médiane des sources B) ;
 *   C = guide/agrégateur non daté ou contradictoire ;
 *   H = HYPOTHÈSE CITURBAREA (aucune source solide) — ajustable, affichée comme telle.
 *
 * Base : Rabat-Salé-Kénitra, prix HT. Les prix publics des distributeurs en
 * ligne (Bricoma, BniDark, Matelec, Zellijj, Rifaa, Aouami, Ziribox) sont
 * présumés TTC (prix grand public) : `ttc: true` → divisés par 1,20.
 * Les guides et offres de négoce (LeChantier, EnginLoc, Tachrone…) sont pris
 * comme HT, faute de mention contraire (hypothèse signalée dans les recherches).
 */

export type Fiabilite = "A" | "B" | "C" | "H";

export type FichierRecherche =
  | "materiaux-gros-oeuvre"
  | "materiaux-second-oeuvre"
  | "marche-prive-main-oeuvre"
  | "marches-publics"
  | "prix-internes"
  | "hypothese";

export type SourceRef = {
  fichier: FichierRecherche;
  /** Identifiants d'entrées dans le fichier (champ `id`, ou `dqe-reel-kenitra#n` pour les DQE réels). */
  ids: string[];
  fiabilite: Fiabilite;
  /** Date du prix (AAAA-MM), ou plage. */
  date: string;
  note?: string;
};

export type PrixElementaire = {
  id: string;
  libelle: string;
  unite: string;
  min: number;
  ref: number;
  max: number;
  /** Prix public présumé TTC (÷ 1,20 pour obtenir le HT). */
  ttc?: boolean;
  source: SourceRef;
};

const G = "materiaux-gros-oeuvre" as const;
const S = "materiaux-second-oeuvre" as const;
const M = "marche-prive-main-oeuvre" as const;
const I = "prix-internes" as const;
const H = "hypothese" as const;

const src = (fichier: FichierRecherche, ids: string[], fiabilite: Fiabilite, date: string, note?: string): SourceRef => ({ fichier, ids, fiabilite, date, note });
const hyp = (note: string): SourceRef => ({ fichier: H, ids: [], fiabilite: "H", date: "2026-10", note });

/** Taux de TVA appliqué aux prix publics présumés TTC pour revenir au HT. */
export const TVA_PRIX_PUBLICS = 0.2;

const P = (id: string, libelle: string, unite: string, min: number, ref: number, max: number, source: SourceRef, ttc = false): PrixElementaire => ({ id, libelle, unite, min, ref, max, source, ...(ttc ? { ttc } : {}) });

// ─────────────────────────────────────────────────────────────────────────
// MATÉRIAUX
// ─────────────────────────────────────────────────────────────────────────
export const MATERIAUX: Record<string, PrixElementaire> = Object.fromEntries([
  // Bétons prêts à l'emploi, livrés ≤ 15-20 km
  P("BPE_B15", "Béton prêt à l'emploi B15 (propreté)", "m³", 750, 825, 900, src(G, ["bpe-b15-lechantier", "bpe-b15-btpro"], "B", "2026-02/05")),
  P("BPE_B25", "Béton prêt à l'emploi B25", "m³", 850, 1000, 1100, src(G, ["bpe-b25-lechantier", "bpe-b25-btpro", "bpe-b25-rabat-btpro", "bpe-b25-tachrone-mymod"], "B", "2026-02/10")),
  P("BPE_B30", "Béton prêt à l'emploi B30 (ouvrages enterrés)", "m³", 920, 1150, 1250, src(G, ["bpe-b30-lechantier", "bpe-b30-btpro", "bpe-b30-tachrone-mymod"], "B", "2026-02/10")),
  P("POMPAGE", "Pompage du béton", "m³", 150, 200, 250, src(G, ["bpe-pompage-lechantier"], "B", "2026-05", "Facturé au m³ (LeChantier) ou au forfait 3 000-8 000 par coulage (BTPro)")),
  P("ACIER_HA", "Acier HA FeE500 (tous diamètres)", "kg", 8.8, 9.6, 10.5, src(G, ["acier-fee500-francobat", "acier-t10-lechantier", "acier-t12-kg-francobat", "acier-t12-kg-tachrone-vetco", "acier-ha-e500-lcgo"], "B", "2026-03/10")),
  P("FIL_ATTACHE", "Fil d'attache recuit", "kg", 12, 13, 14, src(G, ["acier-fil-attache-tachrone", "acier-fil-attache-engincat"], "C", "2026-10")),
  P("CTBX18", "Contreplaqué CTBX 18 mm (coffrage)", "m²", 85, 102, 120, src(G, ["ctp-okoume18-lechantier"], "B", "2026-05")),
  P("BOIS_COFFRAGE", "Bois sapin (bastaings, chevrons de coffrage)", "m³", 2500, 3500, 4500, src(G, ["bois-sapin-c18-lechantier"], "C", "2026-05", "Aucun prix spécifique au bois de coffrage")),
  P("CIMENT_CPJ45", "Ciment CPJ 45, sac de 50 kg", "sac", 72, 80, 85, src(G, ["cim-cpj45-lechantier", "cim-holcim-cpj45-tachrone", "cim-cimat-cpj45-tachrone", "cim-materca-cpj45-tachrone"], "B", "2026-05/10")),
  P("SABLE", "Sable concassé 0/4 rendu chantier", "m³", 150, 200, 250, src(G, ["sable-conc-lechantier", "sable-carr-liv-lcblog", "sable-carr-enginblog"], "B", "2026-01/05")),
  P("GRAVIER", "Gravier 15/25 rendu chantier", "m³", 150, 215, 300, src(G, ["grav-1525-lechantier", "grav-1525-liv-lcblog", "grav-1525-enginblog"], "B", "2026-01/05")),
  P("TOUT_VENANT", "Tout-venant 0/40 rendu chantier", "m³", 110, 155, 200, src(G, ["tv-040-lechantier", "tv-040-liv-lcblog", "tv-040-enginblog"], "B", "2026-01/05")),
  P("AGGLO10", "Agglo creux 10×20×40", "u", 2.5, 4, 6, src(G, ["agglo-10-lechantier", "agglo-10-enginblog"], "B", "2026-01/05")),
  P("AGGLO15", "Agglo creux 15×20×40", "u", 4, 5.75, 8, src(G, ["agglo-15-lechantier", "agglo-15-francobat", "agglo-15-tachrone-wislane", "agglo-15-tachrone-vetco", "agglo-15-tachrone-mymod"], "B", "2026-04/10")),
  P("AGGLO20", "Agglo creux 20×20×40", "u", 5, 7, 9, src(G, ["agglo-20-francobat", "agglo-20-tachrone-wislane", "agglo-20-tachrone-vetco", "agglo-20-tachrone-mymod", "agglo-20-lechantier-brique"], "B", "2026-04/10", "Extrêmes EnginLoc 3,5 et LeChantier 12 écartés (contradiction signalée)")),
  P("BRIQUE8", "Brique creuse 8 trous", "u", 1.5, 2, 2.5, src(G, ["brique-8t-enginblog", "brique-8t-tachrone-jbel", "brique-08-tachrone-amina"], "B", "2026-01/10")),
  P("HOURDIS16", "Hourdis béton 16 cm", "u", 4.8, 5.8, 7.5, src(G, ["hourdis-16-enginblog", "hourdis-15-tachrone-wislane", "hourdis-15n-tachrone-vetco"], "B", "2026-01/10", "Valeur LeChantier 18-26 écartée comme aberrante")),
  P("HOURDIS20", "Hourdis béton 20 cm", "u", 6, 7.5, 9, src(G, ["hourdis-20-enginblog", "hourdis-20-tachrone-wislane", "hourdis-20-tachrone-cimag"], "B", "2026-01/10")),
  P("POUTRELLE", "Poutrelle précontrainte", "ml", 26, 50, 72, src(G, ["poutrelle-tachrone-oldmaati", "poutrelle-4m-lechantier", "poutrelle-5m-lechantier"], "B", "2026-05/10", "Désaccord majeur entre sources : valeur à valider")),
  P("TREILLIS_ST25", "Treillis soudé ST25", "m²", 35, 47, 55, src(G, ["ts-st25-lechantier", "ts-st25-enginblog"], "B", "2026-01/05")),
  P("MEMBRANE_SBS4", "Membrane bitumineuse 4 mm (rouleau 10 m²)", "m²", 44, 44.5, 45.5, src(G, ["eta-bituflex4-rifaa"], "B", "2026-10"), true),
  P("MEMBRANE_SBS3", "Membrane bitumineuse 3 mm (rouleau 10 m²)", "m²", 42, 42.5, 43.5, src(G, ["eta-bituflex3-rifaa"], "B", "2026-10"), true),
  P("PRIMAIRE_EIF", "Primaire d'accrochage bitumineux (EIF)", "kg", 30, 35, 40, src(G, ["eta-primaire-engincat"], "C", "2026-10")),
  P("GEOTEXTILE", "Géotextile non tissé", "m²", 6, 8, 10, src(G, ["eta-geotextile-engincat"], "C", "2026-10")),
  P("XPS4", "Isolant polystyrène extrudé XPS 4 cm", "m²", 86.67, 86.67, 100, src(S, ["ao-xps-4"], "B", "2026-10"), true),
  P("PSE4", "Isolant polystyrène expansé PSE 4 cm", "m²", 24, 24, 30, src(S, ["rf-pse-4"], "B", "2026-10"), true),
  P("DRAIN_PVC", "Drain / tube PVC Ø100", "ml", 19, 25, 30, src(G, ["pvc-100-engincat"], "C", "2026-10", "Proxy du drain agricole perforé (aucun prix dédié)")),
  P("PVC200", "Tube PVC assainissement Ø200 SN4 (négoce)", "ml", 55, 61, 85, src(G, ["pvc-200-engin"], "C", "2026-10", "Bricoma au détail : 153 DH/ml (pvc-200-bricoma)")),
  P("REGARD60", "Regard béton 60×60×60 avec tampon fonte (ouvrage)", "u", 1300, 1550, 1800, src(G, ["regard-6060-cype"], "C", "non daté", "Prix d'ouvrage CYPE HT, sans bénéfice")),

  // Revêtements
  P("CARREAU_45", "Grès cérame 45×45", "m²", 105, 105, 120, src(S, ["rv-zel-mistral-45x45"], "B", "2026-10"), true),
  P("CARREAU_60", "Grès cérame 60×60 / 60×120 poli", "m²", 140, 165, 250, src(S, ["rv-zel-verona-60x60", "rv-azl-black-60x120", "rv-zel-travertino-60x120"], "B", "2026-10", "Prix promo retenu ; prix normaux 180-279"), true),
  P("CARREAU_GF", "Grès cérame grand format 80×80 / 120×120", "m²", 180, 265, 350, src(S, ["lc-rv-gc-gf", "lc-rv-gc-hg-blog"], "C", "2026-06")),
  P("MARBRE_LOCAL", "Marbre local poli 2 cm (Atlantic, Gris Royal, Cream Julia)", "m²", 400, 440, 470, src(S, ["zj-atlantic-blanc", "zj-gris-royal", "zj-cream-julia"], "B", "2026-10"), true),
  P("MARBRE_IMPORT", "Marbre importé (Crema Marfil, Carrare, Ibiza)", "m²", 650, 700, 750, src(S, ["zj-crema-marfil", "zj-blanc-carrare", "zj-blanc-ibiza"], "B", "2026-10", "Carrare 900-2 200 ailleurs : contradiction"), true),
  P("FAIENCE_ECO", "Faïence murale 30×60 (négoce)", "m²", 66, 69, 70, src(S, ["eg-rv-fai-30x60"], "C", "2026-10")),
  P("FAIENCE_STD", "Faïence murale 30×60 choix décor", "m²", 110, 110, 140, src(S, ["rv-zel-millennium-30x60"], "B", "2026-10"), true),
  P("ZELLIGE", "Zellige machine 10×10 émaillé", "m²", 250, 315, 380, src(S, ["lc-zl-machine-10"], "C", "2026-06")),
  P("PLINTHE", "Plinthe assortie h 7-10 cm", "ml", 8, 15, 25, src(S, ["lc-rv-plinthe"], "C", "2026-06")),
  P("COLLE_C2", "Mortier-colle C2 pour carrelage", "kg", 4, 6, 8, hyp("Aucun prix de colle carrelage dans les recherches")),

  // Peinture et enduits
  P("PEINT_ECO", "Peinture vinylique intérieure (gamme éco, seau 30 kg)", "kg", 7.17, 10, 12.5, src(S, ["pt-itovinyl-30", "pt-matex-30", "pt-jafep404-30"], "B", "2026-10"), true),
  P("PEINT_MOY", "Peinture vinylique intérieure (gamme moyenne)", "kg", 13.17, 14, 18, src(S, ["pt-colovinyl600-30", "pt-cellaqua-30", "pt-vinytek-30"], "B", "2026-10"), true),
  P("PEINT_HAUT", "Peinture acrylique mate haut de gamme", "kg", 40, 47, 66, src(S, ["pt-zenit-15", "pt-odasat-15", "pt-extralite-20", "pt-notach-15"], "B", "2026-10"), true),
  P("PEINT_FACADE", "Peinture façade vinylique mate (seau 30 kg)", "kg", 16.67, 16.67, 20, src(S, ["pt-jafep504fac-30"], "B", "2026-10"), true),
  P("PEINT_SILOXANE", "Peinture façade siloxane", "L", 59, 59, 70, src(S, ["pt-astraloxane-15l"], "B", "2026-10", "Guide LeChantier 95-160 DH/L (C)"), true),
  P("ENDUIT_LISSAGE", "Enduit de lissage / rebouchage", "kg", 5, 11, 17, src(S, ["en-toupret-cb-25", "en-toupret-re38-25", "en-stopastral-25", "en-silenduit-25"], "B", "2026-10"), true),
  P("IMPRESSION", "Impression / primaire", "L", 35, 39, 45, src(S, ["en-coloprime-5l"], "B", "2026-10"), true),

  // Plâtrerie
  P("BA13", "Plaque BA13 standard", "m²", 35, 45, 55, src(S, ["lc-ba13-std"], "C", "2026-06")),
  P("OSSATURE", "Ossature galvanisée (montant / fourrure)", "ml", 12, 17, 22, src(S, ["lc-ba13-montant"], "C", "2026-06")),
  P("STAFF_DECO_POSE", "Faux plafond staff décoratif, fourni-posé", "m²", 180, 240, 300, src(S, ["mn-fp-staff-deco"], "C", "2026-03")),
  P("CORNICHE", "Corniche staff 8-10 cm", "ml", 65, 80, 95, src(S, ["lc-staff-corniche"], "C", "2026-06")),

  // Menuiseries (fourniture fabriquée)
  P("ALU_ECO", "Fenêtre alu sans RPT, vitrage basique (fourni)", "m²", 700, 900, 1100, src(S, ["tv-alu-eco-f", "lb-alu-coul-2v"], "C", "2026-03/07")),
  P("ALU_MOY", "Fenêtre alu RPT double vitrage 4/16/4 (fourni)", "m²", 1000, 1250, 1500, src(S, ["tv-alu-moy-f", "lb-alu-coul-rpt", "al-rpt-dv"], "C", "2026-03/10")),
  P("ALU_HAUT", "Alu RPT renforcé, grandes baies (fourni)", "m²", 1500, 2000, 2500, src(S, ["tv-alu-haut-f", "lb-alu-galandage"], "C", "2026-03/07")),
  P("ALU_LUXE", "Levant-coulissant premium (Schüco/Reynaers)", "m²", 4500, 6000, 7500, src(S, ["lc-alu-levant"], "C", "2026-06")),
  P("ALU_POSE", "Pose de menuiserie aluminium", "m²", 150, 275, 400, src(S, ["tv-alu-pose", "al-pose-fen"], "C", "2026-07/10")),
  P("VOLET_ALU", "Volet roulant aluminium", "m²", 600, 850, 1100, src(S, ["al-volet-f"], "C", "2026-10")),
  P("PORTE_ENTREE_ALU", "Porte d'entrée aluminium pleine", "u", 3500, 5000, 7000, src(S, ["lb-alu-porte"], "C", "2026-03")),
  P("PORTE_ENTREE_BOIS", "Porte d'entrée bois massif (iroko/ipé)", "u", 8500, 12000, 18000, src(S, ["lc-porte-entree-bois"], "C", "2026-06")),
  P("PORTE_ECO", "Porte isoplane mélaminée 80×210", "u", 450, 600, 750, src(S, ["lc-isoplane-mel"], "C", "2026-06")),
  P("PORTE_MOY", "Bloc-porte complet (porte + huisserie + serrure)", "u", 1200, 2000, 3500, src(S, ["lc-bloc-porte"], "C", "2026-06")),
  P("PORTE_HAUT", "Porte intérieure pin massif", "u", 2800, 4000, 5500, src(S, ["lc-porte-pin"], "C", "2026-06")),
  P("PORTE_LUXE", "Porte intérieure chêne massif", "u", 6500, 8500, 11000, src(S, ["lc-porte-chene"], "C", "2026-06")),
  P("POSE_PORTE", "Pose porte intérieure + huisserie", "u", 200, 300, 400, src(S, ["lc-pose-porte"], "C", "2026-06")),
  P("POSE_PORTE_MASSIF", "Pose porte bois massif", "u", 400, 600, 800, src(S, ["lc-pose-porte-massif"], "C", "2026-06")),
  P("CUISINE_ML", "Cuisine sur mesure MDF mélaminé, posée", "ml", 4000, 5000, 6000, src(S, ["am-cuis-essentielle"], "C", "2026-03", "Recommandation de la recherche : 4 000-6 000 DH/ml, hors électroménager")),

  // Métallerie
  P("GC_ALU", "Garde-corps alu barreaudage h 1 m", "ml", 280, 365, 450, src(S, ["lc-gc-alu-std"], "C", "2026-06")),
  P("GC_INOX", "Garde-corps inox 304", "ml", 450, 650, 850, src(S, ["lc-gc-inox304"], "C", "2026-06")),
  P("GC_VERRE", "Garde-corps verre trempé + montants inox", "ml", 1200, 1500, 1800, src(S, ["lc-gc-verre-inox"], "C", "2026-06")),
  P("GC_TOUT_VERRE", "Garde-corps tout verre feuilleté", "ml", 1800, 2300, 2800, src(S, ["lc-gc-tout-verre"], "C", "2026-06")),
  P("GC_POSE", "Pose garde-corps (MO + ancrage)", "ml", 200, 400, 650, src(S, ["lc-gc-pose"], "C", "2026-06")),
  P("PORTAIL", "Portail métallique 3,5 m + portillon", "u", 9000, 15000, 25000, hyp("Aucun prix de portail dans les recherches")),

  // Électricité — prix réels du dossier Kénitra (comptoir 2026-07) puis distributeurs
  P("BOITE_ENC", "Boîte d'encastrement", "u", 3, 3, 3.5, src(I, ["dqe-reel-kenitra#1"], "A", "2026-07", "Prix constaté, devis fournisseur")),
  P("GAINE_ICTA20", "Gaine ICTA Ø20", "ml", 2.5, 2.5, 3.9, src(I, ["dqe-reel-kenitra#2"], "A", "2026-07", "Bricoma Ø16 : 3,90 (br-gaine-d16-50)")),
  P("FIL_15", "Fil H07V-U 1,5 mm²", "ml", 2.6, 2.6, 2.74, src(I, ["dqe-reel-kenitra#6"], "A", "2026-07", "BniDark : 2,74 (bd-h07vu-15)")),
  P("FIL_25", "Fil H07V-U 2,5 mm²", "ml", 4.2, 4.2, 4.4, src(I, ["dqe-reel-kenitra#5"], "A", "2026-07", "Matelec 4,25, BniDark 4,40")),
  P("FIL_6", "Câble 6 mm²", "ml", 12.5, 12.5, 14, src(I, ["dqe-reel-kenitra#7"], "A", "2026-07")),
  P("PRISE", "Prise 2P+T avec plaque", "u", 13.5, 17, 21.5, src(I, ["dqe-reel-kenitra#12"], "A", "2026-07"), true),
  P("INTER", "Interrupteur SA/VV avec plaque", "u", 14, 22, 32, src(I, ["dqe-reel-kenitra#13"], "A", "2026-07"), true),
  P("APPAREILLAGE_HAUT", "Appareillage design (Simon 54)", "u", 91.9, 91.9, 105, src(S, ["br-prise-simon54-etanche"], "B", "2026-10"), true),
  P("COFFRET42", "Coffret d'abonné encastré 42 modules", "u", 575, 622, 669, src(S, ["br-coffret-abonne"], "B", "2026-10"), true),
  P("DISJ", "Disjoncteur modulaire 1P 16 A", "u", 36.9, 36.9, 45, src(S, ["br-disj-easy9-16", "ji-disj-10a"], "B", "2026-10"), true),
  P("ID30", "Interrupteur différentiel 2P 40 A", "u", 299, 299, 445, src(S, ["br-id-easy9-2p40", "br-id-easy9-2p63"], "B", "2026-10"), true),
  P("TERRE", "Prise de terre (piquets, barrette, câble 25 mm²)", "ens", 800, 1200, 1800, hyp("Ligne non chiffrée du DQE réel (dqe-reel-kenitra#20)")),
  P("PLACARD", "Façade de placard coulissante mélaminée avec aménagement", "ml", 1200, 1800, 2500, hyp("Aucun prix de placard dans les recherches")),
  P("ALARME_VIDEO", "Alarme et vidéosurveillance (4 caméras)", "ens", 8000, 12000, 20000, hyp("Lignes « alarme, vidéosurveillance » du corpus prestataires, non chiffrées dans les recherches")),
  P("DOMOTIQUE", "Domotique : éclairage, volets, clim pilotés", "ens", 25000, 40000, 70000, hyp("Aucun prix de domotique dans les recherches")),
  P("VDI_FORFAIT", "Courants faibles : coffret VDI, RJ45, TV, interphone", "ens", 3000, 5000, 8000, hyp("Ligne non chiffrée du DQE réel (dqe-reel-kenitra#21)")),

  // Plomberie / sanitaire (Bricoma, prix promo en réf., prix normal en max)
  P("PPR20", "Tube PPR PN20 Ø20", "ml", 12.5, 12.5, 18, src(I, ["dqe-reel-kenitra#25"], "A", "2026-07", "Ziribox Ø25 : 18 DH/ml (zb-ppr-25)")),
  P("PVC_EVAC", "Tube PVC évacuation Ø40 à Ø100", "ml", 19, 25, 30, src(G, ["pvc-100-engincat"], "C", "2026-10")),
  P("WC_ECO", "Pack WC complet éco", "u", 879, 1080, 1279, src(S, ["br-wc-adele", "br-wc-debba"], "B", "2026-10"), true),
  P("WC_MOY", "Pack WC complet moyen", "u", 2265, 2410, 2559, src(S, ["br-wc-gap", "br-wc-sidney"], "B", "2026-10"), true),
  P("WC_HAUT", "Pack WC abattant amorti", "u", 3079, 3270, 3455, src(S, ["br-wc-hall", "br-wc-happening"], "B", "2026-10"), true),
  P("WC_SUSPENDU", "Kit WC suspendu Geberit / Grohe", "u", 3200, 4850, 7000, src(S, ["lc-wcs-geberit", "lc-wcs-grohe"], "C", "2026-06")),
  P("LAVABO_ECO", "Lavabo + colonne", "u", 1138, 1138, 1138, src(S, ["br-lav-debba-col"], "B", "2026-10"), true),
  P("LAVABO_MOY", "Lavabo design", "u", 1085, 1085, 1355, src(S, ["br-lav-urbi6"], "B", "2026-10"), true),
  P("VASQUE_HAUT", "Vasque à poser", "u", 1399, 1399, 1399, src(S, ["br-vasque-ohtake"], "B", "2026-10"), true),
  P("MIT_LAV_ECO", "Mitigeur lavabo", "u", 369, 430, 489, src(S, ["br-mit-lav-std", "br-mit-lav-saona"], "B", "2026-10"), true),
  P("MIT_LAV_HAUT", "Mitigeur lavabo bec haut", "u", 959, 959, 1199, src(S, ["br-mit-lav-carelia"], "B", "2026-10"), true),
  P("MIT_DOUCHE", "Mitigeur douche", "u", 445, 600, 749, src(S, ["br-mit-douche-loft", "br-mit-douche-saona"], "B", "2026-10"), true),
  P("PAROI_DOUCHE", "Paroi de douche à l'italienne 90×200", "u", 1519, 1519, 1519, src(S, ["br-paroi-orso-90"], "B", "2026-10"), true),
  P("CABINE_DOUCHE", "Cabine de douche avec receveur 90×90", "u", 2349, 2349, 2349, src(S, ["br-cabine-receveur"], "B", "2026-10"), true),
  P("PAROI_HAUT", "Paroi de douche Roca Victoria", "u", 5675, 5675, 5675, src(S, ["br-paroi-roca-victoria"], "B", "2026-10"), true),
  P("KIT_DOUCHE_LUXE", "Kit douche encastrable Grohe", "u", 14500, 14500, 14500, src(S, ["sm-grohe-kit-douche"], "B", "2026-10"), true),
  P("MIT_EVIER", "Mitigeur évier", "u", 1239, 1239, 1375, src(S, ["br-mit-evier-mencia"], "B", "2026-10"), true),
  P("MIT_EVIER_LUXE", "Mitigeur évier haut de gamme", "u", 2750, 2750, 2750, src(S, ["br-mit-evier-linus"], "B", "2026-10"), true),
  P("CHAUFFE_EAU_100", "Chauffe-eau électrique 100 L", "u", 2399, 2399, 3999, src(S, ["br-ce-junkers-100", "br-ce-megalife-100"], "B", "2026-10"), true),
  P("CES_200", "Chauffe-eau solaire 200 L", "u", 11999, 12945, 13890, src(S, ["br-ces-chaff-200", "br-ces-hagen-200"], "B", "2026-10"), true),
  P("CES_POSE", "Pose chauffe-eau solaire", "u", 850, 900, 955, src(S, ["br-ces-pose"], "B", "2026-10"), true),
  P("ACCESSOIRES_PLOMB", "Raccords, vannes, siphons, flexibles (par appareil)", "u", 100, 150, 250, hyp("Lignes non chiffrées du DQE réel (dqe-reel-kenitra#26-31)")),

  // Climatisation, ascenseur, énergie
  P("SPLIT12", "Split inverter 12 000 BTU + kit cuivre 3 m", "u", 3650, 3999, 5499, src(S, ["br-clim-zenya-12k", "br-clim-mega-12k-elva", "br-clim-taurus-12k-inv"], "B", "2026-10"), true),
  P("SPLIT24", "Split inverter 24 000 BTU", "u", 7199, 7790, 9290, src(S, ["br-clim-zenya-24k", "br-clim-carrier-24k", "br-clim-mega-24k-versaty"], "B", "2026-10"), true),
  P("SPLIT12_PREMIUM", "Split 12 000 BTU premium (Daikin, LG, Mitsubishi)", "u", 5500, 7500, 9500, src(S, ["lc-clim-12k"], "C", "2026-06")),
  P("GAINABLE", "Climatisation gainable 24-36 kBTU (unité + réseau)", "u", 22000, 28500, 35000, src(S, ["lc-clim-gainable"], "C", "2026-06", "DQE réel Kénitra : 24 000 BTU 11 200-12 900, 36 000 BTU 14 600-20 000 (appareil seul)")),
  P("POSE_SPLIT", "Pose d'un split (MO + liaisons < 5 m)", "u", 1200, 1600, 2000, src(S, ["lc-clim-pose"], "C", "2026-06")),
  P("ELEVATEUR_MAISON", "Élévateur maison 250 kg, 2 niveaux", "u", 80000, 100000, 120000, src(S, ["ad-asc-maison"], "B", "2026-10")),
  P("ASCENSEUR_480", "Ascenseur 480 kg à câble, 4 niveaux", "u", 200000, 240000, 280000, src(S, ["ad-asc-480-4n"], "B", "2026-10")),
  P("ASC_NIVEAU_SUP", "Supplément par niveau desservi", "u", 15000, 22500, 30000, src(S, ["ad-asc-niveau-sup"], "B", "2026-10")),
  P("ASC_GENIE_CIVIL", "Génie civil gaine + fosse d'ascenseur", "u", 30000, 55000, 80000, src(S, ["ad-asc-gc"], "B", "2026-10")),
  P("PV_SYSTEME", "Système photovoltaïque clé en main", "Wc", 8.5, 10.5, 14, src(S, ["lc-pv-3kwc", "lc-pv-5kwc", "lc-pv-10kwc"], "C", "2026-06")),
  P("PISCINE_GO", "Piscine : gros œuvre du bassin", "m²", 500, 750, 1000, src(M, ["op-vvanat-piscine"], "C", "2025-09")),
  P("PISCINE_ETANCH", "Piscine : étanchéité / revêtement du bassin", "m²", 180, 250, 320, src(M, ["op-vvanat-piscine"], "C", "2025-09", "Fourchette citée dans marche-prive-main-oeuvre.md §3")),
  P("PISCINE_EQUIP", "Piscine : filtration, pompe, local technique", "ens", 18000, 25000, 40000, hyp("Équipement de filtration non sourcé ; recoupé avec 80 000-200 000 DH la petite piscine (op-progimmo-piscine)")),

  // Engins et transports
  P("MINI_PELLE", "Location mini-pelle avec conducteur (jour)", "j", 1500, 2000, 2500, src(G, ["loc-minipelle-casa-engin"], "C", "2026-10", "Transport non inclus")),
  P("EVACUATION", "Transport et mise en décharge des déblais (≤ 10 km)", "m³", 40, 60, 90, hyp("Aucun prix de camionnage ni de décharge dans les recherches")),
  P("BRH", "Brise-roche hydraulique sur pelle (jour)", "j", 2500, 3500, 4500, hyp("Location de BRH non sourcée")),
  P("POMPE_EPUISEMENT", "Épuisement / rabattement de nappe (par semaine)", "sem", 2500, 4000, 7000, hyp("Aucun prix de pompage de chantier dans les recherches")),
  P("CUVELAGE_HYDRO", "Cuvelage : mortier hydrofuge / revêtement d'imperméabilisation intérieur", "m²", 180, 280, 420, hyp("Hydrofuge et cuvelage : lacune signalée (materiaux-gros-oeuvre.md)")),
  P("BLINDAGE", "Blindage provisoire de fouille (location + pose)", "m²", 150, 250, 400, hyp("Blindage et étaiement : aucun prix d'achat ni de location trouvé")),
].map((p) => [p.id, p]));

// ─────────────────────────────────────────────────────────────────────────
// MAIN-D'ŒUVRE (taux journaliers base RSK, 8 h)
// ─────────────────────────────────────────────────────────────────────────
export type Metier = "manoeuvre" | "macon" | "ferrailleur" | "coffreur" | "carreleur" | "peintre" | "platrier" | "electricien" | "plombier" | "etancheur" | "menuisier" | "chef";

export type TauxMO = { metier: Metier; libelle: string; min: number; ref: number; max: number; source: SourceRef };

const T = (metier: Metier, libelle: string, min: number, ref: number, max: number, source: SourceRef): TauxMO => ({ metier, libelle, min, ref, max, source });

export const MAIN_OEUVRE: Record<Metier, TauxMO> = Object.fromEntries([
  T("manoeuvre", "Manœuvre / aide-maçon", 150, 200, 250, src(M, ["mo-lechantier-manoeuvre", "mo-fadil-manoeuvre"], "B", "2025-07/2026-06")),
  T("macon", "Maçon qualifié (maâlem)", 280, 330, 450, src(M, ["mo-lechantier-macon", "mo-fadil-macon", "mo-actumaroc-maalem"], "B", "2025-07/2026-06")),
  T("ferrailleur", "Ferrailleur", 280, 330, 450, src(M, ["mo-jobsquare-macon"], "B", "2026-05", "Même grille mensuelle que le maçon")),
  T("coffreur", "Coffreur", 280, 330, 450, src(M, ["mo-jobsquare-macon"], "B", "2026-05", "Même grille mensuelle que le maçon")),
  T("carreleur", "Carreleur", 190, 300, 350, src(M, ["mo-jobsquare-carreleur"], "B", "2026-05", "Taux journalier déduit du salaire mensuel")),
  T("peintre", "Peintre", 200, 250, 300, src(M, ["mo-archiplan-peintre"], "B", "2025-06")),
  T("platrier", "Plâtrier / plaquiste", 250, 300, 350, hyp("Payé au m² en pratique : taux journalier non sourcé")),
  T("electricien", "Électricien", 300, 400, 550, src(M, ["mo-lechantier-elec-plomb", "mo-fadil-elec"], "B", "2025-07/2026-06")),
  T("plombier", "Plombier", 300, 400, 550, src(M, ["mo-lechantier-elec-plomb", "mo-fadil-elec"], "B", "2025-07/2026-06")),
  T("etancheur", "Étancheur", 280, 330, 450, hyp("Aligné sur le maçon qualifié (non sourcé)")),
  T("menuisier", "Poseur menuiserie / métallier", 280, 350, 450, hyp("Non sourcé")),
  T("chef", "Chef d'équipe", 350, 450, 600, src(M, ["mo-archiplan-chefequipe"], "B", "2025-06")),
].map((t) => [t.metier, t])) as Record<Metier, TauxMO>;

/** Heures payées par jour. */
export const HEURES_JOUR = 8;

/**
 * Charges patronales CNSS + AMO + TFP 2026 (fiabilité A) appliquées aux taux
 * journaliers observés, présumés être des salaires (entreprise déclarée).
 */
export const CHARGES_SOCIALES = { taux: 0.2109, source: src(M, ["mo-cnss-2026"], "A", "2026-03") };

/** Coût horaire chargé d'un métier (base RSK). */
export function coutHoraire(metier: Metier, borne: "min" | "ref" | "max" = "ref"): number {
  return (MAIN_OEUVRE[metier][borne] * (1 + CHARGES_SOCIALES.taux)) / HEURES_JOUR;
}

// ─────────────────────────────────────────────────────────────────────────
// COEFFICIENT DE VENTE K (déboursé sec → prix de vente HT)
// ─────────────────────────────────────────────────────────────────────────
/**
 * K = (1 + frais de chantier) × (1 + frais généraux) × (1 + aléas et bénéfice).
 * Référence : guides privés et CYPE Maroc cités dans marches-publics.md §4
 * (K pratiqué 1,38 à 1,45 ; exemple R+2 : 1,41) et recommandation §6
 * (1,40 en privé, 1,45-1,55 en public). Décomposition = hypothèse CITURBAREA.
 */
export const COEF_K = {
  fraisChantier: 0.1,
  fraisGeneraux: 0.12,
  aleasBenefice: 0.12,
  min: 1.35,
  max: 1.45,
  public: [1.45, 1.55] as [number, number],
  source: src("marches-publics", [], "C", "2023-2025", "marches-publics.md §4 et §6 : K privé 1,38-1,45 (guides, CYPE), 1,40 recommandé ; décomposition = hypothèse"),
} as const;

export const K_PRIVE = +((1 + COEF_K.fraisChantier) * (1 + COEF_K.fraisGeneraux) * (1 + COEF_K.aleasBenefice)).toFixed(3);

/**
 * Ouvrages sous-traités fournis-posés (menuiseries, clim, ascenseur, PV,
 * cuisine, piscine) : le prix du sous-traitant contient déjà sa marge ;
 * l'entreprise générale n'ajoute que coordination + frais (hypothèse).
 */
export const K_SOUS_TRAITANCE = { ref: 1.12, min: 1.08, max: 1.18, source: hyp("Coefficient de coordination de l'entreprise générale sur les lots sous-traités") };

/** Petit matériel et consommables, en % de la main-d'œuvre (hypothèse ; CYPE n'applique que 2 % de coûts directs complémentaires). */
export const PETIT_MATERIEL_MO = 0.05;

// ─────────────────────────────────────────────────────────────────────────
// TVA ET RÉGIONALISATION
// ─────────────────────────────────────────────────────────────────────────
/**
 * TVA sur travaux immobiliers facturés par une entreprise : taux normal 20 %
 * (CGI 2026 ; taux normal et livraisons à soi-même de construction à 20 %).
 * Vérifié le 2026-10-09 sur des sources secondaires (Upsilon Consulting,
 * ReaConsult) — à confirmer sur le CGI en vigueur (tax.gov.ma).
 * Exonération : livraison à soi-même d'une habitation personnelle ≤ 300 m²
 * couverts par une personne physique (permis, résidence principale ≥ 4 ans) —
 * cas de l'autoconstruction, pas d'une facture d'entreprise.
 */
export const TVA = {
  taux: 0.2,
  verification: "2026-10-09",
  sources: [
    "https://upsilon-consulting.com/tva-sur-les-operations-immobilieres-au-maroc/",
    "https://upsilon-consulting.com/tva-au-maroc/",
    "https://reaconsult.ma/tendances-et-conseils-en-immobilier/tva-immobilier-neuf-maroc-acheteur-promoteur",
  ],
  fiabilite: "B" as Fiabilite,
  note: "Taux normal 20 % sur les travaux d'entreprise. Livraison à soi-même d'une habitation personnelle ≤ 300 m² exonérée (autoconstruction). À confirmer sur le CGI 2026.",
};

/**
 * Coefficients régionaux : `coef` global (grille2026, base RSK) décliné en
 * coefficient main-d'œuvre (écart × 1,3, recommandation de
 * marche-prive-main-oeuvre.md §2) et matériaux (écart × 0,8, pour que
 * 60 % matériaux + 40 % MO redonnent le coefficient global).
 */
export function coefsRegionaux(coefGlobal: number) {
  const d = coefGlobal - 1;
  return { global: coefGlobal, mo: +(1 + 1.3 * d).toFixed(4), mat: +(1 + 0.8 * d).toFixed(4) };
}

/** Prix HT d'un matériau à la borne demandée. */
export function prixHT(p: PrixElementaire, borne: "min" | "ref" | "max" = "ref"): number {
  const v = p[borne];
  return p.ttc ? v / (1 + TVA_PRIX_PUBLICS) : v;
}
