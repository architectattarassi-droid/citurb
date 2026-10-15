/**
 * Bandeau de /cc/dossiers : autorisations de construire expirées ou à J−90
 * (spec Devis & Facturation §8.4) — GET /api/cc/dossiers/alertes-autorisation.
 * Rien d'affiché si aucune alerte ou si le SQL n'est pas encore collé.
 */
import React, { useEffect, useState } from "react";
import { CC } from "../../../theme/tokens";

type Alerte = { id: string; titre: string; clientNom: string | null; commune: string | null; autorisationNum: string | null; expiration: string; joursRestants: number; niveau: "EXPIREE" | "J90" | null };

const date = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default function AlertesAutorisation() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  useEffect(() => {
    void fetch("/api/cc/dossiers/alertes-autorisation", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAlertes(j?.alertes || []))
      .catch(() => undefined);
  }, []);
  if (!alertes.length) return null;
  return (
    <div style={{ background: CC.color.warnBg, border: `1px solid ${CC.color.orSoft}`, borderRadius: 8, padding: "10px 14px", margin: "8px 0 14px", fontSize: 13 }}>
      <div style={{ fontWeight: 600, color: CC.color.warn, marginBottom: 6 }}>Autorisations de construire à renouveler ({alertes.length})</div>
      {alertes.map((a) => (
        <div key={a.id} style={{ padding: "3px 0" }}>
          <strong>{a.titre}</strong>{a.clientNom ? ` — ${a.clientNom}` : ""}{a.commune ? ` (${a.commune})` : ""} · {a.autorisationNum || "autorisation"} :{" "}
          {a.niveau === "EXPIREE" ? `expirée depuis le ${date(a.expiration)}` : `expire le ${date(a.expiration)} (J−${a.joursRestants})`}
          <span style={{ color: CC.color.inkMid }}> · devis de renouvellement à proposer</span>
        </div>
      ))}
    </div>
  );
}
