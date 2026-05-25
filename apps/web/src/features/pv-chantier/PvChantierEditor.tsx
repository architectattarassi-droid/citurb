/**
 * PvChantierEditor — création / édition d'un PV (DRAFT).
 *
 * Sections collapsibles, upload photo base64 (avec geoloc navigateur),
 * FAB sticky "Sauvegarder", bouton "Finaliser".
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PvChantierSignaturePad from "./PvChantierSignaturePad";
import {
  PvChantier,
  PvObservation,
  PvSeverite,
  PvTypeVisite,
  SEVERITE_COLOR,
  TYPE_VISITE_LABEL,
  pvChantierApi,
} from "./pv-chantier.api";

const S = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: 14, paddingBottom: 90 },
  h1: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" },
  sub: { color: "#64748b", fontSize: 13, marginBottom: 16 },
  section: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionHead: {
    padding: "12px 14px",
    cursor: "pointer",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    fontWeight: 700,
    color: "#0f172a",
    borderBottom: "1px solid transparent",
  },
  sectionHeadOpen: { borderBottomColor: "#e2e8f0" },
  sectionBody: { padding: 14 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  field: { display: "flex" as const, flexDirection: "column" as const, gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: "#475569" },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
  } as React.CSSProperties,
  textarea: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
    minHeight: 80,
    resize: "vertical" as const,
  } as React.CSSProperties,
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  obs: {
    border: "1px solid #e2e8f0",
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    background: "#fff",
  },
  pill: {
    display: "inline-block" as const,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },
  photoRow: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    objectFit: "cover" as const,
    borderRadius: 6,
    border: "1px solid #e2e8f0",
  },
  fab: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(255,255,255,0.98)",
    borderTop: "1px solid #e2e8f0",
    padding: 10,
    display: "flex" as const,
    justifyContent: "center" as const,
    gap: 10,
    zIndex: 60,
    backdropFilter: "blur(6px)",
  },
  msgOk: {
    background: "#dcfce7",
    color: "#166534",
    padding: 8,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 10,
  },
  msgErr: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 8,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 10,
  },
};

const SEVERITES: PvSeverite[] = ["INFO", "AVIS", "RESERVE", "BLOQUANT"];
const TYPES: PvTypeVisite[] = [
  "INITIALE",
  "AVANCEMENT",
  "RECEPTION_PROVISOIRE",
  "RECEPTION_DEFINITIVE",
  "LEVE_RESERVES",
];

type EditorMode = "new" | "edit";

type EditorProps = {
  mode: EditorMode;
  /** Si mode=new : dossierId fourni ; si mode=edit : pvId fourni. */
  dossierId?: string;
  pvId?: string;
  baseRoute?: string;
};

