/**
 * Aide à la décision (tous types de projets) : à partir du projet saisi et,
 * le cas échéant, du budget du client, compare les scénarios qui pèsent
 * vraiment (standing, mode de réalisation, sous-sol, niveaux, formule de
 * conception) et cherche les leviers qui ramènent le projet dans le budget.
 * Chaque scénario est un chiffrage complet du moteur (pas un ratio).
 */
import { chiffrer, type Resultat } from "./dqe";
import { FORMULES_CONCEPTION, type FormuleConception } from "./conception";
import type { ProjetInput } from "./metre";
import { regimeParDefaut, type Regime } from "./referentiel";

export const STANDINGS_ORDRE = ["ULTRA_ECO", "ECONOMIQUE", "STANDARD", "STANDING", "PREMIUM"] as const;
type Standing = (typeof STANDINGS_ORDRE)[number];

export type Scenario = {
  cle: string;
  groupe: "standing" | "regime" | "sousSol" | "niveaux" | "conception";
  libelle: string;
  projet: ProjetInput;
  travauxTTC: number;
  budgetTTC: number;
  surface: number;
  /** Écart de budget total avec le projet actuel (négatif = économie). */
  ecart: number;
  actuel: boolean;
};

export type Levier = { libelle: string; economie: number; projet: ProjetInput };

export type AideDecision = {
  actuel: Scenario;
  scenarios: Scenario[];
  /** Budget du client (TTC, tout compris) ; absent si non saisi. */
  budget?: number;
  /** Standing le plus élevé qui tient dans le budget, options actuelles inchangées. */
  meilleurStanding?: Scenario;
  /** Leviers cumulés, du plus efficace au moins efficace, pour revenir dans le budget. */
  leviers: Levier[];
  /** Projet obtenu en cumulant les leviers, et son budget. */
  projetAjuste?: { projet: ProjetInput; budgetTTC: number; dansBudget: boolean };
};

/** Libellés uniques des standings, pour tous les types de projets. */
export const LIBELLES_STANDING: Record<Standing, string> = { ULTRA_ECO: "Très économique", ECONOMIQUE: "Moyen standing", STANDARD: "Standing", STANDING: "Haut standing", PREMIUM: "Luxe" };
export const libelleStanding = (s: string): string => LIBELLES_STANDING[s as Standing] ?? s;
const LIB_STANDING = LIBELLES_STANDING;
const individuel = (p: ProjetInput) => p.type === "VILLA" || p.type === "MAISON";

function scenario(cle: string, groupe: Scenario["groupe"], libelle: string, projet: ProjetInput, base?: Resultat): Scenario & { r: Resultat } {
  const r = chiffrer(projet, { impacts: false });
  return { cle, groupe, libelle, projet, travauxTTC: r.totalTTC, budgetTTC: r.budgetTTC, surface: r.geometrie.surfaceTotale, ecart: base ? r.budgetTTC - base.budgetTTC : 0, actuel: false, r };
}

