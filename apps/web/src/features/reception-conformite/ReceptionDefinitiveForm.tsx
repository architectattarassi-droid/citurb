/**
 * ReceptionDefinitiveForm — réception définitive 1 an après la provisoire.
 *
 * Vérifie que toutes les réserves sont levées + recueille signatures
 * + génère PV définitive (libère retenue de garantie).
 */

import React, { useState } from "react";
import ReceptionSignaturePad from "./ReceptionSignaturePad";
import {
  ReceptionDefinitive,
  ReceptionPresent,
  ReceptionProvisoire,
  receptionApi,
} from "./reception-conformite.api";

type Props = {
  dossierId: string;
  provisoire: ReceptionProvisoire;
  initial?: ReceptionDefinitive | null;
  onFinalized?: (def: ReceptionDefinitive) => void;
};

const S = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: 14, paddingBottom: 100 },
  section: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  } as React.CSSProperties,
  h2: { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
    width: "100%",
  } as React.CSSProperties,
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { fontSize: 12, fontWeight: 600, color: "#475569" } as React.CSSProperties,
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  fab: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  } as React.CSSProperties,
};

export default function ReceptionDefinitiveForm({
  dossierId,
  provisoire,
  initial,
  onFinalized,
}: Props) {
  const reservesNonLevees = provisoire.reserves.filter((r) => !r.leveeAt);
  const allLevees = reservesNonLevees.length === 0;

  const [dateReception, setDateReception] = useState(
    initial?.dateReception ?? new Date().toISOString().slice(0, 10),
  );
  const [presents, setPresents] = useState<ReceptionPresent[]>(
    initial?.presents ?? provisoire.presents,
  );
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [montantLibere, setMontantLibere] = useState(
    initial?.montantRetenueLibereeMAD != null
      ? String(initial.montantRetenueLibereeMAD)
      : "",
  );
  const [signatures, setSignatures] = useState<{ partie: string; dataUrl: string }[]>([]);
  const [defSaved, setDefSaved] = useState<ReceptionDefinitive | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allLevees) {
    return (
      <div style={S.wrap}>
        <div
          style={{
            background: "#fef3c7",
            color: "#854d0e",
            padding: 14,
            borderRadius: 8,
            border: "1px solid #fde68a",
          }}
        >
          <strong>Réception définitive bloquée.</strong>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {reservesNonLevees.length} réserve(s) doivent être levée(s) avant la
            réception définitive.
          </div>
        </div>
      </div>
    );
  }

  const save = async (): Promise<ReceptionDefinitive | null> => {
    setBusy(true);
    setError(null);
    try {
      const def = await receptionApi.upsertDefinitive(dossierId, {
        dateReception,
        presents: presents.filter((p) => p.nom?.trim()),
        observations: observations || null,
        montantRetenueLibereeMAD: montantLibere ? Number(montantLibere) : null,
        validationToutesReservesLevees: true,
      } as any);
      setDefSaved(def);
      return def;
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (signatures.length === 0) {
      setError("Au moins une signature requise");
      return;
    }
    const def = await save();
    if (!def) return;
    setBusy(true);
    try {
      for (const s of signatures) {
        await receptionApi.signDefinitive(dossierId, s.partie, s.dataUrl);
      }
      const finalDef = await receptionApi.finalizeDefinitive(dossierId);
      setDefSaved(finalDef);
      onFinalized?.(finalDef);
    } catch (e: any) {
      setError(e?.message ?? "Erreur finalisation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div
        style={{
          background: "#dcfce7",
          color: "#166534",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Toutes les réserves sont levées. La réception définitive peut être
        prononcée.
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <section style={S.section}>
        <h2 style={S.h2}>Date et présents</h2>
        <div style={S.row}>
          <div>
            <label style={S.label}>Date de réception définitive</label>
            <input
              type="date"
              value={dateReception}
              onChange={(e) => setDateReception(e.target.value)}
              style={S.input}
              disabled={defSaved?.status === "FINAL"}
            />
          </div>
          <div>
            <label style={S.label}>Montant retenue libérée (MAD)</label>
            <input
              type="number"
              value={montantLibere}
              onChange={(e) => setMontantLibere(e.target.value)}
              style={S.input}
              disabled={defSaved?.status === "FINAL"}
              inputMode="numeric"
            />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={S.label}>Observations</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            style={{ ...S.input, minHeight: 80 }}
            disabled={defSaved?.status === "FINAL"}
          />
        </div>
      </section>

      {defSaved?.status !== "FINAL" && (
        <section style={S.section}>
          <h2 style={S.h2}>Signatures</h2>
          {["MOA", "ARCHITECTE", "ENTREPRENEUR"].map((partie) => (
            <div key={partie} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
                {partie}
              </div>
              <ReceptionSignaturePad
                onChange={(dataUrl) => {
                  if (!dataUrl) {
                    setSignatures(signatures.filter((s) => s.partie !== partie));
                  } else {
                    const existing = signatures.find((s) => s.partie === partie);
                    if (existing) {
                      setSignatures(
                        signatures.map((s) => (s.partie === partie ? { partie, dataUrl } : s)),
                      );
                    } else {
                      setSignatures([...signatures, { partie, dataUrl }]);
                    }
                  }
                }}
              />
            </div>
          ))}
        </section>
      )}

      <div style={S.fab}>
        {defSaved?.status === "FINAL" ? (
          <a
            href={receptionApi.pdfDefinitiveUrl(dossierId)}
            target="_blank"
            rel="noopener"
            style={{ ...S.btn, textDecoration: "none" }}
          >
            Voir PV définitive
          </a>
        ) : (
          <button
            type="button"
            onClick={finalize}
            disabled={busy || signatures.length === 0}
            style={S.btn}
          >
            {busy ? "…" : "Générer PV définitive"}
          </button>
        )}
      </div>
    </div>
  );
}
