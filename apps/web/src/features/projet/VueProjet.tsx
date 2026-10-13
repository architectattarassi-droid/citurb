/**
 * Vue d'un projet, commune aux membres (/projet) et au back-office (/cc/projets/:id) :
 * tableau de bord (phases → jalons, avancement, points d'arrêt en attente,
 * derniers messages et photos, filtres, recherche) ; le jalon choisi
 * (?jalon=CODE) s'ouvre dans PageJalon, chargée à la demande.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { lireProjet, urlFichier, type ResumeJalon, type VueProjetDonnees } from "./api";
import { COULEUR_STATUT, dateHeure, erreur, role, T } from "./libelles";

const PageJalon = lazy(() => import("./PageJalon"));

type Filtre = "tout" | "maPart" | "aValider";

const titrePhase = (phases: Record<string, string>, j: ResumeJalon) => {
  const g = j.phaseGabarit ?? j.phase;
  const base = phases[g] ?? g.replace(/^\d+[A-Z]?_/, "").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return j.niveau ? `${base} — ${j.niveau}` : base;
};

export default function VueProjet({ base, projetId, entete }: { base: string; projetId: string; entete?: React.ReactNode }) {
  const [params, setParams] = useSearchParams();
  const code = params.get("jalon");
  const [d, setD] = useState<VueProjetDonnees | null>(null);
  const [err, setErr] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    const r = await lireProjet(base, projetId);
    if (r.ok) { setD(r.data); setErr(""); } else setErr(r.error);
  }, [base, projetId]);
  useEffect(() => { void charger(); }, [charger]);

  const ouvrir = (c: string | null) => {
    const p = new URLSearchParams(params);
    if (c) p.set("jalon", c); else p.delete("jalon");
    setParams(p, { replace: false });
    window.scrollTo(0, 0);
  };

  const filtres = useMemo(() => {
    if (!d) return [];
    const q = recherche.trim().toLowerCase();
    return d.jalons.filter((j) =>
      (filtre === "tout" || (filtre === "maPart" && (j.maPart || d.moi.superviseur)) || (filtre === "aValider" && j.aValider)) &&
      (!q || j.titre.toLowerCase().includes(q) || j.code.toLowerCase().includes(q)));
  }, [d, filtre, recherche]);

  const groupes = useMemo(() => {
    const m = new Map<string, ResumeJalon[]>();
    if (d) for (const j of filtres) {
      const t = titrePhase(d.projet.phases, j);
      m.set(t, [...(m.get(t) ?? []), j]);
    }
    return [...m.entries()];
  }, [d, filtres]);

  if (err && !d) return <p className="rounded-lg bg-red-50 p-4 text-red-800">{erreur(err)}</p>;
  if (!d) return <p className="p-4 text-slate-500" aria-busy="true">Chargement du projet…</p>;

  if (code) {
    return (
      <Suspense fallback={<p className="p-4 text-slate-500">Chargement du jalon…</p>}>
        <PageJalon base={base} projetId={projetId} code={code} projet={d} onRetour={() => { ouvrir(null); void charger(); }} onOuvrir={ouvrir} />
      </Suspense>
    );
  }

  const total = d.jalons.length;
  const termines = d.jalons.filter((j) => j.statut === "VALIDE" || j.statut === "SANS_OBJET").length;
  const pct = total ? Math.round((termines / total) * 100) : 0;
  const arrets = d.jalons.filter((j) => j.pointArret && j.statut !== "VALIDE" && j.statut !== "SANS_OBJET");
  const arretsEnAttente = arrets.filter((j) => j.statut === "EN_ATTENTE_VALIDATION");
  const nbAValider = d.jalons.filter((j) => j.aValider).length;
  const recherchant = !!recherche.trim() || filtre !== "tout";

  return (
    <div className="mx-auto max-w-5xl px-3 pb-24 pt-4 sm:px-6">
      {entete}
      <header className="mb-4">
        <h1 className="m-0 text-xl font-bold text-[#0B1B3A] sm:text-2xl">{d.projet.titre}</h1>
        <p className="m-0 mt-1 text-sm text-slate-600">
          {d.moi.nom} · {role(d.moi.role)} · {total} jalons · {d.projet.caracteristiques.type.toLowerCase()}
          {d.projet.caracteristiques.etagesHorsSol ? ` R+${d.projet.caracteristiques.etagesHorsSol}` : " RDC"}
          {d.projet.caracteristiques.sousSols ? ` · ${d.projet.caracteristiques.sousSols} sous-sol(s)` : ""}
        </p>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Avancement">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-baseline justify-between"><span className="text-sm text-slate-600">Avancement</span><strong className="text-2xl text-[#0B1B3A]">{pct} %</strong></div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 mt-1 text-xs text-slate-500">{termines} / {total} jalons validés ou sans objet</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-sm text-slate-600">Points d'arrêt ouverts</span><strong className="block text-2xl text-red-700">{arrets.length}</strong></div>
        <button type="button" onClick={() => setFiltre("aValider")} className="min-h-[44px] rounded-xl border border-slate-200 bg-white p-3 text-left"><span className="text-sm text-slate-600">À valider par moi</span><strong className="block text-2xl text-amber-700">{nbAValider}</strong></button>
      </section>

      {!total && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-slate-600">
          Aucun jalon pour ce projet : le référentiel ne contenait pas encore de jalon applicable à ces caractéristiques lors de la création.
        </p>
      )}

      {arretsEnAttente.length > 0 && (
        <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <h2 className="m-0 mb-2 text-base font-semibold text-red-900">Points d'arrêt en attente de validation</h2>
          <ul className="m-0 grid list-none gap-1 p-0">
            {arretsEnAttente.slice(0, 6).map((j) => (
              <li key={j.code}><button type="button" onClick={() => ouvrir(j.code)} className="min-h-[44px] w-full rounded-lg bg-white px-3 text-left text-sm font-medium text-red-900 underline-offset-2 hover:underline">{j.titre}</button></li>
            ))}
          </ul>
        </section>
      )}

      {(d.derniersMessages.length > 0 || d.dernieresPhotos.length > 0) && (
        <section className="mb-4 grid gap-3 sm:grid-cols-2">
          {d.derniersMessages.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <h2 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">Derniers messages</h2>
              <ul className="m-0 grid list-none gap-2 p-0">
                {d.derniersMessages.slice(0, 4).map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => ouvrir(m.jalonCode)} className="w-full text-left">
                      <span className="block text-xs text-slate-500">{m.auteurNom} · {dateHeure(m.createdAt)} · {m.jalonTitre}</span>
                      <span className="line-clamp-2 block text-sm text-slate-800">{m.texte || "(pièce jointe)"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.dernieresPhotos.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <h2 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">Dernières photos</h2>
              <div className="grid grid-cols-4 gap-1">
                {d.dernieresPhotos.map((f) => (
                  <button key={f.id} type="button" onClick={() => f.jalonCode && ouvrir(f.jalonCode)} className="aspect-square overflow-hidden rounded bg-slate-100">
                    {f.type.startsWith("image/")
                      ? <img src={urlFichier(base, projetId, f.id)} alt={f.nom} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      : <span className="flex h-full items-center justify-center text-xs text-slate-500">Vidéo</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {total > 0 && (
        <section aria-label="Jalons">
          <div className="sticky top-0 z-10 -mx-3 mb-3 flex flex-wrap gap-2 bg-[#f8fafc]/95 px-3 py-2 backdrop-blur sm:mx-0 sm:px-0">
            {([["tout", "Tout"], ["maPart", "Ma part"], ["aValider", `À valider (${nbAValider})`]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFiltre(k)} aria-pressed={filtre === k}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${filtre === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>{l}</button>
            ))}
            <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un jalon…" aria-label="Rechercher un jalon"
              className="min-h-[44px] min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 text-base" />
          </div>
          {!filtres.length && <p className="text-slate-500">Aucun jalon ne correspond.</p>}
          <div className="grid gap-2">
            {groupes.map(([titre, js]) => {
              const ok = js.filter((j) => j.statut === "VALIDE" || j.statut === "SANS_OBJET").length;
              const actif = js.some((j) => j.statut === "EN_COURS" || j.statut === "EN_ATTENTE_VALIDATION");
              return (
                <details key={titre} open={recherchant || actif} className="rounded-xl border border-slate-200 bg-white">
                  <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-2 px-3 py-2">
                    <span className="font-semibold text-[#0B1B3A]">{titre}</span>
                    <span className="shrink-0 text-xs text-slate-500">{ok}/{js.length}</span>
                  </summary>
                  <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                    {js.map((j) => (
                      <li key={j.code}>
                        <button type="button" onClick={() => ouvrir(j.code)} className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-900">{j.pointArret && <span className="mr-1 rounded bg-red-600 px-1 text-[10px] font-bold uppercase text-white">Arrêt</span>}{j.titre}</span>
                            <span className="block text-xs text-slate-500">{j.nbFaits}/{j.nbPoints} points · {j.acteurs.map(role).join(", ")}{j.maPart ? " · ma part" : ""}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${COULEUR_STATUT[j.statut]}`}>{T.statuts[j.statut]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
