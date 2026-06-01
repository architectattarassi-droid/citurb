/**
 * IncidentsChantierPage.tsx — page principale `/chantier/:dossierId/incidents`.
 *
 * Sections (mobile-first) :
 *  - Header avec compteurs + dossier
 *  - SOS Button (floating bottom-right en permanence)
 *  - WeatherAlertsCard (prévisions 7j + replan auto)
 *  - 3 tabs : Actifs / Résolus / Historique
 *  - Bouton "Déclarer incident" sticky bottom
 *  - Modale détail incident
 *  - Modale wizard déclaration
 *
 * Offline-first : flush automatique de la queue au mount + reconnect.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useT, useLang } from "../../i18n/i18n";
import {
  IncidentChantier,
  SEVERITE_COLOR,
  STATUS_COLOR,
  captureCurrentGeoloc,
  flushOfflineQueue,
  getQueue,
  incidentsChantierApi,
  type IncidentGeoloc,
} from "./incidents-chantier.api";
import SOSButton from "./SOSButton";
import DeclarationIncidentForm from "./DeclarationIncidentForm";
import WeatherAlertsCard from "./WeatherAlertsCard";
import IncidentDetailModal from "./IncidentDetailModal";

type Tab = "ACTIFS" | "RESOLUS";

export default function IncidentsChantierPage() {
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "ar" ? "ar-MA" : lang === "en" ? "en-US" : "fr-FR";
  const params = useParams<{ dossierId: string }>();
  const dossierId = params.dossierId || "";

  const [tab, setTab] = useState<Tab>("ACTIFS");
  const [incidents, setIncidents] = useState<IncidentChantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [geoloc, setGeoloc] = useState<IncidentGeoloc | null>(null);

  const reload = () => {
    if (!dossierId) return;
    setLoading(true);
    incidentsChantierApi
      .listByDossier(dossierId)
      .then((r) => setIncidents(r.incidents))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    captureCurrentGeoloc().then((g) => setGeoloc(g));
    // Flush queue offline au mount + à reconnect
    flushOfflineQueue().then(() => setQueueCount(getQueue().length));
    const onOnline = () => {
      flushOfflineQueue().then((r) => {
        setQueueCount(getQueue().length);
        if (r.ok > 0) reload();
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  // Filtered lists
  const actifs = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.status === "OPEN" ||
          i.status === "IN_PROGRESS" ||
          i.status === "SOS_TRIGGERED",
      ),
    [incidents],
  );
  const resolus = useMemo(
    () =>
      incidents.filter((i) => i.status === "RESOLVED" || i.status === "ARCHIVED"),
    [incidents],
  );

  const list = tab === "ACTIFS" ? actifs : resolus;

  // SOS triggerable depuis le bouton flottant : déclenche SOS sur le dernier
  // incident OPEN. Si aucun, on en crée un AUTRE en urgence, puis on déclenche.
  const handleFloatingSos = async () => {
    let targetId = actifs[0]?.id;
    if (!targetId) {
      // Crée un incident AUTRE en urgence
      try {
        const r = await incidentsChantierApi.declare(dossierId, {
          type: "AUTRE",
          severite: "CRITICAL",
          description: t("chantier.incidents.sos_default_description"),
          geoloc,
          dateConstatation: new Date().toISOString(),
        });
        targetId = r.incident.id;
      } catch (e: any) {
        return { ok: false as const, message: e?.message || t("chantier.incidents.sos_err_create") };
      }
    }
    try {
      await incidentsChantierApi.sos(targetId);
      reload();
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e?.message || t("chantier.incidents.sos_err_trigger") };
    }
  };

  // ── Styles ────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <h1 style={S.title}>{t("chantier.incidents.title")}</h1>
        <p style={S.sub}>{t("chantier.incidents.sub_dossier", { id: dossierId })}</p>
        {queueCount > 0 && (
          <div style={S.queueWarn}>
            {t("chantier.incidents.queue_warn", { count: queueCount })}
          </div>
        )}
      </header>

      <section style={{ marginBottom: 16 }}>
        <WeatherAlertsCard dossierId={dossierId} geoloc={geoloc} />
      </section>

      <nav style={S.tabs}>
        <button
          style={S.tab(tab === "ACTIFS")}
          onClick={() => setTab("ACTIFS")}
        >
          {t("chantier.incidents.tab_actifs", { count: actifs.length })}
        </button>
        <button
          style={S.tab(tab === "RESOLUS")}
          onClick={() => setTab("RESOLUS")}
        >
          {t("chantier.incidents.tab_resolus", { count: resolus.length })}
        </button>
      </nav>

      <section style={{ paddingBottom: 100 }}>
        {loading ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: 30 }}>
            {t("chantier.incidents.loading")}
          </p>
        ) : list.length === 0 ? (
          <p
            style={{
              color: "#64748b",
              textAlign: "center",
              padding: 30,
              fontSize: 14,
            }}
          >
            {tab === "ACTIFS"
              ? t("chantier.incidents.empty_actifs")
              : t("chantier.incidents.empty_resolus")}
          </p>
        ) : (
          <div style={S.grid}>
            {list.map((i) => (
              <button
                key={i.id}
                onClick={() => setActiveIncidentId(i.id)}
                style={S.card(i.severite === "CRITICAL")}
              >
                <div style={S.cardTop}>
                  <span style={S.numero}>{i.numero}</span>
                  <span
                    style={{
                      ...pill,
                      background: STATUS_COLOR[i.status].bg,
                      color: STATUS_COLOR[i.status].fg,
                    }}
                  >
                    {STATUS_COLOR[i.status].label}
                  </span>
                </div>
                <div style={S.cardType}>{i.type.replace(/_/g, " ")}</div>
                <div style={S.cardDesc}>{i.description}</div>
                <div style={S.cardMeta}>
                  <span
                    style={{
                      ...pill,
                      background: SEVERITE_COLOR[i.severite].bg,
                      color: SEVERITE_COLOR[i.severite].fg,
                    }}
                  >
                    {SEVERITE_COLOR[i.severite].label}
                  </span>
                  {i.sosTriggered && (
                    <span
                      style={{
                        ...pill,
                        background: "#7f1d1d",
                        color: "#fff",
                      }}
                    >
                      {t("chantier.incidents.sos_pill")}
                    </span>
                  )}
                  <span style={S.date}>
                    {new Date(i.createdAt).toLocaleDateString(dateLocale)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Bouton déclarer sticky bottom */}
      <button onClick={() => setShowForm(true)} style={S.declareBtn}>
        {t("chantier.incidents.declare_btn")}
      </button>

      {/* FAB SOS toujours visible */}
      <SOSButton floating onTrigger={handleFloatingSos} />

      {showForm && (
        <DeclarationIncidentForm
          dossierId={dossierId}
          onClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            reload();
            setActiveIncidentId(id);
          }}
        />
      )}

      {activeIncidentId && (
        <IncidentDetailModal
          incidentId={activeIncidentId}
          onClose={() => {
            setActiveIncidentId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

const pill: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 999,
  textTransform: "uppercase",
};

const S = {
  wrap: {
    padding: 12,
    maxWidth: 980,
    margin: "0 auto",
    position: "relative" as const,
  },
  header: { marginBottom: 14 },
  title: { margin: 0, color: "#0f172a", fontSize: 22, fontWeight: 800 },
  sub: { margin: "2px 0 0", color: "#64748b", fontSize: 13 },
  queueWarn: {
    marginTop: 8,
    padding: 8,
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 6,
    fontSize: 12,
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 6,
    marginBottom: 12,
    overflowX: "auto" as const,
  },
  tab: (active: boolean) =>
    ({
      flex: "0 0 auto",
      padding: "10px 16px",
      borderRadius: 999,
      border: 0,
      background: active ? "#0f172a" : "#e2e8f0",
      color: active ? "white" : "#475569",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
    } as React.CSSProperties),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 10,
  },
  card: (critical: boolean) =>
    ({
      background: "#fff",
      border: critical ? "1px solid #fecaca" : "1px solid #e2e8f0",
      borderLeft: critical ? "5px solid #dc2626" : "5px solid #cbd5e1",
      borderRadius: 10,
      padding: 12,
      textAlign: "left" as const,
      cursor: "pointer",
      transition: "transform 120ms ease, box-shadow 120ms ease",
      boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    } as React.CSSProperties),
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center" as const,
    marginBottom: 6,
  },
  numero: { fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.4 },
  cardType: { fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 },
  cardDesc: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    display: "-webkit-box" as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden" as const,
  } as React.CSSProperties,
  cardMeta: {
    display: "flex",
    gap: 6,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
  },
  date: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },
  declareBtn: {
    position: "fixed" as const,
    bottom: 16,
    left: 16,
    right: 140,
    maxWidth: 540,
    margin: "0 auto",
    padding: 14,
    background: "#0f172a",
    color: "white",
    border: 0,
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(15,23,42,0.35)",
    zIndex: 9998,
  } as React.CSSProperties,
};
