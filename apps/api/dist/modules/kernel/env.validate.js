"use strict";
/**
 * Minimal environment validation for production safety.
 * - Prevents "silent dev fallback" in production.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvOrThrow = validateEnvOrThrow;
function validateEnvOrThrow() {
    const env = process.env.NODE_ENV || "development";
    if (env !== "production")
        return;
    // Email (SMTP) is optional — OTP fallback to console log if absent.
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)) {
        console.warn("[ENV] SMTP_* variables missing — OTP emails disabled. Set SMTP_HOST/PORT/USER/PASS to enable.");
    }
    // SMS is optional. Si activé, il faut TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN,
    // ET au moins l'une des deux options : TWILIO_VERIFY_SID (Verify API)
    // OU TWILIO_FROM (Programmable Messaging).
    const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
    if (smsEnabled) {
        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, TWILIO_VERIFY_SID } = process.env;
        if (!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)) {
            throw new Error("[ENV] SMS_ENABLED=true mais TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant.");
        }
        if (!TWILIO_FROM && !TWILIO_VERIFY_SID) {
            throw new Error("[ENV] SMS_ENABLED=true mais ni TWILIO_FROM (Programmable) ni TWILIO_VERIFY_SID (Verify) configuré. Fournis au moins l'un des deux.");
        }
        if (!TWILIO_FROM) {
            console.warn("[ENV] TWILIO_FROM absent — seul Twilio Verify est disponible. Les SMS d'alerte libres (admin-notify) seront désactivés.");
        }
    }
}
