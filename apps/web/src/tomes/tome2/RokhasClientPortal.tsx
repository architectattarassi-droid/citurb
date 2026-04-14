/**
 * RokhasClientPortal — Miroir exact Rokhas.ma
 * - Phases 1 & 2 : saisie client OU architecte (verrouillé si phase >= 4)
 * - Phase 3 : e-Signature Barid (architecte uniquement) → verrouille + Rokhas auto
 * - Phases 4-6, 8, 10 : lecture seule (commune/commission) — toujours visitables
 * - Phase 7 : complément (actif si phaseActuelle === 7)
 * - Phase 9 : paiement taxes (actif si phaseActuelle === 9)
 */
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../tomes/tome4/apiClient";

// ─── Noms exacts Rokhas.ma ────────────────────────────────────────────────────

const PHASE_LABELS: Record<number, string> = {
  1:  "Saisie de la demande",
  2:  "Attachement des documents",
  3:  "Révision & e-Signature",
  4:  "Choix de la commission",
  5:  "Vérification & e-dispatch",
  6:  "Instruction",
  7:  "Ajout de complément",
  8:  "Décision préalable",
  9:  "Paiement des taxes",
  10: "E-Signature président",
};

const PHASE_RESPONSABLE: Record<number, string> = {
  1: "Architecte / Maître d'ouvrage",
  2: "Architecte / Maître d'ouvrage",
  3: "Architecte",
  4: "Commune",
  5: "Commune",
  6: "Commission d'instruction",
  7: "Architecte / Maître d'ouvrage",
  8: "Commission d'instruction",
  9: "Maître d'ouvrage",
  10: "Commune",
};

// ─── Statuts ──────────────────────────────────────────────────────────────────

const S: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  TERMINE:    { color: "#166534", bg: "#dcfce7", dot: "#22c55e", label: "Terminé" },
  EN_COURS:   { color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6", label: "En cours" },
  EN_ATTENTE: { color: "#475569", bg: "#f1f5f9", dot: "#94a3b8", label: "En attente" },
  BLOQUE:     { color: "#991b1b", bg: "#fee2e2", dot: "#ef4444", label: "Bloqué" },
};

const DS: Record<string, { color: string; bg: string; label: string }> = {
  LIVRE:       { color: "#166534", bg: "#dcfce7", label: "✅ Livré — Permis obtenu" },
  EN_COURS:    { color: "#1e40af", bg: "#dbeafe", label: "⏳ En cours d'instruction" },
  DEFAVORABLE: { color: "#991b1b", bg: "#fee2e2", label: "❌ Décision défavorable" },
  BROUILLON:   { color: "#475569", bg: "#f1f5f9", label: "📝 Brouillon" },
  TERMINE:     { color: "#166534", bg: "#dcfce7", label: "✅ Terminé" },
};

// ─── Documents requis phase 2 ─────────────────────────────────────────────────

const DOCS_REQUIRED = [
  { key: "planMasse",       label: "Plan de masse — situation et implantation" },
  { key: "plansArchi",      label: "Plans architecturaux (façades, coupes, niveaux)" },
  { key: "noteCalcul",      label: "Note de calcul structure" },
  { key: "titreFoncier",    label: "Attestation propriété / titre foncier" },
  { key: "cinMO",           label: "CIN maître d'ouvrage" },
  { key: "contratArchi",    label: "Contrat architecte signé et cacheté" },
  { key: "reglement",       label: "Extrait règlement d'urbanisme applicable" },
  { key: "attestationBet",  label: "Attestation bureau d'études techniques (BET)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

const LS: React.CSSProperties = { color: "#64748b", fontSize: 12, minWidth: 200, flexShrink: 0 };
const VS: React.CSSProperties = { color: "#e2e8f0", fontSize: 13, fontWeight: 500, wordBreak: "break-word" };
const RS: React.CSSProperties = {
  display: "flex", gap: 12, padding: "7px 0",
  borderBottom: "1px solid #131c2e", alignItems: "flex-start",
};
const INPUT_S: React.CSSProperties = {
  width: "100%", padding: "8px 11px", background: "#080e1a",
  border: "1px solid #1e293b", borderRadius: 6, color: "#e2e8f0",
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  if (val === null || val === undefined || val === "" || val === 0) return null;
  return (
    <div style={RS}>
      <span style={LS}>{label}</span>
      <span style={VS}>{val}</span>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "#334155", textTransform: "uppercase",
      letterSpacing: "0.07em", padding: "12px 0 4px", marginTop: 4,
    }}>{title}</div>
  );
}

function LockedBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: "8px 14px", background: "rgba(251,191,36,0.06)",
      border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6,
      fontSize: 12, color: "#fbbf24", marginBottom: 12,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      🔒 {msg}
    </div>
  );
}

// ─── Formulaire inline ────────────────────────────────────────────────────────

