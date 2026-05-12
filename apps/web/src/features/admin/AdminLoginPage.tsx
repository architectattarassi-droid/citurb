/**
 * AdminLoginPage — login admin en 4 étapes :
 *   1. Email + password
 *   2. Code OTP reçu par email
 *   3. Code OTP reçu par SMS
 *   4. WebAuthn (Windows Hello / YubiKey)
 *
 * À chaque étape, le serveur émet un sessionToken qui débloque la suivante.
 * Le JWT final est obtenu après l'étape 4, valide 15min.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_THEME, ensureAdminFonts } from "./AdminTheme";
import { adminAuthApi, setSessionToken, setAdminJwt, getAdminJwt } from "./adminApi";
import { startAuthentication } from "@simplewebauthn/browser";

type Step = "email" | "password" | "email-otp" | "sms-otp" | "webauthn" | "done";

export default function AdminLoginPage() {
  useEffect(() => { ensureAdminFonts(); }, []);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [smsOtp, setSmsOtp] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Si déjà loggé, redirige vers dashboard
  useEffect(() => {
    if (getAdminJwt()) navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  const submitLogin = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await adminAuthApi.login(email.trim(), password);
      setSessionToken(r.data.sessionToken!);
      setInfo(r.data.message);
      setStep("email-otp");
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const submitEmailOtp = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await adminAuthApi.verifyEmailOtp(emailOtp);
      setInfo(r.data.message);
      setStep("sms-otp");
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally { setBusy(false); }
  };

  const submitSmsOtp = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await adminAuthApi.verifySmsOtp(smsOtp);
      setInfo(r.data.message);
      const data = r.data as any;
      if (data.nextStep === "REGISTER_PASSKEY_NOW") {
        // Premier login : pas encore de passkey. On stocke le JWT
        // et on redirige vers /admin/security/webauthn pour enregistrer.
        if (data.access_token) setAdminJwt(data.access_token);
        setSessionToken(null);
        setStep("done");
        setTimeout(() => navigate("/admin/security/webauthn"), 400);
      } else if (data.nextStep === "WEBAUTHN") {
        setStep("webauthn");
      } else {
        setErr("Étape suivante inconnue : " + data.nextStep);
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally { setBusy(false); }
  };

  const submitWebauthn = async () => {
    setErr(null); setBusy(true);
    try {
      const beginR = await adminAuthApi.webauthnAuthBegin();
      const credResp = await startAuthentication({ optionsJSON: beginR.data });
      const finishR = await adminAuthApi.webauthnAuthFinish(credResp);
      setAdminJwt(finishR.data.access_token);
      setSessionToken(null);
      setStep("done");
      setTimeout(() => navigate("/admin/dashboard"), 500);
    } catch (e: any) {
      setErr(e?.message || "Erreur WebAuthn — vérifie ton lecteur d'empreinte / clé physique");
    } finally { setBusy(false); }
  };

  return (
    <div style={S.root}>
      <div style={S.card}>
        <header style={S.header}>
          <div style={S.brand}>
            <div style={S.brandSeal}>🛡</div>
            <div>
              <div style={S.brandLabel}>CITURBAREA</div>
              <div style={S.brandSub}>ADMIN VAULT</div>
            </div>
          </div>
          <Stepper step={step} />
        </header>

        <div style={S.formBlock}>
          {err && <div style={S.errorBox}>⚠ {err}</div>}
          {info && !err && <div style={S.infoBox}>ℹ {info}</div>}

          {(step === "email" || step === "password") && (
            <>
              <SectionTitle>1. Identifiant</SectionTitle>
              <input
                style={S.input}
                type="email"
                placeholder="Email administrateur"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && step === "email" && email.includes("@") && setStep("password")}
              />
              {step === "email" && (
                <button onClick={() => email.includes("@") && setStep("password")} disabled={!email.includes("@")} style={S.btnPrimary}>
                  Continuer →
                </button>
              )}
              {step === "password" && (
                <>
                  <input
                    style={{ ...S.input, marginTop: 12 }}
                    type="password"
                    placeholder="Mot de passe (≥ 16 caractères)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitLogin()}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button onClick={() => setStep("email")} style={S.btnGhost}>← Retour</button>
                    <button onClick={submitLogin} disabled={busy || !password} style={{ ...S.btnPrimary, flex: 1 }}>
                      {busy ? "Validation…" : "Recevoir code email"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === "email-otp" && (
            <>
              <SectionTitle>2. Code reçu par email</SectionTitle>
              <p style={S.help}>Vérifie ta boîte <strong>{maskEmail(email)}</strong>. Le code est valable 5 minutes.</p>
              <input
                style={{ ...S.input, fontFamily: ADMIN_THEME.fontMono, letterSpacing: "0.6em", fontSize: 22, textAlign: "center" }}
                placeholder="• • • • • •"
                value={emailOtp}
                maxLength={6}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && emailOtp.length === 6 && submitEmailOtp()}
                autoFocus
              />
              <button onClick={submitEmailOtp} disabled={busy || emailOtp.length !== 6} style={{ ...S.btnPrimary, marginTop: 14 }}>
                {busy ? "Vérification…" : "Vérifier code email"}
              </button>
            </>
          )}

          {step === "sms-otp" && (
            <>
              <SectionTitle>3. Code reçu par SMS</SectionTitle>
              <p style={S.help}>Vérifie ton téléphone. Le code est valable 5 minutes.</p>
              <input
                style={{ ...S.input, fontFamily: ADMIN_THEME.fontMono, letterSpacing: "0.6em", fontSize: 22, textAlign: "center" }}
                placeholder="• • • • • •"
                value={smsOtp}
                maxLength={6}
                onChange={(e) => setSmsOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && smsOtp.length === 6 && submitSmsOtp()}
                autoFocus
              />
              <button onClick={submitSmsOtp} disabled={busy || smsOtp.length !== 6} style={{ ...S.btnPrimary, marginTop: 14 }}>
                {busy ? "Vérification…" : "Vérifier code SMS"}
              </button>
            </>
          )}

          {step === "webauthn" && (
            <>
              <SectionTitle>4. Empreinte / clé physique</SectionTitle>
              <p style={S.help}>
                Pose ton doigt sur le lecteur, regarde la caméra, ou insère ta YubiKey et appuie dessus.
              </p>
              <div style={S.webauthnBox}>
                <div style={{ fontSize: 56 }}>👆</div>
                <div style={{ marginTop: 16, fontFamily: ADMIN_THEME.fontDisplay, fontSize: 18 }}>
                  Authentification matérielle
                </div>
                <button onClick={submitWebauthn} disabled={busy} style={{ ...S.btnPrimary, marginTop: 18 }}>
                  {busy ? "Attente du capteur…" : "Lancer la vérification"}
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 64, color: ADMIN_THEME.success }}>✓</div>
              <div style={{ fontFamily: ADMIN_THEME.fontDisplay, fontSize: 20, marginTop: 12 }}>Connexion validée</div>
              <div style={{ color: ADMIN_THEME.inkMid, fontSize: 13, marginTop: 6 }}>Redirection vers le dashboard…</div>
            </div>
          )}
        </div>

        <footer style={S.footer}>
          <span style={S.footerText}>
            🛡 10 couches de protection actives · session 15 min
          </span>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={S.sectionTitle}>{children}</h2>;
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "password", label: "1" },
    { key: "email-otp", label: "2" },
    { key: "sms-otp", label: "3" },
    { key: "webauthn", label: "4" },
  ];
  const idx = step === "email" ? 0 : steps.findIndex((s) => s.key === step);
  return (
    <div style={S.stepper}>
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div style={{
            ...S.stepDot,
            background: i < idx ? ADMIN_THEME.success : i === idx ? ADMIN_THEME.accent : ADMIN_THEME.bgRaised,
            color: i <= idx ? ADMIN_THEME.bg : ADMIN_THEME.inkMid,
          }}>{i < idx ? "✓" : s.label}</div>
          {i < steps.length - 1 && <div style={{ ...S.stepLine, background: i < idx ? ADMIN_THEME.success : ADMIN_THEME.bgRaised }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 2)}***@${d}`;
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh", background: ADMIN_THEME.bg, fontFamily: ADMIN_THEME.fontBody, color: ADMIN_THEME.ink,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    backgroundImage: "radial-gradient(ellipse at top, rgba(176, 141, 87, 0.08) 0%, transparent 50%)",
  },
  card: {
    width: "100%", maxWidth: 480, background: ADMIN_THEME.bgPanel,
    border: `1px solid ${ADMIN_THEME.border}`, borderRadius: 12, boxShadow: ADMIN_THEME.shadow, overflow: "hidden",
  },
  header: {
    padding: "24px 28px 18px", borderBottom: `1px solid ${ADMIN_THEME.border}`,
    display: "flex", flexDirection: "column", gap: 18,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandSeal: {
    width: 40, height: 40, borderRadius: 8, background: ADMIN_THEME.bg, color: ADMIN_THEME.accent,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700,
    border: `1px solid ${ADMIN_THEME.border}`,
  },
  brandLabel: { fontSize: 11, letterSpacing: "0.22em", color: ADMIN_THEME.accent, fontWeight: 600 },
  brandSub: { fontSize: 16, fontFamily: ADMIN_THEME.fontDisplay, color: ADMIN_THEME.ink, fontWeight: 600, marginTop: 2 },

  stepper: { display: "flex", alignItems: "center", gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: "50%", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.25s",
  },
  stepLine: { flex: 1, height: 2, transition: "background 0.25s" },

  formBlock: { padding: "20px 28px 24px" },

  sectionTitle: {
    fontFamily: ADMIN_THEME.fontDisplay, fontSize: 18, color: ADMIN_THEME.ink,
    fontWeight: 600, marginBottom: 14, marginTop: 0,
  },

  input: {
    width: "100%", padding: "12px 14px", border: `1px solid ${ADMIN_THEME.border}`,
    borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none",
    background: ADMIN_THEME.bgRaised, color: ADMIN_THEME.ink, boxSizing: "border-box" as const,
  },
  help: { fontSize: 13, color: ADMIN_THEME.inkMid, marginTop: 0, marginBottom: 14, lineHeight: 1.5 },

  btnPrimary: {
    width: "100%", background: ADMIN_THEME.accent, color: ADMIN_THEME.bg, border: 0,
    padding: "12px 22px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.04em", textTransform: "uppercase" as const,
  },
  btnGhost: {
    background: "transparent", border: `1px solid ${ADMIN_THEME.border}`, color: ADMIN_THEME.inkMid,
    padding: "12px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
  },

  errorBox: {
    background: ADMIN_THEME.dangerBg, color: ADMIN_THEME.danger, padding: "10px 14px",
    borderRadius: 6, fontSize: 13, marginBottom: 16, border: `1px solid ${ADMIN_THEME.danger}40`,
  },
  infoBox: {
    background: ADMIN_THEME.infoBg, color: ADMIN_THEME.info, padding: "10px 14px",
    borderRadius: 6, fontSize: 13, marginBottom: 16, border: `1px solid ${ADMIN_THEME.info}40`,
  },

  webauthnBox: {
    textAlign: "center" as const, padding: "28px 20px",
    background: ADMIN_THEME.bgRaised, borderRadius: 8, border: `1px solid ${ADMIN_THEME.border}`,
  },

  footer: {
    padding: "12px 28px", borderTop: `1px solid ${ADMIN_THEME.border}`,
    background: ADMIN_THEME.bg, textAlign: "center" as const,
  },
  footerText: { fontSize: 11, color: ADMIN_THEME.inkMuted, letterSpacing: "0.04em" },
};
