import React from "react";
import { Link } from "react-router-dom";
import { LIB_TITRE, LIB_USAGE, dh, type Terrain } from "./api";

/** Carte d'une annonce de terrain (liste P4 et accueil). */
export default function TerrainCarte({ t }: { t: Terrain }) {
  const vendu = t.statut === "VENDU";
  return (
    <Link to={`/p4/terrains/${t.slug}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#C9A227] hover:shadow" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-[#0B1B3A] px-2.5 py-1 text-xs font-semibold text-white">{LIB_USAGE[t.usage] ?? "Terrain"}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vendu ? "bg-slate-200 text-slate-600" : t.titre === "TITRE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{vendu ? "Vendu" : LIB_TITRE[t.titre]}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#0B1B3A]">{t.surface.toLocaleString("fr-FR")} m²</p>
      <p className="text-sm text-slate-600">{t.quartier ? `${t.quartier}, ` : ""}{t.ville}</p>
      <div className="mt-auto pt-3">
        {t.prix ? (
          <p className="text-lg font-bold text-[#0B1B3A]">{dh(t.prix)} {t.prixM2 ? <span className="text-sm font-normal text-slate-500">· {dh(t.prixM2)}/m²</span> : null}</p>
        ) : <p className="text-sm font-semibold text-slate-600">Prix sur demande</p>}
        <p className="mt-1 text-sm font-semibold text-[#9a7b14] group-hover:underline">Voir le terrain →</p>
      </div>
    </Link>
  );
}
