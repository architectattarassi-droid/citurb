/**
 * AssociationApplyPage — Sprint I
 *
 * Route : /cercles/:slug/rejoindre
 *
 * Affiche dynamiquement le formulaire d'adhésion défini dans
 * Cercle.formSchema (JSON), permet à l'utilisateur connecté de
 * soumettre son dossier. Si déjà soumis, montre l'état (PENDING /
 * APPROVED / REJECTED) avec carte d'adhérent si validé.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME, ensureFonts } from "./theme";
import {
  associationsApi, cerclesApi,
  CercleFormSchema, AssociationApplication, FormFieldDef,
} from "./api";

const MEMBER_TYPES = [
  { value: "ETUDIANT", label: "Étudiant en architecture/urbanisme" },
  { value: "JEUNE_DIPLOME", label: "Jeune diplômé (< 5 ans)" },
  { value: "ACTIF", label: "Architecte/urbaniste en exercice" },
];

export default function AssociationApplyPage() {
  useEffect(() => { ensureFonts(); }, []);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [schema, setSchema] = useState<CercleFormSchema | null>(null);
  const [existing, setExisting] = useState<AssociationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [memberType, setMemberType] = useState<string>("ACTIF");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      associationsApi.formSchema(slug),
      cerclesApi.detail(slug).then(r => r.data.id).then(cercleId => associationsApi.myApplication(cercleId)).catch(() => ({ data: null as any })),
    ])
      .then(([sch, myApp]) => {
        setSchema(sch.data);
        if (myApp?.data) setExisting(myApp.data);
      })
      .catch((e: any) => setErr(e?.message || "Erreur chargement"))
      .finally(() => setLoading(false));
  }, [slug]);

  const submit = async () => {
    if (!schema) return;
    // Validation côté front (champs requis)
    const required = (schema.formSchema || []).filter(f => f.required);
    const missing = required.filter(f => !formData[f.name] || String(formData[f.name]).trim() === "");
    if (missing.length > 0) {
      setErr(`Champs manquants : ${missing.map(m => m.label).join(", ")}`);
      return;
    }
    setErr(null); setSubmitting(true);
    try {
      const r = await associationsApi.apply(schema.id, formData, memberType);
      setSuccess(true);
      setExisting(r.data.application);
    } catch (e: any) {
      setErr(e?.message || "Erreur soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CerclesShell><div style={S.loading}>Chargement…</div></CerclesShell>;
  if (err && !schema) return <CerclesShell><div style={S.errBox}>⚠ {err}</div></CerclesShell>;
  if (!schema) return null;

  // Si demande déjà soumise → afficher état au lieu du form
  if (existing) {
    return (
      <CerclesShell>
        <ApplicationStatus app={existing} schema={schema} navigate={navigate} />
      </CerclesShell>
    );
  }

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <Link to={`/cercles/${schema.slug}`} style={S.back}>← Retour au cercle</Link>
          <div style={S.eyebrow}>FORMULAIRE D'ADHÉSION</div>
          <h1 style={S.title}>{schema.name}</h1>
          {schema.description && <p style={S.desc}>{schema.description}</p>}
        </header>

        {schema.eligibilityCriteria && (
          <div style={S.criteriaBox}>
            <strong>Critères d'éligibilité</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
              {Object.entries(schema.eligibilityCriteria).map(([k, v]) => (
                <li key={k}>{String(v)}</li>
              ))}
            </ul>
          </div>
        )}

        {schema.cotisationAnnuelleMad && (
          <div style={{ ...S.criteriaBox, background: CC_THEME.warnBg, borderLeftColor: CC_THEME.warn }}>
            💰 <strong>Cotisation annuelle : {schema.cotisationAnnuelleMad} MAD</strong> — sera demandée après validation du dossier.
          </div>
        )}

        <div style={S.formCard}>
          <Field label="Type de membre demandé *">
            <select style={S.input} value={memberType} onChange={(e) => setMemberType(e.target.value)}>
              {MEMBER_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>

          {(schema.formSchema || []).map((f) => (
            <DynamicField
              key={f.name}
              field={f}
              value={formData[f.name]}
              onChange={(v) => setFormData(d => ({ ...d, [f.name]: v }))}
            />
          ))}

          {err && <div style={S.errBoxInline}>⚠ {err}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <button onClick={() => navigate(`/cercles/${schema.slug}`)} style={S.btnGhost}>Annuler</button>
            <button onClick={submit} disabled={submitting} style={S.btnPrimary}>
              {submitting ? "Envoi…" : "Soumettre mon dossier"}
            </button>
          </div>
        </div>
      </div>
    </CerclesShell>
  );
}

function DynamicField({ field, value, onChange }: { field: FormFieldDef; value: any; onChange: (v: any) => void }) {
  const labelWithRequired = field.label + (field.required ? " *" : "");
  if (field.type === "textarea") {
    return (
      <Field label={labelWithRequired} helpText={field.helpText}>
        <textarea
          style={{ ...S.input, minHeight: 80, resize: "vertical" as const }}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={labelWithRequired} helpText={field.helpText}>
        <select style={S.input} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Sélectionner —</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    );
  }
  if (field.type === "checkbox") {
    return (
      <Field label="" helpText={field.helpText}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {labelWithRequired}
        </label>
      </Field>
    );
  }
  return (
    <Field label={labelWithRequired} helpText={field.helpText}>
      <input
        type={field.type}
        style={S.input}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </Field>
  );
}

function Field({ label, helpText, children }: { label: string; helpText?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={S.label}>{label}</label>}
      {children}
      {helpText && <div style={S.help}>{helpText}</div>}
    </div>
  );
}

function ApplicationStatus({ app, schema, navigate }: { app: AssociationApplication; schema: CercleFormSchema; navigate: any }) {
  const colors: Record<string, { bg: string; border: string; color: string; icon: string; title: string }> = {
    PENDING:   { bg: CC_THEME.infoBg,    border: CC_THEME.info,    color: CC_THEME.info,    icon: "⏳", title: "Dossier en cours d'examen" },
    APPROVED:  { bg: CC_THEME.successBg, border: CC_THEME.success, color: CC_THEME.success, icon: "✓",  title: "Adhésion validée 🎉" },
    REJECTED:  { bg: CC_THEME.dangerBg,  border: CC_THEME.danger,  color: CC_THEME.danger,  icon: "✗",  title: "Demande refusée" },
    CANCELLED: { bg: CC_THEME.bgSoft,    border: CC_THEME.inkMuted, color: CC_THEME.inkMid, icon: "—",  title: "Demande annulée" },
  };
  const c = colors[app.status] || colors.PENDING;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <Link to={`/cercles/${schema.slug}`} style={S.back}>← Retour au cercle</Link>
        <div style={S.eyebrow}>MA DEMANDE D'ADHÉSION</div>
        <h1 style={S.title}>{schema.name}</h1>
      </header>

      <div style={{ ...S.statusBox, background: c.bg, borderLeftColor: c.border }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>{c.icon}</div>
        <h2 style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 22, margin: "4px 0", color: c.color }}>{c.title}</h2>
        <div style={{ fontSize: 12, color: CC_THEME.inkMid }}>
          Soumise le {new Date(app.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          {app.reviewedAt && ` · Décidée le ${new Date(app.reviewedAt).toLocaleDateString("fr-FR")}`}
        </div>

        {app.status === "REJECTED" && app.rejectionReason && (
          <div style={{ marginTop: 14, padding: 12, background: "rgba(0,0,0,0.05)", borderRadius: 4, fontSize: 13 }}>
            <strong>Motif :</strong><br />{app.rejectionReason}
          </div>
        )}

        {app.status === "APPROVED" && (
          <div style={{ marginTop: 16, padding: 16, background: CC_THEME.navy, color: CC_THEME.bg, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: CC_THEME.or, fontWeight: 600 }}>CARTE D'ADHÉRENT</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 700, marginTop: 6, color: CC_THEME.or }}>
              {app.memberType || "ACTIF"}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {schema.name}
            </div>
          </div>
        )}
      </div>

      <div style={S.formCard}>
        <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, marginBottom: 14 }}>Données soumises</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {Object.entries(app.formData).map(([k, v]) => (
              <tr key={k} style={{ borderBottom: `1px dotted ${CC_THEME.borderSoft}` }}>
                <td style={{ padding: "8px 10px", fontSize: 12, color: CC_THEME.inkMid, width: 180 }}>{k}</td>
                <td style={{ padding: "8px 10px", fontSize: 13 }}>{String(v ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  loading: { padding: 60, textAlign: "center", color: CC_THEME.inkMid, fontStyle: "italic" },
  errBox: { padding: 32, color: CC_THEME.danger, background: CC_THEME.dangerBg, margin: 24, borderRadius: 6 },
  errBoxInline: { padding: "10px 14px", color: CC_THEME.danger, background: CC_THEME.dangerBg, borderRadius: 4, marginTop: 14, fontSize: 13 },

  root: { maxWidth: 760, margin: "0 auto", padding: "32px 24px 60px", fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },

  header: { marginBottom: 22 },
  back: { color: CC_THEME.inkMid, fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: CC_THEME.or, fontWeight: 600 },
  title: { fontFamily: CC_THEME.fontDisplay, fontSize: 28, color: CC_THEME.navy, margin: "8px 0 6px", fontWeight: 600, letterSpacing: "-0.01em" },
  desc: { fontSize: 14, color: CC_THEME.inkMid, lineHeight: 1.55, fontStyle: "italic" },

  criteriaBox: { background: CC_THEME.infoBg, borderLeft: `3px solid ${CC_THEME.info}`, padding: "14px 16px", borderRadius: 4, marginBottom: 16, fontSize: 13, lineHeight: 1.5 },

  formCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: "24px 28px", boxShadow: CC_THEME.shadowSoft },

  label: { display: "block", fontSize: 11, color: CC_THEME.inkMid, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  input: { width: "100%", padding: "10px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", background: CC_THEME.bgRaised, outline: "none", boxSizing: "border-box" as const },
  help: { fontSize: 11, color: CC_THEME.inkMuted, marginTop: 4, fontStyle: "italic" },

  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "12px 24px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "12px 22px", borderRadius: 6, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },

  statusBox: { padding: "24px 22px", borderLeft: `3px solid`, borderRadius: 6, marginBottom: 20 },
};
