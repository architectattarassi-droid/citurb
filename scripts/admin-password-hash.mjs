#!/usr/bin/env node
/**
 * Génère les secrets du back-office (mode mot de passe, sans Cloudflare Access).
 *
 *   node scripts/admin-password-hash.mjs              → demande le mot de passe (masqué, deux fois)
 *   echo motdepasse | node scripts/admin-password-hash.mjs   → lit stdin (non interactif)
 *   option : --iterations 300000   (défaut 210000, minimum 210000)
 *
 * Imprime ADMIN_PASSWORD_HASH et un ADMIN_SESSION_SECRET aléatoire, à coller
 * comme secrets Cloudflare (type Secret). N'écrit rien sur disque.
 *
 * Algorithme identique à functions/_lib/adminSession.ts : PBKDF2-HMAC-SHA256
 * enchaîné par passes de ≤ 100 000 itérations (limite du runtime Workers).
 */
import { pbkdf2Sync, randomBytes } from "node:crypto";

const PASSE_MAX = 100_000;
const i = process.argv.indexOf("--iterations");
const iterations = i > 0 ? Number(process.argv[i + 1]) : 210_000;
if (!Number.isInteger(iterations) || iterations < 210_000 || iterations > 2_000_000) {
  console.error("--iterations doit être un entier entre 210000 et 2000000.");
  process.exit(1);
}

function saisieMasquee(question) {
  return new Promise((resolve) => {
    process.stderr.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let v = "";
    const surTouche = (s) => {
      for (const ch of s) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false); stdin.pause(); stdin.off("data", surTouche);
          process.stderr.write("\n");
          return resolve(v);
        }
        if (ch === "\u0003") { process.stderr.write("\n"); process.exit(130); }
        if (ch === "\u007f" || ch === "\b") v = v.slice(0, -1);
        else if (ch >= " ") v += ch;
      }
    };
    stdin.on("data", surTouche);
  });
}

async function lireStdin() {
  let d = "";
  for await (const c of process.stdin) d += c;
  return d.replace(/\r?\n$/, "");
}

let motDePasse;
if (process.stdin.isTTY) {
  motDePasse = await saisieMasquee("Mot de passe du back-office : ");
  const bis = await saisieMasquee("Confirmer : ");
  if (bis !== motDePasse) { console.error("Les deux saisies diffèrent."); process.exit(1); }
} else {
  motDePasse = await lireStdin();
}
if (motDePasse.length < 12) { console.error("12 caractères minimum (une phrase de passe longue est idéale)."); process.exit(1); }
if (motDePasse.length > 1024) { console.error("1024 caractères maximum."); process.exit(1); }

const sel = randomBytes(16);
let cle = Buffer.from(motDePasse, "utf8");
for (let reste = iterations; reste > 0; reste -= PASSE_MAX) cle = pbkdf2Sync(cle, sel, Math.min(reste, PASSE_MAX), 32, "sha256");

console.log("");
console.log(`ADMIN_PASSWORD_HASH=pbkdf2c$sha256$${iterations}$${sel.toString("base64")}$${cle.toString("base64")}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
console.log("");
console.log("Copiez chaque valeur (la partie après le signe =) dans Cloudflare, type « Secret ».");
