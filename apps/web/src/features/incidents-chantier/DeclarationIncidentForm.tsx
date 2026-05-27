/**
 * DeclarationIncidentForm.tsx — Wizard 4 étapes mobile-first pour Brahim.
 *
 * Étapes :
 *  1. Type d'incident (cards visuelles)
 *  2. Description (textarea + voice-to-text optionnel via SpeechRecognition)
 *  3. Photos (capture="environment") + géoloc auto
 *  4. Sévérité + envoi (offline-first : queue si pas de réseau)
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  IncidentChantierType,
  IncidentDeclaration,
  IncidentGeoloc,
  IncidentPhoto,
  IncidentSeverite,
  IncidentTypeDef,
  captureCurrentGeoloc,
  enqueueDeclaration,
  incidentsChantierApi,
} from "./incidents-chantier.api";

type Props = {
  dossierId: string;
  onCreated?: (incidentId: string) => void;
  onClose?: () => void;
};

type Step = 1 | 2 | 3 | 4;

const SEV_OPTIONS: { code: IncidentSeverite; label: string; color: string }[] = [
  { code: "INFO", label: "Info", color: "#0369a1" },
  { code: "WARN", label: "Avertissement", color: "#92400e" },
  { code: "CRITICAL", label: "Critique", color: "#991b1b" },
];

export default function DeclarationIncidentForm({
  dossierId,
  onCreated,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [types, setTypes] = useState<IncidentTypeDef[]>([]);
  const [type, setType] = useState<IncidentChantierType | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<IncidentPhoto[]>([]);
  const [geoloc, setGeoloc] = useState<IncidentGeoloc | null>(null);
  const [severite, setSeverite] = useState<IncidentSeverite>("WARN");
  const [blessesNb, setBlessesNb] = useState<string>("");
  const [damage, setDamage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    incidentsChantierApi.meta
      .types()
      .then((r) => setTypes(r.types))
      .catch(() => setTypes([]));
    captureCurrentGeoloc()
      .then((g) => setGeoloc(g))
      .catch(() => undefined);
  }, []);

  const selectedTypeDef = useMemo(
    () => types.find((t) => t.code === type) || null,
    [types, type],
  );

  // Set sévérité par défaut quand on choisit un type
  useEffect(() => {
    if (selectedTypeDef && step === 1) {
      setSeverite(selectedTypeDef.severityDefault);
    }
  }, [selectedTypeDef, step]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(
      (f) =>
        new Promise<IncidentPhoto>((resolve) => {
          const r = new FileReader();
          r.onload = () => {
            resolve({
              url: String(r.result),
              takenAt: new Date().toISOString(),
              geoloc: geoloc || null,
            });
          };
          r.readAsDataURL(f);
        }),
    );
    Promise.all(readers).then((arr) => setPhotos((prev) => [...prev, ...arr]));
  };

  const startVoice = () => {
    const W: any = window;
    const Reco = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Reco) {
      alert("Reconnaissance vocale non supportée sur cet appareil");
      return;
    }
    const reco = new Reco();
    reco.lang = "fr-FR";
    reco.continuous = false;
    reco.interimResults = false;
    setRecording(true);
    reco.onresult = (e: any) => {
      const txt = e?.results?.[0]?.[0]?.transcript || "";
      setDescription((prev) => (prev ? `${prev} ${txt}` : txt));
    };
    reco.onerror = () => setRecording(false);
    reco.onend = () => setRecording(false);
    reco.start();
  };

  const submit = async () => {
    if (!type) return;
    setSubmitting(true);
    setError(null);
    const body: IncidentDeclaration = {
      type,
      description,
      severite,
      photos,
      geoloc,
      dateConstatation: new Date().toISOString(),
      blessesNb: blessesNb ? Number(blessesNb) : undefined,
      montantDommageEstimeMad: damage ? Number(damage) : undefined,
    };
    try {
      const r = await incidentsChantierApi.declare(dossierId, body);
      onCreated?.(r.incident.id);
    } catch (e: any) {
      if (!navigator.onLine || (e && e.status === 0)) {
        const q = enqueueDeclaration(dossierId, body);
        setError(
          `Hors-ligne : déclaration mise en queue (id ${q.id}). Sera envoyée au retour réseau.`,
        );
      } else {
        setError(e?.message || "Erreur d'envoi");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────

  const S = {
    wrap: {
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
      maxWidth: 560,
      maxHeight: "92vh",
      overflowY: "auto" as const,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center" as const,
      marginBottom: 14,
    },
    title: { margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" },
    sub: { margin: "4px 0 0", color: "#64748b", fontSize: 12 },
    stepDots: {
      display: "flex",
      gap: 6,
      justifyContent: "center" as const,
      margin: "12px 0 18px",
    },
    dot: (active: boolean) => ({
      width: active ? 28 : 8,
      height: 8,
      borderRadius: 4,
      background: active ? "#dc2626" : "#cbd5e1",
      transition: "all 200ms ease",
    }),
    cards: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
    },
    typeCard: (selected: boolean, color: string) => ({
      padding: 14,
      borderRadius: 10,
      border: `2px solid ${selected ? color : "#e2e8f0"}`,
      background: selected ? `${color}11` : "#fff",
      cursor: "pointer",
      textAlign: "left" as const,
      transition: "all 120ms ease",
    }),
    textarea: {
      width: "100%",
      minHeight: 140,
      padding: 12,
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 16,
      fontFamily: "inherit",
      resize: "vertical" as const,
      boxSizing: "border-box" as const,
    },
    input: {
      width: "100%",
      padding: 12,
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 16,
      boxSizing: "border-box" as const,
    },
    photoBtn: {
      display: "block",
      padding: "14px",
      background: "#f1f5f9",
      border: "2px dashed #94a3b8",
      borderRadius: 10,
      textAlign: "center" as const,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      color: "#334155",
    },
    sevBtn: (active: boolean, color: string) => ({
      flex: 1,
      padding: 12,
      borderRadius: 8,
      border: `2px solid ${active ? color : "#e2e8f0"}`,
      background: active ? `${color}15` : "#fff",
      color: active ? color : "#475569",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
    }),
    rowBtns: {
      display: "flex",
      gap: 10,
      marginTop: 18,
    },
    secondaryBtn: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#0f172a",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 15,
    },
    primaryBtn: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      border: 0,
      background: "#dc2626",
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 15,
    },
    err: {
      marginTop: 12,
      padding: 10,
      background: "#fef3c7",
      color: "#92400e",
      borderRadius: 8,
      fontSize: 13,
    },
  };

  return (
    <div style={S.wrap} role="dialog" aria-modal>
      <div style={S.panel}>
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Déclarer un incident</h2>
            <p style={S.sub}>Étape {step}/4</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 8,
              border: 0,
              background: "transparent",
              fontSize: 24,
              cursor: "pointer",
              color: "#64748b",
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div style={S.stepDots}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={S.dot(n === step)} />
          ))}
        </div>

        {/* ── Étape 1 : type ─────────────────────────── */}
        {step === 1 && (
          <>
            <div style={S.cards}>
              {types.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setType(t.code)}
                  style={S.typeCard(type === t.code, t.color)}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: t.color,
                      marginBottom: 4,
                    }}
                  >
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Sév. par défaut : {t.severityDefault}
                  </div>
                </button>
              ))}
            </div>
            <div style={S.rowBtns}>
              <button style={S.secondaryBtn} onClick={onClose}>
                Annuler
              </button>
              <button
                style={S.primaryBtn}
                disabled={!type}
                onClick={() => setStep(2)}
              >
                Suivant
              </button>
            </div>
          </>
        )}

        {/* ── Étape 2 : description ─────────────────── */}
        {step === 2 && (
          <>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Que s'est-il passé ?
            </label>
            <textarea
              style={S.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez précisément l'incident, les circonstances, les personnes impliquées…"
              autoFocus
            />
            <button
              type="button"
              onClick={startVoice}
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: recording ? "#dc2626" : "#0f172a",
                color: "white",
                border: 0,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {recording ? "Écoute en cours…" : "Dicter (FR)"}
            </button>
            {selectedTypeDef?.legalText ? (
              <p
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginTop: 14,
                  padding: 10,
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                Info légale : {selectedTypeDef.legalText}
              </p>
            ) : null}
            <div style={S.rowBtns}>
              <button style={S.secondaryBtn} onClick={() => setStep(1)}>
                Retour
              </button>
              <button
                style={S.primaryBtn}
                disabled={description.trim().length < 3}
                onClick={() => setStep(3)}
              >
                Suivant
              </button>
            </div>
          </>
        )}

        {/* ── Étape 3 : photos + geoloc ────────────── */}
        {step === 3 && (
          <>
            <label style={S.photoBtn}>
              Prendre une photo (caméra arrière)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                style={{ display: "none" }}
              />
            </label>
            {photos.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                {photos.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      paddingBottom: "100%",
                      background: "#f1f5f9",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={p.url}
                      alt={`photo ${i}`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: geoloc ? "#dcfce7" : "#fef3c7",
                color: geoloc ? "#166534" : "#92400e",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {geoloc
                ? `Géoloc capturée : ${geoloc.lat.toFixed(5)}, ${geoloc.lng.toFixed(5)}`
                : "Géolocalisation indisponible — l'incident sera enregistré sans coordonnées."}
            </div>
            <div style={S.rowBtns}>
              <button style={S.secondaryBtn} onClick={() => setStep(2)}>
                Retour
              </button>
              <button style={S.primaryBtn} onClick={() => setStep(4)}>
                Suivant
              </button>
            </div>
          </>
        )}

        {/* ── Étape 4 : sévérité + envoi ──────────── */}
        {step === 4 && (
          <>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Sévérité
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {SEV_OPTIONS.map((s) => (
                <button
                  key={s.code}
                  style={S.sevBtn(severite === s.code, s.color)}
                  onClick={() => setSeverite(s.code)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {type === "ACCIDENT_TRAVAIL" && (
              <>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 14,
                    marginBottom: 6,
                  }}
                >
                  Nombre de blessés
                </label>
                <input
                  type="number"
                  min={0}
                  style={S.input}
                  value={blessesNb}
                  onChange={(e) => setBlessesNb(e.target.value)}
                  placeholder="0"
                />
              </>
            )}

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginTop: 14,
                marginBottom: 6,
              }}
            >
              Dommage estimé (MAD)
            </label>
            <input
              type="number"
              min={0}
              style={S.input}
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              placeholder="0"
            />

            {error && <div style={S.err}>{error}</div>}

            <div style={S.rowBtns}>
              <button style={S.secondaryBtn} onClick={() => setStep(3)}>
                Retour
              </button>
              <button
                style={S.primaryBtn}
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
