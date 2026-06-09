/**
 * errorStates.tsx — Composants partagés d'état (loading / erreur / vide)
 * pour les pages dossier-phases.
 *
 * Style aligné sur design system CC (ivoire/navy/or). Messages user-friendly
 * (pas de stack trace, pas de "HTTP 404" brut).
 */
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { CC } from "../../command-center/theme/tokens";

interface ErrorStateProps {
  title: string;
  message?: string;
  details?: string[];
  onBack?: () => void;
  onRetry?: () => void;
  backLabel?: string;
  /** Si fourni, ajoute un lien vers /login (cas session expirée). */
  showLoginLink?: boolean;
}

export function ErrorState({
  title, message, details, onBack, onRetry, backLabel = "Retour",
  showLoginLink,
}: ErrorStateProps) {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{
        maxWidth: 480, width: "100%",
        background: CC.color.bgRaised,
        border: `1px solid ${CC.color.border}`,
        borderRadius: CC.size.radiusLg,
        padding: "32px 36px",
        boxShadow: CC.shadow.soft,
        textAlign: "center" as const,
      }}>
        {/* Marque or */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: CC.color.orSoft, color: CC.color.or,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 600, margin: "0 auto 16px",
          fontFamily: CC.font.display,
        }}>
          !
        </div>

        <h1 style={{
          fontFamily: CC.font.display, fontSize: 22, fontWeight: 600,
          color: CC.color.navy, margin: "0 0 10px",
        }}>
          {title}
        </h1>

        {message && (
          <p style={{
            color: CC.color.inkMid, fontSize: 14, lineHeight: 1.55,
            margin: "0 0 18px", fontFamily: CC.font.body,
          }}>
            {message}
          </p>
        )}

        {details && details.length > 0 && (
          <ul style={{
            textAlign: "left" as const, color: CC.color.inkMid, fontSize: 12,
            background: CC.color.bgSoft, padding: "10px 14px 10px 28px",
            borderRadius: CC.size.radiusSm, marginBottom: 18,
            fontFamily: CC.font.mono,
          }}>
            {details.map((d, i) => <li key={i} style={{ marginBottom: 2 }}>{d}</li>)}
          </ul>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" as const }}>
          {onBack && (
            <button onClick={onBack} style={btnPrimary}>
              ← {backLabel}
            </button>
          )}
          {onRetry && (
            <button onClick={onRetry} style={btnSecondary}>
              Réessayer
            </button>
          )}
          {showLoginLink && (
            <Link to="/login" style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>
              Se reconnecter
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Chargement…" }: LoadingStateProps) {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ textAlign: "center" as const }}>
        <div style={{
          display: "inline-block", width: 28, height: 28, borderRadius: "50%",
          border: `2px solid ${CC.color.border}`,
          borderTopColor: CC.color.or,
          animation: "ccSpin 0.8s linear infinite",
          marginBottom: 12,
        }} />
        <div style={{ color: CC.color.inkMid, fontSize: 13, fontFamily: CC.font.body }}>
          {message}
        </div>
        <style>{`@keyframes ccSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─── Boutons ─────────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: CC.size.radiusSm,
  border: "none",
  background: CC.color.navy,
  color: CC.color.inkOnDark,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: CC.font.body,
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: CC.size.radiusSm,
  border: `1px solid ${CC.color.border}`,
  background: CC.color.bgRaised,
  color: CC.color.navy,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: CC.font.body,
};

// ─── Helper pour mapper code HTTP → titre + sub-message user-friendly ────────

export function humanizeError(
  status: number,
  fallbackMessage: string,
): { title: string; message: string; showLoginLink: boolean } {
  if (status === 401) {
    return {
      title: "Session expirée",
      message: "Votre session n'est plus valide. Veuillez vous reconnecter pour continuer.",
      showLoginLink: true,
    };
  }
  if (status === 403) {
    return {
      title: "Accès refusé",
      message: "Vous n'avez pas l'autorisation d'accéder à ce dossier.",
      showLoginLink: false,
    };
  }
  if (status === 404) {
    return {
      title: "Dossier introuvable",
      message: "Ce dossier n'existe pas ou a été supprimé. Vérifiez l'URL.",
      showLoginLink: false,
    };
  }
  if (status === 422) {
    return {
      title: "Dossier non conforme",
      message: "Ce dossier n'est pas conforme au catalogue de phases en vigueur. Un administrateur doit le mettre à jour avant qu'il puisse être affiché.",
      showLoginLink: false,
    };
  }
  return {
    title: "Une erreur est survenue",
    message: fallbackMessage,
    showLoginLink: false,
  };
}
