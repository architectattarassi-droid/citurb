/**
 * Onglets « Étude » et « Réalisation » de la fiche matériau : la même fiche
 * vue au moment où on choisit le matériau, puis au moment où on l'achète.
 * Le référentiel des jalons (exigences, normes) est chargé à la demande.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n/i18n";
import { chiffrer } from "../../domain/chiffrage";
import { OUVRAGES } from "../../domain/chiffrage/ouvrages";
import type { Moment } from "../../domain/referentiel/types";
import type { MaterialRef } from "../../domain/materiaux/types";
import { exigencesMateriau, poidsDansOuvrages, type ExigenceAffichee } from "../../domain/materiaux/etude";
import { PHASES_ETUDE, PHASE_REAL, STOCKAGE, delaiMateriau, phasesMateriau } from "../../domain/materiaux/phases";
import { planningAchat } from "../../domain/materiaux/planning";
import { lireProjet } from "./projetPlanning";
import type { T } from "./textes";
import { fmtDH, uniteCourte } from "./ui";

const carte = "rounded-2xl border border-slate-200 bg-white p-4";
const h2 = "text-lg font-bold text-[#0B1B3A]";

type Ref = Parameters<typeof exigencesMateriau>[0];
let referentielCharge: Promise<Ref | null> | null = null;
function useExigences(code: string, moments: Moment[]): ExigenceAffichee[] | null {
  const [l, setL] = useState<ExigenceAffichee[] | null>(null);
  const cle = moments.join(",");
  useEffect(() => {
    let vivant = true;
    referentielCharge ||= import("../../domain/referentiel").then((m) => m.referentiel()).catch(() => null);
    referentielCharge.then((ref) => vivant && setL(ref ? exigencesMateriau(ref, code, moments) : []));
    return () => { vivant = false; };
  }, [code, cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return l;
}

function Exigences({ code, moments, titre, t }: { code: string; moments: Moment[]; titre: string; t: T }) {
  const l = useExigences(code, moments);
  if (l === null) return <section className={`${carte} mt-4`} aria-busy="true"><h2 className={h2}>{titre}</h2></section>;
  if (!l.length) return null;
  return (
    <section className={`${carte} mt-4`}>
      <h2 className={h2}>{titre}</h2>
      <ul className="mt-2 space-y-2 p-0">
        {l.map((e) => (
          <li key={e.id} className="list-none text-sm text-slate-700">
            <span className={`me-2 rounded px-1.5 py-0.5 text-xs font-semibold ${e.criticite === "BLOQUANT" ? "bg-red-100 text-red-800" : e.criticite === "MAJEUR" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{e.criticite.toLowerCase()}</span>
            {e.texte}
            {e.normes.length > 0 && <span className="block text-xs text-slate-500">{e.normes.join(" · ")}{e.reference ? ` — ${e.reference}` : ""}{!e.verifie ? ` (${t("aVerifier")})` : ""}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">{t("normesAide")}</p>
    </section>
  );
}

export function OngletEtude({ r, t, lang }: { r: MaterialRef; t: T; lang: Lang }) {
  const ph = phasesMateriau(r.code);
  const poids = useMemo(() => poidsDansOuvrages(r.code), [r.code]);
  if (!ph) return null;
  return (
    <>
      <section className={`${carte} mt-4`}>
        <h2 className={h2}>{t("etudeTitre")}</h2>
        <ol className="mt-2 space-y-2 p-0">
          {PHASES_ETUDE.filter((p) => ph.etude.includes(p.id)).map((p) => (
            <li key={p.id} className="list-none rounded-lg bg-slate-50 p-2 text-sm">
              <p className="font-semibold text-[#0B1B3A]">{p.libelle[lang]}</p>
              <p className="text-slate-700"><span className="text-xs font-semibold uppercase text-slate-500">{t("aDecider")} : </span>{p.decision[lang]}</p>
            </li>
          ))}
        </ol>
      </section>
      {poids.length > 0 && (
        <section className={`${carte} mt-4`}>
          <h2 className={h2}>{t("poidsTitre")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("poidsAide")}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <tbody>
                {poids.slice(0, 10).map((p) => (
                  <tr key={p.ouvrage} className="border-t border-slate-100">
                    <td className="p-1">{p.libelle} <span className="text-xs text-slate-500">({p.ouvrage}{p.cps ? ` · CPS ${p.cps}` : ""})</span></td>
                    <td className="p-1 text-end">{fmtDH(p.fourniture, lang)} / {p.unite}</td>
                    <td className="p-1 text-end text-slate-600">{Math.round(p.part * 100)} % de {fmtDH(p.puOuvrage, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className={`${carte} mt-4`}>
        <h2 className={h2}>{t("posteDqe")}</h2>
        <ul className="mt-2 grid gap-1 p-0 text-sm sm:grid-cols-2">
          {ph.ouvrages.slice(0, 16).map((o) => <li key={o} className="list-none">• {o} — {OUVRAGES[o]?.libelle}{OUVRAGES[o]?.cps ? ` (CPS ${OUVRAGES[o].cps})` : ""}</li>)}
          {r.lots.map((l) => <li key={l} className="list-none text-slate-600">• {l.replace(/_/g, " ").toLowerCase()}</li>)}
        </ul>
      </section>
      <Exigences code={r.code} moments={["CONCEPTION"]} titre={t("normesConception")} t={t} />
    </>
  );
}

export function OngletRealisation({ r, t, lang }: { r: MaterialRef; t: T; lang: Lang }) {
  const ph = phasesMateriau(r.code);
  const delai = delaiMateriau(r.code);
  // Quantité pour le dernier projet chiffré dans ce navigateur (aucune donnée personnelle).
  const quantite = useMemo(() => {
    const p = lireProjet("");
    if (!p) return null;
    try {
      const plan = planningAchat(chiffrer(p, { impacts: false }));
      const lignes = plan.phases.flatMap((x) => x.lignes.filter((l) => l.code === r.code).map((l) => ({ ...l, phase: x.phase })));
      return lignes.length ? { lignes, ville: plan.ville } : null;
    } catch { return null; }
  }, [r.code]);
  if (!ph) return null;
  return (
    <>
      <section className={`${carte} mt-4`}>
        <h2 className={h2}>{t("realTitre")}</h2>
        <ul className="mt-2 space-y-1 p-0">
          {ph.realisation.map((p) => <li key={p} className="list-none text-base font-semibold text-[#0B1B3A]">• {PHASE_REAL[p].libelle[lang]}</li>)}
        </ul>
        {ph.aValider && <p className="mt-1 text-xs text-amber-800">{t("aValider")}</p>}
        <p className="mt-2 text-sm text-slate-700">{t("commanderJours", { j: delai.jours })} — {delai.note} <span className="text-xs text-slate-500">({t("hypothese")})</span></p>
        {r.ventes.length > 0 && (
          <p className="mt-2 text-sm text-slate-600">{r.ventes.map((v) => `${v.libelle} = ${v.facteur.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${uniteCourte(r.uniteRef)}`).join(" · ")}</p>
        )}
      </section>
      {quantite && (
        <section className={`${carte} mt-4`}>
          <h2 className={h2}>{t("quantiteProjet")}</h2>
          <ul className="mt-2 space-y-1 p-0 text-sm">
            {quantite.lignes.map((l, i) => (
              <li key={i} className="list-none">{PHASE_REAL[l.phase].libelle[lang]} : <strong>{l.commande ? `${l.commande.quantite.toLocaleString("fr-FR")} × ${l.commande.uniteLibelle}` : `${l.quantite} ${l.unite}`}</strong> ({fmtDH(l.montantHT, lang)} {t("ht")}, {t("commanderJ", { j: l.commanderJMoins })})</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-500">{t("quantiteProjetAide")} {quantite.ville}</p>
          <Link to="/materiaux/planning" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#0B1B3A] underline">{t("planningLien")}</Link>
        </section>
      )}
      {!quantite && (
        <p className="mt-4 text-sm"><Link to="/chiffrage" className="font-semibold text-[#0B1B3A] underline">{t("planningLien")}</Link> — {t("planningLienAide")}</p>
      )}
      <section className={`${carte} mt-4`}>
        <h2 className={h2}>{t("stockage")}</h2>
        <p className="mt-1 text-sm text-slate-700">{STOCKAGE[r.categorie][lang]}</p>
        <p className="mt-1 text-xs text-slate-500">{t("hypothese")}</p>
      </section>
      <Exigences code={r.code} moments={["EXECUTION", "RECEPTION"]} titre={t("normesExecution")} t={t} />
    </>
  );
}
