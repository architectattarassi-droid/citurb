import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase, getToken } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";

const P5_PENDING_KEY = "citurbarea:p5:pending_intake:v1";

/**
 * P5Finalize — pont entre la qualification P5 et la création du dossier.
 *
 * Symétrique de P2Finalize : un visiteur a rempli la qualification P5 sans
 * être connecté. Le payload est stocké dans localStorage puis il est redirigé
 * vers /creer-compte/client?next=/p5/finalize qui crée son compte avec double
 * validation email + SMS. Une fois loggué, on rejoue l'intake authentifié et
 * on redirige vers son espace dossiers.
 */
export default function P5Finalize() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "submitting" | "done">("loading");
  const [dossierId, setDossierId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isAuthed) {
      navigate("/creer-compte/client?next=/p5/finalize", { replace: true });
      return;
    }
    let raw: string | null = null;
    try { raw = localStorage.getItem(P5_PENDING_KEY); } catch {}
    if (!raw) {
      navigate("/portal", { replace: true });
      return;
    }
    let payload: any = null;
    try { payload = JSON.parse(raw); } catch {}
    if (!payload) {
      try { localStorage.removeItem(P5_PENDING_KEY); } catch {}
      navigate("/p5", { replace: true });
      return;
    }
    payload.clientEmail = auth.email || payload.clientEmail;
    setPhase("submitting");

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${apiBase()}/p2/intake`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.message || "Erreur lors de la création du dossier");
        try { localStorage.removeItem(P5_PENDING_KEY); } catch {}
        setDossierId(data.dossierId || null);
        setPhase("done");
      } catch (e: any) {
        setError(e?.message || "Erreur inattendue");
        setPhase("done");
      }
    })();
  }, [auth.loading, auth.isAuthed, auth.email, navigate]);

  return (
    <div style={S.screen}>
      <div style={S.card}>
        {phase !== "done" && (
          <>
            <div style={S.spinner} />
            <h1 style={S.title}>Création de votre dossier P5…</h1>
            <p style={S.sub}>Nous enregistrons votre demande de rapport et vous redirigeons vers votre espace.</p>
          </>
        )}
        {phase === "done" && !error && (
          <>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📋</div>
            <h1 style={S.title}>Dossier d'expertise créé</h1>
            <p style={S.sub}>
              Votre demande de rapport est enregistrée. L'équipe vous recontacte sous 24h
              avec le devis ferme + lien de paiement sécurisé.
            </p>
            {dossierId && (
              <div style={{ fontSize: 12, color: "rgba(11,27,58,0.6)", margin: "12px 0 22px" }}>
                Réf. dossier : {dossierId.slice(0, 12)}…
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {dossierId && (
                <a href={`/payment/start?dossier=${dossierId}`} style={S.btnGold}>💳 Payer maintenant</a>
              )}
              <a href="/portal" style={S.btnDark}>📁 Mes dossiers</a>
            </div>
          </>
        )}
        {phase === "done" && error && (
          <>
            <div style={{ fontSize: 48, marginBottom: 10 }}>⚠️</div>
            <h1 style={S.title}>Une erreur est survenue</h1>
            <p style={S.sub}>{error}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
              <a href="/p5" style={S.btnDark}>← Reprendre la qualification</a>
              <a href="/portal" style={S.btnGold}>Voir mes dossiers</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 20px",
    background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), linear-gradient(180deg, #fff, #f8f4ea)",
  },
  card: {
    width: "100%", maxWidth: 540, padding: 40, textAlign: "center",
    background: "rgba(255,255,255,0.96)", border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 20, boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
  },
  spinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "4px solid rgba(201,162,39,0.2)", borderTopColor: GOLD,
    margin: "0 auto 18px",
    animation: "p5spin 1s linear infinite",
  },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 26, fontWeight: 700, color: NAVY, margin: "0 0 10px" },
  sub: { fontSize: 14.5, color: "rgba(11,27,58,0.7)", margin: 0, lineHeight: 1.6 },
  btnGold: {
    background: "linear-gradient(135deg, #C9A227, #E6C75B)",
    color: "#fff", padding: "12px 22px", borderRadius: 8,
    fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block",
  },
  btnDark: {
    background: NAVY, color: "#fff", padding: "12px 22px", borderRadius: 8,
    fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block",
  },
};

if (typeof document !== "undefined" && !document.getElementById("p5-finalize-style")) {
  const s = document.createElement("style");
  s.id = "p5-finalize-style";
  s.textContent = "@keyframes p5spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }";
  document.head.appendChild(s);
}
