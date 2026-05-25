import React from "react";
import AppRouter from "../tomes/tome1/AppRouter";
import { AuthProvider } from "../tomes/tome5/AuthProvider";
import { I18nProvider } from "../i18n/i18n";
import { GlobalErrorBoundary } from "../components/error-boundary/GlobalErrorBoundary";

/**
 * Boot minimal.
 * Canonique: /tomes
 *
 * I18nProvider wrappe tout l'arbre pour exposer useT()/useLang()
 * dans n'importe quel composant.
 *
 * GlobalErrorBoundary englobe le tout — un crash React n'affiche plus
 * la page blanche du dimanche mais une ErrorPage soignée avec
 * incidentId à citer au support.
 */
export default function App() {
  return (
    <GlobalErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </I18nProvider>
    </GlobalErrorBoundary>
  );
}
