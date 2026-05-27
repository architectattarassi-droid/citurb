/**
 * ReceptionLivraisonModal — MOBILE-FIRST OBLIGATOIRE.
 *
 * Modale plein écran pour la réception physique d'une livraison sur chantier :
 *  - Caméra directe (input file capture="environment")
 *  - Par ligne : qty reçue + bouton "OK" / "Anomalie"
 *  - Signature pad canvas fullscreen (mode édition)
 *  - Bouton "Valider réception" sticky bottom
 *
 * Photos uploadées en base64 (MVP) — l'API pourra remplacer par S3 plus tard.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Commande,
  ReceptionBody,
  livraisonsApi,
  ANOMALIE_LABEL,
  AnomalieType,
} from "./livraisons-materiaux.api";

type Props = {
  commande: Commande;
  open: boolean;
  onClose: () => void;
  onReceived?: (cmd: Commande) => void;
};

type LineState = {
  ligneId: string;
  qtyRecue: number;
  status: "PENDING" | "OK" | "ANOMALIE";
  anomalieType?: AnomalieType;
  anomalieDescription?: string;
  anomaliePhotos: string[];
};

const S = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.92)",
    zIndex: 1000,
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: "14px 16px",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    borderBottom: "1px solid #334155",
  },
  title: { fontSize: 16, fontWeight: 800 },
  closeBtn: {
    background: "transparent",
    color: "#fff",
    border: "1px solid #475569",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 14,
    minHeight: 36,
  } as React.CSSProperties,
  body: {
    flex: 1,
    overflowY: "auto" as const,
    background: "#f8fafc",
    padding: 12,
    paddingBottom: 100,
  },
  section: {
    background: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  } as React.CSSProperties,
  sectionTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 10 },
  cameraBtn: {
    display: "block" as const,
    width: "100%",
    background: "#0f172a",
    color: "#fff",
    padding: "16px 14px",
    fontSize: 16,
    fontWeight: 700,
    border: 0,
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "center" as const,
    minHeight: 56,
  } as React.CSSProperties,
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
    marginTop: 10,
  } as React.CSSProperties,
  photo: {
    width: "100%",
    aspectRatio: "1",
    objectFit: "cover" as const,
    borderRadius: 6,
    border: "1px solid #cbd5e1",
  } as React.CSSProperties,
  lineCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  } as React.CSSProperties,
  lineHead: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  lineLabel: { fontWeight: 700, color: "#0f172a", fontSize: 14 },
  lineSub: { fontSize: 12, color: "#64748b" },
  qtyRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  } as React.CSSProperties,
  qtyInput: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 16,
    minHeight: 44,
    textAlign: "center" as const,
    width: "100%",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  actionsLine: { display: "flex" as const, gap: 6, flexWrap: "wrap" as const },
  btnOk: {
    flex: 1,
    background: "#16a34a",
    color: "#fff",
    border: 0,
    padding: "10px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 44,
  } as React.CSSProperties,
  btnAnom: {
    flex: 1,
    background: "#dc2626",
    color: "#fff",
    border: 0,
    padding: "10px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 44,
  } as React.CSSProperties,
  badgeOk: { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  badgeAnom: { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 },
  anomBlock: { marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e2e8f0" } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minHeight: 44,
    background: "#fff",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minHeight: 80,
    boxSizing: "border-box" as const,
    marginTop: 6,
  } as React.CSSProperties,
  sigPad: {
    border: "2px dashed #94a3b8",
    background: "#fff",
    borderRadius: 10,
    padding: 6,
    touchAction: "none" as const,
    marginTop: 6,
  } as React.CSSProperties,
  sigCanvas: {
    display: "block" as const,
    width: "100%",
    height: 180,
    background: "#fff",
    cursor: "crosshair",
    borderRadius: 6,
  } as React.CSSProperties,
  sigClear: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    marginTop: 6,
  } as React.CSSProperties,
  sticky: {
    position: "sticky" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "#0f172a",
    padding: 12,
    boxShadow: "0 -2px 8px rgba(15,23,42,0.4)",
  } as React.CSSProperties,
  submitBtn: {
    width: "100%",
    background: "#16a34a",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "16px 14px",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    minHeight: 56,
  } as React.CSSProperties,
  err: { background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginTop: 8 },
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function ReceptionLivraisonModal({ commande, open, onClose, onReceived }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [lines, setLines] = useState<LineState[]>([]);
  const [signature, setSignature] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLines(
      commande.lignes.map((l) => ({
        ligneId: l.id,
        qtyRecue: l.qtyDemandee,
        status: "PENDING",
        anomaliePhotos: [],
      })),
    );
    setPhotos([]);
    setSignature("");
    setErr(null);
  }, [open, commande]);

  useEffect(() => {
    if (!open) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, [open]);

  async function onPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const urls = await Promise.all(files.map(fileToDataUrl));
    setPhotos((cur) => [...cur, ...urls]);
    e.target.value = "";
  }

  async function onAnomaliePhoto(ligneId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const urls = await Promise.all(files.map(fileToDataUrl));
    setLines((cur) =>
      cur.map((l) =>
        l.ligneId === ligneId ? { ...l, anomaliePhotos: [...l.anomaliePhotos, ...urls] } : l,
      ),
    );
    e.target.value = "";
  }

  function markLine(ligneId: string, status: "OK" | "ANOMALIE") {
    setLines((cur) =>
      cur.map((l) =>
        l.ligneId === ligneId
          ? {
              ...l,
              status,
              anomalieType: status === "ANOMALIE" ? (l.anomalieType || "QUALITE") : undefined,
            }
          : l,
      ),
    );
  }

  function setLineField<K extends keyof LineState>(ligneId: string, key: K, val: LineState[K]) {
    setLines((cur) => cur.map((l) => (l.ligneId === ligneId ? { ...l, [key]: val } : l)));
  }

  // ── Signature canvas
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const sx = c.width / rect.width;
    const sy = c.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function startSig(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    lastPt.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  function moveSig(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const lp = lastPt.current!;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPt.current = p;
  }

  function endSig() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPt.current = null;
    const c = canvasRef.current;
    if (c) setSignature(c.toDataURL("image/png"));
  }

  function clearSig() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    setSignature("");
  }

  async function submit() {
    setErr(null);
    if (photos.length === 0) {
      setErr("Au moins 1 photo de la livraison requise");
      return;
    }
    if (!signature) {
      setErr("Signature obligatoire");
      return;
    }
    if (lines.some((l) => l.status === "PENDING")) {
      setErr("Marquez chaque ligne : OK conforme ou Anomalie");
      return;
    }

    const qtyRecues: Record<string, number> = {};
    for (const l of lines) qtyRecues[l.ligneId] = l.qtyRecue;

    const anomalies = lines
      .filter((l) => l.status === "ANOMALIE")
      .map((l) => ({
        ligneId: l.ligneId,
        type: l.anomalieType || ("QUALITE" as AnomalieType),
        description: l.anomalieDescription || "Anomalie déclarée sur chantier",
        photos: l.anomaliePhotos,
      }));

    const body: ReceptionBody = {
      dossierId: commande.dossierId,
      photos,
      qtyRecues,
      signatureDataUrl: signature,
      anomalies: anomalies.length > 0 ? anomalies : undefined,
    };

    setSubmitting(true);
    try {
      const cmd = await livraisonsApi.reception(commande.id, body);
      onReceived?.(cmd);
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Échec réception");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true">
      <div style={S.header}>
        <div style={S.title}>Réception chantier · #{commande.id.slice(-8).toUpperCase()}</div>
        <button style={S.closeBtn} onClick={onClose}>Fermer</button>
      </div>

      <div style={S.body}>
        {/* Photos camion + matériaux */}
        <div style={S.section}>
          <div style={S.sectionTitle}>1. Photos camion + matériaux</div>
          <label style={S.cameraBtn as React.CSSProperties}>
            Prendre une photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={onPhotosChange}
              style={{ display: "none" }}
            />
          </label>
          {photos.length > 0 && (
            <div style={S.photoGrid}>
              {photos.map((p, i) => (
                <img key={i} src={p} alt={`Livraison ${i + 1}`} style={S.photo} />
              ))}
            </div>
          )}
        </div>

        {/* Vérification ligne par ligne */}
        <div style={S.section}>
          <div style={S.sectionTitle}>2. Vérification par ligne</div>
          {commande.lignes.map((cl) => {
            const st = lines.find((l) => l.ligneId === cl.id);
            if (!st) return null;
            return (
              <div key={cl.id} style={S.lineCard}>
                <div style={S.lineHead}>
                  <div>
                    <div style={S.lineLabel}>{cl.materialLabel}</div>
                    <div style={S.lineSub}>{cl.materialCode} · demandé {cl.qtyDemandee} {cl.unit}</div>
                  </div>
                  {st.status === "OK" && <span style={S.badgeOk}>OK</span>}
                  {st.status === "ANOMALIE" && <span style={S.badgeAnom}>Anomalie</span>}
                </div>

                <div style={S.qtyRow}>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    style={S.qtyInput}
                    value={st.qtyRecue}
                    onChange={(e) => setLineField(cl.id, "qtyRecue", Number(e.target.value))}
                    aria-label={`Qté reçue ${cl.materialLabel}`}
                  />
                  <span style={S.lineSub}>{cl.unit}</span>
                </div>

                <div style={S.actionsLine}>
                  <button style={S.btnOk} onClick={() => markLine(cl.id, "OK")}>OK conforme</button>
                  <button style={S.btnAnom} onClick={() => markLine(cl.id, "ANOMALIE")}>Anomalie</button>
                </div>

                {st.status === "ANOMALIE" && (
                  <div style={S.anomBlock}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Type d'anomalie</label>
                    <select
                      style={S.select}
                      value={st.anomalieType || "QUALITE"}
                      onChange={(e) => setLineField(cl.id, "anomalieType", e.target.value as AnomalieType)}
                    >
                      {Object.entries(ANOMALIE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <textarea
                      style={S.textarea}
                      placeholder="Description (obligatoire)"
                      value={st.anomalieDescription || ""}
                      onChange={(e) => setLineField(cl.id, "anomalieDescription", e.target.value)}
                    />
                    <label style={{ ...S.cameraBtn, marginTop: 8, fontSize: 14, padding: "10px 12px", minHeight: 40 }}>
                      Photo de l'anomalie
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => onAnomaliePhoto(cl.id, e)}
                        style={{ display: "none" }}
                      />
                    </label>
                    {st.anomaliePhotos.length > 0 && (
                      <div style={S.photoGrid}>
                        {st.anomaliePhotos.map((p, i) => (
                          <img key={i} src={p} alt={`Anomalie ${i + 1}`} style={S.photo} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signature */}
        <div style={S.section}>
          <div style={S.sectionTitle}>3. Signature chef chantier</div>
          <div style={S.sigPad}>
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              style={S.sigCanvas}
              onPointerDown={startSig}
              onPointerMove={moveSig}
              onPointerUp={endSig}
              onPointerLeave={endSig}
              onPointerCancel={endSig}
            />
          </div>
          <button style={S.sigClear} onClick={clearSig}>Effacer la signature</button>
        </div>

        {err && <div style={S.err}>{err}</div>}
      </div>

      <div style={S.sticky}>
        <button style={S.submitBtn} onClick={submit} disabled={submitting}>
          {submitting ? "Envoi…" : "Valider la réception"}
        </button>
      </div>
    </div>
  );
}
