import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { useT } from "../../../i18n/i18n";

export default function Login() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectFromQuery = searchParams.get("redirect") || searchParams.get("next");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithPassword(email, password);
      // Si redirect explicite dans l'URL → on respecte. Sinon, on regarde si
      // l'user a un ProProfile (architecte/pro BTP) → redirige /cercles, sinon
      // /p1/packs (client lambda flow dossier).
      if (redirectFromQuery) {
        navigate(redirectFromQuery);
        return;
      }
      try {
        const apiBase = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
        const tok = localStorage.getItem("citurbarea.token") || "";
        const r = await fetch(`${apiBase}/api/cercles/me/profile`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.data) {
            navigate("/cercles");
            return;
          }
        }
      } catch { /* fallthrough */ }
      navigate("/p1/packs");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "520px",
        padding: "40px",
        marginInline: "20px",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(201,162,39,0.25)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: "14px", display: "inline-block", marginBottom: "16px" }}>
            ← {t("auth.back_home")}
          </Link>
          <h1 style={{
            fontFamily: "\"Playfair Display\", serif",
            fontSize: "32px",
            fontWeight: 700,
            color: "#0B1B3A",
            margin: "0 0 8px",
          }}>
            {t("auth.login_title")}
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(11,27,58,0.68)", margin: 0 }}>
            {t("auth.login_subtitle")}
          </p>
        </div>

        {error && (
          <div style={{
            padding: "14px 16px",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "12px",
            color: "#dc2626",
            fontSize: "14px",
            marginBottom: "24px",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: "rgba(11,27,58,0.82)",
              marginBottom: "8px",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}>
              {t("auth.email_label")}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.email_placeholder")}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid rgba(201,162,39,0.25)",
                borderRadius: "12px",
                fontSize: "15px",
                background: "white",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: "rgba(11,27,58,0.82)",
              marginBottom: "8px",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}>
              {t("auth.password_label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.password_placeholder")}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid rgba(201,162,39,0.25)",
                borderRadius: "12px",
                fontSize: "15px",
                background: "white",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading ? "rgba(11,27,58,0.5)" : "linear-gradient(135deg, #0B1B3A, #123A7A)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("auth.signing_in") : t("auth.sign_in_btn")}
          </button>
        </form>

        <div style={{ marginTop: "18px", textAlign: "center" }}>
          <Link to="/mot-de-passe-oublie" style={{ color: "rgba(11,27,58,0.68)", fontSize: "14px", textDecoration: "none" }}>
            {t("auth.forgot_password")}
          </Link>
        </div>

        <div style={{
          marginTop: "14px",
          textAlign: "center",
          fontSize: "14px",
          color: "rgba(11,27,58,0.68)",
        }}>
          {t("auth.new_here")} <Link to={redirectFromQuery ? `/creer-compte?redirect=${encodeURIComponent(redirectFromQuery)}` : "/creer-compte"} style={{ color: "#C9A227", fontWeight: 600, textDecoration: "none" }}>{t("auth.create_account")}</Link>
        </div>

        {import.meta.env.VITE_SHOW_DEV_CREDENTIALS === 'true' && (
          <div style={{
            marginTop: '28px',
            padding: '16px',
            background: 'rgba(201,162,39,0.06)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'rgba(11,27,58,0.68)',
            lineHeight: 1.6,
          }}>
            <strong>{t("auth.login.dev_title")}</strong><br />
            {t("auth.login.dev_intro")}<br />
            • {t("auth.login.dev_email")}: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>OWNER_EMAIL</code> / <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>ADMIN_EMAIL</code><br />
            • {t("auth.login.dev_password")}: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>OWNER_PASSWORD</code> / <code style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px' }}>ADMIN_PASSWORD</code><br />
            <span style={{ display: 'block', marginTop: '8px', opacity: 0.85 }}>{t("auth.login.dev_tip")}</span>
          </div>
        )}

      </div>
    </div>
  );
}
