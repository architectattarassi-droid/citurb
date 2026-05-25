import React, { useEffect, useMemo, useState } from "react";
import {
  PrestationCorpus,
  TarifContractuel,
  formatMAD,
  getCorpus,
  searchTarifs,
  statusLabel,
  uniteLabel,
} from "./prestataire-tarifs.api";

/**
 * Liste publique des tarifs PUBLIÉS — vue client.
 * Mobile-first : cards swipeables (CSS scroll-snap horizontal).
 */
export default function PrestataireTarifsList(): React.ReactElement {
  const [corpus, setCorpus] = useState<PrestationCorpus[]>([]);
  const [tarifs, setTarifs] = useState<TarifContractuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPrestation, setFilterPrestation] = useState<string>("");
  const [filterZone, setFilterZone] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setLoading(true);
        const [corpusRes, searchRes] = await Promise.all([
          getCorpus(),
          searchTarifs({}),
        ]);
        if (canceled) return;
        setCorpus(corpusRes.prestations);
        setTarifs(searchRes.results);
        setError(null);
      } catch (err: unknown) {
        if (!canceled) setError((err as Error).message ?? "Erreur de chargement");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const applyFilters = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await searchTarifs({
        prestation: filterPrestation || undefined,
        zone: filterZone || undefined,
        maxPrice: filterMaxPrice ? Number(filterMaxPrice) : undefined,
      });
      setTarifs(res.results);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const corpusByCode = useMemo(() => {
    const m = new Map<string, PrestationCorpus>();
    for (const c of corpus) m.set(c.code, c);
    return m;
  }, [corpus]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>Tarifs contractuels prestataires</h1>
        <p style={styles.sub}>
          Prix engagés par contrat avec CITURBAREA. Aucune surprise, garanties écrites.
        </p>
      </header>

      <section style={styles.filters}>
        <select
          aria-label="Prestation"
          value={filterPrestation}
          onChange={(e) => setFilterPrestation(e.target.value)}
          style={styles.input}
        >
          <option value="">Toutes prestations</option>
          {corpus.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          aria-label="Zone (code région HCP)"
          placeholder="Zone (ex: MA-07)"
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          style={styles.input}
        />
        <input
          aria-label="Prix maximum MAD"
          placeholder="Prix max MAD"
          inputMode="numeric"
          value={filterMaxPrice}
          onChange={(e) => setFilterMaxPrice(e.target.value)}
          style={styles.input}
        />
        <button type="button" onClick={applyFilters} style={styles.btnPrimary}>
          Filtrer
        </button>
      </section>

      {loading && <p style={styles.muted}>Chargement…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && tarifs.length === 0 && (
        <p style={styles.muted}>Aucun tarif publié ne correspond aux critères.</p>
      )}

      <div style={styles.scroller}>
        {tarifs.map((t) => {
          const meta = corpusByCode.get(t.prestation);
          return (
            <article key={t.id} style={styles.card}>
              <header style={styles.cardHeader}>
                <span style={styles.badgeCorps}>{t.corpsMetier}</span>
                <span style={styles.badgeStatus}>{statusLabel(t.status)}</span>
              </header>
              <h3 style={styles.cardTitle}>{meta?.label ?? t.prestation}</h3>
              <p style={styles.cardPrice}>
                {formatMAD(t.prixUnitaireMAD)}
                <small> / {uniteLabel(t.unite)} HT</small>
              </p>
              <ul style={styles.list}>
                <li><strong>Délai :</strong> {t.garanties.delaiIntervention}</li>
                <li><strong>Garantie :</strong> {t.garanties.garantieTravaux}</li>
                <li><strong>Zones :</strong> {t.zoneIntervention.join(", ")}</li>
                <li><strong>Valide jusqu'au :</strong> {new Date(t.validUntil).toLocaleDateString("fr-FR")}</li>
              </ul>
              <a href={`/prestataires/tarifs/${t.id}`} style={styles.btnGhost}>
                Voir le contrat
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  header: { marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  sub: { color: "#555", marginTop: 4 },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
    marginBottom: 16,
  },
  input: {
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
  btnGhost: {
    display: "inline-block",
    marginTop: 12,
    padding: "8px 12px",
    border: "1px solid #0f172a",
    borderRadius: 8,
    color: "#0f172a",
    textDecoration: "none",
    fontWeight: 600,
  },
  scroller: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    paddingBottom: 8,
  },
  card: {
    border: "1px solid #e4e4e7",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    scrollSnapAlign: "start",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  badgeCorps: {
    fontSize: 11,
    background: "#eef2ff",
    color: "#3730a3",
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 600,
  },
  badgeStatus: {
    fontSize: 11,
    background: "#dcfce7",
    color: "#166534",
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 600,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: "4px 0 8px" },
  cardPrice: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "8px 0" },
  list: { listStyle: "none", padding: 0, margin: 0, fontSize: 13, color: "#3f3f46", lineHeight: 1.6 },
  muted: { color: "#71717a" },
  error: { color: "#b91c1c" },
};
