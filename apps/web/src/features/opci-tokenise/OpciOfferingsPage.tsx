import React, { useEffect, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * OpciOfferingsPage — vitrine des OPCI tokenisés (/opci).
 * Pivot Visa du foncier : investissement immobilier fractionné pour MRE.
 */
type Offering = {
  id: string; nom: string; descripteur: string; ville: string;
  nombreParts: number; partsVendues: number; prixPartMad: number;
  dureeAnnees: number; rendementCibleAnnuelPct: number; agreementAmmcRef?: string; status: string;
};

export default function OpciOfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase()}/api/opci-tokenise/offerings`)
      .then((r) => r.json()).then((j) => setOfferings(j.offerings || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtMad = (n: number) => new Intl.NumberFormat("fr-MA").format(n);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.18em", textTransform: "uppercase" }}>CITURBAREA · OPCI tokenisé</div>
      <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#0B1B3A" }}>Investir dans l'immobilier marocain, fractionné</h1>
      <p style={{ fontSize: 14.5, color: "rgba(11,27,58,0.6)", marginTop: 6, maxWidth: 640 }}>
        OPCI agréés AMMC (loi 70-14) tokenisés : achetez des parts d'immeubles loués, recevez
        des revenus locatifs. Idéal pour la diaspora MRE. Plafond 500 000 MAD/investisseur.
      </p>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Chargement…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, marginTop: 24 }}>
        {offerings.map((o) => {
          const restantes = o.nombreParts - o.partsVendues;
          const pctVendu = Math.round((o.partsVendues / o.nombreParts) * 100);
          const ouvert = o.status === "OUVERT";
          return (
            <div key={o.id} style={{ background: "#fff", border: "1px solid rgba(11,27,58,0.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 18px rgba(11,27,58,0.06)" }}>
              <div style={{ height: 120, background: "linear-gradient(135deg, #0B1B3A, #1a2f5f)", display: "flex", alignItems: "flex-end", padding: 16 }}>
                <div>
                  <div style={{ color: "#E8C66A", fontWeight: 800, fontSize: 18 }}>{o.nom}</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{o.ville}</div>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 13, color: "rgba(11,27,58,0.65)", lineHeight: 1.5, minHeight: 56 }}>{o.descripteur}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
                  <Metric label="Prix part" value={`${fmtMad(o.prixPartMad)} MAD`} />
                  <Metric label="Rendement cible" value={`${o.rendementCibleAnnuelPct}%/an`} accent />
                  <Metric label="Durée" value={`${o.dureeAnnees} ans`} />
                  <Metric label="Parts dispo" value={`${restantes}/${o.nombreParts}`} />
                </div>
                <div style={{ height: 8, background: "rgba(11,27,58,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ width: `${pctVendu}%`, height: "100%", background: "#16a34a" }} />
                </div>
                <div style={{ fontSize: 11, color: "rgba(11,27,58,0.5)" }}>{pctVendu}% souscrit · {o.agreementAmmcRef || "Agrément AMMC en cours"}</div>
                <button disabled={!ouvert} style={{
                  width: "100%", marginTop: 12, padding: "11px", borderRadius: 9, border: 0, cursor: ouvert ? "pointer" : "not-allowed",
                  background: ouvert ? "#0B1B3A" : "rgba(11,27,58,0.25)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
                }}>{ouvert ? "Souscrire des parts" : o.status === "DRAFT" ? "Bientôt disponible" : "Clôturé"}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(11,27,58,0.5)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent ? "#16a34a" : "#0B1B3A", marginTop: 2 }}>{value}</div>
    </div>
  );
}
