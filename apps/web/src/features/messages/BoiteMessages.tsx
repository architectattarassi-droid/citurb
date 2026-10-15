/**
 * Boîte de réception unifiée : espace pro (session), back-office (tous les
 * fils, modération) ou visiteur / client sans compte (lien de boîte signé).
 * Mobile d'abord : la liste, puis le fil à sa place.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { dateHeure } from "../appels/heures";
import type { LangueAppel } from "../appels/textes";
import { apiMessages, type EspaceMsg, type FilVue, type ResumeFil } from "./api";
import FilConversation from "./FilConversation";
import { erreurMsg, TEXTES_MSG } from "./textes";

type Source = { type: "pro" } | { type: "admin" } | { type: "client" } | { type: "boite"; jeton: string };
type Props = { source: Source; l: LangueAppel; titre?: string | null; extra?: (f: FilVue, recharger: () => void) => ReactNode; filtres?: boolean };

export default function BoiteMessages({ source, l, titre, extra, filtres }: Props) {
  const t = TEXTES_MSG[l];
  const [liste, setListe] = useState<ResumeFil[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<ResumeFil | null>(null);
  const [statut, setStatut] = useState<string>("");
  const cle = JSON.stringify(source);

  const charger = useCallback(async () => {
    const s = JSON.parse(cle) as Source;
    const r = await apiMessages.boite(s.type === "admin" ? { type: "admin", statut: statut || undefined } : s);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    setErreur(null);
    setListe(r.data.conversations);
  }, [cle, l, statut]);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => { const x = setInterval(() => { if (!ouvert) void charger(); }, 30_000); return () => clearInterval(x); }, [charger, ouvert]);

  if (ouvert) {
    const espace: EspaceMsg = source.type === "boite" ? { type: "lien", jeton: ouvert.jeton || "" } : source;
    return (
      <div className="grid gap-3" dir={l === "ar" ? "rtl" : "ltr"}>
        <button type="button" className="justify-self-start text-sm font-semibold text-[#0B1B3A] underline underline-offset-2" onClick={() => { setOuvert(null); void charger(); }}>← {t.retour}</button>
        <FilConversation espace={espace} id={ouvert.id} l={l} extra={extra} />
      </div>
    );
  }
  const total = (liste || []).reduce((n, x) => n + x.nonLus, 0);
  return (
    <section className="grid gap-3 text-start" dir={l === "ar" ? "rtl" : "ltr"} lang={l} aria-label={t.boite}>
      {titre !== null && (
        <header>
          <h2 className="m-0 text-lg font-bold text-[#0B1B3A]">{titre ?? t.boite}{total > 0 && <span className="ms-2 inline-flex min-w-[24px] justify-center rounded-full bg-[#C9A227] px-2 text-sm">{total}</span>}</h2>
          <p className="m-0 text-sm text-slate-600">{t.boiteAide}</p>
        </header>
      )}
      {filtres && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {[["", "Toutes"], ["ALERTES", "Tentatives de contact direct"], ["SIGNALEE", "Signalées"], ["FERMEE", "Fermées"]].map(([k, lib]) => (
            <button key={k} type="button" role="tab" aria-selected={statut === k} onClick={() => setStatut(k)}
              className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold ${statut === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white"}`}>{lib}</button>
          ))}
        </div>
      )}
      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
      {!liste && !erreur && <p className="m-0 text-sm text-slate-600" role="status">{t.chargement}</p>}
      {liste && !liste.length && <p className="m-0 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{t.rien}</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {(liste || []).map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => setOuvert(x)} className={`w-full rounded-xl border bg-white p-3 text-start hover:border-[#C9A227] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] ${x.nonLus ? "border-[#C9A227]" : "border-slate-200"}`}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9a7b14]">{t.contexte[x.contexte] || x.contexte}{x.sujet ? ` · ${x.sujet}` : ""}</span>
                <span className="text-xs text-slate-500" dir="ltr">{dateHeure(x.dernierMessageLe, l)}</span>
              </span>
              <span className="mt-1 block font-semibold text-[#0B1B3A]">{t.avecQui} {x.avec.join(", ")}
                {x.nonLus > 0 && <span className="ms-2 rounded-full bg-[#C9A227] px-2 text-xs">{t.nonLus(x.nonLus)}</span>}
                {x.signale && <span className="ms-2 rounded-full bg-rose-100 px-2 text-xs text-rose-900">{t.statut.SIGNALEE}</span>}
                {!!x.alertes && <span className="ms-2 rounded-full bg-rose-700 px-2 text-xs font-bold text-white" title="Tentatives de contact direct (coordonnées masquées)">⚑ {x.alertes}{x.suspendus ? " · suspendu" : ""}</span>}
                {x.participe === false && <span className="ms-2 text-xs font-normal text-slate-500">(modération)</span>}
              </span>
              <span className="block truncate text-sm text-slate-600" dir="auto">{x.apercu}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
