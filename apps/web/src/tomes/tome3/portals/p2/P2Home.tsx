import React, { useState } from "react";
import type { P2InputPayload, P2SimulateResponse } from "./p2.types";
import P2Form from "./P2Form";
import P2Result from "./P2Result";
import { useP2Simulate } from "./useP2Simulate";

/**
 * P2 — Investisseur (Consumer-only UI)
 * Doctrine: frontend collecte / appelle / affiche. Le backend décide.
 */
export default function P2Home() {
  const [lastPayload, setLastPayload] = useState<P2InputPayload | undefined>(undefined);
  const [view, setView] = useState<"form" | "result">("form");
  const { data, loading, error, simulate, reset } = useP2Simulate();

  const onSubmit = async (payload: P2InputPayload) => {
    setLastPayload(payload);
    try {
      const res: P2SimulateResponse = await simulate(payload);
      setView("result");
      return res;
    } catch {
      // stay on form; error banner shows
    }
  };

  const onBack = () => {
    setView("form");
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {view === "form" ? (
        <>
          {error ? (
            <div style={{ border: "1px solid #f0d7d7", background: "#fff7f7", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>Erreur API</div>
              <div style={{ marginTop: 6, color: "#444" }}>{error.message}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>status: {error.status}</div>
            </div>
          ) : null}

          <P2Form
            initial={lastPayload}
            disabled={loading}
            onSubmit={onSubmit}
            onReset={() => {
              setLastPayload(undefined);
              reset();
            }}
          />

          {loading ? (
            <div style={{ fontSize: 12, color: "#777" }}>Simulation en cours…</div>
          ) : (
            <div style={{ fontSize: 12, color: "#777" }}>
              Endpoint actuel: <code>/p2/simulate</code> (placeholder — sera remplacé via Sync Packet Chat0)
            </div>
          )}
        </>
      ) : data ? (
        <P2Result res={data} onBack={onBack} />
      ) : (
        <div>
          <h2>Résultat P2</h2>
          <div style={{ color: "#666" }}>Aucun résultat en mémoire.</div>
          <button onClick={onBack} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}>
            ← Retour
          </button>
        </div>
      )}
    </div>
  );
}
