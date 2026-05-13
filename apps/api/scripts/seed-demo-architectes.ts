/* eslint-disable */
/**
 * seed-demo-architectes.ts — Préparation réunion architectes mai 2026.
 *
 * Crée 3 architectes test avec :
 *   - User complet (email, password, role CLIENT)
 *   - ProProfile riche (cabinet, expérience, formations, projets phares, contacts)
 *   - Adhésion validée au cercle SNASP avec carte d'adhérent
 *   - Membership ACTIVE dans le cercle "demo-reunion-mai-2026"
 *
 * Puis crée le cercle de démo avec :
 *   - 1 post root + 2 commentaires + 2 likes (upvotes)
 *   - 5 messages chat
 *   - 1 événement LiveRoom Jitsi programmé
 *
 * À la fin : affiche credentials des 3 comptes pour test.
 *
 * Idempotent. Lance après seed-test-pros + seed-associations.
 *
 * Usage local : npx ts-node --transpile-only apps/api/scripts/seed-demo-architectes.ts
 * Usage prod  : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-demo-architectes.ts
 */
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASSWORD = "DemoArchi2026!";

type DemoArchi = {
  email: string;
  username: string;
  displayName: string;
  title: string;
  bio: string;
  cabinetName: string;
  cabinetSize: number;
  yearsExperience: number;
  cnoaNumero: string;
  villePrincipale: string;
  region: string;
  phonePublic: string;
  emailPublic: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  specialites: string[];
  langues: string[];
  formations: Array<{ ecole: string; diplome: string; annee: number; ville: string }>;
  experiencesPhares: Array<{
    titre: string; description: string; anneeLivraison: number; surface: string; lieu: string; role: string;
  }>;
};

