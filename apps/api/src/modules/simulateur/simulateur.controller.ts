import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tomes/tome-at";
import {
  EstimationPubliqueService,
  type EstimationInput,
} from "./estimation-publique.service";
import { LeadService, type LeadCaptureInput } from "./lead.service";

/**
 * SimulateurController — endpoints PUBLICS (sans auth) du simulateur de coût.
 *
 * Monté sous /api/* → proxifié vers l'API par nginx et hors fallback SPA.
 * À ajouter à l'allow-list MutationGate : `/api/simulateur`.
 *
 *  GET  /api/simulateur/options                 → options de qualification
 *  POST /api/simulateur/estimate-sommaire       → fourchette globale (anonyme)
 *  POST /api/simulateur/estimate-detaille        → ventilation (avec capture lead)
 *  GET  /api/simulateur/unsubscribe?token=…      → désinscription 1-clic
 */
@Tome("tome0")
@Controller("api/simulateur")
export class SimulateurController {
  constructor(
    private readonly estimation: EstimationPubliqueService,
    private readonly leads: LeadService,
  ) {}

  @Get("options")
  options() {
    return this.estimation.options();
  }

  /** Étape A — estimation sommaire, anonyme, sans capture. */
  @Post("estimate-sommaire")
  estimateSommaire(@Body() input: EstimationInput) {
    return this.estimation.estimateSommaire(input);
  }

  /**
   * Étape B — estimation détaillée + capture du contact (consentement).
   * Body : { lead: {...}, params: EstimationInput }.
   * On calcule d'abord (valide les params), puis on enregistre le lead avec
   * la fourchette livrée, puis on renvoie la ventilation.
   */
  @Post("estimate-detaille")
  async estimateDetaille(
    @Body() body: { lead: Omit<LeadCaptureInput, "paramsProjet" | "estimationMin" | "estimationMax">; params: EstimationInput },
  ) {
    const detail = this.estimation.estimateDetaillee(body.params);
    const lead = await this.leads.capture({
      ...body.lead,
      typeProjet: body.lead?.typeProjet || detail.typeProjet,
      ville: body.lead?.ville || detail.ville,
      paramsProjet: body.params,
      estimationMin: detail.fourchetteMin,
      estimationMax: detail.fourchetteMax,
    });
    return { ...detail, leadId: lead.id };
  }

  /** Désinscription 1-clic (lien des emails de relance). Réponse HTML simple. */
  @Get("unsubscribe")
  async unsubscribe(@Query("token") token: string, @Res() res: Response) {
    let message: string;
    try {
      const r = await this.leads.unsubscribeByToken(token);
      message = r.ok
        ? "Vous êtes désinscrit. Vous ne recevrez plus de relances de notre part."
        : "Lien de désinscription invalide ou expiré.";
    } catch {
      message = "Lien de désinscription invalide.";
    }
    res
      .status(200)
      .type("html")
      .send(
        `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex">` +
          `<meta name="viewport" content="width=device-width,initial-scale=1">` +
          `<title>Désinscription — CITURBAREA</title></head>` +
          `<body style="font-family:system-ui,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#0f172a;text-align:center;">` +
          `<h1 style="font-size:22px;">CITURBAREA</h1><p style="font-size:16px;line-height:1.6;">${message}</p>` +
          `</body></html>`,
      );
  }
}
