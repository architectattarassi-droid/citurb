import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { apiFetch } from "../../tome4/apiClient";
import { useT } from "../../../i18n/i18n";

/**
 * ClientSignup — /creer-compte/client
 *
 * Inscription dédiée aux particuliers / clients, en 2 étapes avec
 * DOUBLE VALIDATION :
 *   1. Formulaire — identité + contact + mot de passe.
 *   2. Vérification — un code reçu par email ET un code reçu par SMS ;
 *      le compte CLIENT n'est créé que si les deux codes sont validés.
 *
 * Accepte ?redirect= pour revenir sur la porte d'origine après inscription.
 */
export default function ClientSignup() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginWithPassword } = useAuth();
  const redirect = params.get("redirect") || params.get("next") || "/p1";

  const [step, setStep] = useState<"form" | "sent">("form");
  const [devLink, setDevLink] = useState<string | undefined>(undefined);

  // Préremplissage depuis les query params (ex. arrivée depuis la qualification P2)
  const initialName = (params.get("name") || "").trim();
  const initialPrenom = initialName.split(/\s+/)[0] || "";
  const initialNom = initialName.split(/\s+/).slice(1).join(" ") || "";

  const [prenom, setPrenom] = useState(initialPrenom);
  const [nom, setNom] = useState(initialNom);
  const [email, setEmail] = useState((params.get("email") || "").trim());
  const [phone, setPhone] = useState((params.get("phone") || "").trim());
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [masked, setMasked] = useState<{ email: string; phone: string }>({ email: "", phone: "" });
  const [devCodes, setDevCodes] = useState<{ email?: string; phone?: string }>({});

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const validateForm = (): string | null => {
    if (!prenom.trim() || !nom.trim()) return t("auth.error_required_firstlast");
    if (!cleanEmail.includes("@") || cleanEmail.length < 5) return t("auth.error_invalid_email");
    // Téléphone facultatif (validation par email uniquement — Twilio en instance).
    if (phone.trim() && phone.replace(/[^0-9+]/g, "").length < 8) return t("auth.error_invalid_phone");
    if (password.length < 8) return t("auth.error_password_min");
    if (password !== confirm) return t("auth.error_password_mismatch");
    return null;
  };

  // Inscription par lien email (magic link, sans SMS — Twilio en instance).
  const requestCodes = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    const v = validateForm();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const r: any = await apiFetch("/auth/email-signup", {
        method: "POST",
        body: { email: cleanEmail, password, username: `${prenom.trim()} ${nom.trim()}`, phone: phone.trim() || undefined },
      });
      setMasked({ email: r?.maskedEmail || cleanEmail, phone: phone.trim() });
      setDevLink(r?.devLink);
      setStep("sent");
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 → vérifie les deux codes puis crée le compte.
  const confirmSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Un seul code suffit (repli email ↔ SMS) : on exige AU MOINS un code.
    if (emailCode.trim().length < 4 && phoneCode.trim().length < 4) {
      setError("Saisissez le code reçu par email OU par SMS (un seul suffit).");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/client-signup/confirm", {
        method: "POST",
        body: {
          email: cleanEmail,
          phone: phone.trim(),
          password,
          username: `${prenom.trim()} ${nom.trim()}`,
          emailCode: emailCode.trim(),
          phoneCode: phoneCode.trim(),
        },
      });
      await loginWithPassword(cleanEmail, password);
      navigate(redirect);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.screen}>
      <div style={S.card}>
        {step === "form" ? (
          <>
            <div style={S.head}>
              <Link to="/creer-compte" style={S.back}>← {t("auth.account_type_back")}</Link>
              <h1 style={S.title}>{t("auth.client_create_title")}</h1>
              <p style={S.sub}>{t("auth.client_create_sub")}</p>
            </div>

            {error && <div style={S.error}>{error}</div>}

            <form onSubmit={requestCodes}>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>{t("auth.firstname")}</label>
                  <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)}
                    placeholder={t("auth.firstname")} required autoFocus style={S.input} />
                </div>
                <div style={S.col}>
                  <label style={S.label}>{t("auth.lastname")}</label>
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                    placeholder={t("auth.lastname")} required style={S.input} />
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>{t("auth.email_label")}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("common.placeholder_email")} required style={S.input} />
              </div>

              <div style={S.field}>
                <label style={S.label}>{t("auth.phone")}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("common.placeholder_phone")} required style={S.input} />
              </div>

              <div style={S.field}>
                <label style={S.label}>{t("auth.password_label")}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.password_placeholder")} required style={S.input} />
              </div>

              <div style={{ ...S.field, marginBottom: 28 }}>
                <label style={S.label}>{t("auth.confirm_password")}</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("auth.password_placeholder")} required style={S.input} />
              </div>

              <button type="submit" disabled={loading} style={{ ...S.submit, ...(loading ? S.submitOff : {}) }}>
                {loading ? t("auth.sending_codes") : t("auth.continue")}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={S.head}>
              <button type="button" onClick={() => { setStep("form"); setError(""); }} style={S.linkBtn}>
                ← {t("auth.modify_info")}
              </button>
              <h1 style={S.title}>Vérifiez votre email</h1>
              <p style={S.sub}>
                Un email de confirmation a été envoyé à <b>{masked.email}</b>. Cliquez sur le lien dans cet email pour activer votre compte — vous serez connecté automatiquement.
              </p>
            </div>

            {error && <div style={S.error}>{error}</div>}
            {devLink && (
              <div style={S.devHint}>
                Mode test — lien de confirmation : <a href={devLink} style={{ wordBreak: "break-all", color: "#B08D57" }}>{devLink}</a>
              </div>
            )}

            <div style={S.footer}>
              Email non reçu ?{" "}
              <button type="button" onClick={() => requestCodes()} style={S.footerLinkBtn}>Renvoyer le lien</button>
            </div>
          </>
        )}

        <div style={S.footer}>
          {t("auth.already_account")} <Link to="/login" style={S.footerLink}>{t("auth.sign_in_btn")}</Link>
        </div>
      </div>
    </div>
  );
}

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    background:
      "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    padding: 40,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 20,
    boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
  },
  head: { textAlign: "center", marginBottom: 28 },
  back: { textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: 14, display: "inline-block", marginBottom: 16 },
  linkBtn: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: "rgba(11,27,58,0.68)", fontSize: 14, marginBottom: 16, fontFamily: "inherit",
  },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 30, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  sub: { fontSize: 14.5, color: "rgba(11,27,58,0.68)", margin: 0, lineHeight: 1.55 },
  error: {
    padding: "14px 16px",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.25)",
    borderRadius: 12,
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 24,
  },
  devHint: {
    padding: "10px 14px",
    background: "rgba(201,162,39,0.10)",
    border: "1px solid rgba(201,162,39,0.3)",
    borderRadius: 10,
    color: "#7a6010",
    fontSize: 12.5,
    marginBottom: 20,
  },
  row: { display: "flex", gap: 14 },
  col: { flex: 1, marginBottom: 20 },
  field: { marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(11,27,58,0.82)",
    marginBottom: 8,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 12,
    fontSize: 15,
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  },
  codeInput: { letterSpacing: "0.4em", fontSize: 20, fontWeight: 700, textAlign: "center" },
  submit: {
    width: "100%",
    padding: 16,
    background: "linear-gradient(135deg, #C9A227, #E6C75B)",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  submitOff: { background: "rgba(201,162,39,0.5)", cursor: "not-allowed" },
  footer: { marginTop: 22, textAlign: "center", fontSize: 14, color: "rgba(11,27,58,0.68)" },
  footerLink: { color: GOLD, fontWeight: 600, textDecoration: "none" },
  footerLinkBtn: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: GOLD, fontWeight: 600, fontSize: 14, fontFamily: "inherit", textDecoration: "underline",
  },
};
