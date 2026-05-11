/**
 * AdminRegisterPasskeyPage — onboarding WebAuthn pour les admins.
 *
 * Accessible UNIQUEMENT après login complet à 4 facteurs (JWT FULLY_AUTH valide).
 * Permet d'enregistrer Windows Hello (interne) + YubiKey (cross-platform).
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ADMIN_THEME, ensureAdminFonts } from "./AdminTheme";
import { adminAuthApi, getAdminJwt } from "./adminApi";
import { startRegistration } from "@simplewebauthn/browser";

export default function AdminRegisterPasskeyPage() {
  useEffect(() => { ensureAdminFonts(); }, []);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminJwt()) navigate("/admin/login", { replace: true });
  }, [navigate]);

  const register = async (deviceType: "Windows Hello / Touch ID" | "YubiKey (clé physique)") => {
    setErr(null); setSuccess(null); setBusy(true);
    try {
      const beginR = await adminAuthApi.webauthnRegisterBegin(deviceType);
      const credResp = await startRegistration({ optionsJSON: beginR.data });
      await adminAuthApi.webauthnRegisterFinish(credResp, deviceType);
      setSuccess(`✓ ${deviceType} enregistré avec succès. Tu pourras t'authentifier avec à la prochaine connexion.`);
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <Link to="/admin/dashboard" style={S.back}>← Dashboard</Link>
        <h1 style={S.h1}>Enregistrer un passkey</h1>
      </header>

      <main style={S.main}>
        <div style={S.intro}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: ADMIN_THEME.ink }}>
            Tu peux enregistrer plusieurs authentifiants :
          </p>
          <ul style={{ fontSize: 13, color: ADMIN_THEME.inkMid, lineHeight: 1.7, paddingLeft: 20 }}>
            <li><strong style={{ color: ADMIN_THEME.ink }}>Windows Hello / Touch ID</strong> — empreinte ou visage de ton PC. Pratique, marche au quotidien.</li>
            <li><strong style={{ color: ADMIN_THEME.ink }}>YubiKey ou autre clé USB</strong> — backup au cas où ton PC est inaccessible. Recommandé pro.</li>
          </ul>
          <p style={{ fontSize: 12.5, color: ADMIN_THEME.warn, marginTop: 16, padding: 12, background: ADMIN_THEME.warnBg, borderLeft: `3px solid ${ADMIN_THEME.warn}`, borderRadius: 4 }}>
            ⚠ Enregistre au moins <strong>2 passkeys différents</strong> (Windows Hello + YubiKey). Si tu perds le seul enregistré, tu perds l'accès admin définitivement (sauf intervention SUPER_ADMIN tiers).
          </p>
        </div>

        {err && <div style={S.err}>⚠ {err}</div>}
        {success && <div style={S.ok}>{success}</div>}

        <div style={S.cardGrid}>
          <div style={S.card}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👆</div>
            <h3 style={S.cardTitle}>Windows Hello / Touch ID</h3>
            <p style={S.cardDesc}>Utilise l'empreinte, le PIN ou la reconnaissance faciale de ton PC.</p>
            <button onClick={() => register("Windows Hello / Touch ID")} disabled={busy} style={S.btn}>
              {busy ? "En cours…" : "Enregistrer"}
            </button>
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
            <h3 style={S.cardTitle}>Clé physique (YubiKey)</h3>
            <p style={S.cardDesc}>Connecte ta clé en USB ou rapproche-la en NFC, puis appuie dessus.</p>
            <button onClick={() => register("YubiKey (clé physique)")} disabled={busy} style={S.btn}>
              {busy ? "En cours…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 32, padding: 16, background: ADMIN_THEME.bgPanel, borderRadius: 8, border: `1px solid ${ADMIN_THEME.border}`, fontSize: 12, color: ADMIN_THEME.inkMid }}>
          <strong style={{ color: ADMIN_THEME.ink }}>💡 Conseil sécurité</strong>
          <div style={{ marginTop: 6 }}>
            Stocke ta YubiKey de backup dans un endroit physique sécurisé (coffre, banque). Si tu perds Windows Hello (panne PC, vol), la YubiKey reste ton unique moyen d'accès.
          </div>
        </div>
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: ADMIN_THEME.bg, fontFamily: ADMIN_THEME.fontBody, color: ADMIN_THEME.ink },
  header: { padding: "20px 32px", borderBottom: `1px solid ${ADMIN_THEME.border}`, background: ADMIN_THEME.bgPanel },
  back: { color: ADMIN_THEME.inkMid, textDecoration: "none", fontSize: 13, display: "inline-block", marginBottom: 8 },
  h1: { margin: 0, fontFamily: ADMIN_THEME.fontDisplay, fontSize: 24, color: ADMIN_THEME.ink, fontWeight: 600 },

  main: { maxWidth: 760, margin: "0 auto", padding: "32px 24px" },
  intro: { marginBottom: 28 },

  err: { background: ADMIN_THEME.dangerBg, color: ADMIN_THEME.danger, padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16, border: `1px solid ${ADMIN_THEME.danger}40` },
  ok: { background: ADMIN_THEME.successBg, color: ADMIN_THEME.success, padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 16, border: `1px solid ${ADMIN_THEME.success}40` },

  cardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: ADMIN_THEME.bgPanel, border: `1px solid ${ADMIN_THEME.border}`, borderRadius: 10, padding: 24, textAlign: "center" as const },
  cardTitle: { fontFamily: ADMIN_THEME.fontDisplay, fontSize: 17, color: ADMIN_THEME.ink, fontWeight: 600, margin: "8px 0 6px" },
  cardDesc: { fontSize: 12.5, color: ADMIN_THEME.inkMid, lineHeight: 1.5, marginBottom: 18 },
  btn: { width: "100%", background: ADMIN_THEME.accent, color: ADMIN_THEME.bg, border: 0, padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", textTransform: "uppercase" as const },
};
