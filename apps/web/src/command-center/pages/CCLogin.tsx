import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setToken } from "../../tomes/tome4/apiClient";

/**
 * Hors développement local, le back-office n'a pas d'API NestJS : la connexion
 * se fait par mot de passe auprès de la Pages Function /api/cc/login, qui pose
 * un cookie de session (HttpOnly) lu par la garde /api/cc/*.
 * En local (localhost), on garde l'ancien login e-mail + mot de passe vers l'API.
 */
const estLocal = (): boolean => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
};

export default function CCLogin() {
  return estLocal() ? <CCLoginApi /> : <CCLoginMotDePasse />;
}

function CCLoginMotDePasse() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/cc/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        setPassword("");
        navigate("/cc/leads", { replace: true });
        return;
      }
      setError(r.status === 429
        ? "Trop de tentatives. Réessayez dans un quart d'heure."
        : "Connexion impossible. Vérifiez le mot de passe et réessayez.");
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={L.page}>
      <div style={L.carte}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa", letterSpacing: 2 }}>CITURBAREA</div>
          <div style={{ fontSize: 11, color: "#8892a4", marginTop: 4, letterSpacing: 1 }}>COMMAND CENTER</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="cc-password" style={L.label}>Mot de passe</label>
            <input
              id="cc-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "cc-login-error" : undefined}
              style={L.input}
            />
          </div>
          {error && <div id="cc-login-error" role="alert" style={L.erreur}>{error}</div>}
          <button type="submit" disabled={loading || !password} style={L.bouton(loading || !password)}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

const L = {
  page: { minHeight: "100vh", background: "#060b14", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" } as React.CSSProperties,
  carte: { width: "100%", maxWidth: 360, background: "#0d1117", borderRadius: 12, border: "1px solid #1e2330", padding: "40px 28px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", boxSizing: "border-box" } as React.CSSProperties,
  label: { fontSize: 13, color: "#c3cad8", fontWeight: 600, display: "block", marginBottom: 6 } as React.CSSProperties,
  input: { width: "100%", padding: 12, background: "#0a0f1a", border: "1px solid #3a4256", borderRadius: 6, color: "#e8eaf0", fontSize: 16, boxSizing: "border-box" } as React.CSSProperties,
  erreur: { fontSize: 14, color: "#fca5a5", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6, padding: "8px 12px" } as React.CSSProperties,
  bouton: (off: boolean): React.CSSProperties => ({
    marginTop: 8, padding: "12px 0", minHeight: 44, background: off ? "#1e2330" : "#1d4ed8", color: off ? "#8892a4" : "#fff",
    border: "none", borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: off ? "not-allowed" : "pointer",
  }),
};

function CCLoginApi() {
  const [email, setEmail] = useState("citurbarea@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      navigate("/cc/dossiers", { replace: true });
    } catch {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#060b14",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 360, background: "#0d1117", borderRadius: 12,
        border: "1px solid #1e2330", padding: "40px 36px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa", letterSpacing: 2 }}>
            CITURBAREA
          </div>
          <div style={{ fontSize: 11, color: "#4a5568", marginTop: 4, letterSpacing: 1 }}>
            COMMAND CENTER
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: "#8892a4", fontWeight: 700, display: "block", marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", background: "#0a0f1a",
                border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0",
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "#8892a4", fontWeight: 700, display: "block", marginBottom: 6 }}>
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "10px 12px", background: "#0a0f1a",
                border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0",
                fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6,
              padding: "8px 12px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: "11px 0", background: loading ? "#1e2330" : "#1d4ed8",
              color: loading ? "#4a5568" : "#fff", border: "none", borderRadius: 6,
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
