/**
 * DQE imprimable (impression navigateur → PDF) : masqué à l'écran, seul
 * élément visible à l'impression (règle @media print du gadget).
 */
import React from "react";
import { standingLabel } from "../../command-center/modules/dossiers/costRangesMA";
import { CHIFFRAGE_VERSION, TYPE_GRILLE, TVA, type Resultat } from "../../domain/chiffrage";

const dh = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ");
const q = (n: number) => (+n.toFixed(2)).toLocaleString("fr-FR");

export default function DqeImprimable({ res }: { res: Resultat }) {
  const p = res.input;
  const g = res.geometrie;
  const date = new Date().toLocaleDateString("fr-FR");
  const cell = "border border-slate-400 px-1.5 py-0.5";
  return (
    <div id="dqe-imprimable" className="hidden print:block text-[10.5px] leading-tight text-black">
      <h1 className="text-lg font-bold">CITURBAREA — Devis quantitatif estimatif (DQE)</h1>
      <p>
        {p.type === "VILLA" ? "Villa" : p.type === "MAISON" ? "Maison" : p.type === "IMMEUBLE" ? "Immeuble" : "Immeuble mixte"} {p.niveaux === 1 ? "RDC" : `R+${p.niveaux - 1}`},
        {" "}{dh(p.surfacePlancher)} m² de plancher{g.surfaceSousSol ? ` + sous-sol ${dh(g.surfaceSousSol)} m² (${(p.sousSol?.profondeur ?? 0).toLocaleString("fr-FR")} m)` : ""}, {p.ville || "ville non précisée"} (coefficient {res.region.coef.toLocaleString("fr-FR")}),
        {" "}standing {standingLabel(TYPE_GRILLE[p.type], p.standing)}, sol {g.sol.toLowerCase().replace("_", " / ")}, pente {p.pente ?? 0} %, fondation {g.fondation.toLowerCase().replace("_", " ")}.
      </p>
      <p>Édité le {date} — référentiel de prix {CHIFFRAGE_VERSION} — précision : niveau {res.precision.niveau} ({res.precision.libelle}), ±{Math.round(res.precision.global * 100)} %.</p>

      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="bg-slate-200">
            <th className={cell}>N°</th><th className={`${cell} text-left`}>Désignation</th><th className={cell}>U</th><th className={cell}>Quantité</th><th className={cell}>PU HT</th><th className={cell}>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          {res.lots.map((l) => (
            <React.Fragment key={l.lot.code}>
              <tr className="bg-slate-100 font-bold"><td className={cell}>{l.lot.numero}</td><td className={cell} colSpan={4}>{l.lot.libelle}</td><td className={`${cell} text-right`}>{dh(l.total)}</td></tr>
              {l.lot.code === "INS"
                ? <tr><td className={cell}>{l.lot.numero}.1</td><td className={cell}>Installation, repli et nettoyage de chantier</td><td className={cell}>ff</td><td className={`${cell} text-right`}>1</td><td className={`${cell} text-right`}>{dh(l.total)}</td><td className={`${cell} text-right`}>{dh(l.total)}</td></tr>
                : l.lignes.map((li, i) => (
                  <tr key={li.id} className="break-inside-avoid">
                    <td className={cell}>{l.lot.numero}.{i + 1}</td>
                    <td className={cell}>{li.libelle}</td>
                    <td className={`${cell} text-center`}>{li.unite}</td>
                    <td className={`${cell} text-right`}>{q(li.qte)}</td>
                    <td className={`${cell} text-right`}>{dh(li.pu)}</td>
                    <td className={`${cell} text-right`}>{dh(li.montant)}</td>
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          {([
            ["Total travaux HT", res.travauxHT],
            ["Provision pour aléas", res.aleasHT],
            [`TVA ${Math.round(TVA.taux * 100)} %`, res.tva],
            ["Total travaux TTC", res.totalTTC],
            ["Honoraires et études TTC", res.honoraires.totalTTC],
            ["Taxes et autorisations", res.taxes.total],
            ["Raccordements (estimation)", res.fraisAnnexes.total],
            ["Budget total TTC", res.budgetTTC],
          ] as [string, number][]).map(([l, v]) => (
            <tr key={l} className="font-semibold"><td className={cell} colSpan={5}>{l}</td><td className={`${cell} text-right`}>{dh(v)}</td></tr>
          ))}
        </tfoot>
      </table>
      <p className="mt-2">
        Prix 2026 base Rabat-Salé-Kénitra, sous-détail matériaux + main-d'œuvre chargée + petit matériel × K {res.k} (privé), sources : docs/prix/recherche (fiabilité A/B/C) et hypothèses CITURBAREA (H).
        Estimation indicative hors terrain, mobilier, électroménager et luminaires ; ne vaut pas offre d'entreprise. Quantités à confirmer sur plans d'exécution et étude de sol.
      </p>
    </div>
  );
}
