/**
 * /chiffrage/devis — devis estimatif (DQE) affiché dans une nouvelle page,
 * filigrané CITURBAREA sur toute la surface (écran et impression), prix floutés
 * (chiffres factices : les vrais montants ne sont pas dans la page),
 * avec l'appel « S'inscrire pour recevoir le devis » (LeadCaptureForm WEB_CHIFFRAGE).
 *
 * Le projet arrive dans le fragment d'URL (#p=…) : jamais transmis au serveur,
 * aucune donnée personnelle (paramètres de projet uniquement).
 */
import React, { useEffect, useMemo, useState } from "react";
import { evenement } from "../../lib/marketing";
import { VIDEOS, VideosYoutube } from "../social/VideosYoutube";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { chiffrer, type ProjetInput } from "../../domain/chiffrage";
import { PROJET_DEFAUT } from "./ChiffrageGadget";
import { Cta } from "./ChiffragePage";
import DqeImprimable from "./DqeImprimable";
import { texte } from "./textes";

function lireProjet(hash: string): ProjetInput | null {
  const m = hash.match(/^#p=(.+)$/);
  if (!m) return null;
  try {
    const p = JSON.parse(decodeURIComponent(m[1]));
    return p && typeof p === "object" && !Array.isArray(p) ? { ...PROJET_DEFAUT, ...p } : null;
  } catch { return null; }
}

/** Filigrane SVG en mosaïque diagonale (texte échappé : seul le libellé traduit y entre). */
function filigrane(texteFiligrane: string): string {
  const t = texteFiligrane.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='440' height='260'><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' transform='rotate(-28 220 130)' font-family='Arial, sans-serif' font-size='22' font-weight='700' fill='#0B1B3A' fill-opacity='0.10'>${t}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

export default function ChiffrageDevis() {
  const { hash } = useLocation();
  const { lang } = useLang();
  const t = texte(lang);
  const res = useMemo(() => {
    const p = lireProjet(hash);
    if (!p) return null;
    try { return chiffrer(p); } catch { return null; }
  }, [hash]);
  const [inscription, setInscription] = useState(false);
  useEffect(() => { if (res) evenement("devis_vu", { type: res.input.type }, true); }, [res]);

  if (!res) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-slate-700">{t("devisIntrouvable")}</p>
        <Link to="/chiffrage" className="mt-4 inline-block font-semibold text-[#0B1B3A] underline">{t("devisRetour")}</Link>
      </main>
    );
  }

  const ouvrirInscription = () => {
    setInscription(true);
    requestAnimationFrame(() => document.getElementById("inscription-devis")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main className="relative min-h-screen bg-white">
      {/* Filigrane : calque fixe au-dessus du document, n'intercepte aucun clic ; répété sur chaque page imprimée. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-20"
        style={{ backgroundImage: filigrane(t("filigrane")), backgroundRepeat: "repeat", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties} />

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-[#0B1B3A] sm:text-xl">{t("devisTitre")}</h1>
            <Link to="/chiffrage" className="text-sm text-slate-600 underline">{t("devisRetour")}</Link>
          </div>
          <button type="button" onClick={ouvrirInscription}
            className="min-h-[48px] w-full rounded-lg bg-[#C9A227] px-5 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3A] sm:w-auto">
            {t("devisInscription")}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="relative z-30 mb-3 rounded-lg border border-[#C9A227] bg-[#FFF8E1] px-3 py-2 text-sm font-semibold text-[#0B1B3A] print:hidden">{t("devisFlouNote")}</p>
        <div className="overflow-x-auto">
          <DqeImprimable res={res} ecran flou />
        </div>

        <section id="inscription-devis" className="relative z-30 mx-auto mt-8 max-w-xl scroll-mt-24 print:hidden">
          {inscription
            ? <Cta r={res} t={t} ouvertParDefaut />
            : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <button type="button" onClick={ouvrirInscription}
                  className="w-full min-h-[48px] rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c]">
                  {t("devisInscription")}
                </button>
                <p className="mt-2 text-xs text-slate-500">{t("devisInscriptionSous")}</p>
              </div>
            )}
        </section>

        <VideosYoutube titre={t("videosContrat")} videos={VIDEOS.contrat} className="relative z-30 mx-auto mt-10 max-w-xl" />
      </div>
    </main>
  );
}
