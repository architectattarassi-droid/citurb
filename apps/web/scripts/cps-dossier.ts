/**
 * CPS type + quantitatif général + BPDE d'un projet, en Markdown et en HTML
 * imprimable (même moteur que /chiffrage et le bouton du back-office).
 *
 *   npx tsx apps/web/scripts/cps-dossier.ts <projet.json> <sortie-sans-extension> [standing]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chiffrer, type ProjetInput } from "../src/domain/chiffrage";
import { documentHtml, genererCps } from "../src/domain/cps";

const [, , fichier, sortie, standing] = process.argv;
if (!fichier || !sortie) throw new Error("usage : cps-dossier.ts <projet.json> <sortie> [standing]");
const p = JSON.parse(readFileSync(fichier, "utf8")) as ProjetInput & { titre?: string; commune?: string; maitreOuvrage?: string };
const r = chiffrer({ ...p, standing: (standing as ProjetInput["standing"]) ?? p.standing, etapes: { terrain: true, finitions: true } });
const nom = p.titre?.replace(/^Estimation[^—]*—\s*/i, "") ?? "Projet";
const doc = genererCps(r, { nomProjet: nom, commune: p.commune ?? p.ville, maitreOuvrage: p.maitreOuvrage });
writeFileSync(`${sortie}.md`, doc.markdown, "utf8");
writeFileSync(`${sortie}.html`, documentHtml(`CPS — ${nom}`, doc.markdown), "utf8");
console.log(`écrit : ${sortie}.md et ${sortie}.html — ${Math.round(doc.totalHT).toLocaleString("fr-FR")} DH HT, ${doc.bpde.length} lots`);
