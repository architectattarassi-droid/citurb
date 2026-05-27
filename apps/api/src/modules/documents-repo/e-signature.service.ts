import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";

/**
 * ESignatureService — orchestre la signature électronique d'un document.
 *
 * Modes supportés :
 *  - `LOCAL_CANVAS` : signature manuscrite capturée côté front (canvas) →
 *    dataUrl PNG base64, hashée et persistée par le service appelant.
 *  - `BARID_ESIGN`  : placeholder pour l'intégration Barid eSign (Maroc).
 *    Quand le partenariat sera signé, brancher l'API REST officielle ici.
 *  - `OTP_EMAIL`    : OTP envoyé par email, à brancher sur `EmailService`.
 *
 * Doctrine T7-R-DOC-001 : toute signature doit produire un hash SHA-256
 * du couple (contenu document + dataUrl signature + timestamp), reproductible.
 */
@Injectable()
export class ESignatureService {
  private readonly logger = new Logger(ESignatureService.name);

  /**
   * Valide qu'un dataUrl correspond bien à une image PNG/JPEG en base64.
   * @throws BadRequestException si le format est invalide.
   */
  validateDataUrl(dataUrl: string): void {
    if (typeof dataUrl !== "string" || !dataUrl.length) {
      throw new BadRequestException("Signature manquante");
    }
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
      throw new BadRequestException(
        "Format de signature invalide (PNG ou JPEG base64 requis)",
      );
    }
    // Estimation taille décodée (base64 ratio ~4/3) — refuse les signatures
    // > 1 Mo (canvas standard ~50 Ko).
    const base64Body = dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.floor((base64Body.length * 3) / 4);
    if (approxBytes > 1_048_576) {
      throw new BadRequestException("Signature trop volumineuse (>1 Mo)");
    }
  }

  /**
   * Calcule le hash SHA-256 d'une signature : contenu(doc) + dataUrl + signedAt.
   * Sert d'empreinte probatoire individuelle (avant ancrage dans la chaîne).
   */
  computeSignatureHash(
    documentHash: string,
    signatureDataUrl: string,
    signedAt: string,
  ): string {
    return createHash("sha256")
      .update(`${documentHash}|${signatureDataUrl}|${signedAt}`)
      .digest("hex");
  }

  /**
   * Placeholder Barid eSign — pour l'instant retourne false (mode non actif).
   *
   * Quand l'intégration sera disponible, cette méthode :
   *  1. POST `/api/v1/sign` sur l'endpoint Barid (mTLS + JWT signé)
   *  2. Récupère le bulletin de signature (XAdES / PAdES)
   *  3. Renvoie la signature détachée à persister
   */
  async submitToBaridESign(opts: {
    documentBuffer: Buffer;
    signerCin: string;
    signerEmail: string;
  }): Promise<{ ok: boolean; receipt?: string; message?: string }> {
    this.logger.warn(
      `[BaridESign] Stub appelé pour CIN=${opts.signerCin.slice(0, 4)}*** — intégration non encore active`,
    );
    return {
      ok: false,
      message:
        "Barid eSign non encore activé — utiliser la signature locale (canvas).",
    };
  }

  /**
   * Vérifie qu'une signature canvas correspond à un document donné en
   * recalculant son hash.
   */
  verifySignatureHash(
    documentHash: string,
    signatureDataUrl: string,
    signedAt: string,
    expectedHash: string,
  ): boolean {
    const recomputed = this.computeSignatureHash(
      documentHash,
      signatureDataUrl,
      signedAt,
    );
    return recomputed === expectedHash;
  }
}
