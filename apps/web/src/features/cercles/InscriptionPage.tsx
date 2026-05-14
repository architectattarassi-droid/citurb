/**
 * InscriptionPage — Sprint F2 + enrichi Sprint K + open signup
 *
 * Deux modes :
 *  - Invitation : /inscription?invite=<token> → email pré-rempli, auto-joint au cercle
 *  - Ouvert     : /inscription (sans token)   → email saisi, profil seul (rejoint cercles ensuite)
 *
 * Form en 4 étapes :
 *  1. Identité + compte (civilité, prénom, nom, email, téléphone, password, photo, bio)
 *  2. Exercice & société (statut, cabinet, ICE/RC, adresse, CNOA, expérience)
 *  3. Formation + intervention (école/diplôme/année, ville, régions, spécialités, langues)
 *  4. Profil pro + préférences (web, LinkedIn, adhésion souhaitée, source, CGU, newsletter)
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

const CIVILITES = ["M.", "Mme", "Dr", "Pr", "Arch."];

const ECOLES_ARCHI = [
  "ENA Rabat (École Nationale d'Architecture)",
  "EAC Casablanca (École d'Architecture)",
  "EAR Marrakech",
  "EAT Tétouan (Architecture & Design)",
  "EAF Fès",
  "ISA Casablanca",
  "EHTP Casablanca (École Hassania des Travaux Publics)",
  "IAV Hassan II Rabat (Agronomie & Vétérinaire — Topo/Géo)",
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

const ADHESIONS = [
  { value: "AUCUNE",  label: "Pas d'adhésion souhaitée pour l'instant" },
  { value: "SNASP",   label: "SNASP — Syndicat National des Architectes du Secteur Privé (1 000 MAD/an, accès Cercles inclus)" },
  { value: "ANJAUM",  label: "ANJAUM — Association Nationale des Jeunes Architectes & Urbanistes du Maroc (1 000 MAD/an, accès Cercles inclus)" },
  { value: "LES_DEUX",label: "SNASP + ANJAUM (cotisations cumulées)" },
];

const SOURCES = [
  "Recommandation d'un confrère",
  "Réseaux sociaux (LinkedIn, Facebook, Instagram)",
  "Email d'invitation CITURBAREA",
  "Visioconférence ou évènement",
  "Recherche Google",
  "Presse / publication",
  "Autre",
];

type Step = 1 | 2 | 3 | 4;

export default function InscriptionPage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("invite") || "";
  const cercleSlugParam = params.get("cercle") || "";
  const isInvitedMode = !!token;

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(isInvitedMode);

  const [step, setStep] = useState<Step>(1);

  // Identité
  const [civilite, setCivilite] = useState("M.");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrivate, setPhonePrivate] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [metier, setMetier] = useState<ProMetier>("ARCHITECTE");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  // Exercice / Société
  const [cabinetStatus, setCabinetStatus] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [cabinetIce, setCabinetIce] = useState("");
  const [cabinetRc, setCabinetRc] = useState("");
  const [cabinetAdresse, setCabinetAdresse] = useState("");
  const [cnoaNumero, setCnoa] = useState("");
  const [yearsExperience, setYearsExp] = useState("");

  // Formation
  const [ecole, setEcole] = useState("");
  const [anneeDiplome, setAnneeDiplome] = useState("");
  const [diplome, setDiplome] = useState("");

  // Profil + contact
  const [villePrincipale, setVille] = useState("");
  const [phonePublic, setPhone] = useState("");
  const [emailPublic, setEmailPublic] = useState("");
  const [websiteUrl, setWeb] = useState("");
  const [linkedinUrl, setLinkedin] = useState("");
  const [specialitesText, setSpecialitesText] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [langues, setLangues] = useState<string[]>(["FR", "AR"]);

  // Préférences
  const [adhesionSouhaitee, setAdhesion] = useState("AUCUNE");
  const [sourceConnaissance, setSource] = useState("");
  const [newsletterOptIn, setNewsletter] = useState(true);
  const [acceptCgu, setAcceptCgu] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // Lookup invitation si token fourni
  useEffect(() => {
    if (!isInvitedMode) return;
    invitationsApi.lookup(token)
      .then((r) => {
        if (r.ok && r.data) {
          setPreview(r.data);
          setEmail(r.data.email);
        }
        else setLookupErr(r.error || "Invitation invalide");
      })
      .catch((e: any) => setLookupErr(e?.message || "Erreur lookup"))
      .finally(() => setLoading(false));
  }, [token, isInvitedMode]);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Photo trop lourde (max 5 Mo)."); return; }
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const displayName = (() => {
    const parts = [prenom.trim(), nom.trim()].filter(Boolean).join(" ");
    return parts || "";
  })();

  const validateStep = (s: Step): string | null => {
    if (s === 1) {
      if (!prenom.trim()) return "Prénom requis";
      if (!nom.trim()) return "Nom requis";
      if (!email.trim() || !email.includes("@")) return "Email valide requis";
      if (!phonePrivate.trim() || phonePrivate.replace(/\D/g, "").length < 9) return "Téléphone valide requis (pour OTP & notifications)";
      if (password.length < 8) return "Mot de passe ≥ 8 caractères requis";
      if (password !== passwordConfirm) return "Les deux mots de passe ne correspondent pas";
      return null;
    }
    if (s === 2) {
      if (!cabinetStatus) return "Statut d'exercice requis";
      if (metier === "ARCHITECTE" && cabinetStatus !== "ETUDIANT" && !cnoaNumero.trim()) {
        return "N° CNOA requis pour les architectes (sauf étudiants)";
      }
      return null;
    }
    if (s === 4) {
      if (!acceptCgu) return "Vous devez accepter les CGU pour créer un compte";
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
    const err = validateStep(4);
    if (err) { setSubmitErr(err); return; }
    setSubmitErr(null); setSubmitting(true);

    try {
      const baseBody = {
        password,
        displayName,
        metier,
        civilite,
        prenom: prenom.trim(),
        nom: nom.trim(),
        phonePrivate: phonePrivate.trim(),
        title: cabinetStatus ? STATUTS_EXERCICE.find(s => s.value === cabinetStatus)?.label : undefined,
        bio: bio.trim() || undefined,
        cabinetName: cabinetName.trim() || undefined,
        cabinetStatus,
        cabinetIce: cabinetIce.trim() || undefined,
        cabinetRc: cabinetRc.trim() || undefined,
        cabinetAdresse: cabinetAdresse.trim() || undefined,
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
        adhesionSouhaitee,
        sourceConnaissance: sourceConnaissance || undefined,
        newsletterOptIn,
        acceptCgu: true,
      };

      let accessToken: string | undefined;
      let targetSlug: string | undefined;

      if (isInvitedMode && preview) {
        const r = await invitationsApi.signup({ token, ...baseBody });
        if (!r.ok) throw new Error("Inscription refusée");
        accessToken = r.data.access_token;
        targetSlug = r.data.cercleSlug;
      } else {
        const r = await invitationsApi.publicSignup({
          email: email.trim().toLowerCase(),
          cercleSlug: cercleSlugParam || undefined,
          ...baseBody,
        });
        if (!r.ok) throw new Error("Inscription refusée");
        accessToken = r.data.access_token;
        targetSlug = r.data.cercleSlug;
      }

      if (accessToken) setToken(accessToken);

      if (avatarFile) {
        try { await invitationsApi.uploadAvatar(avatarFile); }
        catch (e: any) { console.warn("Avatar upload fail :", e?.message); }
      }

      navigate(targetSlug ? `/cercles/${targetSlug}` : "/cercles");
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
        <p style={{ color: CC_THEME.inkMid, fontSize: 13, marginTop: 14 }}>
          Vous pouvez aussi créer un compte sans invitation :
        </p>
        <button onClick={() => { setLookupErr(null); setLoading(false); }} style={S.btnPrimary}>
          Créer un compte ouvert →
        </button>
        <div><button onClick={() => navigate("/")} style={S.btnGhost}>← Accueil</button></div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.card}>
        <header style={S.header}>
          <div style={S.eyebrow}>CITURBAREA · CERCLES</div>
          <h1 style={S.title}>{isInvitedMode && preview ? "Vous êtes invité(e)" : "Créer votre compte professionnel"}</h1>

          {isInvitedMode && preview && (
            <>
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
            </>
          )}

          {!isInvitedMode && (
            <p style={S.subtitle}>
              Rejoignez le réseau privé des professionnels du BTP marocain. Votre inscription
              est validée manuellement par l'équipe CITURBAREA.
            </p>
          )}

          <div style={S.stepperBar}>
            {[1, 2, 3, 4].map((n) => (
              <React.Fragment key={n}>
                <div style={{
                  ...S.stepDot,
                  background: step >= n ? CC_THEME.or : "rgba(255,255,255,0.15)",
                  color: step >= n ? CC_THEME.bgDeep : CC_THEME.bgSoft,
                }}>{n}</div>
                {n < 4 && <div style={{ ...S.stepLine, background: step > n ? CC_THEME.or : "rgba(255,255,255,0.15)" }} />}
              </React.Fragment>
            ))}
          </div>
          <div style={S.stepLabels}>
            <span style={{ color: step === 1 ? CC_THEME.or : CC_THEME.bgSoft }}>1. Identité</span>
            <span style={{ color: step === 2 ? CC_THEME.or : CC_THEME.bgSoft }}>2. Exercice</span>
            <span style={{ color: step === 3 ? CC_THEME.or : CC_THEME.bgSoft }}>3. Formation</span>
            <span style={{ color: step === 4 ? CC_THEME.or : CC_THEME.bgSoft }}>4. Profil & CGU</span>
          </div>
        </header>

        <div style={S.formBlock}>
          {step === 1 && (
            <>
              <SectionTitle>Identité & compte</SectionTitle>

              <div style={S.avatarRow}>
                <label style={S.avatarLabel}>
                  {avatarPreview ? <img src={avatarPreview} alt="" style={S.avatarImg} /> : <div style={S.avatarPlaceholder}>📷</div>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} style={{ display: "none" }} />
                  <span style={S.avatarHint}>{avatarFile ? "Changer la photo" : "Photo de profil (optionnel, max 5 Mo)"}</span>
                </label>
              </div>

              <div style={S.row}>
                <Field label="Civilité" flex={0.4}>
                  <select style={S.input} value={civilite} onChange={(e) => setCivilite(e.target.value)}>
                    {CIVILITES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Prénom *">
                  <input style={S.input} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Amine" />
                </Field>
                <Field label="Nom *">
                  <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="El Fassi" />
                </Field>
              </div>

              <Field label="Email *">
                <input type="email" style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isInvitedMode} placeholder="amine.elfassi@example.ma" />
              </Field>

              <div style={S.row}>
                <Field label="Téléphone privé * (pour OTP / notifications)">
                  <input style={S.input} value={phonePrivate} onChange={(e) => setPhonePrivate(e.target.value)} placeholder="+212 6 12 34 56 78" />
                </Field>
                <Field label="Métier *">
                  <select style={S.input} value={metier} onChange={(e) => setMetier(e.target.value as ProMetier)}>
                    {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
              </div>

              <div style={S.row}>
                <Field label="Mot de passe * (≥ 8 caractères)">
                  <input type="password" style={S.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label="Confirmer le mot de passe *">
                  <input type="password" style={S.input} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="••••••••" />
                </Field>
              </div>

              <Field label="Bio courte (optionnel — 500 caractères max)">
                <textarea style={{ ...S.input, minHeight: 70 }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Quelques lignes sur vous, votre parcours, vos spécialités…" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Exercice & société</SectionTitle>
              <Field label="Statut d'exercice *">
                <select style={S.input} value={cabinetStatus} onChange={(e) => setCabinetStatus(e.target.value)}>
                  {STATUTS_EXERCICE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Nom de la société / cabinet (laisser vide si exercice à titre personnel)">
                <input style={S.input} value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder="ex: Atelier El Fassi Architectes" />
              </Field>
              <div style={S.row}>
                <Field label="N° ICE (si société)">
                  <input style={S.input} value={cabinetIce} onChange={(e) => setCabinetIce(e.target.value)} placeholder="002584963000054" />
                </Field>
                <Field label="N° RC (registre commerce)">
                  <input style={S.input} value={cabinetRc} onChange={(e) => setCabinetRc(e.target.value)} placeholder="123456" />
                </Field>
              </div>
              <Field label="Adresse du cabinet / siège social">
                <input style={S.input} value={cabinetAdresse} onChange={(e) => setCabinetAdresse(e.target.value)} placeholder="12 rue Tarik Ibn Ziad, Casablanca" />
              </Field>
              <div style={S.row}>
                <Field label={`N° CNOA${metier === "ARCHITECTE" && cabinetStatus !== "ETUDIANT" ? " *" : " (si applicable)"}`}>
                  <input style={S.input} value={cnoaNumero} onChange={(e) => setCnoa(e.target.value)} placeholder="ex: CNOA-12345" />
                </Field>
                <Field label="Années d'expérience">
                  <input type="number" min="0" max="60" style={S.input} value={yearsExperience} onChange={(e) => setYearsExp(e.target.value)} placeholder="14" />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle>Formation & zones d'intervention</SectionTitle>
              <Field label="École de formation">
                <select style={S.input} value={ecole} onChange={(e) => setEcole(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {ECOLES_ARCHI.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
              <div style={S.row}>
                <Field label="Diplôme obtenu">
                  <input style={S.input} value={diplome} onChange={(e) => setDiplome(e.target.value)} placeholder="ex: Diplôme d'État d'Architecte" />
                </Field>
                <Field label="Année du diplôme">
                  <input type="number" min="1950" max="2030" style={S.input} value={anneeDiplome} onChange={(e) => setAnneeDiplome(e.target.value)} placeholder="2010" />
                </Field>
              </div>
              <Field label="Ville principale d'exercice">
                <input style={S.input} value={villePrincipale} onChange={(e) => setVille(e.target.value)} placeholder="Casablanca" />
              </Field>
              <Field label="Régions d'intervention (cochez celles où vous travaillez)">
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
              <Field label="Spécialités (séparées par virgule)">
                <textarea style={{ ...S.input, minHeight: 50 }} value={specialitesText} onChange={(e) => setSpecialitesText(e.target.value)} placeholder="ex: Logements collectifs, BIM, Patrimoine, Tertiaire, Hôpitaux" />
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

          {step === 4 && (
            <>
              <SectionTitle>Profil pro & préférences</SectionTitle>
              <div style={S.row}>
                <Field label="Téléphone public (visible aux autres membres)">
                  <input style={S.input} value={phonePublic} onChange={(e) => setPhone(e.target.value)} placeholder="+212 522 …" />
                </Field>
                <Field label="Email professionnel public">
                  <input type="email" style={S.input} value={emailPublic} onChange={(e) => setEmailPublic(e.target.value)} placeholder="contact@cabinet.ma" />
                </Field>
              </div>
              <div style={S.row}>
                <Field label="Site web">
                  <input style={S.input} value={websiteUrl} onChange={(e) => setWeb(e.target.value)} placeholder="https://cabinet.ma" />
                </Field>
                <Field label="LinkedIn">
                  <input style={S.input} value={linkedinUrl} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
                </Field>
              </div>

              <Field label="Adhésion souhaitée (cotisation annuelle CITURBAREA Cercles incluse)">
                <select style={S.input} value={adhesionSouhaitee} onChange={(e) => setAdhesion(e.target.value)}>
                  {ADHESIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>

              <Field label="Comment avez-vous connu CITURBAREA ?">
                <select style={S.input} value={sourceConnaissance} onChange={(e) => setSource(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <div style={S.checkRow}>
                <input type="checkbox" id="newsletter" checked={newsletterOptIn} onChange={(e) => setNewsletter(e.target.checked)} style={S.checkbox} />
                <label htmlFor="newsletter" style={S.checkLabel}>
                  Je souhaite recevoir les actualités CITURBAREA par email (newsletter mensuelle, événements pros)
                </label>
              </div>
              <div style={S.checkRow}>
                <input type="checkbox" id="cgu" checked={acceptCgu} onChange={(e) => setAcceptCgu(e.target.checked)} style={S.checkbox} />
                <label htmlFor="cgu" style={S.checkLabel}>
                  <strong>J'accepte la doctrine CITURBAREA *</strong> : anti-désintermédiation, données pro
                  vérifiées, discussions des cercles confidentielles aux membres uniquement.
                </label>
              </div>
            </>
          )}

          {submitErr && <div style={S.formErr}>⚠ {submitErr}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
            {step > 1 ? (
              <button onClick={() => { setSubmitErr(null); setStep((step - 1) as Step); }} style={S.btnGhost}>← Précédent</button>
            ) : <button onClick={() => navigate("/")} style={S.btnGhost}>← Accueil</button>}
            {step < 4 ? (
              <button onClick={goNext} style={S.btnPrimary}>Suivant →</button>
            ) : (
              <button onClick={submit} disabled={submitting} style={{ ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Création…" : "Créer mon compte"}
              </button>
            )}
          </div>
          <p style={S.legal}>
            La cotisation associative (1 000 MAD/an pour SNASP/ANJAUM) inclut l'accès annuel
            CITURBAREA Cercles complet. Vos données sont strictement confidentielles et ne
            sortent jamais des cercles auxquels vous êtes membre actif.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={S.sectionTitle}>{children}</h2>;
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <div style={{ marginBottom: 12, flex: flex ?? 1, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: CC_THEME.bg, fontFamily: CC_THEME.fontBody, color: CC_THEME.ink, padding: "32px 16px" },
  card: { maxWidth: 700, margin: "0 auto", background: CC_THEME.bgRaised, borderRadius: 8, overflow: "hidden", boxShadow: CC_THEME.shadowRaise },
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

  row: { display: "flex", gap: 10, flexWrap: "wrap" },

  avatarRow: { display: "flex", justifyContent: "center", marginBottom: 18 },
  avatarLabel: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" },
  avatarImg: { width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${CC_THEME.or}` },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: "50%", background: CC_THEME.bgSoft, color: CC_THEME.inkMid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, border: `2px dashed ${CC_THEME.border}` },
  avatarHint: { fontSize: 11.5, color: CC_THEME.inkMid, fontStyle: "italic" },

  label: { display: "block", fontSize: 11, fontWeight: 600, color: CC_THEME.inkMid, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised, boxSizing: "border-box" as const, resize: "vertical" as const },
  formErr: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "8px 12px", borderRadius: 4, fontSize: 13, marginTop: 10 },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "12px 24px", borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "12px 22px", borderRadius: 4, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 14 },
  legal: { fontSize: 11, color: CC_THEME.inkMuted, textAlign: "center" as const, marginTop: 14, lineHeight: 1.5 },

  chipsGroup: { display: "flex", flexWrap: "wrap" as const, gap: 5 },
  chip: { border: `1px solid ${CC_THEME.border}`, padding: "5px 11px", borderRadius: 14, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" },

  checkRow: { display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  checkbox: { marginTop: 4, width: 16, height: 16, flexShrink: 0, accentColor: CC_THEME.or },
  checkLabel: { fontSize: 13, color: CC_THEME.inkMid, lineHeight: 1.5, cursor: "pointer" },

  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontBody, color: CC_THEME.inkMid, background: CC_THEME.bg },
  errorBox: { background: CC_THEME.bgRaised, padding: 32, borderRadius: 8, textAlign: "center" as const, maxWidth: 400, boxShadow: CC_THEME.shadowSoft },
};
