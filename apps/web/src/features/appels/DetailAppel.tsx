/**
 * Une demande d'appel vue par un participant : qui est invité, qui a dit oui,
 * créneaux (heure du Maroc + heure locale), et SES actions : accepter des
 * créneaux, en proposer d'autres, décliner, annuler, bloquer. Une fois
 * l'appel CONFIRMÉ et la fenêtre ouverte : « Rejoindre » (vidéo ou audio
 * seul, partage d'écran dans la salle). Même écran pour le lien personnel,
 * l'espace pro, l'espace projet et le back-office.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ConfigVisio } from "../visio/SalleVisio";
import { apiAppels, type DemandeVue, type Espace } from "./api";
import { BTN_CONTOUR, BTN_NAVY, BTN_OR, CHAMP, IconeCamera } from "./DemanderAppelVideo";
import { bornesSaisie, dateHeure, demainDixHeures, fuseauLocal, heure, heureLocaleDiffere, localVersIso } from "./heures";
import { erreurLisible, TEXTES, type LangueAppel } from "./textes";
import TraceAppel from "./TraceAppel";

const SalleVisio = lazy(() => import("../visio/SalleVisio"));
const BTN = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold disabled:opacity-50";

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-900", CONFIRMEE: "bg-emerald-100 text-emerald-900", REFUSEE: "bg-rose-100 text-rose-900",
  ANNULEE: "bg-slate-200 text-slate-800", EXPIREE: "bg-slate-200 text-slate-800", TERMINEE: "bg-slate-200 text-slate-800",
  ACCEPTE: "bg-emerald-100 text-emerald-900", REFUSE: "bg-rose-100 text-rose-900", CONTRE_PROPOSITION: "bg-sky-100 text-sky-900",
};
export const Pastille = ({ statut, libelle }: { statut: string; libelle: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${COULEUR_STATUT[statut] || "bg-slate-100 text-slate-700"}`}>{libelle}</span>
);

/** « mar. 14 oct. · 10:30 (heure du Maroc) — 11:30 chez vous ». */
export function Creneau({ iso, l, fort = false }: { iso: string; l: LangueAppel; fort?: boolean }) {
  const t = TEXTES[l];
  return (
    <span className={fort ? "font-bold" : ""}>
      <span dir="auto">{dateHeure(iso, l)}</span> <span className="text-xs font-normal text-slate-500">({t.heureMaroc})</span>
      {heureLocaleDiffere(iso) && <span className="block text-xs font-normal text-slate-600">{dateHeure(iso, l, fuseauLocal())} {t.chezVous}</span>}
    </span>
  );
}

type Props = {
  espace: Espace;
  id?: string;
  l: LangueAppel;
  /** Action présélectionnée (?action= du lien reçu par e-mail). Un GET ne change jamais rien : il faut cliquer. */
  actionInitiale?: string | null;
  /** Bloc supplémentaire (back-office : coordonnées et WhatsApp). */
  extra?: (d: DemandeVue, recharger: () => void) => ReactNode;
  onChange?: () => void;
};

