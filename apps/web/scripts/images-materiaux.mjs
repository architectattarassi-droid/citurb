#!/usr/bin/env node
/**
 * images-materiaux.mjs — une image de référence par FAMILLE du catalogue des
 * matériaux, depuis Pixabay (Pixabay Content License : usage commercial
 * autorisé, sans attribution obligatoire ; crédit conservé quand même).
 * Reprend le principe de l'ancien script de la marketplace
 * (apps/api/src/modules/cercles/marketplace.service.ts, populateReferentielPhotos) :
 * l'image est TÉLÉCHARGÉE et hébergée par CITURBAREA (Pixabay interdit le
 * lien permanent vers ses URL), jamais copiée d'un site commercial.
 *
 * Usage (à lancer par une personne, après relecture des images) :
 *   PIXABAY_KEY=xxxx node apps/web/scripts/images-materiaux.mjs [--force]
 * Sortie : apps/web/public/materiaux/img/<famille>.jpg + apps/web/src/domain/materiaux/images.json
 * Vérifier chaque image (pertinence, aucune marque ni personne identifiable)
 * avant de commiter ; retirer l'entrée sinon : l'icône de famille s'affiche.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE = path.join(RACINE, "src/domain/materiaux/catalogue.ts");
const MANIFESTE = path.join(RACINE, "src/domain/materiaux/images.json");
const DOSSIER = path.join(RACINE, "public/materiaux/img");
const cle = process.env.PIXABAY_KEY;
const force = process.argv.includes("--force");
if (!cle) { console.error("PIXABAY_KEY manquante."); process.exit(1); }

/** Mots-clés (anglais, recherche Pixabay) par famille du catalogue. */
const MOTS = {
  "Aciers d'armature": "steel rebar", "Liants": "cement bags", "Mortiers": "mortar trowel", "Enduits": "plaster wall",
  "Granulats": "gravel sand pile", "Pierres": "rubble stone", "Bétons": "concrete pouring", "Blocs & briques": "concrete blocks",
  "Planchers": "concrete slab construction", "Coffrages": "formwork plywood", "Films & accessoires": "construction plastic sheet",
  "Membranes": "roof waterproofing membrane", "Thermique": "insulation panels", "Carrelage": "ceramic floor tiles", "Marbre": "marble slab",
  "Zellige": "moroccan zellige", "Peintures": "paint bucket roller", "Canalisations": "pvc pipes", "Sanitaires": "bathroom toilet sink",
  "Robinetterie": "faucet tap", "Câbles": "electrical cable", "Appareillage": "electrical outlet switch", "Luminaires": "led ceiling light",
  "Fenêtres": "aluminium window", "Portes": "interior door", "Production froid": "air conditioner unit", "Plaques": "plasterboard",
};

const src = fs.readFileSync(CATALOGUE, "utf8");
const familles = [...new Set([...src.matchAll(/"[A-Z_]+", "([^"]+)", \[/g)].map((m) => m[1]))];
const manifeste = JSON.parse(fs.readFileSync(MANIFESTE, "utf8"));
fs.mkdirSync(DOSSIER, { recursive: true });
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const f of familles) {
  const q = MOTS[f];
  if (!q || (manifeste.familles[f] && !force)) continue;
  const r = await fetch(`https://pixabay.com/api/?key=${cle}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=3&orientation=horizontal`);
  if (!r.ok) { console.warn(`${f} : Pixabay ${r.status}`); continue; }
  const hit = (await r.json())?.hits?.[0];
  if (!hit?.webformatURL) { console.warn(`${f} : aucune image`); continue; }
  const img = await fetch(hit.webformatURL);
  if (!img.ok) { console.warn(`${f} : téléchargement échoué`); continue; }
  const fichier = `${slug(f)}.jpg`;
  fs.writeFileSync(path.join(DOSSIER, fichier), Buffer.from(await img.arrayBuffer()));
  manifeste.familles[f] = {
    url: `/materiaux/img/${fichier}`, legende: { fr: f }, licence: "Pixabay Content License (https://pixabay.com/service/license-summary/)",
    source: hit.pageURL, auteur: hit.user,
  };
  console.log(`${f} → ${fichier} (${hit.pageURL})`);
}
fs.writeFileSync(MANIFESTE, `${JSON.stringify(manifeste, null, 2)}\n`);
console.log("images.json mis à jour : relire chaque image avant de commiter.");
