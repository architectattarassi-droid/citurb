/**
 * ForgotPassword — réinitialisation du mot de passe (users Cercles / pros).
 *
 * Étape 1 : saisie email → POST /auth/password-reset/request
 *           (le backend envoie 1 code par email ET par SMS si tél enregistré)
 * Étape 2 : saisie code + nouveau mot de passe → POST /auth/password-reset/confirm
 *           → succès → redirection /login
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiBase } from "../../tome4/apiClient";
import { useT } from "../../../i18n/i18n";

type Step = "email" | "code" | "done";

export default function ForgotPassword() {
  const t = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [channelsMsg, setChannelsMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch(`${apiBase()}/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Erreur lors de l'envoi du code");

      const channels: string[] = j?.channels || [];
      if (channels.length === 0) {
        setChannelsMsg(
          "Si un compte existe avec cet email, un code vient d'être envoyé. " +
          "Vérifie ta boîte mail (et tes spams).",
        );
      } else {
        const parts: string[] = [];
        if (channels.includes("email")) parts.push(`email${j?.maskedEmail ? ` (${j.maskedEmail})` : ""}`);
        if (channels.includes("sms")) parts.push(`SMS${j?.maskedPhone ? ` (${j.maskedPhone})` : ""}`);
        setChannelsMsg(`Code envoyé par ${parts.join(" et ")}. Valable 10 minutes.`);
      }
      setStep("code");
    } catch (err: any) {
      setError(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError(t("auth.error_password_min")); return; }
    if (newPassword !== confirmPassword) { setError(t("auth.error_password_mismatch")); return; }
    setLoading(true);
    try {
      const r = await fetch(`${apiBase()}/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Code incorrect ou expiré");
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link to="/login" style={S.backLink}>← {t("auth.back_login")}</Link>
          <h1 style={S.title}>{t("auth.forgot_title")}</h1>
          <p style={S.subtitle}>
            {step === "email" && t("auth.forgot_step_email")}
            {step === "code" && t("auth.forgot_step_code")}
            {step === "done" && t("auth.forgot_step_done")}
          </p>
        </div>

        {error && <div style={S.error}>{error}</div>}
        {channelsMsg && step === "code" && <div style={S.info}>{channelsMsg}</div>}

        {step === "email" && (
          <form onSubmit={requestCode}>
            <label style={S.label}>{t("auth.forgot_email_label")}</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("common.placeholder_email")} required autoFocus style={S.input}
            />
            <button type="submit" disabled={loading} style={{ ...S.btn, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? t("auth.forgot_sending") : t("auth.forgot_receive_code")}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={confirmReset}>
            <label style={S.label}>{t("auth.forgot_code_label")}</label>
            <input
              type="text" inputMode="numeric" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" required autoFocus
              style={{ ...S.input, letterSpacing: "0.4em", fontSize: 20, textAlign: "center" }}
            />
            <label style={{ ...S.label, marginTop: 18 }}>{t("auth.forgot_new_password")}</label>
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("auth.password_placeholder")} required style={S.input}
            />
            <label style={{ ...S.label, marginTop: 18 }}>{t("auth.forgot_confirm_password")}</label>
            <input
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.password_placeholder")} required style={S.input}
            />
            <button type="submit" disabled={loading} style={{ ...S.btn, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
              {loading ? t("auth.forgot_validating") : t("auth.forgot_reset_btn")}
            </button>
            <button type="button" onClick={() => { setStep("email"); setError(""); setChannelsMsg(""); }} style={S.btnGhost}>
              {t("auth.forgot_resend")}
            </button>
          </form>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: "rgba(11,27,58,0.7)", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              {t("auth.forgot_done_msg")}
            </p>
            <button onClick={() => navigate("/login")} style={S.btn}>
              {t("auth.forgot_go_login")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
  },
  card: {
    width: "100%", maxWidth: 440, padding: 40, margin: "0 20px",
    background: "rgba(255,255,255,0.95)", border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 20, boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
  },
  backLink: { textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: 14, display: "inline-block", marginBottom: 16 },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 30, fontWeight: 700, color: "#0B1B3A", margin: "0 0 8px" },
  subtitle: { fontSize: 14.5, color: "rgba(11,27,58,0.68)", margin: 0, lineHeight: 1.5 },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "rgba(11,27,58,0.82)", marginBottom: 8, letterSpacing: "0.03em" },
  input: {
    width: "100%", padding: "14px 16px", border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 12, fontSize: 15, background: "white", outline: "none", boxSizing: "border-box",
  },
  btn: {
    width: "100%", padding: 16, background: "linear-gradient(135deg, #0B1B3A, #123A7A)",
    color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  btnGhost: {
    width: "100%", padding: 12, marginTop: 10, background: "transparent",
    color: "rgba(11,27,58,0.6)", border: "none", fontSize: 14, cursor: "pointer",
  },
  error: {
    padding: "13px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)",
    borderRadius: 12, color: "#dc2626", fontSize: 14, marginBottom: 20,
  },
  info: {
    padding: "13px 16px", background: "rgba(16,122,87,0.08)", border: "1px solid rgba(16,122,87,0.25)",
    borderRadius: 12, color: "#0f7a57", fontSize: 13.5, marginBottom: 20, lineHeight: 1.5,
  },
};