export function aideDecision(projet: ProjetInput, budget?: number): AideDecision {
  const regime: Regime = projet.regime ?? regimeParDefaut(projet.standing, projet.type);
  const conception: FormuleConception = projet.conception ?? "COMPLET";
  const base = chiffrer(projet, { impacts: false });
  const actuel: Scenario = { cle: "actuel", groupe: "standing", libelle: "Votre projet", projet, travauxTTC: base.totalTTC, budgetTTC: base.budgetTTC, surface: base.geometrie.surfaceTotale, ecart: 0, actuel: true };

  const sc: (Scenario & { r: Resultat })[] = [];
  // Standing : régime par défaut de chaque standing (tâcheron en très économique, maisons et villas).
  for (const s of STANDINGS_ORDRE) {
    if (s === projet.standing) continue;
    const reg = individuel(projet) ? regimeParDefaut(s) : "ENTREPRISE";
    sc.push(scenario(`standing:${s}`, "standing", LIB_STANDING[s], { ...projet, standing: s, regime: reg, quantites: undefined }, base));
  }
  // Mode de réalisation (villa, maison).
  if (individuel(projet)) {
    const autre: Regime = regime === "TACHERON" ? "ENTREPRISE" : "TACHERON";
    sc.push(scenario(`regime:${autre}`, "regime", autre === "TACHERON" ? "Tâcheron (vous achetez les fournitures)" : "Entreprise générale (clé en main)", { ...projet, regime: autre }, base));
  }
  // Sous-sol.
  if (projet.sousSol) sc.push(scenario("sousSol:sans", "sousSol", "Sans sous-sol", { ...projet, sousSol: undefined, nappe: false, quantites: undefined }, base));
  else if (individuel(projet)) sc.push(scenario("sousSol:avec", "sousSol", "Avec sous-sol (3 m)", { ...projet, sousSol: { profondeur: 3 }, quantites: undefined }, base));
  // Un niveau de moins.
  if (projet.niveaux > 1) sc.push(scenario("niveaux:-1", "niveaux", `Un niveau de moins (${projet.niveaux - 1 === 1 ? "RDC" : `R+${projet.niveaux - 2}`})`, { ...projet, niveaux: projet.niveaux - 1, quantites: undefined }, base));
  // Formule de conception.
  for (const f of Object.keys(FORMULES_CONCEPTION) as FormuleConception[]) {
    if (f === conception) continue;
    sc.push(scenario(`conception:${f}`, "conception", FORMULES_CONCEPTION[f].libelle, { ...projet, conception: f }, base));
  }

  const res: AideDecision = { actuel, scenarios: sc.map(({ r: _r, ...s }) => s), leviers: [] };
  if (!budget || budget <= 0) return res;
  res.budget = budget;

  // Standing le plus élevé dans le budget (autres options inchangées).
  const parStanding = [actuel, ...res.scenarios.filter((s) => s.groupe === "standing")]
    .sort((a, b) => STANDINGS_ORDRE.indexOf((b.projet.standing as Standing)) - STANDINGS_ORDRE.indexOf((a.projet.standing as Standing)));
  res.meilleurStanding = parStanding.find((s) => s.budgetTTC <= budget);

  // Leviers cumulés (glouton) si le projet dépasse le budget : on applique à chaque tour
  // le levier qui économise le plus, en recalculant tout le projet.
  if (base.budgetTTC > budget) {
    let courant = projet;
    let cout = base.budgetTTC;
    const candidats = (p: ProjetInput): { libelle: string; projet: ProjetInput }[] => {
      const out: { libelle: string; projet: ProjetInput }[] = [];
      const i = STANDINGS_ORDRE.indexOf(p.standing as Standing);
      if (i > 0) { const s = STANDINGS_ORDRE[i - 1]; out.push({ libelle: `Passer en ${LIB_STANDING[s].toLowerCase()}`, projet: { ...p, standing: s, regime: individuel(p) ? (p.regime === "TACHERON" ? "TACHERON" : regimeParDefaut(s)) : "ENTREPRISE", quantites: undefined } }); }
      if (individuel(p) && (p.regime ?? regimeParDefaut(p.standing, p.type)) !== "TACHERON") out.push({ libelle: "Réaliser avec un tâcheron (fournitures achetées par vous)", projet: { ...p, regime: "TACHERON" } });
      if (p.sousSol) out.push({ libelle: "Renoncer au sous-sol", projet: { ...p, sousSol: undefined, nappe: false, quantites: undefined } });
      if ((p.conception ?? "COMPLET") !== "PLAN_TYPE") out.push({ libelle: "Choisir un plan type", projet: { ...p, conception: "PLAN_TYPE" } });
      return out;
    };
    for (let tour = 0; tour < 6 && cout > budget; tour++) {
      const essais = candidats(courant).map((c) => ({ ...c, cout: chiffrer(c.projet, { impacts: false }).budgetTTC })).filter((c) => c.cout < cout);
      if (!essais.length) break;
      const m = essais.reduce((a, b) => (b.cout < a.cout ? b : a));
      res.leviers.push({ libelle: m.libelle, economie: cout - m.cout, projet: m.projet });
      courant = m.projet;
      cout = m.cout;
    }
    res.projetAjuste = { projet: courant, budgetTTC: cout, dansBudget: cout <= budget };
  }
  return res;
}
