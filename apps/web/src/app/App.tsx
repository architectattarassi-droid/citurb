import React from "react";
import AppRouter from "../tomes/tome1/AppRouter";
import { AuthProvider } from "../tomes/tome5/AuthProvider";
import { I18nProvider } from "../i18n/i18n";

/**
 * Boot minimal.
 * Canonique: /tomes
 *
 * I18nProvider wrappe tout l'arbre pour exposer useT()/useLang()
 * dans n'importe quel composant.
 */
export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </I18nProvider>
  );
}