const ARCHIS: DemoArchi[] = [
  {
    email: "demo.archi1@citurbarea.test",
    username: "amine_archi_demo",
    displayName: "Amine El Fassi",
    title: "Architecte associé · Atelier El Fassi",
    bio: "Architecte DPLG · 14 ans d'expérience · spécialisé logements collectifs et tertiaire à Casablanca. Membre actif SNASP. Engagement pour l'architecture éco-responsable et la valorisation du patrimoine vernaculaire marocain.",
    cabinetName: "Atelier El Fassi Architectes",
    cabinetSize: 8,
    yearsExperience: 14,
    cnoaNumero: "CNOA-31405",
    villePrincipale: "Casablanca",
    region: "Casablanca-Settat",
    phonePublic: "+212522445599",
    emailPublic: "amine@atelier-elfassi.ma",
    websiteUrl: "https://atelier-elfassi.ma",
    linkedinUrl: "https://linkedin.com/in/amineelfassi",
    specialites: ["Logements collectifs", "Tertiaire", "BIM", "Patrimoine"],
    langues: ["FR", "AR", "EN", "IT"],
    formations: [
      { ecole: "École Nationale d'Architecture (ENA)", diplome: "DEA Diplôme d'État d'Architecte", annee: 2010, ville: "Rabat" },
      { ecole: "Politecnico di Milano", diplome: "Master Architecture Urbaine", annee: 2012, ville: "Milan" },
    ],
    experiencesPhares: [
      { titre: "Résidence Twin Towers Anfa", description: "48 logements collectifs haut standing R+8, coordination BIM intégrale Revit + Solibri.", anneeLivraison: 2024, surface: "6 400 m²", lieu: "Casablanca-Anfa", role: "Architecte mandataire" },
      { titre: "Villa Dar Lalla", description: "Villa contemporaine 4 façades en terre crue stabilisée, intégration paysagère.", anneeLivraison: 2022, surface: "480 m²", lieu: "Bouskoura", role: "Concepteur + suivi" },
    ],
  },
  {
    email: "demo.archi2@citurbarea.test",
    username: "salma_urb_demo",
    displayName: "Salma Berrada",
    title: "Architecte-urbaniste · Cabinet Berrada & Partners",
    bio: "Urbaniste DPLG · 12 ans d'expérience · plans d'aménagement, lotissements, études d'impact, médiation urbaine. Convictions fortes sur la mixité sociale et la sobriété foncière.",
    cabinetName: "Cabinet Berrada & Partners",
    cabinetSize: 12,
    yearsExperience: 12,
    cnoaNumero: "CNOA-29871",
    villePrincipale: "Rabat",
    region: "Rabat-Salé-Kénitra",
    phonePublic: "+212537776688",
    emailPublic: "salma@berrada-partners.ma",
    websiteUrl: "https://berrada-partners.ma",
    linkedinUrl: "https://linkedin.com/in/salmaberrada",
    specialites: ["Urbanisme", "Lotissements", "PAC/PA", "Mixité sociale"],
    langues: ["FR", "AR", "EN", "ES"],
    formations: [
      { ecole: "École Nationale d'Architecture (ENA)", diplome: "DEA mention Urbanisme", annee: 2012, ville: "Rabat" },
      { ecole: "Institut Français d'Urbanisme", diplome: "DESS Urbanisme & Aménagement", annee: 2014, ville: "Paris" },
    ],
    experiencesPhares: [
      { titre: "Plan d'Aménagement Casa-Sud", description: "Refonte PA commune Casa-Sud, 2 800 ha, étude d'impact + concertation citoyenne.", anneeLivraison: 2023, surface: "2 800 ha", lieu: "Casa-Sud", role: "Urbaniste mandataire" },
      { titre: "Lotissement Al Boustane", description: "180 lots résidentiels, VRD + équipements collectifs, label HQE Aménagement.", anneeLivraison: 2024, surface: "24 ha", lieu: "Skhirat", role: "Urbaniste + suivi" },
    ],
  },
  {
    email: "demo.archi3@citurbarea.test",
    username: "youssef_archi_demo",
    displayName: "Youssef Lahlou",
    title: "Jeune architecte · Studio Lahlou",
    bio: "Jeune architecte diplômé ENA 2022 · spécialisation BIM/REVIT · projet de thèse sur l'architecture vernaculaire amazighe et son intégration contemporaine. Membre actif ANJAUM.",
    cabinetName: "Studio Lahlou (solo)",
    cabinetSize: 2,
    yearsExperience: 4,
    cnoaNumero: "CNOA-42198",
    villePrincipale: "Marrakech",
    region: "Marrakech-Safi",
    phonePublic: "+212661334455",
    emailPublic: "youssef@studio-lahlou.ma",
    linkedinUrl: "https://linkedin.com/in/youssef-lahlou-arch",
    specialites: ["Architecture vernaculaire", "BIM Revit", "Réhabilitation"],
    langues: ["FR", "AR", "EN", "BERBERE"],
    formations: [
      { ecole: "École Nationale d'Architecture (ENA)", diplome: "DEA Diplôme d'État d'Architecte", annee: 2022, ville: "Rabat" },
    ],
    experiencesPhares: [
      { titre: "Réhabilitation Ksar Aït-Ben-Haddou (collaborateur)", description: "Projet de réhabilitation d'un ksar UNESCO, mission de conservation architecturale.", anneeLivraison: 2024, surface: "1 200 m²", lieu: "Ouarzazate", role: "Architecte collaborateur" },
    ],
  },
];

