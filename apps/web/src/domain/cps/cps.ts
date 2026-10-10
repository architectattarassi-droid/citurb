/**
 * CPS type de marché privé de travaux, généré à partir d'un chiffrage :
 *   Titre I   — clauses administratives (gabarit clauses-juridiques, type de projet) ;
 *   Titre II  — prescriptions techniques communes (lot 00) et par lot présent au DQE ;
 *   Titre III — quantitatif général (familles, ratios, besoins en matériaux et MO) ;
 *   Titre IV  — bordereau des prix – détail estimatif (BPDE) chiffré ;
 *   Annexes   — modes de métré, hypothèses du métré.
 * Les textes viennent des gabarits CPS du dépôt (apps/api/data/cps-templates) ;
 * les quantités et prix, du moteur domain/chiffrage (même calcul que /chiffrage).
 */
import type { Resultat } from "../chiffrage/dqe";
import { HYPOTHESES } from "../chiffrage/hypotheses";
import { quantitatif } from "../chiffrage/quantitatif";
import { TVA } from "../chiffrage/referentiel";
import { bordereau, type LotBPDE } from "./bordereau";
import { CLAUSES_CPS, LOT_CPS_PAR_CODE, TYPES_PROJET_CPS, fr } from "./gabarits";

export type OptionsCps = {
  nomProjet: string;
  commune?: string;
  adresse?: string;
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  zoneSismique?: string;
  /** Délai d'exécution (jours calendaires). */
  delaiExecutionJours?: number;
  /** "UNITAIRE" (prix unitaires appliqués aux quantités réellement exécutées) ou "FORFAIT". */
  formePrix?: "UNITAIRE" | "FORFAIT";
  date?: string;
};

export type DocumentCps = { markdown: string; bpde: LotBPDE[]; totalHT: number; totalTTC: number };

