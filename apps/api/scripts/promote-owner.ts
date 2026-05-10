/* eslint-disable */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = "owner@citurbarea.ma";
  const slugs = ["snasp-architectes-prive", "anjaum-jeunes-architectes", "onigt-geometres", "bim-maroc"];

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) throw new Error(`User ${ownerEmail} introuvable. Lance seed-test-pros.ts d'abord.`);

  for (const slug of slugs) {
    const cercle = await prisma.cercle.findUnique({ where: { slug } });
    if (!cercle) { console.log(`  ✗ ${slug} introuvable, skip`); continue; }

    // Promote: ensure membership ACTIVE + role OWNER + moderator entry
    await prisma.cercleMembership.upsert({
      where: { cercleId_userId: { cercleId: cercle.id, userId: owner.id } },
      update: { status: "ACTIVE", role: "OWNER" },
      create: { cercleId: cercle.id, userId: owner.id, status: "ACTIVE", role: "OWNER" },
    });
    await prisma.cercleModerator.upsert({
      where: { cercleId_userId: { cercleId: cercle.id, userId: owner.id } },
      update: {},
      create: { cercleId: cercle.id, userId: owner.id },
    });
    console.log(`  ✓ ${slug} → owner@citurbarea.ma promu OWNER+MODERATOR`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
