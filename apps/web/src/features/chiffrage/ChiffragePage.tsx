/**
 * /chiffrage — page publique du gadget de chiffrage lot par lot.
 * Paramètres d'URL acceptés (lien depuis P1 ou le calculateur) :
 *   ?type=villa|maison|immeuble|mixte&surface=200&niveaux=2&standing=STANDARD&ville=Rabat
 * Appel à l'action : LeadCaptureForm (source WEB_CHIFFRAGE), DQE résumé en meta.wizard.
 */
import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import LeadCaptureForm from "../lead-funnel/LeadCaptureForm";
import { STANDINGS, type ProjetInput, type Resultat, type TypeBatiment } from "../../domain/chiffrage";
import ChiffrageGadget, { fmtDH } from "./ChiffrageGadget";
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
      coutM2HT: Math.round(r.coutM2HT), precision: r.precision.niveau,
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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-6 max-w-3xl print:hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">{t("kicker")}</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A] sm:text-4xl">{t("titre")}</h1>
        <p className="mt-2 text-base text-slate-600">{t("sousTitre")}</p>
      </header>
      <ChiffrageGadget variante="public" initial={initial} renderCta={(r) => <Cta r={r} t={t} />} />
    </main>
  );
}

function Cta({ r, t }: { r: Resultat; t: ReturnType<typeof texte> }) {
  const [ouvert, setOuvert] = useState(false);
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
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-[#0B1B3A]">{t("formTitre")}</h2>
      <LeadCaptureForm
        source="WEB_CHIFFRAGE"
        porteType={porte}
        withEmail
        initial={{ projet: `Chiffrage ${p.type.toLowerCase()} ${p.surfacePlancher} m² ${p.niveaux === 1 ? "RDC" : `R+${p.niveaux - 1}`}${p.ville ? `, ${p.ville}` : ""} : ${fmtDH(r.totalTTC)} TTC (niveau ${r.precision.niveau})` }}
        extraCapture={() => ({ budget: Math.round(r.budgetTTC), ville: p.ville || undefined, surface: Math.round(r.geometrie.surfaceTotale) })}
        extraMeta={resumeLead(r)}
      />
    </div>
  );
}