const dh = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ");
const dh2 = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, " ");
const q = (n: number) => (Math.round(n * 100) / 100).toLocaleString("fr-FR").replace(/\s/g, " ");
/** Intertitres internes des gabarits rétrogradés sous les titres d'article. */
const retrograder = (md: string) => md.replace(/^#{1,6} /gm, "##### ");
const cellule = (s: string) => s.replace(/\|/g, "/").replace(/\n/g, " ");

/** Clauses générales retenues en marché privé en plus des obligatoires du type de projet. */
const CLAUSES_COMPLEMENTAIRES = ["PRIX_FORME_MARCHE", "DELAI_EXECUTION_OS", "AVANCE_ACOMPTES_SITUATIONS", "CAUTIONNEMENT_DEFINITIF", "RESILIATION_MARCHE"];

export function genererCps(r: Resultat, o: OptionsCps): DocumentCps {
  const collectif = r.input.type === "IMMEUBLE" || r.input.type === "MIXTE";
  const type = collectif ? TYPES_PROJET_CPS.IMMEUBLE : TYPES_PROJET_CPS.VILLA;
  const bpde = bordereau(r);
  const totalLot = new Map(bpde.map((l) => [l.code, l.total]));
  const formePrix = o.formePrix === "FORFAIT"
    ? "prix global et forfaitaire, établi sur la base du détail estimatif joint"
    : "prix unitaires du bordereau des prix, appliqués aux quantités réellement exécutées et constatées contradictoirement";
  const vars: Record<string, string> = {
    PROJECT_NAME: o.nomProjet,
    PROJECT_ADDRESS: o.adresse ?? (o.commune ? `à ${o.commune}` : ""),
    COMMUNE: o.commune ?? r.input.ville ?? "",
    ZONE_SISMIQUE: o.zoneSismique ?? String((type as unknown as { defaultZoneSismique?: string }).defaultZoneSismique ?? ""),
    FORME_PRIX: formePrix,
    DELAI_EXECUTION_JOURS: String(o.delaiExecutionJours ?? (collectif ? 540 : 365)),
    DELAI_PLANNING_JOURS: "15",
    DELAI_AMIABLE_JOURS: "30",
    MAX_TRANSPORT_KM: "20",
  };
  const sub = (t: string, lot?: string) => t
    .replace(/\{\{MONTANT_TRAVAUX_LOT\}\}/g, lot && totalLot.has(lot) ? `${dh(totalLot.get(lot)!)} DH HT (estimation)` : "[à compléter : montant du lot]")
    .replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => (vars[k] ? vars[k] : `[à compléter : ${k.toLowerCase().replace(/_/g, " ")}]`));

  const L: string[] = [];
  const p = (s = "") => L.push(s);
  const totalHT = r.travauxHT;
  const totalTTC = totalHT * (1 + TVA.taux);

  // ── Page de garde ──────────────────────────────────────────────────────
  p("# CAHIER DES PRESCRIPTIONS SPÉCIALES");
  p(`## Marché privé de travaux — ${o.nomProjet}`);
  p();
  p("| | |");
  p("|:--|:--|");
  p(`| Maître d'ouvrage | ${o.maitreOuvrage ?? "[à compléter]"} |`);
  p(`| Maître d'œuvre | ${o.maitreOeuvre ?? "CITURBAREA — architecte"} |`);
  p(`| Commune | ${vars.COMMUNE || "[à compléter]"} |`);
  p(`| Nature des travaux | Construction ${collectif ? "d'un immeuble" : "d'une villa"}, tous corps d'état (${bpde.length} lots) |`);
  p(`| Surface de plancher | ${q(r.geometrie.surfaceTotale)} m² (emprise ${q(r.geometrie.emprise)} m²${r.geometrie.surfaceSousSol ? `, sous-sol ${q(r.geometrie.surfaceSousSol)} m²` : ""}) |`);
  p(`| Montant estimatif | ${dh(totalHT)} DH HT — ${dh(totalTTC)} DH TTC |`);
  p(`| Forme du prix | ${formePrix} |`);
  p(`| Délai d'exécution | ${vars.DELAI_EXECUTION_JOURS} jours calendaires |`);
  p(`| Date | ${o.date ?? new Date().toLocaleDateString("fr-FR")} |`);
  p();
  p("> Document type généré par CITURBAREA à partir du chiffrage lot par lot. Les mentions « [à compléter] » doivent être renseignées avant signature ; les quantités sont estimatives (métré paramétrique) et doivent être confirmées sur les plans d'exécution.");
  p();

  // ── Titre I — Clauses administratives ─────────────────────────────────
  p("## TITRE I — CLAUSES ADMINISTRATIVES");
  p();
  let n = 0;
  const art = (titre: string, corps: string) => { n += 1; p(`### Article A.${n} — ${titre}`); p(); p(corps); p(); };
  art("Objet du marché", `Le présent marché a pour objet l'exécution, en entreprise générale tous corps d'état, des travaux de construction du projet **${o.nomProjet}**${vars.PROJECT_ADDRESS ? `, ${vars.PROJECT_ADDRESS}` : ""}, tels que définis par le présent CPS, les plans et le bordereau des prix – détail estimatif (Titre IV).`);
  art("Pièces constitutives du marché", ["Par ordre de priorité décroissante :", "1. l'acte d'engagement ;", "2. le présent cahier des prescriptions spéciales (CPS) ;", "3. le bordereau des prix – détail estimatif (BPDE) ;", "4. les plans architecturaux et d'exécution (BET) visés « bon pour exécution » ;", "5. le rapport d'étude géotechnique ;", "6. le planning d'exécution approuvé ;", "7. les normes marocaines (NM) et le Règlement de construction parasismique (RPS 2000 version 2011) et le Règlement thermique de construction au Maroc (RTCM) en vigueur."].join("\n"));
  const codes = [...new Set([...type.clausesLegalesObligatoires, ...CLAUSES_COMPLEMENTAIRES])];
  // Ordre du gabarit (prix, délais, paiement, garanties, réception, pénalités, litiges).
  const clauses = CLAUSES_CPS.filter((c) => codes.includes(c.code) && c.marche.includes("PRIVE"));
  for (const c of clauses) art(fr(c.titre), retrograder(sub(fr(c.corpsMD))) + (c.fondement ? `\n\n*Fondement : ${c.fondement}.*` : ""));
  art("Assurances", type.assurancesObligatoires.map((a) => `- **${a.type.replace(/_/g, " ")}** — souscripteur : ${(a.souscripteur ?? a.souscripteurDefault ?? "").replace(/_/g, " ").toLowerCase() || "à préciser"}${a.duree ? `, durée ${a.duree} ans` : ""} (${a.fondement}).`).join("\n"));
  if (type.visasObligatoires.length) art("Visas et autorisations", type.visasObligatoires.map((v) => `- ${v.type.replace(/_/g, " ")} — phase ${v.phase.replace(/_/g, " ").toLowerCase()}${v.delaiLegal ? ` (délai légal ${v.delaiLegal} jours)` : ""}.`).join("\n") + "\n- Permis de construire et autorisations de voirie : à la charge du maître d'ouvrage avant l'ordre de service de commencement.");

  // ── Titre II — Prescriptions techniques ───────────────────────────────
  p("## TITRE II — PRESCRIPTIONS TECHNIQUES");
  p();
  for (const lot of bpde) {
    const g = LOT_CPS_PAR_CODE[lot.code];
    p(`### Lot ${String(lot.numero).padStart(2, "0")} — ${lot.intitule}`);
    p();
    if (!g) { p("*Gabarit de prescriptions en cours de rédaction : les ouvrages de ce lot sont décrits par leur désignation au Titre IV et par la notice du fabricant ; prescriptions à compléter par le maître d'œuvre.*"); p(); continue; }
    if (g.description) { p(retrograder(sub(fr(g.description), lot.code))); p(); }
    for (const a of g.articles) {
      p(`#### ${a.numero} — ${fr(a.titre)}`);
      p();
      p(retrograder(sub(fr(a.corpsMD), lot.code)));
      p();
    }
  }

  // ── Titre III — Quantitatif général ────────────────────────────────────
  const qt = quantitatif(r);
  p("## TITRE III — QUANTITATIF GÉNÉRAL");
  p();
  p(`Surface de référence : ${q(qt.surfaceReference)} m² de plancher. Montants HT.`);
  p();
  p("| Famille d'ouvrages | Montant HT (DH) | DH HT/m² | Part |");
  p("|:--|--:|--:|--:|");
  for (const g of qt.general) p(`| ${g.libelle} | ${dh(g.montantHT)} | ${dh(g.dhM2)} | ${Math.round(g.part * 100)} % |`);
  p(`| **Total travaux HT** | **${dh(totalHT)}** | **${dh(totalHT / qt.surfaceReference)}** | 100 % |`);
  p();
  p("**Ratios de gros œuvre** (à comparer aux repères de praticien) :");
  p();
  p(`- Fondations (semelles, longrines, amorces, béton de propreté) : **${dh(qt.ratios.fondationsStrictesDhM2Emprise)} DH HT/m² d'emprise** ; dallage et hérisson : ${dh(qt.ratios.dallageDhM2)} DH HT/m² ; terrassements hors sous-sol : ${dh(qt.ratios.terrassementsDhM2Emprise)} DH HT/m² d'emprise.`);
  p(`- Gros œuvre strict (structure béton armé, murs extérieurs, acrotères) : **${dh(qt.ratios.grosOeuvreStrictDhM2)} DH HT/m² de plancher** ; cloisons, enduits intérieurs et chapes : ${dh(qt.ratios.cloisonsEnduitsChapesDhM2)} DH HT/m².`);
  if (qt.ratios.soutenementsHT) p(`- Soutènements (sous-sol, cour anglaise, jardin, limite) : ${dh(qt.ratios.soutenementsHT)} DH HT.`);
  p(`- Béton : ${q(qt.ratios.betonM3ParM2)} m³/m² ; acier : ${q(qt.ratios.acierKgParM2)} kg/m² de plancher (${dh(qt.ratios.acierKgParM3)} kg/m³ de béton armé).`);
  p();
  p("**Besoins estimés en matériaux principaux** (pertes comprises) :");
  p();
  p("| Matériau | Quantité | Unité |");
  p("|:--|--:|:--|");
  for (const m of qt.materiaux.filter((x) => x.quantite >= 1)) p(`| ${m.libelle} | ${q(m.quantite)} | ${m.unite} |`);
  p();
  p("**Main-d'œuvre estimée** :");
  p();
  p("| Métier | Heures | Jours (8 h) |");
  p("|:--|--:|--:|");
  for (const m of qt.mainOeuvre) p(`| ${m.libelle} | ${dh(m.heures)} | ${dh(m.jours)} |`);
  p();

  // ── Titre IV — BPDE ─────────────────────────────────────────────────────
  p("## TITRE IV — BORDEREAU DES PRIX – DÉTAIL ESTIMATIF");
  p();
  p("Prix unitaires HT, établis par sous-détail (matériaux, main-d'œuvre, matériel, frais et marge). Les postes « C » sont des prix complémentaires hors gabarit ; les sous-postes « -a, -b » distinguent des ouvrages de prix différents relevant d'un même article.");
  p();
  for (const lot of bpde) {
    p(`### Lot ${String(lot.numero).padStart(2, "0")} — ${lot.intitule}`);
    p();
    p("| N° | Désignation | U | Quantité | PU HT | Montant HT |");
    p("|:--|:--|:--|--:|--:|--:|");
    for (const x of lot.postes) p(`| ${x.numero} | ${cellule(x.designation)}${x.note ? ` (${x.note})` : ""} | ${x.unite} | ${q(x.quantite)} | ${dh2(x.pu)} | ${dh(x.montant)} |`);
    p(`| | **Total lot ${String(lot.numero).padStart(2, "0")}** | | | | **${dh(lot.total)}** |`);
    p();
  }
  p("### Récapitulatif");
  p();
  p("| Lot | Intitulé | Montant HT (DH) |");
  p("|:--|:--|--:|");
  for (const lot of bpde) p(`| ${String(lot.numero).padStart(2, "0")} | ${lot.intitule} | ${dh(lot.total)} |`);
  p(`| | **Total HT** | **${dh(totalHT)}** |`);
  p(`| | TVA ${Math.round(TVA.taux * 100)} % | ${dh(totalHT * TVA.taux)} |`);
  p(`| | **Total TTC** | **${dh(totalTTC)}** |`);
  p();
  p(`Arrêté le présent détail estimatif à la somme de **${dh(totalTTC)} DH TTC** (estimation ; provision pour aléas non comprise : ${dh(r.aleasHT)} DH HT).`);
  p();

  // ── Annexes ─────────────────────────────────────────────────────────────
  p("## ANNEXE 1 — MODES DE MÉTRÉ");
  p();
  for (const lot of bpde) for (const x of lot.postes) if (x.modeMetre && (!x.numero.includes("-") || x.numero.endsWith("-a"))) p(`- **${x.numero.replace(/-a$/, "")}** ${cellule(x.designation.split(" — ")[0])} : ${cellule(x.modeMetre!)}`);
  p();
  p("## ANNEXE 2 — HYPOTHÈSES DU MÉTRÉ ESTIMATIF");
  p();
  p("| Hypothèse | Valeur |");
  p("|:--|--:|");
  for (const [id, v] of Object.entries(r.hypotheses)) p(`| ${HYPOTHESES[id]?.libelle ?? id} | ${v.toLocaleString("fr-FR")} ${HYPOTHESES[id]?.unite ?? ""} |`);
  p();
  return { markdown: L.join("\n"), bpde, totalHT, totalTTC };
}
