/**
 * ConfirmEmail — page d'atterrissage du lien de confirmation email (magic link).
 * Échange le token de confirmation contre une session, puis redirige vers /portal.
 * Route : /confirmer-email?token=...&email=...
 */
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setToken } from "../../tome4/apiClient";

export default function ConfirmEmail() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get("token") || "";
    const email = sp.get("email") || "";
    if (!token || !email) {
      setStatus("error");
      setMsg("Lien de confirmation invalide.");
      return;
    }
    (async () => {
      try {
        const r: any = await apiFetch("/auth/email-signup/confirm", { method: "POST", body: { email, token } });
        setToken(r.access_token);
        const u = { userId: r.user.id, email: r.user.email, role: r.user.role };
        localStorage.setItem("citurbarea_user", JSON.stringify(u));
        setStatus("ok");
        setTimeout(() => { window.location.href = "/portal"; }, 1300);
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message || "Confirmation impossible. Le lien a peut-être expiré.");
      }
    })();
  }, []);

  return (
    <div style={S.screen}>
      <div style={S.card}>
        <div style={S.eyebrow}>CITURBAREA</div>
        {status === "loading" && (
          <>
            <h1 style={S.title}>Activation de votre compte…</h1>
            <p style={S.sub}>Un instant, nous confirmons votre email.</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div style={{ fontSize: 40 }}>✓</div>
            <h1 style={S.title}>Compte activé !</h1>
            <p style={S.sub}>Vous êtes connecté. Redirection vers votre espace…</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 style={S.title}>Lien invalide</h1>
            <p style={S.sub}>{msg}</p>
            <Link to="/creer-compte/client" style={S.btn}>Recommencer l'inscription</Link>
          </>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  screen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", padding: 24, fontFamily: "Inter, system-ui, sans-serif" },
  card: { maxWidth: 420, width: "100%", background: "#fff", border: "1px solid #E8E2D5", borderRadius: 12, padding: 36, textAlign: "center" },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: "#B08D57", fontWeight: 600, textTransform: "uppercase" },
  title: { fontFamily: "Georgia, serif", fontSize: 24, color: "#0F2A4A", margin: "12px 0 8px", fontWeight: 600 },
  sub: { fontSize: 14, color: "#5C6373", lineHeight: 1.6 },
  btn: { display: "inline-block", marginTop: 18, background: "#0F2A4A", color: "#FAF7F2", textDecoration: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14 },
};
