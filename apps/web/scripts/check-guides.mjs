/**
 * Vérifie les guides de apps/web/seo/guides/*.json avant publication
 * (build-seo.mjs les transforme en /guide/<slug>.html).
 *   node apps/web/scripts/check-guides.mjs [fichier.json…]
 * Échec (code 1) si un guide est incomplet ou mal formé.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../seo/guides");
const fichiers = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => path.resolve(f))
  : fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(DIR, f)) : [];

const BALISES_OK = new Set(["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "table", "thead", "tbody", "tr", "th", "td", "div", "br", "small", "blockquote", "span"]);
let erreurs = 0;
const slugs = new Set();
const err = (f, m) => { erreurs++; console.error(`✗ ${path.basename(f)} : ${m}`); };

for (const f of fichiers) {
  let g;
  try { g = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { err(f, `JSON invalide (${e.message})`); continue; }
  for (const k of ["slug", "title", "h1", "desc", "intro", "body"]) if (typeof g[k] !== "string" || !g[k].trim()) err(f, `champ « ${k} » manquant`);
  if (g.slug && !/^[a-z0-9-]+$/.test(g.slug)) err(f, "slug : minuscules, chiffres et tirets seulement");
  if (g.slug && path.basename(f, ".json") !== g.slug) err(f, "le nom du fichier doit être <slug>.json");
  if (slugs.has(g.slug)) err(f, "slug en double"); else slugs.add(g.slug);
  if (g.title && g.title.length > 70) err(f, `title trop long (${g.title.length} > 70 ; « | CITURBAREA » est ajouté)`);
  if (g.desc && (g.desc.length < 110 || g.desc.length > 165)) err(f, `desc : 110 à 165 caractères (${g.desc.length})`);
  if (g.lang && !["fr", "ar"].includes(g.lang)) err(f, "lang : fr ou ar");
  if (g.majLe && !/^\d{4}-\d{2}-\d{2}$/.test(g.majLe)) err(f, "majLe : AAAA-MM-JJ");
  if (!Array.isArray(g.faq) || g.faq.length < 4) err(f, "faq : au moins 4 paires [question, réponse]");
  else for (const q of g.faq) if (!Array.isArray(q) || q.length !== 2 || !q[0] || !q[1]) err(f, "faq : chaque entrée = [question, réponse]");
  if (!Array.isArray(g.sources) || g.sources.length < 2) err(f, "sources : au moins 2 { titre, url }");
  else for (const s of g.sources) if (!s?.titre || !/^https?:\/\//.test(s?.url || "")) err(f, `source invalide : ${JSON.stringify(s)}`);
  const html = `${g.intro || ""}${g.body || ""}`;
  for (const m of html.matchAll(/<\/?([a-zA-Z0-9]+)/g)) if (!BALISES_OK.has(m[1].toLowerCase())) err(f, `balise non autorisée : <${m[1]}>`);
  if (/<h1/i.test(html)) err(f, "pas de <h1> dans le corps (le titre est généré)");
  if (/<script|on\w+=/i.test(html)) err(f, "pas de script ni d'attribut on…");
  if (!/class="enbref"/.test(g.body || "")) err(f, "le corps doit commencer par un encadré <div class=\"enbref\">…</div> (réponse directe)");
  if (!/href="\/chiffrage/.test(html) && !/href="\/guide\//.test(html)) err(f, "aucun lien interne (/chiffrage ou /guide/…)");
  const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (mots < 700) err(f, `contenu trop court (${mots} mots, minimum 700)`);
  if (!erreurs) console.log(`✓ ${path.basename(f)} (${mots} mots, ${g.faq.length} questions, ${g.sources.length} sources)`);
}
if (!fichiers.length) console.log("Aucun guide dans seo/guides.");
process.exit(erreurs ? 1 : 0);
