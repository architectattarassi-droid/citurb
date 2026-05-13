/* eslint-disable */
/**
 * seed-post-visio.ts — Post épinglé avec replay visio YouTube live
 *
 * Crée (idempotent) un post épinglé dans le cercle demo-reunion-mai-2026
 * mettant en avant le replay de la visio CITURBAREA de la semaine dernière.
 * Le lien YouTube live sera automatiquement embeddé par MediaEmbed.
 *
 * Usage local : npx ts-node --transpile-only apps/api/scripts/seed-post-visio.ts
 * Usage prod  : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-post-visio.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const YOUTUBE_URL = "https://www.youtube.com/live/jIWwltfaGhM?si=pYNRwQlKuEp95zzj";
const POST_TITLE = "🎥 Replay visio CITURBAREA Cercles — Semaine dernière";
const POST_BODY = `Salam à tous,

Pour celles et ceux qui n'ont pas pu suivre la visio en direct la semaine dernière, voici le replay :

${YOUTUBE_URL}

**Sujets abordés :**
- Présentation de la plateforme CITURBAREA et des Cercles pro
- Modules d'adhésion SNASP & ANJAUM (cotisation 1 000 MAD/an, accès CITURBAREA inclus)
- Annuaire pro BTP, chat temps réel, visios Jitsi intégrées
- Démo concrète : créer un cercle, inviter, poster, échanger

N'hésitez pas à commenter ce post pour partager vos retours ou questions. La prochaine visio est programmée pour la semaine prochaine — vous serez notifiés par email.

— L'équipe CITURBAREA Cercles`;

async function main() {
  console.log("📌 Création post épinglé visio YouTube replay");
  console.log("══════════════════════════════════════════════════════════");

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", email: "owner@citurbarea.ma" } });
  if (!owner) throw new Error("OWNER owner@citurbarea.ma introuvable.");

  const cercle = await prisma.cercle.findUnique({ where: { slug: "demo-reunion-mai-2026" } });
  if (!cercle) throw new Error("Cercle demo-reunion-mai-2026 introuvable.");

  // Vérifie qu'on n'a pas déjà créé ce post (par titre)
  const existing = await prisma.cerclePost.findFirst({
    where: { cercleId: cercle.id, title: POST_TITLE, deletedAt: null },
  });

  if (existing) {
    // Update : assure que c'est bien épinglé + body à jour
    await prisma.cerclePost.update({
      where: { id: existing.id },
      data: { body: POST_BODY, isPinned: true },
    });
    console.log(`  ↻ Post déjà existant — mis à jour + épinglé (id=${existing.id})`);
  } else {
    const post = await prisma.cerclePost.create({
      data: {
        cercleId: cercle.id,
        authorId: owner.id,
        title: POST_TITLE,
        body: POST_BODY,
        isPinned: true,
        upvotes: 12,
      },
    });
    console.log(`  ✓ Post épinglé créé (id=${post.id})`);
  }

  // Aussi pinner dans SNASP et ANJAUM pour visibilité maximale
  for (const slug of ["snasp-architectes-prive", "anjaum-jeunes-architectes"]) {
    const cer = await prisma.cercle.findUnique({ where: { slug } });
    if (!cer) { console.log(`  ⚠ Cercle ${slug} introuvable`); continue; }
    const ex = await prisma.cerclePost.findFirst({
      where: { cercleId: cer.id, title: POST_TITLE, deletedAt: null },
    });
    if (ex) {
      await prisma.cerclePost.update({ where: { id: ex.id }, data: { body: POST_BODY, isPinned: true } });
      console.log(`  ↻ ${slug} : post existant mis à jour`);
    } else {
      await prisma.cerclePost.create({
        data: {
          cercleId: cer.id,
          authorId: owner.id,
          title: POST_TITLE,
          body: POST_BODY,
          isPinned: true,
          upvotes: 8,
        },
      });
      console.log(`  ✓ ${slug} : post épinglé créé`);
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✅ Post replay YouTube épinglé dans 3 cercles :");
  console.log("  - /cercles/demo-reunion-mai-2026");
  console.log("  - /cercles/snasp-architectes-prive");
  console.log("  - /cercles/anjaum-jeunes-architectes");
  console.log("\nLe lien YouTube sera automatiquement transformé en lecteur vidéo.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
