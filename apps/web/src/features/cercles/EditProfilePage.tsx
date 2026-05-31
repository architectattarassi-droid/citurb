/**
 * EditProfilePage — Sprint G4
 *
 * Permet à l'utilisateur connecté d'éditer sa propre fiche professionnelle.
 * 7 sections : Identité, Cabinet/Structure, Formations, Certifications/Prix,
 * Projets phares, Spécialités/Régions/Langues, Tarifs/Dispo, Contact/Réseaux.
 *
 * Route : /cercles/me/edit
 *
 * i18n : tous les libellés et placeholders passent par useT().
 * Les tableaux METIERS / CLASSES_BTP / CABINET_STATUTS / LANGUES utilisent
 * des codes stables comme value technique ; le label affiché est résolu via
 * t(`cercles.edit_profile.<prefix>.<code>`).
 * Pour REGIONS : la value persistée reste la chaîne FR canonique
 * (Tanger-Tétouan-Al Hoceïma, etc.) pour ne pas casser les profils existants ;
 * un code interne permet uniquement la résolution du libellé traduit.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME, ensureFonts } from "./theme";
import { cerclesApi, marketplaceApi, resolveUploadUrl, ProMetier, ProClasseBTP, FormationEntry, ExperiencePhare } from "./api";
import { useT } from "../../i18n/i18n";

// Codes stables — labels resolved via t(`cercles.edit_profile.metier.${code}`)
const METIER_CODES: ProMetier[] = [
  "ARCHITECTE", "BET_STRUCTURE", "BET_FLUIDES", "BET_VRD", "TOPOGRAPHE",
  "GEOMETRE", "CONTROLE_TECHNIQUE", "LABORATOIRE", "ENTREPRISE_GO",
  "ENTREPRISE_SECOND_OEUVRE", "FOURNISSEUR_MATERIAUX", "PROMOTEUR",
  "MOA_PUBLIQUE", "MOA_PRIVEE", "ARTISAN_QUALIFIE",
];

const CLASSE_BTP_CODES: (ProClasseBTP | "")[] = ["", "CL1", "CL2", "CL3", "CL4", "CL5", "HC"];

const CABINET_STATUT_CODES = ["", "LIBERAL", "ASSOCIE", "SALARIE", "FONCTIONNAIRE", "INDEPENDANT"];

// La value persistée en DB reste la chaîne FR canonique (compat profils existants).
// Le `code` n'est utilisé que pour résoudre le libellé traduit.
const REGIONS: { code: string; value: string }[] = [
  { code: "TANGER_TETOUAN_AL_HOCEIMA", value: "Tanger-Tétouan-Al Hoceïma" },
  { code: "ORIENTAL", value: "Oriental" },
  { code: "FES_MEKNES", value: "Fès-Meknès" },
  { code: "RABAT_SALE_KENITRA", value: "Rabat-Salé-Kénitra" },
  { code: "BENI_MELLAL_KHENIFRA", value: "Béni Mellal-Khénifra" },
  { code: "CASABLANCA_SETTAT", value: "Casablanca-Settat" },
  { code: "MARRAKECH_SAFI", value: "Marrakech-Safi" },
  { code: "DRAA_TAFILALET", value: "Drâa-Tafilalet" },
  { code: "SOUSS_MASSA", value: "Souss-Massa" },
  { code: "GUELMIM_OUED_NOUN", value: "Guelmim-Oued Noun" },
  { code: "LAAYOUNE_SAKIA_EL_HAMRA", value: "Laâyoune-Sakia El Hamra" },
  { code: "DAKHLA_OUED_ED_DAHAB", value: "Dakhla-Oued Ed-Dahab" },
];

const LANGUE_CODES = ["FR", "AR", "EN", "BERBERE", "ES", "IT", "DE"];

export default function EditProfilePage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const t = useT();
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
      .catch((e: any) => setErr(e?.message || t("cercles.edit_profile.err.generic")))
      .finally(() => setLoading(false));
  }, []);

  const splitList = (s: string) => s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);

  const submit = async () => {
    if (!displayName.trim()) { setErr(t("cercles.edit_profile.err.name_required")); return; }
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
      setErr(e?.message || t("cercles.edit_profile.err.save"));
    } finally {
      setSaving(false);
    }
  };

  const toggleListVal = (list: string[], setList: (v: string[]) => void, val: string) => {
    if (list.includes(val)) setList(list.filter(x => x !== val));
    else setList([...list, val]);
  };

  if (loading) return <CerclesShell><div style={S.center}>{t("cercles.edit_profile.loading")}</div></CerclesShell>;

  return (
    <CerclesShell>
      <style>{`
        .cit-cercles-root { zoom: 1.3; min-height: calc(100vh / 1.3); padding: 32px 16px; }
        @media(max-width:480px){ .cit-cercles-root { zoom: 1; min-height: 100vh; padding: 16px 12px; } }
        .cit-cercles-card { padding: 32px; max-width: 700px; margin: 0 auto; }
        @media(max-width:480px){ .cit-cercles-card { padding: 20px 16px; } }
        .cit-cercles-input { padding: 12px 14px; min-height: 44px; font-size: 16px; }
      `}</style>
      <div style={S.root} className="cit-cercles-root">
        <header style={S.header}>
          <div style={S.eyebrow}>{t("cercles.edit_profile.eyebrow")}</div>
          <h1 style={S.h1}>{t("cercles.edit_profile.title")}</h1>
          <p style={S.subtitle}>
            {t("cercles.edit_profile.subtitle")}
          </p>
        </header>

        <div style={S.formGrid}>
          {/* ── Identité ── */}
          <Section title={t("cercles.edit_profile.section.identite")}>
            <Field label={t("cercles.edit_profile.field.display_name")}>
              <input className="cit-cercles-input" style={S.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.display_name")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.title")}>
              <input className="cit-cercles-input" style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.title")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.bio")}>
              <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 90 }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
            </Field>
            <Row>
              <Field label={t("cercles.edit_profile.field.metier")}>
                <select className="cit-cercles-input" style={S.input} value={metier} onChange={(e) => setMetier(e.target.value as ProMetier)}>
                  {METIER_CODES.map(code => <option key={code} value={code}>{t(`cercles.edit_profile.metier.${code}`)}</option>)}
                </select>
              </Field>
              <Field label={t("cercles.edit_profile.field.classe_btp")}>
                <select className="cit-cercles-input" style={S.input} value={classeBTP} onChange={(e) => setClasseBTP(e.target.value as any)}>
                  {CLASSE_BTP_CODES.map(code => (
                    <option key={code || "none"} value={code}>
                      {code === "" ? t("cercles.edit_profile.classe.none") : t(`cercles.edit_profile.classe.${code}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>
            <Field label={t("cercles.edit_profile.field.cnoa")}>
              <input className="cit-cercles-input" style={S.input} value={cnoaNumero} onChange={(e) => setCnoa(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.cnoa")} />
            </Field>
          </Section>

          {/* ── Cabinet ── */}
          <Section title={t("cercles.edit_profile.section.cabinet")}>
            <Field label={t("cercles.edit_profile.field.cabinet_name")}>
              <input className="cit-cercles-input" style={S.input} value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.cabinet_name")} />
            </Field>
            <Row>
              <Field label={t("cercles.edit_profile.field.cabinet_status")}>
                <select className="cit-cercles-input" style={S.input} value={cabinetStatus} onChange={(e) => setCabinetStatus(e.target.value)}>
                  {CABINET_STATUT_CODES.map(code => (
                    <option key={code || "none"} value={code}>
                      {code === "" ? t("cercles.edit_profile.statut.none") : t(`cercles.edit_profile.statut.${code}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("cercles.edit_profile.field.cabinet_size")}>
                <input className="cit-cercles-input" style={S.input} type="number" min="1" value={cabinetSize} onChange={(e) => setCabinetSize(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.cabinet_size")} />
              </Field>
              <Field label={t("cercles.edit_profile.field.years_exp")}>
                <input className="cit-cercles-input" style={S.input} type="number" min="0" max="60" value={yearsExperience} onChange={(e) => setYearsExp(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.years_exp")} />
              </Field>
            </Row>
          </Section>

          {/* ── Formations ── */}
          <Section title={t("cercles.edit_profile.section.formations")}>
            {formations.map((f, i) => (
              <div key={i} style={S.itemCard}>
                <Row>
                  <Field label={t("cercles.edit_profile.field.ecole")}>
                    <input className="cit-cercles-input" style={S.input} value={f.ecole} onChange={(e) => updateFormation(formations, setFormations, i, "ecole", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.ecole")} />
                  </Field>
                  <Field label={t("cercles.edit_profile.field.diplome")}>
                    <input className="cit-cercles-input" style={S.input} value={f.diplome} onChange={(e) => updateFormation(formations, setFormations, i, "diplome", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.diplome")} />
                  </Field>
                </Row>
                <Row>
                  <Field label={t("cercles.edit_profile.field.ville")}>
                    <input className="cit-cercles-input" style={S.input} value={f.ville || ""} onChange={(e) => updateFormation(formations, setFormations, i, "ville", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.ville_formation")} />
                  </Field>
                  <Field label={t("cercles.edit_profile.field.annee")}>
                    <input className="cit-cercles-input" style={S.input} type="number" min="1950" max="2030" value={f.annee || ""} onChange={(e) => updateFormation(formations, setFormations, i, "annee", e.target.value ? Number(e.target.value) : undefined)} placeholder={t("cercles.edit_profile.placeholder.annee_formation")} />
                  </Field>
                  <button onClick={() => setFormations(formations.filter((_, idx) => idx !== i))} style={S.btnRemove}>{t("cercles.edit_profile.btn.remove")}</button>
                </Row>
              </div>
            ))}
            <button onClick={() => setFormations([...formations, { ecole: "", diplome: "" }])} style={S.btnAdd}>{t("cercles.edit_profile.btn.add_formation")}</button>
          </Section>

          {/* ── Certifications / Prix ── */}
          <Section title={t("cercles.edit_profile.section.certifications")}>
            <Field label={t("cercles.edit_profile.field.certifications")}>
              <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 60 }} value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.certifications")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.prix")}>
              <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 60 }} value={prix} onChange={(e) => setPrix(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.prix")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.agrements")}>
              <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 60 }} value={agrements} onChange={(e) => setAgrements(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.agrements")} />
            </Field>
          </Section>

          {/* ── Projets phares ── */}
          <Section title={t("cercles.edit_profile.section.projets")}>
            {projets.map((p, i) => (
              <div key={i} style={S.itemCard}>
                <Field label={t("cercles.edit_profile.field.projet_titre")}>
                  <input className="cit-cercles-input" style={S.input} value={p.titre} onChange={(e) => updateProjet(projets, setProjets, i, "titre", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.projet_titre")} />
                </Field>
                <Field label={t("cercles.edit_profile.field.projet_description")}>
                  <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 60 }} value={p.description || ""} onChange={(e) => updateProjet(projets, setProjets, i, "description", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.projet_description")} />
                </Field>
                <Row>
                  <Field label={t("cercles.edit_profile.field.projet_lieu")}>
                    <input className="cit-cercles-input" style={S.input} value={p.lieu || ""} onChange={(e) => updateProjet(projets, setProjets, i, "lieu", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.projet_lieu")} />
                  </Field>
                  <Field label={t("cercles.edit_profile.field.projet_annee_livraison")}>
                    <input className="cit-cercles-input" style={S.input} type="number" min="1990" max="2040" value={p.anneeLivraison || ""} onChange={(e) => updateProjet(projets, setProjets, i, "anneeLivraison", e.target.value ? Number(e.target.value) : undefined)} placeholder={t("cercles.edit_profile.placeholder.projet_annee_livraison")} />
                  </Field>
                  <Field label={t("cercles.edit_profile.field.projet_surface")}>
                    <input className="cit-cercles-input" style={S.input} value={p.surface || ""} onChange={(e) => updateProjet(projets, setProjets, i, "surface", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.projet_surface")} />
                  </Field>
                </Row>
                <Row>
                  <Field label={t("cercles.edit_profile.field.projet_role")}>
                    <input className="cit-cercles-input" style={S.input} value={p.role || ""} onChange={(e) => updateProjet(projets, setProjets, i, "role", e.target.value)} placeholder={t("cercles.edit_profile.placeholder.projet_role")} />
                  </Field>
                  <Field label={t("cercles.edit_profile.field.projet_photos")}>
                    <ProjectPhotos
                      urls={p.imageUrls || []}
                      onChange={(urls) => updateProjet(projets, setProjets, i, "imageUrls", urls)}
                    />
                  </Field>
                </Row>
                <button onClick={() => setProjets(projets.filter((_, idx) => idx !== i))} style={S.btnRemove}>{t("cercles.edit_profile.btn.remove_projet")}</button>
              </div>
            ))}
            <button onClick={() => setProjets([...projets, { titre: "" }])} style={S.btnAdd}>{t("cercles.edit_profile.btn.add_projet")}</button>
          </Section>

          {/* ── Spécialités / Régions / Langues ── */}
          <Section title={t("cercles.edit_profile.section.competences")}>
            <Field label={t("cercles.edit_profile.field.specialites")}>
              <textarea className="cit-cercles-input" style={{ ...S.input, minHeight: 50 }} value={specialites} onChange={(e) => setSpecialites(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.specialites")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.regions")}>
              <div style={S.chipsGroup}>
                {REGIONS.map(r => (
                  <button key={r.code} onClick={() => toggleListVal(regions, setRegions, r.value)} style={{
                    ...S.chip,
                    background: regions.includes(r.value) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                    color: regions.includes(r.value) ? CC_THEME.navy : CC_THEME.inkMid,
                    fontWeight: regions.includes(r.value) ? 600 : 400,
                  }}>{t(`cercles.edit_profile.region.${r.code}`)}</button>
                ))}
              </div>
            </Field>
            <Field label={t("cercles.edit_profile.field.ville_principale")}>
              <input className="cit-cercles-input" style={S.input} value={villePrincipale} onChange={(e) => setVille(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.ville_principale")} />
            </Field>
            <Field label={t("cercles.edit_profile.field.langues")}>
              <div style={S.chipsGroup}>
                {LANGUE_CODES.map(code => (
                  <button key={code} onClick={() => toggleListVal(langues, setLangues, code)} style={{
                    ...S.chip,
                    background: langues.includes(code) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                    color: langues.includes(code) ? CC_THEME.navy : CC_THEME.inkMid,
                    fontWeight: langues.includes(code) ? 600 : 400,
                  }}>{t(`cercles.edit_profile.langue.${code}`)}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* ── Tarifs / Disponibilité ── */}
          <Section title={t("cercles.edit_profile.section.tarifs")}>
            <Field label={t("cercles.edit_profile.field.tarifs_range")}>
              <input className="cit-cercles-input" style={S.input} value={tarifsRange} onChange={(e) => setTarifs(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.tarifs_range")} />
            </Field>
            <Row>
              <Field label={t("cercles.edit_profile.field.disponibilite")}>
                <select className="cit-cercles-input" style={S.input} value={disponibilite} onChange={(e) => setDispo(e.target.value)}>
                  <option value="DISPONIBLE">{t("cercles.edit_profile.disponibilite.disponible")}</option>
                  <option value="OCCUPE">{t("cercles.edit_profile.disponibilite.occupe")}</option>
                  <option value="INDISPONIBLE">{t("cercles.edit_profile.disponibilite.indisponible")}</option>
                </select>
              </Field>
              <Field label={t("cercles.edit_profile.field.dispo_date")}>
                <input className="cit-cercles-input" style={S.input} type="date" value={disponibleAPartir} onChange={(e) => setDispoDate(e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* ── Contact / Réseaux ── */}
          <Section title={t("cercles.edit_profile.section.contact")}>
            <Row>
              <Field label={t("cercles.edit_profile.field.email_public")}>
                <input className="cit-cercles-input" style={S.input} value={emailPublic} onChange={(e) => setEmail(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.email_public")} />
              </Field>
              <Field label={t("cercles.edit_profile.field.phone_public")}>
                <input className="cit-cercles-input" style={S.input} value={phonePublic} onChange={(e) => setPhone(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.phone_public")} />
              </Field>
            </Row>
            <Row>
              <Field label={t("cercles.edit_profile.field.website")}>
                <input className="cit-cercles-input" style={S.input} value={websiteUrl} onChange={(e) => setWeb(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.website")} />
              </Field>
              <Field label={t("cercles.edit_profile.field.linkedin")}>
                <input className="cit-cercles-input" style={S.input} value={linkedinUrl} onChange={(e) => setLinkedin(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.linkedin")} />
              </Field>
            </Row>
            <Row>
              <Field label={t("cercles.edit_profile.field.behance")}>
                <input className="cit-cercles-input" style={S.input} value={behanceUrl} onChange={(e) => setBehance(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.behance")} />
              </Field>
              <Field label={t("cercles.edit_profile.field.instagram")}>
                <input className="cit-cercles-input" style={S.input} value={instagramUrl} onChange={(e) => setInsta(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.instagram")} />
              </Field>
              <Field label={t("cercles.edit_profile.field.pinterest")}>
                <input className="cit-cercles-input" style={S.input} value={pinterestUrl} onChange={(e) => setPinterest(e.target.value)} placeholder={t("cercles.edit_profile.placeholder.pinterest")} />
              </Field>
            </Row>
          </Section>

          {err && <div style={S.formErr}>⚠ {err}</div>}
          {success && <div style={S.formSuccess}>{t("cercles.edit_profile.success.saved")}</div>}

          <div style={S.actionsBar}>
            <button onClick={() => navigate(-1)} style={S.btnGhost}>{t("cercles.edit_profile.btn.cancel")}</button>
            <button onClick={submit} disabled={saving} style={S.btnPrimary}>
              {saving ? t("cercles.edit_profile.btn.saving") : t("cercles.edit_profile.btn.save")}
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
  const t = useT();
  const [uploading, setUploading] = useState(false);
  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const up = await marketplaceApi.uploadPhotos(files);
      onChange([...urls, ...up.map(u => u.url)]);
    } catch (ex: any) {
      alert(ex?.message || t("cercles.edit_profile.photos.upload_failed"));
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
        {uploading ? t("cercles.edit_profile.photos.uploading") : t("cercles.edit_profile.photos.add")}
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
