/**
 * Cloudflare Pages Function — GET /api/cc/leads/conversions-google?jours=90
 *
 * Fichier CSV d'import des conversions hors ligne Google Ads (modèle « Google
 * Click ID ») : chaque lead venu d'un clic Google Ads (gclid, lib/attribution)
 * et passé par le back-office au statut QUALIFIED, puis WON / PAID.
 * Google Ads apprend ainsi quels clics donnent de VRAIS clients, pas seulement
 * des formulaires : c'est ce qui rend les enchères intelligentes rentables.
 *
 * Import : Google Ads → Objectifs → Conversions → Importer → Fichier
 * (actions « Lead qualifié » et « Client signé », source « Importation de
 * clics »). Noms des actions modifiables ici : ils doivent être identiques.
 * Aucune donnée personnelle dans le fichier (gclid + date seulement).
 *
 * Protégée par ../_middleware.ts (Cloudflare Access / mot de passe).
 */

import { neon } from "@neondatabase/serverless";

interface Env { DATABASE_URL?: string }
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export const ACTIONS: Record<string, string> = {
  QUALIFIED: "Lead qualifié",
  DOSSIER_OPENED: "Lead qualifié",
  WON: "Client signé",
  PAID: "Client signé",
};

type Evenement = { at?: string; kind?: string; payload?: { to?: string } };

/** Date Google Ads : « yyyy-MM-dd HH:mm:ss+0000 » (UTC). */
export const dateGoogle = (d: Date) => `${d.toISOString().slice(0, 19).replace("T", " ")}+0000`;

const champ = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Lignes de conversion d'un lead : une par action atteinte (date du changement de statut). */
export function conversionsLead(l: Record<string, unknown>): string[][] {
  const utm = (l.utm && typeof l.utm === "object" ? l.utm : {}) as Record<string, unknown>;
  const gclid = typeof utm.gclid === "string" ? utm.gclid : "";
  if (!gclid) return [];
  const events = (Array.isArray(l.events) ? l.events : []) as Evenement[];
  const faites = new Map<string, string>();
  for (const e of events) {
    const action = e.kind === "STAGE_CHANGE" ? ACTIONS[String(e.payload?.to)] : undefined;
    if (action && e.at && !faites.has(action)) faites.set(action, e.at);
  }
  // Statut posé sans historique (ancien lead) : date de dernière mise à jour.
  const actuel = ACTIONS[String(l.stage)];
  if (actuel && !faites.has(actuel) && l.updatedAt) faites.set(actuel, String(l.updatedAt instanceof Date ? l.updatedAt.toISOString() : l.updatedAt));
  // Un client signé a forcément été qualifié.
  if (faites.has("Client signé") && !faites.has("Lead qualifié")) faites.set("Lead qualifié", faites.get("Client signé")!);
  return [...faites].map(([action, at]) => [gclid, action, dateGoogle(new Date(at)), "", "MAD"]);
}

export function csvConversions(leads: Record<string, unknown>[]): string {
  const lignes = [["Google Click ID", "Conversion Name", "Conversion Time", "Conversion Value", "Conversion Currency"]];
  for (const l of leads) lignes.push(...conversionsLead(l));
  return lignes.map((r) => r.map(champ).join(",")).join("\r\n") + "\r\n";
}

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  if (!ctx.env.DATABASE_URL) return new Response("storage_unavailable", { status: 503 });
  const j = Number(new URL(ctx.request.url).searchParams.get("jours") || 90);
  // Google refuse les clics de plus de 90 jours.
  const jours = Number.isFinite(j) ? Math.min(Math.max(Math.round(j), 1), 90) : 90;
  const depuis = new Date(Date.now() - jours * 86_400_000).toISOString();
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    const leads = await sql`SELECT "utm", "stage", "events", "updatedAt" FROM "Lead"
      WHERE "createdAt" >= ${depuis}::timestamp AND "utm" ? 'gclid'
        AND "stage" IN ('QUALIFIED','DOSSIER_OPENED','WON','PAID')
      ORDER BY "createdAt" LIMIT 5000`;
    return new Response(csvConversions(leads), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="conversions-google-ads-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error(`[cc/leads/conversions-google] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return new Response("storage_unavailable", { status: 503 });
  }
}
