/**
 * reset-admin-password.ts — réinitialise le mot de passe d'un AdminUser.
 *
 * Usage local :
 *   npx ts-node --transpile-only apps/api/scripts/reset-admin-password.ts \
 *     architectattarassi@gmail.com "MonNouveauMotDePasseSolide!"
 *
 * Usage Railway (via dashboard shell ou railway run) :
 *   DATABASE_URL="..." npx ts-node --transpile-only apps/api/scripts/reset-admin-password.ts \
 *     architectattarassi@gmail.com "MonNouveauMotDePasseSolide!"
 *
 * Sécurité :
 *  - bcrypt cost 14 (identique au seed-admin original)
 *  - le mot de passe doit faire ≥12 caractères, au moins 1 maj, 1 min, 1 chiffre, 1 symbole
 *  - Vérifie que l'AdminUser existe AVANT d'écrire
 *  - Idempotent : on peut le relancer N fois sans casser quoi que ce soit
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function validatePassword(p: string): string | null {
  if (p.length < 12) return "min 12 caractères";
  if (!/[A-Z]/.test(p)) return "manque une majuscule";
  if (!/[a-z]/.test(p)) return "manque une minuscule";
  if (!/[0-9]/.test(p)) return "manque un chiffre";
  if (!/[^A-Za-z0-9]/.test(p)) return "manque un symbole (!@#$...)";
  return null;
}

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error("Usage : reset-admin-password.ts <email> <nouveauMotDePasse>");
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const password = passwordArg;

  const err = validatePassword(password);
  if (err) {
    console.error(`❌ Mot de passe invalide : ${err}`);
    process.exit(1);
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    console.error(`❌ AdminUser introuvable pour ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 14);
  await prisma.adminUser.update({
    where: { email },
    data: { passwordHash, isActive: true, suspendedAt: null, suspendedReason: null },
  });

  console.log(`✓ Mot de passe réinitialisé pour ${email}`);
  console.log(`  role: ${admin.role}`);
  console.log(`  displayName: ${admin.displayName}`);
  console.log(`  Tu peux maintenant te connecter via https://admin.citurbarea.com/admin/login`);
  console.log(`  Flow : email → password → OTP email → OTP SMS → (WebAuthn si déjà enregistré)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
