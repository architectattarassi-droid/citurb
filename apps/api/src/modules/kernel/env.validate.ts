/**
 * Minimal environment validation for production safety.
 * - Prevents "silent dev fallback" in production.
 */

export function validateEnvOrThrow() {
  const env = process.env.NODE_ENV || "development";
  if (env !== "production") return;

  // Email (SMTP) is optional — OTP fallback to console log if absent.
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)) {
    console.warn(
      "[ENV] SMTP_* variables missing — OTP emails disabled. Set SMTP_HOST/PORT/USER/PASS to enable."
    );
  }

  // SMS is optional, but if enabled, Twilio must be complete.
  const smsEnabled = String(process.env.SMS_ENABLED || "false") === "true";
  if (smsEnabled) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
    if (!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM)) {
      throw new Error(
        "[ENV] SMS_ENABLED=true but missing TWILIO_* variables. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM."
      );
    }
  }
}
