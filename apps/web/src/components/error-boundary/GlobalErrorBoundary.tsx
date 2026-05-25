import React from "react";
import { ErrorPage } from "./ErrorPage";

/**
 * GlobalErrorBoundary — Error Boundary React top-level.
 *
 * - Attrape les crashes du sous-arbre (render/lifecycle).
 * - Affiche <ErrorPage /> avec un incidentId court à citer au support.
 * - POST optionnel vers /api/telemetry/client-error pour traçabilité OPS
 *   (silencieux si l'endpoint n'existe pas — pas de bruit console pour le user).
 *
 * Conforme Tome @ doctrine de redaction : n'expose pas la stack en prod
 * (cf. ErrorPage qui ne la rend qu'en DEV).
 */

interface State {
  error: Error | null;
  resetKey: number;
  incidentId: string;
}

interface Props {
  children: React.ReactNode;
  /** Optionnel: surcharger le fallback. */
  fallback?: (state: State & { onReset: () => void }) => React.ReactNode;
}

function newIncidentId(): string {
  // 6 chars alphanumériques → facile à lire au téléphone
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i += 1) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `INC-${s}`;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0, incidentId: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, incidentId: newIncidentId() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 1) Log console (dev): seul niveau "error" — le browser peut le filtrer.
    try {
      // eslint-disable-next-line no-console
      console.error("[GlobalErrorBoundary]", error, info.componentStack);
    } catch {
      /* ignore */
    }

    // 2) Best-effort report → API. Pas de await, pas de retry, jamais throw.
    try {
      const payload = {
        incidentId: this.state.incidentId,
        message: error.message,
        // stack tronquée — éviter de pousser des Mo si le composant a planté
        stack: (error.stack || "").slice(0, 4000),
        componentStack: (info.componentStack || "").slice(0, 4000),
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
        ts: Date.now(),
      };
      // sendBeacon survit aux navigations / unloads
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/telemetry/client-error", blob);
      } else if (typeof fetch === "function") {
        void fetch("/api/telemetry/client-error", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          /* silencieux */
        });
      }
    } catch {
      /* ignore — Error Boundary doit rester muet */
    }
  }

  handleReset = (): void => {
    this.setState((s) => ({
      error: null,
      incidentId: "",
      resetKey: s.resetKey + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({
          ...this.state,
          onReset: this.handleReset,
        });
      }
      return (
        <ErrorPage
          error={this.state.error}
          resetKey={this.state.resetKey}
          onReset={this.handleReset}
          incidentId={this.state.incidentId}
        />
      );
    }
    // resetKey force le remount du sous-arbre quand l'utilisateur clique "Réessayer"
    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

export default GlobalErrorBoundary;
