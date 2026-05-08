/**
 * DossierAdminCreate.tsx — Wizard admin de création de dossier
 *
 * Permet à l'atelier de créer un dossier complet sans passer par le wizard
 * client public. Une fois créé, l'admin peut piloter le projet en autonomie
 * et — quand le client revient — l'inviter via magic-login.
 *
 * Endpoint: POST /api/cc/dossiers/admin-create
 */

import React, { useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import { CC } from "../../theme/tokens";

type Porte = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

interface Props {
  onClose: () => void;
  onCreated?: (dossierId: string) => void;
}

const PORTES: { code: Porte; label: string; desc: string }[] = [
  { code: "P1", label: "Particulier",    desc: "Villa, R+n, projet personnel ou familial" },
  { code: "P2", label: "Promoteur",      desc: "Construction immobilière, lotissement, équipement" },
  { code: "P3", label: "MOD délégué",    desc: "Maîtrise d'ouvrage déléguée, coordination chantier" },
  { code: "P4", label: "Investisseur foncier", desc: "Analyse foncière, scénarios de rentabilité" },
  { code: "P5", label: "Rapports",       desc: "Estimation, conformité, expertise bâti" },
  { code: "P6", label: "Entreprise",     desc: "Prestataire ou fournisseur du réseau" },
];

export default function DossierAdminCreate({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<"porte" | "client" | "projet" | "submitting" | "done">("porte");
  const [porteType, setPorteType] = useState<Porte>("P2");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ dossierId: string; magicLoginUrl?: string } | null>(null);

  // Client
  const [clientNom, setClientNom] = useState("");
  const [raisonSociale, setRaisonSociale] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [ice, setIce] = useState("");
  const [rc, setRc] = useState("");
  const [representant, setRepresentant] = useState("");

  // Projet
  const [title, setTitle] = useState("");
  const [commune, setCommune] = useState("");
  const [natureProjet, setNatureProjet] = useState("");
  const [surfaceTerrain, setSurfaceTerrain] = useState("");
  const [surfacePlancher, setSurfacePlancher] = useState("");
  const [nbNiveaux, setNbNiveaux] = useState("");
  const [packPriceMAD, setPackPriceMAD] = useState("");
  const [packSelected, setPackSelected] = useState("");
  const [notesAdmin, setNotesAdmin] = useState("");
  const [inviteClient, setInviteClient] = useState(true);

  const submit = async () => {
    setError(null);
    setStep("submitting");
    try {
      const body: any = {
        porteType,
        clientNom: clientNom || undefined,
        clientEmail: clientEmail || undefined,
        clientTel: clientTel || undefined,
        raisonSociale: raisonSociale || undefined,
        ice: ice || undefined,
        rc: rc || undefined,
        representant: representant || undefined,
        title: title || undefined,
        commune: commune || undefined,
        natureProjet: natureProjet || undefined,
        surfaceTerrain: surfaceTerrain ? Number(surfaceTerrain) : undefined,
        surfacePlancher: surfacePlancher ? Number(surfacePlancher) : undefined,
        nbNiveaux: nbNiveaux ? Number(nbNiveaux) : undefined,
        packPriceMAD: packPriceMAD ? Number(packPriceMAD) : undefined,
        packSelected: packSelected || undefined,
        brief: notesAdmin ? { notesAdmin } : undefined,
        inviteClient: inviteClient && !!clientEmail,
      };
      const res = await apiFetch<{ ok: boolean; dossierId: string; magicLoginUrl?: string; error?: string }>(
        "/api/cc/dossiers/admin-create",
        { method: "POST", body },
      );
      if (!res.ok) throw new Error(res.error || "Erreur création dossier");
      setCreated({ dossierId: res.dossierId, magicLoginUrl: res.magicLoginUrl });
      setStep("done");
      onCreated?.(res.dossierId);
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
      setStep("projet");
    }
  };

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Atelier · Création directe</div>
            <h2 style={S.title}>Nouveau dossier</h2>
          </div>
          <button onClick={onClose} style={S.closeBtn} aria-label="Fermer">×</button>
        </header>

        <div style={S.steps}>
          <Step n="I"   label="Porte"   active={step === "porte"}   done={step !== "porte" && step !== "submitting"} />
          <Step n="II"  label="Client"  active={step === "client"}  done={["projet","submitting","done"].includes(step)} />
          <Step n="III" label="Projet"  active={step === "projet"}  done={["submitting","done"].includes(step)} />
          <Step n="IV"  label="Validation" active={step === "submitting" || step === "done"} done={step === "done"} />
        </div>

        <div style={S.body}>
          {step === "porte" && (
            <div style={S.porteGrid}>
              {PORTES.map(p => (
                <button
                  key={p.code}
                  onClick={() => { setPorteType(p.code); setStep("client"); }}
                  style={{ ...S.porteCard, ...(porteType === p.code ? S.porteCardActive : {}) }}
                >
                  <div style={S.porteCode}>{p.code}</div>
                  <div style={S.porteLabel}>{p.label}</div>
                  <div style={S.porteDesc}>{p.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === "client" && (
            <div style={S.form}>
              <Row>
                <Field label="Nom du client (particulier)">
                  <input style={S.input} value={clientNom} onChange={e => setClientNom(e.target.value)} placeholder="Prénom Nom" />
                </Field>
                <Field label="Raison sociale (entreprise)">
                  <input style={S.input} value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} placeholder="SARL / SA / EURL" />
                </Field>
              </Row>
              <Row>
                <Field label="Email">
                  <input style={S.input} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@exemple.ma" />
                </Field>
                <Field label="Téléphone">
                  <input style={S.input} value={clientTel} onChange={e => setClientTel(e.target.value)} placeholder="+212 6 12 34 56 78" />
                </Field>
              </Row>
              <Row>
                <Field label="ICE">
                  <input style={S.input} value={ice} onChange={e => setIce(e.target.value)} />
                </Field>
                <Field label="RC">
                  <input style={S.input} value={rc} onChange={e => setRc(e.target.value)} />
                </Field>
                <Field label="Représentant">
                  <input style={S.input} value={representant} onChange={e => setRepresentant(e.target.value)} />
                </Field>
              </Row>

              <div style={S.actions}>
                <button onClick={() => setStep("porte")} style={S.btnGhost}>← Porte</button>
                <button onClick={() => setStep("projet")} style={S.btnPrimary}>Continuer →</button>
              </div>
            </div>
          )}

          {(step === "projet" || step === "submitting") && (
            <div style={S.form}>
              <Row>
                <Field label="Titre du dossier" wide>
                  <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder={`${porteType} — ${commune || "Demande"}`} />
                </Field>
              </Row>
              <Row>
                <Field label="Commune">
                  <input style={S.input} value={commune} onChange={e => setCommune(e.target.value)} placeholder="Marrakech, Casablanca…" />
                </Field>
                <Field label="Nature du projet">
                  <input style={S.input} value={natureProjet} onChange={e => setNatureProjet(e.target.value)} placeholder="Villa, immeuble, expertise…" />
                </Field>
              </Row>
              <Row>
                <Field label="Surface terrain (m²)">
                  <input style={S.input} type="number" value={surfaceTerrain} onChange={e => setSurfaceTerrain(e.target.value)} />
                </Field>
                <Field label="Surface plancher (m²)">
                  <input style={S.input} type="number" value={surfacePlancher} onChange={e => setSurfacePlancher(e.target.value)} />
                </Field>
                <Field label="Niveaux">
                  <input style={S.input} type="number" value={nbNiveaux} onChange={e => setNbNiveaux(e.target.value)} />
                </Field>
              </Row>
              <Row>
                <Field label="Pack sélectionné">
                  <input style={S.input} value={packSelected} onChange={e => setPackSelected(e.target.value)} placeholder="ESSENTIEL / AVANCE / COMPLET…" />
                </Field>
                <Field label="Montant pack (DH)">
                  <input style={S.input} type="number" value={packPriceMAD} onChange={e => setPackPriceMAD(e.target.value)} />
                </Field>
              </Row>
              <Row>
                <Field label="Notes admin (interne)" wide>
                  <textarea style={{ ...S.input, minHeight: 70, fontFamily: CC.font.body, resize: "vertical" }} value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} placeholder="Contexte, contraintes, urgences…" />
                </Field>
              </Row>
              <Row>
                <label style={S.checkbox}>
                  <input type="checkbox" checked={inviteClient} onChange={e => setInviteClient(e.target.checked)} />
                  <span>Inviter le client par email (lien magique vers son espace)</span>
                </label>
              </Row>

              {error && <div style={S.error}>{error}</div>}

              <div style={S.actions}>
                <button onClick={() => setStep("client")} style={S.btnGhost} disabled={step === "submitting"}>← Client</button>
                <button onClick={submit} style={S.btnPrimary} disabled={step === "submitting"}>
                  {step === "submitting" ? "Création en cours…" : "Créer le dossier"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && created && (
            <div style={S.successBox}>
              <div style={S.successMark}>✓</div>
              <h3 style={S.successTitle}>Dossier créé</h3>
              <p style={S.successBody}>
                Référence : <code>{created.dossierId.slice(0, 12)}…</code>
              </p>
              {created.magicLoginUrl ? (
                <div style={S.magicBox}>
                  <div style={S.eyebrow}>Lien d'invitation client</div>
                  <input style={{ ...S.input, marginTop: 6, fontFamily: CC.font.mono, fontSize: 11.5 }} readOnly value={created.magicLoginUrl} onFocus={e => e.target.select()} />
                  <div style={S.successHint}>Email envoyé à {clientEmail}. Le lien est aussi copiable ci-dessus.</div>
                </div>
              ) : inviteClient && !clientEmail ? (
                <div style={S.successHint}>Aucun email fourni — invitation non envoyée. Tu peux la déclencher plus tard.</div>
              ) : null}
              <div style={S.actions}>
                <button onClick={onClose} style={S.btnPrimary}>Fermer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Step({ n, label, active, done }: { n: string; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ ...S.step, opacity: active || done ? 1 : 0.5 }}>
      <div style={{ ...S.stepMark, color: active ? CC.color.or : done ? CC.color.success : CC.color.inkMuted, borderColor: active ? CC.color.or : done ? CC.color.success : CC.color.border }}>
        {done ? "✓" : n}
      </div>
      <span style={{ ...S.stepLabel, color: active ? CC.color.navy : CC.color.inkMid, fontWeight: active ? 600 : 500 }}>{label}</span>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={S.row}>{children}</div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ ...S.field, flex: wide ? 2 : 1 }}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(15, 42, 74, 0.4)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { background: CC.color.bgRaised, borderRadius: 12, boxShadow: CC.shadow.deep, width: "min(820px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: CC.font.body, color: CC.color.ink },

  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 28px 16px", borderBottom: `1px solid ${CC.color.border}` },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "4px 0 0", fontFamily: CC.font.display, fontSize: 26, fontWeight: 600, color: CC.color.navy, letterSpacing: "-0.01em" },
  closeBtn: { background: "transparent", border: 0, fontSize: 26, color: CC.color.inkMid, cursor: "pointer", padding: 0, lineHeight: 1, fontFamily: CC.font.display },

  steps: { display: "flex", gap: 28, padding: "16px 28px", borderBottom: `1px solid ${CC.color.border}`, background: CC.color.bgSoft },
  step: { display: "flex", alignItems: "center", gap: 10 },
  stepMark: { fontFamily: CC.font.display, fontStyle: "italic", fontSize: 14, fontWeight: 600, width: 30, height: 30, borderRadius: "50%", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepLabel: { fontSize: 12.5, letterSpacing: "0.04em" },

  body: { padding: "24px 28px", overflowY: "auto" },

  // Porte selection
  porteGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  porteCard: { background: CC.color.bgSoft, border: `1px solid ${CC.color.border}`, borderRadius: 8, padding: "18px 18px", cursor: "pointer", textAlign: "left", transition: `all 0.18s ${CC.ease}`, fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 6 },
  porteCardActive: { background: CC.color.bgRaised, borderColor: CC.color.or, boxShadow: CC.shadow.raise },
  porteCode: { fontFamily: CC.font.display, fontStyle: "italic", fontSize: 22, fontWeight: 600, color: CC.color.or },
  porteLabel: { fontFamily: CC.font.display, fontSize: 16, fontWeight: 600, color: CC.color.navy },
  porteDesc: { fontSize: 12, color: CC.color.inkMid, lineHeight: 1.5 },

  // Form
  form: { display: "flex", flexDirection: "column", gap: 18 },
  row: { display: "flex", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 10.5, color: CC.color.inkMuted, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 },
  input: { fontFamily: CC.font.body, fontSize: 13.5, padding: "10px 12px", border: `1px solid ${CC.color.border}`, borderRadius: 6, background: CC.color.bgRaised, color: CC.color.ink, outline: "none", transition: `border-color 0.15s ${CC.ease}` },
  checkbox: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: CC.color.inkMid, cursor: "pointer", padding: "8px 12px", background: CC.color.bgSoft, borderRadius: 6 },
  error: { padding: "10px 14px", background: CC.color.dangerBg, border: `1px solid ${CC.color.danger}40`, borderRadius: 6, color: CC.color.danger, fontSize: 12.5 },

  actions: { display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 14, borderTop: `1px dotted ${CC.color.border}` },
  btnPrimary: { background: CC.color.navy, color: CC.color.bg, border: 0, padding: "10px 20px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", fontFamily: "inherit", boxShadow: CC.shadow.soft },
  btnGhost: { background: "transparent", color: CC.color.inkMid, border: `1px solid ${CC.color.border}`, padding: "10px 18px", borderRadius: 6, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" },

  // Success
  successBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0", textAlign: "center" },
  successMark: { fontSize: 38, color: CC.color.success, width: 60, height: 60, borderRadius: "50%", border: `3px solid ${CC.color.success}`, display: "flex", alignItems: "center", justifyContent: "center" },
  successTitle: { margin: 0, fontFamily: CC.font.display, fontSize: 22, color: CC.color.navy },
  successBody: { color: CC.color.inkMid, fontSize: 14, margin: "4px 0" },
  successHint: { fontSize: 11.5, color: CC.color.inkMuted, fontStyle: "italic", marginTop: 8 },
  magicBox: { width: "100%", padding: 14, background: CC.color.bgSoft, borderRadius: 8, border: `1px solid ${CC.color.border}`, marginTop: 8, textAlign: "left" },
};
