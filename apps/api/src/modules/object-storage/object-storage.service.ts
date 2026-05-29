/**
 * ObjectStorageService — façade unique pour la génération d'URLs présignées.
 * Sélectionne le driver R2 si les env Cloudflare sont présentes, sinon retombe
 * sur le driver local (dev uniquement, binaire via API — entorse documentée).
 */
import { Injectable, Logger } from "@nestjs/common";
import type { PresignInput, PresignedUpload } from "./object-storage.types";
import { validatePresign } from "./object-storage.types";
import { localPresign } from "./drivers/local.driver";
import { r2EnvIfReady, r2Presign } from "./drivers/r2.driver";

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly apiBase =
    process.env.API_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

  driver(): "r2" | "local" {
    return r2EnvIfReady() ? "r2" : "local";
  }

  async presign(input: PresignInput): Promise<PresignedUpload> {
    validatePresign(input);
    const r2 = r2EnvIfReady();
    if (r2) return r2Presign(input, r2);
    if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
      this.logger.warn(
        "R2 non configuré en production — bascule sur stockage LOCAL (binaire transite par l'API). " +
          "Provisionner R2_ACCOUNT_ID / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_BASE_URL.",
      );
    }
    return localPresign(input, this.apiBase);
  }
}
