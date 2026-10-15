/**
 * Page d'un jalon : objectif, statut, prérequis ; onglets Checklist (coche +
 * preuve photo prise depuis le téléphone + commentaire), Exigences (normes
 * citées, badge « à vérifier »), Documents / PV types (formulaire, signature,
 * impression A4), Discussion (rafraîchie toutes les 10 s), Photos / vidéos.
 * Bouton « Demander un appel vidéo » (features/appels) : la salle n'ouvre
 * qu'une fois que chaque personne invitée a accepté le même créneau.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { PointChecklist } from "../../domain/referentiel/types";
import {
  changerStatut, cocher, debloquerJalon, deposer, lireJalon, lireMessages, masquerMessage, posterMessage, reduirePhoto, urlFichier,
  type DetailJalon, type Fichier, type Message, type StatutJalon, type VueProjetDonnees,
} from "./api";
import { COULEUR_STATUT, dateHeure, erreur, role, T, taille } from "./libelles";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";
import type { Invite } from "../appels/api";

const Documents = lazy(() => import("./Documents"));
const MesAppels = lazy(() => import("../appels/MesAppels"));

type Onglet = "checklist" | "exigences" | "documents" | "discussion" | "photos";
const BTN = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50";

export default function PageJalon({ base, projetId, code, projet, onRetour, onOuvrir }: {
  base: string; projetId: string; code: string; projet: VueProjetDonnees; onRetour: () => void; onOuvrir: (code: string) => void;
}) {
  const [d, setD] = useState<DetailJalon | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [onglet, setOnglet] = useState<Onglet>("checklist");

  const charger = useCallback(async () => {
    const r = await lireJalon(base, projetId, code);
    if (r.ok) { setD(r.data); setErr(""); } else setErr(r.error);
  }, [base, projetId, code]);
  useEffect(() => { void charger(); }, [charger]);

  if (err && !d) return <div className="mx-auto max-w-3xl p-4"><Retour onRetour={onRetour} /><p className="rounded-lg bg-red-50 p-4 text-red-800">{err === "jalon_inconnu" ? "Ce jalon n'existe pas dans ce projet." : erreur(err)}</p></div>;
  if (!d) return <p className="p-4 text-slate-500" aria-busy="true">Chargement du jalon…</p>;
  const j = d.jalon;

  const statut = async (s: StatutJalon) => {
    const r = await changerStatut(base, projetId, code, s);
    if (!r.ok) {
      const bl = ((r.data?.bloquants ?? r.data?.pv) as string[] | undefined)?.map((c) => projet.jalons.find((x) => x.code === c)?.titre ?? d?.pvRequis?.find((x) => x.code === c)?.titre ?? c);
      setMsg(erreur(r.error) + (bl?.length ? ` (${bl.join(", ")})` : ""));
    } else setMsg("");
    await charger();
  };

  // Personnes qu'on peut inviter à un appel sur ce jalon : le cabinet (pour un membre) et les autres membres actifs.
  const moiAdmin = projet.moi.kind === "admin";
  const candidats: { invite: Invite; nom: string }[] = [
    ...(moiAdmin ? [] : [{ invite: { type: "admin" } as Invite, nom: "Architecte CITURBAREA" }]),
    ...projet.membres.filter((m) => m.actif && m.id !== projet.moi.membreId).map((m) => ({ invite: { type: "membre", id: m.id } as Invite, nom: `${m.nom} (${role(m.role)})` })),
  ];

  const onglets: [Onglet, string][] = [
    ["checklist", `Checklist (${j.checklist.filter((p) => j.checklistEtat[p.id]?.fait).length}/${j.checklist.length})`],
    ["exigences", `Exigences (${d.exigences.length})`],
    ["documents", `Documents (${d.modeles.length})`],
    ["discussion", "Discussion"],
    ["photos", `Photos (${d.fichiers.filter((f) => f.nature === "PHOTO" || f.nature === "VIDEO").length})`],
  ];

  return (
    <div className="mx-auto max-w-3xl px-3 pb-24 pt-3 sm:px-6">
      <Retour onRetour={onRetour} />
      <header className="mb-3">
        <p className="m-0 text-xs uppercase tracking-wide text-slate-500">{j.phaseTitre ?? j.phase}{j.niveau ? ` — ${j.niveau}` : ""} · {j.code}</p>
        <h1 className="m-0 mt-1 text-xl font-bold text-[#0B1B3A]">{j.titre}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${COULEUR_STATUT[j.statut]}`}>{T.statuts[j.statut]}</span>
          {j.pointArret && <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">Point d'arrêt</span>}
          {j.valideLe && <span className="text-xs text-slate-500">Validé le {dateHeure(j.valideLe)}{j.validePar ? ` par ${j.validePar}` : ""}</span>}
          {d.deblocage && <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white">Débloqué par l'administrateur</span>}
        </div>
        {d.deblocage && <p className="mb-0 mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Motif du déblocage ({dateHeure(d.deblocage.le)}) : {d.deblocage.motif}</p>}
        <p className="mb-0 mt-3 text-base text-slate-800">{j.objectif}</p>
        <p className="mb-0 mt-2 text-sm text-slate-600">Intervenants : {j.acteurs.map(role).join(", ") || "—"} · Validation : {j.validateurs.map(role).join(", ") || "—"}</p>
      </header>

      {d.prerequisEtat.length > 0 && (
        <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="m-0 mb-1 text-sm font-semibold text-slate-700">Prérequis</h2>
          <ul className="m-0 grid list-none gap-1 p-0">
            {d.prerequisEtat.map((p) => {
              const t = projet.jalons.find((x) => x.code === p.code)?.titre ?? p.code;
              return (
                <li key={p.code}>
                  <button type="button" onClick={() => onOuvrir(p.code)} className="flex min-h-[44px] w-full items-center justify-between gap-2 border-0 bg-transparent text-left text-sm">
                    <span>{p.pointArret && <span className="mr-1 font-bold text-red-700">⛔</span>}{t}</span>
                    {p.statut && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${COULEUR_STATUT[p.statut]}`}>{T.statuts[p.statut]}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(d.pvRequis?.length ?? 0) > 0 && (
        <section className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <h2 className="m-0 mb-1 text-sm font-semibold text-red-800">PV de contrôle exigés avant de continuer</h2>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {d.pvRequis!.map((p) => (
              <li key={p.code} className="flex flex-wrap justify-between gap-2">
                <span>{p.titre}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.etat === "LEVE" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                  {{ ABSENT: "PV non rempli", BROUILLON: "PV à signer", REFUSE: "PV refusé : reprise", LEVE: "PV signé — point levé" }[p.etat]}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setOnglet("documents")} className="mt-2 min-h-[44px] rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800">Remplir le PV</button>
        </section>
      )}
      {d.peutDebloquer && (
        <section className="mb-3">
          <button type="button" className={`${BTN} border border-amber-400 bg-amber-50 text-amber-900`} onClick={async () => {
            const motif = window.prompt("Débloquer ce point d'arrêt : écrivez le motif (obligatoire, gardé au journal et visible des intervenants)");
            if (!motif || !motif.trim()) return;
            const r = await debloquerJalon(base, projetId, code, motif.trim());
            setMsg(r.ok ? "" : erreur(r.error));
            await charger();
          }}>Débloquer (administrateur, avec motif)</button>
        </section>
      )}

      {(
        <section className="mb-3 flex flex-wrap gap-2">
          {d.droits.statuts.map((s) => (
            <button key={s} type="button" onClick={() => void statut(s)}
              className={`${BTN} ${s === "VALIDE" ? "bg-emerald-600 text-white" : s === "BLOQUE" ? "border border-red-300 bg-white text-red-700" : "border border-slate-300 bg-white text-slate-800"}`}>{T.actionsStatut[s]}</button>
          ))}
          {candidats.length > 0 && <DemanderAppelVideo porte={moiAdmin ? "admin" : "membre"} contexte="chantier" objetId={`${projetId}:${code}`.slice(0, 120)} sujet={j.titre} invites={[]} candidats={candidats} langue="fr" variante="navy" />}
        </section>
      )}
      {msg && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{msg}</p>}

      {!moiAdmin && (
        <details className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#0B1B3A]">Mes appels vidéo (demandes reçues et envoyées)</summary>
          <div className="mt-3"><Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}><MesAppels espace={{ type: "membre" }} l="fr" titre={null} /></Suspense></div>
        </details>
      )}

      <nav className="sticky top-0 z-10 -mx-3 mb-3 flex gap-1 overflow-x-auto bg-[#f8fafc]/95 px-3 py-2 backdrop-blur" aria-label="Sections du jalon">
        {onglets.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setOnglet(k)} aria-pressed={onglet === k}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-semibold ${onglet === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>{l}</button>
        ))}
      </nav>

      {onglet === "checklist" && <Checklist base={base} projetId={projetId} d={d} onMaj={charger} />}
      {onglet === "exigences" && <Exigences d={d} />}
      {onglet === "documents" && (
        <Suspense fallback={<p className="text-slate-500">Chargement…</p>}>
          <Documents base={base} projetId={projetId} d={d} projetTitre={projet.projet.titre} onMaj={charger} />
        </Suspense>
      )}
      {onglet === "discussion" && <Discussion base={base} projetId={projetId} code={code} admin={projet.moi.kind === "admin"} stockage={d.stockage} />}
      {onglet === "photos" && <Galerie base={base} projetId={projetId} d={d} onMaj={charger} />}
    </div>
  );
}

function Retour({ onRetour }: { onRetour: () => void }) {
  return <button type="button" onClick={onRetour} className="mb-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#0B1B3A]">← Tableau de bord</button>;
}

// ── Dépôt de fichier ────────────────────────────────────────────────────

function BoutonDepot({ base, projetId, jalon, point, libelle, accept = "image/*,video/*", capture = true, onDepose, disabled }: {
  base: string; projetId: string; jalon?: string; point?: string; libelle: string; accept?: string; capture?: boolean; onDepose: (f: Fichier) => void; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [p, setP] = useState<number | null>(null);
  const [e, setE] = useState("");
  const choisi = async (liste: FileList | null) => {
    const brut = liste?.[0];
    if (ref.current) ref.current.value = "";
    if (!brut) return;
    setE(""); setP(0);
    const f = await reduirePhoto(brut);
    const r = await deposer(base, projetId, f, { jalon, point, nature: f.type.startsWith("image/") || f.type.startsWith("video/") ? undefined : "DOCUMENT" }, setP);
    setP(null);
    if (r.ok) onDepose(r.data.fichier); else setE(erreur(r.error));
  };
  return (
    <span className="inline-flex flex-col">
      <label className={`${BTN} cursor-pointer border border-slate-300 bg-white text-slate-800 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        {p !== null ? `Envoi… ${Math.round(p * 100)} %` : libelle}
        {/* capture="environment" : ouvre directement l'appareil photo arrière sur téléphone. */}
        <input ref={ref} type="file" accept={accept} {...(capture ? { capture: "environment" } : {})} className="sr-only" disabled={disabled || p !== null} onChange={(ev) => void choisi(ev.target.files)} />
      </label>
      {e && <span role="alert" className="mt-1 text-xs text-red-700">{e}</span>}
    </span>
  );
}

