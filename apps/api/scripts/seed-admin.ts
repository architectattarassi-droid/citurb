/* eslint-disable */
/**
 * seed-admin.ts — Sprint H init
 *
 * Crée :
 *  - 1 SUPER_ADMIN (toi)        : architectattarassi@gmail.com
 *  - 1 ADMIN_SUPPORT (Benaissa) : attarassi@gmail.com
 *
 * Mots de passe générés aléatoirement (24 caractères forts) affichés à
 * l'écran à la fin. À noter et changer au premier login.
 *
 * IDEMPOTENT : si l'admin existe déjà, le mot de passe N'EST PAS regénéré
 * (sinon tu perdrais l'accès). Pour reset, supprimer la ligne en DB d'abord.
 *
 * Usage local : npx ts-node --transpile-only apps/api/scripts/seed-admin.ts
 * Usage prod  : DATABASE_URL=... npx ts-node --transpile-only apps/api/scripts/seed-admin.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function generateStrongPassword(length = 24): string {
  // Alphabet : 70 caractères (sans confondables I/l/1/O/0 pour faciliter la lecture manuelle)
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*-_+=";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHA[bytes[i] % ALPHA.length];
  }
  return out;
}

type Admin = {
  email: string;
  displayName: string;
  phoneE164: string;
  role: "SUPER_ADMIN" | "ADMIN_SUPPORT" | "ADMIN_AUDIT" | "ADMIN_READ_ONLY";
};

const ADMINS: Admin[] = [
  {
    email: "architectattarassi@gmail.com",
    displayName: "Yassine Attarassi",
    phoneE164: "+212700127892",
    role: "SUPER_ADMIN",
  },
  {
    email: "attarassi@gmail.com",
    displayName: "Benaissa Attarassi",
    phoneE164: "+212661362476",
    role: "ADMIN_SUPPORT",
  },
];

async function main() {
  console.log("🔐 Seed admin — Sprint H");
  console.log("══════════════════════════════════════════════════════════");

  // Garde-fou : pas plus d'1 SUPER_ADMIN
  const existingSuperAdmins = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN" } });
  if (existingSuperAdmins > 1) {
    throw new Error(`Anomalie : ${existingSuperAdmins} SUPER_ADMIN détectés (max 1). Vérifier la DB.`);
  }

  const created: Array<{ email: string; password?: string; status: "created" | "existing" }> = [];

  for (const a of ADMINS) {
    const existing = await prisma.adminUser.findUnique({ where: { email: a.email } });
    if (existing) {
      console.log(`  ↻ ${a.email} → existe déjà (role=${existing.role}). Pas de regen password.`);
      created.push({ email: a.email, status: "existing" });
      continue;
    }

    if (a.role === "SUPER_ADMIN" && existingSuperAdmins >= 1) {
      console.log(`  ⚠ SUPER_ADMIN déjà existant, ${a.email} créé en ADMIN_SUPPORT à la place`);
      a.role = "ADMIN_SUPPORT";
    }

    const password = generateStrongPassword(24);
    const passwordHash = await bcrypt.hash(password, 14);

    await prisma.adminUser.create({
      data: {
        email: a.email,
        passwordHash,
        role: a.role as any,
        displayName: a.displayName,
        phoneE164: a.phoneE164,
        emailVerifiedAt: new Date(), // pré-vérifié pour les seeds
        phoneVerifiedAt: new Date(),
        isActive: true,
      },
    });

    console.log(`  ✓ ${a.email} créé (role=${a.role}, tél=${a.phoneE164})`);
    created.push({ email: a.email, password, status: "created" });
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("🎉 SEED ADMIN TERMINÉ");
  console.log("══════════════════════════════════════════════════════════\n");

  const newOnes = created.filter(c => c.status === "created");
  if (newOnes.length === 0) {
    console.log("Aucun nouveau admin créé (tous existaient déjà).\n");
  } else {
    console.log("🔑 MOTS DE PASSE TEMPORAIRES (à noter et changer au premier login) :\n");
    for (const c of newOnes) {
      console.log(`  📧 ${c.email}`);
      console.log(`     🔐 ${c.password}\n`);
    }
    console.log("⚠️  Ces mots de passe ne seront PAS regénérés si tu relances ce seed.");
    console.log("⚠️  Note-les MAINTENANT dans un gestionnaire de mots de passe (1Password / Bitwarden / KeePass).\n");
  }

  console.log("Pour se connecter : https://admin.citurbarea.com/login (ou citurb-web pendant DNS)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
