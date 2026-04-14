import React from "react";
import AppRouter from "../tomes/tome1/AppRouter";
import { AuthProvider } from "../tomes/tome5/AuthProvider";

/**
 * Boot minimal.
 * Canonique: /tomes
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
