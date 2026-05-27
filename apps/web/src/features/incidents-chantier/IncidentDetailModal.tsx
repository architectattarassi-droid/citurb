/**
 * IncidentDetailModal.tsx — modale plein écran responsive avec timeline,
 * actions prises, parties notifiées, statut + action ajouter / résoudre.
 */

import React, { useEffect, useState } from "react";
import {
  IncidentAction,
  IncidentActionType,
  IncidentChantier,
  SEVERITE_COLOR,
  STATUS_COLOR,
  incidentsChantierApi,
} from "./incidents-chantier.api";

type Props = {
  incidentId: string;
  onClose: () => void;
};

const ACTION_LABEL: Partial<Record<IncidentActionType, string>> = {
  DECLARED: "Déclaré",
  PHOTO_ADDED: "Photo ajoutée",
  SOS_TRIGGERED: "SOS DÉCLENCHÉ",
  FAMILY_NOTIFIED: "Famille notifiée",
  LAWYER_NOTIFIED: "Avocat notifié",
  OPS_NOTIFIED: "OPS CITURBAREA notifié",
  INSURANCE_CONTACTED: "Assurance contactée",
  CNSS_DECLARED: "CNSS déclaré",
  POLICE_REPORT_FILED: "Plainte déposée",
  EXPERTISE_REQUESTED: "Expertise demandée",
  REPAIR_STARTED: "Réparation lancée",
  CHANTIER_SUSPENDED: "Chantier suspendu",
  CHANTIER_RESUMED: "Chantier repris",
  STATUS_CHANGED: "Statut modifié",
  NOTE: "Note",
  RESOLVED: "Résolu",
};

const QUICK_ACTIONS: IncidentActionType[] = [
  "INSURANCE_CONTACTED",
  "CNSS_DECLARED",
  "POLICE_REPORT_FILED",
  "EXPERTISE_REQUESTED",
  "REPAIR_STARTED",
];

