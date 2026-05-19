import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import { apiFetch } from "../../tome4/apiClient";

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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loginWithPassword } = useAuth();
  const redirect = params.get("redirect") || params.get("next") || "/p1";

  const [step, setStep] = useState<"form" | "verify">("form");

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    if (!prenom.trim() || !nom.trim()) return "Indiquez votre prénom et votre nom.";
    if (!cleanEmail.includes("@") || cleanEmail.length < 5) return "Adresse email invalide.";
    if (phone.replace(/[^0-9+]/g, "").length < 8) return "Numéro de téléphone invalide (format conseillé : +212…).";
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== confirm) return "Les deux mots de passe ne correspondent pas.";
    return null;
  };

  // Étape 1 → envoie les deux codes (email + SMS).
  const requestCodes = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    const v = validateForm();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const r: any = await apiFetch("/auth/client-signup/request", {
        method: "POST",
        body: { email: cleanEmail, phone: phone.trim() },
      });
      setMasked({ email: r?.maskedEmail || cleanEmail, phone: r?.maskedPhone || phone.trim() });
      setDevCodes({ email: r?.devEmailCode, phone: r?.devPhoneCode });
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'envoi des codes.");
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 → vérifie les deux codes puis crée le compte.
  const confirmSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (emailCode.trim().length < 4 || phoneCode.trim().length < 4) {
      setError("Saisissez les deux codes reçus (email + SMS).");
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
              <Link to="/creer-compte" style={S.back}>← Type de compte</Link>
              <h1 style={S.title}>Créer mon espace client</h1>
              <p style={S.sub}>Pour suivre votre projet et vos dossiers CITURBAREA.</p>
            </div>

            {error && <div style={S.error}>{error}</div>}

            <form onSubmit={requestCodes}>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Prénom</label>
                  <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Prénom" required autoFocus style={S.input} />
                </div>
                <div style={S.col}>
                  <label style={S.label}>Nom</label>
                  <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
                    placeholder="Nom" required style={S.input} />
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" required style={S.input} />
              </div>

              <div style={S.field}>
                <label style={S.label}>Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 00 00 00 00" required style={S.input} />
              </div>

              <div style={S.field}>
                <label style={S.label}>Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères" required style={S.input} />
              </div>

              <div style={{ ...S.field, marginBottom: 28 }}>
                <label style={S.label}>Confirmer le mot de passe</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••••" required style={S.input} />
              </div>

              <button type="submit" disabled={loading} style={{ ...S.submit, ...(loading ? S.submitOff : {}) }}>
                {loading ? "Envoi des codes…" : "Continuer"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={S.head}>
              <button type="button" onClick={() => { setStep("form"); setError(""); }} style={S.linkBtn}>
                ← Modifier mes informations
              </button>
              <h1 style={S.title}>Vérification</h1>
              <p style={S.sub}>
                Pour confirmer votre identité, saisissez les deux codes — un envoyé par email à{" "}
                <b>{masked.email}</b>, un par SMS au <b>{masked.phone}</b>.
              </p>
            </div>

            {error && <div style={S.error}>{error}</div>}
            {(devCodes.email || devCodes.phone) && (
              <div style={S.devHint}>
                Mode test — code email : <b>{devCodes.email || "envoyé"}</b> · code SMS : <b>{devCodes.phone || "envoyé"}</b>
              </div>
            )}

            <form onSubmit={confirmSignup}>
              <div style={S.field}>
                <label style={S.label}>Code reçu par email</label>
                <input type="text" inputMode="numeric" value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)} placeholder="6 chiffres"
                  maxLength={6} required autoFocus style={{ ...S.input, ...S.codeInput }} />
              </div>

              <div style={{ ...S.field, marginBottom: 28 }}>
                <label style={S.label}>Code reçu par SMS</label>
                <input type="text" inputMode="numeric" value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)} placeholder="6 chiffres"
                  maxLength={6} required style={{ ...S.input, ...S.codeInput }} />
              </div>

              <button type="submit" disabled={loading} style={{ ...S.submit, ...(loading ? S.submitOff : {}) }}>
                {loading ? "Vérification…" : "Vérifier et créer mon compte"}
              </button>
            </form>

            <div style={S.footer}>
              Codes non reçus ?{" "}
              <button type="button" onClick={() => requestCodes()} style={S.footerLinkBtn}>Renvoyer les codes</button>
            </div>
          </>
        )}

        <div style={S.footer}>
          Déjà un compte ? <Link to="/login" style={S.footerLink}>Se connecter</Link>
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
