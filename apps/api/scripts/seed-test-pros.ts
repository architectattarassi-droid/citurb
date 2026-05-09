/* eslint-disable */
/**
 * seed-test-pros.ts — données réalistes Maroc BTP pour démo/test.
 *
 * Crée :
 *  - 12 pros (architectes, BET, topographes, contrôle, GO, fournisseur)
 *    avec User + ProProfile + connections.
 *  - 4 cercles (SNASP, ANJAUM, ONIGT, BIM-Maroc).
 *  - Tous les pros adhèrent aux cercles pertinents (membership ACTIVE).
 *  - 6 posts root + 8 replies (commentaires) + upvotes (j'aime).
 *  - 2 LiveRoom planifiées (événements).
 *  - 12 messages de chat dans le cercle BIM-Maroc.
 *
 * Idempotent : skip si user existe déjà (par email).
 *
 * Mot de passe commun : Test1234! (pour tous les pros de test).
 *
 * Usage : npx ts-node --transpile-only apps/api/scripts/seed-test-pros.ts
 */
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASSWORD = "Test1234!";

type ProSeed = {
  email: string;
  username: string;
  displayName: string;
  title: string;
  bio: string;
  metier: any;
  classeBTP: any;
  agrements: string[];
  specialites: string[];
  regions: string[];
  villePrincipale: string;
  phonePublic: string;
  emailPublic: string;
  websiteUrl?: string;
  isVerified?: boolean;
};

