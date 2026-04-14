import React from "react";

/**
 * TOME@1 — Layouts & navigation (web)
 * Doctrine: UI = orchestration + transparency, no business logic.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: 0 }}>CITURBAREA — Front Office</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        Prototype exécutable (lecture seule). Structure Tome-first. Le front n’embarque pas la logique métier.
      </p>
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
}
