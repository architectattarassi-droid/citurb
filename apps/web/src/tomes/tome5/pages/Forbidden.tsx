import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Forbidden() {
  const loc = useLocation() as any;
  const from = loc?.state?.from ?? "";
  return (
    <div>
      <h2>403 — Forbidden</h2>
      <p style={{ color: "#555" }}>
        Accès refusé (capabilities insuffisantes). ITER3 branchera les rôles réels depuis l'API.
      </p>
      {from && <p style={{ fontSize: 12, color: "#777" }}>From: <code>{from}</code></p>}
      <div style={{ display: "flex", gap: 10 }}>
        <Link to="/login">Changer de rôle</Link>
        <Link to="/">Home</Link>
      </div>
    </div>
  );
}
