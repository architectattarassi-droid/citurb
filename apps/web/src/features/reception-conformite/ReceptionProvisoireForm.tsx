/**
 * ReceptionProvisoireForm — wizard plein écran mobile-first.
 *
 * Sections :
 *  1. Identité / date / présents
 *  2. Checklist conformité PC vs réalité
 *  3. Photos par pièce (caméra arrière)
 *  4. Réserves (sévérité + photo + responsable + deadline)
 *  5. Signatures multi-parties (MOA, architecte, entrepreneur)
 *  → bouton "Générer PV provisoire" (finalize → PDF + hash)
 */

import React, { useEffect, useState } from "react";
import ReceptionSignaturePad from "./ReceptionSignaturePad";
import {
  ReceptionPhoto,
  ReceptionPresent,
  ReceptionProvisoire,
  Reserve,
  fileToBase64,
  receptionApi,
} from "./reception-conformite.api";

type Props = {
  dossierId: string;
  initial?: ReceptionProvisoire | null;
  onFinalized?: (pv: ReceptionProvisoire) => void;
};

const S = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: 14, paddingBottom: 110 },
  h2: { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "20px 0 8px" },
  section: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  } as React.CSSProperties,
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } as React.CSSProperties,
  field: { display: "flex", flexDirection: "column" as const, gap: 4 } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "#475569" } as React.CSSProperties,
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
    minHeight: 70,
    resize: "vertical" as const,
  } as React.CSSProperties,
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  btnDanger: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  fab: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    zIndex: 50,
  } as React.CSSProperties,
};

