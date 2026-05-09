/**
 * InscriptionPage — Sprint F2
 *
 * Page publique d'inscription via lien d'invitation magique :
 *   /inscription?invite=<token>
 *
 * 1. GET /api/cercles/invitations/lookup?token=… → résout l'invitation
 * 2. Affiche le contexte (cercle, invitant, message)
 * 3. Form : password, displayName, métier, ville
 * 4. POST /api/cercles/invitations/signup → crée User + ProProfile + membership
 * 5. Récupère access_token, le stocke et redirige vers /cercles/<slug>
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { invitationsApi, InvitePreview, ProMetier } from "./api";
import { setToken } from "../../tomes/tome4/apiClient";

const METIERS: { value: ProMetier; label: string }[] = [
  { value: "ARCHITECTE", label: "Architecte" },
  { value: "BET_STRUCTURE", label: "BET Structure" },
  { value: "BET_FLUIDES", label: "BET Fluides (CVC, élec, plomberie)" },
  { value: "BET_VRD", label: "BET VRD" },
  { value: "TOPOGRAPHE", label: "Topographe" },
  { value: "GEOMETRE", label: "Géomètre-topographe" },
  { value: "CONTROLE_TECHNIQUE", label: "Bureau de contrôle" },
  { value: "LABORATOIRE", label: "Laboratoire" },
  { value: "ENTREPRISE_GO", label: "Entreprise Gros œuvre" },
  { value: "ENTREPRISE_SECOND_OEUVRE", label: "Entreprise Second œuvre" },
  { value: "FOURNISSEUR_MATERIAUX", label: "Fournisseur matériaux" },
  { value: "PROMOTEUR", label: "Promoteur" },
  { value: "MOA_PUBLIQUE", label: "MOA publique" },
  { value: "MOA_PRIVEE", label: "MOA privée" },
  { value: "ARTISAN_QUALIFIE", label: "Artisan qualifié" },
];

export default function InscriptionPage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("invite") || "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [metier, setMetier] = useState<ProMetier>("ARCHITECTE");
  const [title, setTitle] = useState("");
  const [villePrincipale, setVille] = useState("");
  const [phonePublic, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLookupErr("Lien d'invitation manquant");
      setLoading(false);
      return;
    }
    invitationsApi.lookup(token)
      .then((r) => {
        if (r.ok && r.data) setPreview(r.data);
        else setLookupErr(r.error || "Invitation invalide");
      })
      .catch((e: any) => setLookupErr(e?.message || "Erreur lookup"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!preview) return;
    if (password.length < 8) { setSubmitErr("Mot de passe ≥ 8 caractères requis"); return; }
    if (!displayName.trim()) { setSubmitErr("Nom d'affichage requis"); return; }
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const r = await invitationsApi.signup({
        token,
        password,
        displayName: displayName.trim(),
        metier,
        title: title.trim() || undefined,
        villePrincipale: villePrincipale.trim() || undefined,
        phonePublic: phonePublic.trim() || undefined,
      });
      if (!r.ok) throw new Error("Inscription refusée");
      setToken(r.data.access_token);
      navigate(`/cercles/${r.data.cercleSlug}`);
    } catch (e: any) {
      setSubmitErr(e?.message || "Erreur inscription");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={S.center}>Chargement de l'invitation…</div>;
  if (lookupErr) return (
    <div style={S.center}>
      <div style={S.errorBox}>
        <h2 style={{ fontFamily: CC_THEME.fontDisplay, color: CC_THEME.danger, marginBottom: 12 }}>Invitation invalide</h2>
        <p style={{ color: CC_THEME.inkMid, fontSize: 14 }}>{lookupErr}</p>
        <button onClick={() => navigate("/")} style={S.btnGhost}>← Accueil</button>
      </div>
    </div>
  );
  if (!preview) return null;

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.eyebrow}>CITURBAREA · CERCLES</div>
          <h1 style={S.title}>Vous êtes invité(e)</h1>
          <p style={S.subtitle}>
            <strong>{preview.invitedBy.username || preview.invitedBy.email}</strong> vous invite à rejoindre
          </p>
          <div style={S.cercleBox}>
            <div style={S.cercleName}>{preview.cercle.name}</div>
            {preview.cercle.description && <div style={S.cercleDesc}>« {preview.cercle.description} »</div>}
          </div>
          {preview.message && (
            <div style={S.msgBox}>
              <strong style={{ color: CC_THEME.or, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.10em" }}>Mot de l'invitant</strong>
              <div style={{ fontSize: 14, marginTop: 4 }}>{preview.message}</div>
            </div>
          )}
        </div>

        <div style={S.formBlock}>
          <div style={S.section}>Créer mon compte</div>
          <Field label="Email">
            <input style={S.input} value={preview.email} disabled />
          </Field>
          <Field label="Nom d'affichage *">
            <input style={S.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ex: Amine Bensouda" />
          </Field>
          <Field label="Métier *">
            <select style={S.input} value={metier} onChange={(e) => setMetier(e.target.value as ProMetier)}>
              {METIERS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Fonction / titre (optionnel)">
            <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Architecte associé · Atelier Bensouda" />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Ville principale">
              <input style={S.input} value={villePrincipale} onChange={(e) => setVille(e.target.value)} placeholder="Casablanca" />
            </Field>
            <Field label="Téléphone (public, optionnel)">
              <input style={S.input} value={phonePublic} onChange={(e) => setPhone(e.target.value)} placeholder="+212522…" />
            </Field>
          </div>
          <Field label="Mot de passe * (≥ 8 caractères)">
            <input type="password" style={S.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>

          {submitErr && <div style={S.formErr}>{submitErr}</div>}

          <button onClick={submit} disabled={submitting} style={S.btnPrimary}>
            {submitting ? "Création…" : "Créer mon compte et rejoindre le cercle"}
          </button>
          <p style={S.legal}>
            En créant ce compte, vous acceptez la doctrine CITURBAREA (anti-désintermédiation, données pro vérifiées).
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: CC_THEME.bg, fontFamily: CC_THEME.fontBody, color: CC_THEME.ink, padding: "32px 16px" },
  card: { maxWidth: 560, margin: "0 auto", background: CC_THEME.bgRaised, borderRadius: 8, overflow: "hidden", boxShadow: CC_THEME.shadowRaise },
  header: { padding: "32px 32px 24px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgDeep, color: CC_THEME.bgSoft },
  eyebrow: { fontSize: 11, letterSpacing: "0.20em", color: CC_THEME.or, fontWeight: 600 },
  title: { margin: "10px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.bgSoft },
  subtitle: { fontSize: 14, opacity: 0.85, marginBottom: 16 },
  cercleBox: { padding: 14, background: "rgba(255,255,255,0.06)", borderRadius: 6, borderLeft: `3px solid ${CC_THEME.or}` },
  cercleName: { fontSize: 16, fontWeight: 600 },
  cercleDesc: { fontSize: 12, fontStyle: "italic", marginTop: 4, color: CC_THEME.bgSoft, opacity: 0.8 },
  msgBox: { marginTop: 14, padding: 12, background: "rgba(176, 141, 87, 0.12)", borderRadius: 4 },

  formBlock: { padding: "24px 32px 32px" },
  section: { fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600, marginBottom: 16 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: CC_THEME.inkMid, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised, boxSizing: "border-box" as const },
  formErr: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "8px 12px", borderRadius: 4, fontSize: 13, marginBottom: 10 },
  btnPrimary: { width: "100%", background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "12px 20px", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", marginTop: 8 },
  legal: { fontSize: 11, color: CC_THEME.inkMuted, textAlign: "center" as const, marginTop: 14 },

  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontBody, color: CC_THEME.inkMid, background: CC_THEME.bg },
  errorBox: { background: CC_THEME.bgRaised, padding: 32, borderRadius: 8, textAlign: "center" as const, maxWidth: 400, boxShadow: CC_THEME.shadowSoft },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "8px 16px", borderRadius: 4, color: CC_THEME.inkMid, cursor: "pointer", marginTop: 16 },
};
