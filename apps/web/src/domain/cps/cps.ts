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
import { ARBITRAGES_DEFAUT, clausesPrive, type ArbitragesCps } from "./clausesPrive";
import { CORRESPONDANCE_CPS } from "./correspondance";
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
  /** Arbitrages contractuels (prix fermes / révisables, litiges, assurances, délai de paiement). */
  arbitrages?: Partial<ArbitragesCps>;
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
  // Montants contractuels : ceux du BPDE (quantités et PU arrondis au centime, montants recalculés).
  const totalHT = Math.round(bpde.reduce((s, l) => s + l.total, 0) * 100) / 100;
  const totalTTC = Math.round(totalHT * (1 + TVA.taux) * 100) / 100;
  const arb: ArbitragesCps = { ...ARBITRAGES_DEFAUT, ...o.arbitrages };
  const prive = clausesPrive(arb, Number(vars.DELAI_AMIABLE_JOURS));

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
  p(`| Montant estimatif | ${dh2(totalHT)} DH HT — ${dh2(totalTTC)} DH TTC |`);
  p(`| Forme du prix | ${formePrix} |`);
  p(`| Délai d'exécution | ${vars.DELAI_EXECUTION_JOURS} jours calendaires |`);
  p(`| Date | ${o.date ?? new Date().toLocaleDateString("fr-FR")} |`);
  p();
  p("> **Statut : document de consultation — estimation paramétrique NON CONTRACTUELLE.** Généré par CITURBAREA à partir du chiffrage lot par lot. Il ne peut être signé qu'après la levée des conditions ci-dessous.");
  p();
  p("**Conditions de levée avant signature :**");
  p();
  [
    "quantités de fondations, voiles, planchers et soutènements remplacées par celles de la note de calcul et des plans d'exécution du BET ;",
    "étude géotechnique réalisée (contrainte admissible, nappe, poussées) et blindages / avoisinants validés ;",
    "tableau des menuiseries, plans de plomberie, d'électricité, de mise à la terre et de courants faibles établis ;",
    "mentions « [à compléter] » renseignées (maître d'ouvrage, coefficient sismique…) ;",
    "clauses administratives relues par le conseil juridique du maître d'ouvrage ;",
    "offres d'entreprises recueillies et comparées au BPDE.",
  ].forEach((x, i) => p(`${i + 1}. ${x}`));
  p();
  p("**Arbitrages contractuels retenus** (modifiables avant signature) :");
  p();
  p("| Sujet | Choix retenu |");
  p("|:--|:--|");
  p(`| Caractère des prix | ${arb.prix === "FERMES" ? "fermes et non révisables" : "révisables (formule annexée)"} |`);
  p(`| Forme des prix | ${o.formePrix === "FORFAIT" ? "forfaitaire" : "prix unitaires ; postes « ff » forfaitaires"} |`);
  p(`| Règlement des litiges | ${arb.litiges === "TRIBUNAUX" ? "juridictions compétentes du lieu des travaux" : "arbitrage (loi 95-17)"} |`);
  p(`| Assurances TRC et RCD | ${arb.assurancesContractuelles ? "exigées contractuellement (ouvrage non assujetti à l'obligation légale)" : "non exigées"} |`);
  p(`| Délai de paiement des situations | ${arb.delaiPaiementJours} jours |`);
  p("| Plafond des pénalités de retard | 8 % du montant initial HT |");
  p();

  // ── Titre I — Clauses administratives ─────────────────────────────────
  p("## TITRE I — CLAUSES ADMINISTRATIVES");
  p();
  let n = 0;
  const art = (titre: string, corps: string) => { n += 1; p(`### Article A.${n} — ${titre}`); p(); p(corps); p(); };
  art("Objet du marché", `Le présent marché a pour objet l'exécution, en entreprise générale tous corps d'état, des travaux de construction du projet **${o.nomProjet}**${vars.PROJECT_ADDRESS ? `, ${vars.PROJECT_ADDRESS}` : ""}, tels que définis par le présent CPS, les plans et le bordereau des prix – détail estimatif (Titre IV).`);
  art("Pièces constitutives du marché", ["Par ordre de priorité décroissante :", "1. l'acte d'engagement ;", "2. le présent cahier des prescriptions spéciales (CPS) ;", "3. le bordereau des prix – détail estimatif (BPDE) ;", "4. les plans architecturaux et d'exécution (BET) visés « bon pour exécution » ;", "5. le rapport d'étude géotechnique ;", "6. le planning d'exécution approuvé ;", "7. les normes marocaines (NM), le Règlement de construction parasismique (RPS 2000, version 2011) et le Règlement thermique de construction au Maroc (RTCM) en vigueur ; les DTU et normes étrangères cités aux prescriptions techniques ne valent que comme règles de l'art de référence, à défaut de norme marocaine équivalente.", "", "En cas de discordance entre les quantités du BPDE et les plans d'exécution visés, les plans prévalent pour la consistance des ouvrages ; les prix unitaires du BPDE s'appliquent aux quantités réellement exécutées conformément à ces plans."].join("\n"));
  // Valeurs chiffrées arrêtées : elles priment sur les fourchettes rédigées dans les clauses types.
  art("Valeurs contractuelles arrêtées", [
    "Le CCAG-Travaux (décret n° 2-14-394) ne s'applique pas de plein droit au présent marché privé. Les parties conviennent des valeurs ci-dessous, dont certaines s'inspirent de ce texte à titre de référence ; elles priment sur toute autre mention du présent CPS :",
    "",
    "| Clause | Valeur retenue | Référence |",
    "|:--|:--|:--|",
    "| Cautionnement définitif | 3 % du montant initial du marché | CCAG-T art. 15 |",
    "| Retenue de garantie | 10 % de chaque acompte, plafonnée à 7 % du montant initial | CCAG-T art. 64 |",
    "| Pénalités de retard | 1/1 000 du montant initial par jour calendaire de retard | CCAG-T art. 65 |",
    "| Plafond des pénalités de retard | 8 % du montant initial du marché | CCAG-T art. 65 |",
    "| Plafond des pénalités particulières | 2 % du montant initial du marché | CCAG-T art. 66 |",
    "| Délai de garantie | 12 mois à compter de la réception provisoire | CCAG-T art. 75 |",
    "| Augmentation de la masse des travaux | 10 % au plus du montant initial | CCAG-T |",
    "| Acomptes sur approvisionnements | 4/5 de la valeur des matériaux approvisionnés | CCAG-T |",
    `| Délai d'exécution | ${vars.DELAI_EXECUTION_JOURS} jours calendaires à compter de l'ordre de service | présent CPS |`,
  ].join("\n"));
  const codes = [...new Set([...type.clausesLegalesObligatoires, ...CLAUSES_COMPLEMENTAIRES])];
  // Ordre du gabarit (prix, délais, paiement, garanties, réception, pénalités, litiges).
  const clauses = CLAUSES_CPS.filter((c) => codes.includes(c.code) && c.marche.includes("PRIVE"));
  for (const c of clauses) {
    // Clauses de marché privé (clausesPrive.ts) prioritaires sur les clauses types ;
    // les assurances sont traitées par les clauses TRC / RCD (plus d'article « Assurances » générique).
    const x = prive[c.code];
    if (x === null) continue;
    if (x) art(x.titre, `${x.corps}\n\n*Fondement : ${x.fondement}.*`);
    else art(fr(c.titre), retrograder(sub(fr(c.corpsMD))) + (c.fondement ? `\n\n*Fondement : ${c.fondement}.*` : ""));
  }
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
  p("Le montant contractuel est celui du Titre IV ; les montants ci-dessus, issus du calcul, peuvent en différer de quelques dirhams d'arrondi.");
  p();
  // Rapprochement matériaux → postes du BPDE (constat d'audit n° 18).
  const posteDe = new Map<string, string>();
  for (const lot of bpde) for (const x of lot.postes) for (const ov of x.ouvrages) posteDe.set(ov, x.numero);
  for (const [ov, c] of Object.entries(CORRESPONDANCE_CPS)) if (c.fusionAvec && posteDe.has(c.fusionAvec)) posteDe.set(ov, posteDe.get(c.fusionAvec)!);
  p("**Besoins estimés en matériaux principaux** (pertes comprises) et postes du BPDE qui les consomment :");
  p();
  p("| Matériau | Quantité | Unité | Principaux postes consommateurs (quantité) |");
  p("|:--|--:|:--|:--|");
  for (const m of qt.materiaux.filter((x) => x.quantite >= 1)) {
    const postes = new Map<string, number>();
    for (const o2 of m.ouvrages) { const k = posteDe.get(o2.code) ?? o2.code; postes.set(k, (postes.get(k) ?? 0) + o2.quantite); }
    const top = [...postes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} (${q(v)})`).join(", ");
    p(`| ${m.libelle} | ${q(m.quantite)} | ${m.unite} | ${top} |`);
  }
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
  p("Prix unitaires HT, établis par sous-détail (matériaux, main-d'œuvre, matériel, frais et marge), installation de chantier exclue (poste forfaitaire 00.01). La numérotation suit les lots des gabarits CPS (00 à 26, seuls les lots du projet figurent). Les postes « C » sont des prix complémentaires hors gabarit ; les sous-postes « -a, -b » distinguent des ouvrages de prix différents relevant d'un même article. Quantités et prix unitaires sont arrêtés au centime ; chaque montant est égal à la quantité multipliée par le prix unitaire affichés.");
  p();
  for (const lot of bpde) {
    p(`### Lot ${String(lot.numero).padStart(2, "0")} — ${lot.intitule}`);
    p();
    p("| N° | Désignation | U | Quantité | PU HT | Montant HT |");
    p("|:--|:--|:--|--:|--:|--:|");
    for (const x of lot.postes) p(`| ${x.numero} | ${cellule(x.designation)}${x.note ? ` (${x.note})` : ""} | ${x.unite} | ${q(x.quantite)} | ${dh2(x.pu)} | ${dh2(x.montant)} |`);
    p(`| | **Total lot ${String(lot.numero).padStart(2, "0")}** | | | | **${dh2(lot.total)}** |`);
    p();
  }
  p("### Récapitulatif");
  p();
  p("| Lot | Intitulé | Montant HT (DH) |");
  p("|:--|:--|--:|");
  for (const lot of bpde) p(`| ${String(lot.numero).padStart(2, "0")} | ${lot.intitule} | ${dh2(lot.total)} |`);
  p(`| | **Total HT** | **${dh2(totalHT)}** |`);
  p(`| | TVA ${Math.round(TVA.taux * 100)} % | ${dh2(Math.round(totalHT * TVA.taux * 100) / 100)} |`);
  p(`| | **Total TTC** | **${dh2(totalTTC)}** |`);
  p();
  p(`Arrêté le présent détail estimatif à la somme de **${dh2(totalTTC)} DH TTC** (estimation ; provision pour aléas non comprise : ${dh(r.aleasHT)} DH HT).`);
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
  // Réserves techniques : ce que le métré paramétrique ne permet pas de certifier.
  p("## ANNEXE 3 — RÉSERVES TECHNIQUES");
  p();
  p("Les quantités suivantes résultent de ratios et ne valent pas dimensionnement. Elles doivent être remplacées par celles des plans d'exécution et de la note de calcul du BET avant contractualisation :");
  p();
  const a = (ov: string) => r.lignes.some((l) => l.ouvrage === ov);
  const res: string[] = [];
  if (a("FON.02") || a("FON.03")) res.push(`fondations : volume des semelles par ratio (${r.hypotheses["fon.ratio." + r.input.sol] ?? "—"} m³/m² de plancher)${r.hypotheses["ss.reductionSemelles"] ? `, réduit de ${Math.round(r.hypotheses["ss.reductionSemelles"] * 100)} % sous sous-sol (hypothèse économique, non structurelle)` : ""} ;`);
  if (a("FON.04")) res.push("radier : épaisseur moyenne par hypothèse, à fixer par le BET selon l'étude de sol ;");
  if (a("FON.10")) res.push("voile périphérique enterré : épaisseur 20 cm, béton B30 et 100 kg d'acier/m³ par hypothèse ; poussées, surcharges, appuis et nappe à vérifier ;");
  if (a("TER.08")) res.push("blindage : prévu au seul droit des côtés mitoyens ; talutage, avoisinants et accès à vérifier sur plan d'installation ;");
  if (r.lignes.some((l) => l.id.startsWith("SOUT"))) res.push("soutènements localisés (cour anglaise, jardin, terrasse, limite) : sections par ratio, à dimensionner (coupe, ferraillage, drainage, garde-corps) ;");
  if (a("STR.03") || a("STR.04") || a("STR.05")) res.push("planchers, poteaux et poutres : surfaces et volumes par ratio au m² de plancher, à reprendre sur plans de coffrage ;");
  res.push("menuiseries extérieures : surface de baies par ratio ; tableau des menuiseries (profils, vitrages, performances RTCM) à établir ;");
  res.push("plomberie, électricité, mise à la terre et courants faibles : quantités par ratio ; plans et schémas d'exécution à établir, essais de réception à prévoir ;");
  res.push("réseaux extérieurs : limites de prestation avec les concessionnaires (ONEE, régie) à préciser ; branchements hors marché sauf mention contraire.");
  res.forEach((x, i) => p(`${i + 1}. ${x}`));
  p();
  return { markdown: L.join("\n"), bpde, totalHT, totalTTC };
}
