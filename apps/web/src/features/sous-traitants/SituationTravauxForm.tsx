/**
 * SituationTravauxForm — déclaration de situation travaux par le sous-traitant.
 *
 * Mobile-first. Capture photos chantier (géo-tatouées via Geolocation API +
 * timestamp). Slider % avancement + commentaire facultatif.
 *
 * À l'envoi : POST /situation → chef chantier reçoit la situation à valider
 * (qui déclenche le paiement échelonné).
 */

import React, { useEffect, useState } from "react";
import {
  SituationDeclareInput,
  SituationPhoto,
  SousTraitantAssignment,
  sousTraitantsApi,
} from "./sous-traitants.api";

type Props = {
  assignment: SousTraitantAssignment;
  onClose(): void;
  onDeclared(): void;
};

const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 12,
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    maxWidth: 560,
    width: "100%",
    maxHeight: "92vh",
    padding: 20,
    overflowY: "auto" as const,
  },
  title: { margin: 0, marginBottom: 14, fontSize: 18, fontWeight: 800, color: "#0f172a" },
  meta: {
    background: "#f1f5f9",
    padding: 10,
    borderRadius: 6,
    fontSize: 12,
    color: "#475569",
    marginBottom: 12,
  },
  field: { display: "flex" as const, flexDirection: "column" as const, gap: 4, marginBottom: 14 },
  label: { fontSize: 13, color: "#0f172a", fontWeight: 600 },
  slider: { width: "100%" },
  sliderValue: { fontSize: 24, fontWeight: 800, color: "#1e40af", textAlign: "center" as const },
  textarea: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    minHeight: 60,
    resize: "vertical" as const,
  },
  fileInput: {
    border: "1px dashed #cbd5e1",
    borderRadius: 6,
    padding: 10,
    fontSize: 13,
    background: "#f8fafc",
  },
  photoList: { display: "flex" as const, gap: 6, flexWrap: "wrap" as const, marginTop: 8 },
  photoChip: {
    fontSize: 11,
    padding: "4px 8px",
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: 4,
    fontWeight: 600,
  },
  geoOk: { fontSize: 11, color: "#166534", fontWeight: 700 },
  geoErr: { fontSize: 11, color: "#b91c1c", fontWeight: 600 },
  actions: {
    display: "flex" as const,
    gap: 8,
    justifyContent: "flex-end" as const,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
  },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  err: { color: "#b91c1c", fontSize: 12, marginTop: 8 },
};

function getGeoloc(): Promise<{ lat: number; lng: number; accuracyM?: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracyM: p.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 },
    );
  });
}

export default function SituationTravauxForm({ assignment, onClose, onDeclared }: Props) {
  const previousCumul = assignment.situations
    .filter((s) => s.validatedAt)
    .reduce((max, s) => (s.pctAvancement > max ? s.pctAvancement : max), 0);

  const [pct, setPct] = useState<number>(Math.min(100, previousCumul + 10));
  const [comment, setComment] = useState<string>("");
  const [photos, setPhotos] = useState<SituationPhoto[]>([]);
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracyM?: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getGeoloc().then((g) => {
      if (g) setGeo(g);
      else setGeoErr("Géolocalisation indisponible — la situation sera enregistrée sans GPS");
    });
  }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const now = new Date().toISOString();
    Promise.all(
      files.slice(0, 10).map(
        (f) =>
          new Promise<SituationPhoto>((resolve) => {
            const fr = new FileReader();
            fr.onload = () => {
              resolve({
                url: String(fr.result || ""),
                geoloc: geo ?? undefined,
                capturedAt: now,
                caption: f.name,
              });
            };
            fr.readAsDataURL(f);
          }),
      ),
    ).then((arr) => setPhotos([...photos, ...arr]));
  }

  function removePhoto(i: number) {
    setPhotos(photos.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setErr(null);
    if (pct < previousCumul) return setErr(`% inférieur au cumul validé (${previousCumul} %)`);
    if (pct > 100) return setErr("% > 100 impossible");
    setSaving(true);
    try {
      const body: SituationDeclareInput = {
        pctAvancement: pct,
        photos,
        commentaire: comment,
      };
      await sousTraitantsApi.declareSituation(assignment.id, body);
      onDeclared();
    } catch (e: any) {
      setErr(e?.message || "Erreur déclaration");
    } finally {
      setSaving(false);
    }
  }

  const increment = Math.max(0, pct - previousCumul);
  const estimMad = Math.round(
    (increment / 100) * assignment.montantHt * (1 + assignment.tva / 100) * 100,
  ) / 100;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Déclarer une situation travaux</h2>

        <div style={S.meta}>
          Lot {assignment.lotIntitule} · cumul validé précédent : {previousCumul} %
          <br />
          Nouvel acompte estimé : <strong>{estimMad.toFixed(2)} MAD TTC</strong>
        </div>

        <div style={S.field}>
          <label style={S.label}>% d'avancement cumulé</label>
          <div style={S.sliderValue}>{pct} %</div>
          <input
            style={S.slider}
            type="range"
            min={previousCumul}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
          />
        </div>

        <div style={S.field}>
          <label style={S.label}>Photos chantier (géo-tatouées)</label>
          {geo ? (
            <span style={S.geoOk}>
              GPS OK · {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
              {geo.accuracyM ? ` (±${Math.round(geo.accuracyM)} m)` : ""}
            </span>
          ) : geoErr ? (
            <span style={S.geoErr}>{geoErr}</span>
          ) : (
            <span style={{ fontSize: 11, color: "#64748b" }}>Acquisition GPS…</span>
          )}
          <input
            style={S.fileInput}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={onPickFiles}
          />
          <div style={S.photoList}>
            {photos.map((p, i) => (
              <span key={i} style={S.photoChip}>
                {p.caption || `photo-${i + 1}`}
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    marginLeft: 4,
                    background: "transparent",
                    border: 0,
                    color: "#1e40af",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Commentaire</label>
          <textarea
            style={S.textarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Travaux du jour, difficultés, jalons franchis…"
          />
        </div>

        {err ? <div style={S.err}>{err}</div> : null}

        <div style={S.actions}>
          <button style={S.btnGhost} onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button style={S.btn} onClick={submit} disabled={saving}>
            {saving ? "Envoi…" : "Envoyer au chef chantier"}
          </button>
        </div>
      </div>
    </div>
  );
}
