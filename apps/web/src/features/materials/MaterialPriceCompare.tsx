import React, { useMemo, useState } from "react";
import { useT } from "../../i18n/i18n";
import {
  fmtMad,
  fmtUnit,
  postObservation,
  type MaterialWithPrice,
} from "./materials.api";

/**
 * MaterialPriceCompare — comparateur live (sans bouton submit pour le verdict).
 * Recalcule à chaque keystroke : verdict "pill" gros coloré + suggestion contextuelle.
 * Bouton dédié uniquement pour ENVOYER l'observation au serveur.
 */
export default function MaterialPriceCompare({
  material,
  region,
}: {
  material: MaterialWithPrice;
  region: string;
}) {
  const t = useT();
  const [observedPrice, setObservedPrice] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [sent, setSent] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const price = material.currentPrice;

  const parsed = useMemo(() => Number(observedPrice.replace(",", ".")), [observedPrice]);
  const valid = !Number.isNaN(parsed) && parsed > 0;

  // Verdict live : sous-évalué / marché / sur-évalué.
  const verdict = useMemo(() => {
    if (!price || !valid) return null;
    if (parsed < price.prixMin) {
      const deltaPct = ((price.prixMoyen - parsed) / price.prixMoyen) * 100;
      return {
        key: "under" as const,
        emoji: "🟢",
        label: t("mat.compare.verdict.under"),
        advice: t("mat.compare.advice.under"),
        delta: `−${deltaPct.toFixed(1)}%`,
        bg: "#dcfce7",
        color: "#15803d",
        ring: "#22c55e",
      };
    }
    if (parsed > price.prixMax) {
      const deltaPct = ((parsed - price.prixMoyen) / price.prixMoyen) * 100;
      return {
        key: "over" as const,
        emoji: "🔴",
        label: t("mat.compare.verdict.over"),
        advice: t("mat.compare.advice.over"),
        delta: `+${deltaPct.toFixed(1)}%`,
        bg: "#fee2e2",
        color: "#b91c1c",
        ring: "#ef4444",
      };
    }
    const deltaPct = ((parsed - price.prixMoyen) / price.prixMoyen) * 100;
    return {
      key: "market" as const,
      emoji: "🟡",
      label: t("mat.compare.verdict.market"),
      advice: t("mat.compare.advice.market"),
      delta: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
      bg: "#fef9c3",
      color: "#854d0e",
      ring: "#eab308",
    };
  }, [parsed, valid, price, t]);

  if (!price) return null;

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'envoi";
      setError(msg);
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
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
        {t("mat.compare.title")}
      </h3>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#6b7280" }}>
        {t("mat.compare.your_price")} ({material.unit})
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
            padding: "12px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
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

      {/* Verdict pill GROS */}
      {verdict && (
        <div
          role="status"
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            background: verdict.bg,
            border: `2px solid ${verdict.ring}`,
            borderRadius: 16,
            boxShadow: `0 2px 8px ${verdict.ring}33`,
          }}
        >
          <div style={{ fontSize: 28 }} aria-hidden>{verdict.emoji}</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: verdict.color,
                letterSpacing: 0.2,
              }}
            >
              {verdict.label}
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "2px 8px",
                  background: "#fff",
                  borderRadius: 999,
                  color: verdict.color,
                }}
              >
                {verdict.delta}
              </span>
            </div>
            <div style={{ fontSize: 12, color: verdict.color, marginTop: 4, lineHeight: 1.4 }}>
              {verdict.advice}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {t("mat.price.min")} {fmtMad(price.prixMin)} ·{" "}
              {t("mat.price.avg")} {fmtMad(price.prixMoyen)} ·{" "}
              {t("mat.price.max")} {fmtMad(price.prixMax)} {fmtUnit(material.unit)}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={send}
          disabled={!valid || sending || sent}
          style={{
            padding: "10px 18px",
            background: !valid || sending || sent ? "#9ca3af" : "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: !valid || sending || sent ? "not-allowed" : "pointer",
          }}
        >
          {sent
            ? t("common.success")
            : sending
            ? t("common.loading")
            : t("mat.compare.send_observation")}
        </button>
        {error && (
          <span style={{ color: "#dc2626", fontSize: 12 }}>{error}</span>
        )}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>
        Vos observations anonymes alimentent l'indice CITURBAREA.
      </p>
    </div>
  );
}
