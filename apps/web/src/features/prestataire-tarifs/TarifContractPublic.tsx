import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ComparatorResult,
  TarifContractuel,
  comparePrice,
  formatMAD,
  getTarif,
  statusLabel,
  uniteLabel,
} from "./prestataire-tarifs.api";

/**
 * Contrat public — vue client.
 * - Page lisible avec engagements détaillés
 * - Bandeau de scellement (hash visible)
 * - Comparateur de prix intégré
 * - CTA "Demander intervention" → ouvre wizard (placeholder)
 */
export default function TarifContractPublic(): React.ReactElement {
  const params = useParams<{ tarifId: string }>();
  const tarifId = params.tarifId ?? "";

  const [tarif, setTarif] = useState<TarifContractuel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparateur
  const [compareInput, setCompareInput] = useState<string>("");
  const [compareResult, setCompareResult] = useState<ComparatorResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    if (!tarifId) return;
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getTarif(tarifId);
        if (!canceled) setTarif(res.tarif);
      } catch (err: unknown) {
        if (!canceled) setError((err as Error).message ?? "Contrat introuvable");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [tarifId]);

  const onCompare = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setCompareError(null);
    setCompareResult(null);
    const n = Number(compareInput);
    if (!Number.isFinite(n) || n <= 0) {
      setCompareError("Saisis un montant en MAD > 0.");
      return;
    }
    try {
      const res = await comparePrice(tarifId, n);
      if (res.comparison) setCompareResult(res.comparison);
      else setCompareError(res.error ?? "Erreur");
    } catch (err: unknown) {
      setCompareError((err as Error).message ?? "Erreur");
    }
  };

  const onDemandIntervention = (): void => {
    // Placeholder MVP : route vers le wizard intervention (P6) à connecter.
    window.location.href = `/p6?tarifId=${encodeURIComponent(tarifId)}`;
  };

  if (loading) return <p style={styles.muted}>Chargement du contrat…</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (!tarif) return <p style={styles.muted}>Contrat indisponible.</p>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.kicker}>Contrat scellé CITURBAREA</span>
        <h1 style={styles.h1}>{tarif.prestation}</h1>
        <p style={styles.sub}>
          Corps de métier&nbsp;: <strong>{tarif.corpsMetier}</strong> · Status&nbsp;:
          <strong> {statusLabel(tarif.status)}</strong>
        </p>
      </header>

      <section style={styles.priceBlock}>
        <div>
          <div style={styles.priceLabel}>Prix unitaire engagé</div>
          <div style={styles.priceValue}>
            {formatMAD(tarif.prixUnitaireMAD)} <small>/ {uniteLabel(tarif.unite)} HT</small>
          </div>
        </div>
        <div style={styles.commission}>
          <div style={styles.priceLabel}>Commission CITURBAREA</div>
          <div>{tarif.commissionCiturbareaPct}%</div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Engagements du prestataire</h2>
        <ul style={styles.list}>
          <li><strong>Délai d'intervention&nbsp;:</strong> {tarif.garanties.delaiIntervention}</li>
          <li><strong>Garantie travaux&nbsp;:</strong> {tarif.garanties.garantieTravaux}</li>
          <li><strong>Assurances&nbsp;:</strong> {tarif.garanties.assurances.join(", ")}</li>
          <li><strong>Zones d'intervention&nbsp;:</strong> {tarif.zoneIntervention.join(", ")}</li>
          <li><strong>Tarif valable jusqu'au&nbsp;:</strong> {new Date(tarif.validUntil).toLocaleDateString("fr-FR")}</li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Inclus / exclus</h2>
        <div style={styles.grid2}>
          <div>
            <h3 style={styles.h3}>Inclus</h3>
            <ul style={styles.list}>
              {tarif.conditions.inclus.length === 0 && <li style={styles.muted}>—</li>}
              {tarif.conditions.inclus.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
          <div>
            <h3 style={styles.h3}>Exclus</h3>
            <ul style={styles.list}>
              {tarif.conditions.exclus.length === 0 && <li style={styles.muted}>—</li>}
              {tarif.conditions.exclus.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
        {tarif.conditions.minQuantite != null && (
          <p style={styles.hint}>Quantité minimum&nbsp;: {tarif.conditions.minQuantite}</p>
        )}
        {tarif.conditions.maxDeplacementKm != null && (
          <p style={styles.hint}>Déplacement gratuit jusqu'à {tarif.conditions.maxDeplacementKm} km</p>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Comparateur de prix</h2>
        <p style={styles.muted}>
          Tu as reçu un devis ? Saisis le montant et compare-le instantanément à la grille CITURBAREA.
        </p>
        <form onSubmit={onCompare} style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value)}
            placeholder="Prix devis MAD"
            inputMode="numeric"
            style={styles.input}
          />
          <button type="submit" style={styles.btnPrimary}>Comparer</button>
        </form>
        {compareError && <p style={styles.error}>{compareError}</p>}
        {compareResult && (
          <div style={{ ...styles.badgeVerdict, ...verdictStyle(compareResult.verdict) }}>
            <strong>{compareResult.badge}</strong>
            <br />
            <small>
              Médiane marché&nbsp;: {formatMAD(compareResult.marketStats.median)} ·
              Min&nbsp;{formatMAD(compareResult.marketStats.min)} ·
              Max&nbsp;{formatMAD(compareResult.marketStats.max)}
            </small>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Scellement</h2>
        {tarif.status === "PUBLIE" && tarif.hashContrat ? (
          <div style={styles.sealBox}>
            <div style={styles.sealKicker}>Hash SHA-256 du contrat signé</div>
            <code style={styles.hashMono}>{tarif.hashContrat}</code>
            <div style={styles.muted}>
              Signé le {tarif.contratSignedAt ? new Date(tarif.contratSignedAt).toLocaleString("fr-FR") : "—"}
            </div>
          </div>
        ) : (
          <p style={styles.muted}>Contrat non encore scellé (status&nbsp;: {tarif.status}).</p>
        )}
      </section>

      <div style={styles.ctaBar}>
        <button type="button" onClick={onDemandIntervention} style={styles.btnCta} disabled={tarif.status !== "PUBLIE"}>
          Demander intervention au prix engagé
        </button>
      </div>
    </div>
  );
}

function verdictStyle(v: ComparatorResult["verdict"]): React.CSSProperties {
  switch (v) {
    case "TRES_BAS":
    case "BAS":
      return { background: "#dcfce7", color: "#166534", borderColor: "#86efac" };
    case "MARCHE":
      return { background: "#e0f2fe", color: "#075985", borderColor: "#7dd3fc" };
    case "ELEVE":
      return { background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" };
    case "TRES_ELEVE":
      return { background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" };
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 820, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  header: { marginBottom: 16 },
  kicker: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#3730a3",
    fontWeight: 700,
  },
  h1: { fontSize: 24, fontWeight: 800, margin: "4px 0" },
  h2: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  h3: { fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "#3f3f46" },
  sub: { color: "#555", margin: 0 },
  priceBlock: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    background: "#0f172a",
    color: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: { fontSize: 11, textTransform: "uppercase", opacity: 0.7, letterSpacing: 0.5 },
  priceValue: { fontSize: 28, fontWeight: 800 },
  commission: { textAlign: "right" },
  section: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e4e4e7",
    marginBottom: 16,
  },
  list: { margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#3f3f46" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  input: {
    flex: 1,
    padding: "10px 12px",
    border: "1px solid #d4d4d8",
    borderRadius: 8,
    fontSize: 14,
  },
  btnPrimary: {
    padding: "10px 16px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnCta: {
    width: "100%",
    padding: "14px 20px",
    background: "#15803d",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 16,
  },
  ctaBar: { position: "sticky", bottom: 0, padding: 12, background: "#fff" },
  badgeVerdict: {
    marginTop: 12,
    padding: 12,
    border: "1px solid",
    borderRadius: 8,
    fontSize: 14,
  },
  sealBox: {
    background: "#f8fafc",
    border: "1px dashed #94a3b8",
    padding: 12,
    borderRadius: 8,
  },
  sealKicker: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  hashMono: {
    display: "block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    wordBreak: "break-all",
    color: "#0f172a",
    margin: "4px 0",
  },
  hint: { fontSize: 13, color: "#52525b", marginTop: 6 },
  muted: { color: "#71717a", fontSize: 13 },
  error: { color: "#b91c1c", marginTop: 8 },
};
