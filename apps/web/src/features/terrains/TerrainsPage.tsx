/**
 * /p4/terrains — annonces de terrains à vendre (porte P4, investisseur & foncier).
 * Déposées par des propriétaires ou des intermédiaires mandatés, publiées après
 * vérification. Contact uniquement via CITURBAREA, avec les services associés.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listerTerrains, type Terrain } from "./api";
import TerrainCarte from "./TerrainCarte";
import { VIDEOS, VideosYoutube } from "../social/VideosYoutube";
import { evenement } from "../../lib/marketing";

export default function TerrainsPage() {
  const [liste, setListe] = useState<Terrain[] | null>(null);
  const [ville, setVille] = useState("");
  const [usage, setUsage] = useState("");
  useEffect(() => { listerTerrains(undefined, 200).then(setListe); evenement("terrains_vus", {}, true); }, []);
  const villes = useMemo(() => [...new Set((liste ?? []).map((t) => t.ville))].sort((a, b) => a.localeCompare(b, "fr")), [liste]);
  const filtres = (liste ?? []).filter((t) => (!ville || t.ville === ville) && (!usage || t.usage === usage));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">Porte 4 · Investisseur & foncier</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A] sm:text-4xl">Terrains à vendre au Maroc</h1>
        <p className="mt-2 text-base text-slate-600">Annonces déposées par des propriétaires et des intermédiaires mandatés, vérifiées avant publication. Avant d'acheter, faites vérifier le terrain par un architecte inscrit à l'Ordre : constructibilité, règlement d'urbanisme, coût de construction.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/p4/terrains/deposer" className="inline-flex min-h-[48px] items-center rounded-lg bg-[#C9A227] px-5 font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Déposer mon terrain gratuitement</Link>
          <Link to="/p4" className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-5 font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Faire étudier un terrain</Link>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Ville
          <select value={ville} onChange={(e) => setVille(e.target.value)} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3">
            <option value="">Toutes les villes</option>
            {villes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Type
          <select value={usage} onChange={(e) => setUsage(e.target.value)} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3">
            <option value="">Tous</option>
            <option value="VILLA">Terrain à villa</option>
            <option value="IMMEUBLE">Terrain à immeuble</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="AGRICOLE">Agricole</option>
          </select>
        </label>
      </div>

      <section className="mt-6" aria-live="polite">
        {liste === null ? <p className="text-slate-500">Chargement des annonces…</p>
          : filtres.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="font-semibold text-[#0B1B3A]">Aucune annonce publiée {ville ? `à ${ville} ` : ""}pour le moment.</p>
              <p className="mt-1 text-sm text-slate-600">Propriétaire ou intermédiaire ? Déposez votre terrain : il sera vu par des acheteurs qui préparent un projet de construction.</p>
              <Link to="/p4/terrains/deposer" className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-[#0B1B3A] px-4 font-semibold text-white" style={{ textDecoration: "none", color: "#fff" }}>Déposer un terrain</Link>
            </div>
          ) : (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {filtres.map((t) => <li key={t.slug}><TerrainCarte t={t} /></li>)}
            </ul>
          )}
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["Vérifier avant d'acheter", "Note de renseignements, zonage, hauteur et surfaces constructibles : un architecte vérifie ce que vous pouvez réellement construire."],
          ["Chiffrer votre future construction", "Estimation lot par lot de votre villa ou immeuble sur ce terrain, avec l'aide à la décision selon votre budget."],
          ["Vendre mieux votre terrain", "Une étude de faisabilité jointe à l'annonce rassure l'acheteur et justifie le prix."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-[#0B1B3A]">{t}</h2>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>

      <VideosYoutube titre="En vidéo : acheter un terrain sans se tromper" videos={VIDEOS.terrain} className="mt-12" />
    </main>
  );
}
