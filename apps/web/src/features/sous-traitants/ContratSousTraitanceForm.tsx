/**
 * ContratSousTraitanceForm — aperçu + génération + signature contrat loi 32-99.
 *
 * Workflow :
 *   1. Génération (POST /contrat) → HTML imprimable + hash SHA-256
 *   2. Aperçu (iframe srcDoc) + bouton "Imprimer / PDF"
 *   3. Signature canvas → POST /contrat/sign (data URL PNG base64)
 */

import React, { useEffect, useRef, useState } from "react";
import {
  SousTraitantAssignment,
  sousTraitantsApi,
} from "./sous-traitants.api";

type Props = {
  assignment: SousTraitantAssignment;
  onClose(): void;
  onSigned(): void;
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
    maxWidth: 880,
    width: "100%",
    maxHeight: "92vh",
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  header: {
    padding: "14px 18px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" },
  body: { padding: 18, overflowY: "auto" as const, flex: 1 },
  iframe: {
    width: "100%",
    minHeight: 360,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
  } as React.CSSProperties,
  toolbar: {
    display: "flex" as const,
    gap: 8,
    flexWrap: "wrap" as const,
    marginBottom: 12,
  },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  hashBox: {
    background: "#f1f5f9",
    padding: "8px 10px",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#475569",
    wordBreak: "break-all" as const,
    marginTop: 10,
  },
  signSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid #e2e8f0",
  },
  canvas: {
    border: "1px dashed #94a3b8",
    borderRadius: 8,
    background: "#fff",
    touchAction: "none" as const,
    width: "100%",
    height: 160,
    display: "block" as const,
  } as React.CSSProperties,
  err: { color: "#b91c1c", fontSize: 12, marginTop: 8 },
  ok: { color: "#166534", fontSize: 13, fontWeight: 700, marginTop: 8 },
};

export default function ContratSousTraitanceForm({ assignment, onClose, onSigned }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(assignment.contratHash ?? null);
  const [signedAt, setSignedAt] = useState<string | null>(assignment.contratSignedAt ?? null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);

  useEffect(() => {
    if (assignment.contratPdfUrl) {
      // déjà généré — on relance pour récupérer l'HTML stable (idempotent server-side)
      generate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(silent = false) {
    if (signedAt) return;
    setErr(null);
    if (!silent) setLoading(true);
    try {
      const r = await sousTraitantsApi.generateContrat(assignment.id);
      setHtml(r.html);
      setHash(r.assignment.contratHash ?? null);
    } catch (e: any) {
      if (!silent) setErr(e?.message || "Erreur génération contrat");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function pointerStart(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;
    drawingRef.current = true;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height);
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
    ctx.lineCap = "round";
    ctx.lineTo(((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height);
    ctx.stroke();
  }
  function pointerEnd() {
    drawingRef.current = false;
  }
  function clearSignature() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
  }

  function isCanvasEmpty(): boolean {
    const c = canvasRef.current;
    if (!c) return true;
    const ctx = c.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
    return true;
  }

  async function sign() {
    setErr(null);
    const c = canvasRef.current;
    if (!c) return;
    if (isCanvasEmpty()) return setErr("Signez avant d'envoyer");
    setSigning(true);
    try {
      const dataUrl = c.toDataURL("image/png");
      const r = await sousTraitantsApi.signContrat(assignment.id, dataUrl);
      setSignedAt(r.assignment.contratSignedAt ?? new Date().toISOString());
      onSigned();
    } catch (e: any) {
      setErr(e?.message || "Erreur signature");
    } finally {
      setSigning(false);
    }
  }

  function printPdf() {
    if (!html) return;
    const w = window.open("", "_blank", "width=900,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <h2 style={S.title}>
            Contrat sous-traitance · loi 32-99 · {assignment.supplierCabinet}
          </h2>
          <button style={S.btnGhost} onClick={onClose}>
            Fermer
          </button>
        </div>

        <div style={S.body}>
          <div style={S.toolbar}>
            {!html ? (
              <button style={S.btn} onClick={() => generate(false)} disabled={loading}>
                {loading ? "Génération…" : "Générer aperçu"}
              </button>
            ) : (
              <>
                <button style={S.btnGhost} onClick={printPdf}>
                  Imprimer / PDF
                </button>
                <button style={S.btnGhost} onClick={() => generate(false)} disabled={loading}>
                  Régénérer
                </button>
              </>
            )}
          </div>

          {html ? (
            <iframe
              title="contrat-preview"
              srcDoc={html}
              style={S.iframe}
              sandbox="allow-same-origin allow-popups"
            />
          ) : null}

          {hash ? (
            <div style={S.hashBox}>
              Empreinte probatoire SHA-256 :<br />
              {hash}
            </div>
          ) : null}

          <div style={S.signSection}>
            <h3 style={{ ...S.title, marginBottom: 8 }}>Signature électronique</h3>
            {signedAt ? (
              <div style={S.ok}>
                Contrat signé le {new Date(signedAt).toLocaleString("fr-FR")}
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={160}
                  style={S.canvas}
                  onPointerDown={pointerStart}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerEnd}
                  onPointerLeave={pointerEnd}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={S.btnGhost} onClick={clearSignature} disabled={signing}>
                    Effacer
                  </button>
                  <button style={S.btn} onClick={sign} disabled={signing || !html}>
                    {signing ? "Signature…" : "Signer le contrat"}
                  </button>
                </div>
              </>
            )}
            {err ? <div style={S.err}>{err}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
