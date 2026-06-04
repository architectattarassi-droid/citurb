/**
 * bootstrap-founder.ts — crée/upsert directement un User shadow ADMIN sans MFA.
 *
 * RAISON D'ÊTRE : débloquer l'accès aux endpoints /api/cc/* (backoffice
 * Command Center) sans dépendre du vault MFA (qui nécessite RESEND_API_KEY +
 * TWILIO_AUTH_TOKEN posés en prod pour fonctionner). Quand ces env ne sont
 * pas encore configurées, le vault est inutilisable et le founder ne peut
 * pas se logguer.
 *
 * Ce script crée un User classique avec role ADMIN et un password connu.
 * Le founder se logue ensuite via /login normal → JWT 7j → /cc/* débloqué.
 *
 * SÉCURITÉ : ce script ne s'exécute QUE depuis l'environnement Railway
 * (DATABASE_URL prod accessible). Pas d'endpoint HTTP, donc pas de surface
 * d'attaque internet. Idempotent.
 *
 * Usage Railway dashboard shell :
 *   npx ts-node --transpile-only apps/api/scripts/bootstrap-founder.ts \
 *     architectattarassi@gmail.com 'MonPassFort!2026'
 *
 * Usage Railway CLI (avec projet linké) :
 *   railway run --service citurb npx ts-node --transpile-only \
 *     apps/api/scripts/bootstrap-founder.ts \
 *     architectattarassi@gmail.com 'MonPassFort!2026'
 */
import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function validatePassword(p: string): string | null {
  if (p.length < 10) return "min 10 caractères";
  if (!/[A-Z]/.test(p)) return "manque une majuscule";
  if (!/[a-z]/.test(p)) return "manque une minuscule";
  if (!/[0-9]/.test(p)) return "manque un chiffre";
  return null;
}

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error("Usage : bootstrap-founder.ts <email> <password>");
    console.error("Exemple : bootstrap-founder.ts architectattarassi@gmail.com 'MonPassFort!2026'");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const password = passwordArg;

  const err = validatePassword(password);
  if (err) {
    console.error(`❌ Mot de passe invalide : ${err}`);
    console.error("   Règles : ≥10 chars + 1 majuscule + 1 minuscule + 1 chiffre");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Récupère l'AdminUser pour copier le displayName / phone si disponible.
  const adminUser = await prisma.adminUser.findUnique({ where: { email } });

  const existing = await prisma.user.findUnique({ where: { email } });
  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role: "ADMIN",
        isActive: true,
        emailVerifiedAt: existing.emailVerifiedAt || new Date(),
      },
    });
    console.log(`↻ User existant mis à jour pour ${email}`);
  } else {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        username: adminUser?.displayName || email.split("@")[0],
        phone: adminUser?.phoneE164,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`✓ User créé pour ${email}`);
  }

  console.log(``);
  console.log(`  id      : ${user.id}`);
  console.log(`  email   : ${user.email}`);
  console.log(`  role    : ${user.role}`);
  console.log(`  active  : ${user.isActive}`);
  console.log(``);
  console.log(`Connexion :`);
  console.log(`  1. https://citurbarea.com/login`);
  console.log(`  2. email = ${email}`);
  console.log(`  3. password = (celui que tu viens de définir)`);
  console.log(`  4. Tu obtiens un User JWT 7j → /cc/* débloqué`);
  console.log(``);
  console.log(`Note : ce compte User coexiste avec ton AdminUser vault (rôles séparés).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
