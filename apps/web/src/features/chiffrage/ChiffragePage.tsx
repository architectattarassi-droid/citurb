/**
 * /chiffrage — page publique du gadget de chiffrage lot par lot.
 * Paramètres d'URL acceptés (lien depuis P1 ou le calculateur) :
 *   ?type=villa|maison|immeuble|mixte&terrain=294&villa=isolee|jumelee|bande&niveaux=2&soussol=3
 *   &standing=STANDARD&ville=Rabat (ou surface=200 pour une surface plancher saisie)
 * Appel à l'action : LeadCaptureForm (source WEB_CHIFFRAGE), DQE résumé en meta.wizard.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import LeadCaptureForm from "../lead-funnel/LeadCaptureForm";
import { lienWhatsApp } from "../../config/contact";
import { evenement } from "../../lib/marketing";
import { STANDINGS, type ProjetInput, type Resultat, type TypeBatiment } from "../../domain/chiffrage";
import ChiffrageGadget, { fmtDH, parcelleParDefaut } from "./ChiffrageGadget";
import { texte } from "./textes";

const TYPES: Record<string, TypeBatiment> = { villa: "VILLA", maison: "MAISON", immeuble: "IMMEUBLE", mixte: "MIXTE" };

export function projetDepuisUrl(search: string): Partial<ProjetInput> | undefined {
  const q = new URLSearchParams(search);
  const p: Partial<ProjetInput> = {};
  const type = TYPES[(q.get("type") || "").toLowerCase()];
  if (type) p.type = type;
  const surface = Number(q.get("surface"));
  if (surface >= 30 && surface <= 20000) p.surfacePlancher = surface;
  const niveaux = Number(q.get("niveaux"));
  if (niveaux >= 1 && niveaux <= 12) p.niveaux = Math.round(niveaux);
  const standing = q.get("standing") as ProjetInput["standing"];
  if (STANDINGS.includes(standing)) p.standing = standing;
  const terrain = Number(q.get("terrain"));
  if (terrain >= 30 && terrain <= 100000) {
    p.surfaceTerrain = terrain;
    const v = q.get("villa");
    p.parcelle = v === "jumelee" || v === "bande" || v === "isolee" ? { villaType: v } : parcelleParDefaut(p.type ?? "VILLA");
  } else if (p.surfacePlancher) p.parcelle = null;
  const ss = Number(q.get("soussol"));
  if (ss >= 2 && ss <= 8) p.sousSol = { profondeur: ss };
  const ville = q.get("ville");
  if (ville) p.ville = ville.slice(0, 40);
  return Object.keys(p).length ? p : undefined;
}

/** Résumé du DQE joint au lead (borné par sanitizeWizard). */
export function resumeLead(r: Resultat) {
  const p = r.input;
  return {
    chiffrage: {
      type: p.type, ville: p.ville, surfacePlancher: p.surfacePlancher, niveaux: p.niveaux, standing: p.standing,
      finitions: p.finitions, sol: r.geometrie.sol, fondation: r.geometrie.fondation, pente: p.pente ?? 0,
      sousSol: p.sousSol ? { profondeur: p.sousSol.profondeur, surface: r.geometrie.surfaceSousSol, nappe: !!p.nappe } : null,
      travauxHT: Math.round(r.travauxHT), totalTTC: Math.round(r.totalTTC), budgetTTC: Math.round(r.budgetTTC),
      coutM2HT: Math.round(r.coutM2BatimentHT), precision: r.precision.niveau, regime: r.regime,
      surfaceTerrain: p.surfaceTerrain, parcelle: p.parcelle ?? null, surfacePlancherTotale: Math.round(r.geometrie.surfaceTotale),
      impacts: r.impacts.map((i) => ({ cle: i.cle, montantHT: Math.round(i.montantHT), soutenement: Math.round(i.dontSoutenement) })),
      lots: r.lots.map((l) => ({ lot: l.lot.code, ht: Math.round(l.total) })),
      quantitesSaisies: p.quantites ? Object.keys(p.quantites).length : 0,
    },
  };
}

