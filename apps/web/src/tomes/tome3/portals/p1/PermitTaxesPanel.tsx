/**
 * PermitTaxesPanel — taxes & frais d'autorisation présentés au client, à côté
 * du coût de construction. Inclut le rappel TNB (terrain non bâti) à régler en
 * amont, et le détail des taxes communales.
 *
 * Barèmes indicatifs Maroc (éditables car ils varient par commune) :
 *  - Taxe sur opérations de construction : surface plancher × 20/30/40 DH/m² (selon commune)
 *  - Participation Agence Urbaine : surface plancher × 3,6 DH/m²
 *  - Occupation du domaine public (chantier) : façade (ml) × 3 m × nb trimestres × tarif
 *  - Topographe / implantation : forfait
 */

import React, { useState } from "react";

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";
const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA") + " DH";

type PlancherRate = 20 | 30 | 40;
type Trimestres = 2 | 3 | 4;

export default function PermitTaxesPanel({ surfaceM2 }: { surfaceM2: number | null }) {
  const surface = surfaceM2 && surfaceM2 > 0 ? Math.round(surfaceM2) : 0;

  const [plancherRate, setPlancherRate] = useState<PlancherRate>(30);
  const [facadeML, setFacadeML] = useState<number>(0);
  const [odpTrimestres, setOdpTrimestres] = useState<Trimestres>(4);
  const [odpTarif, setOdpTarif] = useState<number>(20); // DH / m² / trimestre (varie par commune)
  const [topoForfait, setTopoForfait] = useState<number>(2500);

  const taxePlancher = surface * plancherRate;
  const agenceUrbaine = surface * 3.6;
  const odpQuantite = facadeML * 3 * odpTrimestres; // m²·trimestre
  const odp = odpQuantite * odpTarif;
  const totalTaxes = taxePlancher + agenceUrbaine + odp;
  const totalFrais = totalTaxes + topoForfait;

  return (
    <div style={S.card}>
      <div style={S.kicker}>Autorisation de construire</div>
      <div style={S.title}>Taxes & frais d'autorisation</div>

      {/* Bandeau d'alerte TNB */}
      <div style={S.banner}>
        <span style={S.bannerIcon}>⚠️</span>
        <div>
          <b>Pensez à régler votre taxe sur le terrain non bâti (TNB) en amont.</b> Un arriéré de TNB
          peut <b>bloquer l'obtention de l'autorisation de construire</b>. Mettez-vous à jour auprès de votre
          commune avant le dépôt du dossier.
        </div>
      </div>

      {/* Topographe / implantation */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>Topographe / implantation</div>
            <div style={S.lineDesc}>Levé + implantation de l'ouvrage (forfait, éditable).</div>
          </div>
          <input type="number" min={0} value={topoForfait} onChange={(e) => setTopoForfait(Math.max(0, Number(e.target.value) || 0))} style={S.amtInput} />
        </div>
      </div>

      {/* Taxe plancher */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>Taxe sur opérations de construction</div>
            <div style={S.lineDesc}>{surface} m² × {plancherRate} DH/m² (taux selon commune)</div>
          </div>
          <div style={S.lineRight}>
            <select value={plancherRate} onChange={(e) => setPlancherRate(Number(e.target.value) as PlancherRate)} style={S.sel}>
              <option value={20}>20 DH/m²</option>
              <option value={30}>30 DH/m²</option>
              <option value={40}>40 DH/m²</option>
            </select>
            <div style={S.amt}>{fmt(taxePlancher)}</div>
          </div>
        </div>
      </div>

      {/* Agence urbaine */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>Participation Agence Urbaine</div>
            <div style={S.lineDesc}>{surface} m² × 3,6 DH/m²</div>
          </div>
          <div style={S.amt}>{fmt(agenceUrbaine)}</div>
        </div>
      </div>

      {/* Occupation domaine public */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>Occupation du domaine public (chantier)</div>
            <div style={S.lineDesc}>façade × 3 m × {odpTrimestres} trimestre(s) × {odpTarif} DH/m²/trim.</div>
          </div>
          <div style={S.amt}>{fmt(odp)}</div>
        </div>
        <div style={S.odpRow}>
          <label style={S.miniField}><span style={S.miniLbl}>Façade (ml)</span>
            <input type="number" min={0} value={facadeML} onChange={(e) => setFacadeML(Math.max(0, Number(e.target.value) || 0))} style={S.miniInput} />
          </label>
          <label style={S.miniField}><span style={S.miniLbl}>Trimestres</span>
            <select value={odpTrimestres} onChange={(e) => setOdpTrimestres(Number(e.target.value) as Trimestres)} style={S.miniInput}>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
            </select>
          </label>
          <label style={S.miniField}><span style={S.miniLbl}>Tarif (DH/m²/trim.)</span>
            <input type="number" min={0} value={odpTarif} onChange={(e) => setOdpTarif(Math.max(0, Number(e.target.value) || 0))} style={S.miniInput} />
          </label>
        </div>
        <div style={S.note}>Certaines communes acceptent un règlement en 2 ou 3 trimestres plutôt que 4.</div>
      </div>

      {/* Totaux */}
      <div style={S.totals}>
        <div style={S.totalRow}><span>Sous-total taxes</span><b>{fmt(totalTaxes)}</b></div>
        <div style={{ ...S.totalRow, ...S.totalMain }}><span>Total taxes & frais d'autorisation</span><b>{fmt(totalFrais)}</b></div>
      </div>

      <div style={S.disclaimer}>
        Montants indicatifs : les taux et modalités varient selon la commune et l'agence urbaine.
        À confirmer auprès des services concernés. Hors TNB, raccordements et droits divers.
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { marginTop: 18, padding: 22, borderRadius: 18, background: "#fff", border: "1px solid rgba(201,162,39,0.28)", boxShadow: "0 14px 40px rgba(11,27,58,0.07)" },
  kicker: { fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 22, fontWeight: 700, color: NAVY, margin: "4px 0 14px" },
  banner: { display: "flex", gap: 12, alignItems: "flex-start", padding: "13px 15px", borderRadius: 14, background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.4)", color: "rgba(11,27,58,0.85)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 },
  bannerIcon: { fontSize: 18, lineHeight: 1.2 },
  line: { padding: "12px 0", borderTop: "1px solid rgba(11,27,58,0.08)" },
  lineHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  lineName: { fontWeight: 800, color: NAVY, fontSize: 14 },
  lineDesc: { fontSize: 12, color: "rgba(11,27,58,0.55)", marginTop: 2 },
  lineRight: { display: "flex", alignItems: "center", gap: 10 },
  amt: { fontWeight: 900, color: NAVY, fontSize: 15, whiteSpace: "nowrap" },
  amtInput: { width: 120, padding: "9px 11px", borderRadius: 10, border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, textAlign: "right", color: NAVY },
  sel: { padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(11,27,58,0.18)", fontSize: 13, color: NAVY, background: "#fff" },
  odpRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 },
  miniField: { display: "flex", flexDirection: "column", gap: 5 },
  miniLbl: { fontSize: 11.5, fontWeight: 700, color: "rgba(11,27,58,0.6)" },
  miniInput: { padding: "9px 11px", borderRadius: 10, border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, color: NAVY, background: "#fff" },
  note: { marginTop: 8, fontSize: 12, color: GOLD, fontWeight: 700 },
  totals: { marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "rgba(11,27,58,0.04)" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 14, color: "rgba(11,27,58,0.8)" },
  totalMain: { borderTop: "1px solid rgba(11,27,58,0.12)", marginTop: 6, paddingTop: 10, fontSize: 16, color: NAVY, fontWeight: 900 },
  disclaimer: { marginTop: 12, fontSize: 11, color: "rgba(11,27,58,0.5)", lineHeight: 1.5 },
};