function Miniature({ base, projetId, f }: { base: string; projetId: string; f: Fichier }) {
  const url = urlFichier(base, projetId, f.id);
  if (f.type.startsWith("image/")) return <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-slate-100"><img src={url} alt={f.nom} loading="lazy" decoding="async" className="h-full w-full object-cover" /></a>;
  if (f.type.startsWith("video/")) return <video src={url} controls preload="none" className="aspect-square w-full rounded-lg bg-black object-cover" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 p-2 text-center text-xs text-slate-700">{f.nom}<br />{taille(f.taille)}</a>;
}

// ── Checklist ───────────────────────────────────────────────────────────

function Checklist({ base, projetId, d, onMaj }: { base: string; projetId: string; d: DetailJalon; onMaj: () => Promise<void> }) {
  const j = d.jalon;
  if (!j.checklist.length) return <p className="text-slate-500">Pas de point de contrôle pour ce jalon.</p>;
  const moments = ["CONCEPTION", "EXECUTION", "RECEPTION"].filter((m) => j.checklist.some((p) => p.moment === m));
  return (
    <div className="grid gap-4">
      {moments.map((m) => (
        <section key={m}>
          <h2 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">{T.moments[m]}</h2>
          <ul className="m-0 grid list-none gap-2 p-0">
            {j.checklist.filter((p) => p.moment === m).map((p) => <Point key={p.id} base={base} projetId={projetId} d={d} p={p} onMaj={onMaj} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Point({ base, projetId, d, p, onMaj }: { base: string; projetId: string; d: DetailJalon; p: PointChecklist; onMaj: () => Promise<void> }) {
  const etat = d.jalon.checklistEtat[p.id];
  const peut = d.droits.cocher.includes(p.id);
  const [commentaire, setCommentaire] = useState(etat?.commentaire ?? "");
  const [e, setE] = useState("");
  const preuves = (etat?.preuveIds ?? []).map((id) => d.fichiers.find((f) => f.id === id)).filter(Boolean) as Fichier[];
  const maj = async (o: { fait?: boolean; preuveIds?: string[]; commentaire?: string }) => {
    const r = await cocher(base, projetId, d.jalon.code, { id: p.id, fait: o.fait ?? !!etat?.fait, preuveIds: o.preuveIds ?? etat?.preuveIds ?? [], commentaire: o.commentaire ?? commentaire });
    setE(r.ok ? "" : erreur(r.error));
    await onMaj();
  };
  const exigence = p.exigence ? d.exigences.find((x) => x.id === p.exigence) : null;
  return (
    <li className={`rounded-xl border bg-white p-3 ${etat?.fait ? "border-emerald-300" : "border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <button type="button" disabled={!peut} onClick={() => void maj({ fait: !etat?.fait })} aria-pressed={!!etat?.fait} aria-label={etat?.fait ? "Décocher" : "Cocher"}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 text-xl font-bold ${etat?.fait ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400 bg-white text-transparent"} disabled:opacity-40`}>✓</button>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-base text-slate-900">{p.texte}</p>
          <p className="m-0 mt-1 text-xs text-slate-500">
            Responsable : {role(p.responsable)}{p.preuves?.length ? ` · preuve attendue : ${p.preuves.map((x) => x.toLowerCase()).join(", ")}` : ""}
            {exigence ? ` · exigence ${exigence.criticite === "BLOQUANT" ? "bloquante" : exigence.criticite.toLowerCase()}` : ""}
          </p>
          {etat && <p className="m-0 mt-1 text-xs text-slate-600">{etat.fait ? "Fait" : "Modifié"} par {etat.par} ({role(etat.role)}), {dateHeure(etat.le)}</p>}
          {preuves.length > 0 && <div className="mt-2 grid grid-cols-4 gap-1">{preuves.map((f) => <Miniature key={f.id} base={base} projetId={projetId} f={f} />)}</div>}
          {peut && (
            <div className="mt-2 grid gap-2">
              <textarea value={commentaire} onChange={(ev) => setCommentaire(ev.target.value)} maxLength={1000} rows={2} placeholder="Commentaire (facultatif)"
                className="w-full rounded-lg border border-slate-300 p-2 text-base" />
              <div className="flex flex-wrap gap-2">
                {commentaire !== (etat?.commentaire ?? "") && <button type="button" onClick={() => void maj({})} className={`${BTN} bg-[#0B1B3A] text-white`}>Enregistrer le commentaire</button>}
                <BoutonDepot base={base} projetId={projetId} jalon={d.jalon.code} point={p.id} libelle="📷 Ajouter une preuve" disabled={!d.stockage}
                  onDepose={(f) => void maj({ preuveIds: [...(etat?.preuveIds ?? []), f.id] })} />
              </div>
              {!d.stockage && <p className="m-0 text-xs text-slate-500">{T.erreurs.stockage_non_active}</p>}
            </div>
          )}
          {e && <p role="alert" className="m-0 mt-1 text-sm text-red-700">{e}</p>}
        </div>
      </div>
    </li>
  );
}

// ── Exigences ───────────────────────────────────────────────────────────

function Exigences({ d }: { d: DetailJalon }) {
  if (!d.exigences.length) return <p className="text-slate-500">Aucune exigence rattachée à ce jalon dans le référentiel (ou aucune ne s'applique à ce projet).</p>;
  const normes = new Map(d.normes.map((n) => [n.id, n]));
  return (
    <div className="grid gap-3">
      <p className="m-0 text-xs text-slate-500">Exigences reformulées par CITURBAREA, avec leurs références. Le texte des normes n'est pas reproduit.</p>
      {d.exigences.map((x) => (
        <article key={x.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-1 flex flex-wrap gap-1">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${x.criticite === "BLOQUANT" ? "bg-red-100 text-red-800" : x.criticite === "MAJEUR" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{T.criticites[x.criticite]}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{T.moments[x.moment]}</span>
            {!x.verifie && <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">À vérifier</span>}
          </div>
          <p className="m-0 text-base text-slate-900">{x.texte}</p>
          <p className="m-0 mt-1 text-sm text-slate-600">Vérification : {x.verification.methode} ({role(x.verification.responsable)})</p>
          {x.normes.length > 0 && (
            <ul className="m-0 mt-2 grid list-none gap-1 p-0">
              {x.normes.map((id) => normes.get(id)).filter(Boolean).map((n) => (
                <li key={n!.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                  <strong>{n!.code}</strong> — {n!.intitule}{x.reference ? ` (${x.reference})` : ""}
                  <span className="block text-xs text-slate-500">{T.portees[n!.portee] ?? n!.portee}{!n!.verifie ? " · référence à vérifier" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

// ── Discussion ──────────────────────────────────────────────────────────

function Discussion({ base, projetId, code, admin, stockage }: { base: string; projetId: string; code: string; admin: boolean; stockage: boolean }) {
  const [liste, setListe] = useState<Message[]>([]);
  const [pieces, setPieces] = useState<Map<string, Fichier>>(new Map());
  const [peutEcrire, setPeutEcrire] = useState(false);
  const [texte, setTexte] = useState("");
  const [jointes, setJointes] = useState<Fichier[]>([]);
  const [e, setE] = useState("");
  const [plusAnciens, setPlusAnciens] = useState(false);
  const dernier = useRef<string | undefined>(undefined);

  const fusionner = useCallback((m: Message[], p: Fichier[], avant = false) => {
    setPieces((x) => { const n = new Map(x); for (const f of p) n.set(f.id, f); return n; });
    setListe((x) => {
      const ids = new Set(x.map((y) => y.id));
      const neufs = m.filter((y) => !ids.has(y.id));
      const tout = avant ? [...neufs, ...x] : [...x.map((y) => m.find((z) => z.id === y.id) ?? y), ...neufs];
      if (tout.length) dernier.current = tout[tout.length - 1].createdAt;
      return tout;
    });
  }, []);

  useEffect(() => {
    let actif = true;
    void lireMessages(base, projetId, code).then((r) => {
      if (!actif || !r.ok) return;
      setPeutEcrire(r.data.peutEcrire);
      setPlusAnciens(r.data.messages.length >= 50);
      fusionner(r.data.messages, r.data.pieces);
    });
    // Rafraîchissement toutes les 10 s (seulement onglet visible).
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void lireMessages(base, projetId, code, { apres: dernier.current }).then((r) => { if (actif && r.ok) fusionner(r.data.messages, r.data.pieces); });
    }, 10_000);
    return () => { actif = false; window.clearInterval(t); };
  }, [base, projetId, code, fusionner]);

  const anciens = async () => {
    const r = await lireMessages(base, projetId, code, { avant: liste[0]?.createdAt });
    if (r.ok) { setPlusAnciens(r.data.messages.length >= 50); fusionner(r.data.messages, r.data.pieces, true); }
  };
  const envoyer = async () => {
    if (!texte.trim() && !jointes.length) return;
    const r = await posterMessage(base, projetId, code, texte, jointes.map((f) => f.id));
    if (!r.ok) { setE(erreur(r.error)); return; }
    setE(""); setTexte(""); setJointes([]);
    fusionner([r.data.message], jointes);
  };
  const masquer = async (m: Message) => {
    const r = await masquerMessage(projetId, m.id, !m.masque);
    if (r.ok) setListe((x) => x.map((y) => (y.id === m.id ? { ...y, masque: !m.masque } : y)));
  };

  return (
    <section>
      {plusAnciens && <button type="button" onClick={() => void anciens()} className={`${BTN} mb-2 border border-slate-300 bg-white text-slate-700`}>Messages plus anciens</button>}
      {!liste.length && <p className="text-slate-500">Aucun message pour l'instant.</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {liste.map((m) => (
          <li key={m.id} className={`rounded-xl border p-3 ${m.masque ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}>
            <p className="m-0 text-xs text-slate-500">{m.auteurNom} · {role(m.auteurRole)} · {dateHeure(m.createdAt)}</p>
            {m.masque && !admin ? <p className="m-0 mt-1 text-sm italic text-slate-400">Message masqué par l'administration.</p> : (
              <>
                {m.texte && <p className={`m-0 mt-1 whitespace-pre-wrap break-words text-base ${m.masque ? "text-slate-400 line-through" : "text-slate-900"}`}>{m.texte}</p>}
                {m.pieceIds.length > 0 && <div className="mt-2 grid grid-cols-4 gap-1">{m.pieceIds.map((id) => pieces.get(id)).filter(Boolean).map((f) => <Miniature key={f!.id} base={base} projetId={projetId} f={f!} />)}</div>}
              </>
            )}
            {admin && <button type="button" onClick={() => void masquer(m)} className="mt-1 min-h-[36px] text-xs font-semibold text-red-700">{m.masque ? "Rétablir" : "Masquer"}</button>}
          </li>
        ))}
      </ul>
      {peutEcrire ? (
        <div className="sticky bottom-0 mt-3 grid gap-2 border-t border-slate-200 bg-[#f8fafc] py-2">
          <textarea value={texte} onChange={(ev) => setTexte(ev.target.value)} maxLength={4000} rows={3} placeholder="Votre message…" aria-label="Votre message" className="w-full rounded-lg border border-slate-300 p-2 text-base" />
          {jointes.length > 0 && <p className="m-0 text-xs text-slate-600">Pièces jointes : {jointes.map((f) => f.nom).join(", ")}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void envoyer()} className={`${BTN} bg-[#0B1B3A] text-white`}>Envoyer</button>
            {stockage && <BoutonDepot base={base} projetId={projetId} jalon={code} libelle="📎 Joindre" accept="image/*,video/*,application/pdf" capture={false} onDepose={(f) => setJointes((x) => [...x, f])} />}
          </div>
          {e && <p role="alert" className="m-0 text-sm text-red-700">{e}</p>}
        </div>
      ) : <p className="mt-3 text-sm text-slate-500">Lecture seule : votre rôle n'intervient pas sur ce jalon.</p>}
    </section>
  );
}

// ── Galerie ─────────────────────────────────────────────────────────────

function Galerie({ base, projetId, d, onMaj }: { base: string; projetId: string; d: DetailJalon; onMaj: () => Promise<void> }) {
  const medias = d.fichiers.filter((f) => f.nature === "PHOTO" || f.nature === "VIDEO");
  const autres = d.fichiers.filter((f) => f.nature !== "PHOTO" && f.nature !== "VIDEO");
  return (
    <section className="grid gap-3">
      {!d.stockage && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{T.erreurs.stockage_non_active}</p>}
      {d.stockage && d.droits.contribuer && (
        <div className="flex flex-wrap gap-2">
          <BoutonDepot base={base} projetId={projetId} jalon={d.jalon.code} libelle="📷 Prendre une photo / vidéo" onDepose={() => void onMaj()} />
          <BoutonDepot base={base} projetId={projetId} jalon={d.jalon.code} libelle="📄 Ajouter un document" accept="application/pdf,image/*,.docx,.xlsx" capture={false} onDepose={() => void onMaj()} />
        </div>
      )}
      {!medias.length && <p className="text-slate-500">Aucune photo ni vidéo pour ce jalon.</p>}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">{medias.map((f) => <Miniature key={f.id} base={base} projetId={projetId} f={f} />)}</div>
      {autres.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0">
          {autres.map((f) => <li key={f.id}><a href={urlFichier(base, projetId, f.id)} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center text-sm text-[#0B1B3A] underline">{f.nom} · {taille(f.taille)} · {f.auteurNom}</a></li>)}
        </ul>
      )}
    </section>
  );
}