export default function IncidentDetailModal({ incidentId, onClose }: Props) {
  const [incident, setIncident] = useState<IncidentChantier | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");

  const reload = () => {
    setLoading(true);
    incidentsChantierApi
      .get(incidentId)
      .then((r) => setIncident(r.incident))
      .catch(() => setIncident(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, [incidentId]);

  const addQuick = async (type: IncidentActionType) => {
    setAdding(true);
    try {
      const r = await incidentsChantierApi.addAction(incidentId, { type });
      setIncident(r.incident);
    } finally {
      setAdding(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setAdding(true);
    try {
      const r = await incidentsChantierApi.addAction(incidentId, {
        type: "NOTE",
        payload: { text: note.trim() },
      });
      setIncident(r.incident);
      setNote("");
    } finally {
      setAdding(false);
    }
  };

  const resolve = async () => {
    const lecon = window.prompt("Leçon apprise (facultatif) :");
    setAdding(true);
    try {
      const r = await incidentsChantierApi.resolve(incidentId, {
        leconApprise: lecon || undefined,
      });
      setIncident(r.incident);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={S.overlay} role="dialog" aria-modal>
      <div style={S.panel}>
        <button onClick={onClose} style={S.closeBtn} aria-label="Fermer">
          ×
        </button>
        {loading || !incident ? (
          <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
            Chargement…
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                {incident.numero}
              </div>
              <h2
                style={{
                  margin: "4px 0",
                  fontSize: 20,
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                {incident.type.replace(/_/g, " ")}
              </h2>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span
                  style={{
                    ...pillStyle,
                    background: STATUS_COLOR[incident.status].bg,
                    color: STATUS_COLOR[incident.status].fg,
                  }}
                >
                  {STATUS_COLOR[incident.status].label}
                </span>
                <span
                  style={{
                    ...pillStyle,
                    background: SEVERITE_COLOR[incident.severite].bg,
                    color: SEVERITE_COLOR[incident.severite].fg,
                  }}
                >
                  {SEVERITE_COLOR[incident.severite].label}
                </span>
                {incident.sosTriggered && (
                  <span
                    style={{
                      ...pillStyle,
                      background: "#7f1d1d",
                      color: "#fff",
                    }}
                  >
                    SOS DÉCLENCHÉ
                  </span>
                )}
              </div>
            </div>

            <section style={S.section}>
              <h3 style={S.h3}>Description</h3>
              <p style={{ margin: 0, color: "#334155", fontSize: 14 }}>
                {incident.description}
              </p>
            </section>

            {(incident.blessesNb != null ||
              incident.montantDommageEstimeMad != null) && (
              <section style={S.section}>
                <h3 style={S.h3}>Impact</h3>
                {incident.blessesNb != null && (
                  <p style={{ margin: "4px 0", fontSize: 13 }}>
                    Blessés : <b>{incident.blessesNb}</b>
                  </p>
                )}
                {incident.montantDommageEstimeMad != null && (
                  <p style={{ margin: "4px 0", fontSize: 13 }}>
                    Dommage estimé : <b>{incident.montantDommageEstimeMad} MAD</b>
                  </p>
                )}
                {incident.montantIndemniseMad != null && (
                  <p style={{ margin: "4px 0", fontSize: 13 }}>
                    Indemnisation : <b>{incident.montantIndemniseMad} MAD</b>
                  </p>
                )}
              </section>
            )}

            {incident.photos.length > 0 && (
              <section style={S.section}>
                <h3 style={S.h3}>Photos ({incident.photos.length})</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 6,
                  }}
                >
                  {incident.photos.map((p, i) => (
                    <img
                      key={i}
                      src={p.url}
                      alt={`photo ${i}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {incident.geoloc && (
              <section style={S.section}>
                <h3 style={S.h3}>Localisation</h3>
                <a
                  href={`https://maps.google.com/?q=${incident.geoloc.lat},${incident.geoloc.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#0369a1", fontSize: 13 }}
                >
                  {incident.geoloc.lat.toFixed(5)},{" "}
                  {incident.geoloc.lng.toFixed(5)}
                </a>
              </section>
            )}

            {incident.status !== "RESOLVED" && (
              <section style={S.section}>
                <h3 style={S.h3}>Actions rapides</h3>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => addQuick(a)}
                      disabled={adding}
                      style={S.quickBtn}
                    >
                      {ACTION_LABEL[a]}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <textarea
                    placeholder="Ajouter une note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 60,
                      padding: 8,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={addNote}
                    disabled={adding || !note.trim()}
                    style={{ ...S.quickBtn, marginTop: 6, width: "100%" }}
                  >
                    Ajouter la note
                  </button>
                </div>
              </section>
            )}

            <section style={S.section}>
              <h3 style={S.h3}>Timeline ({incident.actions.length})</h3>
              <ol
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  borderLeft: "2px solid #e2e8f0",
                  paddingLeft: 12,
                }}
              >
                {incident.actions
                  .slice()
                  .reverse()
                  .map((a: IncidentAction) => (
                    <li
                      key={a.id}
                      style={{
                        marginBottom: 10,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: -18,
                          top: 4,
                          width: 10,
                          height: 10,
                          background:
                            a.type === "SOS_TRIGGERED" ? "#dc2626" : "#0f172a",
                          borderRadius: "50%",
                        }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {ACTION_LABEL[a.type] || a.type}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {new Date(a.ts).toLocaleString("fr-FR")}
                        {a.actorRole ? ` · ${a.actorRole}` : ""}
                      </div>
                      {a.payload && a.payload.text ? (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          {String(a.payload.text)}
                        </div>
                      ) : null}
                    </li>
                  ))}
              </ol>
            </section>

            {incident.status !== "RESOLVED" && (
              <button onClick={resolve} disabled={adding} style={S.resolveBtn}>
                Marquer résolu
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: 999,
  textTransform: "uppercase",
};

const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.65)",
    zIndex: 9990,
    display: "flex",
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
  },
  panel: {
    background: "#fff",
    width: "100%",
    maxWidth: 600,
    maxHeight: "94vh",
    overflowY: "auto" as const,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    position: "relative" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    top: 8,
    right: 10,
    border: 0,
    background: "transparent",
    fontSize: 28,
    cursor: "pointer",
    color: "#64748b",
    padding: 6,
  },
  section: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #f1f5f9",
  } as React.CSSProperties,
  h3: {
    margin: "0 0 8px",
    fontSize: 13,
    fontWeight: 800,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  quickBtn: {
    padding: "8px 12px",
    background: "#0f172a",
    color: "white",
    border: 0,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  resolveBtn: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    background: "#16a34a",
    color: "white",
    border: 0,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  } as React.CSSProperties,
};
