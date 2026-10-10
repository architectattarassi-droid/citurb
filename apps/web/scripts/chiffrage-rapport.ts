/**
 * Dossier d'estimation pour relecture (architecte, Claude, GPT) : Markdown +
 * CSV du DQE, générés avec le moteur domain/chiffrage (même calcul que /chiffrage).
 *
 *   npx tsx apps/web/scripts/chiffrage-rapport.ts <projet.json> <sortie-sans-extension>
 *
 * projet.json : un ProjetInput (sans `standing`, le rapport compare les 5).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { standingLabel } from "../src/command-center/modules/dossiers/costRangesMA";
import {
  CHIFFRAGE_VERSION, HYPOTHESES, K_PRIVE, MATERIAUX, REGIMES, STANDINGS, TVA, TYPE_GRILLE,
  chiffrer, coherence, controleGrille, type ProjetInput, type Resultat,
} from "../src/domain/chiffrage";

const [, , fichier, sortie] = process.argv;
if (!fichier || !sortie) throw new Error("usage : chiffrage-rapport.ts <projet.json> <sortie>");
const base = JSON.parse(readFileSync(fichier, "utf8")) as ProjetInput & { titre?: string; contexte?: string; relecture?: string[] };
const FONDATION: Record<string, string> = { SEMELLES_ISOLEES: "semelles isolées", SEMELLES_FILANTES: "semelles filantes", RADIER: "radier général" };
const VILLA: Record<string, string> = { isolee: "isolée", jumelee: "jumelée", bande: "en bande" };
const SOL: Record<string, string> = { ROCHER: "rocher", BON: "bon sol", MOYEN: "sol moyen", ARGILE_REMBLAI: "argile / remblai" };

const dh = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ");
const m2 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");
const pct = (n: number) => `${Math.round(n * 100)} %`;
const tg = TYPE_GRILLE[base.type];
const lib = (s: string) => standingLabel(tg, s as never);

const avec = (patch: Partial<ProjetInput>) => chiffrer({ ...base, etapes: { terrain: true, finitions: true }, ...patch });
const parStanding = STANDINGS.map((s) => ({ s, r: avec({ standing: s }) }));
const sansSousSol = STANDINGS.map((s) => ({ s, r: avec({ standing: s, sousSol: null }) }));
const ref = parStanding.find((x) => x.s === "ECONOMIQUE")!.r;
const S = ref.geometrie.surfaceTotale;

const L: string[] = [];
const p = (s = "") => L.push(s);
const table = (entete: string[], lignes: (string | number)[][], align?: string[]) => {
  p(`| ${entete.join(" | ")} |`);
  p(`|${entete.map((_, i) => (align?.[i] ?? (i === 0 ? ":--" : "--:"))).join("|")}|`);
  for (const l of lignes) p(`| ${l.join(" | ")} |`);
  p();
};

p(`# ${base.titre ?? "Estimation lot par lot"}`);
p();
p(`> Dossier généré le ${new Date().toLocaleDateString("fr-FR")} avec le moteur de chiffrage CITURBAREA (référentiel ${CHIFFRAGE_VERSION}), le même que https://citurbarea.com/chiffrage.`);
p("> Objet : relecture critique par l'architecte, Claude et GPT. Les questions de relecture sont en fin de document.");
if (base.contexte) { p(); p(base.contexte); }
p();
p("## 1. Données du projet et surfaces");
p();
const d = ref.decomposition;
table(["Donnée", "Valeur", "Origine"], [
  ["Type", `${base.type === "VILLA" ? "Villa" : base.type} ${VILLA[base.parcelle?.villaType ?? ""] ?? ""}`.trim(), "saisie"],
  ["Ville (coefficient régional)", `${base.ville || "non précisée"} (${ref.region.coef.toLocaleString("fr-FR")} ; matériaux ${ref.region.mat.toLocaleString("fr-FR")}, main-d'œuvre ${ref.region.mo.toLocaleString("fr-FR")})`, "grille2026 (base Rabat-Salé-Kénitra = 1)"],
  ["Surface du terrain", `${m2(base.surfaceTerrain ?? 0)} m²`, "saisie"],
  ["Niveaux", base.niveaux === 1 ? "RDC" : `RDC + ${base.niveaux - 1}`, "saisie"],
  ["Sous-sol", base.sousSol ? `oui, ${base.sousSol.profondeur.toLocaleString("fr-FR")} m de terre à soutenir` : "non", "saisie"],
  ["Sol / pente / nappe", `${SOL[ref.geometrie.sol]} / ${base.pente ?? 0} % / ${base.nappe ? "oui" : "non"}`, "saisie (à confirmer par étude de sol)"],
  ["Mitoyenneté", `${ref.input.mitoyennete} côté(s)`, base.mitoyennete == null ? "déduite du type" : "saisie"],
  ["Emprise (CES)", d ? `${m2(d.rdc)} m² (CES ${d.ces.toLocaleString("fr-FR")})` : `${m2(ref.geometrie.emprise)} m²`, d ? "règle parcelleSP" : "saisie"],
  ["Surface plancher totale", `${m2(S)} m²`, d ? `RDC ${m2(d.rdc)} + ${d.etages.map((e, i) => `R+${i + 1} ${m2(e)}`).join(" + ")}${d.sousSol ? ` + sous-sol ${m2(d.sousSol)}` : ""} + forfait cage/buanderie/terrasse ${d.forfait}` : "saisie"],
  ["Chambres / salles de bain", `${ref.geometrie.chambres} / ${ref.geometrie.sallesDeBain} (+ WC invités)`, base.chambres ? "saisie" : "défaut"],
  ["Hauteur d'étage", `${m2(ref.geometrie.hauteurEtage)} m`, "hypothèse"],
  ["Périmètre / murs extérieurs / baies", `${m2(ref.geometrie.perimetre)} ml / ${m2(ref.geometrie.mursExterieurs)} m² / ${m2(ref.geometrie.baies)} m² (moyen standing)`, "métré paramétrique"],
  ["Fondation retenue", FONDATION[ref.geometrie.fondation], "selon le sol"],
  ["Clôture", `${m2(ref.geometrie.cloture)} ml`, base.cloture == null ? "4 × √terrain × côtés non mitoyens" : "saisie"],
], [":--", ":--", ":--"]);

p("## 2. Synthèse par standing (avec sous-sol)");
p();
table(["Standing", "Réalisation", "DH HT/m² bâtiment", "Travaux HT", "Aléas", "TVA 20 %", "Travaux TTC", "Fourchette TTC", "Honoraires TTC", "Taxes + raccord.", "Budget total TTC", "Grille CITURBAREA"],
  parStanding.map(({ s, r }) => {
    const g = controleGrille(r);
    return [lib(s), r.regime === "TACHERON" ? "tâcheron" : "entreprise", dh(r.coutM2BatimentHT), dh(r.travauxHT), dh(r.aleasHT), dh(r.tva), `**${dh(r.totalTTC)}**`,
      `${dh(r.fourchette.min * 1.2)} – ${dh(r.fourchette.max * 1.2)}`, dh(r.honoraires.totalTTC), dh(r.taxes.total + r.fraisAnnexes.total), `**${dh(r.budgetTTC)}**`,
      g.fourchette ? `${dh(g.fourchette[0])}–${dh(g.fourchette[1])}${g.ok ? " ✓" : ` (${g.ecart > 0 ? "+" : ""}${Math.round(g.ecart * 100)} %)`}` : "—"];
  }));
p("Prix au m² « bâtiment » : hors clôture, portail, réseaux extérieurs et options, ramené à la surface plancher totale (sous-sol compris). Grille : coût du bâtiment ramené à la base Rabat-Salé-Kénitra.");
p();
if (base.sousSol) {
  p("### Sans sous-sol (pour comparaison)");
  p();
  table(["Standing", "DH HT/m² bâtiment", "Travaux TTC", "Budget total TTC", "Coût du sous-sol HT", "dont soutènement HT"],
    sansSousSol.map(({ s, r }, i) => {
      const imp = parStanding[i].r.impacts.find((x) => x.cle === "sous_sol");
      return [lib(s), dh(r.coutM2BatimentHT), dh(r.totalTTC), dh(r.budgetTTC), imp ? dh(imp.montantHT) : "—", imp ? dh(imp.dontSoutenement) : "—"];
    }));
}

p("## 3. Coût par lot et par standing");
p();
p("Montants HT (DH), puis DH HT par m² de plancher total. Installation de chantier = 2 % des ouvrages.");
p();
const codes = [...new Set(parStanding.flatMap(({ r }) => r.lots.map((l) => l.lot.code)))];
const nomLot = (c: string) => parStanding.flatMap(({ r }) => r.lots).find((l) => l.lot.code === c)!.lot;
table(["Lot", ...STANDINGS.map(lib)],
  [...codes.map((c) => [`${nomLot(c).numero} ${nomLot(c).libelle}`, ...parStanding.map(({ r }) => {
    const l = r.lots.find((x) => x.lot.code === c);
    return l ? `${dh(l.total)} <br>${dh(l.total / S)}/m² · ${pct(l.part)}` : "—";
  })]),
  ["**Total travaux HT**", ...parStanding.map(({ r }) => `**${dh(r.travauxHT)}**<br>${dh(r.travauxHT / S)}/m²`)],
  ["Part du gros œuvre (bâtiment)", ...parStanding.map(({ r }) => pct(r.partGrosOeuvre))]]);

p("## 4. Sensibilité : sol, nappe, pente, mode de réalisation (moyen standing)");
p();
const scen: [string, Partial<ProjetInput>][] = [
  ["Référence (bon sol, sans nappe, terrain plat)", {}],
  ["Sol moyen (semelles filantes)", { sol: "MOYEN" }],
  ["Argile / remblai (radier + purge)", { sol: "ARGILE_REMBLAI" }],
  ["Rocher (brise-roche)", { sol: "ROCHER" }],
  ["Nappe phréatique (cuvelage + épuisement)", { nappe: true }],
  ["Pente 10 %", { pente: 10 }],
  ["Réalisation par tâcheron", { regime: "TACHERON" }],
];
table(["Scénario", "Travaux TTC", "Écart TTC", "Fondation"], scen.map(([n, patch]) => {
  const r = avec({ standing: "ECONOMIQUE", ...patch });
  return [n, dh(r.totalTTC), `${r.totalTTC >= ref.totalTTC ? "+" : ""}${dh(r.totalTTC - ref.totalTTC)}`, FONDATION[r.geometrie.fondation]];
}));

p(`## 5. DQE détaillé — ${lib("ECONOMIQUE")} — ${REGIMES[ref.regime].libelle}`);
p();
for (const l of ref.lots) {
  p(`### ${l.lot.numero} ${l.lot.libelle} — ${dh(l.total)} DH HT`);
  p();
  if (l.lot.code === "INS") { p(`${pct(HYPOTHESES["frais.installation"].valeur)} du montant des ouvrages (hypothèse).`); p(); continue; }
  table(["Ouvrage", "Code", "Qté", "U", "PU HT", "Montant HT", "Quantité : formule", "Fourchette PU"],
    l.lignes.map((li) => [li.libelle, li.ouvrage, m2(li.qte), li.unite, dh(li.pu), dh(li.montant), li.formule.replace(/\|/g, "/"), `${dh(li.puMin)}–${dh(li.puMax)}`]),
    [":--", ":--", "--:", ":--", "--:", "--:", ":--", "--:"]);
}

p("## 6. Méthode de prix et hypothèses");
p();
p(`- Prix d'ouvrage = déboursé sec (matériaux + main-d'œuvre chargée CNSS 21,09 % + petit matériel 5 % de la MO) × K. K entreprise = ${K_PRIVE} (frais de chantier 10 %, frais généraux 12 %, aléas et bénéfice 12 %) ; ouvrages fournis-posés par un sous-traitant × 1,12 ; tâcheron : K × 0,83 et fournitures achetées par le client (× 1,00).`);
p(`- ${Object.keys(MATERIAUX).length} prix élémentaires sourcés dans docs/prix/recherche (fiabilité A/B/C) ou marqués H (hypothèse). TVA ${pct(TVA.taux)} sur les travaux d'entreprise.`);
p("- Hypothèses de métré utilisées (toutes modifiables dans l'écran /chiffrage) :");
p();
table(["Hypothèse", "Valeur", "Plage", "Justification"], Object.entries(ref.hypotheses).map(([id, v]) => {
  const h = HYPOTHESES[id];
  return [h.libelle, `${v.toLocaleString("fr-FR")} ${h.unite}`, `${h.min}–${h.max}`, h.source.note ?? ""];
}), [":--", "--:", "--:", ":--"]);

p("## 7. Contrôles de cohérence");
p();
const coh = coherence(ref);
p(`- Grille CITURBAREA 2026 (${lib("ECONOMIQUE")}) : ${dh(coh.grille.coutM2RSK)} DH/m² base RSK pour ${coh.grille.fourchette?.join("–")} → ${coh.grille.ok ? "dans la fourchette" : `écart ${Math.round(coh.grille.ecart * 100)} %`}.`);
p(`- Part du gros œuvre : ${pct(coh.partGrosOeuvre)} (repères EnginLoc : 55-60 % économique, 45-50 % standard).`);
p(`- Prix d'ouvrage recoupés avec les prix posés du marché (règle ±20 %) : ${coh.recoupements.filter((x) => x.ok).length}/${coh.recoupements.length}.`);
for (const x of coh.recoupements) p(`  - ${x.ok ? "✓" : "⚠"} ${x.libelle} : ${dh(x.prix)} contre ${dh(x.reference[0])}–${dh(x.reference[1])} (${x.sourceIds.join(", ")})${x.note ? ` — ${x.note}` : ""}`);
p();

if (base.relecture?.length) {
  p("## 8. Relecture Claude (points à vérifier en priorité)");
  p();
  base.relecture.forEach((x, i) => p(`${i + 1}. ${x}`));
  p();
}
p("## 9. Questions pour la relecture");
p();
[
  "Les prix au m² par standing (section 2) correspondent-ils à ce que vous observez sur des villas jumelées comparables, dans la même ville ?",
  "Le coût du sous-sol (section 2, tableau sans sous-sol) et sa part de soutènement sont-ils réalistes pour 3 m de terre et un côté mitoyen ?",
  "Quels lots (section 3) sont sur- ou sous-estimés pour chaque standing ? Donner un ordre de grandeur en DH/m².",
  "Les quantités du DQE (section 5) — murs, cloisons, enduits, planchers, béton, acier — sont-elles cohérentes avec une villa de ce gabarit ?",
  "Les prix unitaires posés (PU) les plus importants (béton armé, plancher hourdis, maçonnerie, menuiserie alu, carrelage) sont-ils dans le marché 2026 ?",
  "Les hypothèses de la section 6 à corriger en priorité ?",
  "Le chiffrage du très économique par tâcheron (K × 0,83, fournitures achetées par le client) est-il représentatif ?",
].forEach((q, i) => p(`${i + 1}. ${q}`));
p();
p("## 10. Consigne à coller dans GPT");
p();
p("```");
p("Tu es économiste de la construction au Maroc (marché privé 2026). Relis de façon critique l'estimation ci-dessous (villa, chiffrage lot par lot). Pour chaque section : 1) signale les quantités ou prix unitaires qui te paraissent faux, avec la valeur que tu proposes, l'unité et ta source ou ton raisonnement ; 2) réponds aux questions de la section 9 ; 3) donne ton propre coût par lot en DH HT/m² pour chaque standing, dans le même tableau que la section 3 ; 4) distingue clairement ce qui est un fait sourcé de ce qui est ton estimation. Réponds en français, sans arrondir à l'excès.");
p("```");
p();
p("> Estimation indicative, hors terrain, mobilier, électroménager et luminaires. Ne vaut pas offre d'entreprise. Quantités à confirmer sur plans et étude de sol.");

writeFileSync(`${sortie}.md`, L.join("\n"), "utf8");

// CSV du DQE, tous standings (séparateur ; pour Excel FR)
const csv = ["standing;lot;code_lot;ligne;ouvrage;designation;quantite;unite;pu_ht;montant_ht;pu_min;pu_max;formule;tags"];
const r1 = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
for (const { s, r } of parStanding as { s: string; r: Resultat }[]) for (const l of r.lots) for (const li of l.lignes)
  csv.push([lib(s), l.lot.libelle, l.lot.code, li.id, li.ouvrage, `"${li.libelle.replace(/"/g, "'")}"`, r1(li.qte), li.unite, r1(li.pu), r1(li.montant), r1(li.puMin), r1(li.puMax), `"${li.formule.replace(/"/g, "'")}"`, li.tags.join(",")].join(";"));
writeFileSync(`${sortie}-dqe.csv`, "﻿" + csv.join("\r\n"), "utf8");
console.log(`écrit : ${sortie}.md et ${sortie}-dqe.csv`);
