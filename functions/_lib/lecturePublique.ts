/**
 * Lectures publiques qui doivent répondre même sans base (prix de référence) :
 * dépôt Neon si DATABASE_URL, sinon null (la logique répond alors avec
 * marcheDisponible: false ; les erreurs de lecture sont gérées par la logique).
 *
 * Aperçu : sur les hôtes de prévisualisation (*.pages.dev, localhost), les
 * fournisseurs marqués fictifs (données de test) sont inclus dans les lectures
 * publiques ; jamais sur citurbarea.com.
 */
import type { Sql } from "./cercles";
import { depotCatalogueNeon } from "./catalogueDepot";
import { depotNeon, type DepotComplet } from "./fournisseursDepot";

export async function depotOuNull(env: { DATABASE_URL?: string }): Promise<DepotComplet | null> {
  if (!env.DATABASE_URL) return null;
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(env.DATABASE_URL) as unknown as Sql;
  return { ...depotNeon(sql), ...depotCatalogueNeon(sql) };
}

export function apercu(req: Request): boolean {
  const h = new URL(req.url).hostname;
  return h.endsWith(".pages.dev") || h === "localhost" || h === "127.0.0.1";
}
