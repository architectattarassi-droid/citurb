/**
 * MateriauxModule — /cc/materiaux (matériauthèque publique /materiaux)
 *
 *   - Demandes de prix : leads source MATERIAUX (panier multi-matériaux) —
 *     le suivi commercial (statut, notes) reste dans /cc/leads ;
 *   - Prix signalés : signalements de visiteurs (leads MATERIAUX_SIGNALEMENT) ;
 *     les fiches fournisseurs hors ±50 % sont dans /cc/fournisseurs ;
 *   - Prix de référence : mise à jour manuelle avec source et date
 *     (POST /api/cc/prix-reference, table "PrixReferenceManuel").
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CC } from "../../theme/tokens";
import { MATERIAUX_PUBLICS, prixReference } from "../../../domain/materiaux/reference";
import { SOURCE_DEMANDE, SOURCE_SIGNALEMENT } from "../../../domain/materiaux/demandePrix";

interface Lead {
  id: string; createdAt: string; nom: string; ville: string; tel?: string; email?: string; source: string; status: string;
  interet?: string; wizard?: Record<string, unknown>;
}
interface LigneDP { code: string; libelle: string; quantite: number; uniteLibelle: string; estimationHT: number | null }
interface PrixManuel { id: string; code: string; prixHT: number; prixMinHT: number; prixMaxHT: number; source: string; sourceUrl: string | null; datePrix: string; auteur: string; createdAt: string; prixAvantHT: number | null }

const ERREURS: Record<string, string> = {
  not_installed: "Table \"PrixReferenceManuel\" absente : collez docs/prix/sql/prix-reference-manuel.sql dans la console Neon.",
  storage_unavailable: "Base indisponible.",
  source_requise: "Indiquez la source du prix.",
  date_invalide: "Date du prix invalide (AAAA-MM-JJ, pas dans le futur).",
  fourchette_invalide: "Il faut min ≤ prix ≤ max.",
  prix_invalide: "Prix invalide.",
  code_invalide: "Matériau inconnu.",
  url_invalide: "Lien de source invalide (https://…).",
};

async function appel<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(chemin, { credentials: "include", ...init, headers: { ...(init.body ? { "content-type": "application/json" } : {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j && (j as { ok?: boolean }).ok === false)) throw new Error(ERREURS[(j as { error?: string }).error || ""] || (j as { error?: string }).error || `Erreur ${r.status}`);
  return j as T;
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n));
const date = (s: string) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");

const S = {
  page: { padding: "24px 28px", fontFamily: CC.font.body, color: CC.color.ink } as React.CSSProperties,
  titre: { fontFamily: CC.font.display, fontSize: 28, margin: "0 0 4px", color: CC.color.navy } as React.CSSProperties,
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radiusLg, padding: 16, marginBottom: 12 } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, width: "100%" } as React.CSSProperties,
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: CC.color.inkMid, padding: "8px 10px", borderBottom: `1px solid ${CC.color.border}` } as React.CSSProperties,
  td: { padding: "8px 10px", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13, verticalAlign: "top" } as React.CSSProperties,
  onglet: (on: boolean): React.CSSProperties => ({ padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
    borderBottom: `2px solid ${on ? CC.color.or : "transparent"}`, color: on ? CC.color.navy : CC.color.inkMid, fontWeight: on ? 600 : 400 }),
};

export default function MateriauxModule() {
  const [onglet, setOnglet] = useState<"demandes" | "signalements" | "prix">("demandes");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = useCallback(() => {
    setErreur("");
    appel<Lead[] | { leads?: Lead[] }>("/api/cc/leads")
      .then((j) => setLeads(Array.isArray(j) ? j : j.leads || []))
      .catch((e: Error) => setErreur(e.message));
  }, []);
  useEffect(charger, [charger]);
  const demandes = (leads || []).filter((l) => l.source === SOURCE_DEMANDE);
  const signalements = (leads || []).filter((l) => l.source === SOURCE_SIGNALEMENT);

  return (
    <div style={S.page}>
      <h1 style={S.titre}>Matériaux & demandes de prix</h1>
      <p style={{ color: CC.color.inkMid, margin: "0 0 12px" }}>
        Matériauthèque publique <a href="/materiaux" target="_blank" rel="noreferrer">/materiaux</a> : demandes de prix, prix signalés, mises à jour des prix de référence.
      </p>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${CC.color.border}`, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={S.onglet(onglet === "demandes")} onClick={() => setOnglet("demandes")}>Demandes de prix ({demandes.length})</button>
        <button style={S.onglet(onglet === "signalements")} onClick={() => setOnglet("signalements")}>Prix signalés ({signalements.length})</button>
        <button style={S.onglet(onglet === "prix")} onClick={() => setOnglet("prix")}>Prix de référence</button>
      </div>
      {erreur && onglet !== "prix" && <p style={{ color: CC.color.danger }}>{erreur}</p>}
      {onglet === "demandes" && <Demandes leads={demandes} charge={leads !== null} />}
      {onglet === "signalements" && <Signalements leads={signalements} charge={leads !== null} />}
      {onglet === "prix" && <PrixReference />}
    </div>
  );
}

function Demandes({ leads, charge }: { leads: Lead[]; charge: boolean }) {
  if (!charge) return <p>Chargement…</p>;
  if (!leads.length) return <p style={{ color: CC.color.inkMid }}>Aucune demande de prix pour le moment.</p>;
  return (
    <>
      {leads.map((l) => {
        const dp = (l.wizard?.demandePrix || {}) as { ville?: string; region?: string; lignes?: LigneDP[]; estimationHT?: number | null; fournisseursRegion?: number | null };
        return (
          <div key={l.id} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{l.nom} — {dp.ville || l.ville}</strong>
              <span style={{ color: CC.color.inkMid, fontSize: 13 }}>{date(l.createdAt)} · {l.status} · <Link to="/cc/leads">ouvrir dans Leads</Link></span>
            </div>
            <p style={{ margin: "4px 0", fontSize: 13 }}>{l.tel}{l.email ? ` · ${l.email}` : ""}{dp.fournisseursRegion === 0 ? " · aucun fournisseur inscrit dans la région" : dp.fournisseursRegion ? ` · ${dp.fournisseursRegion} fournisseur(s) dans la région` : ""}</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={S.th}>Matériau</th><th style={S.th}>Quantité</th><th style={S.th}>Estimation HT</th></tr></thead>
              <tbody>
                {(dp.lignes || []).map((x, i) => (
                  <tr key={i}><td style={S.td}>{x.libelle} <small style={{ color: CC.color.inkMid }}>{x.code}</small></td><td style={S.td}>{fmt(x.quantite)} {x.uniteLibelle}</td><td style={S.td}>{fmt(x.estimationHT)} DH</td></tr>
                ))}
              </tbody>
            </table>
            {dp.estimationHT != null && <p style={{ margin: "6px 0 0", fontSize: 13 }}>Total estimé : <strong>{fmt(dp.estimationHT)} DH HT</strong></p>}
            {l.interet && <p style={{ margin: "6px 0 0", fontSize: 12, color: CC.color.inkMid, whiteSpace: "pre-wrap" }}>{l.interet}</p>}
          </div>
        );
      })}
    </>
  );
}

function Signalements({ leads, charge }: { leads: Lead[]; charge: boolean }) {
  if (!charge) return <p>Chargement…</p>;
  return (
    <>
      <p style={{ fontSize: 13, color: CC.color.inkMid }}>Les fiches de prix fournisseurs hors ±50 % de la référence sont dans <Link to="/cc/fournisseurs">Fournisseurs & prix → Fiches signalées</Link>.</p>
      {!leads.length ? <p style={{ color: CC.color.inkMid }}>Aucun prix signalé par les visiteurs.</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Matériau</th><th style={S.th}>Prix signalé</th><th style={S.th}>Référence HT</th><th style={S.th}>Source / précisions</th><th style={S.th}>Contact</th></tr></thead>
          <tbody>
            {leads.map((l) => {
              const s = (l.wizard?.signalementPrix || {}) as { code?: string; libelle?: string; prixSignale?: string; source?: string; referenceHT?: number };
              return (
                <tr key={l.id}>
                  <td style={S.td}>{date(l.createdAt)}</td>
                  <td style={S.td}>{s.libelle} <small>{s.code}</small></td>
                  <td style={S.td}>{s.prixSignale} DH</td>
                  <td style={S.td}>{fmt(s.referenceHT)} DH</td>
                  <td style={S.td}>{s.source || "—"}</td>
                  <td style={S.td}>{l.nom} · {l.tel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function PrixReference() {
  const [liste, setListe] = useState<PrixManuel[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ code: "", prixHT: "", prixMinHT: "", prixMaxHT: "", source: "", sourceUrl: "", datePrix: new Date().toISOString().slice(0, 10), note: "" });
  const charger = useCallback(() => {
    appel<{ prix: PrixManuel[] }>("/api/cc/prix-reference").then((j) => setListe(j.prix)).catch((e: Error) => { setListe([]); setErreur(e.message); });
  }, []);
  useEffect(charger, [charger]);
  const choix = useMemo(() => {
    const k = q.trim().toLowerCase();
    return MATERIAUX_PUBLICS.filter((r) => !k || `${r.libelle} ${r.code}`.toLowerCase().includes(k)).slice(0, 50);
  }, [q]);
  const ref = f.code ? prixReference(f.code) : null;
  const unite = MATERIAUX_PUBLICS.find((r) => r.code === f.code)?.uniteRef;

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setOk("");
    try {
      await appel("/api/cc/prix-reference", { method: "POST", body: JSON.stringify({ ...f, prixHT: Number(f.prixHT), prixMinHT: f.prixMinHT ? Number(f.prixMinHT) : undefined, prixMaxHT: f.prixMaxHT ? Number(f.prixMaxHT) : undefined }) });
      setOk("Prix enregistré : il s'affiche sur /materiaux (cache public d'une heure).");
      setF({ ...f, prixHT: "", prixMinHT: "", prixMaxHT: "", source: "", sourceUrl: "", note: "" });
      charger();
    } catch (x) { setErreur((x as Error).message); }
  }

  return (
    <>
      <form onSubmit={enregistrer} style={{ ...S.carte, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <strong>Mettre à jour un prix de référence</strong>
          <p style={{ fontSize: 12, color: CC.color.inkMid, margin: "2px 0 0" }}>Prix en DH HT par unité de référence. Source et date obligatoires ; l'historique est conservé. Le moteur de chiffrage garde ses prix sourcés : signalez l'écart à l'équipe produit si la correction doit s'y appliquer.</p>
        </div>
        <label style={{ gridColumn: "1 / -1", fontSize: 12 }}>Matériau
          <input style={S.input} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={{ ...S.input, marginTop: 4 }} size={5} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required>
            {choix.map((r) => <option key={r.code} value={r.code}>{r.libelle} — {r.code}</option>)}
          </select>
          {ref && <small>Actuel : {fmt(ref.ref)} DH HT / {unite} (fourchette {fmt(ref.min)}–{fmt(ref.max)}, fiabilité {ref.fiabilite}, {ref.date || "non daté"})</small>}
        </label>
        <label style={{ fontSize: 12 }}>Prix HT<input style={S.input} inputMode="decimal" value={f.prixHT} onChange={(e) => setF({ ...f, prixHT: e.target.value })} required /></label>
        <label style={{ fontSize: 12 }}>Min HT (facultatif)<input style={S.input} inputMode="decimal" value={f.prixMinHT} onChange={(e) => setF({ ...f, prixMinHT: e.target.value })} /></label>
        <label style={{ fontSize: 12 }}>Max HT (facultatif)<input style={S.input} inputMode="decimal" value={f.prixMaxHT} onChange={(e) => setF({ ...f, prixMaxHT: e.target.value })} /></label>
        <label style={{ fontSize: 12 }}>Date du prix<input style={S.input} type="date" value={f.datePrix} onChange={(e) => setF({ ...f, datePrix: e.target.value })} required /></label>
        <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Source (devis, distributeur, mercuriale…)<input style={S.input} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} required /></label>
        <label style={{ fontSize: 12 }}>Lien de la source<input style={S.input} value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} placeholder="https://" /></label>
        <label style={{ fontSize: 12 }}>Note<input style={S.input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
          <button type="submit" style={S.btn}>Enregistrer</button>
          {ok && <span style={{ color: CC.color.success, fontSize: 13 }}>{ok}</span>}
          {erreur && <span style={{ color: CC.color.danger, fontSize: 13 }}>{erreur}</span>}
        </div>
      </form>
      <div style={S.carte}>
        <strong>Historique des mises à jour</strong>
        {liste === null ? <p>Chargement…</p> : !liste.length ? <p style={{ color: CC.color.inkMid, fontSize: 13 }}>Aucune mise à jour manuelle.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead><tr><th style={S.th}>Date</th><th style={S.th}>Matériau</th><th style={S.th}>Prix HT</th><th style={S.th}>Avant</th><th style={S.th}>Source</th><th style={S.th}>Auteur</th></tr></thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.id}>
                  <td style={S.td}>{date(p.createdAt)}<br /><small>prix du {p.datePrix}</small></td>
                  <td style={S.td}>{MATERIAUX_PUBLICS.find((r) => r.code === p.code)?.libelle || p.code}</td>
                  <td style={S.td}>{fmt(p.prixHT)} <small>({fmt(p.prixMinHT)}–{fmt(p.prixMaxHT)})</small></td>
                  <td style={S.td}>{fmt(p.prixAvantHT)}</td>
                  <td style={S.td}>{p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.source}</a> : p.source}</td>
                  <td style={S.td}>{p.auteur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
