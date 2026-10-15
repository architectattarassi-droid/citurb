/**
 * FicheDossier — /cc/dossiers/:id (lot 3c, docs/architecture/plan-rebranchement.md)
 *
 * L'admin entre dans n'importe quel dossier et voit TOUT le parcours, de A à Z
 * (premier contact → réception définitive), sans aucun blocage :
 *   - chaque étape se marque faite / en cours / à faire / sans objet / débloquée,
 *     se rouvre, ou devient la phase actuelle ;
 *   - statut forcé, note OPS, « Débloquer » (refus/corrections levés, archivage annulé,
 *     blocage du payload retiré), lien d'accès du client régénéré (WhatsApp prérempli) ;
 *   - vue client (ce que voit le client) ; échanges : message / appel vidéo au client ;
 *   - journal de toutes les actions (DossierEvenement).
 * Serveur : GET/PATCH /api/cc/dossiers/:id, POST …/lien, GET …/vue-client.
 * Devis (devis/OngletDevis.tsx) et Factures : onglets fournis par la session « Devis & facturation »
 * (docs/architecture/contrat-devis-facturation.md) ; Documents : dépôt commun à venir.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CC } from "../../theme/tokens";
import DemanderAppelVideo from "../../../features/appels/DemanderAppelVideo";
import EcrireMessage from "../../../features/messages/EcrireMessage";
import { VueDossierClient, type DossierClient } from "../../../features/mon-dossier/MonDossierPage";
import OngletDevis from "./devis/OngletDevis";
import OngletFactures from "./devis/OngletFactures";
import PanneauProfil, { type Profil } from "./PanneauProfil";
import PanneauDates, { type Dates, type Echeance } from "./PanneauDates";
import DocumentsParPhase from "../../../features/gestion/DocumentsParPhase";

type Etape = {
  code: string; titre: string; famille: string; conditionnelle: boolean; statut: string; source: "saisie" | "deduite"; date: string | null; note: string | null; saisiPar: string | null;
  phaseRef?: string; retiree?: boolean; aide?: string;
};
type EntetePhase = { code: string; ordre: number; titre: string; titreAr: string };
type Fiche = {
  dossier: Record<string, unknown> & { id: string; title?: string; status?: string; phase?: string; clientNom?: string; clientTel?: string; clientEmail?: string; porteType?: string; opsNote?: string | null; payload?: unknown; createdAt?: string };
  compteClient: { id: string; email: string | null; telephone: string | null; nom: string | null; actif: boolean; motDePasse: boolean } | null;
  cabinet: { id: string; nom: string | null; architecte: string | null } | null;
  leads: Array<{ id: string; nom: string | null; stage: string | null; source: string | null; createdAt: string | null }>;
  rendezVous: Array<{ id: string; debut: string | null; statut: string | null }>;
  projets: Array<{ id: string; titre: string | null; createdAt: string | null }>;
  parcours: Etape[];
  phasesRef?: EntetePhase[];
  profil?: Profil;
  ordreRegional?: { conseil: string; antenne?: string; aVerifier: boolean; via: string; libelle: string } | null;
  dates?: Dates;
  echeances?: Echeance[];
  journal: Array<{ id: string; auteur: string | null; action: string | null; details: unknown; createdAt: string | null }>;
  sqlACollerDevisFacturation: boolean;
  statutsDossier: string[];
  statutsEtape: string[];
};

const LIB_STATUT_ETAPE: Record<string, string> = {
  FAITE: "Faite", FAITE_HORS_PLATEFORME: "Faite hors plateforme", EN_COURS: "En cours", A_FAIRE: "À faire", SANS_OBJET: "Sans objet",
  DEBLOQUEE: "Débloquée", ANTERIEURE: "Antérieure (non saisie)", A_VENIR: "À venir",
};
const COULEUR_ETAPE: Record<string, string> = {
  FAITE: CC.color.success, FAITE_HORS_PLATEFORME: CC.color.success, EN_COURS: CC.color.navy, DEBLOQUEE: CC.color.or,
  A_FAIRE: CC.color.warn, SANS_OBJET: CC.color.inkMuted, ANTERIEURE: CC.color.inkMuted, A_VENIR: CC.color.border,
};
const LIB_FAMILLE: Record<string, string> = {
  PRE_DOSSIER: "Du premier contact au paiement", CADRAGE: "Cadrage", CONCEPTION: "Conception", AUTORISATION: "Autorisation",
  EXECUTION_ETUDES: "Études d'exécution", CPS_MARCHES: "CPS et marchés", CHANTIER_GO: "Chantier — gros œuvre",
  CHANTIER_SECOND_OEUVRE: "Chantier — second œuvre", RECEPTION: "Réception",
};
const LIB_STATUT_DOSSIER: Record<string, string> = {
  DRAFT: "Brouillon", SUBMITTED: "Soumis", IN_REVIEW: "En examen", NEEDS_CHANGES: "À corriger", APPROVED: "Approuvé", REJECTED: "Refusé",
};
const ERREURS: Record<string, string> = {
  sql_a_coller: "Tables d'étapes absentes : coller docs/sql/devis-facturation-neon.sql (ou TOUT-NEON.sql) dans la console Neon.",
  storage_unavailable: "Base indisponible.", not_found: "Dossier introuvable.", access_not_configured: "Secret de lien absent (DOSSIER_LIEN_SECRET ou ADMIN_SESSION_SECRET).",
};
const dateFr = (s: string | null | undefined) => (s ? new Date(s.length === 10 ? `${s}T00:00:00Z` : s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const dateHeure = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

async function appel<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init.body ? { "content-type": "application/json" } : {} });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(ERREURS[j.error] || j.message || j.error || `Erreur ${r.status}`);
  return j as T;
}

type Onglet = "parcours" | "documents" | "echanges" | "journal" | "devis" | "factures" | "donnees";

export default function FicheDossier({ vueClientInitiale = false }: { vueClientInitiale?: boolean }) {
  const { id = "" } = useParams();
  const [f, setF] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("parcours");
  const [occupe, setOccupe] = useState(false);
  const [lien, setLien] = useState<{ lien: string; lienAr: string; whatsapp: string | null } | null>(null);
  const [vueClient, setVueClient] = useState<DossierClient | null | "charge">(null);

  const charger = useCallback(async () => {
    try { setF(await appel<Fiche>(`/api/cc/dossiers/${encodeURIComponent(id)}`)); setErreur(null); }
    catch (e) { setErreur((e as Error).message); }
  }, [id]);
  useEffect(() => { void charger(); }, [charger]);
  // /cc/dossiers/:id/shadow : la fiche s'ouvre sur la vue client.
  useEffect(() => { if (vueClientInitiale) void basculerVueClient(); }, [vueClientInitiale]); // eslint-disable-line react-hooks/exhaustive-deps

  const agir = async (corps: Record<string, unknown>, message: string) => {
    setOccupe(true); setInfo(null);
    try {
      await appel(`/api/cc/dossiers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(corps) });
      setInfo(message); await charger();
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };

  const genererLien = async () => {
    setOccupe(true);
    try { setLien(await appel(`/api/cc/dossiers/${encodeURIComponent(id)}/lien`, { method: "POST", body: "{}" })); await charger(); }
    catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };

  const basculerVueClient = async () => {
    if (vueClient) { setVueClient(null); return; }
    setVueClient("charge");
    try { setVueClient((await appel<{ dossier: DossierClient }>(`/api/cc/dossiers/${encodeURIComponent(id)}/vue-client`)).dossier); }
    catch (e) { setVueClient(null); setErreur((e as Error).message); }
  };

  // Regroupement par phase du référentiel (P00 → P14), dans l'ordre chronologique :
  // premier contact → conception → autorisation → exécution → marchés → chantier → réception → permis d'habiter.
  const groupes = useMemo((): Array<[string, string, string, Etape[]]> => {
    const m = new Map<string, Etape[]>();
    for (const e of f?.parcours ?? []) { const k = e.phaseRef || e.famille; m.set(k, [...(m.get(k) ?? []), e]); }
    const entetes = f?.phasesRef ?? [];
    const connus = entetes.filter((p) => m.has(p.code)).map((p): [string, string, string, Etape[]] => [p.code, `${String(p.ordre).padStart(2, "0")} — ${p.titre}`, p.titreAr, m.get(p.code)!]);
    const autres = [...m.entries()].filter(([k]) => !entetes.some((p) => p.code === k)).map(([k, v]): [string, string, string, Etape[]] => [k, LIB_FAMILLE[k] || k, "", v]);
    return [...connus, ...autres];
  }, [f]);

  if (!f) return <div style={S.page}>{erreur ? <div style={S.erreur}>{erreur}</div> : <p style={S.sous}>Chargement…</p>}<Link to="/cc/dossiers" style={S.lien}>← Liste des dossiers</Link></div>;
  const d = f.dossier;
  const faites = f.parcours.filter((e) => e.statut === "FAITE" || e.statut === "FAITE_HORS_PLATEFORME").length;

  return (
    <div style={S.page}>
      <Link to="/cc/dossiers" style={S.lien}>← Liste des dossiers</Link>
      <div style={S.entete}>
        <div>
          <h1 style={S.titre}>{String(d.title || "Dossier sans titre")}</h1>
          <p style={S.sous}>
            {d.porteType ? <b>{String(d.porteType)}</b> : null} · {d.clientNom ? String(d.clientNom) : "Client"} · {LIB_STATUT_DOSSIER[String(d.status)] || String(d.status)}
            {" · "}Phase : {f.parcours.find((e) => e.code === d.phase)?.titre || String(d.phase || "—")} · {faites} étape(s) faite(s) · créé le {dateFr(String(d.createdAt || ""))}
            {f.cabinet?.nom ? ` · ${f.cabinet.nom}` : ""}
          </p>
        </div>
        <div style={S.actions}>
          <button style={S.btnGhost} onClick={basculerVueClient}>{vueClient ? "Fermer la vue client" : "Vue client"}</button>
          <button style={S.btnGhost} disabled={occupe} onClick={genererLien}>Lien d'accès du client</button>
          <button style={S.btn} disabled={occupe} onClick={() => {
            const motif = window.prompt("Débloquer le dossier : écrivez le motif (obligatoire, gardé au journal)");
            if (motif && motif.trim()) void agir({ action: "debloquer", motif: motif.trim() }, "Dossier débloqué.");
            else if (motif !== null) setErreur("Le motif est obligatoire pour débloquer.");
          }}>Débloquer</button>
        </div>
      </div>

      {f.sqlACollerDevisFacturation && <div style={S.alerte}>Étapes et journal en lecture réduite : {ERREURS.sql_a_coller}</div>}
      {erreur && <div style={S.erreur}>{erreur} <button style={S.lienBtn} onClick={() => setErreur(null)}>fermer</button></div>}
      {info && <div style={S.info}>{info}</div>}
      {lien && (
        <div style={S.carte}>
          <b>Lien d'accès du client (valable 90 jours)</b>
          <p style={S.petit}>Il ouvre le dossier et l'espace client (messages, appels vidéo). À transmettre au client uniquement.</p>
          <input readOnly value={lien.lien} style={{ ...S.input, width: "100%" }} onFocus={(e) => e.currentTarget.select()} />
          <div style={{ ...S.actions, marginTop: 8 }}>
            <button style={S.btnGhost} onClick={() => void navigator.clipboard?.writeText(lien.lien)}>Copier</button>
            <button style={S.btnGhost} onClick={() => void navigator.clipboard?.writeText(lien.lienAr)}>Copier (version arabe)</button>
            {lien.whatsapp && <a style={S.btn} href={lien.whatsapp} target="_blank" rel="noopener noreferrer">Envoyer sur WhatsApp</a>}
          </div>
        </div>
      )}
      {vueClient && (
        <div style={S.cadreClient}>
          <div style={S.badge}>Vue client — exactement ce que voit le client</div>
          {vueClient === "charge" ? <p style={S.sous}>Chargement…</p> : <div style={{ maxWidth: 640 }}><VueDossierClient d={vueClient} /></div>}
        </div>
      )}

      <div style={S.onglets} role="tablist">
        {([["parcours", "Parcours A → Z"], ["documents", "Documents par phase"], ["echanges", "Échanges"], ["journal", `Journal (${f.journal.length})`], ["devis", "Devis"], ["factures", "Factures"], ["donnees", "Données"]] as [Onglet, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={onglet === k} style={S.onglet(onglet === k)} onClick={() => setOnglet(k)}>{l}</button>
        ))}
      </div>

      {onglet === "parcours" && (
        <>
          <PanneauPilotage f={f} occupe={occupe} agir={agir} />
          {f.profil && <PanneauProfil profil={f.profil} ordre={f.ordreRegional ?? null} occupe={occupe} agir={agir} />}
          {f.echeances && <PanneauDates dates={f.dates ?? {}} echeances={f.echeances} occupe={occupe} agir={agir} />}
          {groupes.map(([code, titre, titreAr, etapes]) => (
            <section key={code} style={S.carte}>
              <h2 style={{ ...S.h2, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span>{titre}</span>{titreAr && <span dir="rtl" lang="ar" style={{ fontWeight: 400, color: CC.color.inkMid }}>{titreAr}</span>}
              </h2>
              {etapes.map((e) => <LigneEtape key={e.code} e={e} actuelle={e.code === d.phase} statuts={f.statutsEtape} occupe={occupe} agir={agir} />)}
            </section>
          ))}
        </>
      )}

      {onglet === "documents" && (
        <section style={S.carte}>
          <h2 style={S.h2}>Documents attendus, normes et contrôles — phase par phase</h2>
          <p style={S.petit}>Chaque pièce absente est marquée « Document manquant ». Les pièces conditionnelles dépendent du profil du projet (onglet Parcours).</p>
          <DocumentsParPhase base={`/api/cc/dossiers/${encodeURIComponent(id)}/pieces`} mode="admin" />
        </section>
      )}

      {onglet === "echanges" && (
        <>
          <section style={S.carte}>
            <h2 style={S.h2}>Contacter le client (par la plateforme)</h2>
            <p style={S.petit}>Message ou appel vidéo : rien ne démarre sans l'accord du client ; aucune coordonnée n'est échangée entre parties.</p>
            <div style={S.actions}>
              <DemanderAppelVideo porte="admin" contexte="dossier" objetId={d.id} sujet={String(d.title || "") || undefined} invites={[{ type: "client", dossierId: d.id }]} avecNom={String(d.clientNom || "le client")} langue="fr" variante="navy" />
              <EcrireMessage porte="admin" contexte="dossier" objetId={d.id} sujet={String(d.title || "") || undefined} invites={[{ type: "client", dossierId: d.id }]} avecNom={String(d.clientNom || "le client")} langue="fr" variante="contour" />
              <Link to="/cc/messages" style={S.lien}>Tous les messages</Link>
              <Link to="/cc/appels" style={S.lien}>Tous les appels</Link>
            </div>
          </section>
          <section style={S.carte}>
            <h2 style={S.h2}>Documents</h2>
            <p style={S.petit}>Pièces du dossier, phase par phase : onglet « Documents par phase ».</p>
            <button style={S.btnGhost} onClick={() => setOnglet("documents")}>Ouvrir les documents</button>
          </section>
          <section style={S.carte}>
            <h2 style={S.h2}>Historique commercial</h2>
            <div style={S.petit}><b>Leads</b> : {f.leads.length ? f.leads.map((l) => `${dateFr(l.createdAt)} (${l.stage ?? "—"}, ${l.source ?? "—"})`).join(" · ") : "aucun"} — <Link to="/cc/leads" style={S.lien}>ouvrir les leads</Link></div>
            <div style={S.petit}><b>Rendez-vous</b> : {f.rendezVous.length ? f.rendezVous.map((r) => `${dateHeure(r.debut)} (${r.statut ?? "—"})`).join(" · ") : "aucun"} — <Link to="/cc/rendez-vous" style={S.lien}>ouvrir l'agenda</Link></div>
            <div style={S.petit}><b>Espaces projet (chantier)</b> : {f.projets.length ? f.projets.map((p) => p.titre || p.id).join(" · ") : "aucun"} — <Link to="/cc/projets" style={S.lien}>ouvrir les projets</Link></div>
          </section>
        </>
      )}

      {onglet === "journal" && (
        <section style={S.carte}>
          {f.journal.length === 0 ? <p style={S.sous}>Aucune action enregistrée.</p> : (
            <ul style={S.liste}>
              {f.journal.map((j) => (
                <li key={j.id} style={S.ligneJournal}>
                  <span style={S.petit}>{dateHeure(j.createdAt)}</span> <b>{j.action}</b> <span style={S.petit}>par {j.auteur}</span>
                  {j.details != null && <code style={S.code}>{JSON.stringify(j.details)}</code>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {onglet === "devis" && (
        <section style={S.carte}>
          <h2 style={S.h2}>Devis</h2>
          <OngletDevis dossierId={id} />
        </section>
      )}

      {onglet === "factures" && (
        <section style={S.carte}>
          <h2 style={S.h2}>Factures et encaissements</h2>
          <OngletFactures dossierId={id} />
        </section>
      )}

      {onglet === "donnees" && (
        <section style={S.carte}>
          <h2 style={S.h2}>Compte client</h2>
          {f.compteClient ? (
            <p style={S.petit}>{f.compteClient.nom || "—"} · {f.compteClient.telephone || "sans téléphone"} · {f.compteClient.email || "sans e-mail"} · {f.compteClient.actif ? "actif" : "désactivé"} · accès par lien (sans mot de passe)</p>
          ) : <p style={S.petit}>Aucun compte rattaché.</p>}
          <h2 style={S.h2}>Dossier (toutes les colonnes)</h2>
          <pre style={S.pre}>{JSON.stringify(d, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

function PanneauPilotage({ f, occupe, agir }: { f: Fiche; occupe: boolean; agir: (c: Record<string, unknown>, m: string) => Promise<void> }) {
  const d = f.dossier;
  const [statut, setStatut] = useState(String(d.status || ""));
  const [note, setNote] = useState(String(d.opsNote || ""));
  useEffect(() => { setStatut(String(d.status || "")); setNote(String(d.opsNote || "")); }, [d.status, d.opsNote]);
  return (
    <section style={{ ...S.carte, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      <div>
        <h2 style={S.h2}>Statut du dossier</h2>
        <div style={S.actions}>
          <select style={S.input} value={statut} onChange={(e) => setStatut(e.target.value)}>
            {f.statutsDossier.map((s) => <option key={s} value={s}>{LIB_STATUT_DOSSIER[s] || s}</option>)}
          </select>
          <button style={S.btn} disabled={occupe || statut === d.status} onClick={() => void agir({ action: "statut", statut }, "Statut forcé.")}>Forcer</button>
        </div>
      </div>
      <div>
        <h2 style={S.h2}>Note OPS</h2>
        <textarea style={{ ...S.input, width: "100%", minHeight: 64, boxSizing: "border-box" }} value={note} onChange={(e) => setNote(e.target.value)} />
        <button style={{ ...S.btnGhost, marginTop: 6 }} disabled={occupe || note === String(d.opsNote || "")} onClick={() => void agir({ action: "note", note }, "Note enregistrée.")}>Enregistrer la note</button>
      </div>
    </section>
  );
}

function LigneEtape({ e, actuelle, statuts, occupe, agir }: { e: Etape; actuelle: boolean; statuts: string[]; occupe: boolean; agir: (c: Record<string, unknown>, m: string) => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [statut, setStatut] = useState(e.statut);
  const [date, setDate] = useState(e.date || "");
  const [note, setNote] = useState(e.note || "");
  const estPhase = !e.code.startsWith("PRE_");
  return (
    <div style={S.ligneEtape}>
      <div style={S.ligneEtapeTete} onClick={() => setOuvert(!ouvert)}>
        <span style={{ ...S.puce, background: COULEUR_ETAPE[e.statut] || CC.color.border }} aria-hidden />
        <span style={{ flex: 1, fontWeight: actuelle ? 700 : 400 }}>
          {e.titre}{actuelle ? " — phase actuelle" : ""}{e.conditionnelle ? <span style={S.petit}> (selon le projet)</span> : null}
          {e.retiree ? <span style={S.petit}> (étape retirée — historique conservé)</span> : null}
          {e.aide ? <span style={{ ...S.petit, display: "block" }}>{e.aide}</span> : null}
        </span>
        <span style={S.petit}>{LIB_STATUT_ETAPE[e.statut] || e.statut}{e.date ? ` · ${dateFr(e.date)}` : ""}{e.source === "saisie" && e.saisiPar ? ` · ${e.saisiPar}` : ""}</span>
        <button style={S.lienBtn} onClick={(ev) => { ev.stopPropagation(); setOuvert(!ouvert); }}>{ouvert ? "Fermer" : "Modifier"}</button>
      </div>
      {e.note && !ouvert && <div style={{ ...S.petit, paddingInlineStart: 22 }}>{e.note}</div>}
      {ouvert && (
        <div style={{ ...S.actions, padding: "8px 0 4px 22px" }}>
          <select style={S.input} value={statuts.includes(statut) ? statut : ""} onChange={(ev) => setStatut(ev.target.value)}>
            <option value="" disabled>Statut…</option>
            {statuts.map((s) => <option key={s} value={s}>{LIB_STATUT_ETAPE[s] || s}</option>)}
          </select>
          <input type="date" style={S.input} value={date} onChange={(ev) => setDate(ev.target.value)} />
          <input style={{ ...S.input, flex: "1 1 200px" }} placeholder="Note (facultatif)" value={note} onChange={(ev) => setNote(ev.target.value)} />
          <button style={S.btn} disabled={occupe || !statuts.includes(statut) || (statut === "DEBLOQUEE" && !note.trim())} title={statut === "DEBLOQUEE" && !note.trim() ? "Débloquer : écrire le motif dans la note" : undefined}
            onClick={() => void agir({ action: "etape", code: e.code, statut, date: date || null, note: note || null }, `Étape « ${e.titre} » mise à jour.`)}>Enregistrer</button>
          {statut === "DEBLOQUEE" && !note.trim() && <span style={{ ...S.petit, color: CC.color.danger }}>Motif obligatoire pour débloquer (dans la note).</span>}
          <button style={S.btnGhost} disabled={occupe} onClick={() => void agir({ action: "rouvrir", code: e.code }, `Étape « ${e.titre} » rouverte.`)}>Rouvrir</button>
          {estPhase && !actuelle && <button style={S.btnGhost} disabled={occupe} onClick={() => void agir({ action: "phase", phase: e.code }, `Phase actuelle : ${e.titre}.`)}>En faire la phase actuelle</button>}
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding: "20px 24px 60px", fontFamily: CC.font.body, color: CC.color.ink } as React.CSSProperties,
  entete: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", margin: "10px 0 6px" } as React.CSSProperties,
  titre: { fontFamily: CC.font.display, fontSize: 26, margin: "0 0 4px", color: CC.color.navy } as React.CSSProperties,
  sous: { color: CC.color.inkMid, margin: "0 0 10px", fontSize: 14, lineHeight: 1.5 } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.6 } as React.CSSProperties,
  h2: { fontSize: 15, color: CC.color.navy, margin: "0 0 10px" } as React.CSSProperties,
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, margin: "12px 0" } as React.CSSProperties,
  cadreClient: { border: `2px dashed ${CC.color.or}`, borderRadius: 12, padding: 14, margin: "12px 0", background: "#FAF7F2" } as React.CSSProperties,
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#92400e", background: "#fef3c7", padding: "3px 8px", borderRadius: 6, marginBottom: 8 } as React.CSSProperties,
  actions: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, textDecoration: "none", minHeight: 36 } as React.CSSProperties,
  btnGhost: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
  lien: { color: CC.color.info, fontSize: 13, fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
  lienBtn: { background: "none", border: "none", color: CC.color.info, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34 } as React.CSSProperties,
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14 } as React.CSSProperties,
  alerte: { background: CC.color.warnBg, color: CC.color.warn, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13.5 } as React.CSSProperties,
  info: { background: CC.color.successBg, color: CC.color.success, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14 } as React.CSSProperties,
  onglets: { display: "flex", flexWrap: "wrap", gap: 2, borderBottom: `1px solid ${CC.color.border}`, marginTop: 14 } as React.CSSProperties,
  onglet: (on: boolean): React.CSSProperties => ({ padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
    borderBottom: `2px solid ${on ? CC.color.or : "transparent"}`, color: on ? CC.color.navy : CC.color.inkMid, fontWeight: on ? 600 : 400 }),
  ligneEtape: { borderBottom: `1px solid ${CC.color.borderSoft}`, padding: "6px 0" } as React.CSSProperties,
  ligneEtapeTete: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer", fontSize: 14 } as React.CSSProperties,
  puce: { width: 12, height: 12, borderRadius: "50%", flex: "0 0 12px" } as React.CSSProperties,
  liste: { listStyle: "none", margin: 0, padding: 0 } as React.CSSProperties,
  ligneJournal: { padding: "6px 0", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13.5 } as React.CSSProperties,
  code: { display: "block", fontSize: 11.5, color: CC.color.inkMid, whiteSpace: "pre-wrap", wordBreak: "break-word" } as React.CSSProperties,
  pre: { fontSize: 11, maxHeight: 420, overflow: "auto", background: "#fff", border: `1px solid ${CC.color.border}`, borderRadius: 6, padding: 10, whiteSpace: "pre-wrap" } as React.CSSProperties,
};