const PROS: ProSeed[] = [
  {
    email: "amine.archi@test.ma",
    username: "amine_archi",
    displayName: "Amine Bensouda",
    title: "Architecte associé · Atelier Bensouda",
    bio: "Architecte DPLG · 14 ans d'expérience · spécialisé logements collectifs et tertiaire à Casablanca.",
    metier: "ARCHITECTE",
    classeBTP: "HC",
    agrements: ["CNOA-12345"],
    specialites: ["Logements collectifs", "Tertiaire", "BIM"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522445566",
    emailPublic: "contact@bensouda-archi.ma",
    websiteUrl: "https://bensouda-archi.ma",
    isVerified: true,
  },
  {
    email: "salma.urban@test.ma",
    username: "salma_urb",
    displayName: "Salma Tazi",
    title: "Architecte-urbaniste · Cabinet Tazi & Partners",
    bio: "Urbaniste DPLG · plans d'aménagement, lotissements, études d'impact.",
    metier: "ARCHITECTE",
    classeBTP: "HC",
    agrements: ["CNOA-22118", "AMUP-014"],
    specialites: ["Urbanisme", "Lotissements", "PA/PAC"],
    regions: ["Rabat-Salé-Kénitra", "Casablanca-Settat"],
    villePrincipale: "Rabat",
    phonePublic: "+212537770044",
    emailPublic: "salma@tazi-partners.ma",
    isVerified: true,
  },
  {
    email: "youssef.bet@test.ma",
    username: "yo_struct",
    displayName: "Youssef El Idrissi",
    title: "Ingénieur structure · BET Idrissi",
    bio: "Ingénieur EHTP 2009 · béton armé, charpente métallique, parasismique.",
    metier: "BET_STRUCTURE",
    classeBTP: "CL3",
    agrements: ["ONI-7821", "AGREMENT_MEFD_BAT_CL3"],
    specialites: ["Béton armé", "Parasismique", "Structures métalliques"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522991122",
    emailPublic: "youssef@bet-idrissi.ma",
    isVerified: true,
  },
  {
    email: "rachid.fluides@test.ma",
    username: "rachid_fl",
    displayName: "Rachid Berrada",
    title: "Ingénieur fluides · Berrada Engineering",
    bio: "CVC, plomberie, électricité, courants faibles, RT-Maroc 2014.",
    metier: "BET_FLUIDES",
    classeBTP: "CL2",
    agrements: ["ONI-9012"],
    specialites: ["CVC", "Photovoltaïque", "RT-Maroc"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522554433",
    emailPublic: "rachid@berrada-eng.ma",
  },
  {
    email: "khalid.vrd@test.ma",
    username: "khalid_vrd",
    displayName: "Khalid Mansouri",
    title: "Ingénieur VRD · BET Mansouri",
    bio: "Voirie, assainissement, eau potable, terrassements lotissements.",
    metier: "BET_VRD",
    classeBTP: "CL3",
    agrements: ["ONI-4456"],
    specialites: ["Assainissement", "Voirie", "Terrassements"],
    regions: ["Marrakech-Safi", "Casablanca-Settat"],
    villePrincipale: "Marrakech",
    phonePublic: "+212524773311",
    emailPublic: "khalid@bet-mansouri.ma",
  },
  {
    email: "fatima.topo@test.ma",
    username: "fati_topo",
    displayName: "Fatima Zahra Alaoui",
    title: "Géomètre-topographe · Cabinet Alaoui",
    bio: "Membre ONIGT · levés terrain, bornage, GNSS, drone photogrammétrie.",
    metier: "GEOMETRE",
    classeBTP: "HC",
    agrements: ["ONIGT-1208"],
    specialites: ["GNSS", "Drone photogrammétrie", "Bornage"],
    regions: ["Fès-Meknès", "Rabat-Salé-Kénitra"],
    villePrincipale: "Fès",
    phonePublic: "+212535662244",
    emailPublic: "fatima@cabinet-alaoui.ma",
    isVerified: true,
  },
  {
    email: "hassan.controle@test.ma",
    username: "hass_ctrl",
    displayName: "Hassan Bouchikhi",
    title: "Bureau de contrôle · BC-Atlas",
    bio: "Contrôle technique de la construction · agréé MEFD, missions L+SEI.",
    metier: "CONTROLE_TECHNIQUE",
    classeBTP: "HC",
    agrements: ["MEFD-CTC-220", "QUALIBAT"],
    specialites: ["Mission L", "SEI", "PV résistance feu"],
    regions: ["Casablanca-Settat", "Rabat-Salé-Kénitra"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522887766",
    emailPublic: "contact@bc-atlas.ma",
    isVerified: true,
  },
  {
    email: "nadia.labo@test.ma",
    username: "nadia_lab",
    displayName: "Nadia Benkirane",
    title: "Laboratoire · LabGeoTech",
    bio: "Essais sols, béton, acier · agréé LPEE.",
    metier: "LABORATOIRE",
    classeBTP: "HC",
    agrements: ["LPEE-AC-118"],
    specialites: ["Essais sols", "Carottage béton", "Géotechnique"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Mohammedia",
    phonePublic: "+212523322110",
    emailPublic: "n.benkirane@labgeotech.ma",
  },
  {
    email: "omar.go@test.ma",
    username: "omar_go",
    displayName: "Omar Saadi",
    title: "Entreprise GO · Saadi BTP",
    bio: "Gros œuvre · 60 chantiers livrés · classés CL4 MEFD.",
    metier: "ENTREPRISE_GO",
    classeBTP: "CL4",
    agrements: ["AGREMENT_MEFD_BAT_CL4", "QUALIBAT-MA-1102"],
    specialites: ["Gros œuvre", "Béton coulé", "Lotissements"],
    regions: ["Casablanca-Settat", "Marrakech-Safi"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522443388",
    emailPublic: "contact@saadi-btp.ma",
    isVerified: true,
  },
  {
    email: "sofia.so@test.ma",
    username: "sofia_so",
    displayName: "Sofia Belhadj",
    title: "Entreprise second œuvre · Belhadj Décor",
    bio: "Carrelage, faïence, peinture, faux-plafonds · finitions haut de gamme.",
    metier: "ENTREPRISE_SECOND_OEUVRE",
    classeBTP: "CL2",
    agrements: ["AGREMENT_MEFD_BAT_CL2"],
    specialites: ["Carrelage", "Peinture", "Faux-plafonds"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522665544",
    emailPublic: "sofia@belhadj-decor.ma",
  },
  {
    email: "karim.fourn@test.ma",
    username: "karim_mat",
    displayName: "Karim Lahlou",
    title: "Fournisseur matériaux · Lahlou Matériaux",
    bio: "Ciment, fer à béton, agglos, sable · livraison Grand-Casablanca.",
    metier: "FOURNISSEUR_MATERIAUX",
    classeBTP: "HC",
    agrements: [],
    specialites: ["Ciment", "Fer à béton", "Granulats"],
    regions: ["Casablanca-Settat"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522111199",
    emailPublic: "karim@lahlou-mat.ma",
  },
  {
    email: "mehdi.promot@test.ma",
    username: "mehdi_pro",
    displayName: "Mehdi Cherkaoui",
    title: "Promoteur · Cherkaoui Immo",
    bio: "Promoteur immobilier · 8 résidences livrées Casa & Marrakech.",
    metier: "PROMOTEUR",
    classeBTP: "HC",
    agrements: [],
    specialites: ["Logements collectifs", "Économie sociale", "VEFA"],
    regions: ["Casablanca-Settat", "Marrakech-Safi"],
    villePrincipale: "Casablanca",
    phonePublic: "+212522884411",
    emailPublic: "m.cherkaoui@cherkaoui-immo.ma",
    isVerified: true,
  },
];

const CERCLES = [
  {
    slug: "snasp-architectes-prive",
    name: "SNASP — Syndicat National des Architectes du Secteur Privé",
    description: "Syndicat des architectes en exercice libéral.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Syndicat", "Architectes libéraux"],
    region: null,
  },
  {
    slug: "anjaum-jeunes-architectes",
    name: "ANJAUM — Jeunes Architectes & Urbanistes du Maroc",
    description: "Réseau jeunes architectes/urbanistes Maroc.",
    visibility: "PUBLIC" as const,
    themes: ["Jeunes architectes", "Urbanistes"],
    region: null,
  },
  {
    slug: "onigt-geometres",
    name: "ONIGT — Ordre National des Ingénieurs Géomètres-Topographes",
    description: "Ordre topographes-géomètres.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Topographie", "Bornage"],
    region: null,
  },
  {
    slug: "bim-maroc",
    name: "BIM Maroc — Communauté praticiens",
    description: "Échanges autour du BIM (Revit, ArchiCAD, IFC), retours d'expérience chantier.",
    visibility: "PUBLIC" as const,
    themes: ["BIM", "Revit", "IFC", "Coordination"],
    region: null,
  },
];

async function ensureUser(seed: ProSeed) {
  const existing = await prisma.user.findUnique({ where: { email: seed.email } });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: seed.email,
      username: seed.username,
      passwordHash,
      role: "CLIENT",
      plan: "PRO",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
}

async function ensureProfile(userId: string, seed: ProSeed) {
  const existing = await prisma.proProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.proProfile.create({
    data: {
      userId,
      displayName: seed.displayName,
      title: seed.title,
      bio: seed.bio,
      metier: seed.metier,
      classeBTP: seed.classeBTP,
      agrements: seed.agrements,
      specialites: seed.specialites,
      regions: seed.regions,
      villePrincipale: seed.villePrincipale,
      phonePublic: seed.phonePublic,
      emailPublic: seed.emailPublic,
      websiteUrl: seed.websiteUrl ?? null,
      isVerified: !!seed.isVerified,
      connectionsCount: 0,
    },
  });
}

async function ensureCercle(c: typeof CERCLES[number], ownerId: string) {
  const existing = await prisma.cercle.findUnique({ where: { slug: c.slug } });
  if (existing) return existing;
  return prisma.cercle.create({
    data: {
      slug: c.slug,
      name: c.name,
      description: c.description,
      visibility: c.visibility,
      region: c.region,
      themes: c.themes,
      ownerId,
      members: { create: { userId: ownerId, role: "OWNER", status: "ACTIVE" } },
      moderators: { create: { userId: ownerId } },
    },
  });
}

async function ensureMembership(cercleId: string, userId: string, role: "MEMBER" | "MODERATOR" = "MEMBER") {
  const existing = await prisma.cercleMembership.findUnique({
    where: { cercleId_userId: { cercleId, userId } },
  });
  if (existing) return existing;
  return prisma.cercleMembership.create({
    data: { cercleId, userId, role, status: "ACTIVE" },
  });
}

async function main() {
  console.log("🌱 Seed pros BTP marocains…");

  // Owner = premier user OWNER en DB, sinon créer un dédié
  let owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    owner = await prisma.user.upsert({
      where: { email: "owner@citurbarea.ma" },
      update: {},
      create: {
        email: "owner@citurbarea.ma",
        username: "owner",
        passwordHash,
        role: "OWNER",
        plan: "PRO",
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✓ OWNER créé : owner@citurbarea.ma / ${PASSWORD}`);
  }

  // Pros
  const proResults: Array<{ user: any; profile: any; seed: ProSeed }> = [];
  for (const seed of PROS) {
    const user = await ensureUser(seed);
    const profile = await ensureProfile(user.id, seed);
    proResults.push({ user, profile, seed });
  }
  console.log(`✓ ${proResults.length} pros (User + ProProfile) prêts`);

  // Cercles
  const cercleMap = new Map<string, any>();
  for (const c of CERCLES) {
    const cercle = await ensureCercle(c, owner.id);
    cercleMap.set(c.slug, cercle);
  }
  console.log(`✓ ${cercleMap.size} cercles prêts`);

  // Memberships
  const arch = proResults.filter((p) => ["ARCHITECTE"].includes(p.seed.metier as string));
  const young = arch; // tous archi vont aussi dans ANJAUM
  const topo = proResults.filter((p) => ["GEOMETRE", "TOPOGRAPHE"].includes(p.seed.metier as string));
  const bimAudience = proResults; // tout le monde dans BIM Maroc

  for (const p of arch) await ensureMembership(cercleMap.get("snasp-architectes-prive").id, p.user.id);
  for (const p of young) await ensureMembership(cercleMap.get("anjaum-jeunes-architectes").id, p.user.id);
  for (const p of topo) await ensureMembership(cercleMap.get("onigt-geometres").id, p.user.id);
  for (const p of bimAudience) await ensureMembership(cercleMap.get("bim-maroc").id, p.user.id);
  console.log("✓ Adhésions créées (par métier + tout le monde dans BIM Maroc)");

  // Connections : chaque pro connecté à 3 autres au hasard (simulé)
  for (let i = 0; i < proResults.length; i++) {
    for (let j = i + 1; j < Math.min(i + 4, proResults.length); j++) {
      try {
        await prisma.connection.upsert({
          where: { fromUserId_toUserId: { fromUserId: proResults[i].user.id, toUserId: proResults[j].user.id } },
          update: {},
          create: {
            fromUserId: proResults[i].user.id,
            toUserId: proResults[j].user.id,
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });
      } catch (e) {
        // Connection model peut-être absent
      }
    }
  }

  // Posts dans BIM Maroc
  const bim = cercleMap.get("bim-maroc");
  const snasp = cercleMap.get("snasp-architectes-prive");

  const post1 = await prisma.cerclePost.create({
    data: {
      cercleId: bim.id,
      authorId: proResults[0].user.id,
      title: "Retour d'expérience IFC 4.3 sur résidence R+8 Casa-Anfa",
      body: "Salam, on vient de livrer la coordination BIM d'une R+8 (logements collectifs) avec IFC 4.3. Quelques constats :\n\n1. Solibri 9.13 lit OK l'IFC 4.3 mais le mapping psets reste manuel\n2. Revit 2024 export → on perd les properties custom si pas de shared parameters\n3. ArchiCAD 27 a un meilleur round-trip\n\nQui a déjà testé un workflow IFC 4.3 sur un projet d'envergure ?",
      upvotes: 0,
    },
  });

  const post2 = await prisma.cerclePost.create({
    data: {
      cercleId: bim.id,
      authorId: proResults[2].user.id,
      title: "Modélisation parasismique RPS-2011 dans Robot Structural",
      body: "Pour les chantiers en zone 3-4, je modélise les voiles de contreventement avec coefficient de comportement K=3. Vous, vous prenez K=2 ou K=4 ?",
      upvotes: 0,
    },
  });

  const post3 = await prisma.cerclePost.create({
    data: {
      cercleId: snasp.id,
      authorId: proResults[1].user.id,
      title: "Honoraires PC en lotissement : barème CNOA respecté ?",
      body: "Je remarque que pour les lotissements > 5 ha, beaucoup de confrères descendent à 2.5% au lieu des 4% du barème CNOA. C'est légal ? Quelqu'un a un retour avec son ordre régional ?",
      upvotes: 0,
    },
  });

  const post4 = await prisma.cerclePost.create({
    data: {
      cercleId: bim.id,
      authorId: proResults[5].user.id,
      title: "Drone photogrammétrie : DJI Mavic 3 Enterprise vs Phantom 4 RTK",
      body: "Je dois renouveler ma flotte. Pour des levés cadastraux 1-5 ha, le Mavic 3 E suffit ou il faut absolument du RTK ?",
      upvotes: 0,
    },
  });

  const post5 = await prisma.cerclePost.create({
    data: {
      cercleId: bim.id,
      authorId: proResults[6].user.id,
      title: "Mission L : qui peut me partager un modèle de rapport final ?",
      body: "Je commence avec un nouveau client (logement collectif R+5). Mon précédent rapport date de 2019 et le format a évolué. Si quelqu'un peut partager un template récent, je suis preneur 🙏",
      upvotes: 0,
    },
  });

  const post6 = await prisma.cerclePost.create({
    data: {
      cercleId: bim.id,
      authorId: proResults[8].user.id,
      title: "Pénurie ferraillage HA12 sur Casa la semaine dernière ?",
      body: "Mon fournisseur habituel était en rupture HA12 — j'ai dû dépanner avec 2 autres. Vous aussi ?",
      upvotes: 0,
    },
  });

  console.log("✓ 6 posts créés");

  // Replies (commentaires)
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[3].user.id, parentId: post1.id,
      body: "Pareil ici. Pour les properties custom, on a fini par tout passer en shared parameters Revit avant export. Ça force la discipline mais ça résout le problème.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[7].user.id, parentId: post1.id,
      body: "Solibri pour le check géométrique uniquement chez nous. Pour les psets on utilise BIMcollab Zoom — meilleur reporting.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[2].user.id, parentId: post2.id,
      body: "K=3 systématiquement chez nous. K=4 seulement si voiles épais (≥20cm) et bonne ductilité armatures.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: snasp.id, authorId: proResults[0].user.id, parentId: post3.id,
      body: "Le barème CNOA reste indicatif depuis 2018. Légalement on peut négocier — mais éthiquement, descendre à 2.5% c'est dévaloriser la profession.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: snasp.id, authorId: proResults[1].user.id, parentId: post3.id,
      body: "Merci Amine. J'attendais une vue plus dure mais tu as raison, on tire la profession vers le bas.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[5].user.id, parentId: post4.id,
      body: "Le RTK est indispensable au-delà de 1 ha si tu veux la précision cadastrale (±2cm). En Mavic 3 E avec GCP bien posés, tu fais 5cm — limite acceptable seulement pour des relevés indicatifs.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[6].user.id, parentId: post5.id,
      body: "Je t'envoie un template par DM. Format MEFD 2023 mis à jour.",
    },
  });
  await prisma.cerclePost.create({
    data: {
      cercleId: bim.id, authorId: proResults[10].user.id, parentId: post6.id,
      body: "Confirmé. Rupture nationale 3 jours fin de semaine dernière (livraison Roumanie retardée). Stock revenu lundi.",
    },
  });

  // Update replyCount
  for (const p of [post1, post2, post3, post4, post5, post6]) {
    const cnt = await prisma.cerclePost.count({ where: { parentId: p.id } });
    await prisma.cerclePost.update({ where: { id: p.id }, data: { replyCount: cnt } });
  }
  console.log("✓ 8 commentaires (replies) créés");

  // Upvotes (j'aime) — on simule en updatant le champ upvotes
  await prisma.cerclePost.update({ where: { id: post1.id }, data: { upvotes: 7 } });
  await prisma.cerclePost.update({ where: { id: post2.id }, data: { upvotes: 4 } });
  await prisma.cerclePost.update({ where: { id: post3.id }, data: { upvotes: 12 } });
  await prisma.cerclePost.update({ where: { id: post4.id }, data: { upvotes: 5 } });
  await prisma.cerclePost.update({ where: { id: post5.id }, data: { upvotes: 3 } });
  await prisma.cerclePost.update({ where: { id: post6.id }, data: { upvotes: 9 } });
  console.log("✓ J'aime (upvotes) attribués");

  // Événements (LiveRoom scheduled)
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setHours(18, 30, 0, 0);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  inTwoWeeks.setHours(15, 0, 0, 0);

  await prisma.liveRoom.create({
    data: {
      cercleId: bim.id,
      hostId: proResults[0].user.id,
      slug: `bim-revit-2025-${Date.now().toString(36)}`,
      title: "Webinaire BIM : nouveautés Revit 2025 + IFC 4.3",
      description: "Démo live des nouveautés Revit 2025, focus sur l'export IFC 4.3 propre. Q&A en fin de session.",
      livekitRoomName: `bim-revit-2025-${Date.now()}`,
      scheduledAt: tomorrow,
      maxParticipants: 100,
      status: "SCHEDULED",
    },
  });
  await prisma.liveRoom.create({
    data: {
      cercleId: snasp.id,
      hostId: proResults[1].user.id,
      slug: `snasp-honoraires-${Date.now().toString(36)}`,
      title: "AG SNASP — Position commune sur les honoraires lotissements",
      description: "Assemblée générale extraordinaire pour adopter une position commune sur les honoraires PC lotissements > 5 ha.",
      livekitRoomName: `snasp-ag-${Date.now()}`,
      scheduledAt: inTwoWeeks,
      maxParticipants: 50,
      status: "SCHEDULED",
    },
  });
  console.log("✓ 2 événements (LiveRoom) planifiés");

  // Messages chat dans BIM Maroc
  const chatLines: Array<{ authorIdx: number; body: string }> = [
    { authorIdx: 0,  body: "Salam à tous, bienvenue dans le cercle BIM Maroc 👋" },
    { authorIdx: 2,  body: "Salam ! Content de rejoindre. Quelqu'un a un retour sur Tekla 2024 ?" },
    { authorIdx: 5,  body: "Je l'utilise depuis 3 mois. Stable, mais l'export IFC reste capricieux sur les armatures." },
    { authorIdx: 0,  body: "Pareil. Sur le R+8 d'Anfa on a dû passer par Allplan pour les armatures." },
    { authorIdx: 6,  body: "Quelqu'un connaît un bon module formation BIM coordination à Casa ? Je dois former 2 collaborateurs." },
    { authorIdx: 1,  body: "L'ANJAUM organise un cycle en avril, plutôt orienté débutant/intermédiaire." },
    { authorIdx: 7,  body: "Pour du coordination + clash detection, plutôt Solibri Open 2.0 — formation officielle Solibri Maroc." },
    { authorIdx: 3,  body: "On peut peut-être organiser un atelier interne ? Je peux héberger Casa Sud." },
    { authorIdx: 0,  body: "👍 Bonne idée. Je sonde les intéressés via un post dédié." },
    { authorIdx: 8,  body: "Présent ! Mes 2 ingés terrain seraient OK." },
    { authorIdx: 11, body: "Côté promoteur, intéressé aussi pour 1-2 personnes." },
    { authorIdx: 0,  body: "Super, je lance le post ce soir. Restez branchés 🚀" },
  ];

  // Messages avec timestamps espacés
  const baseTime = Date.now() - 30 * 60 * 1000; // démarre il y a 30 min
  for (let i = 0; i < chatLines.length; i++) {
    const line = chatLines[i];
    await prisma.cercleMessage.create({
      data: {
        cercleId: bim.id,
        authorId: proResults[line.authorIdx].user.id,
        body: line.body,
        createdAt: new Date(baseTime + i * 90 * 1000), // 90s entre chaque
      },
    });
  }
  console.log("✓ 12 messages de chat dans #bim-maroc");

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("🎉 SEED TERMINÉ");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`Mot de passe commun : ${PASSWORD}`);
  console.log(`\nComptes de test (12 pros) :`);
  for (const p of proResults) {
    console.log(`  - ${p.user.email}  · ${p.seed.displayName} (${p.seed.metier})`);
  }
  console.log(`\nCercles créés :`);
  for (const [slug, c] of cercleMap) console.log(`  - /cercles/${slug}  · ${c.name}`);
  console.log(`\nÀ tester :`);
  console.log(`  /cercles                       → feed`);
  console.log(`  /cercles/bim-maroc             → posts + commentaires + j'aime`);
  console.log(`  /cercles/bim-maroc/chat        → chat temps réel`);
  console.log(`  /cercles/snasp-architectes-prive → cercle restreint`);
  console.log(`  /cercles/profile/<userId>      → page profil`);
  console.log("══════════════════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
