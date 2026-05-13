/* eslint-disable */
/**
 * seed-associations.ts — Sprint I
 *
 * Configure les 2 cercles ASSOCIATION majeurs du Maroc avec leur
 * formSchema, critères d'éligibilité, cotisation et préfixe carte :
 *  - SNASP (Syndicat National des Architectes du Secteur Privé)
 *  - ANJAUM (Association Nationale des Jeunes Architectes et Urbanistes du Maroc)
 *
 * Idempotent. Lance après seed-test-pros.ts (qui crée les cercles).
 *
 * Usage local : npx ts-node --transpile-only apps/api/scripts/seed-associations.ts
 * Usage prod  : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-associations.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGIONS_MAROC = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

const ECOLES_ARCHI = [
  "ENA Rabat (École Nationale d'Architecture)",
  "EAC Casablanca (École d'Architecture)",
  "EAR Marrakech",
  "EAT Tétouan (Architecture & Design)",
  "EAF Fès",
  "ISA Casablanca",
  "ENSA Marseille (France)",
  "ENSA Paris-Belleville (France)",
  "ENSA Versailles (France)",
  "Politecnico di Milano (Italie)",
  "ETSAM Madrid (Espagne)",
  "Bartlett UCL Londres (UK)",
  "Autre — préciser dans bio",
];

const SNASP_SCHEMA = [
  { name: "fullName",         label: "Nom complet",                    type: "text",     required: true, placeholder: "ex: Yassine Attarassi" },
  { name: "cnoaNumber",       label: "Numéro CNOA",                    type: "text",     required: true, placeholder: "ex: CNOA-12345", helpText: "Obligatoire — vérification auprès du CNOA" },
  { name: "cnoaYear",         label: "Année d'inscription CNOA",       type: "number",   required: true, placeholder: "ex: 2014" },
  { name: "exerciceStatut",   label: "Statut d'exercice",              type: "select",   required: true, options: ["Libéral", "Associé", "Salarié cabinet", "Fonctionnaire", "Mixte"] },
  { name: "cabinetName",      label: "Nom du cabinet",                 type: "text",     required: true, placeholder: "ex: Atelier Bensouda Architectes" },
  { name: "cabinetCity",      label: "Ville du cabinet",               type: "text",     required: true, placeholder: "ex: Casablanca" },
  { name: "region",           label: "Région d'exercice principale",   type: "select",   required: true, options: REGIONS_MAROC },
  { name: "yearsExperience",  label: "Années d'expérience",            type: "number",   required: false, placeholder: "ex: 14" },
  { name: "ecole",            label: "École d'architecture",           type: "select",   required: false, options: ECOLES_ARCHI },
  { name: "ecoleAnnee",       label: "Année de diplôme",               type: "number",   required: false, placeholder: "ex: 2010" },
  { name: "agrements",        label: "Agréments (HC, économie sociale, …)", type: "textarea", required: false, placeholder: "ex: AGREMENT_MEFD_HC, IRESEN-PV, …" },
  { name: "specialites",      label: "Spécialités (séparées par virgule)", type: "textarea", required: false, placeholder: "ex: Logements collectifs, Patrimoine, BIM…" },
  { name: "phoneE164",        label: "Téléphone professionnel",        type: "tel",      required: true, placeholder: "+212522445566" },
  { name: "emailPro",         label: "Email professionnel",            type: "email",    required: false, placeholder: "contact@cabinet.ma" },
  { name: "motivation",       label: "Pourquoi rejoindre le SNASP ?",  type: "textarea", required: true, placeholder: "Quelques lignes sur ton engagement syndical, les sujets qui te tiennent à cœur…" },
  { name: "parrains",         label: "Parrains (membres SNASP, optionnel)", type: "textarea", required: false, placeholder: "Nom + n° CNOA de 2 membres déjà adhérents" },
  { name: "acceptStatuts",    label: "J'ai pris connaissance des statuts du SNASP et m'engage à les respecter", type: "checkbox", required: true },
];

const ANJAUM_SCHEMA = [
  { name: "fullName",         label: "Nom complet",                    type: "text",     required: true, placeholder: "ex: Salma Tazi" },
  { name: "birthDate",        label: "Date de naissance",              type: "date",     required: true, helpText: "Doit avoir moins de 35 ans" },
  { name: "profession",       label: "Statut actuel",                  type: "select",   required: true, options: [
    "Étudiant en architecture",
    "Étudiant en urbanisme",
    "Jeune architecte diplômé (< 5 ans)",
    "Jeune urbaniste diplômé (< 5 ans)",
    "Architecte exerçant (< 10 ans)",
    "Urbaniste exerçant (< 10 ans)",
  ]},
  { name: "ecole",            label: "École d'architecture/urbanisme", type: "select",   required: true, options: ECOLES_ARCHI },
  { name: "ecoleAnnee",       label: "Année de diplôme (ou prévue)",   type: "number",   required: true, placeholder: "ex: 2022" },
  { name: "cnoaNumber",       label: "Numéro CNOA (si déjà inscrit)",  type: "text",     required: false, placeholder: "Optionnel pour étudiants" },
  { name: "city",             label: "Ville de résidence/exercice",    type: "text",     required: true, placeholder: "ex: Rabat" },
  { name: "region",           label: "Région",                         type: "select",   required: true, options: REGIONS_MAROC },
  { name: "phoneE164",        label: "Téléphone mobile",               type: "tel",      required: true, placeholder: "+212661234567" },
  { name: "linkedinUrl",      label: "LinkedIn (optionnel)",           type: "text",     required: false, placeholder: "https://linkedin.com/in/…" },
  { name: "portfolioUrl",     label: "Portfolio / Behance (optionnel)", type: "text",    required: false, placeholder: "https://behance.net/…" },
  { name: "interets",         label: "Centres d'intérêt professionnels", type: "textarea", required: false, placeholder: "ex: BIM, Patrimoine vernaculaire, Architecture durable, Médiation urbaine…" },
  { name: "motivation",       label: "Pourquoi rejoindre l'ANJAUM ?",  type: "textarea", required: true, placeholder: "Quelques lignes sur tes attentes et ce que tu peux apporter au réseau…" },
  { name: "experiencesAssoc", label: "Expériences associatives/étudiantes", type: "textarea", required: false, placeholder: "ex: BDE école, ONG urbaine, hackathon arch tech…" },
  { name: "acceptStatuts",    label: "J'ai pris connaissance des statuts de l'ANJAUM et m'engage à participer activement", type: "checkbox", required: true },
];

const ASSOCIATIONS = [
  {
    slug: "snasp-architectes-prive",
    name: "SNASP — Syndicat National des Architectes du Secteur Privé",
    description: "Syndicat national des architectes exerçant en secteur privé au Maroc. Défense de la profession, négociations honoraires barème CNOA, conditions d'exercice, formations continues. La cotisation annuelle inclut l'accès complet à CITURBAREA pour 1 an.",
    cotisationAnnuelleMad: 1000,
    cardNumberPrefix: "SNASP-2026",
    formSchema: SNASP_SCHEMA,
    eligibilityCriteria: {
      "Architecte inscrit au CNOA": "Numéro CNOA actif obligatoire",
      "Exercice en secteur privé": "Libéral, associé ou salarié de cabinet privé",
      "Cotisation annuelle": "1 000 MAD/an — INCLUT l'accès annuel CITURBAREA gratuit + assurance RC syndicale",
      "Avantages CITURBAREA inclus": "Annuaire pro · chat · visios · feed projets · accès portes P1-P6",
    },
  },
  {
    slug: "anjaum-jeunes-architectes",
    name: "ANJAUM — Association Nationale des Jeunes Architectes et Urbanistes du Maroc",
    description: "Réseau des jeunes architectes et urbanistes du Maroc (< 35 ans). Mentorat, formations continues, événements, partage de bonnes pratiques, accompagnement à l'installation. La cotisation annuelle inclut l'accès complet à CITURBAREA pour 1 an.",
    cotisationAnnuelleMad: 1000,
    cardNumberPrefix: "ANJAUM-2026",
    formSchema: ANJAUM_SCHEMA,
    eligibilityCriteria: {
      "Âge maximum": "35 ans révolus",
      "Profession": "Étudiant ou diplômé en architecture/urbanisme",
      "Cotisation annuelle": "1 000 MAD/an — INCLUT l'accès annuel CITURBAREA gratuit",
      "Avantages CITURBAREA inclus": "Annuaire pro · chat · visios · feed projets · mentorat",
      "Engagement": "Participation à au moins 2 événements/an du réseau",
    },
  },
];

async function main() {
  console.log("🏛  Seed associations professionnelles");
  console.log("══════════════════════════════════════════════════════════");

  for (const a of ASSOCIATIONS) {
    const cercle = await prisma.cercle.findUnique({ where: { slug: a.slug } });
    if (!cercle) {
      console.log(`  ✗ Cercle ${a.slug} introuvable — skip (lance seed-test-pros.ts d'abord)`);
      continue;
    }
    await prisma.cercle.update({
      where: { id: cercle.id },
      data: {
        name: a.name,
        description: a.description,
        membershipFlow: "ASSOCIATION",
        cotisationAnnuelleMad: a.cotisationAnnuelleMad,
        cardNumberPrefix: a.cardNumberPrefix,
        formSchema: a.formSchema as any,
        eligibilityCriteria: a.eligibilityCriteria as any,
      },
    });
    console.log(`  ✓ ${a.slug} configuré ASSOCIATION (${a.formSchema.length} champs, ${a.cotisationAnnuelleMad} MAD/an, préfixe ${a.cardNumberPrefix})`);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✅ Associations configurées");
  console.log("══════════════════════════════════════════════════════════");
  console.log("\nÀ tester :");
  console.log("  https://citurb-web-production.up.railway.app/cercles/snasp-architectes-prive/rejoindre");
  console.log("  https://citurb-web-production.up.railway.app/cercles/anjaum-jeunes-architectes/rejoindre");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
