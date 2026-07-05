import { Controller, Get, Post, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { DriveService } from "./drive.service";

/**
 * DriveController — connexion Google Drive + miroir de dossiers.
 *
 *   GET  /api/cc/drive/status            → état (configuré/connecté/email)   [ADMIN,OWNER]
 *   GET  /api/cc/drive/connect           → { authUrl } pour lancer le consentement [ADMIN,OWNER]
 *   GET  /api/cc/drive/callback          → redirection Google (PUBLIC, protégé par state)
 *   POST /api/cc/drive/mirror/:dossierId → pousse le dossier complet dans Drive [ADMIN,OWNER]
 *   POST /api/cc/drive/disconnect        → oublie le jeton                    [ADMIN,OWNER]
 */
@Tome("tome9")
@Controller("api/cc/drive")
export class DriveController {
  constructor(private readonly svc: DriveService) {}

  @Get("status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  status() {
    return this.svc.status();
  }

  @Get("connect")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  connect() {
    if (!this.svc.isConfigured()) {
      return { ok: false, error: "Google Drive non configuré (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants)" };
    }
    return { ok: true, authUrl: this.svc.authUrl() };
  }

  /**
   * Callback OAuth — appelé par Google dans le navigateur (pas de JWT).
   * Sécurisé par le paramètre `state` (anti-CSRF) + code single-use.
   * Renvoie une page HTML minimale de confirmation.
   */
  @Get("callback")
  async callback(@Query("code") code: string, @Query("state") state: string, @Res() res: Response) {
    const page = (title: string, msg: string, ok: boolean) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;background:#0d1017;color:#e8eaf0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:420px;padding:24px"><div style="font-size:48px">${ok ? "✅" : "⚠️"}</div><h1 style="font-size:20px">${title}</h1><p style="color:#9ca3af;line-height:1.5">${msg}</p><p style="color:#6b7280;font-size:13px">Tu peux fermer cette fenêtre.</p></div></body></html>`;
    try {
      if (!code || !state) throw new Error("Paramètres OAuth manquants");
      const { email } = await this.svc.handleCallback(code, state);
      res.status(200).type("html").send(page("Google Drive connecté", `Le miroir de sauvegarde est actif sur le compte <b>${email || "Google"}</b>.`, true));
    } catch (e: any) {
      res.status(400).type("html").send(page("Connexion échouée", String(e?.message || e), false));
    }
  }

  @Post("mirror/:dossierId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  async mirror(@Param("dossierId") dossierId: string) {
    return await this.svc.mirrorDossier(dossierId);
  }

  @Post("disconnect")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "OWNER")
  disconnect() {
    return this.svc.disconnect();
  }
}
