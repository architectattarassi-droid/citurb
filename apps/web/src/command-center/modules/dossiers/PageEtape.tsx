/**
 * /cc/dossiers/:id/etapes/:code — « l'étape = une page entière » (lot GP6, fondateur 16/10/2026).
 * En-tête (statut, dates prévues et réelles, paiement, déblocage motivé, responsable), documents
 * de l'étape (attendus, « Document manquant », dépôt commun, normes), pièces graphiques (études),
 * checklists et PV (chantier), « Relancer le client », intervenants (pros Cercles validés, sans
 * coordonnées), matériaux (carnet commun de la matériauthèque), journal et échanges de l'étape.
 * Serveur : GET/PATCH /api/cc/dossiers/:id/etapes/:code, PATCH /api/cc/dossiers/:id (statut d'étape).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CC } from "../../theme/tokens";
import DocumentsParPhase from "../../../features/gestion/DocumentsParPhase";
import GaleriePlans from "../../../features/gestion/GaleriePlans";
import EcrireMessage from "../../../features/messages/EcrireMessage";
import DemanderAppelVideo from "../../../features/appels/DemanderAppelVideo";
import BlocPhase, { type MajDexe, type Paiement } from "./BlocPhase";
import MateriauxEtape from "./MateriauxEtape";
import { niveauxDuProjet, type PhasePlan, type VideoLien } from "../../../../../../packages/contracts/src/gestion/plans";

const PORTE_ADMIN = { type: "admin" } as const;

type Etape = { code: string; titre: string; statut: string; date: string | null; note: string | null; saisiPar: string | null; aide?: string; conditionnelle: boolean };
type Intervenant = { id: string; genre: "prestataire" | "fournisseur"; proId: string; nom: string; role: string; ajouteLe: string; projetMembreId?: string | null };
type Echanges = {
  rendezVous: Array<{ id: string; debut: string | null; statut: string | null; objet: string | null }>;
  appels: Array<{ id: string; contexte: string; statut: string; creneau: string | null; sujet: string | null; createdAt: string | null; etape: string | null }>;
  conversations: Array<{ id: string; statut: string; sujet: string | null; dernierMessageLe: string | null; etape: string | null }>;
};
type Donnees = {
  info: { code: string; titre: string; phaseRef: string | null; phaseTitre: string | null; phaseTitreAr: string | null; phaseGraphique: PhasePlan | null; chantier: boolean; acteurs: string[]; validateurs: string[]; objectif: string | null };
  dossier: { id: string; titre: string | null; phase: string | null; commune: string | null; clientNom: string | null };
  etape: Etape | null;
  planning: { datePrevueDebut: string | null; datePrevueFin: string | null; responsable: string | null; dateReelle: string | null; dateDemarragePhase: string | null };
  paiement: Paiement | null; majDexe: MajDexe | null;
  phase: { checklists: Array<{ code: string; titre: string; pointArret: boolean; nbPoints: number; nbPointsArret: number }>; compteur: { attendues: number; manquantes: number } } | null;
  videos: VideoLien[]; profil: { sousSols?: number | null; etagesHorsSol?: number | null } | null;
  intervenants: Intervenant[]; projets: Array<{ id: string; titre: string | null }>;
  relance: { sujet: string; texte: string }; manquantesClient: string[];
  journal: Array<{ id: string; auteur: string | null; action: string | null; details: unknown; createdAt: string | null }>;
  statutsEtape: string[];
  echanges: Echanges | null;
};
type Pro = { id: string; raisonSociale: string; metier: string; ville: string | null };

const LIB_STATUT: Record<string, string> = {
  FAITE: "Faite", FAITE_HORS_PLATEFORME: "Faite hors plateforme", EN_COURS: "En cours", A_FAIRE: "À faire", SANS_OBJET: "Sans objet",
  DEBLOQUEE: "Débloquée", ANTERIEURE: "Antérieure (non saisie)", A_VENIR: "À venir",
};
const LIB_ROLE: Record<string, string> = { ENTREPRISE: "Entreprise", BET_STRUCTURE: "BET structure", BET_FLUIDES: "BET fluides", LABORATOIRE: "Laboratoire", TOPOGRAPHE: "Topographe", BUREAU_CONTROLE: "Bureau de contrôle", FOURNISSEUR: "Fournisseur" };
const dateFr = (s: string | null | undefined) => (s ? new Date(s.length === 10 ? `${s}T00:00:00Z` : s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dateHeure = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

async function appel<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init.body ? { "content-type": "application/json" } : {} });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error || `Erreur ${r.status}`);
  return j as T;
}

export default function PageEtape() {
  const { id = "", code = "" } = useParams();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const base = `/api/cc/dossiers/${encodeURIComponent(id)}`;

  const charger = useCallback(async () => {
    try { setD(await appel<Donnees>(`${base}/etapes/${encodeURIComponent(code)}`)); setErreur(null); }
    catch (e) { setErreur((e as Error).message === "not_found" ? "Étape ou dossier introuvable." : (e as Error).message); }
  }, [base, code]);
  useEffect(() => { void charger(); }, [charger]);

  // Actions de la fiche (statut d'étape, révision du permis…) et de l'étape (planning, intervenants).
  const agirFiche = async (corps: Record<string, unknown>, message: string) => {
    setOccupe(true); setInfo(null);
    try { await appel(base, { method: "PATCH", body: JSON.stringify(corps) }); setInfo(message); await charger(); }
    catch (e) { setErreur((e as Error).message === "phase_en_attente_paiement" ? "Phase en attente de paiement : débloquez-la d'abord (motif) dans l'en-tête." : (e as Error).message); }
    finally { setOccupe(false); }
  };
  const agirEtape = async (corps: Record<string, unknown>, message: string) => {
    setOccupe(true); setInfo(null);
    try { const r = await appel<{ lienProjet?: string }>(`${base}/etapes/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(corps) }); setInfo(r.lienProjet ? `${message} Lien d'accès à l'espace projet (à transmettre par CITURBAREA) : ${window.location.origin}${r.lienProjet}` : message); await charger(); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  if (!d) return <div style={S.page}>{erreur ? <div style={S.erreur}>{erreur}</div> : <p style={S.petit}>Chargement…</p>}<Link to={`/cc/dossiers/${encodeURIComponent(id)}`} style={S.lien}>← Retour au dossier</Link></div>;
  const e = d.etape;

  return (
    <div style={S.page}>
      <Link to={`/cc/dossiers/${encodeURIComponent(id)}`} style={S.lien}>← {d.dossier.titre || "Dossier"} — parcours A → Z</Link>
      <header style={{ margin: "10px 0 6px" }}>
        <div style={S.petit}>{d.info.phaseTitre}{d.info.phaseTitreAr ? <span dir="rtl" lang="ar"> · {d.info.phaseTitreAr}</span> : null}</div>
        <h1 style={S.titre}>{e?.titre ?? d.info.titre}</h1>
        {d.info.objectif && <p style={S.sous}>{d.info.objectif}</p>}
        {e?.aide && <p style={S.petit}>{e.aide}</p>}
      </header>
      {erreur && <div style={S.erreur}>{erreur} <button style={S.lienBtn} onClick={() => setErreur(null)}>fermer</button></div>}
      {info && <div style={S.info}>{info}</div>}

      <EnTete d={d} occupe={occupe} agirFiche={agirFiche} agirEtape={agirEtape} />
      <section style={S.carte}>
        <BlocPhase dossierId={id} phase={d.info.phaseRef ?? ""} paiement={d.paiement} majDexe={d.majDexe} occupe={occupe} agir={agirFiche} recharger={charger} setErreur={setErreur} />
      </section>

      {d.info.phaseRef && (
        <section style={S.carte}>
          <h2 style={S.h2}>Documents de l'étape {d.phase ? `— ${d.phase.compteur.manquantes} manquant(s) sur ${d.phase.compteur.attendues}` : ""}</h2>
          <DocumentsParPhase base={`${base}/pieces`} mode="admin" seulementPhase={d.info.phaseRef} depot={{ porte: PORTE_ADMIN, contexte: "dossier", objetId: id }} />
        </section>
      )}

      {d.info.phaseGraphique && (
        <section style={S.carte}>
          <h2 style={S.h2}>Pièces graphiques — {d.info.phaseGraphique}</h2>
          <GaleriePlans porte={PORTE_ADMIN} dossierId={id} mode="admin" phaseUnique={d.info.phaseGraphique} videos={d.videos} agirVideo={agirFiche}
            niveaux={niveauxDuProjet(d.profil?.sousSols ?? 0, d.profil?.etagesHorsSol ?? 1)} />
        </section>
      )}

      {d.info.chantier && (
        <section style={S.carte}>
          <h2 style={S.h2}>Checklists et PV de chantier</h2>
          {(d.phase?.checklists ?? []).length === 0 ? <p style={S.petit}>Aucune checklist pour cette phase.</p> : (
            <ul style={S.liste}>{d.phase!.checklists.map((c) => <li key={c.code} style={S.ligne}>{c.titre} — {c.nbPoints} point(s){c.nbPointsArret ? `, dont ${c.nbPointsArret} point(s) d'arrêt` : ""}</li>)}</ul>
          )}
          <p style={S.petit}>Les PV se remplissent, se signent et s'impriment dans l'espace projet du dossier (jalon concerné, onglet Documents).</p>
          <div style={S.actions}>
            {d.projets.length ? d.projets.map((p) => <Link key={p.id} to={`/cc/projets/${encodeURIComponent(p.id)}`} style={S.btnLien}>Ouvrir l'espace projet{d.projets.length > 1 ? ` — ${p.titre ?? p.id}` : ""}</Link>)
              : <Link to="/cc/projets" style={S.btnLien}>Créer l'espace projet du dossier</Link>}
          </div>
        </section>
      )}

      <section style={S.carte}>
        <h2 style={S.h2}>Relancer le client</h2>
        {d.manquantesClient.length ? (
          <>
            <p style={S.petit}>Pièces que le client doit fournir pour cette étape :</p>
            <ul style={S.liste}>{d.manquantesClient.map((x) => <li key={x} style={S.ligne}>{x}</li>)}</ul>
          </>
        ) : <p style={S.petit}>Aucune pièce du client ne manque pour cette étape.</p>}
        <EcrireMessage porte="admin" contexte="dossier" objetId={id} invites={[{ type: "client", dossierId: id }]} avecNom={d.dossier.clientNom || "le client"}
          sujet={d.relance.sujet} texteInitial={d.relance.texte} langue="fr" variante="navy" libelle="Relancer le client" />
      </section>

      <Intervenants d={d} occupe={occupe} agirEtape={agirEtape} dossierId={id} code={code} />

      <section style={S.carte}>
        <h2 style={S.h2}>Matériaux de l'étape</h2>
        <MateriauxEtape dossierId={id} etape={code} />
      </section>

      <Echanges d={d} code={code} dossierId={id} />

      <section style={S.carte}>
        <h2 style={S.h2}>Journal de l'étape ({d.journal.length})</h2>
        {d.journal.length === 0 ? <p style={S.petit}>Aucune action enregistrée pour cette étape.</p> : (
          <ul style={S.liste}>{d.journal.map((j) => <li key={j.id} style={S.ligne}><span style={S.petit}>{dateHeure(j.createdAt)}</span> <b>{j.action}</b> <span style={S.petit}>par {j.auteur}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}

function EnTete({ d, occupe, agirFiche, agirEtape }: { d: Donnees; occupe: boolean; agirFiche: (c: Record<string, unknown>, m: string) => Promise<void>; agirEtape: (c: Record<string, unknown>, m: string) => Promise<void> }) {
  const e = d.etape;
  const [statut, setStatut] = useState(e?.statut ?? "");
  const [p, setP] = useState(d.planning);
  useEffect(() => { setStatut(e?.statut ?? ""); setP(d.planning); }, [e?.statut, d.planning]);
  const enregistrerStatut = () => {
    if (!e) return;
    if (statut === "DEBLOQUEE") {
      const motif = window.prompt("Débloquer l'étape : motif écrit (obligatoire, journalisé)");
      if (!motif || !motif.trim()) return;
      void agirFiche({ action: "etape", code: e.code, statut, note: motif.trim() }, "Étape débloquée.");
    } else void agirFiche({ action: "etape", code: e.code, statut }, "Statut de l'étape enregistré.");
  };
  return (
    <section style={{ ...S.carte, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <div>
        <div style={S.petit}>Statut</div>
        <div style={{ fontWeight: 700, fontSize: 16, margin: "2px 0 6px" }}>{LIB_STATUT[e?.statut ?? ""] ?? e?.statut ?? "—"}{e?.date ? ` · ${dateFr(e.date)}` : ""}</div>
        <div style={S.actions}>
          <select style={S.input} value={statut} onChange={(x) => setStatut(x.target.value)}>
            {d.statutsEtape.map((s) => <option key={s} value={s}>{LIB_STATUT[s] ?? s}</option>)}
          </select>
          <button style={S.btn} disabled={occupe || !e || statut === e.statut} onClick={enregistrerStatut}>Enregistrer</button>
        </div>
        {e?.note && <p style={S.petit}>Note : {e.note}</p>}
      </div>
      <div>
        <div style={S.petit}>Dates prévues</div>
        <div style={S.actions}>
          <input type="date" style={S.input} value={p.datePrevueDebut ?? ""} onChange={(x) => setP({ ...p, datePrevueDebut: x.target.value || null })} aria-label="Début prévu" />
          <input type="date" style={S.input} value={p.datePrevueFin ?? ""} onChange={(x) => setP({ ...p, datePrevueFin: x.target.value || null })} aria-label="Fin prévue" />
        </div>
        <div style={S.petit}>Réalisée : {dateFr(d.planning.dateReelle)} · démarrage de la phase : {dateFr(d.planning.dateDemarragePhase)}</div>
      </div>
      <div>
        <div style={S.petit}>Responsable (rôle ou intervenant)</div>
        <input style={{ ...S.input, width: "100%", boxSizing: "border-box" }} value={p.responsable ?? ""} placeholder={d.info.validateurs.join(", ") || "Architecte"} onChange={(x) => setP({ ...p, responsable: x.target.value || null })} />
        <div style={S.petit}>Validation : {d.info.validateurs.join(", ") || "—"} · intervenants prévus : {d.info.acteurs.join(", ") || "—"}</div>
        <button style={{ ...S.btnGhost, marginTop: 6 }} disabled={occupe} onClick={() => void agirEtape({ action: "planning", ...p }, "Dates et responsable enregistrés.")}>Enregistrer dates et responsable</button>
      </div>
    </section>
  );
}

function Intervenants({ d, occupe, agirEtape, dossierId, code }: { d: Donnees; occupe: boolean; agirEtape: (c: Record<string, unknown>, m: string) => Promise<void>; dossierId: string; code: string }) {
  const [genre, setGenre] = useState<"prestataire" | "fournisseur" | null>(null);
  const [pros, setPros] = useState<Pro[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!genre || pros) return;
    void appel<{ fournisseurs: Array<Record<string, unknown>> }>("/api/cc/fournisseurs?statut=APPROVED")
      .then((r) => setPros(r.fournisseurs.filter((f) => !(f.fictif)).map((f) => ({ id: String(f.id), raisonSociale: String(f.raisonSociale ?? ""), metier: String(f.metier ?? ""), ville: (f.ville as string) ?? null }))))
      .catch(() => setPros([]));
  }, [genre, pros]);
  const MATERIAUX = new Set(["FOURNISSEUR_MATERIAUX", "FABRICANT", "IMPORTATEUR"]);
  const liste = useMemo(() => (pros ?? []).filter((p) => (genre === "fournisseur" ? MATERIAUX.has(p.metier) : !MATERIAUX.has(p.metier)))
    .filter((p) => !q.trim() || `${p.raisonSociale} ${p.metier} ${p.ville ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30), [pros, genre, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const objetEtape = `${dossierId}:${code}`.slice(0, 120);
  return (
    <section style={S.carte}>
      <h2 style={S.h2}>Intervenants de l'étape</h2>
      {d.intervenants.length === 0 ? <p style={S.petit}>Aucun intervenant ajouté.</p> : (
        <ul style={S.liste}>
          {d.intervenants.map((i) => (
            <li key={i.id} style={{ ...S.ligne, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <b>{i.nom}</b> <span style={S.petit}>{LIB_ROLE[i.role] ?? i.role}{i.projetMembreId ? " · membre de l'espace projet" : ""} · ajouté le {dateFr(i.ajouteLe)}</span>
              <EcrireMessage porte="admin" contexte="dossier" objetId={objetEtape} invites={[{ type: "pro", id: i.proId }]} avecNom={i.nom} sujet={`${d.dossier.titre ?? "Dossier"} — ${d.etape?.titre ?? code}`} langue="fr" variante="contour" />
              <DemanderAppelVideo porte="admin" contexte="dossier" objetId={objetEtape} invites={[{ type: "pro", id: i.proId }]} avecNom={i.nom} sujet={d.etape?.titre ?? code} langue="fr" variante="navy" />
              <button style={S.lienBtn} disabled={occupe} onClick={() => { if (window.confirm(`Retirer ${i.nom} de l'étape ?`)) void agirEtape({ action: "intervenant_retirer", id: i.id }, "Intervenant retiré."); }}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
      <div style={S.actions}>
        <button style={S.btnGhost} onClick={() => setGenre(genre === "prestataire" ? null : "prestataire")}>+ Ajouter un prestataire</button>
        <button style={S.btnGhost} onClick={() => setGenre(genre === "fournisseur" ? null : "fournisseur")}>+ Ajouter un fournisseur</button>
      </div>
      {genre && (
        <div style={{ marginTop: 8 }}>
          <input style={{ ...S.input, width: "100%", boxSizing: "border-box" }} placeholder={`Chercher un ${genre} validé (nom, métier, ville)`} value={q} onChange={(x) => setQ(x.target.value)} />
          <p style={S.petit}>Annuaire Cercles (pros validés). Aucune coordonnée n'est affichée : le contact passe par la plateforme.{genre === "prestataire" && d.projets.length ? " Le prestataire rejoint aussi l'espace projet du dossier avec son rôle." : ""}</p>
          {pros === null ? <p style={S.petit}>Chargement…</p> : liste.length === 0 ? <p style={S.petit}>Aucun résultat.</p> : (
            <ul style={S.liste}>
              {liste.map((p) => (
                <li key={p.id} style={{ ...S.ligne, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span><b>{p.raisonSociale}</b> <span style={S.petit}>{p.metier.toLowerCase().replace(/_/g, " ")}{p.ville ? ` · ${p.ville}` : ""}</span></span>
                  <button style={S.btn} disabled={occupe || d.intervenants.some((i) => i.proId === p.id)}
                    onClick={() => void agirEtape({ action: "intervenant_ajouter", proId: p.id, projetId: d.projets[0]?.id ?? null }, `${p.raisonSociale} ajouté à l'étape.`)}>Ajouter</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Echanges({ d, code, dossierId }: { d: Donnees; code: string; dossierId: string }) {
  const x = d.echanges;
  return (
    <section style={S.carte}>
      <h2 style={S.h2}>Échanges de l'étape et du dossier</h2>
      {!x ? <p style={S.petit}>Échanges indisponibles.</p> : (
        <>
          <div style={S.sousTitre}>Rendez-vous visio</div>
          {x.rendezVous.length ? <ul style={S.liste}>{x.rendezVous.map((r) => <li key={r.id} style={S.ligne}>{dateHeure(r.debut)} · {r.statut ?? "—"}{r.objet ? ` · ${r.objet.toLowerCase()}` : ""}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
          <div style={S.sousTitre}>Appels vidéo</div>
          {x.appels.length ? <ul style={S.liste}>{x.appels.map((a) => <li key={a.id} style={{ ...S.ligne, fontWeight: a.etape === code ? 700 : 400 }}>{a.sujet ?? "Appel"} · {a.statut.toLowerCase()}{a.creneau ? ` · ${dateHeure(a.creneau)}` : ""}{a.etape === code ? " · cette étape" : a.etape ? ` · étape ${a.etape}` : ""}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
          <div style={S.sousTitre}>Messages</div>
          {x.conversations.length ? <ul style={S.liste}>{x.conversations.map((c) => <li key={c.id} style={{ ...S.ligne, fontWeight: c.etape === code ? 700 : 400 }}>{c.sujet ?? "Fil"} · {c.statut.toLowerCase()} · {dateHeure(c.dernierMessageLe)}{c.etape === code ? " · cette étape" : ""}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
          <div style={S.actions}>
            <Link to="/cc/messages" style={S.lien}>Ouvrir la messagerie</Link>
            <Link to="/cc/appels" style={S.lien}>Ouvrir les appels</Link>
            <DemanderAppelVideo porte="admin" contexte="dossier" objetId={dossierId} invites={[{ type: "client", dossierId }]} avecNom={d.dossier.clientNom || "le client"} sujet={d.etape?.titre ?? code} langue="fr" variante="contour" />
          </div>
        </>
      )}
    </section>
  );
}

const S = {
  page: { padding: "20px 24px 60px", fontFamily: CC.font.body, color: CC.color.ink, maxWidth: 1100 } as React.CSSProperties,
  titre: { fontFamily: CC.font.display, fontSize: 26, margin: "4px 0", color: CC.color.navy } as React.CSSProperties,
  sous: { color: CC.color.inkMid, margin: "0 0 6px", fontSize: 14, lineHeight: 1.5 } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.6 } as React.CSSProperties,
  h2: { fontSize: 15, color: CC.color.navy, margin: "0 0 10px" } as React.CSSProperties,
  sousTitre: { fontSize: 12.5, fontWeight: 700, color: CC.color.ink, margin: "8px 0 4px", textTransform: "uppercase", letterSpacing: 0.4 } as React.CSSProperties,
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, margin: "12px 0" } as React.CSSProperties,
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } as React.CSSProperties,
  liste: { listStyle: "none", margin: "4px 0 8px", padding: 0 } as React.CSSProperties,
  ligne: { padding: "6px 0", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13.5 } as React.CSSProperties,
  btn: { padding: "7px 13px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
  btnGhost: { padding: "7px 13px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
  btnLien: { padding: "7px 13px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: "#fff", color: CC.color.navy, fontSize: 13, textDecoration: "none", fontWeight: 600 } as React.CSSProperties,
  lien: { color: CC.color.info, fontSize: 13, fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
  lienBtn: { background: "none", border: "none", color: CC.color.info, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34 } as React.CSSProperties,
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14 } as React.CSSProperties,
  info: { background: CC.color.successBg, color: CC.color.success, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14, wordBreak: "break-all" } as React.CSSProperties,
};
