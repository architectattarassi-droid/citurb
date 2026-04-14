import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Upgrade() {
  const loc = useLocation() as any;
  const from = loc?.state?.from ?? "";
  return (
    <div>
      <h2>Upgrade required</h2>
      <p style={{ color: "#555" }}>
        Cette fonctionnalité est paywall (entitlement). Exemple: API Enterprise.
      </p>
      {from && <p style={{ fontSize: 12, color: "#777" }}>From: <code>{from}</code></p>}
      <div style={{ display: "flex", gap: 10 }}>
        <Link to="/login">Voir plans & rôles</Link>
        <Link to="/">Home</Link>
      </div>
    </div>
  );
}
