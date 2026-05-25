/**
 * PvChantierViewer — visualisation d'un PV (DRAFT / SIGNED_PARTIEL / FINAL).
 *
 * Boutons :
 *  - "Télécharger PDF" → ouvre la version HTML imprimable
 *  - "Partager WhatsApp" → ouvre wa.me avec lien public
 *  - "Éditer" si pas finalisé
 */

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  PvChantier,
  SEVERITE_COLOR,
  STATUS_COLOR,
  TYPE_VISITE_LABEL,
  pvChantierApi,
} from "./pv-chantier.api";

const S = {
  wrap: { maxWidth: 880, margin: "0 auto", padding: 14 },
  head: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 16,
    gap: 12,
    flexWrap: "wrap" as const,
  },
  h1: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 },
  sub: { color: "#64748b", fontSize: 13, marginTop: 4 },
  actions: { display: "flex" as const, gap: 8, flexWrap: "wrap" as const },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none" as const,
    cursor: "pointer",
    display: "inline-block",
  },
  btnWa: {
    background: "#22c55e",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none" as const,
    cursor: "pointer",
    display: "inline-block",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none" as const,
    cursor: "pointer",
    display: "inline-block",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  meta: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    fontSize: 13,
  },
  k: { color: "#64748b", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  v: { fontWeight: 700, color: "#0f172a" },
  obs: {
    border: "1px solid #e2e8f0",
    borderLeftWidth: 5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    background: "#fff",
  },
  obsTitle: { fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  obsDesc: {
    color: "#1f2937",
    fontSize: 13.5,
    whiteSpace: "pre-wrap" as const,
    marginBottom: 6,
  },
  obsPhotos: { display: "flex" as const, gap: 6, flexWrap: "wrap" as const, marginTop: 6 },
  thumb: { width: 110, height: 110, objectFit: "cover" as const, borderRadius: 6 },
  pill: {
    display: "inline-block" as const,
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },
  signs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  sign: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 10,
    textAlign: "center" as const,
    background: "#f8fafc",
  },
  hash: {
    fontFamily: "SF Mono, Consolas, monospace",
    fontSize: 11,
    color: "#475569",
    wordBreak: "break-all" as const,
    marginTop: 8,
  },
};

export default function PvChantierViewer({
  pvId,
  baseRoute = "/pv-chantier",
}: {
  pvId?: string;
  baseRoute?: string;
}) {
  const params = useParams<{ pvId: string }>();
  const id = pvId ?? params.pvId ?? "";
  const [pv, setPv] = useState<PvChantier | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    pvChantierApi
      .get(id)
      .then(setPv)
      .catch((e: any) => setErr(e?.message ?? "Erreur"));
  }, [id]);

  if (err) return <div style={S.wrap}>{err}</div>;
  if (!pv) return <div style={S.wrap}>Chargement…</div>;

  const status = STATUS_COLOR[pv.status];
  const pdfUrl = pvChantierApi.pdfUrl(pv.id);
  const waText = encodeURIComponent(
    `PV de chantier ${pv.numero} — ${TYPE_VISITE_LABEL[pv.typeVisite]} du ${formatDate(pv.date)}.\nConsulter : ${typeof window !== "undefined" ? window.location.origin : ""}${baseRoute}/${pv.id}`,
  );

  return (
    <div style={S.wrap}>
      <header style={S.head}>
        <div>
          <h1 style={S.h1}>PV n° {pv.numero}</h1>
          <div style={S.sub}>
            {TYPE_VISITE_LABEL[pv.typeVisite]} · {formatDate(pv.date)}
          </div>
          <div style={{ marginTop: 6 }}>
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
        </div>
        <div style={S.actions}>
          <a style={S.btn} href={pdfUrl} target="_blank" rel="noreferrer">
            Télécharger PDF
          </a>
          <a
            style={S.btnWa}
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
          >
            Partager WhatsApp
          </a>
          {pv.status !== "FINAL" && (
            <Link style={S.btnGhost} to={`${baseRoute}/${pv.id}/edit`}>
              Éditer
            </Link>
          )}
        </div>
      </header>

      <section style={S.card}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Conditions de visite</h2>
        <div style={{ ...S.meta, marginTop: 10 }}>
          <Cell k="Date" v={formatDate(pv.date)} />
          <Cell k="Type" v={TYPE_VISITE_LABEL[pv.typeVisite]} />
          {pv.meteo && <Cell k="Météo" v={pv.meteo} />}
          {pv.temperatureC != null && <Cell k="Température" v={`${pv.temperatureC} °C`} />}
          {pv.vent && <Cell k="Vent" v={pv.vent} />}
          {pv.prochaineVisite && (
            <Cell k="Prochaine visite" v={formatDate(pv.prochaineVisite)} />
          )}
        </div>
      </section>

      {pv.presents.length > 0 && (
        <section style={S.card}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Présents</h2>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
            {pv.presents.map((p, i) => (
              <li key={i}>
                <strong>{p.nom}</strong> — {p.role}
                {p.organisme ? ` (${p.organisme})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pv.absents.length > 0 && (
        <section style={S.card}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Absents</h2>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
            {pv.absents.map((p, i) => (
              <li key={i}>
                <strong>{p.nom}</strong> — {p.role}
                {p.motif ? ` — motif : ${p.motif}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={S.card}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>
          Observations ({pv.observations.length})
        </h2>
        <div style={{ marginTop: 10 }}>
          {pv.observations.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>Aucune observation.</div>
          ) : (
            pv.observations.map((o) => {
              const sev = SEVERITE_COLOR[o.severite];
              return (
                <div
                  key={o.id}
                  style={{ ...S.obs, borderLeftColor: sev.fg }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={S.obsTitle}>
                      {o.lot ? `Lot ${o.lot} · ` : ""}
                      {o.titre}
                    </div>
                    <span style={{ ...S.pill, background: sev.bg, color: sev.fg }}>
                      {sev.label}
                    </span>
                  </div>
                  {o.description && <div style={S.obsDesc}>{o.description}</div>}
                  {o.geoloc && (
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      GPS {o.geoloc.lat.toFixed(5)}, {o.geoloc.lng.toFixed(5)}
                    </div>
                  )}
                  {o.deadline && (
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Échéance : {formatDate(o.deadline)}
                    </div>
                  )}
                  {o.photoUrls.length > 0 && (
                    <div style={S.obsPhotos}>
                      {o.photoUrls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt={`photo-${i}`} style={S.thumb} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {pv.signatures.length > 0 && (
        <section style={S.card}>
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>
            Signatures ({pv.signatures.length})
          </h2>
          <div style={{ ...S.signs, marginTop: 10 }}>
            {pv.signatures.map((s, i) => (
              <div key={i} style={S.sign}>
                <img
                  src={s.dataUrl}
                  alt={s.partie}
                  style={{ maxHeight: 80, maxWidth: "100%" }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                  {s.partie}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {new Date(s.signedAt).toLocaleString("fr-MA")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pv.hashSha256 && (
        <section style={S.card}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Empreinte probatoire SHA-256
          </div>
          <div style={S.hash}>{pv.hashSha256}</div>
          {pv.finalizedAt && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Finalisé le {new Date(pv.finalizedAt).toLocaleString("fr-MA")}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {k}
      </div>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{v}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-MA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
