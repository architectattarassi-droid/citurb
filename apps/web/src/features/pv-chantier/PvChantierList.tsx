/**
 * PvChantierList — liste responsive mobile-first des PV d'un dossier.
 *
 * Cards : date · type · nb observations · status · couleur sévérité max.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PvChantierListItem,
  STATUS_COLOR,
  SEVERITE_COLOR,
  TYPE_VISITE_LABEL,
  pvChantierApi,
} from "./pv-chantier.api";

type Props = {
  dossierId: string;
  /** Base de route où sont mountés les éditeurs/viewers ; défaut /pv-chantier. */
  baseRoute?: string;
};

const S = {
  wrap: { padding: 12, maxWidth: 980, margin: "0 auto" },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap" as const,
  },
  title: { margin: 0, color: "#0f172a", fontSize: 22, fontWeight: 800 },
  sub: { margin: 0, color: "#64748b", fontSize: 13 },
  cta: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none" as const,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderLeftWidth: 5,
    borderRadius: 10,
    padding: 14,
    textDecoration: "none" as const,
    color: "#0f172a",
    display: "block",
    transition: "transform 120ms ease, box-shadow 120ms ease",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  } as React.CSSProperties,
  cardTop: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 8,
  },
  numero: { fontSize: 13, color: "#64748b", fontWeight: 600, letterSpacing: 0.5 },
  date: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2 },
  type: { fontSize: 12, color: "#475569", marginTop: 2 },
  rowMeta: {
    display: "flex" as const,
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap" as const,
  },
  pill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: 0.3,
  },
  obsCount: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
  },
  empty: {
    textAlign: "center" as const,
    padding: "40px 12px",
    color: "#64748b",
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
  },
};

const SEVERITE_BORDER: Record<string, string> = {
  INFO: "#38bdf8",
  AVIS: "#facc15",
  RESERVE: "#fb923c",
  BLOQUANT: "#ef4444",
};

export default function PvChantierList({ dossierId, baseRoute = "/pv-chantier" }: Props) {
  const [items, setItems] = useState<PvChantierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    pvChantierApi
      .list(dossierId)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setErr(null);
      })
      .catch((e: any) => alive && setErr(e?.message || "Erreur"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dossierId]);

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <h1 style={S.title}>PV de chantier</h1>
          <p style={S.sub}>{items.length} PV pour ce dossier</p>
        </div>
        <Link to={`${baseRoute}/dossier/${dossierId}/new`} style={S.cta}>
          + Nouveau PV
        </Link>
      </header>

      {err && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}

      {loading ? (
        <div style={S.empty}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={S.empty}>
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
            Aucun PV pour ce dossier.
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>
            Créez le premier PV de visite pour commencer.
          </p>
        </div>
      ) : (
        <div style={S.grid}>
          {items.map((it) => {
            const sev = it.severiteMax;
            const status = STATUS_COLOR[it.status];
            const borderColor = sev ? SEVERITE_BORDER[sev] : "#cbd5e1";
            return (
              <Link
                key={it.id}
                to={`${baseRoute}/${it.id}`}
                style={{ ...S.card, borderLeftColor: borderColor }}
              >
                <div style={S.cardTop}>
                  <div>
                    <div style={S.numero}>N° {it.numero}</div>
                    <div style={S.date}>{formatDate(it.date)}</div>
                    <div style={S.type}>{TYPE_VISITE_LABEL[it.typeVisite]}</div>
                  </div>
                  <span
                    style={{
                      ...S.pill,
                      background: status.bg,
                      color: status.fg,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <div style={S.rowMeta}>
                  <span style={S.obsCount}>
                    {it.observationsCount} observation
                    {it.observationsCount > 1 ? "s" : ""}
                  </span>
                  {sev && (
                    <span
                      style={{
                        ...S.pill,
                        background: SEVERITE_COLOR[sev].bg,
                        color: SEVERITE_COLOR[sev].fg,
                      }}
                    >
                      Max : {SEVERITE_COLOR[sev].label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-MA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
