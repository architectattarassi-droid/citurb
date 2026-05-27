"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ESignatureService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESignatureService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
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
let ESignatureService = ESignatureService_1 = class ESignatureService {
    logger = new common_1.Logger(ESignatureService_1.name);
    /**
     * Valide qu'un dataUrl correspond bien à une image PNG/JPEG en base64.
     * @throws BadRequestException si le format est invalide.
     */
    validateDataUrl(dataUrl) {
        if (typeof dataUrl !== "string" || !dataUrl.length) {
            throw new common_1.BadRequestException("Signature manquante");
        }
        if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
            throw new common_1.BadRequestException("Format de signature invalide (PNG ou JPEG base64 requis)");
        }
        // Estimation taille décodée (base64 ratio ~4/3) — refuse les signatures
        // > 1 Mo (canvas standard ~50 Ko).
        const base64Body = dataUrl.split(",")[1] ?? "";
        const approxBytes = Math.floor((base64Body.length * 3) / 4);
        if (approxBytes > 1_048_576) {
            throw new common_1.BadRequestException("Signature trop volumineuse (>1 Mo)");
        }
    }
    /**
     * Calcule le hash SHA-256 d'une signature : contenu(doc) + dataUrl + signedAt.
     * Sert d'empreinte probatoire individuelle (avant ancrage dans la chaîne).
     */
    computeSignatureHash(documentHash, signatureDataUrl, signedAt) {
        return (0, crypto_1.createHash)("sha256")
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
    async submitToBaridESign(opts) {
        this.logger.warn(`[BaridESign] Stub appelé pour CIN=${opts.signerCin.slice(0, 4)}*** — intégration non encore active`);
        return {
            ok: false,
            message: "Barid eSign non encore activé — utiliser la signature locale (canvas).",
        };
    }
    /**
     * Vérifie qu'une signature canvas correspond à un document donné en
     * recalculant son hash.
     */
    verifySignatureHash(documentHash, signatureDataUrl, signedAt, expectedHash) {
        const recomputed = this.computeSignatureHash(documentHash, signatureDataUrl, signedAt);
        return recomputed === expectedHash;
    }
};
exports.ESignatureService = ESignatureService;
exports.ESignatureService = ESignatureService = ESignatureService_1 = __decorate([
    (0, common_1.Injectable)()
], ESignatureService);
