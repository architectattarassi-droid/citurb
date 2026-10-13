/**
 * /materiaux/planning#p=… — planning d'achat des matériaux d'un projet chiffré
 * (même fragment d'URL que /chiffrage/devis : jamais transmis au serveur).
 * Matériaux par phase de réalisation, quantités en unités de vente, date
 * limite de commande, budget fournitures, « Demander les prix pour cette
 * phase » (panier de demande de prix), impression / PDF.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { chiffrer } from "../../domain/chiffrage";
import { PHASE_REAL } from "../../domain/materiaux/phases";
import { planningAchat } from "../../domain/materiaux/planning";
import { slugMateriau } from "../../domain/materiaux/reference";
import { ouvrirPanier, useMateriaux } from "./etat";
import { lireProjet, memoriserProjet } from "./projetPlanning";
import PanierDemande from "./PanierDemande";
import { texte } from "./textes";
import { fmtDH } from "./ui";

const dateLocale = (iso: string, lang: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function PlanningAchatPage() {
  const { hash } = useLocation();
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const [demarrage, setDemarrage] = useState("");
  const [ajoutee, setAjoutee] = useState<string | null>(null);
  const projet = useMemo(() => lireProjet(hash), [hash]);
  const res = useMemo(() => { if (!projet) return null; try { return chiffrer(projet, { impacts: false }); } catch { return null; } }, [projet]);
  const plan = useMemo(() => (res ? planningAchat(res, demarrage || null) : null), [res, demarrage]);
  useEffect(() => { if (projet && res) memoriserProjet(projet); }, [projet, res]);
  useEffect(() => { document.title = `${t("planningTitre")} | CITURBAREA`; }, [t]);

  if (!res || !plan) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-slate-700">{t("planningVide")}</p>
        <Link to="/chiffrage" className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-[#C9A227] px-4 font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>{t("chiffrerProjet")}</Link>
      </main>
    );
  }

  const demanderPhase = (phase: string) => {
    const ph = plan.phases.find((x) => x.phase === phase);
    if (!ph) return;
    for (const l of ph.lignes) if (l.code && l.commande) m.ajouter({ code: l.code, quantite: l.commande.quantite, unite: l.commande.unite });
    if (res.input.ville) m.setVille(res.input.ville);
    setAjoutee(phase);
    ouvrirPanier();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-10 print:pt-0">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14] print:hidden"><Link to="/materiaux" className="text-[#9a7b14] underline">{t("kicker")}</Link></p>
        <h1 className="mt-1 text-2xl font-bold text-[#0B1B3A] sm:text-3xl">{t("planningTitre")}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {t("projetResume", { type: String(res.input.type).toLowerCase(), surface: Math.round(res.geometrie.surfaceTotale), ville: res.input.ville || "—" })}
          {res.input.niveaux ? ` · ${res.input.niveaux === 1 ? "RDC" : `R+${res.input.niveaux - 1}`}` : ""}{res.input.sousSol ? " + sous-sol" : ""}
        </p>
        <p className="mt-2 text-sm text-slate-600">{t("planningSous")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("planningAide", { h: t("hypothese") })}</p>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm text-slate-700">{t("demarrage")}
          <input type="date" className="mt-1 block min-h-[44px] rounded-lg border border-slate-300 bg-white px-3" value={demarrage} onChange={(e) => setDemarrage(e.target.value)} />
        </label>
        <button type="button" onClick={() => window.print()} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0B1B3A]">{t("imprimer")}</button>
        <p className="ms-auto text-base font-bold text-[#0B1B3A]">{t("totalFournitures", { montant: fmtDH(plan.totalHT, lang) })}</p>
      </div>

      <ol className="m-0 list-none space-y-4 p-0">
        {plan.phases.map((ph) => (
          <li key={ph.phase} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold text-[#0B1B3A]">{PHASE_REAL[ph.phase].libelle[lang]}</h2>
              <span className="text-sm text-slate-600">
                {ph.debut ? t("debutPhase", { date: dateLocale(ph.debut, lang) }) : t("semaine", { n: ph.debutSemaine + 1 })} · {t("budgetPhase", { montant: fmtDH(ph.budgetHT, lang) })}
              </span>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="p-1 text-start">{t("materiau")}</th>
                    <th className="p-1 text-end">{t("quantite2")}</th>
                    <th className="p-1 text-end">{t("aCommander")}</th>
                    <th className="p-1 text-start">{t("delai")}</th>
                    <th className="p-1 text-end">{t("ht")}</th>
                  </tr>
                </thead>
                <tbody>
                  {ph.lignes.map((l) => (
                    <tr key={l.composant} className="border-t border-slate-100 align-top">
                      <td className="p-1">
                        {l.code ? <Link to={`/materiaux/${slugMateriau(l.code)}?phase=realisation`} className="text-[#0B1B3A] underline">{l.libelle}</Link> : l.libelle}
                        {!l.code && <span className="block text-xs text-slate-500">{t("surDevis")}</span>}
                      </td>
                      <td className="p-1 text-end text-slate-600">{l.quantite.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {l.unite}</td>
                      <td className="p-1 text-end font-semibold">{l.commande ? `${l.commande.quantite.toLocaleString("fr-FR")} × ${l.commande.uniteLibelle}` : "—"}</td>
                      <td className="p-1 text-xs text-slate-600">{l.dateLimite ? t("commanderAvant", { date: dateLocale(l.dateLimite, lang) }) : t("commanderJ", { j: l.commanderJMoins })}</td>
                      <td className="p-1 text-end">{fmtDH(l.montantHT, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
              <button type="button" onClick={() => demanderPhase(ph.phase)} disabled={!ph.lignes.some((l) => l.code)}
                className="min-h-[44px] rounded-lg bg-[#C9A227] px-4 text-sm font-bold text-[#0B1B3A] hover:bg-[#d6b23c] disabled:opacity-50">{t("demanderPhase")}</button>
              {ajoutee === ph.phase && <span className="text-sm text-emerald-700">{t("phaseAjoutee")}</span>}
            </div>
          </li>
        ))}
      </ol>
      <PanierDemande />
    </main>
  );
}
