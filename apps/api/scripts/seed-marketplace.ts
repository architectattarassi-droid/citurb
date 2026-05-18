/* eslint-disable */
/**
 * seed-marketplace.ts — Vitrines fournisseurs test pour la Marketplace BTP.
 *
 * Crée (idempotent) 8 fournisseurs couvrant les 16 catégories matériaux,
 * avec des produits réels et des prix marché Maroc 2026 réalistes.
 * Photos = placeholders picsum (à remplacer via "Ma vitrine").
 *
 * Usage prod : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-marketplace.ts
 */
import { PrismaClient } from "@prisma/client";
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASSWORD = "Vitrine2026!";

function pic(seed: string) {
  return `https://picsum.photos/seed/cit-${seed}/640/440`;
}

type P = {
  name: string; category: string; unit: string; priceDH: number;
  reference?: string; description: string; quantityAvailable?: number; minOrder?: number;
  showroomAddress?: string; showroomCity?: string;
  deliveryZones?: string[]; deliveryDelayHours?: number; deliveryCostDH?: number; deliveryIncluded?: boolean;
  photos: string[];
};

type Supplier = {
  email: string; displayName: string; cabinetName: string; ville: string; bio: string; products: P[];
};

const SUPPLIERS: Supplier[] = [
  {
    email: "vitrine.marbre@citurbarea.demo",
    displayName: "Sahara Marbre & Pierres",
    cabinetName: "Sahara Marbre & Pierres SARL",
    ville: "Marrakech",
    bio: "Spécialiste marbres, granits et pierres naturelles. Carrière propre dans l'Atlas, atelier de taille et polissage à Marrakech. Pose sur tout le Maroc.",
    products: [
      { name: "Marbre Sahara Beige — dalle polie", category: "REVETEMENT_SOL", unit: "M2", priceDH: 320, reference: "MRB-SAH-BEIGE", description: "Marbre beige du Sahara, finition polie brillante. Épaisseur 2 cm. Idéal sols intérieurs, plans de travail, escaliers. Veinage doux uniforme.", quantityAvailable: 850, minOrder: 10, showroomCity: "Marrakech", showroomAddress: "Quartier Industriel Sidi Ghanem, lot 214", deliveryZones: ["Marrakech-Safi", "Casablanca-Settat", "Souss-Massa"], deliveryDelayHours: 72, deliveryCostDH: 600, photos: [pic("marbre-sahara")] },
      { name: "Travertin Romain — opus classico", category: "REVETEMENT_SOL", unit: "M2", priceDH: 280, reference: "TRV-ROM", description: "Travertin beige clair, finition vieillie. Parfait terrasses, façades, pool-house. Antidérapant naturel.", quantityAvailable: 600, minOrder: 15, showroomCity: "Marrakech", deliveryZones: ["Marrakech-Safi", "Casablanca-Settat"], deliveryDelayHours: 72, deliveryCostDH: 600, photos: [pic("travertin")] },
      { name: "Granit Noir Zimbabwe — poli miroir", category: "REVETEMENT_SOL", unit: "M2", priceDH: 560, reference: "GRN-ZIM-NOIR", description: "Granit noir absolu, poli miroir. Plans de cuisine, sols haut de gamme. Très haute résistance.", quantityAvailable: 320, minOrder: 8, showroomCity: "Marrakech", deliveryZones: ["Marrakech-Safi", "Casablanca-Settat", "Rabat-Salé-Kénitra"], deliveryDelayHours: 96, deliveryCostDH: 700, photos: [pic("granit-noir")] },
      { name: "Zellige traditionnel de Fès 10x10", category: "CARRELAGE", unit: "M2", priceDH: 420, reference: "ZEL-FES-10", description: "Zellige émaillé fait main, cuisson au feu de bois. Couleurs au choix. Authentique savoir-faire de Fès.", quantityAvailable: 240, minOrder: 5, showroomCity: "Marrakech", deliveryZones: ["Marrakech-Safi", "Fès-Meknès", "Casablanca-Settat"], deliveryDelayHours: 120, deliveryCostDH: 450, photos: [pic("zellige")] },
      { name: "Marbre Carrare Blanc — import Italie", category: "REVETEMENT_SOL", unit: "M2", priceDH: 680, reference: "MRB-CAR-BLANC", description: "Marbre blanc de Carrare, veinage gris élégant. Salles de bain, halls prestige. Importation directe.", quantityAvailable: 180, minOrder: 6, showroomCity: "Marrakech", deliveryZones: ["Marrakech-Safi", "Casablanca-Settat"], deliveryDelayHours: 96, deliveryCostDH: 800, photos: [pic("carrare")] },
    ],
  },
  {
    email: "vitrine.beton@citurbarea.demo",
    displayName: "Béton & Agglos Casa",
    cabinetName: "Béton & Agglos Casa",
    ville: "Casablanca",
    bio: "Fournisseur de ciment, agglomérés, granulats et béton prêt à l'emploi. Livraison camion-toupie et benne sur le Grand Casablanca.",
    products: [
      { name: "Ciment CPJ 45 — sac 50 kg", category: "CIMENT_BETON", unit: "SAC", priceDH: 72, reference: "CIM-CPJ45", description: "Ciment Portland composé CPJ 45, sac de 50 kg. Usage courant : maçonnerie, enduits, dalles. Conforme NM 10.1.004.", quantityAvailable: 5000, minOrder: 20, showroomCity: "Casablanca", showroomAddress: "Zone industrielle Sidi Bernoussi", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 24, deliveryCostDH: 250, photos: [pic("ciment-45")] },
      { name: "Ciment CPJ 55 — sac 50 kg", category: "CIMENT_BETON", unit: "SAC", priceDH: 81, reference: "CIM-CPJ55", description: "Ciment haute résistance CPJ 55 pour béton armé, fondations, structures. Sac 50 kg.", quantityAvailable: 3200, minOrder: 20, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 24, deliveryCostDH: 250, photos: [pic("ciment-55")] },
      { name: "Aggloméré creux 20x20x40", category: "AGGLOMERES", unit: "UNITE", priceDH: 4.5, reference: "AGG-20", description: "Bloc béton creux 20x20x40 cm pour murs porteurs et cloisons. Vibré, séchage contrôlé.", quantityAvailable: 40000, minOrder: 100, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat", "Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 400, photos: [pic("agglo-20")] },
      { name: "Aggloméré 15x20x40 — cloison", category: "AGGLOMERES", unit: "UNITE", priceDH: 3.8, reference: "AGG-15", description: "Bloc béton 15x20x40 cm pour cloisons de distribution. Léger, facile à poser.", quantityAvailable: 30000, minOrder: 100, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 400, photos: [pic("agglo-15")] },
      { name: "Sable de concassage 0/4 — m³", category: "CIMENT_BETON", unit: "M3", priceDH: 105, reference: "SAB-04", description: "Sable de concassage lavé granulométrie 0/4 mm. Mortiers, chapes, enduits.", quantityAvailable: 900, minOrder: 3, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 24, deliveryCostDH: 300, photos: [pic("sable")] },
      { name: "Gravier 15/25 — m³", category: "CIMENT_BETON", unit: "M3", priceDH: 132, reference: "GRV-1525", description: "Gravier concassé 15/25 mm pour béton de structure et drainage.", quantityAvailable: 700, minOrder: 3, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 24, deliveryCostDH: 300, photos: [pic("gravier")] },
    ],
  },
  {
    email: "vitrine.acier@citurbarea.demo",
    displayName: "Acier Atlas Distribution",
    cabinetName: "Acier Atlas Distribution SA",
    ville: "Casablanca",
    bio: "Rond à béton, treillis soudés, profilés et accessoires acier. Stock permanent, façonnage sur plan.",
    products: [
      { name: "Fer à béton HA Fe E500 — Ø8 (barre 12 m)", category: "ACIER", unit: "UNITE", priceDH: 62, reference: "FER-HA8", description: "Rond à béton haute adhérence Fe E500, diamètre 8 mm, barre de 12 m. Conforme NM 01.4.096.", quantityAvailable: 4000, minOrder: 50, showroomCity: "Casablanca", showroomAddress: "Route de Rabat, km 12", deliveryZones: ["Casablanca-Settat", "Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 500, photos: [pic("fer-8")] },
      { name: "Fer à béton HA Fe E500 — Ø10 (barre 12 m)", category: "ACIER", unit: "UNITE", priceDH: 96, reference: "FER-HA10", description: "Rond à béton HA Fe E500 Ø10 mm, barre 12 m. Poteaux, chaînages, poutres.", quantityAvailable: 3500, minOrder: 50, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 500, photos: [pic("fer-10")] },
      { name: "Fer à béton HA Fe E500 — Ø12 (barre 12 m)", category: "ACIER", unit: "UNITE", priceDH: 138, reference: "FER-HA12", description: "Rond à béton HA Fe E500 Ø12 mm, barre 12 m. Éléments porteurs.", quantityAvailable: 2800, minOrder: 30, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 500, photos: [pic("fer-12")] },
      { name: "Treillis soudé ST25 — panneau 6x2,4 m", category: "ACIER", unit: "UNITE", priceDH: 178, reference: "TRS-ST25", description: "Panneau de treillis soudé ST25, maille 150x150 mm. Dallages, planchers.", quantityAvailable: 1200, minOrder: 10, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 500, photos: [pic("treillis")] },
      { name: "Fil d'attache recuit — kg", category: "QUINCAILLERIE", unit: "KG", priceDH: 16, reference: "FIL-REC", description: "Fil de fer recuit Ø1,4 mm pour ligature d'armatures.", quantityAvailable: 800, minOrder: 5, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("fil-recuit")] },
    ],
  },
  {
    email: "vitrine.etancheite@citurbarea.demo",
    displayName: "Étanchéité & Isolation Maroc",
    cabinetName: "Étanchéité & Isolation Maroc SARL",
    ville: "Casablanca",
    bio: "Membranes d'étanchéité, isolants thermiques et acoustiques. Conseil technique et application par équipes agréées.",
    products: [
      { name: "Membrane bitumineuse 4 mm — rouleau 10 m²", category: "ETANCHEITE", unit: "UNITE", priceDH: 385, reference: "MEM-BIT4", description: "Membrane d'étanchéité bitume élastomère SBS 4 mm, armature polyester. Toitures-terrasses. Rouleau 1x10 m.", quantityAvailable: 600, minOrder: 5, showroomCity: "Casablanca", showroomAddress: "Zone Lissasfa, lot 88", deliveryZones: ["Casablanca-Settat", "Rabat-Salé-Kénitra", "Marrakech-Safi"], deliveryDelayHours: 48, deliveryCostDH: 300, photos: [pic("membrane")] },
      { name: "Membrane auto-protégée ardoisée", category: "ETANCHEITE", unit: "UNITE", priceDH: 470, reference: "MEM-ARD", description: "Membrane bitumineuse finition ardoisée grise, résistante UV. Couche de finition terrasses accessibles.", quantityAvailable: 400, minOrder: 5, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 300, photos: [pic("membrane-ard")] },
      { name: "Polystyrène expansé 4 cm — m²", category: "ISOLATION", unit: "M2", priceDH: 28, reference: "PSE-40", description: "Panneau polystyrène expansé 40 mm, isolation thermique sols et toitures. Léger, découpe facile.", quantityAvailable: 2000, minOrder: 20, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 250, photos: [pic("polystyrene")] },
      { name: "Laine de verre 100 mm — m²", category: "ISOLATION", unit: "M2", priceDH: 55, reference: "LDV-100", description: "Rouleau laine de verre 100 mm, isolation combles et cloisons. Performances thermiques et acoustiques.", quantityAvailable: 1500, minOrder: 20, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 250, photos: [pic("laine-verre")] },
      { name: "Enduit d'imperméabilisation — sac 25 kg", category: "ETANCHEITE", unit: "SAC", priceDH: 95, reference: "ENU-IMP", description: "Mortier hydrofuge pour imperméabilisation murs enterrés et soubassements.", quantityAvailable: 900, minOrder: 10, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 250, photos: [pic("enduit-imp")] },
    ],
  },
  {
    email: "vitrine.plomberie@citurbarea.demo",
    displayName: "Sanitaire & Plomberie Express",
    cabinetName: "Sanitaire & Plomberie Express",
    ville: "Rabat",
    bio: "Tout pour la plomberie et le sanitaire : tubes, raccords, robinetterie, céramique, chauffe-eau. Showroom sanitaire à Rabat.",
    products: [
      { name: "Tube PVC évacuation Ø100 — barre 4 m", category: "PLOMBERIE", unit: "UNITE", priceDH: 86, reference: "PVC-100", description: "Tube PVC évacuation Ø100 mm, barre 4 m. Eaux usées et pluviales. Norme NM.", quantityAvailable: 1500, minOrder: 10, showroomCity: "Rabat", showroomAddress: "Avenue Hassan II, Rabat", deliveryZones: ["Rabat-Salé-Kénitra", "Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 200, photos: [pic("pvc-100")] },
      { name: "Tube PER Ø16 — couronne 100 m", category: "PLOMBERIE", unit: "UNITE", priceDH: 485, reference: "PER-16", description: "Tube PER (polyéthylène réticulé) Ø16 mm, couronne 100 m. Alimentation eau chaude/froide.", quantityAvailable: 400, minOrder: 2, showroomCity: "Rabat", deliveryZones: ["Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 200, photos: [pic("per-16")] },
      { name: "Pack WC complet — céramique blanc", category: "PLOMBERIE", unit: "UNITE", priceDH: 760, reference: "WC-COMP", description: "WC à poser complet : cuvette céramique, réservoir, mécanisme, abattant. Blanc.", quantityAvailable: 220, minOrder: 1, showroomCity: "Rabat", deliveryZones: ["Rabat-Salé-Kénitra", "Casablanca-Settat"], deliveryDelayHours: 72, deliveryCostDH: 150, photos: [pic("wc")] },
      { name: "Lavabo céramique sur colonne", category: "PLOMBERIE", unit: "UNITE", priceDH: 420, reference: "LAV-COL", description: "Lavabo céramique blanc 60 cm avec colonne. Trop-plein intégré.", quantityAvailable: 180, minOrder: 1, showroomCity: "Rabat", deliveryZones: ["Rabat-Salé-Kénitra"], deliveryDelayHours: 72, deliveryCostDH: 150, photos: [pic("lavabo")] },
      { name: "Chauffe-eau électrique 100 L", category: "CHAUFFAGE_CLIM", unit: "UNITE", priceDH: 1450, reference: "CE-100", description: "Chauffe-eau électrique 100 litres, résistance stéatite, cuve émaillée. Garantie 3 ans.", quantityAvailable: 90, minOrder: 1, showroomCity: "Rabat", deliveryZones: ["Rabat-Salé-Kénitra", "Casablanca-Settat"], deliveryDelayHours: 72, deliveryCostDH: 200, photos: [pic("chauffe-eau")] },
      { name: "Mitigeur lavabo chromé", category: "PLOMBERIE", unit: "UNITE", priceDH: 280, reference: "MIT-LAV", description: "Mitigeur monocommande lavabo, finition chromée, cartouche céramique.", quantityAvailable: 350, minOrder: 1, showroomCity: "Rabat", deliveryZones: ["Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 100, photos: [pic("mitigeur")] },
    ],
  },
  {
    email: "vitrine.elec@citurbarea.demo",
    displayName: "Élec Distribution Pro",
    cabinetName: "Élec Distribution Pro SARL",
    ville: "Casablanca",
    bio: "Matériel électrique basse tension : câbles, appareillage, tableaux, protection. Marques certifiées, conseil technique.",
    products: [
      { name: "Câble U1000 R2V 3G2,5 — couronne 100 m", category: "ELECTRICITE", unit: "UNITE", priceDH: 620, reference: "CAB-R2V-25", description: "Câble rigide U1000 R2V 3 conducteurs 2,5 mm². Circuits prises. Couronne 100 m.", quantityAvailable: 300, minOrder: 2, showroomCity: "Casablanca", showroomAddress: "Derb Omar, Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("cable-r2v")] },
      { name: "Câble VGV 2x1,5 — couronne 100 m", category: "ELECTRICITE", unit: "UNITE", priceDH: 310, reference: "CAB-VGV-15", description: "Câble souple 2x1,5 mm² pour circuits éclairage. Couronne 100 m.", quantityAvailable: 280, minOrder: 2, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("cable-vgv")] },
      { name: "Disjoncteur 16 A — courbe C", category: "ELECTRICITE", unit: "UNITE", priceDH: 45, reference: "DJ-16C", description: "Disjoncteur modulaire 16 A courbe C, 1P+N. Protection circuits prises.", quantityAvailable: 600, minOrder: 5, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 24, deliveryCostDH: 80, photos: [pic("disjoncteur")] },
      { name: "Tableau électrique 12 modules", category: "ELECTRICITE", unit: "UNITE", priceDH: 190, reference: "TAB-12", description: "Coffret électrique 1 rangée 12 modules, porte transparente. IP40.", quantityAvailable: 150, minOrder: 1, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 80, photos: [pic("tableau-elec")] },
      { name: "Lot prise + interrupteur (10 u.)", category: "ELECTRICITE", unit: "UNITE", priceDH: 240, reference: "LOT-APP", description: "Lot de 10 appareillages encastrés : prises 2P+T et interrupteurs. Blanc.", quantityAvailable: 200, minOrder: 1, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 80, photos: [pic("prise-inter")] },
    ],
  },
  {
    email: "vitrine.menuiserie@citurbarea.demo",
    displayName: "Menuiserie Alu & Bois Souss",
    cabinetName: "Menuiserie Alu & Bois Souss",
    ville: "Agadir",
    bio: "Fabrication menuiserie aluminium et bois sur mesure : fenêtres, portes, vérandas. Atelier à Agadir, pose dans le Souss.",
    products: [
      { name: "Profilé alu coulissant — ml", category: "MENUISERIE_ALU", unit: "ML", priceDH: 95, reference: "ALU-COUL", description: "Profilé aluminium gamme coulissante, laqué blanc ou gris anthracite. Vendu au mètre linéaire.", quantityAvailable: 2000, minOrder: 6, showroomCity: "Agadir", showroomAddress: "Zone industrielle Tassila, Agadir", deliveryZones: ["Souss-Massa", "Marrakech-Safi"], deliveryDelayHours: 96, deliveryCostDH: 350, photos: [pic("profil-alu")] },
      { name: "Fenêtre alu 2 vantaux — 1,2 x 1,2 m", category: "MENUISERIE_ALU", unit: "UNITE", priceDH: 1600, reference: "FEN-ALU2", description: "Fenêtre aluminium 2 vantaux ouvrants, double vitrage 4/16/4. Dimensions standard 120x120 cm.", quantityAvailable: 80, minOrder: 1, showroomCity: "Agadir", deliveryZones: ["Souss-Massa"], deliveryDelayHours: 168, deliveryCostDH: 300, photos: [pic("fenetre-alu")] },
      { name: "Porte d'entrée aluminium", category: "MENUISERIE_ALU", unit: "UNITE", priceDH: 3800, reference: "PRT-ALU", description: "Porte d'entrée aluminium isolante, panneau design, serrure 3 points. Sur mesure.", quantityAvailable: 40, minOrder: 1, showroomCity: "Agadir", deliveryZones: ["Souss-Massa", "Marrakech-Safi"], deliveryDelayHours: 240, deliveryCostDH: 400, photos: [pic("porte-alu")] },
      { name: "Bois rouge de coffrage — m²", category: "MENUISERIE_BOIS", unit: "M2", priceDH: 78, reference: "BOIS-COF", description: "Planches bois rouge pour coffrage béton, épaisseur 27 mm. Réutilisable plusieurs fois.", quantityAvailable: 1200, minOrder: 10, showroomCity: "Agadir", deliveryZones: ["Souss-Massa"], deliveryDelayHours: 72, deliveryCostDH: 300, photos: [pic("bois-coffrage")] },
      { name: "Contreplaqué 18 mm — panneau 1,22x2,44 m", category: "MENUISERIE_BOIS", unit: "UNITE", priceDH: 340, reference: "CTP-18", description: "Panneau contreplaqué okoumé 18 mm. Coffrage soigné, agencement, mobilier.", quantityAvailable: 500, minOrder: 5, showroomCity: "Agadir", deliveryZones: ["Souss-Massa"], deliveryDelayHours: 72, deliveryCostDH: 300, photos: [pic("contreplaque")] },
    ],
  },
  {
    email: "vitrine.peinture@citurbarea.demo",
    displayName: "Peintures & Finitions du Maroc",
    cabinetName: "Peintures & Finitions du Maroc",
    ville: "Casablanca",
    bio: "Peintures intérieures et façades, enduits décoratifs, carrelage et quincaillerie de finition. Conseil colorimétrie.",
    products: [
      { name: "Peinture acrylique mate — pot 25 kg", category: "PEINTURE", unit: "UNITE", priceDH: 420, reference: "PEI-ACR25", description: "Peinture acrylique mate intérieure, grande couvrance, lessivable. Pot 25 kg, ~150 m²/couche.", quantityAvailable: 400, minOrder: 1, showroomCity: "Casablanca", showroomAddress: "Boulevard Moulay Ismail, Casablanca", deliveryZones: ["Casablanca-Settat", "Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("peinture-int")] },
      { name: "Peinture façade — pot 25 kg", category: "PEINTURE", unit: "UNITE", priceDH: 520, reference: "PEI-FAC25", description: "Peinture façade acrylique, résistante UV et intempéries, hydrofuge. Pot 25 kg.", quantityAvailable: 300, minOrder: 1, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("peinture-fac")] },
      { name: "Enduit de lissage — sac 25 kg", category: "PEINTURE", unit: "SAC", priceDH: 95, reference: "ENU-LIS", description: "Enduit de lissage en poudre pour murs et plafonds. Finition prête à peindre.", quantityAvailable: 800, minOrder: 5, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 150, photos: [pic("enduit-lis")] },
      { name: "Carrelage grès cérame 60x60 — m²", category: "CARRELAGE", unit: "M2", priceDH: 88, reference: "CAR-GC60", description: "Carrelage grès cérame rectifié 60x60 cm, finition mate. Sols intérieurs, fort passage.", quantityAvailable: 2500, minOrder: 10, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat", "Rabat-Salé-Kénitra"], deliveryDelayHours: 48, deliveryCostDH: 250, photos: [pic("carrelage-gc")] },
      { name: "Lot quincaillerie : vis + chevilles", category: "QUINCAILLERIE", unit: "UNITE", priceDH: 130, reference: "QNC-LOT", description: "Coffret assortiment vis et chevilles tous diamètres. ~600 pièces.", quantityAvailable: 250, minOrder: 1, showroomCity: "Casablanca", deliveryZones: ["Casablanca-Settat"], deliveryDelayHours: 48, deliveryCostDH: 80, photos: [pic("quincaillerie")] },
    ],
  },
];

async function main() {
  console.log("🏪 Seed Marketplace — vitrines fournisseurs test");
  console.log("══════════════════════════════════════════════════════════");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let totalProducts = 0;

  for (const s of SUPPLIERS) {
    // 1. User
    const username = s.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24);
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { isActive: true },
      create: { email: s.email, username, passwordHash, role: "CLIENT", plan: "PRO", isActive: true, emailVerifiedAt: new Date() },
    });

    // 2. ProProfile (métier fournisseur)
    await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: { displayName: s.displayName, cabinetName: s.cabinetName, villePrincipale: s.ville, bio: s.bio, metier: "FOURNISSEUR_MATERIAUX" as any, isVerified: true },
      create: { userId: user.id, displayName: s.displayName, cabinetName: s.cabinetName, villePrincipale: s.ville, bio: s.bio, metier: "FOURNISSEUR_MATERIAUX" as any, isVerified: true },
    });

    // 3. Produits — purge + recréation (idempotent)
    await prisma.supplierProduct.deleteMany({ where: { supplierId: user.id } });
    for (const p of s.products) {
      await prisma.supplierProduct.create({
        data: {
          supplierId: user.id,
          name: p.name, category: p.category, reference: p.reference || null, description: p.description,
          photos: p.photos, priceDH: p.priceDH, unit: p.unit,
          quantityAvailable: p.quantityAvailable ?? null, minOrder: p.minOrder ?? null,
          showroomAddress: p.showroomAddress || null, showroomCity: p.showroomCity || null,
          deliveryZones: p.deliveryZones || [], deliveryDelayHours: p.deliveryDelayHours ?? null,
          deliveryCostDH: p.deliveryCostDH ?? null, deliveryIncluded: p.deliveryIncluded ?? false,
          active: true,
        },
      });
      totalProducts++;
    }
    console.log(`  ✓ ${s.displayName} (${s.ville}) — ${s.products.length} produits`);
  }

  console.log("══════════════════════════════════════════════════════════");
  console.log(`✅ ${SUPPLIERS.length} vitrines · ${totalProducts} produits`);
  console.log(`   Connexion fournisseurs : <email> / ${PASSWORD}`);
  console.log("   Visible sur /cercles/marketplace");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
