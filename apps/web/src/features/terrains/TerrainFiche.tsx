/**
 * /p4/terrains/:slug — fiche d'un terrain : caractéristiques, estimation du coût de
 * construction sur ce terrain, services CITURBAREA, contact (lead P4 via WhatsApp).
 * Aucune coordonnée du déposant n'est affichée : l'architecte met en relation.
 */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LIB_TITRE, LIB_USAGE, dh, terrainParSlug, type Terrain } from "./api";
import LeadCaptureForm from "../lead-funnel/LeadCaptureForm";
import { evenement } from "../../lib/marketing";

export default function TerrainFiche() {
  const { slug = "" } = useParams();
  const [t, setT] = useState<Terrain | null | undefined>(undefined);
  useEffect(() => { terrainParSlug(slug).then((x) => { setT(x); if (x) evenement("terrain_vu", { usage: x.usage }, true); }); }, [slug]);
  useEffect(() => {
    if (t) document.title = `Terrain ${t.surface.toLocaleString("fr-FR")} m² à ${t.ville}${t.prix ? ` — ${dh(t.prix)}` : ""} | CITURBAREA`;
  }, [t]);

  if (t === undefined) return <main className="mx-auto max-w-4xl px-4 py-16 text-slate-500">Chargement…</main>;
  if (t === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-[#0B1B3A]">Annonce introuvable</h1>
        <p className="mt-2 text-slate-600">Ce terrain n'est plus en ligne ou l'adresse est incorrecte.</p>
        <Link to="/p4/terrains" className="mt-4 inline-block font-semibold text-[#0B1B3A] underline">← Tous les terrains</Link>
      </main>
    );
  }
  const typeProjet = t.usage === "IMMEUBLE" || t.usage === "COMMERCIAL" ? "immeuble" : "villa";
  const lienChiffrage = `/chiffrage?type=${typeProjet}&terrain=${Math.round(t.surface)}&ville=${encodeURIComponent(t.ville)}`;
  const vendu = t.statut === "VENDU";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
      <Link to="/p4/terrains" className="text-sm text-slate-600 underline">← Tous les terrains</Link>
      <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">{LIB_USAGE[t.usage]} · {LIB_TITRE[t.titre]}{vendu ? " · Vendu" : ""}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A]">Terrain de {t.surface.toLocaleString("fr-FR")} m² à {t.quartier ? `${t.quartier}, ` : ""}{t.ville}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Surface", `${t.surface.toLocaleString("fr-FR")} m²`],
              ["Prix", t.prix ? dh(t.prix) : "Sur demande"],
              ["Prix au m²", t.prixM2 ? dh(t.prixM2) : "—"],
              ["Situation", LIB_TITRE[t.titre]],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="m-0 text-base font-bold text-[#0B1B3A]">{v}</dd>
              </div>
            ))}
          </dl>
          {t.description && <p className="mt-5 whitespace-pre-line text-slate-700">{t.description}</p>}
          <p className="mt-3 text-xs text-slate-500">Annonce déposée par un {t.deposant === "INTERMEDIAIRE" ? "intermédiaire mandaté" : "propriétaire"}, vérifiée par CITURBAREA avant publication. Les informations sont déclaratives : faites vérifier le titre et la constructibilité avant tout engagement.</p>

          <section className="mt-8 rounded-2xl border border-[#C9A227] bg-[#FFF8E1] p-5">
            <h2 className="text-xl font-bold text-[#0B1B3A]">Combien coûterait votre construction sur ce terrain ?</h2>
            <p className="mt-1 text-sm text-slate-700">Estimation lot par lot, des fondations aux finitions, avec l'aide à la décision selon votre budget. Gratuit, sans engagement.</p>
            <Link to={lienChiffrage} onClick={() => evenement("terrain_chiffrage", {})} className="mt-3 inline-flex min-h-[48px] items-center rounded-lg bg-[#0B1B3A] px-5 font-bold text-white" style={{ textDecoration: "none", color: "#fff" }}>Chiffrer mon projet sur ce terrain →</Link>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-[#0B1B3A]">Ce qu'un architecte vérifie avant votre achat</h2>
            <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
              {[
                ["Constructibilité", "Note de renseignements urbanistiques, zonage, hauteur (R+), coefficient d'emprise au sol."],
                ["Faisabilité", "Ce que vous pouvez construire et pour combien : surfaces, niveaux, sous-sol, budget."],
                ["Situation juridique", "Titre foncier, réquisition en cours ou melk : ce que cela change pour le permis et le financement."],
                ["Votre projet", "Plan type ou plan personnalisé, permis de construire, suivi de chantier."],
              ].map(([k, v]) => (
                <li key={k} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-bold text-[#0B1B3A]">{k}</p>
                  <p className="mt-1 text-sm text-slate-600">{v}</p>
                </li>
              ))}
            </ul>
          </section>
        </article>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#0B1B3A]">{vendu ? "Ce terrain est vendu" : "Ce terrain vous intéresse ?"}</h2>
            <p className="mt-1 text-sm text-slate-600">{vendu ? "Laissez votre numéro : nous vous proposons des terrains comparables." : "Un architecte CITURBAREA vous met en relation et vérifie le terrain avec vous. Gratuit, sans engagement."}</p>
            <div className="mt-3">
              <LeadCaptureForm
                source="WEB_TERRAIN_INTERET"
                porteType="P4"
                variante="whatsapp"
                withEmail
                compact
                initial={{ projet: `Intéressé par le terrain ${t.surface} m² à ${t.ville}${t.prix ? ` (${dh(t.prix)})` : ""} — ${t.slug}` }}
                extraCapture={() => ({ ville: t.ville, surface: t.surface, ...(t.prix ? { budget: t.prix } : {}) })}
                extraMeta={{ terrain: { slug: t.slug, surface: t.surface, prix: t.prix, ville: t.ville, usage: t.usage } }}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
