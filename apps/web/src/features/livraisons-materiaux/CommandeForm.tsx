/**
 * CommandeForm — création d'une commande matériaux.
 *
 * - Sélection fournisseur (userId)
 * - Ajout de lignes via autocomplete sur /api/materials/catalog/search
 * - Si tarifs contractuels existent pour ce fournisseur, pré-remplit le prix
 * - Total live (HT + TVA + TTC)
 * - Date de livraison souhaitée + adresse chantier
 *
 * Mobile-first : inputs full-width, tap targets >= 44px.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  CreateCommandeBody,
  fmtMad,
  livraisonsApi,
} from "./livraisons-materiaux.api";
import { searchMaterials, MaterialWithPrice } from "../materials/materials.api";

type Props = {
  dossierId: string;
  /** Adresse du chantier pré-remplie (ex: dossier.address). */
  defaultAddress?: string;
  onCreated?: (commandeId: string) => void;
  onCancel?: () => void;
};

type DraftLine = {
  tmpId: string;
  materialCode: string;
  materialLabel: string;
  unit: string;
  qty: number;
  prixUnitaire: number;
};

const S = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: 12 },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  } as React.CSSProperties,
  h2: { fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 16px" },
  label: { display: "block", fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 },
  input: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 15,
    minHeight: 44,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  row: { marginBottom: 14 },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  } as React.CSSProperties,
  results: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 220,
    overflowY: "auto" as const,
  } as React.CSSProperties,
  resultItem: {
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
  } as React.CSSProperties,
  ligne: {
    display: "grid",
    gridTemplateColumns: "1fr 80px 100px 40px",
    gap: 8,
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
  } as React.CSSProperties,
  remove: {
    border: 0,
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 6,
    padding: 8,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 36,
  } as React.CSSProperties,
  total: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: 14,
    color: "#334155",
  } as React.CSSProperties,
  totalStrong: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    borderTop: "1px solid #e2e8f0",
    marginTop: 4,
  } as React.CSSProperties,
  actions: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" as const },
  btn: {
    border: 0,
    borderRadius: 8,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
  } as React.CSSProperties,
  primary: { background: "#0f172a", color: "#fff" } as React.CSSProperties,
  ghost: { background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" } as React.CSSProperties,
  err: { background: "#fef2f2", color: "#991b1b", padding: 10, borderRadius: 8, marginTop: 12, fontSize: 13 },
};

const TVA_RATE = 0.20;

