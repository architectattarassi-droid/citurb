import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIQUET, analyser, estVivante, normaliser, parFichier } from "../../scripts/appels-morts.mjs";

/**
 * Cliquet « plus jamais de nouveau branchement mort » : l'API NestJS est éteinte,
 * le seul back-end est functions/ (Cloudflare Pages Functions + Neon).
 *  - atteignables : appels morts dans un fichier importé depuis main.tsx (donc livrés
 *    aux visiteurs) — doit rester à 0 : une page ne dépend jamais d'une route absente ;
 *  - total : appels morts dans tout le code source (modules en sommeil compris) —
 *    ne doit jamais augmenter.
 * Après un rebranchement : node apps/web/scripts/appels-morts.mjs --write (le chiffre baisse).
 */
describe("appels réseau du front", () => {
  const ref = JSON.parse(readFileSync(CLIQUET, "utf8")) as { total: number; atteignables: number; parFichier: Record<string, number> };
  const { morts, atteignables } = analyser();
  const detail = (liste: typeof morts) => liste.map((a) => `${a.fichier}:${a.ligne} → ${a.chemin}`);

  it("reconnaît les routes servies par functions/ (avec [param])", () => {
    expect(estVivante("/api/cc/leads")).toBe(true);
    expect(estVivante("/api/cc/leads/:")).toBe(true);
    expect(estVivante("/api/rdv/:/visio")).toBe(true);
    expect(estVivante("/p2/categories")).toBe(false);
    expect(normaliser("\u0000/api/cc/leads/\u0000?x=1")).toBe("/api/cc/leads/:");
    expect(normaliser("/chiffrage")).toBeNull();
  });

  it("aucune page livrée ne dépend d'une route absente de functions/", () => {
    expect(detail(atteignables), "Appel vers une route absente de functions/ dans du code livré — créez la Function ou retirez l'appel").toEqual([]);
    expect(atteignables.length).toBeLessThanOrEqual(ref.atteignables);
  });

  it("aucun appel mort de plus que la référence docs/architecture/appels-morts.json", () => {
    const actuel = parFichier(morts);
    const enHausse = Object.entries(actuel)
      .filter(([f, n]) => n > (ref.parFichier[f] ?? 0))
      .map(([f, n]) => `${f} : ${ref.parFichier[f] ?? 0} → ${n} (${morts.filter((a) => a.fichier === f).map((a) => `l.${a.ligne} ${a.chemin}`).join(", ")})`);
    expect(enHausse, "Nouvel appel vers une route absente de functions/ — créez la Function ou retirez l'appel").toEqual([]);
    expect(morts.length).toBeLessThanOrEqual(ref.total);
  });
});
