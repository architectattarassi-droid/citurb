/**
 * CertificatConformiteCard — affiche l'état du permis d'habiter :
 *  - Si non délivré : formulaire de saisie (demande, visite, certificat).
 *  - Si délivré : affichage avec hash + QR + téléchargement attestation
 *    CITURBAREA + lien officiel commune.
 */

import React, { useState } from "react";
import {
  PH_STATUS_COLOR,
  PermisHabiterState,
  receptionApi,
} from "./reception-conformite.api";

type Props = {
  dossierId: string;
  permis: PermisHabiterState;
  defaultCommune?: string;
  canFinalize?: boolean; // exige réception provisoire FINAL
  onUpdated?: (next: PermisHabiterState) => void;
};

export default function CertificatConformiteCard({
  dossierId,
  permis,
  defaultCommune,
  canFinalize = true,
  onUpdated,
}: Props) {
  const status = permis.status;
  const color = PH_STATUS_COLOR[status];

  if (status === "DELIVRE" && permis.certificat) {
    return <DelivreView dossierId={dossierId} permis={permis} />;
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Permis d'habiter / Certificat de conformité
        </h2>
        <span
          style={{
            background: color.bg,
            color: color.fg,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {color.label}
        </span>
      </div>

      {status === "NON_DEMANDE" && (
        <DemandeForm
          dossierId={dossierId}
          defaultCommune={defaultCommune}
          canFinalize={canFinalize}
          onUpdated={onUpdated}
        />
      )}

      {(status === "DEMANDE_DEPOSEE" || status === "VISITE_PLANIFIEE") && (
        <VisiteForm
          dossierId={dossierId}
          onUpdated={onUpdated}
          existingVisitesCount={permis.visites?.length ?? 0}
        />
      )}

      {(status === "VISITE_EFFECTUEE" || status === "DEMANDE_DEPOSEE") && (
        <EnregistrerCertificatForm dossierId={dossierId} onUpdated={onUpdated} />
      )}

      {permis.visites && permis.visites.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
            Historique visites
          </div>
          {permis.visites.map((v) => (
            <div
              key={v.id}
              style={{
                fontSize: 12,
                background: "#f8fafc",
                padding: 8,
                borderRadius: 6,
                marginBottom: 4,
              }}
            >
              <strong>{new Date(v.dateVisite).toLocaleDateString("fr-MA")}</strong>{" "}
              · {v.agentName} · <em>{v.resultat}</em>
              {v.observations && <div style={{ color: "#64748b" }}>{v.observations}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DelivreView({ dossierId, permis }: { dossierId: string; permis: PermisHabiterState }) {
  const cert = permis.certificat!;
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
        border: "2px solid #16a34a",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, letterSpacing: 1 }}>
            PERMIS D'HABITER DÉLIVRÉ
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {cert.refOfficial}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
            Délivré le {new Date(cert.dateDelivrance).toLocaleDateString("fr-MA")}
          </div>
        </div>
        <span
          style={{
            background: "#16a34a",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          DÉLIVRÉ
        </span>
      </div>

      {cert.hashSha256 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>
          <strong>Empreinte SHA-256 :</strong>
          <div
            style={{
              fontFamily: "SF Mono, Consolas, monospace",
              wordBreak: "break-all",
              marginTop: 2,
            }}
          >
            {cert.hashSha256}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <a
          href={receptionApi.pdfCertificatUrl(dossierId)}
          target="_blank"
          rel="noopener"
          style={{
            background: "#0f172a",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Attestation CITURBAREA
        </a>
        {cert.urlOfficial && (
          <a
            href={cert.urlOfficial}
            target="_blank"
            rel="noopener"
            style={{
              background: "#fff",
              color: "#0f172a",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #cbd5e1",
            }}
          >
            Document officiel commune
          </a>
        )}
      </div>
    </div>
  );
}

function DemandeForm({
  dossierId,
  defaultCommune,
  canFinalize,
  onUpdated,
}: {
  dossierId: string;
  defaultCommune?: string;
  canFinalize?: boolean;
  onUpdated?: (p: PermisHabiterState) => void;
}) {
  const [commune, setCommune] = useState(defaultCommune ?? "");
  const [docs, setDocs] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!commune.trim()) {
      setErr("Commune requise");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const next = await receptionApi.demandePh(dossierId, {
        commune,
        dossierComplet: docs.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onUpdated?.(next);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!canFinalize && (
        <div
          style={{
            background: "#fef3c7",
            color: "#854d0e",
            padding: 8,
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          La réception provisoire doit être finalisée avant la demande de PH.
        </div>
      )}
      {err && (
        <div style={{ color: "#991b1b", fontSize: 12, marginBottom: 6 }}>{err}</div>
      )}
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
        Commune
      </label>
      <input
        value={commune}
        onChange={(e) => setCommune(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: "8px 10px",
          marginTop: 4,
          marginBottom: 8,
        }}
        disabled={!canFinalize}
      />
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
        Documents joints (ids séparés par des virgules)
      </label>
      <input
        value={docs}
        onChange={(e) => setDocs(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: "8px 10px",
          marginTop: 4,
          marginBottom: 10,
        }}
        disabled={!canFinalize}
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !canFinalize}
        style={{
          background: "#0f172a",
          color: "#fff",
          border: 0,
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {busy ? "…" : "Déposer la demande"}
      </button>
    </div>
  );
}

function VisiteForm({
  dossierId,
  onUpdated,
  existingVisitesCount,
}: {
  dossierId: string;
  onUpdated?: (p: PermisHabiterState) => void;
  existingVisitesCount: number;
}) {
  const [open, setOpen] = useState(existingVisitesCount === 0);
  const [dateVisite, setDateVisite] = useState(new Date().toISOString().slice(0, 10));
  const [agent, setAgent] = useState("");
  const [matricule, setMatricule] = useState("");
  const [obs, setObs] = useState("");
  const [resultat, setResultat] = useState<"FAVORABLE" | "DEFAVORABLE" | "AVEC_RESERVES" | "EN_ATTENTE">("EN_ATTENTE");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!agent.trim()) {
      setErr("Nom de l'agent requis");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const next = await receptionApi.visiteConformite(dossierId, {
        dateVisite,
        agentName: agent,
        agentMatricule: matricule || null,
        observations: obs || null,
        resultat,
      });
      onUpdated?.(next);
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "#fff",
          color: "#0f172a",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          marginTop: 10,
        }}
      >
        + Ajouter une visite agent
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: "#f8fafc",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        Visite agent commune
      </div>
      {err && <div style={{ color: "#991b1b", fontSize: 12, marginBottom: 6 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          type="date"
          value={dateVisite}
          onChange={(e) => setDateVisite(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}
        />
        <input
          placeholder="Nom agent"
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}
        />
        <input
          placeholder="Matricule"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}
        />
        <select
          value={resultat}
          onChange={(e) => setResultat(e.target.value as any)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 8 }}
        >
          <option value="EN_ATTENTE">En attente</option>
          <option value="FAVORABLE">Favorable</option>
          <option value="AVEC_RESERVES">Avec réserves</option>
          <option value="DEFAVORABLE">Défavorable</option>
        </select>
      </div>
      <textarea
        placeholder="Observations agent"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        style={{
          width: "100%",
          marginTop: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 8,
          minHeight: 60,
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            background: "#0f172a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function EnregistrerCertificatForm({
  dossierId,
  onUpdated,
}: {
  dossierId: string;
  onUpdated?: (p: PermisHabiterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!ref.trim()) {
      setErr("Référence officielle requise");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const next = await receptionApi.certificatConformite(dossierId, {
        refOfficial: ref,
        dateDelivrance: date,
        urlOfficial: url || null,
      });
      onUpdated?.(next);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "#16a34a",
          color: "#fff",
          border: 0,
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          marginTop: 10,
        }}
      >
        Enregistrer le permis d'habiter délivré
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#166534" }}>
        Permis d'habiter délivré
      </div>
      {err && <div style={{ color: "#991b1b", fontSize: 12, marginBottom: 6 }}>{err}</div>}
      <input
        placeholder="Référence officielle (n° du PH)"
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
        }}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
        }}
      />
      <input
        placeholder="URL document officiel commune (optionnel)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "…" : "Valider & générer attestation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
