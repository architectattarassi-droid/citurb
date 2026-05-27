/**
 * AssignSousTraitantModal — modal d'assignation sous-traitant à un lot.
 *
 * Étape 1 : sélection du lot (catalogue TPHI 1-25)
 * Étape 2 : recherche fournisseur (P6) ou saisie manuelle + agréments
 * Étape 3 : conditions financières et délai (loi 32-99 art. 6)
 *
 * Si l'API tarifs contractuels P6 renvoie une grille pour le couple
 * (supplier, prestation), elle pré-remplit automatiquement le montant HT.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AssignInput,
  LotCatalogEntry,
  sousTraitantsApi,
} from "./sous-traitants.api";
import { apiFetch } from "../../tomes/tome4/apiClient";

type Props = {
  dossierId: string;
  preselectedLotCode?: string;
  onCancel(): void;
  onAssigned(): void;
};

const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 12,
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    maxWidth: 640,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto" as const,
    padding: 20,
  },
  title: { margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 800, color: "#0f172a" },
  step: { marginBottom: 18 },
  stepTitle: { fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 6 },
  field: { display: "flex" as const, flexDirection: "column" as const, gap: 4, marginBottom: 10 },
  label: { fontSize: 12, color: "#475569", fontWeight: 600 },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
  },
  select: {
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    background: "#fff",
  },
  row: { display: "flex" as const, gap: 10, flexWrap: "wrap" as const },
  flex1: { flex: 1, minWidth: 140 },
  actions: {
    display: "flex" as const,
    gap: 8,
    justifyContent: "flex-end" as const,
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
  },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  err: { color: "#b91c1c", fontSize: 12, marginTop: 6 },
  hint: { color: "#64748b", fontSize: 11, marginTop: 4 },
  legalChk: { display: "flex" as const, gap: 6, alignItems: "center" as const, fontSize: 12, color: "#475569" },
};

type SupplierLite = { id?: string; cabinet: string; email?: string; phone?: string; classe?: string; agrements?: string[] };

export default function AssignSousTraitantModal({
  dossierId,
  preselectedLotCode,
  onCancel,
  onAssigned,
}: Props) {
  const [lots, setLots] = useState<LotCatalogEntry[]>([]);
  const [lotCode, setLotCode] = useState<string>(preselectedLotCode ?? "");
  const [supplier, setSupplier] = useState<SupplierLite>({ cabinet: "" });
  const [agrementsRaw, setAgrementsRaw] = useState<string>("");
  const [montantHt, setMontantHt] = useState<number>(0);
  const [tva, setTva] = useState<number>(20);
  const [delaiJours, setDelaiJours] = useState<number>(60);
  const [garantie, setGarantie] = useState<string>("Décennale + Parfait achèvement 12 mois");
  const [penaliteJours, setPenaliteJours] = useState<number>(1);
  const [retenueGarantie, setRetenueGarantie] = useState<number>(5);
  const [declared, setDeclared] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [tarifFound, setTarifFound] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sousTraitantsApi
      .catalogLots()
      .then((r) => setLots(r.lots))
      .catch(() => setLots([]));
  }, []);

  const lot = useMemo(() => lots.find((l) => l.code === lotCode), [lots, lotCode]);

  // Recherche tarif contractuel P6 pour préremplir le montant
  useEffect(() => {
    if (!lotCode || !supplier.cabinet) return;
    let cancelled = false;
    setSearching(true);
    apiFetch<{ ok: true; results: Array<{ prixUnitaireMAD?: number; prestataireId?: string }> }>(
      `/api/prestataire-tarifs/search?prestation=${encodeURIComponent(lot?.intitule ?? "")}`,
    )
      .then((r) => {
        if (cancelled) return;
        const top = r?.results?.[0];
        if (top?.prixUnitaireMAD) {
          setTarifFound(`Tarif contractuel détecté : ${top.prixUnitaireMAD} MAD / unité`);
        } else {
          setTarifFound(null);
        }
      })
      .catch(() => setTarifFound(null))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [lotCode, supplier.cabinet, lot?.intitule]);

  async function submit() {
    setErr(null);
    if (!lotCode) return setErr("Sélectionnez un lot");
    if (!supplier.cabinet) return setErr("Saisissez le cabinet sous-traitant");
    if (!montantHt || montantHt <= 0) return setErr("Montant HT > 0 requis");
    if (!delaiJours || delaiJours <= 0) return setErr("Délai > 0 requis");

    const agrements = agrementsRaw
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (lot?.agrementRequis && !agrements.length) {
      const ok = window.confirm(
        `Le lot ${lot.intitule} requiert un agrément qualifié.\nContinuer sans agrément déclaré ?`,
      );
      if (!ok) return;
    }

    const body: AssignInput = {
      lotCode,
      supplierUserId: supplier.id ?? null,
      supplierCabinet: supplier.cabinet,
      supplierEmail: supplier.email ?? null,
      supplierPhone: supplier.phone ?? null,
      supplierClasse: supplier.classe ?? null,
      supplierAgrements: agrements,
      montantHt,
      tva,
      conditions: { delaiJours, garantie, penaliteJours, retenueGarantie },
      loi32_99_declared: declared,
    };

    setSaving(true);
    try {
      await sousTraitantsApi.assign(dossierId, body);
      onAssigned();
    } catch (e: any) {
      setErr(e?.message || "Erreur d'assignation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.title}>Assigner un sous-traitant</h2>

        <div style={S.step}>
          <div style={S.stepTitle}>1 · Lot TPHI</div>
          <div style={S.field}>
            <label style={S.label}>Lot</label>
            <select style={S.select} value={lotCode} onChange={(e) => setLotCode(e.target.value)}>
              <option value="">— Choisir un lot —</option>
              {lots.map((l) => (
                <option key={l.code} value={l.code}>
                  Lot {String(l.numero).padStart(2, "0")} · {l.intitule}
                  {l.agrementRequis ? " (agrément requis)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.step}>
          <div style={S.stepTitle}>2 · Sous-traitant</div>
          <div style={S.row}>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Cabinet / Entreprise *</label>
              <input
                style={S.input}
                value={supplier.cabinet}
                onChange={(e) => setSupplier({ ...supplier, cabinet: e.target.value })}
                placeholder="Ex: BTP Soltani SARL"
              />
            </div>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Classe BTP</label>
              <input
                style={S.input}
                value={supplier.classe ?? ""}
                onChange={(e) => setSupplier({ ...supplier, classe: e.target.value })}
                placeholder="Ex: Classe 3 BTP-A"
              />
            </div>
          </div>
          <div style={S.row}>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Email</label>
              <input
                style={S.input}
                type="email"
                value={supplier.email ?? ""}
                onChange={(e) => setSupplier({ ...supplier, email: e.target.value })}
              />
            </div>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Téléphone</label>
              <input
                style={S.input}
                value={supplier.phone ?? ""}
                onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })}
                placeholder="+212 …"
              />
            </div>
          </div>
          <div style={S.field}>
            <label style={S.label}>
              Agréments (séparés par virgule)
              {lot?.agrementRequis ? " — requis pour ce lot" : ""}
            </label>
            <input
              style={S.input}
              value={agrementsRaw}
              onChange={(e) => setAgrementsRaw(e.target.value)}
              placeholder="Ex: A.GR.3, AGR-ELEC-CF, …"
            />
          </div>
          {searching ? <div style={S.hint}>Recherche tarif contractuel P6…</div> : null}
          {tarifFound ? <div style={S.hint}>{tarifFound}</div> : null}
        </div>

        <div style={S.step}>
          <div style={S.stepTitle}>3 · Conditions financières & délai</div>
          <div style={S.row}>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Montant HT (MAD) *</label>
              <input
                style={S.input}
                type="number"
                min={0}
                value={montantHt}
                onChange={(e) => setMontantHt(Number(e.target.value) || 0)}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>TVA %</label>
              <input
                style={{ ...S.input, width: 80 }}
                type="number"
                min={0}
                max={30}
                value={tva}
                onChange={(e) => setTva(Number(e.target.value) || 0)}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Délai (jours) *</label>
              <input
                style={{ ...S.input, width: 100 }}
                type="number"
                min={1}
                value={delaiJours}
                onChange={(e) => setDelaiJours(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div style={S.row}>
            <div style={{ ...S.field, ...S.flex1 }}>
              <label style={S.label}>Garantie</label>
              <input
                style={S.input}
                value={garantie}
                onChange={(e) => setGarantie(e.target.value)}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Pénalités ‰/jour</label>
              <input
                style={{ ...S.input, width: 80 }}
                type="number"
                min={0}
                value={penaliteJours}
                onChange={(e) => setPenaliteJours(Number(e.target.value) || 0)}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Retenue garantie %</label>
              <input
                style={{ ...S.input, width: 100 }}
                type="number"
                min={0}
                max={20}
                value={retenueGarantie}
                onChange={(e) => setRetenueGarantie(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <label style={{ ...S.legalChk, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
            />
            <span>Sous-traitance déclarée au maître d'ouvrage (loi 32-99 art. 4)</span>
          </label>
        </div>

        {err ? <div style={S.err}>{err}</div> : null}

        <div style={S.actions}>
          <button style={S.btnGhost} onClick={onCancel} disabled={saving}>
            Annuler
          </button>
          <button style={S.btn} onClick={submit} disabled={saving}>
            {saving ? "Assignation…" : "Assigner"}
          </button>
        </div>
      </div>
    </div>
  );
}
