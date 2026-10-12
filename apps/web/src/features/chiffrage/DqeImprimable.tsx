/**
 * DQE imprimable (impression navigateur → PDF) : masqué à l'écran, seul
 * élément visible à l'impression (règle @media print du gadget).
 * `ecran` : affiché à l'écran (page /chiffrage/devis, filigranée).
 * Libellés traduits à l'affichage (textes.ts, libelles.ts) ; montants isolés en LTR pour l'arabe.
 */
import React from "react";
import { useLang } from "../../i18n/i18n";
import { libelleStanding } from "../../domain/chiffrage/decision";
import { CHIFFRAGE_VERSION, TVA, type Resultat } from "../../domain/chiffrage";
import { texte } from "./textes";
import { libelles } from "./libelles";

const NBSP = String.fromCharCode(160);
const iso = (s: string) => `${String.fromCharCode(0x2066)}${s}${String.fromCharCode(0x2069)}`; // isolat LTR (arabe)
const dh = (n: number) => iso(Math.round(n).toLocaleString("fr-FR").replace(/\s/g, NBSP));
const q = (n: number) => iso((+n.toFixed(2)).toLocaleString("fr-FR"));
const FACTICE = "4827391560";
/**
 * Prix flouté : chiffres FACTICES de même longueur, floutés. Le vrai montant
 * n'est jamais écrit dans la page (un flou CSS seul se lit à l'inspecteur).
 */
function Flou({ n, i, titre }: { n: number; i: number; titre: string }) {
  const nb = String(Math.round(Math.abs(n))).length;
  const faux = Array.from({ length: nb }, (_, k) => FACTICE[(k + i * 3) % FACTICE.length]).join("");
  return <span aria-hidden="true" title={titre} style={{ filter: "blur(4px)", userSelect: "none", WebkitUserSelect: "none" }}>{iso(Number(faux).toLocaleString("fr-FR").replace(/\s/g, NBSP))}</span>;
}

export default function DqeImprimable({ res, ecran = false, flou = false }: { res: Resultat; ecran?: boolean; flou?: boolean }) {
  const { lang } = useLang();
  const t = texte(lang);
  const L = libelles(lang);
  let k = 0;
  const px = (n: number) => (flou ? <Flou n={n} i={k++} titre={t("prixReserveTitre")} /> : dh(n));
  const p = res.input;
  const g = res.geometrie;
  const date = iso(new Date().toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR"));
  const cell = "border border-slate-400 px-1.5 py-0.5";
  const virgule = (x: number) => x.toLocaleString(lang === "en" ? "en-GB" : "fr-FR");
  const fondation = t(`fond.${g.fondation}` as never);
  return (
    <div id={ecran ? undefined : "dqe-imprimable"} className={`${ecran ? "block text-[12px] sm:text-[13px]" : "hidden print:block text-[10.5px]"} leading-tight text-black`}>
      <h1 className="text-lg font-bold">{t("dqeTitre")}</h1>
      <p>
        {t(`dqe.${p.type}` as never)} {L.niveau(p.niveaux)},
        {" "}{dh(p.surfacePlancher)} {t("dqePlancher")}{g.surfaceSousSol ? ` + ${t("dqeSousSol")} ${iso(`${dh(g.surfaceSousSol)} m²`)} (${iso(`${virgule(p.sousSol?.profondeur ?? 0)} m`)})` : ""}, {p.ville || t("dqeVilleNP")} ({t("dqeCoef")} {iso(virgule(res.region.coef))}),
        {" "}{t("dqeStanding")} : {L.standing(p.standing, libelleStanding(p.standing)).toLowerCase()}, {t("dqeSol")} {t(`dqeSol.${g.sol}` as never)}, {t("dqePente")} {iso(`${p.pente ?? 0} %`)}, {t("dqeFondation")} {fondation === `fond.${g.fondation}` ? g.fondation.toLowerCase() : fondation.toLowerCase()}.
      </p>
      <p>{t("dqeEdite", { d: date, v: CHIFFRAGE_VERSION, n: res.precision.niveau, l: L.precision(res.precision.niveau, res.precision.libelle), p: Math.round(res.precision.global * 100) })}</p>

      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="bg-slate-200">
            <th className={cell}>{t("dqeNo")}</th><th className={`${cell} text-start`}>{t("dqeDesignation")}</th><th className={cell}>{t("dqeU")}</th><th className={cell}>{t("dqeQuantite")}</th><th className={cell}>{t("dqePu")}</th><th className={cell}>{t("dqeMontant")}</th>
          </tr>
        </thead>
        <tbody>
          {res.lots.map((l) => (
            <React.Fragment key={l.lot.code}>
              <tr className="bg-slate-100 font-bold"><td className={cell}>{l.lot.numero}</td><td className={cell} colSpan={4}>{L.lot(l.lot.code, l.lot.libelle)}</td><td className={`${cell} text-end`}>{px(l.total)}</td></tr>
              {l.lot.code === "INS"
                ? <tr><td className={cell}>{l.lot.numero}.1</td><td className={cell}>{t("dqeInstallation")}</td><td className={cell}>{L.unite("ff")}</td><td className={`${cell} text-end`}>1</td><td className={`${cell} text-end`}>{px(l.total)}</td><td className={`${cell} text-end`}>{px(l.total)}</td></tr>
                : l.lignes.map((li, i) => (
                  <tr key={li.id} className="break-inside-avoid">
                    <td className={cell}>{l.lot.numero}.{i + 1}</td>
                    <td className={cell}>{L.ouvrage(li.ouvrage, li.libelle)}</td>
                    <td className={`${cell} text-center`}>{L.unite(li.unite)}</td>
                    <td className={`${cell} text-end`}>{q(li.qte)}</td>
                    <td className={`${cell} text-end`}>{px(li.pu)}</td>
                    <td className={`${cell} text-end`}>{px(li.montant)}</td>
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          {([
            [t("dqeTotalHT"), res.travauxHT],
            [t("dqeAleas"), res.aleasHT],
            [`${t("dqeTva", { t: Math.round(TVA.taux * 100) })}${res.assietteTVA < 0.999 ? t("dqeTvaTacheron") : ""}`, res.tva],
            [t("dqeTotalTTC"), res.totalTTC],
            [t("dqeHonoraires"), res.honoraires.totalTTC],
            [t("dqeTaxes"), res.taxes.total],
            [t("dqeRacc"), res.fraisAnnexes.total],
            [t("dqeBudget"), res.budgetTTC],
          ] as [string, number][]).map(([l, v]) => (
            <tr key={l} className="font-semibold"><td className={cell} colSpan={5}>{l}</td><td className={`${cell} text-end`}>{px(v)}</td></tr>
          ))}
        </tfoot>
      </table>
      <p className="mt-2">{t("dqeMention")}</p>
    </div>
  );
}
