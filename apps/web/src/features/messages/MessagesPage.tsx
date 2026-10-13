/**
 * /messages/:jeton (un fil) et /messages/boite/:jeton (tous les fils d'un
 * visiteur / client sans compte), et leurs versions /ar/… — liens
 * personnels sans mot de passe, noindex, no-referrer.
 */
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useLangueAppel } from "../appels/DemanderAppelVideo";
import BoiteMessages from "./BoiteMessages";
import FilConversation from "./FilConversation";
import { TEXTES_MSG } from "./textes";

export default function MessagesPage({ langue, boite = false }: { langue?: "ar"; boite?: boolean }) {
  const l = useLangueAppel(langue);
  const t = TEXTES_MSG[l];
  const { jeton = "" } = useParams();
  const { pathname } = useLocation();

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

  const autre = l === "ar" ? pathname.replace(/^\/ar/, "") : `/ar${pathname}`;
  return (
    <main className="min-h-[70vh] bg-[#F7F5EF] px-4 py-6 sm:py-10" dir={l === "ar" ? "rtl" : "ltr"} lang={l}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="m-0 text-2xl font-bold text-[#0B1B3A]">{t.boite}</h1>
          <Link to={autre} hrefLang={l === "ar" ? "fr" : "ar"} className="text-sm font-semibold text-[#0B1B3A] underline">{l === "ar" ? t.enFrancais : t.enArabe}</Link>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          {boite ? <BoiteMessages source={{ type: "boite", jeton }} l={l} titre={null} /> : <FilConversation espace={{ type: "lien", jeton }} l={l} />}
        </div>
      </div>
    </main>
  );
}
