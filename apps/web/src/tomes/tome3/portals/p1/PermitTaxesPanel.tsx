/**
 * PermitTaxesPanel — taxes & frais d'autorisation présentés au client, à côté
 * du coût de construction. Inclut le rappel TNB (terrain non bâti) à régler en
 * amont, et le détail des taxes communales. Entièrement traduit (FR/AR/EN).
 *
 * Barèmes indicatifs Maroc (éditables car ils varient par commune) :
 *  - Taxe sur opérations de construction : surface plancher × 20/30/40 DH/m²
 *  - Participation Agence Urbaine : surface plancher × 3,6 DH/m²
 *  - Occupation du domaine public : façade (ml) × 3 m × nb trimestres × tarif
 *  - Sapeurs-pompiers (protection civile) : forfait (~1000 DH villa)
 *  - Topographe / implantation : forfait
 */

import React, { useState } from "react";
import { useT } from "../../../../i18n/i18n";

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";
const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA") + " DH";

type PlancherRate = 20 | 30 | 40;
type Trimestres = 2 | 3 | 4;

export default function PermitTaxesPanel({ surfaceM2 }: { surfaceM2: number | null }) {
  const t = useT();
  const surface = surfaceM2 && surfaceM2 > 0 ? Math.round(surfaceM2) : 0;

  const [plancherRate, setPlancherRate] = useState<PlancherRate>(30);
  const [facadeML, setFacadeML] = useState<number>(0);
  const [odpTrimestres, setOdpTrimestres] = useState<Trimestres>(4);
  const [odpTarif, setOdpTarif] = useState<number>(20); // DH / m² / trimestre (varie par commune)
  const [pompiers, setPompiers] = useState<number>(1000);
  const [topoForfait, setTopoForfait] = useState<number>(2500);

  const taxePlancher = surface * plancherRate;
  const agenceUrbaine = surface * 3.6;
  const odp = facadeML * 3 * odpTrimestres * odpTarif;
  const totalTaxes = taxePlancher + agenceUrbaine + odp;
  const totalFrais = totalTaxes + pompiers + topoForfait;

  return (
    <div style={S.card}>
      <div style={S.kicker}>{t("portes.p1.taxes.kicker")}</div>
      <div style={S.title}>{t("portes.p1.taxes.title")}</div>

      {/* Bandeau d'alerte TNB */}
      <div style={S.banner}>
        <span style={S.bannerIcon}>⚠️</span>
        <div>
          <b>{t("portes.p1.taxes.banner_title")}</b> {t("portes.p1.taxes.banner_body")}
        </div>
      </div>

      {/* Sapeurs-pompiers / protection civile */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>{t("portes.p1.taxes.pompiers")}</div>
            <div style={S.lineDesc}>{t("portes.p1.taxes.pompiers_desc")}</div>
          </div>
          <input type="number" min={0} value={pompiers} onChange={(e) => setPompiers(Math.max(0, Number(e.target.value) || 0))} style={S.amtInput} />
        </div>
      </div>

      {/* Topographe / implantation */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>{t("portes.p1.taxes.topo")}</div>
            <div style={S.lineDesc}>{t("portes.p1.taxes.topo_desc")}</div>
          </div>
          <input type="number" min={0} value={topoForfait} onChange={(e) => setTopoForfait(Math.max(0, Number(e.target.value) || 0))} style={S.amtInput} />
        </div>
      </div>

      {/* Taxe plancher */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>{t("portes.p1.taxes.plancher")}</div>
            <div style={S.lineDesc}>{t("portes.p1.taxes.plancher_desc", { surface, rate: plancherRate })}</div>
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
            <div style={S.lineName}>{t("portes.p1.taxes.agence")}</div>
            <div style={S.lineDesc}>{t("portes.p1.taxes.agence_desc", { surface })}</div>
          </div>
          <div style={S.amt}>{fmt(agenceUrbaine)}</div>
        </div>
      </div>

      {/* Occupation domaine public */}
      <div style={S.line}>
        <div style={S.lineHead}>
          <div>
            <div style={S.lineName}>{t("portes.p1.taxes.odp")}</div>
            <div style={S.lineDesc}>{t("portes.p1.taxes.odp_desc", { trim: odpTrimestres, tarif: odpTarif })}</div>
          </div>
          <div style={S.amt}>{fmt(odp)}</div>
        </div>
        <div style={S.odpRow}>
          <label style={S.miniField}><span style={S.miniLbl}>{t("portes.p1.taxes.facade")}</span>
            <input type="number" min={0} value={facadeML} onChange={(e) => setFacadeML(Math.max(0, Number(e.target.value) || 0))} style={S.miniInput} />
          </label>
          <label style={S.miniField}><span style={S.miniLbl}>{t("portes.p1.taxes.trimestres")}</span>
            <select value={odpTrimestres} onChange={(e) => setOdpTrimestres(Number(e.target.value) as Trimestres)} style={S.miniInput}>
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
            </select>
          </label>
          <label style={S.miniField}><span style={S.miniLbl}>{t("portes.p1.taxes.tarif")}</span>
            <input type="number" min={0} value={odpTarif} onChange={(e) => setOdpTarif(Math.max(0, Number(e.target.value) || 0))} style={S.miniInput} />
          </label>
        </div>
        <div style={S.note}>{t("portes.p1.taxes.odp_note")}</div>
      </div>

      {/* Totaux */}
      <div style={S.totals}>
        <div style={S.totalRow}><span>{t("portes.p1.taxes.subtotal")}</span><b>{fmt(totalTaxes)}</b></div>
        <div style={{ ...S.totalRow, ...S.totalMain }}><span>{t("portes.p1.taxes.total")}</span><b>{fmt(totalFrais)}</b></div>
      </div>

      <div style={S.disclaimer}>{t("portes.p1.taxes.disclaimer")}</div>
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
