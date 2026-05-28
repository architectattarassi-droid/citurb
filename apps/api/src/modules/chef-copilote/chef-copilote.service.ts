import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../kernel/prisma/prisma.service";

/**
 * ChefCopiloteService — copilote IA chef de chantier (darija/français).
 *
 * Persona Brahim : "un assistant IA qui CONNAÎT MES chantiers, en darija vocal".
 * Modèle Haiku 4.5 via l'API Anthropic en fetch direct (zéro dépendance npm).
 * Contexte injecté depuis les dossiers actifs (sous-traitants, livraisons, incidents, tâches).
 */
@Injectable()
export class ChefCopiloteService {
  private readonly logger = new Logger(ChefCopiloteService.name);
  private readonly apiKey = process.env.ANTHROPIC_API_KEY || "";

  constructor(private readonly prisma: PrismaService) {}

  /** Construit le contexte chantier d'un dossier pour le LLM. */
  private async buildContext(dossierId: string): Promise<string> {
    try {
      const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
      if (!d) return "Aucun dossier trouvé.";
      const pl = (d.payload as any) || {};
      const lines: string[] = [];
      lines.push(`Dossier: ${(d as any).title || d.id} (statut ${d.status})`);

      const st = pl.sousTraitants || [];
      if (st.length) lines.push(`Sous-traitants: ${st.length} assignés. ` +
        st.slice(0, 5).map((s: any) => `${s.lotIntitule}=${s.status}`).join(", "));

      const liv = pl.livraisons || [];
      const pending = liv.filter((l: any) => ["REQUEST", "CONFIRMED", "EN_ROUTE"].includes(l.status));
      if (pending.length) lines.push(`Livraisons en attente: ${pending.length}`);

      const inc = pl.incidents || [];
      const openInc = inc.filter((i: any) => i.status !== "RESOLVED");
      if (openInc.length) lines.push(`Incidents ouverts: ${openInc.length} (${openInc.map((i: any) => i.type).join(", ")})`);

      const cal = pl.projectCalendar?.tasks || [];
      const inProgress = cal.filter((t: any) => t.status === "IN_PROGRESS");
      if (inProgress.length) lines.push(`Tâches en cours: ${inProgress.map((t: any) => t.titre).slice(0, 5).join(", ")}`);

      const rokhas = pl.rokhasTracker;
      if (rokhas?.reserves?.length) {
        const open = rokhas.reserves.filter((r: any) => r.status === "OUVERTE");
        if (open.length) lines.push(`Réserves Rokhas à lever: ${open.length}`);
      }

      return lines.join("\n");
    } catch (e: any) {
      this.logger.warn(`buildContext: ${e?.message}`);
      return "Contexte indisponible.";
    }
  }

  /** Répond à une question du chef (darija/français) avec contexte. */
  async ask(dossierId: string, query: string, queryLang: "darija" | "fr" | "ar" = "darija"): Promise<{ reply: string; model: string }> {
    const context = await this.buildContext(dossierId);
    if (!this.apiKey) {
      return { reply: "Le copilote IA n'est pas configuré (ANTHROPIC_API_KEY manquante). Contexte chantier :\n" + context, model: "none" };
    }
    const model = "claude-haiku-4-5-20251001";
    const system = `Tu es le copilote de chantier de CITURBAREA pour un chef de chantier marocain.
Réponds de façon TRÈS concise et pratique, en darija marocaine (lettres latines) si la question est en darija, sinon en français.
Tu connais SON chantier via le contexte fourni. Donne des actions concrètes, pas de blabla.
Si on te demande quoi faire aujourd'hui, liste 2-4 actions priorisées.
Contexte du chantier:
${context}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: 600, system, messages: [{ role: "user", content: query }] }),
      });
      if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
      const data: any = await res.json();
      const reply = (data?.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || "…";
      return { reply, model };
    } catch (e: any) {
      this.logger.warn(`LLM ask failed: ${e?.message}`);
      return { reply: "Khouya, le copilote est temporairement indisponible. Réessaye dans un moment.", model };
    }
  }

  /** Suggestions d'actions du jour (sans LLM, heuristique sur le contexte). */
  async suggestions(dossierId: string): Promise<string[]> {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } }).catch(() => null);
    if (!d) return [];
    const pl = (d.payload as any) || {};
    const out: string[] = [];

    const liv = (pl.livraisons || []).filter((l: any) => l.status === "EN_ROUTE");
    if (liv.length) out.push(`📦 ${liv.length} livraison(s) en route — prépare la réception sur chantier.`);

    const sit = (pl.sousTraitants || []).flatMap((s: any) => (s.situations || []).filter((x: any) => !x.validatedAt));
    if (sit.length) out.push(`✅ ${sit.length} situation(s) sous-traitant à valider.`);

    const openInc = (pl.incidents || []).filter((i: any) => i.status !== "RESOLVED");
    if (openInc.length) out.push(`⚠️ ${openInc.length} incident(s) ouvert(s) à traiter.`);

    const reserves = (pl.rokhasTracker?.reserves || []).filter((r: any) => r.status === "OUVERTE");
    if (reserves.length) out.push(`📋 ${reserves.length} réserve(s) Rokhas à lever avant délai légal.`);

    if (!out.length) out.push("✅ Aucune action urgente aujourd'hui. Bon chantier khouya !");
    return out;
  }
}
