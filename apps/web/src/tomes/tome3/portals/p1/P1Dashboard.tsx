import React, { useState, useEffect } from "react";
import type {
  Dossier, ChantierJalon, ProductionSubPhase,
} from "./dossier.store";
import {
  advanceTo, markDocumentUploaded, areRequiredDocsUploaded,
  markJalon, setProductionPhase, setAutorisationStatus,
} from "./dossier.store";
import { getToken, apiBase } from "../../../tome4/apiClient";

import AgentChatPanel from "./components/AgentChatPanel";
import RokhasClientPortal from "../../../../tomes/tome2/RokhasClientPortal";

// ── Helpers ───────────────────────────────────────────────────────────────
const PHASE_ORDER = [
  "E3_DOCUMENTS","E6_PAYMENT","E7_ACTIVE",
  "E8_PRODUCTION","E9_AUTORISATION","E10_CHANTIER",
  "E11_VALIDATION","E12_CLOTURE",
];

const PHASE_LABELS: Record<string, string> = {
  E3_DOCUMENTS:    "Vérification documents",
  E6_PAYMENT:      "Paiement & activation",
  E7_ACTIVE:       "Dossier actif",
  E8_PRODUCTION:   "Production plans",
  E9_AUTORISATION: "Autorisation",
  E10_CHANTIER:    "Suivi chantier",
  E11_VALIDATION:  "Validation",
  E12_CLOTURE:     "Clôture & archivage",
  EC_GEL:          "⚠️ Dossier gelé",
};

const PHASE_ICONS: Record<string, string> = {
  E3_DOCUMENTS: "📋", E6_PAYMENT: "💳", E7_ACTIVE: "📁",
  E8_PRODUCTION: "📐", E9_AUTORISATION: "🏛️", E10_CHANTIER: "🏗️",
  E11_VALIDATION: "✅", E12_CLOTURE: "🔒", EC_GEL: "❄️",
};

const PROD_SUB_LABELS: Record<ProductionSubPhase, string> = {
  E8_1_ESQUISSE: "Esquisse",
  E8_2_APS:      "APS — Avant-Projet Sommaire",
  E8_3_APD:      "APD — Avant-Projet Détaillé",
  E8_4_AUTO:     "Plans autorisables",
};

const JALON_LABELS: Record<ChantierJalon, string> = {
  FONDATIONS: "Fondations", DALLE_RDC: "Dalle RDC",
  DALLE_ETG: "Dalle étage", TOITURE: "Toiture", FINITIONS: "Finitions",
};

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const S = {
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 16 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 8, display: "block" as const },
  btn: (active = true, danger = false): React.CSSProperties => ({
    padding: "9px 20px", borderRadius: 10, border: "none", cursor: active ? "pointer" : "default",
    background: danger ? "#dc2626" : active ? "#1e3a8a" : "#e2e8f0",
    color: active ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 13, transition: "opacity .15s",
  }),
};

// ── Sub-sections ──────────────────────────────────────────────────────────

