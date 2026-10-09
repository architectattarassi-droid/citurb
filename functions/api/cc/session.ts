/**
 * GET /api/cc/session — le front (CCGuard) demande s'il passe la garde /api/cc (Access ou mot de passe).
 * Atteint seulement si _middleware.ts a validé le jeton Access ou le cookie cc_session.
 */
export async function onRequestGet(ctx: { data: Record<string, unknown> }): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, email: ctx.data.adminEmail, mode: ctx.data.authMode || "access" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
