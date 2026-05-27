/**
 * PcSoumissionStep — Étape 5 : Soumission finale.
 *
 * 3 options :
 *  (a) Self : télécharge PDF master, l'utilisateur soumet à la mairie.
 *  (b) Rokhas : soumission via la plateforme Rokhas (intégration future).
 *  (c) Mandated : mandater un architecte CITURBAREA (paiement supplémentaire).
 *
 * Génère une attestation PDF avec QR + hash SHA-256 après soumission.
 */

import React, { useState } from "react";
import {
  pcAttestationUrl,
  pcMasterUrl,
  submitPc,
  type PcDraft,
  type PcDraftResponse,
  type SubmissionMethod,
} from "./permis-construire.api";

interface Props {
  dossierId: string;
  draft: PcDraft;
  canSubmit: boolean;
  onChange: (resp: PcDraftResponse) => void;
}

export default function PcSoumissionStep({ dossierId, draft, canSubmit, onChange }: Props) {
  const [selected, setSelected] = useState<SubmissionMethod>("self");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitted = !!draft.soumission?.submittedAt;

  async function handleSubmit() {
    if (!canSubmit) {
      setError("Impossible de soumettre — vérifiez l'étape 4 (PDF master).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const resp = await submitPc(dossierId, selected);
      onChange(resp);
    } catch (e: any) {
      setError(e?.message ?? "Échec soumission");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "16px 12px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Soumission du dossier</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        Choisissez votre méthode de dépôt. Une attestation horodatée CITURBAREA est
        générée dans tous les cas.
      </p>

      {error && <div role="alert" style={alertStyle}>⚠ {error}</div>}

      {submitted ? (
        <SubmittedView dossierId={dossierId} draft={draft} />
      ) : (
        <>
          <MethodOption
            id="self"
            selected={selected}
            onSelect={setSelected}
            title="Je soumets moi-même à la mairie"
            description="Vous téléchargez le PDF master et vous le déposez en personne. Gratuit."
            badge="GRATUIT"
            badgeColor="#16a34a"
          />
          <MethodOption
            id="rokhas"
            selected={selected}
            onSelect={setSelected}
            title="Soumettre via Rokhas (e-permis)"
            description="Dépôt électronique via la plateforme nationale Rokhas. Intégration en cours de déploiement."
            badge="BÊTA"
            badgeColor="#2563eb"
          />
          <MethodOption
            id="mandated"
            selected={selected}
            onSelect={setSelected}
            title="Mandater un architecte CITURBAREA"
            description="Un architecte partenaire dépose le dossier en votre nom, suit la commission et vous représente. Paiement supplémentaire."
            badge="+ 1 500 MAD"
            badgeColor="#7c3aed"
          />

          <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#374151" }}>
            <strong>Récapitulatif :</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Dossier : {draft.dossierId}</li>
              <li>Type projet : {draft.identification.projectType ?? "—"}</li>
              <li>Commune : {draft.identification.commune ?? "—"}</li>
              <li>
                Hash master :{" "}
                <code style={{ fontSize: 10 }}>
                  {draft.masterHash ? `${draft.masterHash.slice(0, 16)}…` : "—"}
                </code>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            style={{
              ...primaryBtnFull,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
              marginTop: 16,
            }}
          >
            {submitting ? "Soumission en cours…" : "Confirmer la soumission"}
          </button>
        </>
      )}
    </div>
  );
}

function SubmittedView({ dossierId, draft }: { dossierId: string; draft: PcDraft }) {
  const s = draft.soumission!;
  return (
    <div style={{ textAlign: "center", padding: 16 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
      <h3 style={{ fontSize: 18, margin: "0 0 4px 0" }}>Dossier soumis avec succès</h3>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Référence : <strong>{s.reference}</strong>
      </p>
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        Méthode : {s.method} • Le {s.submittedAt?.slice(0, 10)} à {s.submittedAt?.slice(11, 16)}
      </p>
      {s.rokhasReference && (
        <p style={{ fontSize: 12, color: "#1e40af" }}>
          Rokhas : <code>{s.rokhasReference}</code>
        </p>
      )}

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <a
          href={pcMasterUrl(dossierId)}
          target="_blank"
          rel="noreferrer"
          style={primaryBtnFull}
        >
          Télécharger le PDF master
        </a>
        <a
          href={pcAttestationUrl(dossierId)}
          target="_blank"
          rel="noreferrer"
          style={{ ...primaryBtnFull, background: "#fff", color: "#2563eb", border: "1px solid #2563eb" }}
        >
          Télécharger l'attestation CITURBAREA
        </a>
      </div>

      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 16, wordBreak: "break-all" }}>
        Hash : {s.attestationHash}
      </p>
    </div>
  );
}

function MethodOption({
  id,
  selected,
  onSelect,
  title,
  description,
  badge,
  badgeColor,
}: {
  id: SubmissionMethod;
  selected: SubmissionMethod;
  onSelect: (m: SubmissionMethod) => void;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
}) {
  const isOn = selected === id;
  return (
    <label
      style={{
        display: "block",
        cursor: "pointer",
        padding: 12,
        border: `2px solid ${isOn ? "#2563eb" : "#e5e7eb"}`,
        borderRadius: 8,
        background: isOn ? "#eff6ff" : "#fff",
        marginBottom: 8,
        transition: "all .15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          <input
            type="radio"
            name="pc-method"
            checked={isOn}
            onChange={() => onSelect(id)}
            style={{ marginTop: 4 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
            <p style={{ fontSize: 12, color: "#374151", margin: "4px 0 0 0" }}>{description}</p>
          </div>
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "3px 8px",
            background: badgeColor,
            color: "#fff",
            fontSize: 10,
            borderRadius: 999,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </span>
      </div>
    </label>
  );
}

const alertStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 8,
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 12,
};

const primaryBtnFull: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "12px 16px",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  display: "block",
  width: "100%",
  boxSizing: "border-box",
};
