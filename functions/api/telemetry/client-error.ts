/**
 * Cloudflare Pages Function — POST /api/telemetry/client-error
 *
 * Reçoit les plantages d'écran signalés par GlobalErrorBoundary (sendBeacon)
 * et les écrit dans le journal de la fonction (Workers & Pages → citurbarea →
 * Functions → Real-time logs). Aucune table, aucune donnée personnelle gardée :
 * message, pile tronquée, chemin (sans requête) et identifiant d'incident.
 * Toujours 204 : l'émetteur est « fire-and-forget ».
 */

const court = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\u0000/g, "").slice(0, max) : "";

export const onRequestPost = async (ctx: { request: Request }): Promise<Response> => {
  try {
    const texte = await ctx.request.text();
    if (texte.length <= 20_000) {
      const b = JSON.parse(texte) as Record<string, unknown>;
      let chemin = "";
      try { chemin = new URL(court(b.url, 500)).pathname; } catch { /* url absente */ }
      console.log("client-error", JSON.stringify({
        incidentId: court(b.incidentId, 64),
        message: court(b.message, 500),
        chemin,
        stack: court(b.stack, 1500),
      }));
    }
  } catch { /* corps illisible : ignoré */ }
  return new Response(null, { status: 204 });
};
