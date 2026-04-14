import React from "react";
import { Link } from "react-router-dom";

/**
 * P1 — Offers + Tunnel
 *
 * NOTE doctrine: frontend must not calculate entitlements/doors.
 * This component is a pure UI entrypoint that routes the user
 * to the authenticated P1 tunnel.
 */
export default function P1OffersAndTunnel() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">P1 — Parcours &amp; Offre</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Démarrez le tunnel P1. L’accès réel est contrôlé côté backend (entitlements).
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="text-sm font-medium">P1 — Découverte</div>
            <div className="mt-1 text-sm text-neutral-600">
              Vue d’ensemble, principes, et premières étapes.
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm font-medium">P1 — Tunnel</div>
            <div className="mt-1 text-sm text-neutral-600">
              Accès au parcours guidé (étapes), une fois authentifié.
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/p1"
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Ouvrir P1
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
