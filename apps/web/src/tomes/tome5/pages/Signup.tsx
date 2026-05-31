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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
    }}>
      <style>{`
        .cit-auth-card { max-width: 520px; padding: 40px; margin-inline: 20px; }
        @media(max-width:480px){
          .cit-auth-card { padding: 24px; margin-inline: 12px; }
          .cit-auth-heading { font-size: 24px !important; }
        }
        .cit-auth-input { padding: 14px 16px; min-height: 44px; font-size: 16px; }
      `}</style>
      <div className="cit-auth-card" style={{
        width: "100%",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(201,162,39,0.25)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: "14px", display: "inline-block", marginBottom: "16px" }}>
            ← {t("auth.back_home")}
          </Link>
          <h1 className="cit-auth-heading" style={{
            fontFamily: "\"Playfair Display\", serif",
            fontSize: "32px",
            fontWeight: 700,
            color: "#0B1B3A",
            margin: "0 0 8px",
          }}>
            {t("auth.signup.title")}
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(11,27,58,0.68)", margin: 0 }}>
            {t("auth.signup.subtitle")}
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
              style={{
                width: "100%",
                border: "1px solid rgba(201,162,39,0.25)",
                borderRadius: "12px",
                background: "white",
                outline: "none",
              }}
            />
          </div>

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
              {t("auth.signup.email_label")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.signup.email_placeholder")}
              required
              className="cit-auth-input"
              style={{
                width: "100%",
                border: "1px solid rgba(201,162,39,0.25)",
                borderRadius: "12px",
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
              {t("auth.signup.password_label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signup.password_placeholder")}
              required
              className="cit-auth-input"
              style={{
                width: "100%",
                border: "1px solid rgba(201,162,39,0.25)",
                borderRadius: "12px",
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
              background: loading ? "rgba(201,162,39,0.5)" : "linear-gradient(135deg, #C9A227, #E6C75B)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? t("auth.signup.creating") : t("auth.signup.submit")}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          textAlign: "center",
          fontSize: "14px",
          color: "rgba(11,27,58,0.68)",
        }}>
          {t("auth.signup.have_account")} <Link to="/auth/login" style={{ color: "#C9A227", fontWeight: 600, textDecoration: "none" }}>{t("auth.signup.sign_in")}</Link>
        </div>
      </div>
    </div>
  );
}
