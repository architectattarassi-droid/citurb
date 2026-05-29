/**
 * LivraisonsPage — page principale du module Livraisons Matériaux.
 * Route : /chantier/:dossierId/livraisons
 *
 * Tabs : En attente / Confirmées / Cette semaine / Reçues / Anomalies
 * + FAB "Nouvelle commande" (sticky bottom mobile-first)
 * + Pull-to-refresh (touch native + bouton refresh)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useT } from "../../i18n/i18n";
import {
  Commande,
  CommandeStatus,
  currentIsoWeek,
  livraisonsApi,
} from "./livraisons-materiaux.api";
import CommandeCard from "./CommandeCard";
import CommandeForm from "./CommandeForm";
import LivraisonsCalendar from "./LivraisonsCalendar";
import ReceptionLivraisonModal from "./ReceptionLivraisonModal";

type TabKey = "PENDING" | "CONFIRMED" | "WEEK" | "RECEIVED" | "ANOMALIES";

const TABS: Array<{ key: TabKey; labelKey: string }> = [
  { key: "PENDING", labelKey: "liv.tab.pending" },
  { key: "CONFIRMED", labelKey: "liv.tab.confirmed" },
  { key: "WEEK", labelKey: "liv.tab.week" },
  { key: "RECEIVED", labelKey: "liv.tab.received" },
  { key: "ANOMALIES", labelKey: "liv.tab.anomalies" },
];

const S = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "12px 12px 100px" },
  header: { display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 14, flexWrap: "wrap" as const, gap: 8 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 },
  sub: { fontSize: 13, color: "#64748b", margin: 0 },
  tabs: {
    display: "flex" as const,
    gap: 6,
    overflowX: "auto" as const,
    paddingBottom: 4,
    marginBottom: 14,
    borderBottom: "1px solid #e2e8f0",
  },
  tab: {
    background: "transparent",
    border: 0,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b",
    cursor: "pointer",
    borderBottom: "3px solid transparent",
    whiteSpace: "nowrap" as const,
    minHeight: 44,
  } as React.CSSProperties,
  tabActive: { color: "#0f172a", borderBottomColor: "#0f172a" } as React.CSSProperties,
  empty: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    padding: 24,
    textAlign: "center" as const,
    color: "#64748b",
    fontSize: 14,
  },
  fab: {
    position: "fixed" as const,
    bottom: 16,
    right: 16,
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 999,
    padding: "14px 22px",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 6px 20px rgba(15,23,42,0.35)",
    cursor: "pointer",
    zIndex: 50,
    minHeight: 56,
  } as React.CSSProperties,
  refreshHint: { fontSize: 12, color: "#94a3b8", textAlign: "center" as const, padding: 6 },
  modalBackdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    zIndex: 900,
    display: "flex" as const,
    alignItems: "flex-start" as const,
    justifyContent: "center" as const,
    overflowY: "auto" as const,
    padding: 12,
  },
  modalBody: {
    background: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 720,
    marginTop: 12,
    marginBottom: 12,
  } as React.CSSProperties,
};

export default function LivraisonsPage() {
  const { dossierId } = useParams<{ dossierId: string }>();
  const t = useT();
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [items, setItems] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [receiveCmd, setReceiveCmd] = useState<Commande | null>(null);

  // Get current user role from localStorage (simplified — proper auth context in real app)
  const userRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("citurbarea.user");
      if (raw) return JSON.parse(raw).role || "";
    } catch { /* ignore */ }
    return "";
  }, []);
  const userId = useMemo(() => {
    try {
      const raw = localStorage.getItem("citurbarea.user");
      if (raw) return JSON.parse(raw).id || "";
    } catch { /* ignore */ }
    return "";
  }, []);

  const load = useCallback(async () => {
    if (!dossierId) return;
    setErr(null);
    try {
      const r = await livraisonsApi.list(dossierId);
      setItems(r.items);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dossierId]);

  useEffect(() => { void load(); }, [load]);

  // Pull-to-refresh natif (touchstart / touchmove)
  useEffect(() => {
    let startY = 0;
    let pulling = false;
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80) {
        pulling = false;
        setRefreshing(true);
        void load();
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const week = currentIsoWeek();
    switch (tab) {
      case "PENDING":
        return items.filter((c) => c.status === "REQUEST");
      case "CONFIRMED":
        return items.filter((c) => c.status === "CONFIRMED" || c.status === "EN_ROUTE");
      case "RECEIVED":
        return items.filter((c) => c.status === "RECEIVED");
      case "ANOMALIES":
        return items.filter((c) => c.status === "DISPUTED" || c.anomalies.length > 0);
      case "WEEK": {
        return items.filter((c) => {
          if (!c.dateLivraisonSouhaitee) return false;
          try {
            const d = new Date(c.dateLivraisonSouhaitee);
            const k = iso(d);
            return k === week;
          } catch { return false; }
        });
      }
    }
    return items;
  }, [items, tab]);

  function isUserSupplier(c: Commande): boolean {
    return !!userId && c.supplierUserId === userId;
  }
  function roleFor(c: Commande): "chef" | "supplier" | "admin" | "viewer" {
    if (userRole === "ADMIN" || userRole === "OWNER" || userRole === "OPS") return "admin";
    if (isUserSupplier(c)) return "supplier";
    return "chef"; // par défaut, client = chef chantier (owner)
  }

  async function handleConfirm(c: Commande) {
    if (!dossierId) return;
    try {
      await livraisonsApi.confirmSupplier(c.id, dossierId);
      await load();
    } catch (e: any) { alert(e?.message || "Échec"); }
  }
  async function handleReject(c: Commande) {
    if (!dossierId) return;
    const motif = window.prompt("Motif du refus ?", "");
    if (!motif) return;
    try {
      await livraisonsApi.rejectSupplier(c.id, dossierId, motif);
      await load();
    } catch (e: any) { alert(e?.message || "Échec"); }
  }
  async function handlePrete(c: Commande) {
    if (!dossierId) return;
    try {
      await livraisonsApi.livraisonPrete(c.id, dossierId);
      await load();
    } catch (e: any) { alert(e?.message || "Échec"); }
  }

  async function handleShowAudit(c: Commande) {
    if (!dossierId) return;
    try {
      const a = await livraisonsApi.audit(dossierId, c.id);
      alert(JSON.stringify(a, null, 2));
    } catch (e: any) { alert(e?.message || "Échec"); }
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>{t("liv.title")}</h1>
          <p style={S.sub}>Dossier {dossierId}</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); void load(); }}
          style={{
            background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1",
            borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer",
            minHeight: 40,
          }}
        >
          {refreshing ? `${t("liv.refresh")}…` : t("liv.refresh")}
        </button>
      </div>

      <div style={S.tabs} role="tablist">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            style={{ ...S.tab, ...(tab === tb.key ? S.tabActive : {}) }}
            onClick={() => setTab(tb.key)}
            role="tab"
            aria-selected={tab === tb.key}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {refreshing && <div style={S.refreshHint}>Mise à jour…</div>}
      {loading && <div style={S.empty}>Chargement…</div>}
      {err && <div style={{ ...S.empty, color: "#991b1b" }}>{err}</div>}

      {!loading && tab === "WEEK" && dossierId && (
        <div style={{ marginBottom: 14 }}>
          <LivraisonsCalendar dossierId={dossierId} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={S.empty}>
          {t("liv.empty")}
        </div>
      )}

      {filtered.map((c) => (
        <CommandeCard
          key={c.id}
          commande={c}
          role={roleFor(c)}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onMarkPrete={handlePrete}
          onReceive={(cmd) => setReceiveCmd(cmd)}
          onShowAudit={handleShowAudit}
        />
      ))}

      <button style={S.fab} onClick={() => setShowForm(true)} aria-label={t("liv.new_command")}>
        + {t("liv.new_command")}
      </button>

      {showForm && dossierId && (
        <div style={S.modalBackdrop} onClick={() => setShowForm(false)}>
          <div style={S.modalBody} onClick={(e) => e.stopPropagation()}>
            <CommandeForm
              dossierId={dossierId}
              onCreated={() => { setShowForm(false); void load(); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {receiveCmd && (
        <ReceptionLivraisonModal
          commande={receiveCmd}
          open={!!receiveCmd}
          onClose={() => setReceiveCmd(null)}
          onReceived={() => { setReceiveCmd(null); void load(); }}
        />
      )}
    </div>
  );
}

function iso(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((+t - +ys) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-${String(w).padStart(2, "0")}`;
}
