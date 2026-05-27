/* eslint-disable */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [users, pros, cercles, posts, messages, prestataires, sociteSuppliers] = await Promise.all([
    prisma.user.count(),
    prisma.proProfile.count(),
    prisma.cercle.count(),
    prisma.cerclePost.count(),
    prisma.cercleMessage.count(),
    prisma.prestataire.count(),
    prisma.supplier?.count?.().catch(() => 0) ?? 0,
  ]);

  console.log("=== ÉTAT DB ===");
  console.log({ users, pros, cercles, posts, messages, prestataires });

  // Échantillon prestataires
  const samples = await prisma.prestataire.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log("\nÉchantillon Prestataires:");
  for (const p of samples) {
    console.log(` - ${p.nom} | ${p.type} | spec=[${p.specialites.join(", ")}] | comm=[${p.communes.join(", ")}] | tel=${p.tel ?? "—"}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
