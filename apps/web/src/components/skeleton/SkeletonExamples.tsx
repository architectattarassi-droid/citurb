import React from "react";
import { Skeleton } from "./Skeleton";

/**
 * SkeletonExamples — 3 patterns ready-to-use pour les pages CITURBAREA.
 *
 * Sert de gabarit prêt à coller dans :
 * - <Suspense fallback={<DossierListSkeleton />}>
 * - état initial de fetch (avant données) sur P1MyDossiers, CerclesFeed,
 *   SigExplorer, etc.
 *
 * Aucune dépendance externe, mobile-first.
 */

/** Liste de dossiers (P1MyDossiers, /portal, /cc/dossiers). */
export function DossierListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ padding: 16, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Skeleton kind="header" />
      </div>
      <Skeleton kind="list" count={count} ariaLabel="Chargement de vos dossiers" />
    </div>
  );
}

/** Grille de cards (portails P1..P6, marketplace Cercles). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
        padding: 16,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} kind="card" />
      ))}
    </div>
  );
}

/** Explorateur SIG / carte + sidebar (sig.citurbarea.com). */
export function MapWithSidebarSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 320px",
        gap: 16,
        padding: 16,
      }}
    >
      <Skeleton kind="map" ariaLabel="Chargement de la carte SIG" />
      <div>
        <Skeleton kind="header" />
        <div style={{ height: 16 }} />
        <Skeleton kind="row" count={4} />
      </div>
    </div>
  );
}

export default {
  DossierListSkeleton,
  CardGridSkeleton,
  MapWithSidebarSkeleton,
};