interface FieldDef {
  key: string; label: string; type: string;
  required?: boolean; help?: string; options?: string[]; wide?: boolean;
}

function InlineForm({
  fields, values, onChange, onSubmit, saving, saved, submitLabel, locked,
}: {
  fields: FieldDef[];
  values: Record<string, any>;
  onChange: (key: string, val: string) => void;
  onSubmit: () => void;
  saving: boolean; saved: boolean;
  submitLabel?: string;
  locked?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
        {fields.map(f => {
          const val = values[f.key] ?? "";
          const wide = f.wide || f.type === "textarea";
          return (
            <div key={f.key} style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                {f.label}{f.required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
              </label>
              {f.help && !locked && (
                <div style={{ fontSize: 10, color: "#334155", marginBottom: 4 }}>{f.help}</div>
              )}
              {locked ? (
                /* Lecture seule — même layout mais affichage texte */
                <div style={{ ...INPUT_S, background: "transparent", border: "1px solid #131c2e", color: val ? "#cbd5e1" : "#334155", minHeight: 36 }}>
                  {val || <span style={{ color: "#334155" }}>—</span>}
                </div>
              ) : f.type === "textarea" ? (
                <textarea
                  rows={3}
                  style={{ ...INPUT_S, resize: "vertical" }}
                  value={val}
                  onChange={e => onChange(f.key, e.target.value)}
                />
              ) : f.type === "select" && f.options ? (
                <select
                  style={{ ...INPUT_S, cursor: "pointer" }}
                  value={val}
                  onChange={e => onChange(f.key, e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type}
                  style={INPUT_S}
                  value={val}
                  onChange={e => onChange(f.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      {!locked && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onSubmit}
            disabled={saving}
            style={{
              padding: "9px 20px", borderRadius: 6, border: "none",
              background: saving ? "#1e293b" : "#1d4ed8",
              color: saving ? "#475569" : "#fff", fontSize: 13, fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : (submitLabel || "Enregistrer")}
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: "#86efac" }}>✓ Enregistré</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Détail de chaque phase ───────────────────────────────────────────────────

interface PhaseDetailProps {
  p: number;
  ph: any;
  data: any;
  mode: "client" | "architecte";
  locked: boolean;
  formVals: Record<string, any>;
  onFieldChange: (phase: number, key: string, val: string) => void;
  onSaisie: (phase: number) => void;
  onSubmitPhase: (phase: number) => void;
  onEsign: () => void;
  saving: boolean;
  savedPhase: number | null;
  signingEsign: boolean;
}


function PhaseDetail({
  p, ph, data, mode, locked,
  formVals, onFieldChange, onSaisie, onSubmitPhase, onEsign,
  saving, savedPhase, signingEsign,
}: PhaseDetailProps) {
  const fv = (key: string) => formVals[`p${p}_${key}`] ?? '';
  const fc = (key: string, val: string) => onFieldChange(p, key, val);

  const PHASE1_FIELDS: FieldDef[] = [
    { key: 'clientNom',       label: "Maître d'ouvrage — Nom complet", type: 'text', required: true, wide: true },
    { key: 'clientCin',       label: 'CIN / Identifiant',              type: 'text' },
    { key: 'typePermis',      label: 'Type de permis',                 type: 'select', options: ['construire', 'habiter', 'refection'] },
    { key: 'naturProjet',     label: 'Nature du projet',               type: 'text' },
    { key: 'typeProjet',      label: 'Type du projet',                 type: 'select', options: ['neuf', 'extension', 'surélévation', 'réfection', 'démolition'] },
    { key: 'consistance',     label: 'Consistance du projet',          type: 'text', wide: true, help: "Ex: Construction d'une villa R+1 sur lot n°..." },
    { key: 'niveaux',         label: 'Nombre de niveaux',             type: 'text' },
    { key: 'surfaceTerrain',  label: 'Surface du terrain (m²)',       type: 'number' },
    { key: 'surfaceBatie',    label: 'Surface bâtie (m²)',            type: 'number' },
    { key: 'surfacePlancher', label: 'Surface plancher (m²)',         type: 'number' },
    { key: 'cos',             label: 'COS',                           type: 'number' },
    { key: 'cus',             label: 'CUS',                           type: 'number' },
    { key: 'commune',         label: 'Commune',                       type: 'text' },
    { key: 'prefecture',      label: 'Préfecture',                    type: 'text' },
    { key: 'adresse',         label: 'Adresse du projet',             type: 'text', wide: true },
    { key: 'guichetDepot',    label: 'Guichet de dépôt',              type: 'text' },
    { key: 'refFoncieres',    label: 'Référence(s) foncière(s)',      type: 'text', help: 'Ex: T12345/58' },
    { key: 'dateDepot',       label: 'Date de dépôt',                 type: 'date' },
  ];

  const PHASE7_FIELDS: FieldDef[] = [
    { key: 'remarquesReponse',         label: 'Réponse aux observations',          type: 'textarea', required: true, wide: true, help: 'Répondez point par point aux observations de la commission' },
    { key: 'documentsComplementaires', label: 'Documents complémentaires fournis', type: 'textarea', wide: true },
    { key: 'dateReponse',              label: 'Date de réponse',                   type: 'date', required: true },
    { key: 'contactCommission',        label: 'Interlocuteur commission',          type: 'text' },
  ];

  const PHASE9_FIELDS: FieldDef[] = [
    { key: 'montantTaxes',      label: 'Montant des taxes (MAD)',    type: 'number', required: true },
    { key: 'referencePaiement', label: 'Référence de paiement',     type: 'text',   required: true },
    { key: 'datePaiement',      label: 'Date de paiement',          type: 'date',   required: true },
    { key: 'modePaiement',      label: 'Mode de paiement',          type: 'select', required: true, options: ['Virement bancaire', 'Chèque', 'Espèces guichet', 'Paiement en ligne'] },
    { key: 'banque',            label: 'Banque / Agence',           type: 'text' },
    { key: 'justificatifUrl',   label: 'Réf. justificatif uploadé', type: 'text' },
  ];

  const cdP2 = data?.clientData?.phase_2 || {};
  const cdP7 = data?.clientData?.phase_7;
  const cdP9 = data?.clientData?.phase_9;
  const isPhase3Done = p === 3 && ph?.statut === 'TERMINE';
  const canSign = p === 3 && mode === 'architecte' && !isPhase3Done && data?.phaseActuelle <= 3;
  const isP7Active = data?.phaseActuelle === 7;
  const isP9Active = data?.phaseActuelle === 9;

  return (
    <div style={{ padding: '4px 20px 20px' }}>

      <SectionTitle title="État de la phase" />
      <Row label="Responsable" val={PHASE_RESPONSABLE[p]} />
      {(ph?.dateEntree || ph?.dateSortie || ph?.delaiJours) && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#475569', padding: '4px 0 8px' }}>
          {ph?.dateEntree && <span>Entrée : <strong style={{ color: '#64748b' }}>{fmt(ph.dateEntree)}</strong></span>}
          {ph?.dateSortie && <span>Sortie : <strong style={{ color: '#64748b' }}>{fmt(ph.dateSortie)}</strong></span>}
          {ph?.delaiJours && <span>Délai : <strong style={{ color: '#64748b' }}>{ph.delaiJours} j</strong></span>}
        </div>
      )}
      {ph?.remarques && p !== 7 && (
        <div style={{ padding: '9px 14px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, fontSize: 13, color: '#fde68a', marginBottom: 10 }}>
          <strong>Observations :</strong> {ph.remarques}
        </div>
      )}

      {/* ── Phase 1 — Saisie de la demande ── */}
      {p === 1 && (
        <>
          <SectionTitle title="Données de la demande" />
          {locked && <LockedBanner msg="Dossier transmis à la commune — données verrouillées" />}
          <InlineForm
            fields={PHASE1_FIELDS}
            values={Object.fromEntries(PHASE1_FIELDS.map(f => [f.key, fv(f.key)]))}
            onChange={fc}
            onSubmit={() => onSaisie(1)}
            saving={saving}
            saved={savedPhase === 1}
            submitLabel="Enregistrer la saisie — Phase 1"
            locked={locked}
          />
        </>
      )}

      {/* ── Phase 2 — Attachement des documents ── */}
      {p === 2 && (
        <>
          <SectionTitle title="Documents à joindre au dossier" />
          {locked && <LockedBanner msg="Dossier transmis à la commune — liste verrouillée" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {DOCS_REQUIRED.map(doc => {
              const checked = formVals[`p2_${doc.key}`] === 'true' || cdP2[doc.key] === 'true';
              return (
                <label key={doc.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 6,
                  cursor: locked ? 'default' : 'pointer',
                  background: checked ? 'rgba(34,197,94,0.07)' : '#080e1a',
                  border: `1px solid ${checked ? 'rgba(34,197,94,0.25)' : '#131c2e'}`,
                  fontSize: 13, color: checked ? '#86efac' : '#94a3b8',
                }}>
                  <input type="checkbox" checked={checked} disabled={locked}
                    onChange={e => onFieldChange(2, doc.key, e.target.checked ? 'true' : 'false')}
                    style={{ accentColor: '#22c55e', width: 15, height: 15 }} />
                  {doc.label}
                </label>
              );
            })}
          </div>
          {!locked && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => onSaisie(2)} disabled={saving} style={{
                padding: '9px 20px', borderRadius: 6, border: 'none',
                background: saving ? '#1e293b' : '#1d4ed8',
                color: saving ? '#475569' : '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
              }}>
                {saving ? 'Enregistrement…' : "Enregistrer l'état des documents"}
              </button>
              {savedPhase === 2 && <span style={{ fontSize: 12, color: '#86efac' }}>✓ Enregistré</span>}
            </div>
          )}
        </>
      )}

      {/* ── Phase 3 — Révision & e-Signature ── */}
      {p === 3 && (
        <>
          <SectionTitle title="Révision du dossier" />
          <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0 12px', lineHeight: 1.7 }}>
            {"L'architecte vérifie la complétude du dossier puis appose sa signature via la clé "}
            <strong style={{ color: '#e2e8f0' }}>Barid e-Sign</strong>.{" "}
            <strong style={{ color: '#fbbf24' }}>Cette signature verrouille définitivement les phases 1 et 2</strong>
            {" et déclenche automatiquement la transmission à la commune sur Rokhas.ma."}
          </div>
          <SectionTitle title="Vérification avant signature" />
          <Row label="Maître d'ouvrage" val={data?.clientNom} />
          <Row label="Consistance"      val={data?.consistance} />
          <Row label="Commune"          val={data?.commune} />
          <Row label="Type de permis"   val={data?.typePermis} />
          <Row label="Surface terrain"  val={data?.surfaceTerrain > 0 ? data.surfaceTerrain + ' m²' : null} />
          {!data?.clientNom && (
            <div style={{ fontSize: 12, color: '#f87171', padding: '4px 0 8px' }}>
              ⚠️ Données incomplètes — vérifiez la Phase 1 avant de signer.
            </div>
          )}
          {isPhase3Done && (
            <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, color: '#86efac', fontWeight: 600 }}>
              ✅ Dossier signé et transmis à la commune — Rokhas synchronisé automatiquement
            </div>
          )}
          {canSign && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>
                En cliquant, vous confirmez que le dossier est complet. Cette action est irréversible.
              </div>
              <button onClick={onEsign} disabled={signingEsign} style={{
                padding: '11px 24px', borderRadius: 8, border: 'none',
                background: signingEsign ? '#1e293b' : 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                color: signingEsign ? '#475569' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: signingEsign ? 'default' : 'pointer',
              }}>
                {signingEsign ? 'Signature en cours…' : '🔐 Signer avec Barid e-Sign'}
              </button>
            </div>
          )}
          {!isPhase3Done && !canSign && (
            <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>
              {mode === 'client'
                ? "La signature est réservée à l'architecte responsable du dossier."
                : 'Complétez les phases 1 et 2 avant de signer.'}
            </div>
          )}
        </>
      )}

      {/* ── Phase 4 — Choix de la commission ── */}
      {p === 4 && (
        <>
          <SectionTitle title="Désignation de la commission" />
          <Row label="Commission désignée" val={ph?.remarques || null} />
          <Row label="Date de désignation" val={fmt(ph?.dateEntree)} />
          <div style={{ fontSize: 12, color: '#475569', padding: '6px 0', lineHeight: 1.7 }}>
            La commune désigne la commission compétente pour instruire le dossier.
          </div>
        </>
      )}

      {/* ── Phase 5 — Vérification & e-dispatch ── */}
      {p === 5 && (
        <>
          <SectionTitle title="Vérification et transmission" />
          <Row label="Date de vérification" val={fmt(ph?.dateEntree)} />
          <Row label="Date de transmission" val={fmt(ph?.dateSortie)} />
          <Row label="Délai de traitement"  val={ph?.delaiJours ? ph.delaiJours + ' j' : null} />
          <div style={{ fontSize: 12, color: '#475569', padding: '6px 0', lineHeight: 1.7 }}>
            {"L'agent vérifie la complétude et transmet électroniquement à la commission via Rokhas."}
          </div>
        </>
      )}

      {/* ── Phase 6 — Instruction ── */}
      {p === 6 && (
        <>
          <SectionTitle title="Instruction par la commission" />
          <Row label="Début instruction"   val={fmt(ph?.dateEntree)} />
          <Row label="Fin instruction"     val={fmt(ph?.dateSortie)} />
          <Row label="Délai d'instruction" val={ph?.delaiJours ? ph.delaiJours + ' j' : null} />
          <div style={{ fontSize: 12, color: '#475569', padding: '6px 0', lineHeight: 1.7 }}>
            La commission instruit le dossier. Elle peut rendre une décision ou demander un complément (Phase 7).
          </div>
        </>
      )}

      {/* ── Phase 7 — Ajout de complément ── */}
      {p === 7 && (
        <>
          <SectionTitle title="Observations de la commission" />
          {ph?.remarques ? (
            <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, fontSize: 13, color: '#fde68a', marginBottom: 12 }}>
              {ph.remarques}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#334155', padding: '4px 0 12px' }}>
              Les observations seront affichées ici lorsque la commission les aura émises.
            </div>
          )}
          {cdP7 && (
            <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 12, color: '#86efac', marginBottom: 12 }}>
              ✓ Réponse enregistrée le {fmt(cdP7.submittedAt)} — transmission Rokhas en attente
            </div>
          )}
          <SectionTitle title="Votre réponse" />
          {!isP7Active && (
            <div style={{ fontSize: 12, color: '#475569', padding: '4px 0 10px' }}>
              Cette phase sera active lorsque la commission demandera un complément.
            </div>
          )}
          <InlineForm
            fields={PHASE7_FIELDS}
            values={Object.fromEntries(PHASE7_FIELDS.map(f => [f.key, fv(f.key)]))}
            onChange={fc}
            onSubmit={() => onSubmitPhase(7)}
            saving={saving}
            saved={savedPhase === 7}
            submitLabel="Enregistrer la réponse au complément"
            locked={!isP7Active}
          />
        </>
      )}

      {/* ── Phase 8 — Décision préalable ── */}
      {p === 8 && (
        <>
          <SectionTitle title="Décision de la commission d'instruction" />
          {data?.decisionCommission ? (
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginBottom: 12,
              background: data.decisionCommission === 'Favorable' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${data.decisionCommission === 'Favorable' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: 15, fontWeight: 800,
              color: data.decisionCommission === 'Favorable' ? '#86efac' : '#fca5a5',
            }}>
              {data.decisionCommission === 'Favorable' ? '✅ DÉCISION FAVORABLE' : '❌ DÉCISION DÉFAVORABLE'}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#475569', padding: '6px 0 12px' }}>
              La décision sera rendue après instruction complète. Délai réglementaire : 60 jours.
            </div>
          )}
          <Row label="N° Arrêté"        val={data?.numArrete} />
          <Row label="Date de décision" val={fmt(ph?.dateSortie)} />
          <Row label="Délai"            val={ph?.delaiJours ? ph.delaiJours + ' j' : null} />
          <Row label="Motivations"      val={ph?.remarques} />
        </>
      )}

      {/* ── Phase 9 — Paiement des taxes ── */}
      {p === 9 && (
        <>
          <SectionTitle title="Avis de paiement des taxes d'urbanisme" />
          <div style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0 10px', lineHeight: 1.7 }}>
            Suite à la décision favorable, effectuez le paiement puis renseignez les informations ci-dessous.
          </div>
          {cdP9 && (
            <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontSize: 12, color: '#86efac', marginBottom: 12 }}>
              ✓ Paiement enregistré le {fmt(cdP9.submittedAt)} — transmission Rokhas en attente
            </div>
          )}
          <SectionTitle title="Informations de paiement" />
          {!isP9Active && (
            <div style={{ fontSize: 12, color: '#475569', padding: '4px 0 10px' }}>
              Cette phase sera active après la décision préalable favorable (Phase 8).
            </div>
          )}
          <InlineForm
            fields={PHASE9_FIELDS}
            values={Object.fromEntries(PHASE9_FIELDS.map(f => [f.key, fv(f.key)]))}
            onChange={fc}
            onSubmit={() => onSubmitPhase(9)}
            saving={saving}
            saved={savedPhase === 9}
            submitLabel="Confirmer le paiement des taxes — Rokhas"
            locked={!isP9Active}
          />
        </>
      )}

      {/* ── Phase 10 — E-Signature président ── */}
      {p === 10 && (
        <>
          <SectionTitle title="Signature présidentielle" />
          <Row label="N° Arrêté final"   val={data?.numArrete} />
          <Row label="Date de livraison" val={fmt(data?.dateLivraison)} />
          <Row label="Délai global"      val={data?.delaiGlobalJours ? data.delaiGlobalJours + ' jours' : null} />
          <Row label="Date de signature" val={fmt(ph?.dateSortie)} />
          <div style={{ fontSize: 12, color: '#475569', padding: '6px 0', lineHeight: 1.7 }}>
            {"Le président de la commune appose la signature finale sur l'arrêté de permis."}
          </div>
          {ph?.statut === 'TERMINE' && (
            <div style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 14, color: '#86efac', fontWeight: 700 }}>
              {"🎉 Permis obtenu — N° "}{data?.numArrete || "en cours d'émission"}
            </div>
          )}
        </>
      )}

    </div>
  );
}


// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  dossierId: string;
  mode?: "client" | "architecte";
}

export default function RokhasClientPortal({ dossierId, mode = "client" }: Props) {
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const [showPH, setShowPH]           = useState(false);
  const [formVals, setFormVals]       = useState<Record<string, any>>({});
  const [saving, setSaving]           = useState(false);
  const [savedPhase, setSavedPhase]   = useState<number | null>(null);
  const [signingEsign, setSigningEsign] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiFetch(`/p2/dossier/${dossierId}/rokhas/client-data`);
      setData(res);

      // Pré-remplit les formulaires depuis les champs officiels du dossier
      const pre: Record<string, any> = {
        p1_clientNom:       res.clientNom      || "",
        p1_clientCin:       res.clientCin      || "",
        p1_typePermis:      res.typePermis      || "",
        p1_naturProjet:     res.naturProjet     || "",
        p1_typeProjet:      res.typeProjet      || "",
        p1_consistance:     res.consistance     || "",
        p1_niveaux:         res.niveaux         || "",
        p1_surfaceTerrain:  res.surfaceTerrain  || "",
        p1_surfaceBatie:    res.surfaceBatie    || "",
        p1_surfacePlancher: res.surfacePlancher || "",
        p1_cos:             res.cos             || "",
        p1_cus:             res.cus             || "",
        p1_commune:         res.commune         || "",
        p1_prefecture:      res.prefecture      || "",
        p1_adresse:         res.adresse         || "",
        p1_guichetDepot:    res.guichetDepot    || "",
        p1_refFoncieres:    res.refFoncieres?.join(", ") || "",
        p1_dateDepot:       res.dateDepot ? res.dateDepot.slice(0, 10) : "",
      };

      // Pré-remplit depuis clientData (données saisies précédemment)
      if (res.clientData) {
        Object.entries(res.clientData as Record<string, any>).forEach(([phaseKey, vals]: [string, any]) => {
          const pNum = phaseKey.replace("phase_", "");
          Object.entries(vals || {}).forEach(([k, v]) => {
            if (k !== "submittedAt" && k !== "submittedBy" && k !== "_phase") {
              pre[`p${pNum}_${k}`] = v;
            }
          });
        });
        // Docs phase 2
        const cdP2 = res.clientData?.phase_2 || {};
        DOCS_REQUIRED.forEach(doc => {
          if (cdP2[doc.key] !== undefined) pre[`p2_${doc.key}`] = cdP2[doc.key];
        });
      }
      setFormVals(pre);
    } catch { setError("Impossible de charger les données Rokhas"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [dossierId]);

  const handleFieldChange = (phase: number, key: string, val: string) => {
    setFormVals(prev => ({ ...prev, [`p${phase}_${key}`]: val }));
  };

  // Sauvegarde phases 1 & 2 (endpoint /saisie)
  const handleSaisie = async (phase: number) => {
    setSaving(true); setError(null);
    const prefix = `p${phase}_`;
    const fields: Record<string, any> = { _phase: phase };
    Object.entries(formVals).forEach(([k, v]) => {
      if (k.startsWith(prefix)) fields[k.replace(prefix, "")] = v;
    });
    try {
      await apiFetch(`/p2/dossier/${dossierId}/rokhas/saisie`, { method: "POST", body: JSON.stringify(fields) });
      setSavedPhase(phase);
      await load();
      setTimeout(() => setSavedPhase(null), 4000);
    } catch (e: any) { setError(e?.message || "Erreur enregistrement"); }
    finally { setSaving(false); }
  };

  // Soumission phases 7 & 9 (endpoint /client-submit)
  const handleSubmitPhase = async (phase: number) => {
    setSaving(true); setError(null);
    const prefix = `p${phase}_`;
    const fields: Record<string, any> = {};
    Object.entries(formVals).forEach(([k, v]) => {
      if (k.startsWith(prefix)) fields[k.replace(prefix, "")] = v;
    });
    try {
      await apiFetch(`/p2/dossier/${dossierId}/rokhas/client-submit`, {
        method: "POST",
        body: JSON.stringify({ phase, fields }),
      });
      setSavedPhase(phase);
      await load();
      setTimeout(() => setSavedPhase(null), 4000);
    } catch { setError("Erreur enregistrement"); }
    finally { setSaving(false); }
  };

  // Phase 3 — e-Signature Barid
  const handleEsign = async () => {
    if (!window.confirm("Confirmer la signature Barid e-Sign ?\n\nCette action est irréversible. Le dossier sera transmis à la commune et les phases 1 et 2 seront verrouillées définitivement.")) return;
    setSigningEsign(true); setError(null);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/rokhas/esign`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e: any) { setError(e?.message || "Erreur signature"); }
    finally { setSigningEsign(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#64748b", fontSize: 13 }}>Chargement Rokhas…</div>;
  if (error && !data) return <div style={{ padding: 32, color: "#ef4444", fontSize: 13 }}>{error}</div>;

  const statut = DS[data?.statut] || DS.EN_COURS;
  const phases: any[] = data?.phases || [];
  const phaseActuelle: number = data?.phaseActuelle || 1;
  const isLocked = phaseActuelle >= 4;
  const estLivre = data?.statut === "LIVRE";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 940, margin: "0 auto" }}>

      {/* ── En-tête ── */}
      <div style={{
        background: "linear-gradient(135deg, #0b1120 0%, #131c2e 100%)",
        borderRadius: 12, padding: "20px 24px", marginBottom: 14,
        border: "1px solid #1a2332",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", marginBottom: 3 }}>
              {data?.numDossier || data?.refRokhas || "Dossier Rokhas"}
            </div>
            {data?.clientNom && (
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
                Maître d'ouvrage :{" "}
                <strong style={{ color: "#e2e8f0" }}>{data.clientNom}</strong>
                {data?.clientCin && <span style={{ marginLeft: 8, fontSize: 11, color: "#475569" }}>— {data.clientCin}</span>}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 18px", fontSize: 12, color: "#64748b" }}>
              <span>Type : <strong style={{ color: "#94a3b8" }}>
                {data?.typePermis === "habiter" ? "Permis d'habiter" : data?.typePermis === "refection" ? "Permis de réfection" : "Permis de construire"}
              </strong></span>
              {data?.commune && <span>Commune : <strong style={{ color: "#94a3b8" }}>{data.commune}{data?.prefecture && data.prefecture !== data.commune ? `, ${data.prefecture}` : ""}</strong></span>}
              {data?.consistance && <span>Objet : <strong style={{ color: "#94a3b8" }}>{data.consistance}</strong></span>}
              {data?.dateDepot && <span>Dépôt : <strong style={{ color: "#94a3b8" }}>{fmt(data.dateDepot)}</strong></span>}
              {data?.delaiGlobalJours > 0 && <span>Délai : <strong style={{ color: "#94a3b8" }}>{data.delaiGlobalJours} j</strong></span>}
              {data?.numArrete && <span>Arrêté : <strong style={{ color: "#94a3b8" }}>{data.numArrete}</strong></span>}
            </div>
          </div>
          <div style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: statut.bg, color: statut.color, flexShrink: 0 }}>
            {statut.label}
          </div>
        </div>

        {data?.decisionCommission && (
          <div style={{
            marginTop: 10, display: "inline-block", padding: "5px 14px", borderRadius: 6,
            background: data.decisionCommission === "Favorable" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: data.decisionCommission === "Favorable" ? "#86efac" : "#fca5a5",
            fontSize: 13, fontWeight: 700,
            border: `1px solid ${data.decisionCommission === "Favorable" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {data.decisionCommission === "Favorable" ? "✅" : "❌"} {data.decisionCommission}
          </div>
        )}

        {data?.pendingRokhasSync && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fbbf24", display: "inline-block", animation: "pulse 1s infinite" }} />
            Synchronisation Rokhas en attente — données transmises automatiquement
          </div>
        )}
      </div>

      {/* ── Barre de progression ── */}
      <div style={{ background: "#0b1120", border: "1px solid #1a2332", borderRadius: 10, padding: "14px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          Avancement — Phase {phaseActuelle} / 10{estLivre ? " · ✅ Permis obtenu" : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(p => {
            const ph = phases.find(x => x.phase === p);
            const st = ph?.statut || "EN_ATTENTE";
            const cfg = S[st] || S.EN_ATTENTE;
            const isCurrent = p === phaseActuelle;
            const isClient = [1, 2, 7, 9].includes(p);
            return (
              <React.Fragment key={p}>
                <div
                  onClick={() => setActivePhase(activePhase === p ? null : p)}
                  title={`Phase ${p} — ${PHASE_LABELS[p]}`}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: st === "TERMINE" ? "#14532d" : st === "EN_COURS" ? "#1e3a8a" : "#131c2e",
                    border: `2px solid ${cfg.dot}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                    color: st === "TERMINE" ? "#86efac" : st === "EN_COURS" ? "#93c5fd" : "#334155",
                    cursor: "pointer", position: "relative",
                    boxShadow: isCurrent ? `0 0 0 3px ${cfg.dot}50` : "none",
                  }}
                >
                  {st === "TERMINE" ? "✓" : p}
                  {isClient && st !== "TERMINE" && (
                    <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", border: "1.5px solid #0b1120" }} />
                  )}
                </div>
                {p < 10 && <div style={{ flex: 1, height: 2, background: p < phaseActuelle ? "#166534" : "#1a2332" }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Liste accordéon des phases ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 20 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(p => {
          const ph = phases.find(x => x.phase === p);
          const st = ph?.statut || "EN_ATTENTE";
          const cfg = S[st] || S.EN_ATTENTE;
          const isOpen = activePhase === p;
          const isCurrent = p === phaseActuelle;
          const isClientEditable = [1, 2].includes(p) && !isLocked;
          const hasAction = isClientEditable || p === 7 || p === 9;
          const hasClientData = !!(data?.clientData?.[`phase_${p}`]);
          const phaseLocked = isLocked && p <= 3; // phases 1-2-3 verrouillées si phase >= 4

          return (
            <div key={p} style={{
              border: `1px solid ${isOpen ? "#334155" : isCurrent ? "#1e3a8a50" : "#131c2e"}`,
              borderRadius: 8, overflow: "hidden",
              background: isOpen ? "#0b1120" : "#0a0f1a",
            }}>
              <div
                onClick={() => setActivePhase(isOpen ? null : p)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                  cursor: "pointer",
                  borderLeft: isCurrent && !isOpen ? "3px solid #3b82f6" : phaseLocked ? "3px solid #fbbf2440" : "3px solid transparent",
                }}
              >
                {/* Bulle */}
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: st === "TERMINE" ? "#14532d" : st === "EN_COURS" ? "#1e3a8a" : "#131c2e",
                  border: `2px solid ${cfg.dot}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  color: st === "TERMINE" ? "#86efac" : st === "EN_COURS" ? "#93c5fd" : "#334155",
                }}>
                  {st === "TERMINE" ? "✓" : p}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#334155", fontSize: 10 }}>Phase {p}</span>
                    <span>{PHASE_LABELS[p]}</span>
                    {hasAction && !phaseLocked && (
                      <span style={{ fontSize: 10, background: "#1e3a8a", color: "#93c5fd", borderRadius: 4, padding: "1px 7px" }}>
                        {[1, 2].includes(p) ? "Saisie" : "Action requise"}
                      </span>
                    )}
                    {phaseLocked && (
                      <span style={{ fontSize: 10, background: "#291500", color: "#fbbf24", borderRadius: 4, padding: "1px 7px" }}>🔒 Verrouillé</span>
                    )}
                    {hasClientData && (
                      <span style={{ fontSize: 10, background: "#14532d", color: "#86efac", borderRadius: 4, padding: "1px 7px" }}>✓ Données saisies</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>
                    {PHASE_RESPONSABLE[p]}
                    {ph?.dateEntree && <span style={{ marginLeft: 12 }}>Entrée : {fmt(ph.dateEntree)}</span>}
                    {ph?.delaiJours && <span style={{ marginLeft: 8 }}>· {ph.delaiJours}j</span>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color }}>
                    {cfg.label.toUpperCase()}
                  </span>
                  <span style={{ color: "#334155", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid #131c2e" }}>
                  <PhaseDetail
                    p={p} ph={ph} data={data} mode={mode}
                    locked={phaseLocked}
                    formVals={formVals}
                    onFieldChange={handleFieldChange}
                    onSaisie={handleSaisie}
                    onSubmitPhase={handleSubmitPhase}
                    onEsign={handleEsign}
                    saving={saving}
                    savedPhase={savedPhase}
                    signingEsign={signingEsign}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Permis d'Habiter ── */}
      {(estLivre || mode === "architecte") && (
        <div style={{ border: "1px solid #1a2332", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <div
            onClick={() => setShowPH(!showPH)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px", background: "#0b1120", cursor: "pointer",
              borderLeft: "3px solid #7c3aed",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>🏠 Permis d'Habiter — Dossier complémentaire</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>À initier après achèvement des travaux — dossier séparé sur Rokhas.ma</div>
            </div>
            <span style={{ color: "#334155", fontSize: 12 }}>{showPH ? "▲" : "▼"}</span>
          </div>
          {showPH && (
            <div style={{ padding: "16px 20px", background: "#0a0f1a", borderTop: "1px solid #131c2e" }}>
              <InlineForm
                fields={[
                  { key: "dateAchevement", label: "Date d'achèvement des travaux", type: "date", required: true },
                  { key: "conformePlan",   label: "Conforme aux plans autorisés",  type: "select", required: true,
                    options: ["Oui, conforme", "Oui avec modifications mineures", "Non — travaux modificatifs requis"] },
                  { key: "surfaceRealise", label: "Surface réalisée (m²)",         type: "number", required: true },
                  { key: "niveauxRealise", label: "Nombre de niveaux réalisés",    type: "text",   required: true },
                  { key: "notaireNom",     label: "Notaire (pour acte notarié)",   type: "text" },
                  { key: "remarquesFinaux",label: "Observations finales",          type: "textarea", wide: true },
                ]}
                values={Object.fromEntries(
                  ["dateAchevement", "conformePlan", "surfaceRealise", "niveauxRealise", "notaireNom", "remarquesFinaux"]
                    .map(k => [k, formVals[`pph_${k}`] || ""])
                )}
                onChange={(k, v) => handleFieldChange(99, k, v)}
                onSubmit={async () => {
                  setSaving(true);
                  const fields: Record<string, any> = { typePermis: "habiter" };
                  Object.entries(formVals).forEach(([k, v]) => {
                    if (k.startsWith("p99_")) fields[k.replace("p99_", "")] = v;
                  });
                  try {
                    await apiFetch(`/p2/dossier/${dossierId}/rokhas/client-submit`, {
                      method: "POST", body: JSON.stringify({ phase: 99, fields }),
                    });
                    setSavedPhase(99);
                    setTimeout(() => setSavedPhase(null), 4000);
                  } catch { setError("Erreur"); } finally { setSaving(false); }
                }}
                saving={saving}
                saved={savedPhase === 99}
                submitLabel="Initier le permis d'habiter sur Rokhas"
                locked={false}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, fontSize: 12, color: "#f87171", marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
