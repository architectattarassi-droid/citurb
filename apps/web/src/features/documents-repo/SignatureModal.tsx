/**
 * SignatureModal — canvas plein écran (touch + souris) pour signer un document.
 *
 * Mobile-first : full-screen, rotate landscape suggéré, trait lissé mid-point.
 * Capture optionnelle de la géoloc navigateur (Geolocation API).
 */
import React, { useEffect, useRef, useState } from "react";
import type { Document } from "./documents-repo.api";

type Props = {
  doc: Document;
  defaultRole?: string;
  onClose: () => void;
  onSubmit: (payload: {
    dataUrl: string;
    signerRole: string;
    signerName: string;
    signerEmail?: string;
    geoLat?: number | null;
    geoLng?: number | null;
  }) => Promise<void> | void;
};

const ROLES = [
  "CLIENT",
  "ARCHITECTE",
  "MOD",
  "BET",
  "ENTREPRENEUR",
  "SOUS_TRAITANT",
  "OPS",
  "AUTRE",
];

const S = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.85)",
    zIndex: 9999,
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: "12px 16px",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    fontWeight: 600,
  },
  body: {
    flex: 1,
    background: "#fff",
    padding: 12,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
    overflow: "auto" as const,
  },
  meta: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  field: { display: "flex" as const, flexDirection: "column" as const, gap: 4, minWidth: 160, flex: 1 },
  label: { fontSize: 12, color: "#475569", fontWeight: 600 },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
  },
  canvasWrap: {
    flex: 1,
    minHeight: 220,
    border: "1px dashed #94a3b8",
    borderRadius: 8,
    background: "#fff",
    position: "relative" as const,
    touchAction: "none" as const,
    userSelect: "none" as const,
  },
  canvas: { display: "block" as const, width: "100%", height: "100%", touchAction: "none" as const, cursor: "crosshair" as const },
  toolbar: { display: "flex" as const, justifyContent: "space-between" as const, gap: 8, marginTop: 8 },
  btn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 6,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#fff",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: { fontSize: 12, color: "#64748b" },
  error: { color: "#991b1b", fontSize: 13 },
};

/** Modale signature plein écran. */
export default function SignatureModal({ doc, defaultRole = "CLIENT", onClose, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [empty, setEmpty] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState(defaultRole);
  const [signerEmail, setSignerEmail] = useState("");
  const [includeGeo, setIncludeGeo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resize-aware canvas (HiDPI).
  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const lp = lastPoint.current!;
    const mid = { x: (lp.x + p.x) / 2, y: (lp.y + p.y) / 2 };
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.quadraticCurveTo(lp.x, lp.y, mid.x, mid.y);
    ctx.stroke();
    lastPoint.current = p;
    if (empty) setEmpty(false);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
  };

  const reset = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const captureGeo = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!includeGeo || !("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    });
  };

  const submit = async () => {
    setError(null);
    if (empty) {
      setError("Veuillez signer avant de valider.");
      return;
    }
    if (!signerName.trim()) {
      setError("Nom du signataire requis.");
      return;
    }
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    setSubmitting(true);
    try {
      const geo = await captureGeo();
      await onSubmit({
        dataUrl,
        signerRole,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
        geoLat: geo?.lat ?? null,
        geoLng: geo?.lng ?? null,
      });
    } catch (e: any) {
      setError(e?.message ?? "Échec de la signature");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label="Signature">
      <div style={S.header}>
        <span>Signer · {doc.title}</span>
        <button type="button" style={{ ...S.btn, background: "transparent", color: "#fff", border: "1px solid #475569" }} onClick={onClose}>
          Fermer
        </button>
      </div>
      <div style={S.body}>
        <div style={S.meta}>
          <div style={S.field}>
            <label style={S.label} htmlFor="sig-name">Nom complet</label>
            <input
              id="sig-name"
              style={S.input}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ex. M. Yassine Attarassi"
              autoComplete="name"
            />
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="sig-role">Rôle</label>
            <select
              id="sig-role"
              style={S.input}
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.label} htmlFor="sig-email">Email (optionnel)</label>
            <input
              id="sig-email"
              type="email"
              style={S.input}
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="email@exemple.ma"
              autoComplete="email"
            />
          </div>
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#475569" }}>
          <input type="checkbox" checked={includeGeo} onChange={(e) => setIncludeGeo(e.target.checked)} />
          Inclure ma position GPS (preuve probatoire renforcée)
        </label>

        <div ref={wrapRef} style={S.canvasWrap}>
          <canvas
            ref={canvasRef}
            style={S.canvas}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            onPointerCancel={endDraw}
          />
        </div>
        <div style={S.hint}>
          {empty ? "Signez ci-dessus avec votre doigt ou la souris" : "Signature capturée — vérifiez et validez"}
        </div>
        {error ? <div style={S.error}>{error}</div> : null}

        <div style={S.toolbar}>
          <button type="button" style={S.btnDanger} onClick={reset} disabled={submitting}>
            Effacer
          </button>
          <button type="button" style={S.btnPrimary} onClick={submit} disabled={submitting}>
            {submitting ? "Signature en cours…" : "Valider la signature"}
          </button>
        </div>
      </div>
    </div>
  );
}
