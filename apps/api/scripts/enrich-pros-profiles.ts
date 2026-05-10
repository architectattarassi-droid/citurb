/* eslint-disable */
/**
 * enrich-pros-profiles.ts — Sprint G5
 *
 * Enrichit les 12 ProProfile de test (créés par seed-test-pros.ts) avec :
 *  - Cabinet (nom, taille, statut)
 *  - Années d'expérience
 *  - Formations (école, diplôme, année)
 *  - Certifications, prix, langues
 *  - Projets phares (portfolio réaliste)
 *  - Tarifs et disponibilité
 *  - Réseaux sociaux étendus
 *
 * Idempotent : si le ProProfile existe, on met juste à jour les nouveaux champs.
 *
 * Usage local : npx ts-node --transpile-only apps/api/scripts/enrich-pros-profiles.ts
 * Usage prod  : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/enrich-pros-profiles.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Enrichment = {
  email: string;
  cabinetName: string;
  cabinetSize: number;
  cabinetStatus: string;
  yearsExperience: number;
  formations: Array<{ ecole: string; diplome: string; annee: number; ville?: string }>;
  certifications: string[];
  prix: string[];
  langues: string[];
  experiencesPhares: Array<{
    titre: string;
    description: string;
    anneeLivraison: number;
    surface: string;
    lieu: string;
    role: string;
    imageUrls?: string[];
  }>;
  tarifsRange: string;
  disponibilite: "DISPONIBLE" | "OCCUPE" | "INDISPONIBLE";
  websiteUrl?: string;
  linkedinUrl?: string;
  behanceUrl?: string;
  instagramUrl?: string;
  cnoaNumero?: string;
};

const PROS: Enrichment[] = [
  {
    email: "amine.archi@test.ma",
    cabinetName: "Atelier Bensouda Architectes",
    cabinetSize: 8,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 14,
    cnoaNumero: "CNOA-12345",
    formations: [
      { ecole: "École Nationale d'Architecture (ENA)", diplome: "Diplôme d'État d'Architecte (DEA)", annee: 2010, ville: "Rabat" },
      { ecole: "Politecnico di Milano", diplome: "Master en Architecture Urbaine", annee: 2012, ville: "Milan" },
    ],
    certifications: ["Revit Certified Professional", "BIM Manager (Bureau Veritas)", "RT-Maroc Auditeur certifié"],
    prix: ["Prix CNOA Jeune Architecte 2018", "Mention Tamayouz 2021 (logement collectif)"],
    langues: ["FR", "AR", "EN", "IT"],
    experiencesPhares: [
      { titre: "Résidence Twin Towers Anfa", description: "48 logements collectifs haut standing R+8, coordination BIM intégrale Revit + Solibri. Suivi chantier 18 mois.", anneeLivraison: 2024, surface: "6 400 m²", lieu: "Casablanca-Anfa", role: "Architecte mandataire + DET" },
      { titre: "Centre médical Maâmora", description: "Polyclinique 60 lits avec bloc opératoire, conformité RT-Maroc et accessibilité PMR.", anneeLivraison: 2022, surface: "3 200 m²", lieu: "Kénitra", role: "Architecte chef de projet" },
      { titre: "Villa Dar Lalla", description: "Villa contemporaine 4 façades en terre crue stabilisée, intégration paysagère.", anneeLivraison: 2020, surface: "480 m²", lieu: "Bouskoura", role: "Concepteur + suivi" },
    ],
    tarifsRange: "4 à 6 % du coût des travaux selon mission",
    disponibilite: "DISPONIBLE",
    websiteUrl: "https://bensouda-archi.ma",
    linkedinUrl: "https://linkedin.com/in/aminebensouda",
    behanceUrl: "https://behance.net/aminebensouda",
    instagramUrl: "https://instagram.com/atelier_bensouda",
  },
  {
    email: "salma.urban@test.ma",
    cabinetName: "Cabinet Tazi & Partners",
    cabinetSize: 12,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 16,
    cnoaNumero: "CNOA-22118",
    formations: [
      { ecole: "École Nationale d'Architecture (ENA)", diplome: "DEA - Mention Urbanisme", annee: 2008, ville: "Rabat" },
      { ecole: "Institut Français d'Urbanisme", diplome: "DESS Urbanisme & Aménagement", annee: 2010, ville: "Paris" },
    ],
    certifications: ["AMUP - Membre certifié", "QGIS Expert", "Plan d'Aménagement Communal (PAC) - HCP"],
    prix: ["Prix de l'Urbanisme Durable 2019 (AMUP)"],
    langues: ["FR", "AR", "EN", "ES"],
    experiencesPhares: [
      { titre: "Plan d'Aménagement Casa-Sud", description: "Refonte PA de la commune Casa-Sud, 2 800 ha, étude d'impact + concertation citoyenne.", anneeLivraison: 2023, surface: "2 800 ha", lieu: "Casablanca-Sud", role: "Urbaniste mandataire" },
      { titre: "Lotissement Al Boustane", description: "Lotissement résidentiel 180 lots, VRD + équipements collectifs.", anneeLivraison: 2021, surface: "24 ha", lieu: "Skhirat", role: "Urbaniste + suivi technique" },
    ],
    tarifsRange: "Forfait selon étude · de 80k à 600k MAD",
    disponibilite: "OCCUPE",
    websiteUrl: "https://tazi-partners.ma",
    linkedinUrl: "https://linkedin.com/in/salmatazi",
  },
  {
    email: "youssef.bet@test.ma",
    cabinetName: "BET Idrissi Structures",
    cabinetSize: 6,
    cabinetStatus: "LIBERAL",
    yearsExperience: 17,
    formations: [
      { ecole: "École Hassania des Travaux Publics (EHTP)", diplome: "Ingénieur d'État - Génie Civil", annee: 2009, ville: "Casablanca" },
      { ecole: "École Centrale Paris", diplome: "Mastère spécialisé Structures", annee: 2011, ville: "Châtenay-Malabry" },
    ],
    certifications: ["Robot Structural Analysis (Certified)", "Tekla Structures Expert", "Eurocode 2 & 8 - Auditeur"],
    prix: ["Prix Ingénieur de l'Année 2020 (ONI Rabat)"],
    langues: ["FR", "AR", "EN"],
    experiencesPhares: [
      { titre: "Calcul parasismique Twin Towers Anfa", description: "Modèle 3D Robot + voiles de contreventement K=3, validation bureau de contrôle.", anneeLivraison: 2024, surface: "6 400 m²", lieu: "Casablanca-Anfa", role: "Ingénieur structure principal" },
      { titre: "Pont de Bouregreg (étude)", description: "Étude d'exécution charpente métallique 180m de portée, validation Eurocode.", anneeLivraison: 2023, surface: "180 m linéaire", lieu: "Rabat-Salé", role: "Ingénieur d'études" },
    ],
    tarifsRange: "Honoraires 0.5 à 1.2 % du coût gros œuvre",
    disponibilite: "DISPONIBLE",
    websiteUrl: "https://bet-idrissi.ma",
    linkedinUrl: "https://linkedin.com/in/youssefelidrissi",
  },
  {
    email: "rachid.fluides@test.ma",
    cabinetName: "Berrada Engineering",
    cabinetSize: 4,
    cabinetStatus: "LIBERAL",
    yearsExperience: 11,
    formations: [
      { ecole: "École Mohammadia d'Ingénieurs (EMI)", diplome: "Ingénieur Génie Mécanique - Option Énergétique", annee: 2014, ville: "Rabat" },
    ],
    certifications: ["AutoCAD MEP Pro", "RT-Maroc 2014 - Auditeur certifié", "Photovoltaïque IRESEN"],
    prix: [],
    langues: ["FR", "AR", "EN"],
    experiencesPhares: [
      { titre: "Centre médical Maâmora - lot fluides", description: "CVC + plomberie + élec + gaz médicaux, conformité ASHRAE et HQE.", anneeLivraison: 2022, surface: "3 200 m²", lieu: "Kénitra", role: "BET fluides mandataire" },
      { titre: "Photovoltaïque Lycée Mohammedia", description: "Installation 250 kWc autoconsommation + raccordement basse tension ONEE.", anneeLivraison: 2023, surface: "1 800 m² toiture", lieu: "Mohammedia", role: "Concepteur + suivi" },
    ],
    tarifsRange: "Honoraires 0.8 à 2 % du coût lot fluides",
    disponibilite: "DISPONIBLE",
    linkedinUrl: "https://linkedin.com/in/rachidberrada",
  },
  {
    email: "khalid.vrd@test.ma",
    cabinetName: "BET Mansouri VRD",
    cabinetSize: 5,
    cabinetStatus: "LIBERAL",
    yearsExperience: 13,
    formations: [
      { ecole: "École Hassania des Travaux Publics (EHTP)", diplome: "Ingénieur d'État - Génie Civil VRD", annee: 2012, ville: "Casablanca" },
    ],
    certifications: ["AutoCAD Civil 3D Expert", "Mensura Pro"],
    prix: [],
    langues: ["FR", "AR"],
    experiencesPhares: [
      { titre: "Lotissement Al Boustane - VRD", description: "Voirie 4.5 km, assainissement séparatif, eau potable, électrification.", anneeLivraison: 2021, surface: "24 ha", lieu: "Skhirat", role: "BET VRD principal" },
      { titre: "ZAC Marrakech-Ouest", description: "Étude VRD zone d'aménagement concerté 60 ha, hydraulique urbaine.", anneeLivraison: 2023, surface: "60 ha", lieu: "Marrakech", role: "Ingénieur VRD" },
    ],
    tarifsRange: "Honoraires 1 à 2.5 % du coût VRD",
    disponibilite: "DISPONIBLE",
  },
  {
    email: "fatima.topo@test.ma",
    cabinetName: "Cabinet Alaoui Topographie",
    cabinetSize: 7,
    cabinetStatus: "LIBERAL",
    yearsExperience: 12,
    formations: [
      { ecole: "Institut Agronomique et Vétérinaire Hassan II - IAV", diplome: "Ingénieur Géomètre-Topographe", annee: 2013, ville: "Rabat" },
    ],
    certifications: ["ONIGT - Membre titulaire", "Pix4D Mapper Certified", "Leica Geo Office Expert"],
    prix: ["Prix ONIGT Innovation Drone 2021"],
    langues: ["FR", "AR", "EN", "BERBERE"],
    experiencesPhares: [
      { titre: "Cadastre numérique Fès-Médina", description: "Levé GNSS + drone photogrammétrie de la médina classée UNESCO, 280 ha, précision ±2cm.", anneeLivraison: 2024, surface: "280 ha", lieu: "Fès", role: "Géomètre mandataire" },
      { titre: "Bornage domanial Saïs", description: "Bornage 1 200 parcelles agricoles, conformité décret 2019.", anneeLivraison: 2022, surface: "850 ha", lieu: "Saïs (Fès-Meknès)", role: "Géomètre expert" },
    ],
    tarifsRange: "Forfait selon surface · 5k à 80k MAD par mission",
    disponibilite: "DISPONIBLE",
    websiteUrl: "https://cabinet-alaoui.ma",
  },
  {
    email: "hassan.controle@test.ma",
    cabinetName: "BC-Atlas Contrôle Technique",
    cabinetSize: 15,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 22,
    formations: [
      { ecole: "École Mohammadia d'Ingénieurs (EMI)", diplome: "Ingénieur Génie Civil", annee: 2003, ville: "Rabat" },
      { ecole: "CSTB Paris", diplome: "Formation Contrôle Technique Construction", annee: 2008, ville: "Paris" },
    ],
    certifications: ["Agrément MEFD CTC", "QUALIBAT-MA Bureau de Contrôle", "Mission L + SEI certifié"],
    prix: [],
    langues: ["FR", "AR", "EN"],
    experiencesPhares: [
      { titre: "Contrôle technique Tour CFC", description: "Mission L + SEI sur tour mixte 28 étages, vérification calculs structure et sécurité incendie.", anneeLivraison: 2023, surface: "65 000 m²", lieu: "Casablanca Finance City", role: "Bureau de contrôle agréé" },
      { titre: "Hôpital Ibn Sina extension", description: "Mission complète CTC sur extension hospitalière 4 niveaux.", anneeLivraison: 2024, surface: "12 000 m²", lieu: "Rabat", role: "Contrôleur technique" },
    ],
    tarifsRange: "Honoraires 0.4 à 0.8 % du coût travaux",
    disponibilite: "OCCUPE",
    websiteUrl: "https://bc-atlas.ma",
  },
  {
    email: "nadia.labo@test.ma",
    cabinetName: "LabGeoTech",
    cabinetSize: 9,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 14,
    formations: [
      { ecole: "Faculté des Sciences Aïn Chock", diplome: "Master Géotechnique & Mécanique des Sols", annee: 2011, ville: "Casablanca" },
    ],
    certifications: ["LPEE - Laboratoire agréé", "ISO 17025 Essais béton", "AGEA Géotechnique"],
    prix: [],
    langues: ["FR", "AR"],
    experiencesPhares: [
      { titre: "Étude géotechnique Tour CFC", description: "Sondages 35m profondeur, essais pressiométriques, dimensionnement fondations spéciales.", anneeLivraison: 2022, surface: "Site 8000 m²", lieu: "Casablanca Finance City", role: "Laboratoire géotechnique" },
      { titre: "Suivi qualité béton viaduc A3", description: "Échantillonnage in-situ 480 carottes, essais 7/28/90j, rapports certifiés.", anneeLivraison: 2024, surface: "Autoroute A3 - 22 km", lieu: "Berrechid-Marrakech", role: "Laboratoire externe" },
    ],
    tarifsRange: "Forfait selon mission · 8k à 200k MAD",
    disponibilite: "DISPONIBLE",
  },
  {
    email: "omar.go@test.ma",
    cabinetName: "Saadi BTP",
    cabinetSize: 80,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 25,
    formations: [
      { ecole: "École Hassania des Travaux Publics (EHTP)", diplome: "Ingénieur Génie Civil", annee: 2000, ville: "Casablanca" },
    ],
    certifications: ["AGREMENT_MEFD_BAT_CL4", "QUALIBAT-MA-1102", "ISO 9001:2015"],
    prix: ["Prix Entreprise BTP de l'année 2022 (CGEM)"],
    langues: ["FR", "AR", "BERBERE"],
    experiencesPhares: [
      { titre: "Tour CFC - lot gros œuvre", description: "Réalisation GO tour mixte 28 étages, 65 000 m² SHON, délai 22 mois.", anneeLivraison: 2023, surface: "65 000 m²", lieu: "Casablanca Finance City", role: "Entreprise GO mandataire" },
      { titre: "Lotissement Al Boustane - GO", description: "Construction 180 villas R+1, gros œuvre + finitions partielles.", anneeLivraison: 2022, surface: "24 ha", lieu: "Skhirat", role: "Entreprise GO" },
      { titre: "Résidence Twin Towers Anfa - GO", description: "Gros œuvre + corps d'état architecturaux.", anneeLivraison: 2024, surface: "6 400 m²", lieu: "Casablanca-Anfa", role: "Entreprise GO" },
    ],
    tarifsRange: "Devis à l'affaire · disponible sur demande",
    disponibilite: "OCCUPE",
    websiteUrl: "https://saadi-btp.ma",
    linkedinUrl: "https://linkedin.com/company/saadi-btp",
  },
  {
    email: "sofia.so@test.ma",
    cabinetName: "Belhadj Décor",
    cabinetSize: 22,
    cabinetStatus: "LIBERAL",
    yearsExperience: 12,
    formations: [
      { ecole: "Institut Supérieur des Arts Décoratifs (ISADAC)", diplome: "Diplôme Décoration Intérieure", annee: 2013, ville: "Casablanca" },
    ],
    certifications: ["AGREMENT_MEFD_BAT_CL2", "Certification carrelage faïence (CTM)"],
    prix: [],
    langues: ["FR", "AR"],
    experiencesPhares: [
      { titre: "Tour CFC - lot finitions", description: "Carrelage premium, peinture haut de gamme, faux-plafonds techniques 28 niveaux.", anneeLivraison: 2023, surface: "65 000 m²", lieu: "Casablanca Finance City", role: "Entreprise second œuvre" },
      { titre: "Villa Dar Lalla - finitions", description: "Tadelakt traditionnel, zellige beldi, menuiserie cèdre.", anneeLivraison: 2020, surface: "480 m²", lieu: "Bouskoura", role: "Entreprise second œuvre" },
    ],
    tarifsRange: "Devis à l'affaire · spécialisée haut de gamme",
    disponibilite: "DISPONIBLE",
    instagramUrl: "https://instagram.com/belhadj_decor",
  },
  {
    email: "karim.fourn@test.ma",
    cabinetName: "Lahlou Matériaux",
    cabinetSize: 35,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 18,
    formations: [
      { ecole: "ISCAE Casablanca", diplome: "Master Management Logistique", annee: 2007, ville: "Casablanca" },
    ],
    certifications: ["ISO 9001:2015 (logistique)", "Agrément négoce matériaux MEFD"],
    prix: [],
    langues: ["FR", "AR"],
    experiencesPhares: [
      { titre: "Fourniture Tour CFC", description: "Approvisionnement ciment, fer à béton, agglos sur 22 mois de chantier, livraisons quotidiennes JIT.", anneeLivraison: 2023, surface: "65 000 m²", lieu: "Casablanca Finance City", role: "Fournisseur principal matériaux" },
    ],
    tarifsRange: "Tarifs publics + remises chantier",
    disponibilite: "DISPONIBLE",
    websiteUrl: "https://lahlou-mat.ma",
  },
  {
    email: "mehdi.promot@test.ma",
    cabinetName: "Cherkaoui Immo",
    cabinetSize: 14,
    cabinetStatus: "ASSOCIE",
    yearsExperience: 16,
    formations: [
      { ecole: "HEC Paris", diplome: "MBA Real Estate", annee: 2009, ville: "Paris" },
      { ecole: "ISCAE Casablanca", diplome: "Grande École - Finance", annee: 2006, ville: "Casablanca" },
    ],
    certifications: ["FNPI Maroc - Membre actif", "Promoteur agréé Habitat"],
    prix: ["Best Real Estate Developer Morocco 2021 (Africa Property Awards)"],
    langues: ["FR", "AR", "EN", "ES"],
    experiencesPhares: [
      { titre: "Twin Towers Anfa", description: "Promotion 48 logements collectifs haut standing, R+8, livraison 2024.", anneeLivraison: 2024, surface: "6 400 m²", lieu: "Casablanca-Anfa", role: "Promoteur maître d'ouvrage" },
      { titre: "Résidence Al Hadiqa", description: "180 logements économie sociale, lotissement intégré Skhirat.", anneeLivraison: 2022, surface: "24 ha", lieu: "Skhirat", role: "Promoteur" },
      { titre: "Hôtel Marrakech Palmeraie (en cours)", description: "Hôtel 5* 120 clés + spa, livraison prévue Q3 2026.", anneeLivraison: 2026, surface: "8 200 m²", lieu: "Marrakech-Palmeraie", role: "Promoteur" },
    ],
    tarifsRange: "Investisseurs/MOA — coordination projets immobiliers",
    disponibilite: "DISPONIBLE",
    websiteUrl: "https://cherkaoui-immo.ma",
    linkedinUrl: "https://linkedin.com/in/mehdicherkaoui",
  },
];

async function main() {
  console.log("🌱 Enrichissement des 12 profils pros…");
  let updated = 0;
  for (const e of PROS) {
    const user = await prisma.user.findUnique({ where: { email: e.email } });
    if (!user) {
      console.log(`  ✗ ${e.email} non trouvé`);
      continue;
    }
    const profile = await prisma.proProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      console.log(`  ✗ ${e.email} pas de ProProfile (lance seed-test-pros.ts d'abord)`);
      continue;
    }

    await prisma.proProfile.update({
      where: { userId: user.id },
      data: {
        cabinetName: e.cabinetName,
        cabinetSize: e.cabinetSize,
        cabinetStatus: e.cabinetStatus,
        yearsExperience: e.yearsExperience,
        cnoaNumero: e.cnoaNumero ?? null,
        formations: e.formations as any,
        certifications: e.certifications,
        prix: e.prix,
        langues: e.langues,
        experiencesPhares: e.experiencesPhares as any,
        tarifsRange: e.tarifsRange,
        disponibilite: e.disponibilite,
        websiteUrl: e.websiteUrl ?? profile.websiteUrl,
        linkedinUrl: e.linkedinUrl ?? profile.linkedinUrl,
        behanceUrl: e.behanceUrl ?? null,
        instagramUrl: e.instagramUrl ?? null,
      },
    });
    updated++;
    console.log(`  ✓ ${e.email} → ${e.cabinetName}, ${e.yearsExperience}ans, ${e.formations.length} formations, ${e.experiencesPhares.length} projets`);
  }
  console.log(`\n✅ ${updated}/${PROS.length} profils enrichis.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
