/**
 * Liste des demandes d'appel d'un espace connecté (pro Cercles, membre de
 * projet, back-office) + détail au clic. Mobile d'abord : la liste, puis le
 * détail à sa place (bouton retour).
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiAppels, type DemandeVue, type ResumeAppel } from "./api";
import DetailAppel, { Pastille } from "./DetailAppel";
import { dateHeure } from "./heures";
import { erreurLisible, TEXTES, type LangueAppel } from "./textes";

type Props = {
  espace: { type: "pro" } | { type: "membre" } | { type: "admin" };
  l: LangueAppel;
  /** Titre affiché (par défaut « Appels vidéo »). */
  titre?: string | null;
  extra?: (d: DemandeVue, recharger: () => void) => ReactNode;
  /** Ligne supplémentaire par demande (back-office). */
  marque?: (r: ResumeAppel) => ReactNode;
};

export default function MesAppels({ espace, l, titre, extra, marque }: Props) {
  const t = TEXTES[l];
  const [liste, setListe] = useState<ResumeAppel[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"tous" | "repondre" | "CONFIRMEE">("tous");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const type = espace.type;

  const charger = useCallback(async () => {
    const r = await apiAppels.lister({ type } as Props["espace"]);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); return; }
    setErreur(null);
    setListe(r.data.demandes);
  }, [type, l]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void charger(); }, [charger]);

  const visibles = (liste || []).filter((d) => filtre === "tous" || (filtre === "repondre" ? d.aRepondre : d.statut === filtre));
  const nbARepondre = (liste || []).filter((d) => d.aRepondre).length;

  if (ouvert) {
    return (
      <div className="grid gap-3" dir={l === "ar" ? "rtl" : "ltr"}>
        <button type="button" className="justify-self-start text-sm font-semibold text-[#0B1B3A] underline underline-offset-2" onClick={() => { setOuvert(null); void charger(); }}>← {t.retour}</button>
        <DetailAppel espace={espace} id={ouvert} l={l} extra={extra} onChange={() => void charger()} />
      </div>
    );
  }

  return (
    <section className="grid gap-3 text-start" dir={l === "ar" ? "rtl" : "ltr"} lang={l} aria-label={t.mesAppels}>
      {titre !== null && (
        <header>
          <h2 className="m-0 text-lg font-bold text-[#0B1B3A]">{titre ?? t.mesAppels}{nbARepondre > 0 && <span className="ms-2 inline-flex min-w-[24px] justify-center rounded-full bg-[#C9A227] px-2 text-sm text-[#0B1B3A]">{nbARepondre}</span>}</h2>
          <p className="m-0 text-sm text-slate-600">{t.mesAppelsAide}</p>
        </header>
      )}
      <div className="flex flex-wrap gap-2" role="tablist">
        {([["tous", t.tous], ["repondre", t.aRepondre], ["CONFIRMEE", t.statut.CONFIRMEE]] as const).map(([k, lib]) => (
          <button key={k} type="button" role="tab" aria-selected={filtre === k} onClick={() => setFiltre(k)}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold ${filtre === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-[#0B1B3A]"}`}>{lib}</button>
        ))}
      </div>
      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
      {!liste && !erreur && <p className="m-0 text-sm text-slate-600" role="status">{t.chargement}</p>}
      {liste && !visibles.length && <p className="m-0 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{t.rien}</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {visibles.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => setOuvert(d.id)} className={`w-full rounded-xl border bg-white p-3 text-start hover:border-[#C9A227] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${d.aRepondre ? "border-[#C9A227]" : "border-slate-200"}`}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9a7b14]">{t.contexte[d.contexte] || d.contexte}{d.sujet ? ` · ${d.sujet}` : ""}</span>
                <Pastille statut={d.statut} libelle={d.aRepondre ? t.aRepondre : t.statut[d.statut] || d.statut} />
              </span>
              <span className="mt-1 block font-semibold text-[#0B1B3A]">{t.avecQui} {d.avec.join(", ")}</span>
              <span className="block text-sm text-slate-600" dir="auto">
                {d.creneauRetenu ? dateHeure(d.creneauRetenu, l) : d.desQuePossible && !d.creneaux.length ? t.dqp : d.creneaux.map((c) => dateHeure(c, l)).join(" · ")}
              </span>
              {marque?.(d)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
