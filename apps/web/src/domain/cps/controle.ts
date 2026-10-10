/**
 * Contrôle de conformité du CPS généré (demande du contre-examen GPT du 10/10/2026) :
 * chaque correction annoncée est vérifiée sur le document réellement produit,
 * et classée Corrigé / Provisoire / Bloquant.
 */
import type { Resultat } from "../chiffrage/dqe";
import { expositionFiscale } from "../chiffrage/quantitatif";
import { COEF_K, TVA } from "../chiffrage/referentiel";
import { CORRESPONDANCE_CPS } from "./correspondance";
import type { DocumentCps } from "./cps";

export type StatutControle = "CORRIGE" | "PROVISOIRE" | "BLOQUANT";
export type PointControle = { id: string; intitule: string; statut: StatutControle; ok: boolean; preuve: string };

const c2 = (n: number) => Math.round(n * 100) / 100;
const dh = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Montant imprimé « 1 708 506,29 » → nombre. */
const lireDh = (s: string) => Number(s.replace(/[\s  ]/g, "").replace(",", "."));
/** Lignes contenant un motif (pour citer la preuve). */
const lignes = (md: string, re: RegExp) => md.split("\n").filter((l) => re.test(l));

export function controlerCps(r: Resultat, d: DocumentCps): PointControle[] {
  const md = d.markdown;
  const out: PointControle[] = [];
  const add = (id: string, intitule: string, ok: boolean, preuve: string, siOk: StatutControle = "CORRIGE") =>
    out.push({ id, intitule, ok, statut: ok ? siOk : "BLOQUANT", preuve });

  // ── Arithmétique du BPDE ──────────────────────────────────────────────
  const postes = d.bpde.flatMap((l) => l.postes.map((p) => ({ lot: l, p })));
  const faux = postes.filter(({ p }) => Math.abs(c2(p.quantite * p.pu) - p.montant) > 0.005);
  add("BPDE-1", "Chaque montant = quantité × PU affichés", faux.length === 0,
    faux.length ? `Écarts : ${faux.map(({ p }) => p.numero).join(", ")}` : `${postes.length} postes recalculés au centime, 0 écart`);
  const lotsFaux = d.bpde.filter((l) => Math.abs(c2(l.postes.reduce((s, p) => s + p.montant, 0)) - l.total) > 0.005);
  add("BPDE-2", "Sous-totaux de lots = somme des postes", lotsFaux.length === 0,
    lotsFaux.length ? `Lots en écart : ${lotsFaux.map((l) => l.numero).join(", ")}` : `${d.bpde.length} lots vérifiés`);
  const somme = c2(d.bpde.reduce((s, l) => s + l.total, 0));
  const recap = md.match(/\| \| \*\*Total HT\*\* \| \*\*([\d\s  ,]+)\*\* \|/);
  const tvaL = md.match(/\| \| TVA (\d+) % \| ([\d\s  ,]+) \|/);
  const ttcL = md.match(/\| \| \*\*Total TTC\*\* \| \*\*([\d\s  ,]+)\*\* \|/);
  const ht = recap ? lireDh(recap[1]) : NaN, tva = tvaL ? lireDh(tvaL[2]) : NaN, ttc = ttcL ? lireDh(ttcL[1]) : NaN;
  add("BPDE-3", "Récapitulatif = somme des lots ; TVA et TTC exacts",
    Math.abs(ht - somme) < 0.005 && Math.abs(tva - c2(somme * TVA.taux)) < 0.005 && Math.abs(ttc - c2(ht + tva)) < 0.005 && Math.abs(ttc - d.totalTTC) < 0.005,
    `Somme des lots ${dh(somme)} ; récapitulatif ${dh(ht)} HT ; TVA ${TVA.taux * 100} % ${dh(tva)} ; TTC ${dh(ttc)} (= HT + TVA). Écart d'arrondi BPDE / calcul : ${dh(somme - r.travauxHT)} DH`);
  const garde = md.match(/Montant estimatif \| ([\d\s  ,]+) DH HT — ([\d\s  ,]+) DH TTC/);
  add("BPDE-4", "Page de garde cohérente avec le Titre IV", !!garde && lireDh(garde[1]) === ht && lireDh(garde[2]) === ttc,
    garde ? `Page de garde : ${garde[1]} HT / ${garde[2]} TTC` : "Montant de page de garde introuvable");

  // ── Doublons et omissions d'ouvrages ──────────────────────────────────
  const dansBpde = new Map<string, number>();
  for (const { p } of postes) for (const o of p.ouvrages) dansBpde.set(o, (dansBpde.get(o) ?? 0) + 1);
  const ouvragesDqe = [...new Set(r.lignes.map((l) => l.ouvrage))];
  const omis = ouvragesDqe.filter((o) => !dansBpde.has(o) && !CORRESPONDANCE_CPS[o]?.fusionAvec);
  const doubles = [...dansBpde.entries()].filter(([, n]) => n > 1).map(([o]) => o);
  const fusionsAuBpde = ouvragesDqe.filter((o) => CORRESPONDANCE_CPS[o]?.fusionAvec && dansBpde.has(o));
  add("OUV-1", "Chaque ouvrage du chiffrage figure une seule fois au BPDE (fusions comprises)",
    omis.length + doubles.length + fusionsAuBpde.length === 0,
    `${ouvragesDqe.length} ouvrages chiffrés ; omis : ${omis.join(", ") || "aucun"} ; en double : ${doubles.join(", ") || "aucun"} ; fusionnés restés visibles : ${fusionsAuBpde.join(", ") || "aucun"}`);
  const enterres = ["FON.12", "FON.13", "FON.14"].filter((o) => ouvragesDqe.includes(o));
  const malPlaces = enterres.filter((o) => !d.bpde.find((l) => l.code === "LOT_02_GO_BETON")?.postes.some((p) => p.ouvrages.includes(o)));
  add("OUV-2", "Ouvrages enterrés regroupés au lot 02", malPlaces.length === 0,
    enterres.length ? `${enterres.join(", ")} au lot 02${malPlaces.length ? ` sauf ${malPlaces.join(", ")}` : ""}` : "Aucun ouvrage enterré dans ce projet");
  const herisson = !postes.some(({ p }) => p.ouvrages.includes("FON.07")) && /hérisson compris/i.test(md);
  add("OUV-3", "Hérisson compris dans le PU du dallage (pas de poste séparé)", herisson,
    herisson ? "FON.07 absent du BPDE ; mention « PU hérisson compris » au poste du dallage" : "Hérisson facturé séparément ou mention absente");
  const wc = /WC invités du RDC/.test(md);
  add("OUV-4", "WC invités : périmètre précisé au poste", wc, wc ? lignes(md, /WC invités du RDC/)[0].replace(/^\|\s*/, "").replace(/\s*\|\s*/g, " — ").slice(0, 200) : "Mention absente");

  // ── Clauses ───────────────────────────────────────────────────────────
  const r770 = lignes(md, /\b770\b|769 bis/);
  add("CL-1", "Aucune référence à l'art. 770 ni à un « 769 bis » du DOC", r770.length === 0,
    r770.length ? r770.map((l) => l.slice(0, 120)).join(" / ") : "0 occurrence dans les Titres I à IV et annexes");
  const assOblig = lignes(md, /assurances?[^\n]{0,60}obligatoires?(?! T)/i).filter((l) => !/n'est pas assujetti|ne visant que|n'y étant pas/.test(l));
  add("CL-2", "TRC / RCD présentées comme contractuelles (seuils ACAPS non atteints)",
    assOblig.length === 0 && /souscrire à titre contractuel/.test(md),
    assOblig.length ? assOblig[0].slice(0, 160) : "Articles TRC et RCD : « à titre contractuel », seuils légaux rappelés", "PROVISOIRE");
  const penal = lignes(md, /p[ée]nalit[ée]s/i).filter((l) => /plafon/i.test(l));
  // Les mentions chiffrées doivent toutes valoir 8 % (2 % pour les pénalités particulières) ; les autres renvoient au plafond.
  const chiffrees = penal.filter((l) => /\d\s*%/.test(l));
  const autres = chiffrees.filter((l) => !(/8 %/.test(l) || /particuli[èe]res[^\n]*2 %/.test(l)));
  add("CL-3", "Plafond des pénalités unique (8 %)", chiffrees.length > 0 && autres.length === 0,
    `${chiffrees.length} mentions chiffrées, toutes à 8 % (2 % pour les pénalités particulières) ; ${penal.length - chiffrees.length} renvoi(s) au plafond sans chiffre${autres.length ? ` ; divergentes : ${autres.map((l) => l.slice(0, 80)).join(" / ")}` : ""}`);
  const ccag = lignes(md, /Fondement :[^\n]*CCAG/).filter((l) => !/référence/.test(l));
  add("CL-4", "CCAG-T jamais présenté comme applicable de plein droit",
    /ne s'applique pas de plein droit/.test(md) && ccag.length === 0,
    ccag.length ? `Fondements sans réserve : ${ccag.length}` : "Mention explicite au Titre I ; tous les fondements CCAG portent « à titre de référence »");
  const decret = lignes(md, /2-22-431/);
  add("CL-5", "Décret 2-22-431 (marchés publics) non opposé au marché privé", decret.every((l) => /non applicable|ne s'applique pas|référence/.test(l)),
    decret.length ? `${decret.length} mention(s), toutes avec réserve` : "0 mention");
  const statut = /Statut : document de consultation/.test(md) && /Arbitrages/.test(md);
  add("CL-6", "Statut non contractuel et conditions de levée avant signature", statut,
    statut ? "Bloc « Statut » en tête et tableau des arbitrages présents" : "Bloc absent");
  const hier = /pièce de rang supérieur prévaut/.test(md) && /En cas de discordance/.test(md);
  add("CL-7", "Hiérarchie documentaire et règle de discordance", hier,
    hier ? "Pièce de rang supérieur prévaut ; Titre II prime sur les désignations abrégées du BPDE ; quantités réelles aux PU si ouvrage inchangé" : "Règle absente");
  const ins = d.bpde[0]?.postes[0];
  add("CL-8", "Installation de chantier rémunérée par le seul forfait 00.01",
    ins?.numero === "00.01" && /à l'exclusion de l'installation/.test(md) && /ANNEXE 4 — COMPOSITION DES PRIX/.test(md),
    `00.01 = ${dh(ins?.montant ?? 0)} DH HT (${Math.round((r.installationHT / (r.travauxHT - r.installationHT)) * 1000) / 10} % des ouvrages). Les PU incluent ${COEF_K.fraisChantier * 100} % de frais de chantier (conduite, encadrement, consommables) ; affectation des dépenses en Annexe 4, décomposition chiffrée exigée de l'entrepreneur`,
    "PROVISOIRE");

  // ── Rédaction (contre-examen GPT n° 2) ────────────────────────────────
  const brouillon = lignes(md, /seuils? contractuels?|dans le délai contractuel|phase apd|délai légal 15|dans le délai qu'elle fixe|taux convenu aux conditions particulières/i);
  add("GEN-1", "Aucun texte de travail ni renvoi à un seuil ou délai non défini", brouillon.length === 0,
    brouillon.length ? brouillon.map((l) => l.slice(0, 120)).join(" / ") : "0 mention de travail, de seuil ou de délai non défini (A.6, A.13, A.16, A.19, A.20, A.25)");
  const ouvertes = lignes(md, /à (renseigner|négocier) avant signature/);
  add("GEN-2", "Variables contractuelles arrêtées", true,
    ouvertes.length ? `${ouvertes.length} mention(s) de variable ouverte, signalée(s) dans les conditions de levée et au tableau des arbitrages` : "Toutes les variables sont renseignées",
    ouvertes.length ? "PROVISOIRE" : "CORRIGE");
  const aCompleter = md.match(/\[à compléter[^\]]*\]/g) ?? [];
  add("GEN-3", "Mentions « [à compléter] »", true,
    aCompleter.length ? `${aCompleter.length} : ${[...new Set(aCompleter)].join(", ")}` : "aucune", aCompleter.length ? "PROVISOIRE" : "CORRIGE");
  const rcd = !/l'architecte et les bureaux d'études intervenants, justifient/.test(md) && /relèvent de leurs contrats respectifs/.test(md);
  add("CL-9", "Assurances : obligations limitées aux parties au marché, assurabilité confirmée par l'assureur", rcd && /confirmée par l'assureur avant la signature/.test(md),
    rcd ? "RCD exigée de l'entrepreneur seul ; architecte et BET renvoyés à leurs contrats ; confirmation de l'assureur avant signature" : "Obligations d'assurance imposées à des tiers au marché", "PROVISOIRE");
  const disc = /prix nouveau arrêté par écrit/.test(md);
  add("CL-10", "Discordance : modification technique substantielle → examen contradictoire et prix nouveau", disc,
    disc ? "Clause présente à l'article « Pièces constitutives »" : "Clause absente");

  // ── Régime fiscal des prix de matériaux (contre-examen GPT n° 12) ─────
  const fisc = expositionFiscale(r);
  add("FISC-1", "Régime fiscal des prix de matériaux (HT supposé / TVA non indiquée par la source)", /Régime fiscal des prix de matériaux/.test(md),
    `${fisc.materiaux.length} matériaux de gros œuvre retenus HT sans vérification (≈ ${dh(fisc.valeurHT)} DH HT) ; incidence si TTC ≈ −${dh(fisc.impactSiTTC)} DH HT (${(fisc.part * 100).toFixed(1).replace(".", ",")} %) ; déclaré en Annexe 4 et dans les conditions de levée`,
    fisc.materiaux.length ? "PROVISOIRE" : "CORRIGE");

  // ── Réserves techniques ───────────────────────────────────────────────
  const a3 = /ANNEXE 3 — RÉSERVES TECHNIQUES/.test(md) && /non structurelle/.test(md);
  add("RT-1", "Réserves BET / géotechnique maintenues (Annexe 3)", a3,
    a3 ? "Annexe 3 présente ; réduction des semelles qualifiée de non structurelle ; quantités par ratio à remplacer par les plans d'exécution" : "Annexe absente", "PROVISOIRE");
  const mat = /Principaux postes consommateurs/.test(md);
  add("RT-2", "Rapprochement matériaux ↔ postes du BPDE", mat, mat ? "Colonne présente au Titre III" : "Colonne absente", "PROVISOIRE");
  return out;
}

/** Rapport Markdown du contrôle (pour relecture humaine ou par un autre modèle). */
export function rapportControle(points: PointControle[]): string {
  const lib: Record<StatutControle, string> = { CORRIGE: "Corrigé", PROVISOIRE: "Provisoire", BLOQUANT: "Bloquant" };
  const n = (s: StatutControle) => points.filter((p) => p.statut === s).length;
  return [
    `**Bilan : ${n("CORRIGE")} corrigés, ${n("PROVISOIRE")} provisoires, ${n("BLOQUANT")} bloquants.**`,
    "",
    "| Réf. | Contrôle | Statut | Preuve tirée du document généré |",
    "|:--|:--|:--|:--|",
    ...points.map((p) => `| ${p.id} | ${p.intitule} | ${lib[p.statut]} | ${p.preuve.replace(/\|/g, "/")} |`),
  ].join("\n");
}
