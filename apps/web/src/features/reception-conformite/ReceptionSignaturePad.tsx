/**
 * ReceptionSignaturePad — canvas signature multi-parties (souris + tactile).
 *
 * Mobile : passe en mode plein écran rotate landscape.
 * Pas de dépendance externe.
 */

import React, { useEffect, useRef, useState } from "react";

type Props = {
  width?: number;
  height?: number;
  strokeColor?: string;
  onChange?: (dataUrl: string) => void;
};

export default function ReceptionSignaturePad({
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
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
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
    const last = lastPoint.current ?? p;
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPoint.current = p;
    setEmpty(false);
  };

  const endDraw = () => {
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
    if (onChange) onChange("");
  };

  return (
    <div
      style={{
        border: "1px dashed #94a3b8",
        borderRadius: 8,
        background: "#fff",
        padding: 8,
        userSelect: "none",
        touchAction: "none",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12,
          color: "#475569",
        }}
      >
        <span>{empty ? "Signez ici" : "Signature en cours…"}</span>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={startDraw}
        onPointerMove={moveDraw}
        onPointerUp={endDraw}
        onPointerCancel={endDraw}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          cursor: "crosshair",
          background: "#fff",
          borderRadius: 4,
        }}
      />
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
        Sur mobile, tournez l'écran pour signer en mode paysage.
      </div>
    </div>
  );
}