function TimelineBar({ dossier }: { dossier: Dossier }) {
  const idx = PHASE_ORDER.indexOf(dossier.phase);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4, marginBottom: 24 }}>
      {PHASE_ORDER.map((ph, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const locked  = i > idx;
        return (
          <React.Fragment key={ph}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 64 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#16a34a" : active ? "#1e3a8a" : "#f1f5f9",
                border: `2px solid ${done ? "#16a34a" : active ? "#1e3a8a" : "#e2e8f0"}`,
                fontSize: 14, color: done || active ? "#fff" : "#94a3b8",
                flexShrink: 0,
              }}>
                {done ? "✓" : PHASE_ICONS[ph]}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: active ? "#1e3a8a" : locked ? "#cbd5e1" : "#64748b", marginTop: 4, textAlign: "center", maxWidth: 56, lineHeight: 1.2 }}>
                {PHASE_LABELS[ph].split(" ")[0]}
              </div>
            </div>
            {i < PHASE_ORDER.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? "#16a34a" : "#e2e8f0", minWidth: 16 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function DocsSection({ dossier, onChange, dossierId }: { dossier: Dossier; onChange: (d: Dossier) => void; dossierId?: string }) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const allDone = areRequiredDocsUploaded(dossier);

  const handleFileUpload = async (docId: string, file: File) => {
    setUploading(s => ({ ...s, [docId]: true }));
    try {
      if (dossierId) {
        const fd = new FormData();
        fd.append("file", file);
        const token = getToken();
        const res = await fetch(
          `${apiBase()}/p2/dossier/${dossierId}/documents?docType=${encodeURIComponent(docId)}`,
          { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd }
        );
        if (!res.ok) throw new Error("upload failed");
      }
      onChange(markDocumentUploaded(dossier, docId, file.name));
    } catch { /* silencieux — state local mis à jour quand même */ } finally {
      setUploading(s => ({ ...s, [docId]: false }));
    }
  };

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>📋 Vérification documentaire (E3)</h3>
        {allDone && <span style={{ padding: "3px 12px", borderRadius: 99, background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 800 }}>Complété ✓</span>}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
        Chargez les documents requis. Le contrat architecte est généré automatiquement (template). La checklist est vérifiée avant activation du dossier.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dossier.documents.map(doc => (
          <div key={doc.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
            borderRadius: 10, border: `1px solid ${doc.uploaded ? "#bbf7d0" : doc.required ? "#e2e8f0" : "#f1f5f9"}`,
            background: doc.uploaded ? "#f0fdf4" : "#fff",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: doc.uploaded ? "#dcfce7" : doc.required ? "#fef9c3" : "#f8fafc",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>
              {doc.uploaded ? "✅" : doc.required ? "📌" : "📎"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                {doc.label}
                {doc.required && <span style={{ marginLeft: 6, fontSize: 10, color: "#dc2626", fontWeight: 800 }}>REQUIS</span>}
              </div>
              {doc.uploaded && doc.fileName && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {doc.fileName} — {fmtDate(doc.uploadedAt)}
                </div>
              )}
            </div>
            {!doc.uploaded ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {doc.id === "doc_contrat" ? (
                  <button
                    onClick={() => {
                      const name = `contrat_archi_${dossier.id}.pdf`;
                      onChange(markDocumentUploaded(dossier, doc.id, name));
                    }}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                  >
                    Générer
                  </button>
                ) : (
                  <>
                    <input
                      type="file"
                      id={`upload-${doc.id}`}
                      style={{ display: "none" }}
                      disabled={uploading[doc.id]}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(doc.id, file);
                        e.target.value = "";
                      }}
                    />
                    <label
                      htmlFor={`upload-${doc.id}`}
                      style={{ padding: "6px 14px", borderRadius: 8, background: uploading[doc.id] ? "#94a3b8" : "#1e3a8a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: uploading[doc.id] ? "wait" : "pointer", userSelect: "none" }}
                    >
                      {uploading[doc.id] ? "…" : "Charger"}
                    </label>
                  </>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>Reçu ✓</span>
            )}
          </div>
        ))}
      </div>

      {allDone && dossier.phase === "E3_DOCUMENTS" && (
        <button
          onClick={() => onChange(advanceTo(dossier, "E6_PAYMENT", "Tous les documents requis reçus — passage au paiement"))}
          style={{ ...S.btn(), marginTop: 20, width: "100%" }}
        >
          Tous les documents fournis — Continuer vers le paiement →
        </button>
      )}
    </div>
  );
}

