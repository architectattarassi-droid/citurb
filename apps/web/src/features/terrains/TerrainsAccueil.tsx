/**
 * Bloc d'accueil « Terrains à vendre » : les 6 dernières annonces publiées,
 * ou un appel au dépôt s'il n'y en a pas encore. Liens vers la porte P4.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listerTerrains, type Terrain } from "./api";
import TerrainCarte from "./TerrainCarte";

export default function TerrainsAccueil() {
  const [liste, setListe] = useState<Terrain[]>([]);
  useEffect(() => { listerTerrains(undefined, 6).then(setListe); }, []);
  return (
    <section id="terrains" aria-labelledby="terrains-titre" style={{ scrollMarginTop: 140 }} className="px-5 py-8">
      <div className="mx-auto max-w-[1300px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="terrains-titre" className="m-0 text-[22px] font-black text-[#0B1B3A]">Terrains à vendre</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">Annonces vérifiées. Avant d'acheter, faites vérifier le terrain par un architecte inscrit à l'Ordre.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/p4/terrains/deposer" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#C9A227] px-4 text-sm font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Déposer mon terrain</Link>
            {liste.length > 0 && <Link to="/p4/terrains" className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Tous les terrains →</Link>}
          </div>
        </div>
        {liste.length > 0 ? (
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((t) => <li key={t.slug}><TerrainCarte t={t} /></li>)}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <p className="m-0 font-semibold text-[#0B1B3A]">Propriétaire ou intermédiaire ? Publiez gratuitement votre terrain.</p>
            <p className="m-0 mt-1 text-sm text-slate-600">Il sera vu par des acheteurs qui préparent un projet de construction, avec l'estimation du coût de construction sur votre terrain.</p>
          </div>
        )}
      </div>
    </section>
  );
}
