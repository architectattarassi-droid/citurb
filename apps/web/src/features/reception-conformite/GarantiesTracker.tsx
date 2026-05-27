/**
 * GarantiesTracker — 3 cards (Parfait achèvement / Biennale / Décennale).
 *
 * Affiche date début, date fin, countdown + bouton "Déclarer sinistre".
 * Mobile : swipeable horizontal scroll-snap. Push notif J-30 expiration
 * via le cron côté serveur (cf. INTEGRATION.md).
 */

import React, { useState } from "react";
import {
  GARANTIE_LABEL,
  GarantieActive,
  GarantieType,
  Sinistre,
  fileToBase64,
  receptionApi,
} from "./reception-conformite.api";

type Props = {
  dossierId: string;
  garanties: GarantieActive[];
  sinistres: Sinistre[];
  onSinistreDeclared?: (s: Sinistre) => void;
};

export default function GarantiesTracker({
  dossierId,
  garanties,
  sinistres,
  onSinistreDeclared,
}: Props) {
  if (garanties.length === 0) {
    return (
      <div
        style={{
          background: "#f8fafc",
          color: "#475569",
          padding: 14,
          borderRadius: 10,
          fontSize: 13,
        }}
      >
        Les garanties seront actives dès la finalisation de la réception
        provisoire.
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>
        Garanties légales actives
      </h2>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 6,
        }}
      >
        {garanties.map((g) => (
          <GarantieCard
            key={g.type}
            dossierId={dossierId}
            garantie={g}
            sinistres={sinistres.filter((s) => s.garantieType === g.type)}
            onSinistreDeclared={onSinistreDeclared}
          />
        ))}
      </div>

      {sinistres.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
            Historique sinistres ({sinistres.length})
          </h3>
          {sinistres.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: 10,
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{GARANTIE_LABEL[s.garantieType].label}</strong>
                <span style={{ color: "#64748b" }}>
                  {new Date(s.dateDeclaration).toLocaleDateString("fr-MA")}
                </span>
              </div>
              <div style={{ color: "#334155", marginTop: 2 }}>{s.description}</div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  padding: "2px 8px",
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GarantieCard({
  dossierId,
  garantie,
  sinistres,
  onSinistreDeclared,
}: {
  dossierId: string;
  garantie: GarantieActive;
  sinistres: Sinistre[];
  onSinistreDeclared?: (s: Sinistre) => void;
}) {
  const meta = GARANTIE_LABEL[garantie.type];
  const [open, setOpen] = useState(false);

  const status = garantie.expiree
    ? { bg: "#fee2e2", fg: "#991b1b", label: "Expirée" }
    : garantie.alerte30j
    ? { bg: "#fed7aa", fg: "#9a3412", label: `J-${garantie.expireDansJours}` }
    : { bg: "#dcfce7", fg: "#166534", label: "Active" };

  return (
    <div
      style={{
        minWidth: 280,
        maxWidth: 320,
        flex: "0 0 280px",
        scrollSnapAlign: "start",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${
          garantie.type === "DECENNALE"
            ? "#0f172a"
            : garantie.type === "BIENNALE"
            ? "#3b82f6"
            : "#16a34a"
        }`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1 }}>
            {meta.duree.toUpperCase()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
            {meta.label}
          </div>
        </div>
        <span
          style={{
            background: status.bg,
            color: status.fg,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {status.label}
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
        Du {new Date(garantie.dateDebut).toLocaleDateString("fr-MA")}
        <br />
        au {new Date(garantie.dateFin).toLocaleDateString("fr-MA")}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "#475569",
          background: "#f8fafc",
          padding: 8,
          borderRadius: 6,
        }}
      >
        {meta.desc}
      </div>

      {sinistres.length > 0 && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            background: "#fef3c7",
            padding: 6,
            borderRadius: 6,
            color: "#854d0e",
          }}
        >
          {sinistres.length} sinistre(s) déclaré(s)
        </div>
      )}

      {!garantie.expiree && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            marginTop: 10,
            width: "100%",
            background: "#0f172a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Déclarer un sinistre
        </button>
      )}

      {open && (
        <SinistreModal
          dossierId={dossierId}
          garantieType={garantie.type}
          onClose={() => setOpen(false)}
          onDeclared={(s) => {
            onSinistreDeclared?.(s);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SinistreModal({
  dossierId,
  garantieType,
  onClose,
  onDeclared,
}: {
  dossierId: string;
  garantieType: GarantieType;
  onClose: () => void;
  onDeclared: (s: Sinistre) => void;
}) {
  const [description, setDescription] = useState("");
  const [dateConst, setDateConst] = useState(new Date().toISOString().slice(0, 10));
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { base64, mime } = await fileToBase64(file);
      const res = await receptionApi.uploadPhoto(dossierId, {
        contentBase64: base64,
        mimeType: mime,
        filenameHint: file.name,
        bucket: `sinistre/${garantieType}`,
      });
      setPhotos([...photos, res.url]);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur upload");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (!description.trim()) {
      setErr("Description requise");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const s = await receptionApi.declareSinistre(dossierId, {
        garantieType,
        description,
        photos,
        dateConstatation: dateConst,
      });
      onDeclared(s);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 18,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
          Déclarer un sinistre · {GARANTIE_LABEL[garantieType].label}
        </h3>
        {err && (
          <div style={{ color: "#991b1b", fontSize: 12, marginBottom: 8 }}>{err}</div>
        )}
        <label style={{ fontSize: 12, fontWeight: 600 }}>Date de constatation</label>
        <input
          type="date"
          value={dateConst}
          onChange={(e) => setDateConst(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: 8,
            marginTop: 4,
            marginBottom: 10,
          }}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>Description du désordre</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: 8,
            marginTop: 4,
            marginBottom: 10,
            minHeight: 80,
          }}
        />
        <label style={{ fontSize: 12, fontWeight: 600 }}>Photos preuve</label>
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
              style={{
                width: 70,
                height: 70,
                objectFit: "cover",
                borderRadius: 4,
                border: "1px solid #e2e8f0",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {busy ? "…" : "Déclarer le sinistre"}
          </button>
        </div>
      </div>
    </div>
  );
}