export default function ChiffragePage() {
  const { search } = useLocation();
  const { lang } = useLang();
  const t = texte(lang);
  const initial = useMemo(() => projetDepuisUrl(search), [search]);
  // Les paramètres d'URL ne servent qu'à l'arrivée : ensuite le brouillon fait foi (un rechargement ne réinitialise plus le projet).
  useEffect(() => {
    if (search) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [search]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-6 max-w-3xl print:hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">{t("kicker")}</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A] sm:text-4xl">{t("titre")}</h1>
        <p className="mt-2 text-base text-slate-600">{t("sousTitre")}</p>
        <p className="mt-3 text-sm font-semibold text-[#0B1B3A]">{t("assurance")}</p>
      </header>
      <ChiffrageGadget variante="public" initial={initial} renderCta={(r) => <Cta r={r} t={t} />} />
      <Argumentaire t={t} lang={lang} />
    </main>
  );
}

export function Cta({ r, t, ouvertParDefaut = false }: { r: Resultat; t: ReturnType<typeof texte>; ouvertParDefaut?: boolean }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const p = r.input;
  const porte = p.type === "IMMEUBLE" || p.type === "MIXTE" ? "P2" : "P1";
  if (!ouvert) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button type="button" onClick={() => setOuvert(true)}
          className="w-full min-h-[48px] rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3A]">
          {t("cta")}
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">{t("ctaSous")}</p>
        <a href={lienWhatsApp(`Bonjour, j'ai une question sur mon chiffrage citurbarea.com (${p.type.toLowerCase()} ${Math.round(r.geometrie.surfaceTotale)} m², ${p.ville || "ville à préciser"}).`)}
          target="_blank" rel="noopener noreferrer" onClick={() => evenement("whatsapp_click", { emplacement: "resultat" })}
          className="mt-3 flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-600 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" style={{ textDecoration: "none" }}>
          {t("ctaWhatsapp")}
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-[#0B1B3A]">{t("formTitre")}</h2>
      <LeadCaptureForm
        source="WEB_CHIFFRAGE"
        porteType={porte}
        variante="whatsapp"
        withEmail
        initial={{ projet: `Chiffrage ${p.type.toLowerCase()} ${Math.round(r.geometrie.surfaceTotale)} m²${r.geometrie.surfaceSousSol ? " (sous-sol compris)" : ""} ${p.niveaux === 1 ? "RDC" : `R+${p.niveaux - 1}`}${p.ville ? `, ${p.ville}` : ""} : ${fmtDH(r.totalTTC)} TTC (niveau ${r.precision.niveau})` }}
        extraCapture={() => ({ budget: Math.round(r.budgetTTC), ville: p.ville || undefined, surface: Math.round(r.geometrie.surfaceTotale) })}
        extraMeta={resumeLead(r)}
      />
    </div>
  );
}

/** Argumentaire de la page officielle : étapes, bénéfices, FAQ (FAQ en français et en anglais). */
function Argumentaire({ t, lang }: { t: ReturnType<typeof texte>; lang: string }) {
  const etapes = [1, 2, 3] as const;
  const benefices = [1, 2, 3, 4] as const;
  const faq = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  return (
    <div className="mt-12 grid gap-10 print:hidden">
      <section aria-labelledby="etapes-titre">
        <h2 id="etapes-titre" className="text-2xl font-bold text-[#0B1B3A]">{t("etapesTitre")}</h2>
        <ol className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-3">
          {etapes.map((i) => (
            <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A227] font-bold text-[#0B1B3A]">{i}</span>
              <h3 className="mt-2 font-bold text-[#0B1B3A]">{t(`comment${i}T` as Parameters<typeof t>[0])}</h3>
              <p className="mt-1 text-sm text-slate-600">{t(`comment${i}` as Parameters<typeof t>[0])}</p>
            </li>
          ))}
        </ol>
      </section>
      {lang !== "ar" && (
        <section aria-labelledby="benefices-titre">
          <h2 id="benefices-titre" className="text-2xl font-bold text-[#0B1B3A]">{t("beneficesTitre")}</h2>
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
            {benefices.map((i) => (
              <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-[#0B1B3A]">{t(`benefice${i}T` as Parameters<typeof t>[0])}</h3>
                <p className="mt-1 text-sm text-slate-600">{t(`benefice${i}` as Parameters<typeof t>[0])}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lang !== "ar" && (
        <section aria-labelledby="faq-titre" className="max-w-3xl">
          <h2 id="faq-titre" className="text-2xl font-bold text-[#0B1B3A]">{t("faqTitre")}</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faq.map((i) => (
              <details key={i} className="group px-4 py-3">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[#0B1B3A]">
                  {t(`faq${i}Q` as Parameters<typeof t>[0])}
                  <span aria-hidden className="text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-slate-600">{t(`faq${i}R` as Parameters<typeof t>[0])}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
