/**
 * GET /api/cc/session — le front (CCGuard) demande s'il passe la garde Access.
 * Atteint seulement si _middleware.ts a validé le jeton.
 */
export async function onRequestGet(ctx: { data: Record<string, unknown> }): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, email: ctx.data.adminEmail, mode: "access" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
