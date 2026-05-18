/* eslint-disable */
/**
 * seed-referentiel.ts — Catalogue maître Marketplace BTP.
 *
 * Pré-charge le référentiel des matériaux : 12 corps de métier,
 * leurs familles, ~210 types de produits avec prix indicatifs
 * marché Maroc 2026. Idempotent (upsert par slug).
 *
 * Usage prod : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-referentiel.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// [nom, unité, prixMin, prixMax]
type Item = [string, string, number, number];
const R: Record<string, Record<string, Item[]>> = {
  GROS_OEUVRE: {
    "Liants": [
      ["Ciment CPJ 35 — sac 50 kg", "SAC", 62, 74],
      ["Ciment CPJ 45 — sac 50 kg", "SAC", 70, 84],
      ["Ciment CPJ 55 — sac 50 kg", "SAC", 78, 94],
      ["Ciment blanc — sac 50 kg", "SAC", 110, 145],
      ["Chaux hydraulique NHL — sac", "SAC", 75, 98],
      ["Plâtre de construction — sac", "SAC", 42, 62],
    ],
    "Granulats": [
      ["Sable de concassage 0/4", "M3", 90, 135],
      ["Sable de mer lavé", "M3", 80, 120],
      ["Gravier 5/15", "M3", 110, 155],
      ["Gravier 15/25", "M3", 120, 165],
      ["Tout-venant 0/31,5", "M3", 70, 105],
      ["Gravette 3/8", "M3", 130, 175],
    ],
    "Béton & mortier": [
      ["Béton prêt à l'emploi B25", "M3", 950, 1180],
      ["Béton prêt à l'emploi B30", "M3", 1050, 1280],
      ["Mortier prêt à l'emploi — sac", "SAC", 48, 72],
    ],
    "Maçonnerie": [
      ["Aggloméré creux 20x20x40", "UNITE", 3.8, 5.5],
      ["Aggloméré creux 15x20x40", "UNITE", 3.2, 4.6],
      ["Aggloméré creux 10x20x40", "UNITE", 2.6, 3.9],
      ["Aggloméré plein 20", "UNITE", 5, 7.2],
      ["Brique rouge 6 trous", "UNITE", 1.4, 2.3],
      ["Brique rouge 8 trous", "UNITE", 1.8, 2.9],
      ["Brique rouge 12 trous", "UNITE", 2.4, 3.7],
      ["Hourdis béton 12", "UNITE", 4.5, 6.6],
      ["Hourdis béton 16", "UNITE", 5.5, 7.8],
      ["Hourdis béton 20", "UNITE", 7, 9.8],
    ],
    "Aciers": [
      ["Fer à béton HA Fe E500 — Ø6 (barre 12 m)", "BARRE", 38, 54],
      ["Fer à béton HA Fe E500 — Ø8 (barre 12 m)", "BARRE", 55, 74],
      ["Fer à béton HA Fe E500 — Ø10 (barre 12 m)", "BARRE", 88, 114],
      ["Fer à béton HA Fe E500 — Ø12 (barre 12 m)", "BARRE", 125, 158],
      ["Fer à béton HA Fe E500 — Ø14 (barre 12 m)", "BARRE", 175, 215],
      ["Fer à béton HA Fe E500 — Ø16 (barre 12 m)", "BARRE", 230, 285],
      ["Treillis soudé ST10 — panneau", "UNITE", 110, 148],
      ["Treillis soudé ST25 — panneau", "UNITE", 160, 205],
      ["Treillis soudé ST50 — panneau", "UNITE", 280, 350],
      ["Fil d'attache recuit", "KG", 13, 20],
    ],
    "Coffrage": [
      ["Bois de coffrage rouge", "M2", 65, 92],
      ["Contreplaqué de coffrage 18 mm — panneau", "UNITE", 300, 390],
      ["Étai métallique réglable", "UNITE", 95, 150],
      ["Huile de décoffrage — bidon", "UNITE", 55, 90],
    ],
  },
  PLOMBERIE: {
    "Tubes & raccords": [
      ["Tube PVC évacuation Ø40 — barre 4 m", "BARRE", 18, 30],
      ["Tube PVC évacuation Ø100 — barre 4 m", "BARRE", 70, 98],
      ["Tube PVC évacuation Ø125 — barre 4 m", "BARRE", 95, 135],
      ["Tube PER Ø12 — couronne 100 m", "UNITE", 280, 370],
      ["Tube PER Ø16 — couronne 100 m", "UNITE", 420, 530],
      ["Tube PER Ø20 — couronne 100 m", "UNITE", 580, 720],
      ["Tube cuivre Ø14", "ML", 28, 44],
      ["Tube PPR Ø25 — barre 4 m", "BARRE", 22, 36],
      ["Tube multicouche Ø16 — couronne", "UNITE", 480, 620],
      ["Coude PVC Ø100", "UNITE", 8, 15],
      ["Té PVC Ø100", "UNITE", 12, 21],
    ],
    "Robinetterie": [
      ["Mitigeur lavabo chromé", "UNITE", 180, 430],
      ["Mitigeur de douche", "UNITE", 220, 560],
      ["Mitigeur évier cuisine", "UNITE", 250, 620],
      ["Robinet d'arrêt", "UNITE", 35, 78],
    ],
    "Sanitaire": [
      ["Pack WC complet à poser", "UNITE", 600, 1150],
      ["WC suspendu + bâti support", "UNITE", 1400, 2500],
      ["Lavabo céramique sur colonne", "UNITE", 350, 680],
      ["Vasque à poser", "UNITE", 400, 950],
      ["Receveur de douche", "UNITE", 450, 1150],
      ["Baignoire acrylique", "UNITE", 900, 2300],
      ["Évier inox 1 bac", "UNITE", 380, 780],
      ["Évier inox 2 bacs", "UNITE", 550, 1150],
    ],
    "Évacuation": [
      ["Siphon de sol inox", "UNITE", 35, 90],
      ["Regard de visite PVC", "UNITE", 120, 270],
      ["Bonde de douche", "UNITE", 45, 115],
    ],
  },
  ELECTRICITE: {
    "Câbles": [
      ["Câble U1000 R2V 3G1,5 — couronne 100 m", "UNITE", 380, 490],
      ["Câble U1000 R2V 3G2,5 — couronne 100 m", "UNITE", 560, 710],
      ["Câble U1000 R2V 3G6 — couronne 100 m", "UNITE", 1100, 1450],
      ["Câble VGV 2x1,5 — couronne 100 m", "UNITE", 260, 350],
      ["Fil H07V-U 2,5 mm² — couronne 100 m", "UNITE", 180, 250],
    ],
    "Appareillage": [
      ["Prise de courant 2P+T encastrée", "UNITE", 18, 40],
      ["Interrupteur simple", "UNITE", 15, 34],
      ["Va-et-vient", "UNITE", 18, 38],
      ["Prise RJ45", "UNITE", 28, 58],
    ],
    "Protection": [
      ["Disjoncteur 10 A", "UNITE", 32, 56],
      ["Disjoncteur 16 A", "UNITE", 35, 62],
      ["Disjoncteur 20 A", "UNITE", 42, 72],
      ["Disjoncteur 32 A", "UNITE", 55, 98],
      ["Interrupteur différentiel 30 mA", "UNITE", 110, 195],
      ["Parafoudre", "UNITE", 280, 490],
    ],
    "Tableaux & gaines": [
      ["Coffret électrique 12 modules", "UNITE", 150, 265],
      ["Coffret électrique 24 modules", "UNITE", 280, 450],
      ["Gaine ICTA Ø20 — rouleau", "ROULEAU", 75, 125],
      ["Goulotte 40x40", "ML", 14, 27],
    ],
    "Éclairage": [
      ["Spot LED encastré", "UNITE", 25, 68],
      ["Réglette LED 1,2 m", "UNITE", 75, 165],
      ["Projecteur LED 50 W", "UNITE", 95, 230],
    ],
  },
  ETANCHEITE: {
    "Membranes": [
      ["Membrane bitumineuse 3 mm — rouleau 10 m²", "ROULEAU", 280, 370],
      ["Membrane bitumineuse 4 mm — rouleau 10 m²", "ROULEAU", 340, 450],
      ["Membrane auto-protégée ardoisée — rouleau", "ROULEAU", 420, 550],
      ["Membrane EPDM", "M2", 75, 135],
    ],
    "Primaires & enduits": [
      ["Primaire d'accrochage bitume — bidon", "UNITE", 180, 290],
      ["Enduit hydrofuge de cuvelage — sac", "SAC", 80, 135],
      ["Système d'étanchéité liquide (SEL)", "UNITE", 350, 680],
    ],
    "Accessoires": [
      ["Bande d'arase", "ML", 8, 17],
      ["Mastic d'étanchéité", "UNITE", 35, 78],
      ["Gaine de relevé d'étanchéité", "ML", 22, 42],
    ],
  },
  ISOLATION: {
    "Thermique": [
      ["Polystyrène expansé PSE 40 mm", "M2", 22, 35],
      ["Polystyrène extrudé XPS 40 mm", "M2", 38, 60],
      ["Laine de verre 100 mm", "M2", 42, 68],
      ["Laine de roche 100 mm", "M2", 55, 88],
      ["Mousse polyuréthane projetée", "M2", 90, 155],
    ],
    "Acoustique": [
      ["Panneau acoustique 50 mm", "M2", 60, 115],
      ["Sous-couche acoustique sol", "M2", 28, 50],
    ],
    "Accessoires": [
      ["Pare-vapeur", "M2", 6, 13],
      ["Adhésif d'étanchéité à l'air", "UNITE", 45, 88],
    ],
  },
  MENUISERIE: {
    "Aluminium": [
      ["Profilé aluminium coulissant", "ML", 80, 135],
      ["Fenêtre aluminium 2 vantaux", "UNITE", 1300, 2300],
      ["Porte-fenêtre aluminium", "UNITE", 2200, 3900],
      ["Porte d'entrée aluminium", "UNITE", 3200, 6800],
      ["Châssis fixe aluminium", "M2", 600, 1150],
    ],
    "Bois": [
      ["Bloc-porte intérieur bois", "UNITE", 550, 1350],
      ["Porte isoplane", "UNITE", 320, 680],
      ["Plinthe bois", "ML", 14, 34],
      ["Lambris bois", "M2", 95, 185],
    ],
    "PVC": [
      ["Fenêtre PVC 2 vantaux", "UNITE", 900, 1750],
      ["Volet roulant PVC", "UNITE", 700, 1550],
    ],
  },
  REVETEMENT: {
    "Carrelage": [
      ["Carrelage grès cérame 30x30", "M2", 45, 98],
      ["Carrelage grès cérame 60x60", "M2", 75, 185],
      ["Carrelage grès cérame 60x120", "M2", 140, 330],
      ["Faïence murale 25x40", "M2", 55, 125],
      ["Plinthe de carrelage", "ML", 12, 30],
    ],
    "Parquet": [
      ["Parquet stratifié", "M2", 65, 165],
      ["Parquet contrecollé", "M2", 180, 430],
      ["Parquet massif", "M2", 320, 760],
    ],
    "Sols souples": [
      ["Revêtement PVC en lés", "M2", 55, 135],
      ["Dalle PVC clipsable", "M2", 90, 225],
      ["Moquette", "M2", 60, 155],
    ],
    "Accessoires de pose": [
      ["Colle à carrelage — sac 25 kg", "SAC", 48, 98],
      ["Joint de carrelage — sac", "SAC", 35, 78],
      ["Croisillons (sachet)", "UNITE", 15, 36],
    ],
  },
  MARBRERIE: {
    "Marbre": [
      ["Marbre Sahara beige — dalle", "M2", 260, 430],
      ["Marbre beige de Tafraout — dalle", "M2", 240, 390],
      ["Marbre blanc de Carrare — dalle", "M2", 550, 880],
      ["Marbre noir — dalle", "M2", 380, 640],
    ],
    "Granit": [
      ["Granit gris — dalle", "M2", 350, 560],
      ["Granit noir Zimbabwe — dalle", "M2", 480, 740],
    ],
    "Pierre": [
      ["Travertin", "M2", 220, 370],
      ["Pierre de taille", "M2", 180, 350],
      ["Zellige traditionnel de Fès", "M2", 320, 560],
      ["Béjmat (terre cuite émaillée)", "M2", 150, 290],
    ],
    "Plans & escaliers": [
      ["Plan de travail en marbre", "ML", 450, 920],
      ["Marche d'escalier en marbre", "ML", 280, 540],
    ],
  },
  PEINTURE: {
    "Peintures": [
      ["Peinture acrylique mate — pot 25 kg", "UNITE", 350, 560],
      ["Peinture acrylique satinée — pot 25 kg", "UNITE", 420, 660],
      ["Peinture façade — pot 25 kg", "UNITE", 450, 730],
      ["Peinture anti-rouille", "UNITE", 90, 185],
      ["Vernis bois", "UNITE", 110, 225],
    ],
    "Enduits & sous-couches": [
      ["Enduit de lissage — sac 25 kg", "SAC", 72, 122],
      ["Enduit décoratif tadelakt — sac", "SAC", 180, 350],
      ["Sous-couche universelle", "UNITE", 150, 285],
      ["Mastic de rebouchage", "UNITE", 35, 78],
    ],
    "Outillage peinture": [
      ["Rouleau + manchon", "UNITE", 25, 68],
      ["Pinceau", "UNITE", 12, 46],
      ["Bâche de protection", "UNITE", 18, 42],
      ["Ruban de masquage", "UNITE", 10, 26],
    ],
  },
  CHAUFFAGE_CLIM: {
    "Eau chaude sanitaire": [
      ["Chauffe-eau électrique 50 L", "UNITE", 900, 1350],
      ["Chauffe-eau électrique 100 L", "UNITE", 1300, 1850],
      ["Chauffe-eau électrique 200 L", "UNITE", 2200, 3300],
      ["Chauffe-eau solaire 200 L", "UNITE", 4500, 7800],
      ["Chauffe-bain à gaz", "UNITE", 800, 1650],
    ],
    "Climatisation": [
      ["Climatiseur split 9000 BTU", "UNITE", 2800, 4300],
      ["Climatiseur split 12000 BTU", "UNITE", 3500, 5600],
      ["Climatiseur gainable", "UNITE", 9000, 16500],
    ],
    "Chauffage": [
      ["Radiateur électrique", "UNITE", 450, 1150],
      ["Plancher chauffant — kit", "M2", 120, 250],
      ["Chaudière murale gaz", "UNITE", 6500, 12500],
    ],
  },
  VRD: {
    "Pavés & bordures": [
      ["Pavé autobloquant", "M2", 55, 115],
      ["Bordure de trottoir T2", "ML", 35, 68],
      ["Caniveau béton", "ML", 60, 125],
      ["Dalle gazon", "M2", 70, 135],
    ],
    "Assainissement": [
      ["Tube PVC assainissement Ø200 — barre", "BARRE", 180, 290],
      ["Tube PVC assainissement Ø315 — barre", "BARRE", 380, 580],
      ["Regard de visite béton", "UNITE", 350, 780],
      ["Tampon fonte voirie", "UNITE", 280, 680],
    ],
    "Clôture & extérieur": [
      ["Grillage simple torsion", "ML", 28, 58],
      ["Gabion (cage métallique)", "UNITE", 180, 400],
      ["Géotextile", "M2", 8, 19],
      ["Enrobé à froid — sac", "SAC", 90, 155],
    ],
  },
  QUINCAILLERIE: {
    "Visserie & fixation": [
      ["Vis à bois — boîte", "UNITE", 35, 95],
      ["Vis autoperceuse — boîte", "UNITE", 45, 115],
      ["Chevilles à frapper — boîte", "UNITE", 30, 78],
      ["Boulonnerie assortie — coffret", "UNITE", 60, 145],
      ["Clous", "KG", 14, 28],
      ["Cheville chimique", "UNITE", 65, 145],
    ],
    "Serrurerie": [
      ["Serrure à encastrer", "UNITE", 90, 290],
      ["Cylindre de sécurité", "UNITE", 75, 270],
      ["Paumelle / charnière", "UNITE", 12, 48],
      ["Verrou de sûreté", "UNITE", 55, 170],
      ["Poignée de porte", "UNITE", 45, 230],
    ],
    "Outillage": [
      ["Disque à tronçonner", "UNITE", 12, 38],
      ["Foret béton — jeu", "UNITE", 45, 125],
      ["Niveau à bulle", "UNITE", 35, 145],
      ["Mètre ruban", "UNITE", 20, 68],
      ["Brouette de chantier", "UNITE", 280, 560],
      ["Truelle", "UNITE", 25, 72],
      ["Bétonnière 160 L", "UNITE", 3500, 6800],
    ],
  },
};

const LABELS: Record<string, string> = {
  GROS_OEUVRE: "Gros œuvre", PLOMBERIE: "Plomberie & sanitaire", ELECTRICITE: "Électricité",
  ETANCHEITE: "Étanchéité", ISOLATION: "Isolation", MENUISERIE: "Menuiserie",
  REVETEMENT: "Revêtements & carrelage", MARBRERIE: "Marbrerie & pierre", PEINTURE: "Peinture & enduits",
  CHAUFFAGE_CLIM: "Chauffage & climatisation", VRD: "VRD & extérieurs", QUINCAILLERIE: "Quincaillerie & outillage",
};

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function main() {
  console.log("📚 Seed Référentiel Marketplace BTP");
  console.log("══════════════════════════════════════════════════════════");
  let count = 0;
  const seen = new Set<string>();

  for (const [corps, familles] of Object.entries(R)) {
    let corpsCount = 0;
    for (const [famille, items] of Object.entries(familles)) {
      for (const [name, unit, lo, hi] of items) {
        let slug = slugify(name);
        let i = 2;
        while (seen.has(slug)) { slug = `${slugify(name)}-${i++}`; }
        seen.add(slug);

        const description = `${name}. Famille « ${famille} » — ${LABELS[corps]}. ` +
          `Matériau de construction standard. Fourchette de prix indicative marché Maroc ; ` +
          `le prix réel dépend du fournisseur et de la quantité.`;
        // photo : null par défaut — placeholder visuel par corps de métier côté front.
        // Les vraies photos viennent des fournisseurs (offres) ou d'une passe de curation.

        await prisma.marketProduct.upsert({
          where: { slug },
          update: { corpsMetier: corps, famille, name, description, unit, indicativePriceMin: lo, indicativePriceMax: hi, active: true },
          create: { slug, corpsMetier: corps, famille, name, description, unit, indicativePriceMin: lo, indicativePriceMax: hi, photo: null, active: true },
        });
        count++; corpsCount++;
      }
    }
    console.log(`  ✓ ${LABELS[corps].padEnd(30)} ${corpsCount} produits`);
  }

  console.log("══════════════════════════════════════════════════════════");
  console.log(`✅ Référentiel : ${count} matériaux sur 12 corps de métier`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