async function main() {
  console.log("🏗  Seed démo 3 architectes pour réunion mai 2026");
  console.log("══════════════════════════════════════════════════════════");

  // 1. OWNER de référence
  const owner = await prisma.user.findFirst({ where: { email: "owner@citurbarea.ma" } });
  if (!owner) throw new Error("OWNER owner@citurbarea.ma introuvable. Lance seed-test-pros.ts d'abord.");

  // 2. Crée 3 architectes
  const created: Array<{ user: any; profile: any; seed: DemoArchi }> = [];
  for (const a of ARCHIS) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email, username: a.username, passwordHash,
        role: "CLIENT", plan: "PRO", isActive: true,
        emailVerifiedAt: new Date(),
      },
    });
    const profile = await prisma.proProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: a.displayName, title: a.title, bio: a.bio,
        metier: "ARCHITECTE" as any, classeBTP: "HC" as any,
        cabinetName: a.cabinetName, cabinetSize: a.cabinetSize, cabinetStatus: "ASSOCIE",
        yearsExperience: a.yearsExperience, cnoaNumero: a.cnoaNumero,
        villePrincipale: a.villePrincipale, regions: [a.region],
        phonePublic: a.phonePublic, emailPublic: a.emailPublic,
        websiteUrl: a.websiteUrl, linkedinUrl: a.linkedinUrl,
        specialites: a.specialites, langues: a.langues,
        agrements: [a.cnoaNumero],
        formations: a.formations as any,
        experiencesPhares: a.experiencesPhares as any,
        isVerified: true,
        disponibilite: "DISPONIBLE",
        tarifsRange: "4-6% du coût des travaux selon mission",
      },
      create: {
        userId: user.id,
        displayName: a.displayName, title: a.title, bio: a.bio,
        metier: "ARCHITECTE" as any, classeBTP: "HC" as any,
        cabinetName: a.cabinetName, cabinetSize: a.cabinetSize, cabinetStatus: "ASSOCIE",
        yearsExperience: a.yearsExperience, cnoaNumero: a.cnoaNumero,
        villePrincipale: a.villePrincipale, regions: [a.region],
        phonePublic: a.phonePublic, emailPublic: a.emailPublic,
        websiteUrl: a.websiteUrl, linkedinUrl: a.linkedinUrl,
        specialites: a.specialites, langues: a.langues,
        agrements: [a.cnoaNumero],
        formations: a.formations as any,
        experiencesPhares: a.experiencesPhares as any,
        isVerified: true,
        disponibilite: "DISPONIBLE",
        tarifsRange: "4-6% du coût des travaux selon mission",
        connectionsCount: 0,
      },
    });
    console.log(`  ✓ ${a.email} → ${a.displayName} (${a.cnoaNumero})`);
    created.push({ user, profile, seed: a });
  }

  // 3. Crée le cercle de démo "demo-reunion-mai-2026"
  const cercleSlug = "demo-reunion-mai-2026";
  const existingCercle = await prisma.cercle.findUnique({ where: { slug: cercleSlug } });
  let cercle = existingCercle;
  if (!cercle) {
    cercle = await prisma.cercle.create({
      data: {
        slug: cercleSlug,
        name: "Démo Réunion Architectes — Mai 2026",
        description: "Cercle de démonstration pour la réunion d'onboarding des architectes adhérents SNASP/ANJAUM. Espace de test pour vérifier posts, commentaires, likes, chat et visios.",
        visibility: "PUBLIC",
        region: null,
        themes: ["Onboarding", "Démo", "SNASP", "ANJAUM"],
        membershipFlow: "SIMPLE",
        ownerId: owner.id,
        members: { create: { userId: owner.id, role: "OWNER", status: "ACTIVE" } },
        moderators: { create: { userId: owner.id } },
      },
    });
    console.log(`  ✓ Cercle créé : /${cercleSlug}`);
  } else {
    console.log(`  ↻ Cercle ${cercleSlug} existe déjà`);
  }

  // 4. Ajoute les 3 archis comme membres ACTIVE
  for (const a of created) {
    await prisma.cercleMembership.upsert({
      where: { cercleId_userId: { cercleId: cercle.id, userId: a.user.id } },
      update: { status: "ACTIVE", role: "MEMBER" },
      create: { cercleId: cercle.id, userId: a.user.id, status: "ACTIVE", role: "MEMBER" },
    });
  }
  console.log(`  ✓ 3 architectes ajoutés comme membres ACTIVE`);

  // 5. Crée 1 post root par Amine + 2 commentaires (Salma + Youssef)
  const existingPost = await prisma.cerclePost.findFirst({
    where: { cercleId: cercle.id, parentId: null, authorId: created[0].user.id },
  });
  let post = existingPost;
  if (!post) {
    post = await prisma.cerclePost.create({
      data: {
        cercleId: cercle.id, authorId: created[0].user.id,
        title: "Adhésion SNASP : ce que ça change concrètement pour nous",
        body: `Salam à tous,

Suite à notre réunion d'hier soir, je voulais ouvrir la discussion sur les avantages concrets de notre adhésion SNASP + accès CITURBAREA :

1. **Barème CNOA respecté** : on arrête de descendre à 2.5% sur les lotissements > 5 ha
2. **Mutualisation des outils** : licences BIM groupées, partage de CCTP types
3. **Mentorat** : les confrères seniors accompagnent les jeunes installés (cf ANJAUM)
4. **Plateforme CITURBAREA** : annuaire pro vérifié, chat temps réel, visios Jitsi intégrées, accès aux portes P1-P6 pour les demandes clients

Vous voyez d'autres bénéfices à mettre en avant pour convaincre les confrères ?

À demain en visio à 19h pour le live d'onboarding 👋`,
        upvotes: 2,
      },
    });
    await prisma.cerclePost.create({
      data: {
        cercleId: cercle.id, authorId: created[1].user.id, parentId: post.id,
        body: "Excellente synthèse Amine. J'ajouterais : l'accès au feed projets phares permet de voir ce que font les confrères et de croiser nos références. C'est inédit au Maroc.",
      },
    });
    await prisma.cerclePost.create({
      data: {
        cercleId: cercle.id, authorId: created[2].user.id, parentId: post.id,
        body: "Côté jeune diplômé, le mentorat ANJAUM c'est ce qui me semble le plus précieux. J'ai déjà eu 2 échanges avec un confrère senior, gain de temps énorme sur les premiers contrats.",
      },
    });
    await prisma.cerclePost.update({
      where: { id: post.id },
      data: { replyCount: 2 },
    });
    console.log(`  ✓ 1 post + 2 commentaires + 2 likes`);
  } else {
    console.log(`  ↻ Post démo existe déjà`);
  }

  // 6. Crée 5 messages de chat
  const chatLines = [
    { authorIdx: 0, body: "Salam à tous, bienvenue dans le cercle démo 👋" },
    { authorIdx: 1, body: "Merci Amine ! L'interface est vraiment soignée." },
    { authorIdx: 2, body: "Hâte d'utiliser ça en prod avec les confrères." },
    { authorIdx: 0, body: "On teste la visio Jitsi à 19h ce soir, je crée la salle." },
    { authorIdx: 1, body: "Je serai là 👍" },
  ];
  const existingMessages = await prisma.cercleMessage.count({ where: { cercleId: cercle.id } });
  if (existingMessages === 0) {
    const baseTime = Date.now() - 25 * 60_000;
    for (let i = 0; i < chatLines.length; i++) {
      await prisma.cercleMessage.create({
        data: {
          cercleId: cercle.id,
          authorId: created[chatLines[i].authorIdx].user.id,
          body: chatLines[i].body,
          createdAt: new Date(baseTime + i * 60_000),
        },
      });
    }
    console.log(`  ✓ 5 messages chat`);
  } else {
    console.log(`  ↻ Messages chat existent déjà (${existingMessages})`);
  }

  // 7. Crée 1 LiveRoom Jitsi programmée
  const tomorrow = new Date(Date.now() + 24 * 3600_000);
  tomorrow.setHours(19, 0, 0, 0);
  const existingRoom = await prisma.liveRoom.findFirst({
    where: { cercleId: cercle.id, status: "SCHEDULED" },
  });
  if (!existingRoom) {
    const slugRoom = `onboarding-jitsi-${Date.now().toString(36)}`;
    await prisma.liveRoom.create({
      data: {
        cercleId: cercle.id,
        hostId: created[0].user.id,
        slug: slugRoom,
        title: "Visio onboarding architectes — Démo Jitsi",
        description: "Réunion de démo Jitsi pour les 3 architectes test. Caméra, micro, partage d'écran.",
        provider: "JITSI" as any,
        livekitRoomName: `livekit-${slugRoom}`,
        jitsiRoomName: `cit-demo-${slugRoom}`,
        scheduledAt: tomorrow,
        maxParticipants: 50,
        status: "SCHEDULED",
      },
    });
    console.log(`  ✓ LiveRoom Jitsi programmée pour ${tomorrow.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`);
  } else {
    console.log(`  ↻ LiveRoom existe déjà`);
  }

  // 8. Adhésions SNASP validées (carte d'adhérent) pour les 3
  const snasp = await prisma.cercle.findUnique({ where: { slug: "snasp-architectes-prive" } });
  if (snasp) {
    for (const a of created) {
      const existingMem = await prisma.cercleMembership.findUnique({
        where: { cercleId_userId: { cercleId: snasp.id, userId: a.user.id } },
      });
      if (!existingMem || existingMem.status !== "ACTIVE" || !existingMem.cardNumber) {
        // Génère cardNumber unique
        const last = await prisma.cercleMembership.findFirst({
          where: { cardNumber: { startsWith: "SNASP-2026" } },
          orderBy: { cardNumber: "desc" },
          select: { cardNumber: true },
        });
        let nextN = 1;
        if (last?.cardNumber) {
          const m = last.cardNumber.match(/(\d+)$/);
          if (m) nextN = parseInt(m[1], 10) + 1;
        }
        const cardNumber = `SNASP-2026-${String(nextN).padStart(4, "0")}`;
        await prisma.cercleMembership.upsert({
          where: { cercleId_userId: { cercleId: snasp.id, userId: a.user.id } },
          update: {
            status: "ACTIVE", role: "MEMBER", memberType: "ACTIF" as any,
            cardNumber, cotisationStatus: "A_JOUR" as any,
            cotisationExpireAt: new Date(Date.now() + 365 * 24 * 3600_000),
          },
          create: {
            cercleId: snasp.id, userId: a.user.id,
            status: "ACTIVE", role: "MEMBER", memberType: "ACTIF" as any,
            cardNumber, cotisationStatus: "A_JOUR" as any,
            cotisationExpireAt: new Date(Date.now() + 365 * 24 * 3600_000),
          },
        });
        console.log(`  ✓ Adhésion SNASP ${cardNumber} pour ${a.seed.displayName}`);
      }
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✅ DÉMO PRÊTE POUR LA RÉUNION ARCHITECTES");
  console.log("══════════════════════════════════════════════════════════\n");
  console.log("🔑 CREDENTIALS (mot de passe commun : DemoArchi2026!)\n");
  for (const a of created) {
    console.log(`  📧 ${a.seed.email}`);
    console.log(`     ${a.seed.displayName} · ${a.seed.cnoaNumero}\n`);
  }
  console.log("🌐 À TESTER (3 onglets différents, 1 connecté par profil)");
  console.log("  Login          → https://citurb-web-production.up.railway.app/login");
  console.log("  Cercle démo    → https://citurb-web-production.up.railway.app/cercles/" + cercleSlug);
  console.log("  Chat démo      → https://citurb-web-production.up.railway.app/cercles/" + cercleSlug + "/chat");
  console.log("  Salle vidéo    → onglet 'Salles vidéo' dans /cercles/" + cercleSlug);
  console.log("  Profils :");
  for (const a of created) {
    console.log("    https://citurb-web-production.up.railway.app/cercles/profile/" + a.user.id);
  }
  console.log("  Cercle SNASP   → https://citurb-web-production.up.railway.app/cercles/snasp-architectes-prive");
  console.log("  Adhérer SNASP  → https://citurb-web-production.up.railway.app/cercles/snasp-architectes-prive/rejoindre");
  console.log("");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
