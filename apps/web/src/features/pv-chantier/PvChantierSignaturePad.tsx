/**
 * PvChantierSignaturePad — canvas signature mobile-friendly (touch + souris).
 *
 * Pas de dépendance externe. Trait lissé minimal via mid-point smoothing.
 * Expose dataUrl PNG via onChange + reset.
 */

import React, { useEffect, useRef, useState } from "react";

type Props = {
  width?: number;
  height?: number;
  /** Couleur du trait. */
  strokeColor?: string;
  /** Notifie le data-URL PNG à chaque changement (vide string si reset). */
  onChange?: (dataUrl: string) => void;
};

const S = {
  wrap: {
    border: "1px dashed #94a3b8",
    borderRadius: 8,
    background: "#ffffff",
    padding: 8,
    userSelect: "none" as const,
    touchAction: "none" as const,
    position: "relative" as const,
  },
  toolbar: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 6,
    fontSize: 12,
    color: "#475569",
  },
  btn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  canvas: {
    display: "block" as const,
    width: "100%",
    height: "auto",
    cursor: "crosshair",
    background:
      "linear-gradient(transparent calc(100% - 1px), rgba(15,23,42,0.06) 0)",
  },
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
};

export default function PvChantierSignaturePad({
  width = 480,
  height = 180,
  strokeColor = "#0f172a",
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
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
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
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
    const c = canvasRef.current;
    if (c && onChange) onChange(c.toDataURL("image/png"));
  };

  const reset = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange?.("");
  };

  return (
    <div style={S.wrap}>
      <div style={S.toolbar}>
        <span>Signature au doigt ou à la souris</span>
        <button type="button" style={S.btn} onClick={reset}>
          Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={S.canvas}
        onPointerDown={startDraw}
        onPointerMove={moveDraw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        onPointerCancel={endDraw}
      />
      <div style={S.hint}>{empty ? "Aucune signature" : "Signature capturée"}</div>
    </div>
  );
}