export default function PvChantierEditor({
  mode,
  dossierId,
  pvId,
  baseRoute = "/pv-chantier",
}: EditorProps) {
  const navigate = useNavigate();
  const params = useParams<{ dossierId?: string; pvId?: string }>();
  const effectiveDossierId = dossierId ?? params.dossierId ?? "";
  const effectivePvId = pvId ?? params.pvId ?? "";

  const [pv, setPv] = useState<PvChantier | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string>("general");

  // Signature panel
  const [signPartie, setSignPartie] = useState("");
  const [signDataUrl, setSignDataUrl] = useState("");

  useEffect(() => {
    if (mode === "edit" && effectivePvId) {
      setLoading(true);
      pvChantierApi
        .get(effectivePvId)
        .then(setPv)
        .catch((e) => setErr(e?.message ?? "Erreur"))
        .finally(() => setLoading(false));
    } else if (mode === "new" && effectiveDossierId) {
      setPv(blankPv(effectiveDossierId));
    }
  }, [mode, effectiveDossierId, effectivePvId]);

  if (loading) return <div style={S.wrap}>Chargement…</div>;
  if (!pv) return <div style={S.wrap}>{err ?? "Aucun PV"}</div>;

  const update = (patch: Partial<PvChantier>) =>
    setPv((p) => (p ? { ...p, ...patch } : p));

  const addObservation = () => {
    const next: PvObservation = {
      id: cryptoRandomId(),
      severite: "INFO",
      titre: "",
      description: "",
      photoUrls: [],
    };
    update({ observations: [...pv.observations, next] });
  };

  const patchObservation = (id: string, patch: Partial<PvObservation>) => {
    update({
      observations: pv.observations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  };

  const removeObservation = (id: string) => {
    update({ observations: pv.observations.filter((o) => o.id !== id) });
  };

  const handlePhoto = async (obs: PvObservation, file: File) => {
    if (!pv.id || pv.id.startsWith("local-")) {
      setErr("Sauvegardez d'abord le PV pour pouvoir attacher des photos.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const geo = await safeGetGeoloc();
      const up = await pvChantierApi.uploadPhoto(pv.id, {
        contentBase64: base64,
        mimeType: file.type || "image/jpeg",
        filenameHint: file.name,
      });
      patchObservation(obs.id, {
        photoUrls: [...obs.photoUrls, up.url],
        geoloc: obs.geoloc ?? geo ?? null,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Upload photo échoué");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "new" || pv.id.startsWith("local-")) {
        const created = await pvChantierApi.create(effectiveDossierId, {
          date: pv.date,
          typeVisite: pv.typeVisite,
          meteo: pv.meteo,
          temperatureC: pv.temperatureC ?? null,
          vent: pv.vent,
          presents: pv.presents,
          absents: pv.absents,
          observations: pv.observations,
          decisions: pv.decisions,
          prochaineVisite: pv.prochaineVisite,
        });
        setPv(created);
        setMsg("PV créé.");
        navigate(`${baseRoute}/${created.id}/edit`, { replace: true });
      } else {
        const updated = await pvChantierApi.patch(pv.id, {
          date: pv.date,
          typeVisite: pv.typeVisite,
          meteo: pv.meteo,
          temperatureC: pv.temperatureC ?? null,
          vent: pv.vent,
          presents: pv.presents,
          absents: pv.absents,
          observations: pv.observations,
          decisions: pv.decisions,
          prochaineVisite: pv.prochaineVisite,
        });
        setPv(updated);
        setMsg("PV enregistré.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Enregistrement échoué");
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!pv || pv.id.startsWith("local-")) {
      setErr("Enregistrez d'abord le PV.");
      return;
    }
    if (!signPartie.trim() || !signDataUrl) {
      setErr("Indiquez la partie et signez avant validation.");
      return;
    }
    try {
      const updated = await pvChantierApi.sign(pv.id, signPartie.trim(), signDataUrl);
      setPv(updated);
      setSignPartie("");
      setSignDataUrl("");
      setMsg("Signature ajoutée.");
    } catch (e: any) {
      setErr(e?.message ?? "Signature échouée");
    }
  };

  const handleFinalize = async () => {
    if (!pv || pv.id.startsWith("local-")) {
      setErr("Enregistrez d'abord le PV.");
      return;
    }
    if (!window.confirm("Finaliser ce PV ? Cette action est irréversible.")) return;
    try {
      const finalPv = await pvChantierApi.finalize(pv.id);
      setPv(finalPv);
      setMsg("PV finalisé. Hash : " + (finalPv.hashSha256 ?? "—"));
      navigate(`${baseRoute}/${finalPv.id}`, { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Finalisation échouée");
    }
  };

  const isFinal = pv.status === "FINAL";

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>
        {mode === "new" ? "Nouveau PV de chantier" : `PV n° ${pv.numero}`}
      </h1>
      <p style={S.sub}>
        {TYPE_VISITE_LABEL[pv.typeVisite]} · Statut : <strong>{pv.status}</strong>
      </p>

      {msg && <div style={S.msgOk}>{msg}</div>}
      {err && <div style={S.msgErr}>{err}</div>}

      {/* ───── Général */}
      <CollapsibleSection
        title="Informations générales"
        id="general"
        open={openSection}
        onOpen={setOpenSection}
      >
        <div style={S.row}>
          <Field label="Date">
            <input
              type="date"
              style={S.input}
              value={pv.date}
              disabled={isFinal}
              onChange={(e) => update({ date: e.target.value })}
            />
          </Field>
          <Field label="Type de visite">
            <select
              style={S.input}
              value={pv.typeVisite}
              disabled={isFinal}
              onChange={(e) => update({ typeVisite: e.target.value as PvTypeVisite })}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_VISITE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Météo">
            <input
              style={S.input}
              value={pv.meteo ?? ""}
              disabled={isFinal}
              onChange={(e) => update({ meteo: e.target.value })}
              placeholder="Ensoleillé, pluie…"
            />
          </Field>
          <Field label="Température (°C)">
            <input
              type="number"
              style={S.input}
              value={pv.temperatureC ?? ""}
              disabled={isFinal}
              onChange={(e) =>
                update({
                  temperatureC: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Vent">
            <input
              style={S.input}
              value={pv.vent ?? ""}
              disabled={isFinal}
              onChange={(e) => update({ vent: e.target.value })}
            />
          </Field>
          <Field label="Prochaine visite">
            <input
              type="date"
              style={S.input}
              value={pv.prochaineVisite ?? ""}
              disabled={isFinal}
              onChange={(e) => update({ prochaineVisite: e.target.value || null })}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* ───── Personnes */}
      <CollapsibleSection
        title={`Personnes présentes (${pv.presents.length})`}
        id="presents"
        open={openSection}
        onOpen={setOpenSection}
      >
        <PersonsEditor
          rows={pv.presents}
          disabled={isFinal}
          onChange={(rows) => update({ presents: rows })}
          extraField="organisme"
          extraLabel="Organisme"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Personnes absentes (${pv.absents.length})`}
        id="absents"
        open={openSection}
        onOpen={setOpenSection}
      >
        <PersonsEditor
          rows={pv.absents}
          disabled={isFinal}
          onChange={(rows) => update({ absents: rows })}
          extraField="motif"
          extraLabel="Motif"
        />
      </CollapsibleSection>

      {/* ───── Observations */}
      <CollapsibleSection
        title={`Observations (${pv.observations.length})`}
        id="observations"
        open={openSection}
        onOpen={setOpenSection}
      >
        {pv.observations.map((o) => {
          const sev = SEVERITE_COLOR[o.severite];
          return (
            <div
              key={o.id}
              style={{
                ...S.obs,
                borderLeftColor: sev.fg,
              }}
            >
              <div style={S.row}>
                <Field label="Titre">
                  <input
                    style={S.input}
                    value={o.titre}
                    disabled={isFinal}
                    onChange={(e) => patchObservation(o.id, { titre: e.target.value })}
                  />
                </Field>
                <Field label="Sévérité">
                  <select
                    style={S.input}
                    value={o.severite}
                    disabled={isFinal}
                    onChange={(e) =>
                      patchObservation(o.id, { severite: e.target.value as PvSeverite })
                    }
                  >
                    {SEVERITES.map((s) => (
                      <option key={s} value={s}>
                        {SEVERITE_COLOR[s].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Lot">
                  <input
                    style={S.input}
                    value={o.lot ?? ""}
                    disabled={isFinal}
                    onChange={(e) => patchObservation(o.id, { lot: e.target.value })}
                  />
                </Field>
                <Field label="Échéance">
                  <input
                    type="date"
                    style={S.input}
                    value={o.deadline ?? ""}
                    disabled={isFinal}
                    onChange={(e) =>
                      patchObservation(o.id, { deadline: e.target.value || null })
                    }
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  style={S.textarea}
                  value={o.description ?? ""}
                  disabled={isFinal}
                  onChange={(e) =>
                    patchObservation(o.id, { description: e.target.value })
                  }
                />
              </Field>
              <div>
                <label style={{ ...S.label, display: "block", marginBottom: 4 }}>
                  Photos {o.geoloc && (
                    <span style={{ color: "#64748b", fontWeight: 400 }}>
                      · GPS {o.geoloc.lat.toFixed(4)}, {o.geoloc.lng.toFixed(4)}
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isFinal}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhoto(o, f);
                    e.target.value = "";
                  }}
                />
                <div style={S.photoRow}>
                  {o.photoUrls.map((u, i) => (
                    <img key={i} src={u} alt={`photo-${i}`} style={S.photoThumb} />
                  ))}
                </div>
              </div>
              {!isFinal && (
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <button
                    type="button"
                    style={S.btnDanger}
                    onClick={() => removeObservation(o.id)}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!isFinal && (
          <button type="button" style={S.btnGhost} onClick={addObservation}>
            + Ajouter une observation
          </button>
        )}
      </CollapsibleSection>

      {/* ───── Signature */}
      <CollapsibleSection
        title={`Signatures (${pv.signatures.length})`}
        id="signatures"
        open={openSection}
        onOpen={setOpenSection}
      >
        {pv.signatures.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {pv.signatures.map((s, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                  textAlign: "center",
                  background: "#f8fafc",
                }}
              >
                <img
                  src={s.dataUrl}
                  alt={s.partie}
                  style={{ maxHeight: 70, maxWidth: "100%" }}
                />
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                  {s.partie}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {new Date(s.signedAt).toLocaleString("fr-MA")}
                </div>
              </div>
            ))}
          </div>
        )}
        {!isFinal && (
          <>
            <Field label="Partie signataire (nom + rôle)">
              <input
                style={S.input}
                value={signPartie}
                onChange={(e) => setSignPartie(e.target.value)}
                placeholder="Ex: Mohamed Z. — Architecte"
              />
            </Field>
            <PvChantierSignaturePad onChange={setSignDataUrl} />
            <div style={{ marginTop: 8, textAlign: "right" }}>
              <button type="button" style={S.btn} onClick={handleSign}>
                Ajouter la signature
              </button>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ───── FAB */}
      <div style={S.fab}>
        {!isFinal && (
          <>
            <button style={S.btnGhost} onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button style={S.btn} disabled={saving} onClick={handleSave}>
              {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
            {pv.signatures.length > 0 && !pv.id.startsWith("local-") && (
              <button
                style={{ ...S.btn, background: "#16a34a" }}
                onClick={handleFinalize}
              >
                Finaliser
              </button>
            )}
          </>
        )}
        {isFinal && (
          <button
            style={S.btn}
            onClick={() => navigate(`${baseRoute}/${pv.id}`)}
          >
            Voir le PV finalisé
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────── Sub-components

function CollapsibleSection({
  title,
  id,
  open,
  onOpen,
  children,
}: {
  title: string;
  id: string;
  open: string;
  onOpen: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div style={S.section}>
      <div
        style={{ ...S.sectionHead, ...(isOpen ? S.sectionHeadOpen : {}) }}
        onClick={() => onOpen(isOpen ? "" : id)}
      >
        <span>{title}</span>
        <span style={{ color: "#94a3b8" }}>{isOpen ? "−" : "+"}</span>
      </div>
      {isOpen && <div style={S.sectionBody}>{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={S.field}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function PersonsEditor({
  rows,
  onChange,
  extraField,
  extraLabel,
  disabled,
}: {
  rows: Array<{ nom: string; role: string } & Record<string, any>>;
  onChange: (rows: any[]) => void;
  extraField: "organisme" | "motif";
  extraLabel: string;
  disabled?: boolean;
}) {
  const update = (i: number, patch: any) =>
    onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, k) => k !== i));
  const add = () => onChange([...rows, { nom: "", role: "", [extraField]: "" }]);

  return (
    <>
      {rows.map((r, i) => (
        <div key={i} style={{ ...S.row, marginBottom: 8 }}>
          <input
            style={S.input}
            placeholder="Nom"
            value={r.nom}
            disabled={disabled}
            onChange={(e) => update(i, { nom: e.target.value })}
          />
          <input
            style={S.input}
            placeholder="Rôle"
            value={r.role}
            disabled={disabled}
            onChange={(e) => update(i, { role: e.target.value })}
          />
          <input
            style={S.input}
            placeholder={extraLabel}
            value={r[extraField] ?? ""}
            disabled={disabled}
            onChange={(e) => update(i, { [extraField]: e.target.value })}
          />
          {!disabled && (
            <button style={S.btnDanger} onClick={() => remove(i)}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" style={S.btnGhost} onClick={add}>
          + Ajouter
        </button>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────── Helpers

function blankPv(dossierId: string): PvChantier {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "local-" + cryptoRandomId(),
    dossierId,
    numero: "—",
    date: today,
    typeVisite: "AVANCEMENT",
    meteo: null,
    temperatureC: null,
    vent: null,
    presents: [],
    absents: [],
    observations: [],
    decisions: [],
    prochaineVisite: null,
    signatures: [],
    status: "DRAFT",
    hashSha256: null,
    pdfUrl: null,
    createdAt: today,
    updatedAt: today,
    finalizedAt: null,
  };
}

function cryptoRandomId(): string {
  try {
    const a = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf("base64,");
      resolve(idx >= 0 ? r.slice(idx + 7) : r);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeGetGeoloc(): Promise<{ lat: number; lng: number; accuracyM?: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 60_000 },
    );
  });
}
