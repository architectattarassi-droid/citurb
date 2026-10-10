/**
 * RouteError — errorElement racine du routeur. Remplace l'écran
 * « Unexpected Application Error! » de React Router.
 *
 * Chunk lazy introuvable (redéploiement) → un rechargement complet
 * automatique (garde anti-boucle dans lib/chunkReload). Autres erreurs →
 * message sobre + bouton de rechargement.
 */
import React, { useEffect, useState } from "react";
import { useRouteError } from "react-router-dom";
import { isChunkLoadError, reloadOnceForChunkError } from "../lib/chunkReload";

export default function RouteError() {
  const error = useRouteError();
  const chunk = isChunkLoadError(error);
  const [reloading, setReloading] = useState(chunk);

  useEffect(() => {
    if (chunk) setReloading(reloadOnceForChunkError());
  }, [chunk]);

  const bouton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", minHeight: 44, padding: "10px 18px",
    borderRadius: 10, fontWeight: 600, fontSize: 15, border: 0, cursor: "pointer",
    background: "#0d3566", color: "#fff",
  };

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "#0f172a" }}>
      {reloading ? (
        <p style={{ color: "#475569" }} aria-busy="true">Mise à jour de l'application…</p>
      ) : (
        <>
          <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>
            {chunk ? "Une nouvelle version est disponible" : "Une erreur est survenue"}
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 28px" }}>
            Rechargez la page pour continuer.
          </p>
          <button type="button" style={bouton} onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </>
      )}
    </main>
  );
}
