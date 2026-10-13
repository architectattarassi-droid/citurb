/**
 * /appel/:jeton (et /ar/appel/:jeton) — lien personnel d'un participant,
 * sans mot de passe (reçu par e-mail ou WhatsApp). noindex.
 * ?action=accepter|contre|refuser présélectionne la réponse sans rien
 * envoyer : seule une action explicite modifie la demande.
 */
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import DetailAppel from "./DetailAppel";
import { useLangueAppel } from "./DemanderAppelVideo";
import { TEXTES } from "./textes";

export default function AppelPage({ langue }: { langue?: "ar" }) {
  const l = useLangueAppel(langue);
  const t = TEXTES[l];
  const { jeton = "" } = useParams();
  const [q] = useSearchParams();

  useEffect(() => {
    const avant = document.title;
    document.title = t.noindexTitre;
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    const r = document.createElement("meta");
    r.name = "referrer"; r.content = "no-referrer";
    document.head.append(m, r);
    return () => { document.title = avant; m.remove(); r.remove(); };
  }, [t.noindexTitre]);

  const autre = l === "ar" ? `/appel/${jeton}` : `/ar/appel/${jeton}`;
  return (
    <main className="min-h-[70vh] bg-[#F7F5EF] px-4 py-6 sm:py-10" dir={l === "ar" ? "rtl" : "ltr"} lang={l}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="m-0 text-2xl font-bold text-[#0B1B3A]">{t.mesAppels}</h1>
          <Link to={`${autre}${q.toString() ? `?${q}` : ""}`} hrefLang={l === "ar" ? "fr" : "ar"} className="text-sm font-semibold text-[#0B1B3A] underline">{l === "ar" ? t.enFrancais : t.enArabe}</Link>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <DetailAppel espace={{ type: "lien", jeton }} l={l} actionInitiale={q.get("action")} />
        </div>
        <p className="mt-4 text-xs text-slate-500">{t.principe}</p>
      </div>
    </main>
  );
}
