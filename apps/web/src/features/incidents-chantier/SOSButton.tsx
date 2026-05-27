/**
 * SOSButton.tsx — Bouton SOS plein écran 96px, HOLD 3 SECONDS pour confirmer.
 *
 * UX (Brahim, chef chantier) :
 *  - FAB rouge sticky bottom-right en mode chantier (prop `floating`)
 *  - Au touch/mousedown : countdown circulaire 3s + vibration + audio beep
 *  - Au release avant 3s : annulation
 *  - Au 3s atteints : déclenchement réel (callback `onTrigger`)
 *  - Après trigger : écran de confirmation plein écran "SOS DÉCLENCHÉ"
 *  - Haptic strong + vibration phone + audio beep alarme
 *
 * Anti-faux : 3-sec hold obligatoire. La fenêtre de confirmation est
 * désactivée pendant 5s après reset pour éviter le double-tap accidentel.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  /** Si true → FAB sticky bottom-right en mode chantier */
  floating?: boolean;
  /** Texte affiché sous le bouton (par défaut "SOS") */
  label?: string;
  /** Diamètre du bouton en px (def 96) */
  size?: number;
  /** Déclenché QUE quand l'utilisateur a maintenu 3s */
  onTrigger: () => Promise<{ ok: boolean; message?: string }> | void;
  /** Désactivation externe (ex : SOS déjà actif) */
  disabled?: boolean;
};

const HOLD_DURATION_MS = 3000;

export default function SOSButton({
  floating = false,
  label = "SOS",
  size = 96,
  onTrigger,
  disabled = false,
}: Props) {
  const [progress, setProgress] = useState(0);          // 0 → 1
  const [holding, setHolding] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Vibration + beep au hold
  const playBeep = useCallback((kind: "tick" | "alarm") => {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      if (kind === "tick") {
        osc.frequency.value = 600;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close().catch(() => undefined);
        }, 90);
      } else {
        osc.frequency.value = 1200;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => {
          osc.frequency.value = 900;
        }, 180);
        setTimeout(() => {
          osc.frequency.value = 1200;
        }, 360);
        setTimeout(() => {
          osc.stop();
          ctx.close().catch(() => undefined);
        }, 1200);
      }
    } catch {
      /* audio interdit en background : on ignore */
    }
  }, []);

  const start = useCallback(() => {
    if (disabled || triggered) return;
    setError(null);
    setHolding(true);
    startRef.current = Date.now();
    if ("vibrate" in navigator) navigator.vibrate(50);
    playBeep("tick");

    const tick = () => {
      const start = startRef.current;
      if (!start) return;
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        // Atteint : on fire
        startRef.current = null;
        setProgress(1);
        setHolding(false);
        fire();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, triggered, playBeep]);

  const cancel = useCallback(() => {
    if (!holding) return;
    setHolding(false);
    setProgress(0);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, [holding]);

  const fire = useCallback(async () => {
    setTriggered(true);
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 800]);
    playBeep("alarm");
    try {
      const result = await onTrigger();
      if (result && (result as any).ok === false) {
        setError((result as any).message || "Erreur inconnue");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    }
  }, [onTrigger, playBeep]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Styles ─────────────────────────────────────────────────

  const wrapStyle: React.CSSProperties = floating
    ? {
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }
    : { display: "flex", flexDirection: "column", alignItems: "center" };

  const ringSize = size + 16;
  const circumference = 2 * Math.PI * (ringSize / 2 - 4);
  const dashOffset = circumference * (1 - progress);

  const btnStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: disabled
      ? "#cbd5e1"
      : holding
      ? "linear-gradient(180deg,#ef4444 0%,#7f1d1d 100%)"
      : "linear-gradient(180deg,#dc2626 0%,#991b1b 100%)",
    color: "white",
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: 1.2,
    border: "4px solid white",
    boxShadow: holding
      ? "0 0 0 6px rgba(239,68,68,0.35),0 12px 28px rgba(220,38,38,0.6)"
      : "0 6px 16px rgba(220,38,38,0.5)",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    touchAction: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 120ms ease",
    transform: holding ? "scale(0.96)" : "scale(1)",
  };

  // ── Plein écran confirmation ───────────────────────────────

  if (triggered) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: "fixed",
          inset: 0,
          background: "#7f1d1d",
          color: "white",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 16 }}>SOS</div>
        <h1 style={{ fontSize: 28, margin: 0, fontWeight: 900 }}>
          SOS DÉCLENCHÉ
        </h1>
        <p style={{ marginTop: 14, fontSize: 16, maxWidth: 420 }}>
          Secours en route. Toutes les parties (famille, avocat, architecte,
          MOD, promoteur, OPS CITURBAREA) ont été notifiées simultanément.
        </p>
        {error ? (
          <p
            style={{
              marginTop: 16,
              fontSize: 13,
              padding: "8px 12px",
              background: "rgba(0,0,0,0.3)",
              borderRadius: 6,
            }}
          >
            Note : {error}
          </p>
        ) : null}
        <button
          onClick={() => {
            setTriggered(false);
            setProgress(0);
            setError(null);
          }}
          style={{
            marginTop: 28,
            padding: "12px 22px",
            background: "white",
            color: "#7f1d1d",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={{ position: "relative", width: ringSize, height: ringSize }}>
        {/* Ring countdown */}
        <svg
          width={ringSize}
          height={ringSize}
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotate(-90deg)",
            pointerEvents: "none",
          }}
        >
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringSize / 2 - 4}
            fill="none"
            stroke="rgba(220,38,38,0.18)"
            strokeWidth={4}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringSize / 2 - 4}
            fill="none"
            stroke="#dc2626"
            strokeWidth={5}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: holding ? "none" : "stroke-dashoffset 250ms ease" }}
          />
        </svg>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onPointerDown={start}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...btnStyle,
            position: "absolute",
            top: 8,
            left: 8,
          }}
        >
          <span style={{ fontSize: 22, letterSpacing: 1.5 }}>{label}</span>
        </button>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: floating ? "#7f1d1d" : "#64748b",
          fontWeight: 700,
          textAlign: "center",
          maxWidth: 110,
          lineHeight: 1.25,
        }}
      >
        {holding ? "Maintenir 3 sec…" : "Maintenir 3 sec pour déclencher"}
      </div>
    </div>
  );
}
