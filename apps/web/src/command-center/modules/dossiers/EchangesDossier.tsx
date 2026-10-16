/**
 * Un seul endroit pour le dossier et ses échanges (fondateur, 16/10/2026) : rendez-vous visio,
 * demandes d'appel vidéo et fils de messages du même client, rattachés au dossier.
 * GET /api/cc/dossiers/:id/echanges (functions/_lib/dossierEchanges.ts).
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CC } from "../../theme/tokens";

type Echanges = {
  rendezVous: Array<{ id: string; debut: string | null; statut: string | null; objet: string | null }>;
  appels: Array<{ id: string; statut: string; creneau: string | null; sujet: string | null; etape: string | null }>;
  conversations: Array<{ id: string; statut: string; sujet: string | null; dernierMessageLe: string | null; etape: string | null }>;
};
const dateHeure = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function EchangesDossier({ dossierId }: { dossierId: string }) {
  const [x, setX] = useState<Echanges | null | "indispo">(null);
  useEffect(() => {
    void fetch(`/api/cc/dossiers/${encodeURIComponent(dossierId)}/echanges`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => setX(j?.ok ? j : "indispo")).catch(() => setX("indispo"));
  }, [dossierId]);
  if (x === null) return <p style={S.petit}>Chargement…</p>;
  if (x === "indispo") return <p style={S.petit}>Échanges indisponibles.</p>;
  const etape = (c: string | null) => (c ? <Link to={`/cc/dossiers/${encodeURIComponent(dossierId)}/etapes/${encodeURIComponent(c)}`} style={S.lien}> · étape {c}</Link> : null);
  return (
    <div>
      <div style={S.sousTitre}>Rendez-vous visio ({x.rendezVous.length})</div>
      {x.rendezVous.length ? <ul style={S.liste}>{x.rendezVous.map((r) => <li key={r.id} style={S.ligne}>{dateHeure(r.debut)} · {r.statut ?? "—"}{r.objet ? ` · ${r.objet.toLowerCase()}` : ""}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
      <div style={S.sousTitre}>Appels vidéo ({x.appels.length})</div>
      {x.appels.length ? <ul style={S.liste}>{x.appels.map((a) => <li key={a.id} style={S.ligne}>{a.sujet ?? "Appel"} · {a.statut.toLowerCase()}{a.creneau ? ` · ${dateHeure(a.creneau)}` : ""}{etape(a.etape)}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
      <div style={S.sousTitre}>Messages ({x.conversations.length})</div>
      {x.conversations.length ? <ul style={S.liste}>{x.conversations.map((c) => <li key={c.id} style={S.ligne}>{c.sujet ?? "Fil"} · {c.statut.toLowerCase()} · {dateHeure(c.dernierMessageLe)}{etape(c.etape)}</li>)}</ul> : <p style={S.petit}>Aucun.</p>}
    </div>
  );
}

const S = {
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.5 } as React.CSSProperties,
  sousTitre: { fontSize: 12.5, fontWeight: 700, color: CC.color.ink, margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: 0.4 } as React.CSSProperties,
  liste: { listStyle: "none", margin: "4px 0", padding: 0 } as React.CSSProperties,
  ligne: { padding: "5px 0", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13.5 } as React.CSSProperties,
  lien: { color: CC.color.info, fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
};