export default function DetailAppel({ espace, id = "", l, actionInitiale, extra, onChange }: Props) {
  const t = TEXTES[l];
  const [d, setD] = useState<DemandeVue | null>(null);
  const [visioIntegree, setVisioIntegree] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [choix, setChoix] = useState<string[]>([]);
  const [propositions, setPropositions] = useState<string[]>([demainDixHeures()]);
  const [confirmer, setConfirmer] = useState<"refuser" | "annuler" | "bloquer" | null>(actionInitiale === "refuser" ? "refuser" : null);
  const [salle, setSalle] = useState<{ config: ConfigVisio; audio: boolean; nom: string; enregistrement: boolean } | null>(null);
  const [, tic] = useState(0);
  const zoneContre = useRef<HTMLDivElement>(null);
  const zoneAccepter = useRef<HTMLDivElement>(null);
  const bornes = bornesSaisie();

  const cleEspace = JSON.stringify(espace);
  const charger = useCallback(async () => {
    const r = await apiAppels.lire(JSON.parse(cleEspace) as Espace, id);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); return; }
    setErreur(null);
    setD(r.data.demande);
    setVisioIntegree(r.data.visioIntegree);
  }, [cleEspace, id, l]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void charger(); }, [charger]);
  // L'heure avance : le bouton « Rejoindre » s'active seul ; la demande est relue toutes les 30 s (réponses des autres).
  useEffect(() => {
    const a = setInterval(() => tic((x) => x + 1), 15_000);
    const b = setInterval(() => { if (!salle) void charger(); }, 30_000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [charger, salle]);
  useEffect(() => {
    if (!d) return;
    if (actionInitiale === "contre") zoneContre.current?.scrollIntoView({ block: "center" });
    if (actionInitiale === "accepter") zoneAccepter.current?.scrollIntoView({ block: "center" });
  }, [d?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const agir = async (corps: Parameters<typeof apiAppels.repondre>[2]) => {
    if (!d) return;
    setOccupe(true); setErreur(null); setInfo(null);
    const r = await apiAppels.repondre(espace, d.id, corps);
    setOccupe(false); setConfirmer(null);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); void charger(); return; }
    setD(r.data.demande); setChoix([]);
    onChange?.();
  };
  const bloquer = async () => {
    if (!d) return;
    setOccupe(true);
    const r = await apiAppels.bloquer(espace, d.id);
    setOccupe(false); setConfirmer(null);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); return; }
    setD(r.data.demande); setInfo(t.bloque); onChange?.();
  };
  const rejoindre = async (audio: boolean) => {
    if (!d) return;
    setOccupe(true); setErreur(null);
    const r = await apiAppels.visio(espace, d.id);
    setOccupe(false);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); return; }
    setSalle({ config: r.data.config, audio: audio || r.data.audioSeul, nom: r.data.nom, enregistrement: !!r.data.enregistrement });
  };

  if (erreur && !d) return <p className="rounded-lg bg-rose-50 p-4 text-rose-800" role="alert">{erreur}</p>;
  if (!d) return <p className="p-4 text-slate-600" role="status">{t.chargement}</p>;

  const maintenant = Date.now();
  const futurs = d.creneaux.filter((c) => Date.parse(c) >= maintenant - 5 * 60_000);
  const aAccepter = futurs.filter((c) => !d.moi?.creneaux.includes(c));
  const qui = (c: string) => d.participants.filter((p) => p.statut !== "EN_ATTENTE" && p.statut !== "REFUSE" && (p.creneaux.includes(c) || p.toutCreneau)).map((p) => (p.moi ? t.moi : p.nom));

  return (
    <div className="grid gap-4 text-start" dir={l === "ar" ? "rtl" : "ltr"} lang={l}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">{t.contexte[d.contexte] || d.contexte}{d.sujet ? ` · ${d.sujet}` : ""}</span>
        <Pastille statut={d.statut} libelle={t.statut[d.statut] || d.statut} />
      </header>

      <ul className="m-0 grid list-none gap-2 p-0">
        {d.participants.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="min-w-0"><strong>{p.nom}</strong>{p.moi && <span className="text-slate-500"> ({t.moi})</span>} <span className="text-xs text-slate-500">· {t.roles[p.role]}</span></span>
            <Pastille statut={p.statut} libelle={t.statutP[p.statut] || p.statut} />
          </li>
        ))}
      </ul>

      {d.message && <blockquote className="m-0 whitespace-pre-wrap rounded-lg border-s-4 border-[#C9A227] bg-[#C9A227]/5 p-3 text-sm">{d.message}</blockquote>}

      {d.statut === "CONFIRMEE" && d.creneauRetenu && d.fenetre && (
        <section className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-4" aria-live="polite">
          <p className="m-0 text-xs font-bold uppercase tracking-wider text-emerald-800">{t.creneauRetenu}</p>
          <p className="m-0 mt-1 text-lg"><Creneau iso={d.creneauRetenu} l={l} fort /> · {t.minutes(d.dureeMin)}</p>
          {!d.peut.rejoindre && maintenant < Date.parse(d.fenetre.ouverture) && <p className="m-0 mt-2 text-sm text-emerald-900">{t.ouverture(heure(d.fenetre.ouverture))}</p>}
          {!visioIntegree && <p className="m-0 mt-2 text-sm text-slate-700">{t.visioNonConfiguree}</p>}
          {d.moi && visioIntegree && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={BTN_OR} disabled={!d.peut.rejoindre || occupe} onClick={() => void rejoindre(d.audioSeul)}><IconeCamera />{t.rejoindre}</button>
              {!d.audioSeul && <button type="button" className={BTN_CONTOUR} disabled={!d.peut.rejoindre || occupe} onClick={() => void rejoindre(true)}>{t.rejoindreAudio}</button>}
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className="m-0 mb-2 text-sm font-bold">{d.desQuePossible && !d.creneaux.length ? t.desQuePossible : t.creneauxProposes}</h3>
        {d.desQuePossible && !d.creneaux.length && <p className="m-0 text-sm text-slate-600">{t.desQuePossibleAide}</p>}
        <ul className="m-0 grid list-none gap-2 p-0">
          {d.creneaux.map((c) => {
            const passe = Date.parse(c) < maintenant - 5 * 60_000;
            const accord = qui(c);
            const cochable = d.peut.accepter && aAccepter.includes(c);
            return (
              <li key={c} className={`rounded-lg border px-3 py-2 ${passe ? "border-slate-200 opacity-50" : "border-slate-300 bg-white"}`}>
                <label className={`flex items-start gap-3 ${cochable ? "cursor-pointer" : ""}`}>
                  {cochable && <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#0B1B3A]" checked={choix.includes(c)} onChange={(e) => setChoix((x) => (e.target.checked ? [...x, c] : x.filter((y) => y !== c)))} />}
                  <span className="min-w-0 flex-1">
                    <Creneau iso={c} l={l} />
                    <span className="block text-xs text-slate-600">{t.dAccord} {accord.length ? accord.join(", ") : t.personne}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {d.peut.accepter && (
          <div ref={zoneAccepter} className={`mt-3 ${actionInitiale === "accepter" ? "rounded-lg ring-2 ring-[#C9A227] ring-offset-2" : ""}`}>
            <p className="m-0 mb-2 text-xs text-slate-600">{t.accepterAide}</p>
            <button type="button" className={BTN_NAVY} disabled={!choix.length || occupe} onClick={() => void agir({ action: "accepter", creneaux: choix })}>{t.accepter}</button>
          </div>
        )}
      </section>

      {d.peut.contreProposer && (
        <section ref={zoneContre} className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${actionInitiale === "contre" ? "ring-2 ring-[#C9A227] ring-offset-2" : ""}`}>
          <h3 className="m-0 mb-2 text-sm font-bold">{t.proposerTitre}</h3>
          <div className="grid gap-2">
            {propositions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="datetime-local" dir="ltr" className={CHAMP} min={bornes.min} max={bornes.max} step={300} value={c} aria-label={t.creneau(i + 1)}
                  onChange={(e) => setPropositions((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
                {propositions.length > 1 && <button type="button" className="mt-1 min-h-[44px] rounded-lg px-2 text-xs font-semibold text-rose-700" onClick={() => setPropositions((x) => x.filter((_, j) => j !== i))}>{t.retirer}</button>}
              </div>
            ))}
            {propositions.length < 3 && <button type="button" className="justify-self-start text-sm font-semibold underline underline-offset-2" onClick={() => setPropositions((x) => [...x, demainDixHeures(Date.now() + 24 * 3600_000 * x.length)])}>+ {t.ajouterCreneau}</button>}
            <p className="m-0 text-xs text-slate-500">{t.votreHeure(fuseauLocal())}</p>
            <button type="button" className={`${BTN_NAVY} justify-self-start`} disabled={occupe} onClick={() => {
              const l2 = propositions.map(localVersIso).filter((x): x is string => !!x);
              if (l2.length) void agir({ action: "contre", creneaux: l2 }); else setErreur(t.erreurs.creneaux_invalides);
            }}>{t.proposer}</button>
          </div>
        </section>
      )}

      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
      {info && <p className="m-0 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{info}</p>}

      {(d.peut.refuser || d.peut.annuler || d.peut.bloquer) && d.moi && (
        <section className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          {confirmer ? (
            <div className="w-full rounded-lg bg-rose-50 p-3" role="alertdialog" aria-live="assertive">
              <p className="m-0 text-sm font-semibold text-rose-900">{confirmer === "refuser" ? t.confirmerRefus : confirmer === "annuler" ? t.confirmerAnnulation : t.confirmerBloquer}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className={`${BTN} bg-rose-700 text-white`} disabled={occupe} onClick={() => void (confirmer === "bloquer" ? bloquer() : agir({ action: confirmer }))}>{t.oui}</button>
                <button type="button" className={BTN_CONTOUR} onClick={() => setConfirmer(null)}>{t.non}</button>
              </div>
            </div>
          ) : (
            <>
              {d.peut.refuser && <button type="button" className={`${BTN_CONTOUR} text-rose-800`} onClick={() => setConfirmer("refuser")}>{t.refuser}</button>}
              {d.peut.annuler && !d.peut.refuser && <button type="button" className={`${BTN_CONTOUR} text-rose-800`} onClick={() => setConfirmer("annuler")}>{t.annulerAppel}</button>}
              {d.peut.bloquer && <button type="button" className="min-h-[44px] px-2 text-xs font-semibold text-slate-600 underline underline-offset-2" onClick={() => setConfirmer("bloquer")}>{t.bloquer}</button>}
            </>
          )}
        </section>
      )}

      <TraceAppel d={d} espace={espace} l={l} onMaj={setD} />

      {extra?.(d, () => void charger())}

      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">{t.historique}</summary>
        <ol className="m-0 mt-2 grid gap-1 ps-5">
          {d.historique.map((h, i) => <li key={i}><span dir="ltr">{dateHeure(h.le, l)}</span> — {h.par} : {t.actions[h.action] || h.action}</li>)}
        </ol>
      </details>

      {salle && (
        <div className="fixed inset-0 z-[1100] flex flex-col bg-[#0B1B3A]" role="dialog" aria-modal="true" aria-label={t.rejoindre}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
            <span className="truncate text-sm font-semibold">{d.sujet || t.contexte[d.contexte]}</span>
            <button type="button" className={`${BTN} bg-white/10 text-white hover:bg-white/20`} onClick={() => setSalle(null)}>{t.quitter}</button>
          </div>
          <Suspense fallback={<p className="p-6 text-white">{t.ouvertureSalle}</p>}>
            <SalleVisio config={salle.config} nomAffiche={salle.nom} audioSeul={salle.audio} langue={l} enregistrement={salle.enregistrement} onQuitter={() => setSalle(null)} className="flex-1" />
          </Suspense>
        </div>
      )}
    </div>
  );
}

