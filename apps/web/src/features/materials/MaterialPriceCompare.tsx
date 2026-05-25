import React, { useState } from "react";
import {
  fmtMad,
  fmtUnit,
  postObservation,
  type MaterialWithPrice,
} from "./materials.api";

/**
 * MaterialPriceCompare — composant comparateur.
 * L'utilisateur saisit un prix observé (devis fournisseur) et voit
 * immédiatement le diagnostic vs marché (très bas / dans la fourchette / élevé).
 * Bouton "Envoyer l'observation" : enregistre l'observation (alimente future moyenne).
 */
export default function MaterialPriceCompare({
  material,
  region,
}: {
  material: MaterialWithPrice;
  region: string;
}) {
  const [observedPrice, setObservedPrice] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [sent, setSent] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const price = material.currentPrice;
  if (!price) return null;

  const parsed = Number(observedPrice.replace(",", "."));
  const valid = !Number.isNaN(parsed) && parsed > 0;

  let diagnostic: { label: string; color: string; bg: string } | null = null;
  if (valid) {
    if (parsed < price.prixMin) {
      diagnostic = {
        label: `Très bas — ${(((price.prixMoyen - parsed) / price.prixMoyen) * 100).toFixed(1)}% sous le marché. Vérifiez la qualité/conformité.`,
        color: "#9a3412",
        bg: "#fff7ed",
      };
    } else if (parsed > price.prixMax) {
      diagnostic = {
        label: `Élevé — ${(((parsed - price.prixMoyen) / price.prixMoyen) * 100).toFixed(1)}% au-dessus du marché. Négociation conseillée.`,
        color: "#991b1b",
        bg: "#fef2f2",
      };
    } else {
      diagnostic = {
        label: `Dans la fourchette de marché (${fmtMad(price.prixMin)} – ${fmtMad(price.prixMax)} ${fmtUnit(material.unit)})`,
        color: "#166534",
        bg: "#f0fdf4",
      };
    }
  }

  async function send() {
    if (!valid) return;
    setSending(true);
    setError(null);
    try {
      await postObservation(material.code, {
        region,
        observedPrice: parsed,
        unit: material.unit,
        note: note || undefined,
      });
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Comparer un prix de devis</h3>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#6b7280" }}>
        Saisissez le prix unitaire HT que vous avez reçu ({material.unit}) — nous le comparons à
        la fourchette de marché.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
        <input
          type="number"
          inputMode="decimal"
          placeholder={`Prix observé (${fmtUnit(material.unit).replace("/ ", "")})`}
          value={observedPrice}
          onChange={(e) => setObservedPrice(e.target.value)}
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
          }}
        />
        <input
          type="text"
          placeholder="Note (optionnel: ex. 'vu chez X à Casablanca')"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            flex: "2 1 240px",
            minWidth: 0,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>

      {diagnostic && (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: 12,
            background: diagnostic.bg,
            color: diagnostic.color,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {diagnostic.label}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={send}
          disabled={!valid || sending || sent}
          style={{
            padding: "9px 16px",
            background: !valid || sending || sent ? "#9ca3af" : "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: !valid || sending || sent ? "not-allowed" : "pointer",
          }}
        >
          {sent ? "Observation envoyée" : sending ? "Envoi…" : "Envoyer l'observation"}
        </button>
        {error && <span style={{ color: "#dc2626", fontSize: 12, alignSelf: "center" }}>{error}</span>}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>
        Vos observations anonymes alimentent l'indice CITURBAREA et améliorent les moyennes mensuelles.
      </p>
    </div>
  );
}
