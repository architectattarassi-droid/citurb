import React, { useEffect, useMemo, useState } from "react";
import {
  PrestationCorpus,
  TarifContractuel,
  TarifUnite,
  createTarif,
  formatMAD,
  getCorpus,
  listByPrestataire,
  submitTarif,
  uniteLabel,
} from "./prestataire-tarifs.api";

/**
 * Éditeur de tarifs — vue prestataire.
 * Le prestataire choisit une prestation du corpus, fixe son prix, ses zones
 * et ses garanties. Bouton "Soumettre à CITURBAREA" → workflow validation.
 *
 * MVP: prestataireId saisi en clair (champ visible). En prod, lu depuis le JWT.
 */
export default function PrestataireTarifsEditor(): React.ReactElement {
  const [corpus, setCorpus] = useState<PrestationCorpus[]>([]);
  const [prestataireId, setPrestataireId] = useState<string>("");
  const [myTarifs, setMyTarifs] = useState<TarifContractuel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState<string>("");
  const [prix, setPrix] = useState<string>("");
  const [unite, setUnite] = useState<TarifUnite>("U");
  const [zones, setZones] = useState<string>("");
  const [inclus, setInclus] = useState<string>("");
  const [exclus, setExclus] = useState<string>("");
  const [delaiIntervention, setDelaiIntervention] = useState<string>("<24h");
  const [garantieTravaux, setGarantieTravaux] = useState<string>("1 an pièces et MO");
  const [assurances, setAssurances] = useState<string>("RC Pro, Décennale");
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [commissionPct, setCommissionPct] = useState<string>("5");

  useEffect(() => {
    (async () => {
      try {
        const res = await getCorpus();
        setCorpus(res.prestations);
      } catch (err: unknown) {
        setError((err as Error).message ?? "Erreur corpus");
      }
    })();
  }, []);

  const selectedPrestation = useMemo(
    () => corpus.find((c) => c.code === code),
    [corpus, code],
  );

  useEffect(() => {
    if (selectedPrestation) setUnite(selectedPrestation.uniteRecommandee);
  }, [selectedPrestation]);

  const loadMine = async (): Promise<void> => {
    if (!prestataireId.trim()) return;
    try {
      setLoading(true);
      const res = await listByPrestataire(prestataireId.trim());
      setMyTarifs(res.tarifs);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!prestataireId.trim()) {
      setError("Identifiant prestataire requis.");
      return;
    }
    if (!code) {
      setError("Choisis une prestation du corpus.");
      return;
    }
    const prixN = Number(prix);
    if (!Number.isFinite(prixN) || prixN <= 0) {
      setError("Prix unitaire invalide.");
      return;
    }
    try {
      setLoading(true);
      const res = await createTarif({
        prestataireId: prestataireId.trim(),
        corpsMetier: selectedPrestation?.corpsMetier ?? "divers",
        prestation: code,
        unite,
        prixUnitaireMAD: prixN,
        conditions: {
          inclus: inclus.split(",").map((s) => s.trim()).filter(Boolean),
          exclus: exclus.split(",").map((s) => s.trim()).filter(Boolean),
        },
        zoneIntervention: zones.split(",").map((s) => s.trim()).filter(Boolean),
        garanties: {
          delaiIntervention,
          garantieTravaux,
          assurances: assurances.split(",").map((s) => s.trim()).filter(Boolean),
        },
        validUntil: new Date(validUntil).toISOString(),
        commissionCiturbareaPct: Number(commissionPct) || 5,
      });
      setSuccess(`Brouillon créé (${res.tarif.id.slice(0, 8)}…).`);
      await loadMine();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Erreur création");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitToCiturb = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await submitTarif(id);
      setSuccess("Tarif soumis à CITURBAREA pour validation.");
      await loadMine();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Erreur soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Mes tarifs contractuels</h1>
      <p style={styles.sub}>
        Engage tes prix avec CITURBAREA — flux régulier en échange d'un prix négocié.
      </p>

      <section style={styles.section}>
        <label style={styles.label}>Identifiant prestataire</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={prestataireId}
            onChange={(e) => setPrestataireId(e.target.value)}
            placeholder="prestataire-uuid"
            style={{ ...styles.input, flex: 1 }}
          />
          <button type="button" onClick={loadMine} style={styles.btnPrimary} disabled={loading}>
            Charger
          </button>
        </div>
      </section>

      <form onSubmit={onCreate} style={styles.section}>
        <h2 style={styles.h2}>Nouveau tarif (brouillon)</h2>

        <label style={styles.label}>Prestation (corpus standardisé)</label>
        <select value={code} onChange={(e) => setCode(e.target.value)} style={styles.input}>
          <option value="">— Choisir —</option>
          {corpus.map((c) => (
            <option key={c.code} value={c.code}>
              [{c.corpsMetier}] {c.label}
            </option>
          ))}
        </select>

        {selectedPrestation && (
          <p style={styles.hint}>
            {selectedPrestation.description} — fourchette marché&nbsp;:
            <strong> {formatMAD(selectedPrestation.prixIndicatifMinMAD)} – {formatMAD(selectedPrestation.prixIndicatifMaxMAD)}</strong>
          </p>
        )}

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Prix unitaire (MAD HT)</label>
            <input
              type="number"
              inputMode="numeric"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              style={styles.input}
              placeholder="ex: 1400"
            />
          </div>
          <div>
            <label style={styles.label}>Unité</label>
            <select value={unite} onChange={(e) => setUnite(e.target.value as TarifUnite)} style={styles.input}>
              <option value="U">unité</option>
              <option value="m2">m²</option>
              <option value="ml">ml</option>
              <option value="h">heure</option>
              <option value="forfait">forfait</option>
            </select>
          </div>
        </div>

        <label style={styles.label}>Zones d'intervention (codes HCP, séparés par virgule)</label>
        <input
          value={zones}
          onChange={(e) => setZones(e.target.value)}
          placeholder="MA-07, MA-09"
          style={styles.input}
        />

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Inclus (virgule)</label>
            <input value={inclus} onChange={(e) => setInclus(e.target.value)} style={styles.input} placeholder="pose, raccordement" />
          </div>
          <div>
            <label style={styles.label}>Exclus (virgule)</label>
            <input value={exclus} onChange={(e) => setExclus(e.target.value)} style={styles.input} placeholder="fourniture, transport" />
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Délai intervention</label>
            <input value={delaiIntervention} onChange={(e) => setDelaiIntervention(e.target.value)} style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>Garantie travaux</label>
            <input value={garantieTravaux} onChange={(e) => setGarantieTravaux(e.target.value)} style={styles.input} />
          </div>
        </div>

        <label style={styles.label}>Assurances (virgule)</label>
        <input value={assurances} onChange={(e) => setAssurances(e.target.value)} style={styles.input} />

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Valide jusqu'au</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>Commission CITURBAREA (%)</label>
            <input
              type="number"
              inputMode="numeric"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <button type="submit" style={styles.btnPrimary} disabled={loading}>
          Créer le brouillon
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}

      <section style={styles.section}>
        <h2 style={styles.h2}>Mes tarifs ({myTarifs.length})</h2>
        {myTarifs.length === 0 && <p style={styles.muted}>Aucun tarif chargé.</p>}
        {myTarifs.map((t) => (
          <div key={t.id} style={styles.row}>
            <div>
              <strong>{t.prestation}</strong> — {formatMAD(t.prixUnitaireMAD)} / {uniteLabel(t.unite)}
              <br />
              <small style={styles.muted}>
                Status: {t.status} · Zones: {t.zoneIntervention.join(", ")}
              </small>
            </div>
            {t.status === "BROUILLON" && (
              <button type="button" onClick={() => onSubmitToCiturb(t.id)} style={styles.btnPrimary}>
                Soumettre à CITURBAREA
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  h2: { fontSize: 18, fontWeight: 600, margin: "0 0 12px" },
  sub: { color: "#555", marginTop: 4, marginBottom: 16 },
  section: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #e4e4e7",
    marginBottom: 16,
  },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#3f3f46", margin: "8px 0 4px" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d4d4d8",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  btnPrimary: {
    padding: "10px 16px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginTop: 12,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderTop: "1px solid #f4f4f5",
    gap: 12,
  },
  hint: { fontSize: 13, color: "#52525b", marginTop: 6 },
  muted: { color: "#71717a", fontSize: 13 },
  error: { color: "#b91c1c" },
  success: { color: "#15803d" },
};
