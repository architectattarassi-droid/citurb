import React from "react";
import type { P2SimulateResponse } from "./p2.types";
import P2UiBlockRenderer from "./P2UiBlockRenderer";

export default function P2Result({ res, onBack }: { res: P2SimulateResponse; onBack: () => void }) {
  if (!res) return null;

  if (res.ok === false) {
    return (
      <div style={{ maxWidth: 980 }}>
        <h2 style={{ marginTop: 0 }}>Résultat P2 — Erreur</h2>
        <div style={{ border: "1px solid #f0d7d7", background: "#fff7f7", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>❌ {res.error.code ?? "Error"}</div>
          <div style={{ color: "#444" }}>{res.error.message}</div>
          {res.error.incident_id ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              Incident: <code>{res.error.incident_id}</code>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 14 }}>
          <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
            ← Modifier inputs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h2 style={{ margin: 0 }}>{res.headline?.title ?? "Résultat P2"}</h2>
          {res.headline?.subtitle ? <div style={{ marginTop: 6, color: "#555" }}>{res.headline.subtitle}</div> : null}
          <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>
            request_id: <code>{res.request_id}</code>
          </div>
        </div>
        <button onClick={onBack} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
          ← Modifier inputs
        </button>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {res.ui_blocks?.length ? (
          res.ui_blocks.map((b, idx) => <P2UiBlockRenderer key={idx} block={b} />)
        ) : (
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14, color: "#666" }}>Aucun ui_block renvoyé.</div>
        )}
      </div>
    </div>
  );
}
