import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../../tomes/tome4/apiClient";

export default function Signup() {
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
      setError(err?.message || "Erreur inscription");
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
        maxWidth: "440px",
        padding: "40px",
        margin: "0 20px",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(201,162,39,0.25)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: "14px", display: "inline-block", marginBottom: "16px" }}>
            ← Retour à l\'accueil
          </Link>
          <h1 style={{
            fontFamily: "\"Playfair Display\", serif",
            fontSize: "32px",
            fontWeight: 700,
            color: "#0B1B3A",
            margin: "0 0 8px",
          }}>
            Créer mon dossier
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(11,27,58,0.68)", margin: 0 }}>
            Accédez aux packs et démarrez votre projet
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
              NOM D\'UTILISATEUR
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre nom"
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
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
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
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
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
              background: loading ? "rgba(201,162,39,0.5)" : "linear-gradient(135deg, #C9A227, #E6C75B)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Création..." : "Créer mon dossier"}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          textAlign: "center",
          fontSize: "14px",
          color: "rgba(11,27,58,0.68)",
        }}>
          Déjà un compte ? <Link to="/auth/login" style={{ color: "#C9A227", fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
