/**
 * InscriptionPage — Sprint F2 + enrichi Sprint K
 *
 * Page publique d'inscription via lien d'invitation magique :
 *   /inscription?invite=<token>
 *
 * Fiche complète : photo profil, identité, exercice (statut + cabinet),
 * formation (école + année + diplôme), CNOA, spécialités, régions, langues,
 * contact, réseaux sociaux, motivation.
 *
 * Flow :
 * 1. GET /api/cercles/invitations/lookup → résout l'invitation
 * 2. Form 3 étapes : Identité → Exercice/Formation → Profil pro
 * 3. POST /api/cercles/invitations/signup → User + ProProfile + membership
 * 4. POST /api/cercles/me/profile/avatar (si photo) → upload + update ProProfile
 * 5. Redirige vers /cercles/<slug>
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

const STATUTS_EXERCICE = [
  { value: "",                     label: "— Sélectionner —" },
  { value: "INDEPENDANT_PHYSIQUE", label: "Indépendant — personne physique" },
  { value: "LIBERAL",              label: "Libéral" },
  { value: "ASSOCIE",              label: "Associé d'un cabinet" },
  { value: "SALARIE_CABINET",      label: "Salarié d'un cabinet" },
  { value: "SALARIE_ENTREPRISE",   label: "Salarié d'une entreprise" },
  { value: "FONCTIONNAIRE",        label: "Fonctionnaire" },
  { value: "ENSEIGNANT",           label: "Enseignant en architecture" },
  { value: "ETUDIANT",             label: "Étudiant" },
  { value: "RETRAITE",             label: "Retraité" },
  { value: "HONORAIRE",            label: "Membre honoraire" },
];

const ECOLES_ARCHI = [
  "ENA Rabat (École Nationale d'Architecture)",
  "EAC Casablanca (École d'Architecture)",
  "EAR Marrakech",
  "EAT Tétouan (Architecture & Design)",
  "EAF Fès",
  "ISA Casablanca",
  "ENSA Marseille (France)",
  "ENSA Paris-Belleville (France)",
  "ENSA Versailles (France)",
  "Politecnico di Milano (Italie)",
  "ETSAM Madrid (Espagne)",
  "Bartlett UCL Londres (UK)",
  "Autre — préciser dans bio",
];

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

const LANGUES = [
  { value: "FR", label: "Français" }, { value: "AR", label: "العربية" },
  { value: "EN", label: "English" }, { value: "BERBERE", label: "Tamaziɣt" },
  { value: "ES", label: "Español" }, { value: "IT", label: "Italiano" }, { value: "DE", label: "Deutsch" },
];

type Step = 1 | 2 | 3;

export default function InscriptionPage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("invite") || "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);

  // Identité
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [metier, setMetier] = useState<ProMetier>("ARCHITECTE");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // Exercice / Formation
  const [cabinetStatus, setCabinetStatus] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [cnoaNumero, setCnoa] = useState("");
  const [yearsExperience, setYearsExp] = useState("");
  const [ecole, setEcole] = useState("");
  const [anneeDiplome, setAnneeDiplome] = useState("");
  const [diplome, setDiplome] = useState("");

  // Profil pro
  const [villePrincipale, setVille] = useState("");
  const [phonePublic, setPhone] = useState("");
  const [emailPublic, setEmailPublic] = useState("");
  const [websiteUrl, setWeb] = useState("");
  const [linkedinUrl, setLinkedin] = useState("");
  const [specialitesText, setSpecialitesText] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [langues, setLangues] = useState<string[]>(["FR", "AR"]);

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

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("Photo trop lourde (max 5 Mo).");
      return;
    }
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const validateStep = (s: Step): string | null => {
    if (s === 1) {
      if (password.length < 8) return "Mot de passe ≥ 8 caractères requis";
      if (!displayName.trim()) return "Nom complet requis";
      return null;
    }
    if (s === 2) {
      if (!cabinetStatus) return "Statut d'exercice requis";
      // CNOA obligatoire pour architectes sauf étudiants
      if (metier === "ARCHITECTE" && cabinetStatus !== "ETUDIANT" && !cnoaNumero.trim()) {
        return "N° CNOA requis pour les architectes (sauf étudiants)";
      }
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setSubmitErr(err); return; }
    setSubmitErr(null);
    setStep((step + 1) as Step);
  };

  const submit = async () => {
    if (!preview) return;
    setSubmitErr(null); setSubmitting(true);
    try {
      const r = await invitationsApi.signup({
        token,
        password,
        displayName: displayName.trim(),
        metier,
        title: cabinetStatus ? STATUTS_EXERCICE.find(s => s.value === cabinetStatus)?.label : undefined,
        bio: bio.trim() || undefined,
        cabinetName: cabinetName.trim() || undefined,
        cabinetStatus,
        cnoaNumero: cnoaNumero.trim() || undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        ecole: ecole || undefined,
        anneeDiplome: anneeDiplome ? Number(anneeDiplome) : undefined,
        diplome: diplome.trim() || undefined,
        villePrincipale: villePrincipale.trim() || undefined,
        phonePublic: phonePublic.trim() || undefined,
        emailPublic: emailPublic.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        specialites: specialitesText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
        regions,
        langues,
      });
      if (!r.ok) throw new Error("Inscription refusée");

      // Store JWT pour upload avatar + redirect
      setToken(r.data.access_token);

      // Upload avatar si fourni
      if (avatarFile) {
        try {
          await invitationsApi.uploadAvatar(avatarFile);
        } catch (e: any) {
          console.warn("Avatar upload fail :", e?.message);
        }
      }

      // Redirection vers le cercle
      navigate(`/cercles/${r.data.cercleSlug}`);
    } catch (e: any) {
      setSubmitErr(e?.message || "Erreur inscription");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleListVal = (list: string[], setList: (v: string[]) => void, val: string) => {
    if (list.includes(val)) setList(list.filter(x => x !== val));
    else setList([...list, val]);
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
        <header style={S.header}>
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

          {/* Stepper */}
          <div style={S.stepperBar}>
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div style={{
                  ...S.stepDot,
                  background: step >= n ? CC_THEME.or : "rgba(255,255,255,0.15)",
                  color: step >= n ? CC_THEME.bgDeep : CC_THEME.bgSoft,
                }}>{n}</div>
                {n < 3 && <div style={{ ...S.stepLine, background: step > n ? CC_THEME.or : "rgba(255,255,255,0.15)" }} />}
              </React.Fragment>
            ))}
          </div>
          <div style={S.stepLabels}>
            <span style={{ color: step === 1 ? CC_THEME.or : CC_THEME.bgSoft }}>1. Identité</span>
            <span style={{ color: step === 2 ? CC_THEME.or : CC_THEME.bgSoft }}>2. Exercice & formation</span>
            <span style={{ color: step === 3 ? CC_THEME.or : CC_THEME.bgSoft }}>3. Profil pro</span>
          </div>
        </header>

        <div style={S.formBlock}>
          {step === 1 && (
            <>
              <SectionTitle>Identité</SectionTitle>

              <div style={S.avatarRow}>
                <label style={S.avatarLabel}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" style={S.avatarImg} />
                  ) : (
                    <div style={S.avatarPlaceholder}>📷</div>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} style={{ display: "none" }} />
                  <span style={S.avatarHint}>{avatarFile ? "Changer la photo" : "Ajouter une photo (optionnel, max 5 Mo)"}</span>
                </label>
              </div>

              <Field label="Email">
                <input style={S.input} value={preview.email} disabled />
              </Field>
              <Field label="Nom complet *">
                <input style={S.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ex: Amine El Fassi" />
              </Field>
              <Field label="Métier *">
                <select style={S.input} value={metier} onChange={(e) => setMetier(e.target.value as ProMetier)}>
                  {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Mot de passe * (≥ 8 caractères)">
                <input type="password" style={S.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Bio courte (optionnel)">
                <textarea style={{ ...S.input, minHeight: 70 }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Quelques lignes sur toi, ton parcours, tes spécialités…" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Exercice & Formation</SectionTitle>
              <Field label="Statut d'exercice *">
                <select style={S.input} value={cabinetStatus} onChange={(e) => setCabinetStatus(e.target.value)}>
                  {STATUTS_EXERCICE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Nom de la société / cabinet (laisser vide si indépendant)">
                <input style={S.input} value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder="ex: Atelier El Fassi Architectes" />
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label={`Numéro CNOA${metier === "ARCHITECTE" && cabinetStatus !== "ETUDIANT" ? " *" : " (si applicable)"}`}>
                  <input style={S.input} value={cnoaNumero} onChange={(e) => setCnoa(e.target.value)} placeholder="ex: CNOA-12345" />
                </Field>
                <Field label="Années d'expérience">
                  <input type="number" min="0" max="60" style={S.input} value={yearsExperience} onChange={(e) => setYearsExp(e.target.value)} placeholder="14" />
                </Field>
              </div>
              <Field label="École de formation">
                <select style={S.input} value={ecole} onChange={(e) => setEcole(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {ECOLES_ARCHI.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Diplôme obtenu">
                  <input style={S.input} value={diplome} onChange={(e) => setDiplome(e.target.value)} placeholder="ex: Diplôme d'État d'Architecte" />
                </Field>
                <Field label="Année du diplôme">
                  <input type="number" min="1950" max="2030" style={S.input} value={anneeDiplome} onChange={(e) => setAnneeDiplome(e.target.value)} placeholder="2010" />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle>Profil pro & contact</SectionTitle>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Ville principale">
                  <input style={S.input} value={villePrincipale} onChange={(e) => setVille(e.target.value)} placeholder="Casablanca" />
                </Field>
                <Field label="Téléphone (public)">
                  <input style={S.input} value={phonePublic} onChange={(e) => setPhone(e.target.value)} placeholder="+212522…" />
                </Field>
              </div>
              <Field label="Email professionnel (différent de l'email d'invitation, optionnel)">
                <input type="email" style={S.input} value={emailPublic} onChange={(e) => setEmailPublic(e.target.value)} placeholder="contact@cabinet.ma" />
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Site web">
                  <input style={S.input} value={websiteUrl} onChange={(e) => setWeb(e.target.value)} placeholder="https://cabinet.ma" />
                </Field>
                <Field label="LinkedIn">
                  <input style={S.input} value={linkedinUrl} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
                </Field>
              </div>
              <Field label="Spécialités (séparées par virgule)">
                <textarea style={{ ...S.input, minHeight: 50 }} value={specialitesText} onChange={(e) => setSpecialitesText(e.target.value)} placeholder="ex: Logements collectifs, BIM, Patrimoine, Tertiaire" />
              </Field>
              <Field label="Régions d'intervention">
                <div style={S.chipsGroup}>
                  {REGIONS.map(r => (
                    <button key={r} type="button" onClick={() => toggleListVal(regions, setRegions, r)} style={{
                      ...S.chip,
                      background: regions.includes(r) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                      color: regions.includes(r) ? CC_THEME.navy : CC_THEME.inkMid,
                      fontWeight: regions.includes(r) ? 600 : 400,
                    }}>{r}</button>
                  ))}
                </div>
              </Field>
              <Field label="Langues parlées">
                <div style={S.chipsGroup}>
                  {LANGUES.map(l => (
                    <button key={l.value} type="button" onClick={() => toggleListVal(langues, setLangues, l.value)} style={{
                      ...S.chip,
                      background: langues.includes(l.value) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                      color: langues.includes(l.value) ? CC_THEME.navy : CC_THEME.inkMid,
                      fontWeight: langues.includes(l.value) ? 600 : 400,
                    }}>{l.label}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {submitErr && <div style={S.formErr}>⚠ {submitErr}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
            {step > 1 ? (
              <button onClick={() => setStep((step - 1) as Step)} style={S.btnGhost}>← Précédent</button>
            ) : <span />}
            {step < 3 ? (
              <button onClick={goNext} style={S.btnPrimary}>Suivant →</button>
            ) : (
              <button onClick={submit} disabled={submitting} style={S.btnPrimary}>
                {submitting ? "Création…" : "Créer mon compte et rejoindre"}
              </button>
            )}
          </div>
          <p style={S.legal}>
            En créant ce compte, vous acceptez la doctrine CITURBAREA (anti-désintermédiation, données pro vérifiées).
            La cotisation associative (1 000 MAD/an pour SNASP/ANJAUM) inclut l'accès annuel CITURBAREA complet.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={S.sectionTitle}>{children}</h2>;
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
  card: { maxWidth: 620, margin: "0 auto", background: CC_THEME.bgRaised, borderRadius: 8, overflow: "hidden", boxShadow: CC_THEME.shadowRaise },
  header: { padding: "28px 32px 22px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgDeep, color: CC_THEME.bgSoft },
  eyebrow: { fontSize: 11, letterSpacing: "0.20em", color: CC_THEME.or, fontWeight: 600 },
  title: { margin: "10px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.bgSoft },
  subtitle: { fontSize: 14, opacity: 0.85, marginBottom: 14 },
  cercleBox: { padding: 14, background: "rgba(255,255,255,0.06)", borderRadius: 6, borderLeft: `3px solid ${CC_THEME.or}` },
  cercleName: { fontSize: 16, fontWeight: 600 },
  cercleDesc: { fontSize: 12, fontStyle: "italic", marginTop: 4, color: CC_THEME.bgSoft, opacity: 0.8 },
  msgBox: { marginTop: 14, padding: 12, background: "rgba(176, 141, 87, 0.12)", borderRadius: 4 },

  stepperBar: { display: "flex", alignItems: "center", gap: 6, marginTop: 18 },
  stepDot: { width: 28, height: 28, borderRadius: "50%", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s" },
  stepLine: { flex: 1, height: 2, transition: "background 0.25s" },
  stepLabels: { display: "flex", justifyContent: "space-between", gap: 6, marginTop: 6, fontSize: 10.5, letterSpacing: "0.04em" },

  formBlock: { padding: "24px 32px 32px" },
  sectionTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, fontWeight: 600, marginBottom: 16, marginTop: 0 },

  avatarRow: { display: "flex", justifyContent: "center", marginBottom: 18 },
  avatarLabel: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" },
  avatarImg: { width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${CC_THEME.or}` },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: "50%", background: CC_THEME.bgSoft, color: CC_THEME.inkMid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, border: `2px dashed ${CC_THEME.border}` },
  avatarHint: { fontSize: 11.5, color: CC_THEME.inkMid, fontStyle: "italic" },

  label: { display: "block", fontSize: 11, fontWeight: 600, color: CC_THEME.inkMid, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised, boxSizing: "border-box" as const, resize: "vertical" as const },
  formErr: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "8px 12px", borderRadius: 4, fontSize: 13, marginTop: 10 },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "12px 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "12px 22px", borderRadius: 4, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginTop: 16 },
  legal: { fontSize: 11, color: CC_THEME.inkMuted, textAlign: "center" as const, marginTop: 14, lineHeight: 1.5 },

  chipsGroup: { display: "flex", flexWrap: "wrap" as const, gap: 5 },
  chip: { border: `1px solid ${CC_THEME.border}`, padding: "5px 11px", borderRadius: 14, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" },

  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontBody, color: CC_THEME.inkMid, background: CC_THEME.bg },
  errorBox: { background: CC_THEME.bgRaised, padding: 32, borderRadius: 8, textAlign: "center" as const, maxWidth: 400, boxShadow: CC_THEME.shadowSoft },
};
