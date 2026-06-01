import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../../tomes/tome4/apiClient";
import { useT } from "../../../i18n/i18n";

export default function Signup() {
  const t = useT();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resp = await apiFetch<any>('/auth/register', {
        method: 'POST',
        body: { email, password, username },
      });
      setToken(resp.access_token);
      localStorage.setItem('citurbarea_user', JSON.stringify({
        userId: resp.user.id,
        email: resp.user.email,
        role: resp.user.role,
      }));
      navigate("/p1/packs");
    } catch (err: any) {
      setError(err?.message || t("auth.signup.error_default"));
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
          background: linear-gradient(135deg, #C9A227, #E6C75B);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .cit-auth-submit:disabled {
          background: rgba(201,162,39,0.5);
          cursor: not-allowed;
        }
        .cit-auth-switch {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: rgba(11,27,58,0.68);
        }
        .cit-auth-switch a {
          color: #C9A227;
          font-weight: 600;
          text-decoration: none;
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
            {t("auth.signup.title")}
          </h1>
          <p className="cit-auth-sub">
            {t("auth.signup.subtitle")}
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
              {t("auth.signup.username_label")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("auth.signup.username_placeholder")}
              required
              autoFocus
              className="cit-auth-input"
            />
          </div>

          <div className="cit-auth-field">
            <label className="cit-auth-label">
              {t("auth.signup.email_label")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.signup.email_placeholder")}
              required
              className="cit-auth-input"
            />
          </div>

          <div className="cit-auth-field cit-auth-field--last">
            <label className="cit-auth-label">
              {t("auth.signup.password_label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signup.password_placeholder")}
              required
              className="cit-auth-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cit-auth-submit"
          >
            {loading ? t("auth.signup.creating") : t("auth.signup.submit")}
          </button>
        </form>

        <div className="cit-auth-switch">
          {t("auth.signup.have_account")} <Link to="/auth/login">{t("auth.signup.sign_in")}</Link>
        </div>
      </div>
    </div>
  );
}
