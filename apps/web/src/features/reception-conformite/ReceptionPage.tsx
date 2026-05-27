/**
 * ReceptionPage — /dossier/:dossierId/reception
 *
 * Page principale : timeline visuelle Provisoire → Réserves → Définitive →
 * PH demandé → PH obtenu + garanties actives + sinistres.
 *
 * Mobile-first, onglets fluides selon étape courante.
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CertificatConformiteCard from "./CertificatConformiteCard";
import GarantiesTracker from "./GarantiesTracker";
import LeveeReservesForm from "./LeveeReservesForm";
import ReceptionDefinitiveForm from "./ReceptionDefinitiveForm";
import ReceptionProvisoireForm from "./ReceptionProvisoireForm";
import {
  GarantieActive,
  ReceptionState,
  STATUS_COLOR,
  receptionApi,
} from "./reception-conformite.api";

type TabKey =
  | "provisoire"
  | "reserves"
  | "definitive"
  | "permis"
  | "garanties";

export default function ReceptionPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [state, setState] = useState<ReceptionState | null>(null);
  const [garanties, setGaranties] = useState<GarantieActive[]>([]);
  const [tab, setTab] = useState<TabKey>("provisoire");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, g] = await Promise.all([
        receptionApi.state(dossierId),
        receptionApi.garanties(dossierId),
      ]);
      setState(s);
      setGaranties(g.garanties ?? []);
      // Auto-sélection onglet
      if (!s.provisoire || s.provisoire.status !== "FINAL") setTab("provisoire");
      else if (s.provisoire.reserves.some((r) => !r.leveeAt)) setTab("reserves");
      else if (!s.definitive || s.definitive.status !== "FINAL") setTab("definitive");
      else if (s.permisHabiter.status !== "DELIVRE") setTab("permis");
      else setTab("garanties");
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dossierId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Chargement…</div>;
  }
  if (error || !state) {
    return (
      <div style={{ padding: 20, color: "#991b1b" }}>
        Erreur : {error ?? "État indisponible"}
      </div>
    );
  }

  const statusColor = STATUS_COLOR[state.status];
  const reservesNonLevees = state.provisoire?.reserves.filter((r) => !r.leveeAt).length ?? 0;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "10px 0 24px" }}>
      <header style={{ padding: "0 14px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
          Réception &amp; Certificat de conformité
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
          <span
            style={{
              background: statusColor.bg,
              color: statusColor.fg,
              padding: "3px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {statusColor.label}
          </span>
          <span style={{ color: "#64748b", fontSize: 12 }}>
            Dossier {dossierId.slice(0, 8)}…
          </span>
        </div>

        {/* Timeline */}
        <Timeline state={state} />

        {/* Onglets */}
        <nav
          style={{
            display: "flex",
            gap: 4,
            marginTop: 16,
            borderBottom: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <Tab id="provisoire" current={tab} setTab={setTab} label="Provisoire" />
          {state.provisoire?.status === "FINAL" && (
            <Tab
              id="reserves"
              current={tab}
              setTab={setTab}
              label={`Réserves${reservesNonLevees > 0 ? ` (${reservesNonLevees})` : ""}`}
            />
          )}
          {state.provisoire?.status === "FINAL" && reservesNonLevees === 0 && (
            <Tab id="definitive" current={tab} setTab={setTab} label="Définitive" />
          )}
          {state.provisoire?.status === "FINAL" && (
            <Tab id="permis" current={tab} setTab={setTab} label="Permis d'habiter" />
          )}
          {state.garantieDateDebut && (
            <Tab id="garanties" current={tab} setTab={setTab} label="Garanties" />
          )}
        </nav>
      </header>

      <main style={{ marginTop: 10 }}>
        {tab === "provisoire" && (
          <ReceptionProvisoireForm
            dossierId={dossierId}
            initial={state.provisoire}
            onFinalized={() => load()}
          />
        )}
        {tab === "reserves" && state.provisoire && (
          <LeveeReservesForm
            dossierId={dossierId}
            reserves={state.provisoire.reserves}
            onLevee={() => load()}
          />
        )}
        {tab === "definitive" && state.provisoire?.status === "FINAL" && (
          <ReceptionDefinitiveForm
            dossierId={dossierId}
            provisoire={state.provisoire}
            initial={state.definitive}
            onFinalized={() => load()}
          />
        )}
        {tab === "permis" && (
          <div style={{ padding: 14 }}>
            <CertificatConformiteCard
              dossierId={dossierId}
              permis={state.permisHabiter}
              canFinalize={state.provisoire?.status === "FINAL"}
              onUpdated={() => load()}
            />
          </div>
        )}
        {tab === "garanties" && (
          <div style={{ padding: 14 }}>
            <GarantiesTracker
              dossierId={dossierId}
              garanties={garanties}
              sinistres={state.sinistres ?? []}
              onSinistreDeclared={() => load()}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function Tab({
  id,
  current,
  setTab,
  label,
}: {
  id: TabKey;
  current: TabKey;
  setTab: (t: TabKey) => void;
  label: string;
}) {
  const active = current === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        background: "transparent",
        border: 0,
        borderBottom: `2px solid ${active ? "#0f172a" : "transparent"}`,
        color: active ? "#0f172a" : "#64748b",
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Timeline({ state }: { state: ReceptionState }) {
  const steps: { key: string; label: string; done: boolean; current: boolean }[] = [
    {
      key: "prov",
      label: "Provisoire",
      done: state.provisoire?.status === "FINAL",
      current:
        !!state.provisoire && state.provisoire.status !== "FINAL",
    },
    {
      key: "reserves",
      label: "Réserves",
      done:
        state.provisoire?.status === "FINAL" &&
        state.provisoire.reserves.every((r) => !!r.leveeAt),
      current:
        state.provisoire?.status === "FINAL" &&
        state.provisoire.reserves.some((r) => !r.leveeAt),
    },
    {
      key: "def",
      label: "Définitive",
      done: state.definitive?.status === "FINAL",
      current:
        state.provisoire?.status === "FINAL" &&
        state.provisoire.reserves.every((r) => !!r.leveeAt) &&
        (!state.definitive || state.definitive.status !== "FINAL"),
    },
    {
      key: "ph-demande",
      label: "PH demandé",
      done: state.permisHabiter.status !== "NON_DEMANDE",
      current: state.permisHabiter.status === "NON_DEMANDE" && !!state.provisoire,
    },
    {
      key: "ph-obtenu",
      label: "PH délivré",
      done: state.permisHabiter.status === "DELIVRE",
      current: state.permisHabiter.status === "VISITE_EFFECTUEE",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        overflowX: "auto",
        padding: "8px 0",
      }}
    >
      {steps.map((s, i) => {
        const color = s.done ? "#16a34a" : s.current ? "#0f172a" : "#cbd5e1";
        return (
          <React.Fragment key={s.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: s.done ? color : "#fff",
                  border: `2px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.done ? "#fff" : color,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {s.done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 4, textAlign: "center" }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: steps[i + 1].done || s.done ? "#16a34a" : "#cbd5e1",
                  minWidth: 16,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
