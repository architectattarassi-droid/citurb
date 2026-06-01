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
    <div className="cit-auth-page">
      <style>{`
        .cit-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72));
        }
        .cit-auth-card {
          width: 100%;
          max-width: 520px;
          padding: 40px;
          margin-inline: 20px;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(201,162,39,0.25);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(11,27,58,0.12);
        }
        .cit-auth-header { text-align: center; margin-bottom: 32px; }
        .cit-auth-back {
          text-decoration: none;
          color: rgba(11,27,58,0.68);
          font-size: 14px;
          display: inline-block;
          margin-bottom: 16px;
        }
        .cit-auth-heading {
          font-family: "Playfair Display", serif;
          font-size: 32px;
          font-weight: 700;
          color: #0B1B3A;
          margin: 0 0 8px;
        }
        .cit-auth-sub {
          font-size: 15px;
          color: rgba(11,27,58,0.68);
          margin: 0;
        }
        .cit-auth-error {
          padding: 14px 16px;
          background: rgba(220,38,38,0.08);
          border: 1px solid rgba(220,38,38,0.25);
          border-radius: 12px;
          color: #dc2626;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .cit-auth-field { margin-bottom: 20px; }
        .cit-auth-field--last { margin-bottom: 28px; }
        .cit-auth-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: rgba(11,27,58,0.82);
          margin-bottom: 8px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .cit-auth-input {
          width: 100%;
          padding: 14px 16px;
          min-height: 44px;
          font-size: 16px;
          border: 1px solid rgba(201,162,39,0.25);
          border-radius: 12px;
          background: white;
          outline: none;
          box-sizing: border-box;
        }
        .cit-auth-submit {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #0B1B3A, #123A7A);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .cit-auth-submit:disabled {
          background: rgba(11,27,58,0.5);
          cursor: not-allowed;
        }
        .cit-auth-forgot {
          margin-top: 18px;
          text-align: center;
        }
        .cit-auth-forgot a {
          color: rgba(11,27,58,0.68);
          font-size: 14px;
          text-decoration: none;
        }
        .cit-auth-switch {
          margin-top: 14px;
          text-align: center;
          font-size: 14px;
          color: rgba(11,27,58,0.68);
        }
        .cit-auth-switch a {
          color: #C9A227;
          font-weight: 600;
          text-decoration: none;
        }
        .cit-auth-dev {
          margin-top: 28px;
          padding: 16px;
          background: rgba(201,162,39,0.06);
          border-radius: 12px;
          font-size: 13px;
          color: rgba(11,27,58,0.68);
          line-height: 1.6;
        }
        .cit-auth-dev code {
          background: rgba(0,0,0,0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .cit-auth-dev-tip {
          display: block;
          margin-top: 8px;
          opacity: 0.85;
        }
        @media (max-width: 480px) {
          .cit-auth-card {
            padding: 24px;
            margin-inline: 12px;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(11,27,58,0.08);
          }
          .cit-auth-heading { font-size: 24px; }
          .cit-auth-sub { font-size: 14px; }
          .cit-auth-header { margin-bottom: 24px; }
          .cit-auth-input { padding: 12px 14px; font-size: 16px; }
          .cit-auth-submit { padding: 14px; font-size: 15px; }
        }
      `}</style>
      <div className="cit-auth-card">
        <div className="cit-auth-header">
          <Link to="/" className="cit-auth-back">
            ← {t("auth.back_home")}
          </Link>
          <h1 className="cit-auth-heading">
            {t("auth.login_title")}
          </h1>
          <p className="cit-auth-sub">
            {t("auth.login_subtitle")}
          </p>
        </div>

        {error && (
          <div className="cit-auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="cit-auth-field">
            <label className="cit-auth-label">
              {t("auth.email_label")}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.email_placeholder")}
              required
              autoFocus
              className="cit-auth-input"
            />
          </div>

          <div className="cit-auth-field cit-auth-field--last">
            <label className="cit-auth-label">
              {t("auth.password_label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.password_placeholder")}
              required
              className="cit-auth-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cit-auth-submit"
          >
            {loading ? t("auth.signing_in") : t("auth.sign_in_btn")}
          </button>
        </form>

        <div className="cit-auth-forgot">
          <Link to="/mot-de-passe-oublie">
            {t("auth.forgot_password")}
          </Link>
        </div>

        <div className="cit-auth-switch">
          {t("auth.new_here")} <Link to={redirectFromQuery ? `/creer-compte?redirect=${encodeURIComponent(redirectFromQuery)}` : "/creer-compte"}>{t("auth.create_account")}</Link>
        </div>

        {import.meta.env.VITE_SHOW_DEV_CREDENTIALS === 'true' && (
          <div className="cit-auth-dev">
            <strong>{t("auth.login.dev_title")}</strong><br />
            {t("auth.login.dev_intro")}<br />
            • {t("auth.login.dev_email")}: <code>OWNER_EMAIL</code> / <code>ADMIN_EMAIL</code><br />
            • {t("auth.login.dev_password")}: <code>OWNER_PASSWORD</code> / <code>ADMIN_PASSWORD</code><br />
            <span className="cit-auth-dev-tip">{t("auth.login.dev_tip")}</span>
          </div>
        )}

      </div>
    </div>
  );
}
