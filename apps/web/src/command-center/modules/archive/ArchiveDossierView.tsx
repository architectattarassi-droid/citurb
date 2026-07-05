/**
 * ArchiveDossierView.tsx
 * Vue COMPLÈTE d'un dossier depuis l'archive — onglets:
 *  📋 Données (tout le payload + brief + quote du jour 1)
 *  📂 Documents (DossierDocument + SousPhaseDocument)
 *  📅 Phases & Sous-phases
 *  💬 Messagerie complète
 *  💰 Paiements & validations
 *  📈 Timeline (events horodatés)
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, apiBase, getToken } from "../../../tomes/tome4/apiClient";

type Tab = "DATA" | "DOCS" | "PHASES" | "MESSAGES" | "PAYMENTS" | "TIMELINE";

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 16px", background: "transparent", border: 0,
  color: active ? "#22d3ee" : "#94a3b8",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
  borderBottom: `2px solid ${active ? "#22d3ee" : "transparent"}`,
  marginBottom: -1,
});

const S: Record<string, React.CSSProperties> = {
  root: { color: "#e8eaf0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e2330", paddingBottom: 14, marginBottom: 16 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace" },
  sub: { margin: "4px 0 0", fontSize: 12, color: "#6b7280" },
  pillRow: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" as const },
  pill: { display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600 },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #1e2330", marginBottom: 16 },
  card: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 8, padding: 16, marginBottom: 12 },
  k: { color: "#6b7280", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 },
  v: { color: "#e8eaf0", fontSize: 13 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  json: { background: "#020617", padding: 10, borderRadius: 6, fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#94a3b8", overflowX: "auto" as const, maxHeight: 300, lineHeight: 1.4 },
  empty: { color: "#6b7280", fontSize: 13, padding: 20, textAlign: "center" as const },
};

const PILL_BG: Record<string, string> = {
  P1: "rgba(59,130,246,0.2)", P2: "rgba(139,92,246,0.2)", P3: "rgba(16,185,129,0.2)",
  P4: "rgba(245,158,11,0.2)", P5: "rgba(34,211,238,0.2)", P6: "rgba(239,68,68,0.2)",
};
const PILL_FG: Record<string, string> = {
  P1: "#3b82f6", P2: "#8b5cf6", P3: "#10b981", P4: "#f59e0b", P5: "#22d3ee", P6: "#ef4444",
};

const fmtMAD = (n: number | null | undefined) => n == null ? "—" : new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";

export default function ArchiveDossierView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("DATA");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<any>(`/api/cc/archive/dossier/${id}/full`)
      .then(r => setData(r))
      .catch(e => setError(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={S.empty}>⏳ Chargement…</div>;
  if (error) return <div style={{ ...S.empty, color: "#fca5a5" }}>⚠ {error}</div>;
  if (!data?.dossier) return <div style={S.empty}>Dossier introuvable</div>;

  const d = data.dossier;
  const summary = data.summary;
  const timeline = data.timeline;
  const payload = d.payload || {};
  const brief = payload.brief || {};
  const quote = brief.quoteSnapshot || {};

  return (
    <div style={S.root}>
      <button onClick={() => navigate("/cc/archive")} style={{ background: "transparent", color: "#22d3ee", border: 0, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>
        ← Retour à l'archive
      </button>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>{d.title || `Dossier ${d.id.slice(0, 12)}…`}</h1>
          <div style={S.sub}>
            Créé le {new Date(d.createdAt).toLocaleString("fr-MA")} · MAJ {new Date(d.updatedAt).toLocaleString("fr-MA")}
          </div>
          <div style={S.pillRow}>
            {d.porteType && <span style={{ ...S.pill, color: PILL_FG[d.porteType], background: PILL_BG[d.porteType] }}>{d.porteType}</span>}
            {d.status && <span style={{ ...S.pill, color: "#cbd5e1", background: "#1e293b" }}>{d.status}</span>}
            {summary?.packValidation && <span style={{ ...S.pill, color: summary.packValidation === "ACTIVATED" ? "#34d399" : "#fcd34d", background: "#1a1a0a" }}>{summary.packValidation}</span>}
            {summary?.visaCroa && summary.visaCroa !== "NON_DEMANDE" && <span style={{ ...S.pill, color: "#a78bfa", background: "rgba(167,139,250,0.15)" }}>Visa {summary.visaCroa}</span>}
            {summary?.antiDesintFlagsCount > 0 && <span style={{ ...S.pill, color: "#fca5a5", background: "rgba(239,68,68,0.15)" }}>⚠ {summary.antiDesintFlagsCount} flags anti-désint</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#10b981", fontFamily: "'DM Mono', monospace" }}>{fmtMAD(summary?.honorairesTTC)}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>Honoraires TTC</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <a
              href={`${apiBase()}/api/cc/archive/dossier/${d.id}/export.zip?_t=${encodeURIComponent(getToken() || "")}`}
              title="Télécharge TOUT le dossier (manifeste + tous les fichiers) en un ZIP autonome — à sauvegarder sur disque / Drive"
              style={{ padding: "6px 12px", background: "#0e7490", color: "#fff", border: 0, borderRadius: 4, fontSize: 11, cursor: "pointer", textDecoration: "none" }}
            >
              💾 Export ZIP complet
            </a>
            <button onClick={() => navigate(`/cc/dossiers/${d.id}/shadow`)} style={{ padding: "6px 12px", background: "#7c3aed", color: "#fff", border: 0, borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
              👁️ Shadow view
            </button>
          </div>
        </div>
      </div>

      <div style={S.tabs}>
        <button style={tabStyle(tab === "DATA")} onClick={() => setTab("DATA")}>📋 Données</button>
        <button style={tabStyle(tab === "DOCS")} onClick={() => setTab("DOCS")}>📂 Documents ({summary?.nbDocuments ?? 0})</button>
        <button style={tabStyle(tab === "PHASES")} onClick={() => setTab("PHASES")}>📅 Phases ({summary?.nbPhases ?? 0})</button>
        <button style={tabStyle(tab === "MESSAGES")} onClick={() => setTab("MESSAGES")}>💬 Messages ({summary?.nbMessages ?? 0})</button>
        <button style={tabStyle(tab === "PAYMENTS")} onClick={() => setTab("PAYMENTS")}>💰 Paiements</button>
        <button style={tabStyle(tab === "TIMELINE")} onClick={() => setTab("TIMELINE")}>📈 Timeline</button>
      </div>

      {tab === "DATA" && <DataTab d={d} brief={brief} quote={quote} payload={payload} />}
      {tab === "DOCS" && <DocsTab d={d} />}
      {tab === "PHASES" && <PhasesTab d={d} />}
      {tab === "MESSAGES" && <MessagesTab d={d} />}
      {tab === "PAYMENTS" && <PaymentsTab d={d} payload={payload} />}
      {tab === "TIMELINE" && <TimelineTab events={timeline ?? []} />}
    </div>
  );
}

// ─── DATA TAB ────────────────────────────────────────────────────────
function DataTab({ d, brief, quote, payload }: any) {
  return (
    <div>
      <div style={S.card}>
        <div style={S.k}>Identité Client</div>
        <div style={S.grid3}>
          <Field k="Nom" v={d.clientNom} />
          <Field k="Téléphone" v={d.clientTel} />
          <Field k="Email" v={d.clientEmail} />
          <Field k="CIN" v={d.clientCin} />
          <Field k="Raison sociale" v={d.raisonSociale} />
          <Field k="Représentant" v={d.representant} />
          <Field k="RC" v={d.rc} />
          <Field k="ICE" v={d.ice} />
          <Field k="Adresse client" v={d.clientAdresse} />
        </div>
      </div>

      <div style={S.card}>
        <div style={S.k}>Localisation & Foncier</div>
        <div style={S.grid3}>
          <Field k="Commune" v={d.commune} />
          <Field k="Arrondissement" v={d.arrondissement} />
          <Field k="Adresse terrain" v={d.adresseTerrain || d.address} />
          <Field k="Titre foncier" v={d.parcelRef || brief.titreFoncierNum} />
          <Field k="Lotissement" v={brief.lotissement} />
          <Field k="Lambert X" v={d.lambertX} />
          <Field k="Lambert Y" v={d.lambertY} />
          <Field k="WGS84 Lat" v={d.wgs84Lat} />
          <Field k="WGS84 Lng" v={d.wgs84Lng} />
        </div>
      </div>

      <div style={S.card}>
        <div style={S.k}>Caractéristiques projet</div>
        <div style={S.grid3}>
          <Field k="Porte" v={d.porteType} />
          <Field k="Sous-type P2" v={d.sousTypeP2} />
          <Field k="Mode gestion" v={d.gestionMode} />
          <Field k="Pack sélectionné" v={d.packSelected || brief.packLabel || brief.categoryLabel || brief.reportLabel} />
          <Field k="Catégorie CNOA" v={brief.categoryLabel} />
          <Field k="Niveau construction" v={d.constructionLevel} />
          <Field k="Type projet" v={d.projectType} />
          <Field k="Nature projet" v={d.natureProjet} />
          <Field k="Usage bien" v={d.usageBien} />
          <Field k="Surface terrain" v={d.surfaceTerrain ? `${d.surfaceTerrain} m²` : null} />
          <Field k="Surface plancher" v={d.surfacePlancher ? `${d.surfacePlancher} m²` : (brief.surfacePlancherM2 ? `${brief.surfacePlancherM2} m²` : null)} />
          <Field k="Nombre niveaux" v={d.nbNiveaux} />
          <Field k="Nombre logements" v={d.nbLogements} />
          <Field k="Nombre bâtiments" v={brief.nbBatiments} />
          <Field k="Budget estimé" v={d.budgetEstime ? fmtMAD(d.budgetEstime) : null} />
        </div>
      </div>

      {quote && Object.keys(quote).length > 0 && (
        <div style={S.card}>
          <div style={S.k}>Devis (snapshot jour 1)</div>
          <div style={S.grid3}>
            <Field k="Coût travaux estimé" v={quote.base?.coutTravauxEstime ? fmtMAD(quote.base.coutTravauxEstime) : null} />
            <Field k="Coût réalisation" v={quote.base?.coutRealisation ? fmtMAD(quote.base.coutRealisation) : null} />
            <Field k="Honoraires HT" v={quote.honoraires?.totalHT ? fmtMAD(quote.honoraires.totalHT) : (quote.amounts?.totalHT ? fmtMAD(quote.amounts.totalHT) : null)} />
            <Field k="TVA" v={quote.honoraires?.tva ? fmtMAD(quote.honoraires.tva) : (quote.amounts?.tva ? fmtMAD(quote.amounts.tva) : null)} />
            <Field k="TTC" v={quote.honoraires?.totalTTC ? fmtMAD(quote.honoraires.totalTTC) : (quote.amounts?.totalTTC ? fmtMAD(quote.amounts.totalTTC) : null)} />
            <Field k="Délai" v={quote.meta?.deliveryDays ? `${quote.meta.deliveryDays} j` : null} />
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={S.k}>Payload brut (JSON)</div>
        <pre style={S.json}>{JSON.stringify(payload, null, 2)}</pre>
      </div>
    </div>
  );
}

// ─── DOCS TAB ────────────────────────────────────────────────────────
function DocsTab({ d }: any) {
  const tk = localStorage.getItem("citurbarea.token") || "";
  const downloadBase = `${apiBase()}/p2/dossier/${d.id}`;
  const baseDocs = (d.documents || []).map((doc: any) => ({
    id: doc.id, name: doc.originalName, type: doc.docType, size: doc.sizeBytes,
    url: `${downloadBase}/documents/${doc.id}/download?_t=${encodeURIComponent(tk)}`,
    uploadedAt: doc.uploadedAt,
    source: "BASE",
  }));
  const spDocs = (d.sousPhases || []).flatMap((sp: any) =>
    (sp.documents || []).map((doc: any) => ({
      id: doc.id, name: doc.nom, type: sp.label || sp.titre || sp.id.slice(0, 6),
      size: doc.fileSize,
      url: `${downloadBase}/sous-phases/${sp.id}/documents/${doc.id}/download?_t=${encodeURIComponent(tk)}`,
      uploadedAt: doc.createdAt,
      source: `SP-${sp.numero}`,
    }))
  );
  const all = [...baseDocs, ...spDocs];

  if (all.length === 0) return <div style={S.empty}>Aucun document</div>;

  return (
    <div>
      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ background: "#0a0f1a" }}>
            <tr>
              {["Source", "Nom", "Type", "Taille", "Date upload", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#4a5568", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: "1px solid #1e2330" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {all.map((doc, i) => (
              <tr key={`${doc.source}-${doc.id}`} style={{ background: i % 2 === 0 ? "transparent" : "rgba(30,35,48,0.3)" }}>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e", fontSize: 11, color: "#94a3b8" }}>{doc.source}</td>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e", color: "#e8eaf0", fontWeight: 600 }}>{doc.name}</td>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e", color: "#cbd5e1", fontSize: 11 }}>{doc.type}</td>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e", color: "#9ca3af", fontSize: 11 }}>{doc.size ? `${Math.round(doc.size / 1024)} Ko` : "—"}</td>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e", color: "#6b7280", fontSize: 11 }}>{new Date(doc.uploadedAt).toLocaleDateString("fr-MA")}</td>
                <td style={{ padding: "10px 14px", borderBottom: "1px solid #1a1f2e" }}>
                  <a href={doc.url} target="_blank" rel="noopener" style={{ color: "#22d3ee", fontSize: 11, textDecoration: "none" }}>📥 Télécharger</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PHASES TAB ──────────────────────────────────────────────────────
function PhasesTab({ d }: any) {
  const phases = d.phaseRecords || [];
  const sps = d.sousPhases || [];
  if (phases.length === 0 && sps.length === 0) return <div style={S.empty}>Aucune phase enregistrée</div>;
  return (
    <div>
      {phases.length > 0 && (
        <div style={S.card}>
          <div style={S.k}>Phases majeures ({phases.length})</div>
          {phases.map((p: any) => (
            <div key={p.id} style={{ borderBottom: "1px solid #1a1f2e", padding: "10px 0" }}>
              <div style={{ fontWeight: 600 }}>{p.phase}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                {p.statut} · {p.dateDebut ? `Début ${new Date(p.dateDebut).toLocaleDateString("fr-MA")}` : ""}
                {p.dateFin ? ` · Fin ${new Date(p.dateFin).toLocaleDateString("fr-MA")}` : ""}
              </div>
              {p.note && <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>{p.note}</div>}
            </div>
          ))}
        </div>
      )}
      {sps.length > 0 && (
        <div style={S.card}>
          <div style={S.k}>Sous-phases ({sps.length})</div>
          {sps.map((sp: any) => (
            <div key={sp.id} style={{ borderBottom: "1px solid #1a1f2e", padding: "10px 0" }}>
              <div style={{ fontWeight: 600 }}>#{sp.numero} {sp.label || sp.titre || "—"}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                {sp.statut} · {sp.type} · {sp.documents?.length || 0} document{(sp.documents?.length || 0) > 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MESSAGES TAB ────────────────────────────────────────────────────
function MessagesTab({ d }: any) {
  const messages = [...(d.messages || []), ...(d.phaseChats || [])].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  if (messages.length === 0) return <div style={S.empty}>Aucun message</div>;
  return (
    <div style={S.card}>
      {messages.map((m: any) => (
        <div key={m.id} style={{ padding: "10px 0", borderBottom: "1px solid #1a1f2e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 11 }}>{m.expediteurRole} · {m.expediteurNom || m.expediteurId}</span>
            <span style={{ color: "#6b7280", fontSize: 10 }}>{new Date(m.createdAt).toLocaleString("fr-MA")}</span>
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 12, whiteSpace: "pre-wrap" }}>{m.contenu}</div>
        </div>
      ))}
    </div>
  );
}

// ─── PAYMENTS TAB ────────────────────────────────────────────────────
function PaymentsTab({ d, payload }: any) {
  const payments = d.payments || [];
  const pv = payload.packValidation;
  return (
    <div>
      <div style={S.card}>
        <div style={S.k}>État pack validation (Tome 1)</div>
        {pv ? (
          <>
            <div style={S.grid3}>
              <Field k="Status" v={pv.status} />
              <Field k="Payé le" v={pv.paidAt ? new Date(pv.paidAt).toLocaleString("fr-MA") : null} />
              <Field k="Montant" v={pv.paymentAmount ? fmtMAD(pv.paymentAmount) : null} />
              <Field k="Devise" v={pv.paymentCurrency} />
              <Field k="Référence paiement" v={pv.paymentRef} />
              <Field k="Validé le" v={pv.validatedAt ? new Date(pv.validatedAt).toLocaleString("fr-MA") : null} />
              <Field k="Validé par" v={pv.validatedBy} />
              <Field k="Note validation" v={pv.validationNote} />
            </div>
            {pv.history && pv.history.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...S.k, marginBottom: 6 }}>Historique</div>
                {pv.history.map((h: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: "#9ca3af", padding: "4px 0", borderBottom: "1px solid #1a1f2e" }}>
                    <span style={{ color: "#22d3ee" }}>● {h.status}</span>{" "}
                    <span style={{ color: "#6b7280" }}>{new Date(h.ts).toLocaleString("fr-MA")} · {h.author}</span>
                    {h.note && <div style={{ color: "#cbd5e1", marginTop: 2 }}>{h.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={S.empty}>Pas encore de paiement enregistré</div>
        )}
      </div>

      {payments.length > 0 && (
        <div style={S.card}>
          <div style={S.k}>Payment rows ({payments.length})</div>
          <pre style={S.json}>{JSON.stringify(payments, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── TIMELINE TAB ────────────────────────────────────────────────────
function TimelineTab({ events }: { events: any[] }) {
  if (events.length === 0) return <div style={S.empty}>Aucun événement</div>;
  return (
    <div style={S.card}>
      {events.map((e, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #1a1f2e", fontSize: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ color: "#6b7280", fontSize: 10, fontFamily: "'DM Mono', monospace", minWidth: 130 }}>
              {new Date(e.ts).toLocaleString("fr-MA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: "#22d3ee", fontWeight: 600, minWidth: 110 }}>{e.type}</span>
            <span style={{ color: "#cbd5e1", flex: 1 }}>{e.label}</span>
          </div>
          {e.meta && Object.keys(e.meta).length > 0 && (
            <div style={{ paddingLeft: 142, fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
              {Object.entries(e.meta).map(([k, v]: any) => `${k}: ${typeof v === "string" ? v.slice(0, 100) : v}`).join(" · ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Field helper ────────────────────────────────────────────────────
function Field({ k, v }: { k: string; v: any }) {
  if (v == null || v === "") return null;
  return (
    <div>
      <div style={S.k}>{k}</div>
      <div style={S.v}>{String(v)}</div>
    </div>
  );
}
