/**
 * POST /api/cc/logout — efface le cookie cc_session.
 * Exclu de la garde de session (un cookie expiré doit pouvoir être effacé) ;
 * Origin doit être l'hôte de la requête (anti-CSRF).
 */

import { enteteCookie, json, origineAutorisee } from "../../_lib/adminSession";

export async function traiterLogout(req: Request): Promise<Response> {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST" });
  if (!origineAutorisee(req)) return json(403, { ok: false, error: "forbidden_origin" });
  return json(200, { ok: true }, { "set-cookie": enteteCookie("", 0) });
}

export const onRequest = (ctx: { request: Request }): Promise<Response> => traiterLogout(ctx.request);
