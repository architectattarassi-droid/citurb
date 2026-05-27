/**
 * WeatherAlertsCard.tsx — prévisions 7 jours + impact sur tâches sensibles +
 * bouton accepter replan auto.
 */

import React, { useEffect, useState } from "react";
import {
  WeatherSuggestion,
  incidentsChantierApi,
  IncidentGeoloc,
} from "./incidents-chantier.api";

type Props = {
  dossierId: string;
  geoloc?: IncidentGeoloc | null;
};

const WEATHER_ICON: Record<number, string> = {
  0: "☀️",
  1: "🌤",
  2: "⛅",
  3: "☁️",
  45: "🌫",
  48: "🌫",
  51: "🌦",
  53: "🌧",
  55: "🌧",
  61: "🌧",
  63: "🌧",
  65: "🌧",
  71: "🌨",
  73: "🌨",
  75: "❄️",
  80: "🌧",
  81: "🌧",
  82: "⛈",
  95: "⛈",
  96: "⛈",
  99: "⛈",
};

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function WeatherAlertsCard({ dossierId, geoloc }: Props) {
  const [data, setData] = useState<WeatherSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setLoading(true);
    incidentsChantierApi
      .weatherAlerts(dossierId, geoloc)
      .then((r) => setData(r.suggestion))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dossierId, geoloc?.lat, geoloc?.lng]);

  const accept = async () => {
    setAccepting(true);
    try {
      await incidentsChantierApi.acceptWeatherReplan(dossierId);
      setAccepted(true);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={cardWrap}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Chargement météo…
        </p>
      </div>
    );
  }

  if (!data || !data.forecast?.length) {
    return (
      <div style={cardWrap}>
        <h3 style={cardTitle}>Alertes météo</h3>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Pas de prévisions disponibles (géolocalisation manquante ?).
        </p>
      </div>
    );
  }

  return (
    <div style={cardWrap}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3 style={cardTitle}>Prévisions 7 jours</h3>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {new Date(data.generatedAt).toLocaleString("fr-FR")}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          gap: 6,
        }}
      >
        {data.forecast.map((f) => {
          const d = new Date(f.date);
          const isRisk = f.cherguiRisk || f.rainRisk;
          return (
            <div
              key={f.date}
              style={{
                padding: 8,
                borderRadius: 8,
                background: isRisk ? "#fef3c7" : "#f8fafc",
                border: isRisk ? "1px solid #f59e0b" : "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                {DAYS_FR[d.getDay()]}
              </div>
              <div style={{ fontSize: 22, lineHeight: 1.2 }}>
                {WEATHER_ICON[f.weatherCode] || "🌡"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: f.cherguiRisk ? "#991b1b" : "#0f172a",
                }}
              >
                {Math.round(f.tempMaxC)}°
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>
                {f.precipProbabilityPct}%
              </div>
            </div>
          );
        })}
      </div>

      {data.alerts.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              fontWeight: 800,
              color: "#991b1b",
            }}
          >
            {data.alerts.length} alerte(s) détectée(s)
          </h4>
          {data.alerts.map((a) => (
            <div
              key={a.date + a.type}
              style={{
                padding: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#991b1b",
                  marginBottom: 4,
                }}
              >
                {a.type} — {a.date}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                Tâches impactées : {a.affectedTasks.join(", ")}
              </div>
              <div style={{ fontSize: 12, color: "#0f172a", fontStyle: "italic" }}>
                {a.suggestion}
              </div>
            </div>
          ))}

          {accepted ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: "#dcfce7",
                color: "#166534",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Replan accepté. Le planning sera mis à jour.
            </div>
          ) : (
            <button
              onClick={accept}
              disabled={accepting}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 12,
                background: "#dc2626",
                color: "white",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {accepting ? "Application…" : "Accepter le replan automatique"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const cardWrap: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 800,
  color: "#0f172a",
};
