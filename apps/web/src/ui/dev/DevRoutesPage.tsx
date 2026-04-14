import React, { useMemo } from "react";
import { ROUTES } from "../../application/routeRegistry";
import { DEAD_CTA_HINTS, UNKNOWN_ROUTE_USAGES, UNUSED_DECLARED_ROUTES } from "../../application/routeAudit.generated";

export default function DevRoutesPage() {
  const canonPaths = useMemo(() => {
    // In B1, aliases/redirects are declared on purpose to eliminate UNKNOWN.
    // ORPHAN must be evaluated only on canon targets (redirectTo absent).
    return new Set(ROUTES.filter(r => !r.redirectTo).map(r => r.path));
  }, []);

  const orphanCanon = useMemo(() => UNUSED_DECLARED_ROUTES.filter(p => canonPaths.has(p)), [canonPaths]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>DEV — Routes Registry</h1>
      <p style={{ color: "#64748b", marginBottom: 16 }}>
        Objectif doctrine : 0 page cachée / 0 page orpheline / 0 bouton mort. En B1, les routes legacy doivent exister uniquement comme redirections.
      </p>

      {(UNKNOWN_ROUTE_USAGES.length > 0 || orphanCanon.length > 0) && (
        <div style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>⚠️ Audit automatique</div>
          {UNKNOWN_ROUTE_USAGES.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>Routes utilisées mais NON déclarées ({UNKNOWN_ROUTE_USAGES.length})</div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Ces routes existent dans le code (Link/navigate/href) mais ne sont pas dans routeRegistry.ts → pages potentiellement “cachées”.
              </div>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {UNKNOWN_ROUTE_USAGES.slice(0, 12).map((u, idx) => (
                  <li key={idx} style={{ fontSize: 12 }}>
                    <code>{u.route}</code> — {u.file}:{u.line}
                  </li>
                ))}
              </ul>
              {UNKNOWN_ROUTE_USAGES.length > 12 && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>… (tronqué) — voir src/application/routeAudit.generated.ts</div>
              )}
            </div>
          )}
          {orphanCanon.length > 0 && (
            <div>
              <div style={{ fontWeight: 700 }}>Routes CANON déclarées mais non utilisées ({orphanCanon.length})</div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                Elles sont des cibles canon, mais aucune navigation/CTA ne pointe dessus → risque “page orpheline”.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {orphanCanon.slice(0, 18).map(r => (
                  <span key={r} style={{ fontSize: 12, padding: "4px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999 }}>
                    <code>{r}</code>
                  </span>
                ))}
              </div>
              {orphanCanon.length > 18 && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>… (tronqué)</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Path</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Label</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Visibility</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Gate</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Nav</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Group</th>
              <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Redirect</th>
            </tr>
          </thead>
          <tbody>
            {ROUTES.map(r => (
              <tr key={r.path}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{r.path}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.label}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.visibility}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.gate || "—"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.nav ? "✅" : "—"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.group || "—"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>{r.redirectTo ? <code>{r.redirectTo}</code> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", fontWeight: 800 }}>Audit CTA — indices de “boutons morts”</div>
        <div style={{ padding: 12, color: "#475569", fontSize: 13 }}>
          Cette section liste des patterns à risque (ex: <code>href="#"</code>, inline <code>onclick</code>). Ce n’est pas une preuve qu’un bouton est mort,
          mais c’est la meilleure piste rapide pour viser 0 bouton mort.
        </div>
        <div style={{ maxHeight: 320, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Kind</th>
                <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Location</th>
                <th style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>Snippet</th>
              </tr>
            </thead>
            <tbody>
              {DEAD_CTA_HINTS.slice(0, 120).map((d, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                    <code>{d.kind}</code>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                    {d.file}:{d.line}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", color: "#334155" }}>{d.snippet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {DEAD_CTA_HINTS.length > 120 && <div style={{ padding: 12, fontSize: 12, color: "#64748b" }}>… (tronqué) — voir src/application/routeAudit.generated.ts</div>}
      </div>
    </div>
  );
}
