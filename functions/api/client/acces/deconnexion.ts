/** POST /api/client/acces/deconnexion — efface le cookie de session client. */
import { json } from "../../../_lib/adminSession";
import { enteteCookieClient } from "../../../_lib/clientSession";

export const onRequestPost = async (): Promise<Response> => json(200, { ok: true }, { "set-cookie": enteteCookieClient("", 0) });
