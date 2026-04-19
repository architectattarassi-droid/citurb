"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1PacksEmailService = void 0;
const crypto = require("crypto");
const nodemailer = require("nodemailer");
/**
 * P1 Packs Email confirmation (V1)
 * - Stores codes in-memory with TTL (sufficient for local/dev & V1).
 * - Sends email if SMTP env is present; otherwise logs content to console.
 */
class P1PacksEmailService {
    ttlMs = 15 * 60 * 1000; // 15 minutes
    store = new Map();
    async requestCode(key, email, orderSnapshot) {
        const code = this.genCode();
        const expiresAt = Date.now() + this.ttlMs;
        this.store.set(key, { code, expiresAt, orderSnapshot });
        const subject = "CITURBAREA — Code de confirmation (P1 Packs)";
        const text = this.buildText(code, orderSnapshot);
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || "no-reply@citurbarea.local";
        if (smtpHost && smtpPort && smtpUser && smtpPass) {
            const secure = String(process.env.SMTP_SECURE || "") === "true" ? true : smtpPort === 465;
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure,
                auth: { user: smtpUser, pass: smtpPass },
            });
            await transporter.sendMail({ from, to: email, subject, text });
            if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[DEV][EMAIL] sent via SMTP", { to: email, host: smtpHost, port: smtpPort, secure });
            }
        }
        else {
            // eslint-disable-next-line no-console
            console.log("\n[CITURBAREA EMAIL FALLBACK] SMTP not configured. Email content below:\n" +
                `TO: ${email}\nSUBJECT: ${subject}\n\n${text}\n`);
        }
        return { code, expiresInSec: Math.round(this.ttlMs / 1000) };
    }
    verifyCode(key, code) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        const ok = String(entry.code) === String(code);
        if (ok)
            this.store.delete(key);
        return ok;
    }
    genCode() {
        const n = crypto.randomInt(0, 1000000);
        return String(n).padStart(6, "0");
    }
    buildText(code, order) {
        const o = order || {};
        const proj = o.project || {};
        const pricing = o.pricing || {};
        const services = o.services || {};
        const who = o.requester || {};
        const lines = [];
        const fmt = (n) => {
            const v = Number(n);
            if (!Number.isFinite(v))
                return "—";
            return Math.round(v).toLocaleString("fr-FR");
        };
        // New format (V162D+)
        const hasNew = pricing && (pricing.totalMAD != null || pricing.packMAD != null || pricing.totalMADRounded != null);
        if (hasNew) {
            lines.push(`Bonjour${who.displayName ? " " + who.displayName : ""},`, "", "Voici votre code de confirmation pour afficher les packs CITURBAREA (P1):", "", `CODE: ${code}`, "", "Récapitulatif de votre demande :", `- Projet: ${proj.type || "—"}`, `- Ville: ${proj.city || "—"}`, `- Surface: ${proj.surfaceM2 ?? "—"} m²`, `- Niveau: ${proj.constructionLevel || "—"}`, `- Pack: ${pricing.packLabel || pricing.pack || "—"}`, "", "Services sélectionnés :", `- BET: ${services.betMode === "EXTERNAL" ? "Votre BET" : "BET via plateforme"}`, `- MOD (validation paiements): ${services.modEnabled ? "Oui" : "Non"}`, `- Décoration intérieure: ${services.decoEnabled ? "Oui" : "Non"}`, `- Mandat entreprise: ${services.mandateEntreprise ? "Oui" : "Non"}`, services.addRemoteFollow ? `- Suivi à distance: Oui` : `- Suivi à distance: Non`, "", "Montants indicatifs (MAD HT) :", `- Pack: ${fmt(pricing.packMAD)} MAD`, `- Suivi à distance: ${fmt(pricing.remoteFollowMAD)} MAD`, `- BET: ${fmt(pricing.betMAD)} MAD`, `- MOD: ${fmt(pricing.modMAD)} MAD`, `- Décoration: ${fmt(pricing.decoMAD)} MAD`, `- TOTAL: ${fmt(pricing.totalMADRounded ?? pricing.totalMAD)} MAD`, "", "NB: Les mécanismes internes de calcul ne sont pas affichés. Seuls les montants sont communiqués.", "", "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.", "", "— CITURBAREA");
            return lines.join("\n");
        }
        return [
            `Bonjour${who.displayName ? " " + who.displayName : ""},`,
            "",
            "Voici votre code de confirmation pour afficher les packs CITURBAREA (P1):",
            "",
            `CODE: ${code}`,
            "",
            "Récapitulatif de votre demande :",
            `- Projet: ${proj.type || "—"}`,
            `- Mode: ${proj.planMode || "—"}`,
            `- Ville: ${proj.city || "—"}`,
            `- Surface: ${proj.surfaceM2 ?? "—"} m²`,
            `- Budget: ${proj.budgetLabel || (proj.budgetMinMAD && proj.budgetMaxMAD ? `${proj.budgetMinMAD}–${proj.budgetMaxMAD} MAD` : "—")}`,
            `- Pack Entrée (indicatif): ${pricing.packEntreeMAD ?? "—"} MAD HT`,
            `- Pack Personnalisé (indicatif): ${pricing.packCustomMAD ?? "—"} MAD HT`,
            "",
            "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.",
            "",
            "— CITURBAREA",
        ].join("\n");
    }
}
exports.P1PacksEmailService = P1PacksEmailService;