function PaymentSection({ dossier, onChange, dossierId }: { dossier: Dossier; onChange: (d: Dossier) => void; dossierId?: string }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div style={S.card}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>💳 Paiement & activation dossier (E6)</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ padding: "3px 10px", borderRadius: 99, background: confirmed ? "#dcfce7" : "#fff7ed", color: confirmed ? "#16a34a" : "#c2410c", fontSize: 11, fontWeight: 900 }}>
          {confirmed ? "Paiement : confirmé" : "Paiement : en attente"}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
          Tant que le paiement est en attente, le dossier reste inactif.
        </span>
      </div>

      <div style={{ padding: "16px 20px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>Doctrine P1-E6 — Paiement = déclencheur</div>
        <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
          Le paiement est le seul événement qui active le dossier. Aucun travail ne commence avant règlement complet.
          En production, le module CMI / Stripe prend le relais ici.
        </div>
      </div>

      <div style={{ padding: "16px 20px", borderRadius: 12, border: "2px solid #1e3a8a", marginBottom: 20, background: "#f8faff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8 }}>Pack commandé</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{dossier.offerTitle}</div>
        <div style={{ fontSize: 13, color: "#475569" }}>Projet : {dossier.qualification.projectType} — {dossier.qualification.city} — {dossier.qualification.surface} m²</div>
      </div>

      <label style={{
        display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
        padding: 16, borderRadius: 10, border: `2px solid ${confirmed ? "#1e3a8a" : "#e2e8f0"}`,
        background: confirmed ? "#eff6ff" : "#fff", marginBottom: 16,
      }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 2, accentColor: "#1e3a8a", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", lineHeight: 1.5 }}>
          Je confirme le paiement et l'activation du dossier. Je comprends que les honoraires sont non-remboursables une fois la mission lancée.
        </span>
      </label>

      <button
        disabled={!confirmed}
        onClick={() => {
          if (dossierId) {
            const token = getToken();
            fetch(`${apiBase()}/p2/dossier/${dossierId}/disclaimer`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            }).catch(() => {});
          }
          onChange(advanceTo(dossier, "E7_ACTIVE", "Paiement confirmé — dossier activé (E7)"));
        }}
        style={S.btn(confirmed)}
      >
        Activer le dossier →
      </button>
      <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        Module de paiement en ligne activé en production (CMI / Stripe). Mode démo : activation directe.
      </div>
    </div>
  );
}

function ProductionSection({ dossier, onChange }: { dossier: Dossier; onChange: (d: Dossier) => void }) {
  const subs: ProductionSubPhase[] = ["E8_1_ESQUISSE", "E8_2_APS", "E8_3_APD", "E8_4_AUTO"];
  const currentIdx = subs.indexOf(dossier.productionSubPhase ?? "E8_1_ESQUISSE");

  return (
    <div style={S.card}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>📐 Production des plans (E8)</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {subs.map((sub, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const locked = i > currentIdx;
          return (
            <div key={sub} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "14px 18px",
              borderRadius: 12, border: `1.5px solid ${active ? "#1e3a8a" : done ? "#bbf7d0" : "#e2e8f0"}`,
              background: active ? "#eff6ff" : done ? "#f0fdf4" : "#f8fafc",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: done ? "#dcfce7" : active ? "#1e3a8a" : "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: done ? "#16a34a" : active ? "#fff" : "#94a3b8",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: locked ? "#94a3b8" : "#0f172a" }}>
                  {PROD_SUB_LABELS[sub]}
                </div>
                {active && <div style={{ fontSize: 12, color: "#1e3a8a", marginTop: 2 }}>En cours</div>}
                {done && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>Validé ✓</div>}
              </div>
              {active && i < subs.length - 1 && (
                <button
                  onClick={() => onChange(setProductionPhase(dossier, subs[i + 1]))}
                  style={{ ...S.btn(), padding: "7px 14px", fontSize: 12 }}
                >
                  Valider →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {dossier.productionSubPhase === "E8_4_AUTO" && (
        <button
          onClick={() => onChange(advanceTo(dossier, "E9_AUTORISATION", "Plans autorisables produits — passage dépôt autorisation"))}
          style={{ ...S.btn(), width: "100%" }}
        >
          Plans autorisables prêts — Passer au dépôt →
        </button>
      )}
    </div>
  );
}

function AutorisationSection({ dossier, onChange, dossierId }: { dossier: Dossier; onChange: (d: Dossier) => void; dossierId?: string }) {
  const [note, setNote] = useState("");
  const cycle = dossier.autorisationCycle;
  const status = dossier.autorisationStatus;

  return (
    <div style={S.card}>
      {dossierId && <RokhasClientPortal dossierId={dossierId} mode="client" />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>🏛️ Autorisation (E9)</h3>
        <span style={{ padding: "3px 12px", borderRadius: 99, background: "#eff6ff", color: "#1e3a8a", fontSize: 12, fontWeight: 700 }}>
          Cycle C{cycle}
        </span>
      </div>

      {cycle >= 3 && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
          ⚠️ C3 atteint — Escalade MOA requise. Contactez CITURBAREA pour avenant.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { val: "deposited",  label: "Dossier déposé",     icon: "📬", color: "#0891b2" },
          { val: "commission", label: "En commission",       icon: "⏳", color: "#d97706" },
          { val: "favorable",  label: "Avis favorable",      icon: "✅", color: "#16a34a" },
          { val: "defavorable",label: "Avis défavorable",    icon: "❌", color: "#dc2626" },
        ].map(s => (
          <button
            key={s.val}
            onClick={() => onChange(setAutorisationStatus(dossier, s.val as Dossier["autorisationStatus"], note || undefined))}
            style={{
              padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
              border: `2px solid ${status === s.val ? s.color : "#e2e8f0"}`,
              background: status === s.val ? `${s.color}18` : "#fff",
              color: status === s.val ? s.color : "#475569",
              textAlign: "left" as const,
            }}
          >
            <span style={{ marginRight: 8 }}>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      <input
        value={note} onChange={e => setNote(e.target.value)}
        placeholder="Note / remarques commission (optionnel)…"
        style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" as const }}
      />

      {status === "favorable" && (
        <button
          onClick={() => onChange(setAutorisationStatus(dossier, "signed", "Autorisation signée et archivée"))}
          style={{ ...S.btn(), background: "#16a34a", width: "100%", marginBottom: 10 }}
        >
          Marquer autorisation signée →
        </button>
      )}

      {status === "signed" && (
        <button
          onClick={() => onChange(advanceTo(dossier, "E10_CHANTIER", "Autorisation signée — ouverture chantier"))}
          style={{ ...S.btn(), width: "100%" }}
        >
          Autorisation signée — Ouvrir le chantier →
        </button>
      )}
    </div>
  );
}

function ChantierSection({ dossier, onChange }: { dossier: Dossier; onChange: (d: Dossier) => void }) {
  const [note, setNote] = useState<Record<string, string>>({});
  const jalons = Object.entries(dossier.chantierJalons) as [ChantierJalon, { done: boolean; date?: string; note?: string }][];
  const allDone = jalons.every(([, v]) => v.done);

  return (
    <div style={S.card}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>🏗️ Suivi chantier — PMS jalons (E10)</h3>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>
        Chaque jalon validé = événement probatoire horodaté. (Doctrine : mécanisme de preuve, pas assistance.)
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {jalons.map(([jalon, val]) => (
          <div key={jalon} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
            borderRadius: 12, border: `1px solid ${val.done ? "#bbf7d0" : "#e2e8f0"}`,
            background: val.done ? "#f0fdf4" : "#fff",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: val.done ? "#dcfce7" : "#f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              {val.done ? "✅" : "⬜"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{JALON_LABELS[jalon]}</div>
              {val.done && val.date && <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>{fmtDate(val.date)}{val.note ? ` — ${val.note}` : ""}</div>}
            </div>
            {!val.done && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  placeholder="Note (optionnel)"
                  value={note[jalon] || ""}
                  onChange={e => setNote(n => ({ ...n, [jalon]: e.target.value }))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 140, outline: "none" }}
                />
                <button
                  onClick={() => onChange(markJalon(dossier, jalon, note[jalon] || undefined))}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1e3a8a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Valider
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {allDone && (
        <button
          onClick={() => onChange(advanceTo(dossier, "E11_VALIDATION", "Tous les jalons chantier validés"))}
          style={{ ...S.btn(), width: "100%" }}
        >
          Tous les jalons validés — Passer à la validation finale →
        </button>
      )}
    </div>
  );
}

function LogsSection({ dossier }: { dossier: Dossier }) {
  const [open, setOpen] = useState(false);
  const logs = [...dossier.logs].reverse();
  const TYPE_COLORS = { info: "#1e3a8a", success: "#16a34a", warning: "#d97706", error: "#dc2626" };

  return (
    <div style={S.card}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, width: "100%" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#475569" }}>
          📒 Journal probatoire ({logs.length} entrées)
        </h3>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
          {logs.map(l => (
            <div key={l.id} style={{ display: "flex", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9", fontSize: 12 }}>
              <span style={{ color: TYPE_COLORS[l.type], fontWeight: 700, flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[l.type], marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: "#64748b", marginRight: 8 }}>{fmtDate(l.date)}</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>[{l.phase}]</span>
                <span style={{ color: "#475569", marginLeft: 6 }}>{l.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function P1Dashboard({ dossier: initial, onReset, dossierId }: { dossier: Dossier; onReset: () => void; dossierId?: string }) {
  const [dossier, setDossier] = useState<Dossier>(initial);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!dossierId) return;
    const token = getToken();
    fetch(`${apiBase()}/p2/dossier/${dossierId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((resp: any) => { if (resp?.dossier?.projectId) setProjectId(resp.dossier.projectId); })
      .catch(() => {});
  }, [dossierId]);

  const phase = dossier.phase;
  const apiStatus = (dossier as any).apiStatus as string | undefined;
  const isRejected = apiStatus === 'REJECTED';
  const isLocked = isRejected || apiStatus === 'IN_REVIEW';

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>
      {isLocked && (
        <div style={{
          padding: '12px 16px',
          background: isRejected ? '#fee2e2' : '#fef9c3',
          border: `1px solid ${isRejected ? '#fca5a5' : '#fde047'}`,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
          color: isRejected ? '#991b1b' : '#854d0e',
          fontWeight: 600,
        }}>
          {isRejected
            ? "❌ Votre dossier a été rejeté. Contactez votre architecte pour plus d'informations."
            : '🔍 Votre dossier est en cours de révision — les modifications sont temporairement suspendues.'}
        </div>
      )}
      {/* Header dossier */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 99, background: "#eff6ff", border: "1px solid #bfdbfe", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1e40af", letterSpacing: ".06em", textTransform: "uppercase" }}>Dossier actif · P1</span>
            </div>
            <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
              {dossier.offerTitle}
            </h1>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {dossier.qualification.projectType} — {dossier.qualification.city} — {dossier.qualification.surface} m² — {Number(dossier.qualification.budget).toLocaleString()} MAD
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>ID dossier</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", fontFamily: "monospace" }}>{dossier.id}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{fmtDate(dossier.createdAt)}</div>
          </div>
        </div>

        {/* Phase actuelle */}
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 99, background: "#0f172a", color: "#fff" }}>
          <span style={{ fontSize: 14 }}>{PHASE_ICONS[phase]}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{PHASE_LABELS[phase] || phase}</span>
        </div>
      </div>

      {/* Timeline */}
      <TimelineBar dossier={dossier} />

      {/* Canal qualifié : IA (déblocage) + WhatsApp (RDV) */}
      <div style={{ ...S.card, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Canal dossier (qualifié)</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              L’IA répond uniquement au <b>déblocage</b> du dossier. WhatsApp = prise de RDV.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="https://wa.me/212700127892"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "#16a34a",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
                fontSize: 12,
              }}
            >
              WhatsApp — Prendre RDV
            </a>
            <a
              href="tel:+212700127892"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "#0f172a",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
                fontSize: 12,
              }}
            >
              Appeler
            </a>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <AgentChatPanel dossier={dossier} onChange={setDossier} />
        </div>
      </div>

      {/* Sections selon phase */}
      {(phase === "E3_DOCUMENTS") && (
        <DocsSection dossier={dossier} onChange={setDossier} dossierId={dossierId} />
      )}
      {phase === "E6_PAYMENT" && (
        <PaymentSection dossier={dossier} dossierId={dossierId} onChange={(d) => {
          setDossier(d);
          if (d.phase === "E7_ACTIVE" && projectId) {
            const token = getToken();
            fetch(`${apiBase()}/p3/project/${projectId}/transition`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ toState: "E7_ACTIVE", action: "payment_confirmed" }),
            }).catch(() => {});
          }
        }} />
      )}
      {phase === "E7_ACTIVE" && (
        <div style={S.card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>📁 Dossier actif (E7)</h3>
          <div style={{ padding: "14px 18px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>✅ Dossier activé — Mission en cours</div>
            <div style={{ fontSize: 13, color: "#475569" }}>Canal unique ouvert. Horodatage actif. GeoID verrouillé : <strong>{dossier.qualification.city}</strong></div>
          </div>
          <button onClick={() => setDossier(setProductionPhase(dossier, "E8_1_ESQUISSE"))} style={S.btn()}>
            Démarrer la production des plans (E8) →
          </button>
        </div>
      )}
      {phase === "E8_PRODUCTION" && (
        <ProductionSection dossier={dossier} onChange={setDossier} />
      )}
      {phase === "E9_AUTORISATION" && (
        <AutorisationSection dossier={dossier} onChange={setDossier} dossierId={dossierId} />
      )}
      {phase === "E10_CHANTIER" && (
        <ChantierSection dossier={dossier} onChange={setDossier} />
      )}
      {phase === "E11_VALIDATION" && (
        <div style={S.card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>✅ Validation finale (E11)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {["PMS chantier conforme", "Contrôle qualité IA OK", "CLT client validé", "OP si régime concerné"].map((cond, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13, color: "#16a34a" }}>
                <span>✓</span><span>{cond}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setDossier(advanceTo(dossier, "E12_CLOTURE", "Toutes conditions de validation satisfaites"))} style={{ ...S.btn(), width: "100%" }}>
            Procéder à la clôture →
          </button>
        </div>
      )}
      {phase === "E12_CLOTURE" && (
        <div style={{ ...S.card, textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 900, color: "#0f172a" }}>Dossier clôturé</h3>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
            Le dossier est archivé (append-only). Responsabilité d'exécution : entreprises.
            Archive opposable disponible sur demande.
          </p>
          <div style={{ padding: "12px 18px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, color: "#64748b", marginBottom: 20, fontFamily: "monospace" }}>
            ID: {dossier.id} · Clôturé le {fmtDate(new Date().toISOString())}
          </div>
          <button onClick={onReset} style={{ ...S.btn(true, false), background: "#64748b" }}>
            Nouveau dossier P1
          </button>
        </div>
      )}
      {phase === "EC_GEL" && (
        <div style={{ ...S.card, borderColor: "#fecaca" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#dc2626" }}>❄️ Dossier gelé — EC actif</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569" }}>{dossier.ecReason || "Raison non spécifiée."}</p>
          <a href="https://wa.me/212700127892" target="_blank" rel="noopener"
            style={{ ...S.btn(), display: "inline-block", textDecoration: "none", padding: "9px 20px" }}>
            💬 Contacter CITURBAREA pour débloquer
          </a>
        </div>
      )}

      {/* Journal probatoire */}
      <LogsSection dossier={dossier} />

      {/* Reset dev */}
      <div style={{ marginTop: 8, textAlign: "center" }}>
        <button onClick={onReset} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#cbd5e1", fontFamily: "inherit" }}>
          Réinitialiser le dossier (dev)
        </button>
      </div>
    </div>
  );
}
