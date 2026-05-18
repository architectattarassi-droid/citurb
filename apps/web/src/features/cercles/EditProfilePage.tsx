/**
 * EditProfilePage — Sprint G4
 *
 * Permet à l'utilisateur connecté d'éditer sa propre fiche professionnelle.
 * 7 sections : Identité, Cabinet/Structure, Formations, Certifications/Prix,
 * Projets phares, Spécialités/Régions/Langues, Tarifs/Dispo, Contact/Réseaux.
 *
 * Route : /cercles/me/edit
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME, ensureFonts } from "./theme";
import { cerclesApi, marketplaceApi, resolveUploadUrl, ProMetier, ProClasseBTP, FormationEntry, ExperiencePhare } from "./api";

const METIERS: { value: ProMetier; label: string }[] = [
  { value: "ARCHITECTE", label: "Architecte" },
  { value: "BET_STRUCTURE", label: "BET Structure" },
  { value: "BET_FLUIDES", label: "BET Fluides" },
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

const CLASSES_BTP: { value: ProClasseBTP | ""; label: string }[] = [
  { value: "", label: "— Non concerné —" },
  { value: "CL1", label: "Classe 1 (jusqu'à 1 MMAD)" },
  { value: "CL2", label: "Classe 2 (jusqu'à 5 MMAD)" },
  { value: "CL3", label: "Classe 3 (jusqu'à 25 MMAD)" },
  { value: "CL4", label: "Classe 4 (jusqu'à 100 MMAD)" },
  { value: "CL5", label: "Classe 5 (> 100 MMAD)" },
  { value: "HC", label: "Hors classe" },
];

const CABINET_STATUTS = [
  { value: "", label: "— Non précisé —" },
  { value: "LIBERAL", label: "Libéral" },
  { value: "ASSOCIE", label: "Associé" },
  { value: "SALARIE", label: "Salarié" },
  { value: "FONCTIONNAIRE", label: "Fonctionnaire" },
  { value: "INDEPENDANT", label: "Indépendant" },
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

export default function EditProfilePage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [metier, setMetier] = useState<ProMetier>("ARCHITECTE");
  const [classeBTP, setClasseBTP] = useState<ProClasseBTP | "">("");
  const [cnoaNumero, setCnoa] = useState("");

  // Cabinet
  const [cabinetName, setCabinetName] = useState("");
  const [cabinetSize, setCabinetSize] = useState("");
  const [cabinetStatus, setCabinetStatus] = useState("");
  const [yearsExperience, setYearsExp] = useState("");

  // Listes
  const [agrements, setAgrements] = useState("");
  const [specialites, setSpecialites] = useState("");
  const [certifications, setCertifications] = useState("");
  const [prix, setPrix] = useState("");
  const [langues, setLangues] = useState<string[]>(["FR", "AR"]);
  const [regions, setRegions] = useState<string[]>([]);
  const [villePrincipale, setVille] = useState("");

  // Formations et projets phares (arrays JSON)
  const [formations, setFormations] = useState<FormationEntry[]>([]);
  const [projets, setProjets] = useState<ExperiencePhare[]>([]);

  // Tarifs / dispo
  const [tarifsRange, setTarifs] = useState("");
  const [disponibilite, setDispo] = useState("DISPONIBLE");
  const [disponibleAPartir, setDispoDate] = useState("");

  // Réseaux
  const [websiteUrl, setWeb] = useState("");
  const [linkedinUrl, setLinkedin] = useState("");
  const [behanceUrl, setBehance] = useState("");
  const [instagramUrl, setInsta] = useState("");
  const [pinterestUrl, setPinterest] = useState("");
  const [phonePublic, setPhone] = useState("");
  const [emailPublic, setEmail] = useState("");

  // Charge le profil existant
  useEffect(() => {
    cerclesApi.myProfile()
      .then((r) => {
        const p = r.data;
        if (!p) { setLoading(false); return; }
        setDisplayName(p.displayName || "");
        setTitle(p.title || "");
        setBio(p.bio || "");
        setMetier(p.metier);
        setClasseBTP(p.classeBTP || "");
        setCnoa(p.cnoaNumero || "");
        setCabinetName(p.cabinetName || "");
        setCabinetSize(p.cabinetSize?.toString() || "");
        setCabinetStatus(p.cabinetStatus || "");
        setYearsExp(p.yearsExperience?.toString() || "");
        setAgrements(p.agrements?.join(", ") || "");
        setSpecialites(p.specialites?.join(", ") || "");
        setCertifications(p.certifications?.join(", ") || "");
        setPrix(p.prix?.join(", ") || "");
        setLangues(p.langues || ["FR", "AR"]);
        setRegions(p.regions || []);
        setVille(p.villePrincipale || "");
        setFormations(p.formations || []);
        setProjets(p.experiencesPhares || []);
        setTarifs(p.tarifsRange || "");
        setDispo(p.disponibilite || "DISPONIBLE");
        setDispoDate(p.disponibleAPartir ? p.disponibleAPartir.slice(0, 10) : "");
        setWeb(p.websiteUrl || "");
        setLinkedin(p.linkedinUrl || "");
        setBehance(p.behanceUrl || "");
        setInsta(p.instagramUrl || "");
        setPinterest(p.pinterestUrl || "");
        setPhone(p.phonePublic || "");
        setEmail(p.emailPublic || "");
      })
      .catch((e: any) => setErr(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  const splitList = (s: string) => s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);

  const submit = async () => {
    if (!displayName.trim()) { setErr("Nom requis"); return; }
    setErr(null); setSuccess(false); setSaving(true);
    try {
      const body: any = {
        displayName: displayName.trim(),
        title: title.trim() || undefined,
        bio: bio.trim() || undefined,
        metier,
        classeBTP: classeBTP || undefined,
        cnoaNumero: cnoaNumero.trim() || undefined,
        cabinetName: cabinetName.trim() || undefined,
        cabinetSize: cabinetSize ? Number(cabinetSize) : undefined,
        cabinetStatus: cabinetStatus || undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        agrements: splitList(agrements),
        specialites: splitList(specialites),
        certifications: splitList(certifications),
        prix: splitList(prix),
        langues,
        regions,
        villePrincipale: villePrincipale.trim() || undefined,
        formations: formations.filter(f => f.ecole && f.diplome),
        experiencesPhares: projets.filter(p => p.titre),
        tarifsRange: tarifsRange.trim() || undefined,
        disponibilite,
        disponibleAPartir: disponibleAPartir || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        behanceUrl: behanceUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        pinterestUrl: pinterestUrl.trim() || undefined,
        phonePublic: phonePublic.trim() || undefined,
        emailPublic: emailPublic.trim() || undefined,
      };
      const r = await cerclesApi.upsertMyProfile(body);
      setSuccess(true);
      setTimeout(() => navigate(`/cercles/profile/${r.data.userId}`), 800);
    } catch (e: any) {
      setErr(e?.message || "Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const toggleListVal = (list: string[], setList: (v: string[]) => void, val: string) => {
    if (list.includes(val)) setList(list.filter(x => x !== val));
    else setList([...list, val]);
  };

  if (loading) return <CerclesShell><div style={S.center}>Chargement…</div></CerclesShell>;

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div style={S.eyebrow}>MA FICHE PROFESSIONNELLE</div>
          <h1 style={S.h1}>Éditer mon profil</h1>
          <p style={S.subtitle}>
            Complète ta fiche pour que les autres pros du BTP marocain te trouvent et te contactent.
          </p>
        </header>

        <div style={S.formGrid}>
          {/* ── Identité ── */}
          <Section title="Identité">
            <Field label="Nom d'affichage *">
              <input style={S.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ex: Amine Bensouda" />
            </Field>
            <Field label="Fonction / Titre">
              <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Architecte associé · Atelier Bensouda" />
            </Field>
            <Field label="Bio (présentation, jusqu'à 500 caractères)">
              <textarea style={{ ...S.input, minHeight: 90 }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            </Field>
            <Row>
              <Field label="Métier *">
                <select style={S.input} value={metier} onChange={(e) => setMetier(e.target.value as ProMetier)}>
                  {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Classe BTP">
                <select style={S.input} value={classeBTP} onChange={(e) => setClasseBTP(e.target.value as any)}>
                  {CLASSES_BTP.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </Row>
            <Field label="Numéro CNOA (architectes uniquement)">
              <input style={S.input} value={cnoaNumero} onChange={(e) => setCnoa(e.target.value)} placeholder="ex: CNOA-12345" />
            </Field>
          </Section>

          {/* ── Cabinet ── */}
          <Section title="Cabinet / Structure">
            <Field label="Nom du cabinet ou de la société">
              <input style={S.input} value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder="ex: Atelier Bensouda Architectes" />
            </Field>
            <Row>
              <Field label="Statut">
                <select style={S.input} value={cabinetStatus} onChange={(e) => setCabinetStatus(e.target.value)}>
                  {CABINET_STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Taille (nb collaborateurs)">
                <input style={S.input} type="number" min="1" value={cabinetSize} onChange={(e) => setCabinetSize(e.target.value)} placeholder="8" />
              </Field>
              <Field label="Années d'expérience">
                <input style={S.input} type="number" min="0" max="60" value={yearsExperience} onChange={(e) => setYearsExp(e.target.value)} placeholder="14" />
              </Field>
            </Row>
          </Section>

          {/* ── Formations ── */}
          <Section title="Formations">
            {formations.map((f, i) => (
              <div key={i} style={S.itemCard}>
                <Row>
                  <Field label="École">
                    <input style={S.input} value={f.ecole} onChange={(e) => updateFormation(formations, setFormations, i, "ecole", e.target.value)} placeholder="ex: ENA Rabat" />
                  </Field>
                  <Field label="Diplôme">
                    <input style={S.input} value={f.diplome} onChange={(e) => updateFormation(formations, setFormations, i, "diplome", e.target.value)} placeholder="ex: Diplôme d'État d'Architecte" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Ville">
                    <input style={S.input} value={f.ville || ""} onChange={(e) => updateFormation(formations, setFormations, i, "ville", e.target.value)} placeholder="Rabat" />
                  </Field>
                  <Field label="Année">
                    <input style={S.input} type="number" min="1950" max="2030" value={f.annee || ""} onChange={(e) => updateFormation(formations, setFormations, i, "annee", e.target.value ? Number(e.target.value) : undefined)} placeholder="2010" />
                  </Field>
                  <button onClick={() => setFormations(formations.filter((_, idx) => idx !== i))} style={S.btnRemove}>Retirer</button>
                </Row>
              </div>
            ))}
            <button onClick={() => setFormations([...formations, { ecole: "", diplome: "" }])} style={S.btnAdd}>+ Ajouter une formation</button>
          </Section>

          {/* ── Certifications / Prix ── */}
          <Section title="Certifications & Prix">
            <Field label="Certifications (séparées par virgule)">
              <textarea style={{ ...S.input, minHeight: 60 }} value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="ex: Revit Certified Pro, BIM Manager, RT-Maroc Auditeur" />
            </Field>
            <Field label="Prix & distinctions (séparés par virgule)">
              <textarea style={{ ...S.input, minHeight: 60 }} value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="ex: Prix CNOA Jeune Architecte 2018, Mention Tamayouz 2021" />
            </Field>
            <Field label="Agréments officiels (séparés par virgule)">
              <textarea style={{ ...S.input, minHeight: 60 }} value={agrements} onChange={(e) => setAgrements(e.target.value)} placeholder="ex: CNOA-12345, AGREMENT_MEFD_BAT_CL3" />
            </Field>
          </Section>

          {/* ── Projets phares ── */}
          <Section title="Projets phares (portfolio)">
            {projets.map((p, i) => (
              <div key={i} style={S.itemCard}>
                <Field label="Titre du projet">
                  <input style={S.input} value={p.titre} onChange={(e) => updateProjet(projets, setProjets, i, "titre", e.target.value)} placeholder="ex: Résidence Anfa R+8" />
                </Field>
                <Field label="Description courte">
                  <textarea style={{ ...S.input, minHeight: 60 }} value={p.description || ""} onChange={(e) => updateProjet(projets, setProjets, i, "description", e.target.value)} placeholder="ex: 48 logements collectifs haut standing, coordination BIM intégrale." />
                </Field>
                <Row>
                  <Field label="Lieu">
                    <input style={S.input} value={p.lieu || ""} onChange={(e) => updateProjet(projets, setProjets, i, "lieu", e.target.value)} placeholder="Casablanca-Anfa" />
                  </Field>
                  <Field label="Année livraison">
                    <input style={S.input} type="number" min="1990" max="2040" value={p.anneeLivraison || ""} onChange={(e) => updateProjet(projets, setProjets, i, "anneeLivraison", e.target.value ? Number(e.target.value) : undefined)} placeholder="2024" />
                  </Field>
                  <Field label="Surface">
                    <input style={S.input} value={p.surface || ""} onChange={(e) => updateProjet(projets, setProjets, i, "surface", e.target.value)} placeholder="6 400 m²" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Rôle / Mission">
                    <input style={S.input} value={p.role || ""} onChange={(e) => updateProjet(projets, setProjets, i, "role", e.target.value)} placeholder="Architecte mandataire + suivi chantier" />
                  </Field>
                  <Field label="Photos du projet">
                    <ProjectPhotos
                      urls={p.imageUrls || []}
                      onChange={(urls) => updateProjet(projets, setProjets, i, "imageUrls", urls)}
                    />
                  </Field>
                </Row>
                <button onClick={() => setProjets(projets.filter((_, idx) => idx !== i))} style={S.btnRemove}>Retirer ce projet</button>
              </div>
            ))}
            <button onClick={() => setProjets([...projets, { titre: "" }])} style={S.btnAdd}>+ Ajouter un projet phare</button>
          </Section>

          {/* ── Spécialités / Régions / Langues ── */}
          <Section title="Compétences & Couverture">
            <Field label="Spécialités (séparées par virgule)">
              <textarea style={{ ...S.input, minHeight: 50 }} value={specialites} onChange={(e) => setSpecialites(e.target.value)} placeholder="BIM, Logements collectifs, Tertiaire, Patrimoine" />
            </Field>
            <Field label="Régions d'intervention">
              <div style={S.chipsGroup}>
                {REGIONS.map(r => (
                  <button key={r} onClick={() => toggleListVal(regions, setRegions, r)} style={{
                    ...S.chip,
                    background: regions.includes(r) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                    color: regions.includes(r) ? CC_THEME.navy : CC_THEME.inkMid,
                    fontWeight: regions.includes(r) ? 600 : 400,
                  }}>{r}</button>
                ))}
              </div>
            </Field>
            <Field label="Ville principale">
              <input style={S.input} value={villePrincipale} onChange={(e) => setVille(e.target.value)} placeholder="Casablanca" />
            </Field>
            <Field label="Langues parlées">
              <div style={S.chipsGroup}>
                {LANGUES.map(l => (
                  <button key={l.value} onClick={() => toggleListVal(langues, setLangues, l.value)} style={{
                    ...S.chip,
                    background: langues.includes(l.value) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                    color: langues.includes(l.value) ? CC_THEME.navy : CC_THEME.inkMid,
                    fontWeight: langues.includes(l.value) ? 600 : 400,
                  }}>{l.label}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ── Tarifs / Disponibilité ── */}
          <Section title="Tarifs & Disponibilité">
            <Field label="Fourchette d'honoraires">
              <input style={S.input} value={tarifsRange} onChange={(e) => setTarifs(e.target.value)} placeholder="ex: 4–6% du coût travaux  ou  Forfait 30–80k MAD" />
            </Field>
            <Row>
              <Field label="Disponibilité actuelle">
                <select style={S.input} value={disponibilite} onChange={(e) => setDispo(e.target.value)}>
                  <option value="DISPONIBLE">● Disponible</option>
                  <option value="OCCUPE">● Occupé (carnet plein)</option>
                  <option value="INDISPONIBLE">● Indisponible</option>
                </select>
              </Field>
              <Field label="Disponible à partir du">
                <input style={S.input} type="date" value={disponibleAPartir} onChange={(e) => setDispoDate(e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* ── Contact / Réseaux ── */}
          <Section title="Contact & Réseaux">
            <Row>
              <Field label="Email public">
                <input style={S.input} value={emailPublic} onChange={(e) => setEmail(e.target.value)} placeholder="contact@cabinet.ma" />
              </Field>
              <Field label="Téléphone public">
                <input style={S.input} value={phonePublic} onChange={(e) => setPhone(e.target.value)} placeholder="+212522…" />
              </Field>
            </Row>
            <Row>
              <Field label="Site web">
                <input style={S.input} value={websiteUrl} onChange={(e) => setWeb(e.target.value)} placeholder="https://cabinet.ma" />
              </Field>
              <Field label="LinkedIn">
                <input style={S.input} value={linkedinUrl} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
              </Field>
            </Row>
            <Row>
              <Field label="Behance (portfolio architecture)">
                <input style={S.input} value={behanceUrl} onChange={(e) => setBehance(e.target.value)} placeholder="https://behance.net/…" />
              </Field>
              <Field label="Instagram">
                <input style={S.input} value={instagramUrl} onChange={(e) => setInsta(e.target.value)} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="Pinterest">
                <input style={S.input} value={pinterestUrl} onChange={(e) => setPinterest(e.target.value)} placeholder="https://pinterest.com/…" />
              </Field>
            </Row>
          </Section>

          {err && <div style={S.formErr}>⚠ {err}</div>}
          {success && <div style={S.formSuccess}>✓ Profil enregistré, redirection…</div>}

          <div style={S.actionsBar}>
            <button onClick={() => navigate(-1)} style={S.btnGhost}>Annuler</button>
            <button onClick={submit} disabled={saving} style={S.btnPrimary}>
              {saving ? "Enregistrement…" : "Enregistrer ma fiche"}
            </button>
          </div>
        </div>
      </div>
    </CerclesShell>
  );
}

function updateFormation(list: FormationEntry[], setList: (v: FormationEntry[]) => void, i: number, key: keyof FormationEntry, val: any) {
  const copy = [...list];
  copy[i] = { ...copy[i], [key]: val };
  setList(copy);
}
function updateProjet(list: ExperiencePhare[], setList: (v: ExperiencePhare[]) => void, i: number, key: keyof ExperiencePhare, val: any) {
  const copy = [...list];
  copy[i] = { ...copy[i], [key]: val };
  setList(copy);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <div style={S.sectionEyebrow}>{title}</div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, marginBottom: 12 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>{children}</div>;
}

/** Upload + miniatures pour les photos d'un projet phare du portfolio. */
function ProjectPhotos({ urls, onChange }: { urls: string[]; onChange: (u: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const up = await marketplaceApi.uploadPhotos(files);
      onChange([...urls, ...up.map(u => u.url)]);
    } catch (ex: any) {
      alert(ex?.message || "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {urls.map((u, i) => (
        <div key={i} style={{
          width: 84, height: 84, borderRadius: 6, position: "relative",
          backgroundImage: `url(${resolveUploadUrl(u)})`, backgroundSize: "cover", backgroundPosition: "center",
          border: `1px solid ${CC_THEME.border}`,
        }}>
          <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i))} style={{
            position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%",
            border: 0, background: "rgba(148,41,43,0.9)", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1,
          }}>✕</button>
        </div>
      ))}
      <label style={{
        width: 84, height: 84, borderRadius: 6, border: `2px dashed ${CC_THEME.border}`,
        background: CC_THEME.bgSoft, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: CC_THEME.inkMid, cursor: "pointer", fontWeight: 500, textAlign: "center",
      }}>
        {uploading ? "…" : "+ Photo"}
        <input type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} />
      </label>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px", fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: CC_THEME.or, fontWeight: 600, textTransform: "uppercase" as const },
  h1: { fontFamily: CC_THEME.fontDisplay, fontSize: 30, color: CC_THEME.navy, fontWeight: 600, margin: "10px 0 6px", letterSpacing: "-0.01em" },
  subtitle: { fontSize: 14, color: CC_THEME.inkMid, fontStyle: "italic" },

  formGrid: { display: "flex", flexDirection: "column", gap: 16 },

  section: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: "20px 24px", boxShadow: CC_THEME.shadowSoft },
  sectionEyebrow: { fontSize: 10, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: `1px dotted ${CC_THEME.border}` },

  label: { display: "block", fontSize: 11, color: CC_THEME.inkMid, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  input: { width: "100%", padding: "10px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", background: CC_THEME.bgRaised, boxSizing: "border-box" as const, outline: "none", resize: "vertical" as const },

  itemCard: { padding: 14, background: CC_THEME.bgSoft, borderRadius: 6, marginBottom: 12, borderLeft: `3px solid ${CC_THEME.or}` },
  btnAdd: { background: "transparent", border: `1px dashed ${CC_THEME.border}`, color: CC_THEME.or, padding: "8px 14px", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  btnRemove: { background: "transparent", border: `1px solid ${CC_THEME.dangerBg}`, color: CC_THEME.danger, padding: "5px 10px", borderRadius: 3, cursor: "pointer", fontSize: 11, marginTop: 8, fontFamily: "inherit" },

  chipsGroup: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  chip: { border: `1px solid ${CC_THEME.border}`, padding: "5px 12px", borderRadius: 14, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  formErr: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "10px 14px", borderRadius: 4, fontSize: 13 },
  formSuccess: { background: CC_THEME.successBg, color: CC_THEME.success, padding: "10px 14px", borderRadius: 4, fontSize: 13 },

  actionsBar: { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "12px 28px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "12px 22px", borderRadius: 6, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },

  center: { padding: 60, textAlign: "center" as const, color: CC_THEME.inkMid, fontStyle: "italic" },
};
