/**
 * LeveeReservesForm — pour chaque réserve : description levée + photos + signature.
 *
 * Affichée après que la réception provisoire soit FINAL et qu'il reste des
 * réserves non levées.
 */

import React, { useState } from "react";
import ReceptionSignaturePad from "./ReceptionSignaturePad";
import {
  Reserve,
  SEVERITE_COLOR,
  fileToBase64,
  receptionApi,
} from "./reception-conformite.api";

type Props = {
  dossierId: string;
  reserves: Reserve[];
  onLevee?: (reserve: Reserve) => void;
};

export default function LeveeReservesForm({ dossierId, reserves, onLevee }: Props) {
  const enCours = reserves.filter((r) => !r.leveeAt);
  const levees = reserves.filter((r) => !!r.leveeAt);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>
        Réserves à lever ({enCours.length})
      </h2>
      {enCours.length === 0 && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Toutes les réserves ont été levées. La réception définitive peut être lancée.
        </div>
      )}
      {enCours.map((r) => (
        <LeveeReserveItem
          key={r.id}
          dossierId={dossierId}
          reserve={r}
          onLevee={onLevee}
        />
      ))}

      {levees.length > 0 && (
        <>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#0f172a",
              margin: "24px 0 8px",
            }}
          >
            Réserves levées ({levees.length})
          </h2>
          {levees.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderLeft: "4px solid #16a34a",
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{r.piece ? `[${r.piece}] ` : ""}</strong>
                  {r.description}
                </div>
                <a
                  href={receptionApi.pdfLeveeUrl(dossierId, r.id)}
                  target="_blank"
                  rel="noopener"
                  style={{ color: "#0369a1", textDecoration: "none", fontSize: 12 }}
                >
                  PV levée
                </a>
              </div>
              {r.leveeDescription && (
                <div style={{ marginTop: 4, color: "#166534" }}>
                  Levée le {new Date(r.leveeAt!).toLocaleDateString("fr-MA")} : {r.leveeDescription}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function LeveeReserveItem({
  dossierId,
  reserve,
  onLevee,
}: {
  dossierId: string;
  reserve: Reserve;
  onLevee?: (r: Reserve) => void;
}) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sigDataUrl, setSigDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { base64, mime } = await fileToBase64(file);
      const res = await receptionApi.uploadPhoto(dossierId, {
        contentBase64: base64,
        mimeType: mime,
        filenameHint: file.name,
        bucket: `levee/${reserve.id}`,
      });
      setPhotos([...photos, res.url]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!description.trim()) {
      setError("Description requise");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await receptionApi.leveeReserve(dossierId, {
        reserveId: reserve.id,
        descriptionLevee: description,
        preuvePhotos: photos,
        signature: sigDataUrl
          ? {
              partie: "Responsable levée",
              dataUrl: sigDataUrl,
              signedAt: new Date().toISOString(),
            }
          : null,
      });
      onLevee?.(updated);
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const sev = SEVERITE_COLOR[reserve.severite];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${reserve.severite === "BLOQUANTE" ? "#dc2626" : reserve.severite === "MAJEURE" ? "#f97316" : "#facc15"}`,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {reserve.piece ? `[${reserve.piece}] ` : ""}
            {reserve.description}
          </div>
          {reserve.deadline && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Échéance : {new Date(reserve.deadline).toLocaleDateString("fr-MA")}
            </div>
          )}
        </div>
        <span
          style={{
            background: sev.bg,
            color: sev.fg,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {sev.label}
        </span>
      </div>
      {error && (
        <div style={{ color: "#991b1b", fontSize: 12, marginTop: 6 }}>{error}</div>
      )}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
          Description de la levée
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 13,
            minHeight: 60,
            marginTop: 4,
          }}
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
          Photos preuve ({photos.length})
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          style={{ display: "block", marginTop: 4 }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
          {photos.map((u, i) => (
            <img
              key={i}
              src={u}
              alt=""
              style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }}
            />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>
          Signature responsable
        </label>
        <ReceptionSignaturePad onChange={setSigDataUrl} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "…" : "Marquer comme levée"}
        </button>
      </div>
    </div>
  );
}
