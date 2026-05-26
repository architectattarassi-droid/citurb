import React from "react";
import { useIsMobile } from "./useBreakpoint";

/**
 * ResponsiveTable — bascule auto table HTML (desktop) → cards verticales (mobile).
 *
 * - Desktop (> 768 px) : rend un <table> classique avec thead/tbody.
 * - Mobile (≤ 768 px) : rend une stack de <div> "cards", chaque ligne devenant
 *   une carte avec label/valeur en colonne.
 *
 * Les cellules sont rendues via `column.render(row)` si fourni, sinon par
 * `row[column.key]` (string fallback). On reste agnostique sur le typage des
 * lignes (générique). Le tap sur une card peut être interactif via `onRowClick`.
 */

export interface ResponsiveTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** Largeur fixe en desktop (px ou %). */
  width?: number | string;
  /** Cacher cette colonne sur mobile (utile pour ID techniques). */
  hideOnMobile?: boolean;
  /** Sur mobile, cette colonne devient le titre principal de la card. */
  isPrimary?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  /** Champ unique pour la key React (ex: "id"). */
  rowKey: keyof T | string;
  /** Tap sur une ligne / card. */
  onRowClick?: (row: T) => void;
  /** Texte affiché si data vide. */
  emptyLabel?: string;
  /** Style supplémentaire root. */
  style?: React.CSSProperties;
}

function getValue<T>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[key as string];
}

function renderCell<T>(row: T, col: ResponsiveTableColumn<T>): React.ReactNode {
  if (col.render) return col.render(row);
  const v = getValue(row, col.key);
  if (v == null) return "—";
  return String(v);
}

export function ResponsiveTable<T>(props: ResponsiveTableProps<T>): React.ReactElement {
  const { columns, data, rowKey, onRowClick, emptyLabel = "Aucun élément.", style } = props;
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13, ...style }}>
        {emptyLabel}
      </div>
    );
  }

  // ── MOBILE : stack de cards ─────────────────────────────────
  if (isMobile) {
    const visibleCols = columns.filter((c) => !c.hideOnMobile);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, ...style }}>
        {data.map((row) => {
          const id = String(getValue(row, rowKey));
          const primary = visibleCols.find((c) => c.isPrimary);
          const rest = visibleCols.filter((c) => c !== primary);
          return (
            <div
              key={id}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 14,
                cursor: onRowClick ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 44,
              }}
            >
              {primary && (
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                  {renderCell(row, primary)}
                </div>
              )}
              {rest.map((col) => (
                <div
                  key={String(col.key)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    paddingTop: 4,
                    borderTop: "1px dashed #f1f5f9",
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 500, flexShrink: 0 }}>
                    {col.label}
                  </span>
                  <span style={{ color: "#1e293b", textAlign: "right", minWidth: 0, wordBreak: "break-word" }}>
                    {renderCell(row, col)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ── DESKTOP : table classique ───────────────────────────────
  return (
    <div style={{ overflowX: "auto", ...style }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  width: col.width,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const id = String(getValue(row, rowKey));
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  cursor: onRowClick ? "pointer" : "default",
                }}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ResponsiveTable;
