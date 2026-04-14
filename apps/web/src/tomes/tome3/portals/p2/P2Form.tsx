import React, { useMemo, useState } from "react";
import type { P2InputPayload } from "./p2.types";

type Props = {
  initial?: P2InputPayload;
  disabled?: boolean;
  onSubmit: (payload: P2InputPayload) => void;
  onReset?: () => void;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{label}</div>
      {hint ? <div style={{ fontSize: 12, color: "#777" }}>{hint}</div> : null}
      {children}
    </label>
  );
}

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 14,
    background: disabled ? "#fafafa" : "white",
  };
}

export default function P2Form({ initial, disabled, onSubmit, onReset }: Props) {
  const [city, setCity] = useState(initial?.city ?? "");
  const [zoneCode, setZoneCode] = useState(initial?.zone_code ?? "");
  const [projectType, setProjectType] = useState(initial?.project_type ?? "");

  const [landArea, setLandArea] = useState<string>(initial?.land_area_m2?.toString() ?? "");
  const [builtArea, setBuiltArea] = useState<string>(initial?.built_area_m2?.toString() ?? "");
  const [floors, setFloors] = useState<string>(initial?.floors?.toString() ?? "");

  const [lotId, setLotId] = useState(initial?.lot_id ?? "");
  const [dossierRef, setDossierRef] = useState(initial?.dossier_ref ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // UI-only: minimal technical validation (not business rules)
  const canSubmit = useMemo(() => {
    // Allow submit even if only some inputs exist.
    // In P2, backend should decide what is required; UI only prevents empty POST if you want.
    return true;
  }, []);

  const toNumberOrUndefined = (s: string) => {
    const v = s.trim();
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: P2InputPayload = {
      city: city.trim() || undefined,
      zone_code: zoneCode.trim() || undefined,
      project_type: projectType.trim() || undefined,
      land_area_m2: toNumberOrUndefined(landArea),
      built_area_m2: toNumberOrUndefined(builtArea),
      floors: toNumberOrUndefined(floors),
      lot_id: lotId.trim() || undefined,
      dossier_ref: dossierRef.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14, maxWidth: 860 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>P2 — Investisseur (Simulation)</h2>
        <div style={{ color: "#555" }}>
          UI consumer-only : le backend décide (area/complexity/pricing/vigilance). Le frontend affiche.
        </div>
      </header>

      <section style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 14, background: "#fff" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Contexte</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Ville" hint="Ex: Kénitra, Rabat…">
            <input value={city} onChange={(e) => setCity(e.target.value)} disabled={disabled} style={inputStyle(disabled)} />
          </Field>
          <Field label="Zone / Code" hint="Code zone (si disponible)">
            <input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} disabled={disabled} style={inputStyle(disabled)} />
          </Field>
          <Field label="Type projet" hint="Ex: villa, immeuble, mixte">
            <input value={projectType} onChange={(e) => setProjectType(e.target.value)} disabled={disabled} style={inputStyle(disabled)} />
          </Field>
        </div>
      </section>

      <section style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 14, background: "#fff" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Données principales</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Surface terrain (m²)">
            <input value={landArea} onChange={(e) => setLandArea(e.target.value)} disabled={disabled} inputMode="decimal" style={inputStyle(disabled)} />
          </Field>
          <Field label="Surface construite (m²)">
            <input value={builtArea} onChange={(e) => setBuiltArea(e.target.value)} disabled={disabled} inputMode="decimal" style={inputStyle(disabled)} />
          </Field>
          <Field label="Niveaux / étages">
            <input value={floors} onChange={(e) => setFloors(e.target.value)} disabled={disabled} inputMode="numeric" style={inputStyle(disabled)} />
          </Field>
        </div>
      </section>

      <section style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 14, background: "#fff" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Références (optionnel)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Lot ID">
            <input value={lotId} onChange={(e) => setLotId(e.target.value)} disabled={disabled} style={inputStyle(disabled)} />
          </Field>
          <Field label="Dossier ref">
            <input value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} disabled={disabled} style={inputStyle(disabled)} />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} rows={4} style={{ ...inputStyle(disabled), resize: "vertical" }} />
          </Field>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="submit"
          disabled={disabled}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: disabled ? "#eee" : "#111",
            color: disabled ? "#666" : "white",
            fontWeight: 800,
          }}
        >
          Lancer la simulation
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onReset?.();
          }}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
        >
          Réinitialiser
        </button>
        <span style={{ fontSize: 12, color: "#777" }}>Aucune règle métier n’est appliquée côté UI.</span>
      </div>
    </form>
  );
}
