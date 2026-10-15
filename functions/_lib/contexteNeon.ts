/**
 * Contexte commun des Functions d'appels vidéo et de messagerie (Neon) :
 * dépôts, résolution des personnes, e-mails Resend et journal des appels
 * dans les fils de messagerie.
 */
import { depotAppelsNeon, type Sql } from "./appelsDepot";
import { resolveurNeon } from "./appelsResolveur";
import { envoyeurResend, type EnvAppels } from "./appelsService";
import { depotMessagerieNeon } from "./messagerieDepot";
import { journalAppels, type CtxMsg } from "./messagerieService";
import { depotFichiersNeon } from "./depotStockage";
import { deposerEnregistrementAppel, type EnvDepotComplet } from "./depotNeon";

export function contexteNeon(env: EnvAppels, sql: Sql): CtxMsg {
  const msg = depotMessagerieNeon(sql);
  return { depot: depotAppelsNeon(sql), resolveur: resolveurNeon(sql), env, maintenant: Date.now(), envoyer: envoyeurResend(env), msg, docs: depotFichiersNeon(sql as never), journal: journalAppels(msg, () => Date.now()),
    deposerEnregistrement: deposerEnregistrementAppel(env as EnvDepotComplet, sql as never) };
}
