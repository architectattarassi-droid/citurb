import React from "react";

/**
 * ErrorPage — page d'erreur "user-friendly" affichée quand
 * GlobalErrorBoundary attrape un crash React inattendu.
 *
 * Conforme à la doctrine de redaction (Tome @ — T@-R-TRACE-001) :
 * - n'affiche JAMAIS de stack trace au client en production
 * - propose un incidentId court pour que l'utilisateur cite l'erreur au support
 * - en dev (import.meta.env.DEV) un panneau "Détails techniques" devient
 *   disponible pour aider Claude/dev.
 */

export interface ErrorPageProps {
  error: Error | null;
  resetKey: number;
  onReset: () => void;
  incidentId: string;
}

const isDev = (() => {
  try {
    // import.meta accédé sans top-level await pour rester compat TS strict
    // (`vite-env.d.ts` global declare `import.meta.env`)
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
})();

export function ErrorPage({ error, onReset, incidentId }: ErrorPageProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const message = error?.message || "Erreur inattendue";

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--c-bg, #f6f5f0)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        color: "var(--c-ink, #0a0f1e)",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          border: "1px solid var(--c-line, #e2e6ec)",
          borderRadius: 16,
          padding: "32px 24px",
          boxShadow: "0 8px 24px rgba(10,15,30,.09)",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--c-redSoft, #fde8e8)",
            color: "var(--c-red, #8b1c1c)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          !
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            color: "var(--c-blue, #0d3566)",
          }}
        >
          Une erreur est survenue
        </h1>

        <p
          style={{
            margin: "12px 0 4px",
            fontSize: 14,
            color: "var(--c-muted, #566474)",
            lineHeight: 1.55,
          }}
        >
          L'application a rencontré un incident inattendu. Notre équipe a été
          notifiée. Vous pouvez réessayer ou revenir à l'accueil.
        </p>

        <p
          style={{
            margin: "12px 0 24px",
            fontSize: 12,
            color: "var(--c-muted, #566474)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          Référence&nbsp;: <strong>{incidentId}</strong>
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--c-blue, #0d3566)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          <a
            href="/"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid var(--c-line, #e2e6ec)",
              color: "var(--c-ink, #0a0f1e)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              background: "#fff",
            }}
          >
            Retour à l'accueil
          </a>
        </div>

        {isDev && (
          <div style={{ marginTop: 24, textAlign: "left" }}>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "var(--c-muted, #566474)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {showDetails ? "Masquer" : "Afficher"} les détails techniques (dev)
            </button>
            {showDetails && (
              <pre
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  background: "#0a0f1e",
                  color: "#fbbf24",
                  fontSize: 11,
                  lineHeight: 1.5,
                  overflow: "auto",
                  maxHeight: 240,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {message}
                {"\n\n"}
                {error?.stack || "(pas de stack)"}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorPage;