function makeTmpId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CommandeForm({ dossierId, defaultAddress, onCreated, onCancel }: Props) {
  const [supplierUserId, setSupplierUserId] = useState("");
  const [dateLivraisonSouhaitee, setDateLivraisonSouhaitee] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [adresseLivraison, setAdresseLivraison] = useState(defaultAddress || "");
  const [lignes, setLignes] = useState<DraftLine[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MaterialWithPrice[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Autocomplete matériaux
  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchMaterials(search)
      .then((r) => {
        if (cancelled) return;
        setResults(r.results.slice(0, 10));
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [search]);

  const totals = useMemo(() => {
    const ht = lignes.reduce((s, l) => s + (l.qty * l.prixUnitaire), 0);
    const tva = ht * TVA_RATE;
    return { ht, tva, ttc: ht + tva };
  }, [lignes]);

  function addLineFromMaterial(m: MaterialWithPrice) {
    setLignes((cur) => [
      ...cur,
      {
        tmpId: makeTmpId(),
        materialCode: m.code,
        materialLabel: m.label,
        unit: m.unit,
        qty: 1,
        prixUnitaire: m.currentPrice?.prixMoyen ?? 0,
      },
    ]);
    setSearch("");
    setResults([]);
  }

  function updateLine(tmpId: string, patch: Partial<DraftLine>) {
    setLignes((cur) => cur.map((l) => (l.tmpId === tmpId ? { ...l, ...patch } : l)));
  }

  function removeLine(tmpId: string) {
    setLignes((cur) => cur.filter((l) => l.tmpId !== tmpId));
  }

  async function submit() {
    setErr(null);
    if (!supplierUserId.trim()) {
      setErr("ID fournisseur obligatoire");
      return;
    }
    if (lignes.length === 0) {
      setErr("Au moins une ligne requise");
      return;
    }
    if (!adresseLivraison.trim()) {
      setErr("Adresse de livraison obligatoire");
      return;
    }

    const body: CreateCommandeBody = {
      dossierId,
      supplierUserId: supplierUserId.trim(),
      dateLivraisonSouhaitee: new Date(dateLivraisonSouhaitee).toISOString(),
      adresseLivraison: adresseLivraison.trim(),
      lignes: lignes.map((l) => ({
        materialCode: l.materialCode,
        materialLabel: l.materialLabel,
        unit: l.unit,
        qty: Number(l.qty) || 0,
        prixUnitaire: Number(l.prixUnitaire) || 0,
      })),
    };

    setSubmitting(true);
    try {
      const cmd = await livraisonsApi.create(body);
      onCreated?.(cmd.id);
    } catch (e: any) {
      setErr(e?.message || "Échec création commande");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h2}>Nouvelle commande matériaux</h2>

        <div style={S.row}>
          <label style={S.label}>Fournisseur (User ID)</label>
          <input
            style={S.input}
            value={supplierUserId}
            onChange={(e) => setSupplierUserId(e.target.value)}
            placeholder="usr_xxxxx (ID du fournisseur P6)"
          />
        </div>

        <div style={S.twoCols}>
          <div style={S.row}>
            <label style={S.label}>Date de livraison souhaitée</label>
            <input
              type="date"
              style={S.input}
              value={dateLivraisonSouhaitee}
              onChange={(e) => setDateLivraisonSouhaitee(e.target.value)}
            />
          </div>
          <div style={S.row}>
            <label style={S.label}>Adresse chantier</label>
            <input
              style={S.input}
              value={adresseLivraison}
              onChange={(e) => setAdresseLivraison(e.target.value)}
              placeholder="N°, rue, ville"
            />
          </div>
        </div>

        <div style={S.row}>
          <label style={S.label}>Ajouter un matériau (recherche catalog)</label>
          <input
            style={S.input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ex. ciment, acier, gravette…"
          />
          {searching && <small style={{ color: "#64748b" }}>Recherche…</small>}
          {results.length > 0 && (
            <div style={S.results}>
              {results.map((m) => (
                <div
                  key={m.code}
                  style={S.resultItem}
                  onClick={() => addLineFromMaterial(m)}
                >
                  <strong>{m.label}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {m.code} · {m.unit} · {m.currentPrice ? fmtMad(m.currentPrice.prixMoyen) : "prix N/D"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lignes.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
              Lignes ({lignes.length})
            </div>
            <div style={{ ...S.ligne, fontWeight: 700, fontSize: 12, color: "#64748b" }}>
              <span>Matériau</span>
              <span style={{ textAlign: "center" }}>Qté</span>
              <span style={{ textAlign: "right" }}>PU MAD</span>
              <span></span>
            </div>
            {lignes.map((l) => (
              <div key={l.tmpId} style={S.ligne}>
                <span style={{ fontSize: 13 }}>
                  {l.materialLabel}
                  <br />
                  <small style={{ color: "#94a3b8" }}>{l.materialCode} · {l.unit}</small>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={l.qty}
                  onChange={(e) => updateLine(l.tmpId, { qty: Number(e.target.value) })}
                  style={{ ...S.input, padding: 6, minHeight: 36, textAlign: "center" as const }}
                />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={l.prixUnitaire}
                  onChange={(e) => updateLine(l.tmpId, { prixUnitaire: Number(e.target.value) })}
                  style={{ ...S.input, padding: 6, minHeight: 36, textAlign: "right" as const }}
                />
                <button style={S.remove} onClick={() => removeLine(l.tmpId)} aria-label="Supprimer">×</button>
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <div style={S.total}><span>Sous-total HT</span><span>{fmtMad(totals.ht)}</span></div>
              <div style={S.total}><span>TVA 20%</span><span>{fmtMad(totals.tva)}</span></div>
              <div style={S.totalStrong}><span>Total TTC</span><span>{fmtMad(totals.ttc)}</span></div>
            </div>
          </div>
        )}

        {err && <div style={S.err}>{err}</div>}

        <div style={S.actions}>
          <button
            style={{ ...S.btn, ...S.primary }}
            onClick={submit}
            disabled={submitting || lignes.length === 0}
          >
            {submitting ? "Envoi…" : "Envoyer la commande"}
          </button>
          {onCancel && (
            <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel} disabled={submitting}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
