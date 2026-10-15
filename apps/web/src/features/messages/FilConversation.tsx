/**
 * Un fil de messagerie : messages (texte masqué, jamais de coordonnées),
 * étapes des appels vidéo nés du fil (demande, réponses, confirmation, fin),
 * « Demander un appel vidéo » aux autres participants, signaler, bloquer ;
 * pour le back-office : retirer un message, fermer / rouvrir le fil.
 * Relu toutes les 15 s.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Espace } from "../appels/api";
import DemanderAppelVideo, { BTN_CONTOUR, BTN_NAVY, CHAMP } from "../appels/DemanderAppelVideo";
import DetailAppel from "../appels/DetailAppel";
import { dateHeure } from "../appels/heures";
import type { LangueAppel } from "../appels/textes";
import { apiMessages, type EspaceMsg, type FilVue, type MessageVue } from "./api";
import { erreurMsg, TEXTES_MSG } from "./textes";
import AvertissementCoordonnees from "./AvertissementCoordonnees";

type Props = { espace: EspaceMsg; id?: string; l: LangueAppel; extra?: (f: FilVue, recharger: () => void) => ReactNode; onChange?: () => void };

export default function FilConversation({ espace, id = "", l, extra, onChange }: Props) {
  const t = TEXTES_MSG[l];
  const [f, setF] = useState<FilVue | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [mode, setMode] = useState<null | "signaler" | "bloquer">(null);
  const [motif, setMotif] = useState("");
  const bas = useRef<HTMLDivElement>(null);
  const cle = JSON.stringify(espace);

  const charger = useCallback(async () => {
    const r = await apiMessages.lire(JSON.parse(cle) as EspaceMsg, id);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    setErreur(null);
    setF(r.data);
  }, [cle, id, l]);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => { const x = setInterval(() => void charger(), 15_000); return () => clearInterval(x); }, [charger]);
  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [f?.messages.length]);

  if (erreur && !f) return <p className="rounded-lg bg-rose-50 p-4 text-rose-800" role="alert">{erreur}</p>;
  if (!f) return <p className="p-4 text-slate-600" role="status">{t.chargement}</p>;
  const c = f.conversation;
  const convId = c.id;

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true); setErreur(null); setInfo(null);
    const r = await apiMessages.ecrire(espace, convId, texte);
    setEnvoi(false);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    if (r.data.suspendu) { setErreur(t.erreurs.ecriture_suspendue); await charger(); return; }
    if (r.data.messageMasque) setInfo(t.masqueSignale);
    setTexte("");
    await charger();
    onChange?.();
  };
  const signaler = async () => {
    const r = await apiMessages.signaler(espace, convId, motif);
    setMode(null);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    setInfo(t.signale); void charger();
  };
  const bloquer = async () => {
    const r = await apiMessages.bloquer(espace, convId);
    setMode(null);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    setInfo(t.bloque);
  };
  // Espace pour répondre à un appel né du fil : lien d'appel (accès par lien) ou session.
  const espaceAppel = (a: FilVue["appels"][number]): Espace | null =>
    a.jetonAppel ? { type: "lien", jeton: a.jetonAppel } : espace.type === "pro" ? { type: "pro" } : espace.type === "admin" ? { type: "admin" } : espace.type === "client" ? { type: "client" } : null;
  const appelsActifs = f.appels.filter((a) => a.vue && (a.vue.statut === "EN_ATTENTE" || a.vue.statut === "CONFIRMEE"));
  const autres = c.participants.filter((p) => !p.moi).map((p) => p.nom).join(", ");

  return (
    <div className="grid gap-3 text-start" dir={l === "ar" ? "rtl" : "ltr"} lang={l}>
      <header className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">{t.contexte[c.contexte] || c.contexte}{c.sujet ? ` · ${c.sujet}` : ""} · {t.statut[c.statut]}</span>
        <h2 className="m-0 text-lg font-bold text-[#0B1B3A]">{t.avecQui} {autres || "—"}</h2>
        <p className="m-0 text-xs text-slate-500">{t.principe}</p>
      </header>

      <ol className="m-0 grid max-h-[60vh] list-none gap-2 overflow-y-auto rounded-xl bg-slate-50 p-3 sm:max-h-[55vh]" aria-live="polite">
        {f.messages.map((m) => <Bulle key={m.id} m={m} l={l} moderer={f.peut.moderer ? async (modere) => { await apiMessages.moderer(convId, { messageId: m.id, modere }); void charger(); } : undefined} />)}
        <div ref={bas} />
      </ol>

      {appelsActifs.map((a) => {
        const e = espaceAppel(a);
        return e && (
          <details key={a.id} open className="rounded-xl border border-emerald-600/40 bg-emerald-50/50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-emerald-900">{t.appelEnCours}</summary>
            <div className="mt-3"><DetailAppel espace={e} id={a.id} l={l} onChange={() => void charger()} /></div>
          </details>
        );
      })}

      {info && <p className="m-0 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{info}</p>}
      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}

      {f.peut.ecrire ? (
        <form onSubmit={envoyer} className="grid gap-2">
          <label className="sr-only" htmlFor={`msg-${convId}`}>{t.message}</label>
          <textarea id={`msg-${convId}`} className={`${CHAMP} min-h-[80px] py-2`} maxLength={4000} placeholder={t.repondre} value={texte} onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void envoyer(e as unknown as FormEvent); }} />
          <AvertissementCoordonnees texte={texte} l={l} />
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={BTN_NAVY} disabled={envoi || !texte.trim()}>{envoi ? t.envoi : t.envoyerMessage}</button>
            {f.peut.appeler && (
              <DemanderAppelVideo contexte={c.contexte as never} objetId={c.objetId} invites={[]} avecNom={autres} sujet={c.sujet ?? undefined} langue={l} variante="or"
                creerVia={async (corps) => { const r = await apiMessages.appel(espace, convId, corps); if (r.ok) void charger(); return r.ok ? { ok: true } : { ok: false, error: r.error }; }} />
            )}
          </div>
        </form>
      ) : c.moi?.suspendu ? <p className="m-0 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900" role="alert">{t.erreurs.ecriture_suspendue}</p>
        : c.statut === "FERMEE" ? <p className="m-0 text-sm text-slate-600">{t.ferme}</p> : null}

      {(f.peut.signaler || f.peut.bloquer) && (
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-2 text-xs">
          {mode === "signaler" ? (
            <div className="grid w-full gap-2">
              <label className="text-sm font-semibold">{t.motif}<textarea className={`${CHAMP} min-h-[64px] py-2`} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
              <div className="flex gap-2"><button type="button" className={`${BTN_CONTOUR} text-rose-800`} onClick={() => void signaler()}>{t.valider}</button><button type="button" className={BTN_CONTOUR} onClick={() => setMode(null)}>{t.annuler}</button></div>
            </div>
          ) : mode === "bloquer" ? (
            <div className="grid w-full gap-2 rounded-lg bg-rose-50 p-3" role="alertdialog">
              <p className="m-0 text-sm font-semibold text-rose-900">{t.confirmerBloquer}</p>
              <div className="flex gap-2"><button type="button" className={`${BTN_CONTOUR} text-rose-800`} onClick={() => void bloquer()}>{t.oui}</button><button type="button" className={BTN_CONTOUR} onClick={() => setMode(null)}>{t.non}</button></div>
            </div>
          ) : (
            <>
              {f.peut.signaler && <button type="button" className="min-h-[40px] font-semibold text-slate-600 underline underline-offset-2" onClick={() => setMode("signaler")}>{t.signaler}</button>}
              {f.peut.bloquer && <button type="button" className="min-h-[40px] font-semibold text-slate-600 underline underline-offset-2" onClick={() => setMode("bloquer")}>{t.bloquer}</button>}
            </>
          )}
        </div>
      )}
      {extra?.(f, () => void charger())}
    </div>
  );
}

function Bulle({ m, l, moderer }: { m: MessageVue; l: LangueAppel; moderer?: (modere: boolean) => Promise<void> }) {
  const t = TEXTES_MSG[l];
  if (m.type === "APPEL") {
    const ev = String(m.meta.evenement || "");
    const libelle = (t.appelEvt[ev] || (() => ev))(m.meta.par || "CITURBAREA");
    return (
      <li className="mx-auto max-w-[90%] rounded-full bg-[#0B1B3A]/5 px-3 py-1 text-center text-xs text-[#0B1B3A]">
        🎥 {libelle}
        {m.meta.creneau && (ev === "confirmee" || ev === "terminee") ? ` · ${dateHeure(String(m.meta.creneau), l)} · ${t.minutes(Number(m.meta.dureeMin) || 30)}` : ""}
        {ev === "terminee" && m.meta.participants?.length ? ` · ${m.meta.participants.join(", ")}` : ""}
        <span className="ms-2 text-slate-500" dir="ltr">{dateHeure(m.createdAt, l)}</span>
      </li>
    );
  }
  return (
    <li className={`flex ${m.moi ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.moi ? "bg-[#0B1B3A] text-white" : "bg-white text-[#0B1B3A]"} ${m.modere ? "opacity-60" : ""}`}>
        {!m.moi && <p className="m-0 text-xs font-bold opacity-80">{m.auteur}</p>}
        <p className="m-0 whitespace-pre-wrap break-words" dir="auto">{m.texte}</p>
        <p className="m-0 mt-1 text-[11px] opacity-70" dir="ltr">{dateHeure(m.createdAt, l)}{m.masque ? " · 🔒" : ""}{m.modere ? ` · ${t.modere}` : ""}</p>
        {moderer && Array.isArray(m.meta.coordonnees) && <p className="m-0 mt-1 inline-block rounded bg-rose-700 px-1.5 text-[11px] font-bold text-white">⚑ coordonnées masquées : {(m.meta.coordonnees as string[]).join(", ")}</p>}
        {moderer && <button type="button" className="mt-1 text-[11px] underline" onClick={() => void moderer(!m.modere)}>{m.modere ? "Rétablir" : "Retirer (modération)"}</button>}
      </div>
    </li>
  );
}