export default function ReceptionProvisoireForm({ dossierId, initial, onFinalized }: Props) {
  const [dateReception, setDateReception] = useState(
    initial?.dateReception ?? new Date().toISOString().slice(0, 10),
  );
  const [ouvrageDescription, setOuvrageDescription] = useState(initial?.ouvrageDescription ?? "");
  const [montant, setMontant] = useState<string>(
    initial?.montantTravauxMAD != null ? String(initial.montantTravauxMAD) : "",
  );
  const [presents, setPresents] = useState<ReceptionPresent[]>(
    initial?.presents ?? [
      { nom: "", role: "MOA", organisme: null },
      { nom: "", role: "ARCHITECTE", organisme: null },
      { nom: "", role: "ENTREPRENEUR", organisme: null },
    ],
  );
  const [checklist, setChecklist] = useState(
    initial?.checklist ?? [
      { id: "c1", libelle: "Implantation conforme au PC autorisé", conforme: true },
      { id: "c2", libelle: "Surface SHOB / SHON conforme", conforme: true },
      { id: "c3", libelle: "Hauteur sous plafond conforme", conforme: true },
      { id: "c4", libelle: "Façades conformes (matériaux + couleur)", conforme: true },
      { id: "c5", libelle: "Stationnement réalisé conformément", conforme: true },
      { id: "c6", libelle: "Espaces verts conformes", conforme: true },
      { id: "c7", libelle: "Accessibilité PMR conforme", conforme: true },
    ],
  );
  const [reserves, setReserves] = useState<Array<Partial<Reserve> & { id: string }>>(
    initial?.reserves ?? [],
  );
  const [photos, setPhotos] = useState<ReceptionPhoto[]>(initial?.photos ?? []);
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [signatures, setSignatures] = useState<{ partie: string; dataUrl: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pvSaved, setPvSaved] = useState<ReceptionProvisoire | null>(initial ?? null);

  useEffect(() => {
    if (initial) setPvSaved(initial);
  }, [initial]);

  const save = async (): Promise<ReceptionProvisoire | null> => {
    setBusy(true);
    setError(null);
    try {
      const pv = await receptionApi.upsertProvisoire(dossierId, {
        dateReception,
        ouvrageDescription: ouvrageDescription || null,
        montantTravauxMAD: montant ? Number(montant) : null,
        presents: presents.filter((p) => p.nom.trim()),
        checklist,
        reserves: reserves.map((r) => ({
          id: r.id,
          description: r.description ?? "",
          severite: r.severite ?? "MINEURE",
          piece: r.piece ?? null,
          photoUrls: r.photoUrls ?? [],
          responsableLevee: r.responsableLevee ?? null,
          deadline: r.deadline ?? null,
        })) as any,
        observations: observations || null,
        photos,
      });
      setPvSaved(pv);
      return pv;
    } catch (e: any) {
      setError(e?.message ?? "Erreur enregistrement");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async () => {
    if (signatures.length === 0) {
      setError("Au moins une signature requise");
      return;
    }
    const pv = await save();
    if (!pv) return;
    setBusy(true);
    setError(null);
    try {
      for (const s of signatures) {
        await receptionApi.signProvisoire(dossierId, s.partie, s.dataUrl);
      }
      const finalPv = await receptionApi.finalizeProvisoire(dossierId);
      setPvSaved(finalPv);
      onFinalized?.(finalPv);
    } catch (e: any) {
      setError(e?.message ?? "Erreur finalisation");
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File, bucket: string): Promise<string | null> => {
    try {
      const { base64, mime } = await fileToBase64(file);
      const res = await receptionApi.uploadPhoto(dossierId, {
        contentBase64: base64,
        mimeType: mime,
        filenameHint: file.name,
        bucket,
      });
      return res.url;
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
      return null;
    }
  };

  const addReserve = () =>
    setReserves((arr) => [
      ...arr,
      {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        description: "",
        severite: "MINEURE",
        photoUrls: [],
      },
    ]);

  const finalDisabled = pvSaved?.status === "FINAL" || busy;

  return (
    <div style={S.wrap}>
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* 1. Identité */}
      <section style={S.section}>
        <h2 style={S.h2}>1. Identité de la réception</h2>
        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Date de réception provisoire</label>
            <input
              type="date"
              value={dateReception}
              onChange={(e) => setDateReception(e.target.value)}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Montant des travaux (MAD)</label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
              inputMode="numeric"
            />
          </div>
        </div>
        <div style={{ ...S.field, marginTop: 10 }}>
          <label style={S.label}>Description de l'ouvrage</label>
          <textarea
            value={ouvrageDescription}
            onChange={(e) => setOuvrageDescription(e.target.value)}
            style={S.textarea}
            disabled={pvSaved?.status === "FINAL"}
          />
        </div>

        <h2 style={{ ...S.h2, marginTop: 16 }}>Personnes présentes</h2>
        {presents.map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
            <input
              placeholder="Nom"
              value={p.nom}
              onChange={(e) => {
                const next = [...presents];
                next[i] = { ...next[i], nom: e.target.value };
                setPresents(next);
              }}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
            />
            <select
              value={p.role}
              onChange={(e) => {
                const next = [...presents];
                next[i] = { ...next[i], role: e.target.value };
                setPresents(next);
              }}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
            >
              <option value="MOA">MOA</option>
              <option value="ARCHITECTE">Architecte</option>
              <option value="ENTREPRENEUR">Entrepreneur</option>
              <option value="BET">BET</option>
              <option value="MOD">MOD</option>
              <option value="AUTRE">Autre</option>
            </select>
            <input
              placeholder="Organisme"
              value={p.organisme ?? ""}
              onChange={(e) => {
                const next = [...presents];
                next[i] = { ...next[i], organisme: e.target.value || null };
                setPresents(next);
              }}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
            />
            {pvSaved?.status !== "FINAL" && (
              <button
                type="button"
                style={S.btnDanger}
                onClick={() => setPresents(presents.filter((_, j) => j !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {pvSaved?.status !== "FINAL" && (
          <button
            type="button"
            onClick={() =>
              setPresents([...presents, { nom: "", role: "AUTRE", organisme: null }])
            }
            style={S.btnGhost}
          >
            + Ajouter
          </button>
        )}
      </section>

      {/* 2. Checklist */}
      <section style={S.section}>
        <h2 style={S.h2}>2. Checklist conformité PC / réalité</h2>
        {checklist.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 6,
              alignItems: "center",
              padding: "6px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <input
              value={c.libelle}
              onChange={(e) => {
                const next = [...checklist];
                next[i] = { ...next[i], libelle: e.target.value };
                setChecklist(next);
              }}
              style={S.input}
              disabled={pvSaved?.status === "FINAL"}
            />
            <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={c.conforme}
                onChange={(e) => {
                  const next = [...checklist];
                  next[i] = { ...next[i], conforme: e.target.checked };
                  setChecklist(next);
                }}
                disabled={pvSaved?.status === "FINAL"}
              />
              Conforme
            </label>
            {pvSaved?.status !== "FINAL" && (
              <button
                type="button"
                style={S.btnDanger}
                onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {pvSaved?.status !== "FINAL" && (
          <button
            type="button"
            style={{ ...S.btnGhost, marginTop: 8 }}
            onClick={() =>
              setChecklist([
                ...checklist,
                { id: `c_${Date.now()}`, libelle: "Nouveau point", conforme: true },
              ])
            }
          >
            + Ajouter un point
          </button>
        )}
      </section>

      {/* 3. Photos par pièce */}
      <section style={S.section}>
        <h2 style={S.h2}>3. Photos par pièce</h2>
        {pvSaved?.status !== "FINAL" && (
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadPhoto(file, "provisoire");
              if (url) setPhotos([...photos, { url, piece: "", legende: "" }]);
              e.target.value = "";
            }}
            style={{ marginBottom: 10 }}
          />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 6 }}>
              <img
                src={p.url}
                alt={p.piece ?? ""}
                style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4 }}
              />
              <input
                placeholder="Pièce"
                value={p.piece ?? ""}
                onChange={(e) => {
                  const next = [...photos];
                  next[i] = { ...next[i], piece: e.target.value };
                  setPhotos(next);
                }}
                style={{ ...S.input, fontSize: 11, padding: "4px 6px", marginTop: 4 }}
                disabled={pvSaved?.status === "FINAL"}
              />
              {pvSaved?.status !== "FINAL" && (
                <button
                  type="button"
                  style={{ ...S.btnDanger, marginTop: 4, width: "100%" }}
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                >
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Réserves */}
      <section style={S.section}>
        <h2 style={S.h2}>4. Réserves ({reserves.length})</h2>
        {reserves.map((r, i) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${r.severite === "BLOQUANTE" ? "#dc2626" : r.severite === "MAJEURE" ? "#f97316" : "#facc15"}`,
              borderRadius: 6,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={S.row}>
              <select
                value={r.severite}
                onChange={(e) => {
                  const next = [...reserves];
                  next[i] = { ...next[i], severite: e.target.value as Reserve["severite"] };
                  setReserves(next);
                }}
                style={S.input}
                disabled={pvSaved?.status === "FINAL"}
              >
                <option value="MINEURE">Mineure</option>
                <option value="MAJEURE">Majeure</option>
                <option value="BLOQUANTE">Bloquante</option>
              </select>
              <input
                placeholder="Pièce / localisation"
                value={r.piece ?? ""}
                onChange={(e) => {
                  const next = [...reserves];
                  next[i] = { ...next[i], piece: e.target.value };
                  setReserves(next);
                }}
                style={S.input}
                disabled={pvSaved?.status === "FINAL"}
              />
            </div>
            <textarea
              placeholder="Description de la réserve"
              value={r.description ?? ""}
              onChange={(e) => {
                const next = [...reserves];
                next[i] = { ...next[i], description: e.target.value };
                setReserves(next);
              }}
              style={{ ...S.textarea, marginTop: 6 }}
              disabled={pvSaved?.status === "FINAL"}
            />
            <div style={{ ...S.row, marginTop: 6 }}>
              <input
                placeholder="Responsable levée"
                value={r.responsableLevee ?? ""}
                onChange={(e) => {
                  const next = [...reserves];
                  next[i] = { ...next[i], responsableLevee: e.target.value };
                  setReserves(next);
                }}
                style={S.input}
                disabled={pvSaved?.status === "FINAL"}
              />
              <input
                type="date"
                value={r.deadline ?? ""}
                onChange={(e) => {
                  const next = [...reserves];
                  next[i] = { ...next[i], deadline: e.target.value };
                  setReserves(next);
                }}
                style={S.input}
                disabled={pvSaved?.status === "FINAL"}
              />
            </div>
            {pvSaved?.status !== "FINAL" && (
              <div style={{ marginTop: 6 }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadPhoto(file, `provisoire/reserves`);
                    if (url) {
                      const next = [...reserves];
                      next[i] = {
                        ...next[i],
                        photoUrls: [...(next[i].photoUrls ?? []), url],
                      };
                      setReserves(next);
                    }
                    e.target.value = "";
                  }}
                />
              </div>
            )}
            {(r.photoUrls ?? []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {(r.photoUrls ?? []).map((u, k) => (
                  <img key={k} src={u} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                ))}
              </div>
            )}
            {pvSaved?.status !== "FINAL" && (
              <button
                type="button"
                style={{ ...S.btnDanger, marginTop: 6 }}
                onClick={() => setReserves(reserves.filter((_, j) => j !== i))}
              >
                Supprimer la réserve
              </button>
            )}
          </div>
        ))}
        {pvSaved?.status !== "FINAL" && (
          <button type="button" style={S.btnGhost} onClick={addReserve}>
            + Ajouter une réserve
          </button>
        )}
        <div style={{ ...S.field, marginTop: 10 }}>
          <label style={S.label}>Observations générales</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            style={S.textarea}
            disabled={pvSaved?.status === "FINAL"}
          />
        </div>
      </section>

      {/* 5. Signatures */}
      {pvSaved?.status !== "FINAL" && (
        <section style={S.section}>
          <h2 style={S.h2}>5. Signatures multi-parties</h2>
          {["MOA", "ARCHITECTE", "ENTREPRENEUR"].map((partie) => {
            const existing = signatures.find((s) => s.partie === partie);
            return (
              <div key={partie} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
                  {partie}
                </div>
                <ReceptionSignaturePad
                  onChange={(dataUrl) => {
                    if (!dataUrl) {
                      setSignatures(signatures.filter((s) => s.partie !== partie));
                    } else if (existing) {
                      setSignatures(
                        signatures.map((s) =>
                          s.partie === partie ? { partie, dataUrl } : s,
                        ),
                      );
                    } else {
                      setSignatures([...signatures, { partie, dataUrl }]);
                    }
                  }}
                />
              </div>
            );
          })}
        </section>
      )}

      {/* FAB */}
      <div style={S.fab}>
        {pvSaved?.status === "FINAL" ? (
          <a
            href={receptionApi.pdfProvisoireUrl(dossierId)}
            target="_blank"
            rel="noopener"
            style={{ ...S.btn, textDecoration: "none" }}
          >
            Voir PV PDF
          </a>
        ) : (
          <>
            <button type="button" onClick={save} disabled={busy} style={S.btnGhost}>
              {busy ? "…" : "Sauvegarder"}
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalDisabled || signatures.length === 0}
              style={S.btn}
            >
              {busy ? "…" : "Générer PV provisoire"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
