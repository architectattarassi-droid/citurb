import React, { useEffect, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * AdminLocationSelect — dropdowns en cascade Région → Province → Commune,
 * alimentés par notre API SIG (/api/sig/admin/...) qui sert le découpage
 * administratif officiel du Maroc (HCP — 14 régions, 77 provinces, 1505 communes).
 *
 * Le client n'a plus à taper en texte libre — il choisit dans des listes
 * officielles. La sélection est transmise au parent en string (nom) pour
 * rester compatible avec les payloads `brief.region/province/commune` existants,
 * et en codes pour les liaisons SIG (highlight commune sur la carte).
 *
 * Utilisation :
 *
 *   <AdminLocationSelect
 *     value={{ region, province, commune }}
 *     onChange={({ region, province, commune, codes }) => setIdentity(...)}
 *   />
 */

type AdminItem = {
  code: string;
  name: string;
  nameAr?: string;
  parentCode?: string;
  regionCode?: string;
  population?: number;
  type?: string;
};

type Value = { region?: string; province?: string; commune?: string };
type Codes = { regionCode?: string; provinceCode?: string; communeCode?: string };

type Props = {
  value?: Value;
  onChange?: (v: Value & { codes: Codes }) => void;
  required?: boolean;
  className?: string;
  /** Désactive les dropdowns (lecture seule) */
  disabled?: boolean;
};

export default function AdminLocationSelect({ value, onChange, required, disabled }: Props) {
  const [regions, setRegions] = useState<AdminItem[]>([]);
  const [provinces, setProvinces] = useState<AdminItem[]>([]);
  const [communes, setCommunes] = useState<AdminItem[]>([]);
  const [busyR, setBusyR] = useState(false);
  const [busyP, setBusyP] = useState(false);
  const [busyC, setBusyC] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États en CODE (interne) — les onChange retournent les NOMS au parent
  const [regionCode, setRegionCode] = useState<string>("");
  const [provinceCode, setProvinceCode] = useState<string>("");
  const [communeCode, setCommuneCode] = useState<string>("");

  // Charge les régions au montage
  useEffect(() => {
    setBusyR(true);
    fetch(`${apiBase()}/api/sig/admin/regions`)
      .then(r => r.json())
      .then(d => {
        if (!d?.ok) throw new Error(d?.error || "Erreur");
        setRegions(d.items || []);
      })
      .catch(e => setError(e?.message || "Erreur de chargement des régions"))
      .finally(() => setBusyR(false));
  }, []);

  // Quand région change → charge provinces
  useEffect(() => {
    if (!regionCode) { setProvinces([]); return; }
    setBusyP(true);
    fetch(`${apiBase()}/api/sig/admin/provinces?region=${encodeURIComponent(regionCode)}`)
      .then(r => r.json())
      .then(d => setProvinces(d?.items || []))
      .catch(() => setProvinces([]))
      .finally(() => setBusyP(false));
  }, [regionCode]);

  // Quand province change → charge communes
  useEffect(() => {
    if (!provinceCode) { setCommunes([]); return; }
    setBusyC(true);
    fetch(`${apiBase()}/api/sig/admin/communes?province=${encodeURIComponent(provinceCode)}`)
      .then(r => r.json())
      .then(d => setCommunes(d?.items || []))
      .catch(() => setCommunes([]))
      .finally(() => setBusyC(false));
  }, [provinceCode]);

  const emit = (rc: string, pc: string, cc: string) => {
    const r = regions.find(x => x.code === rc);
    const p = provinces.find(x => x.code === pc);
    const c = communes.find(x => x.code === cc);
    onChange?.({
      region: r?.name || "",
      province: p?.name || "",
      commune: c?.name || "",
      codes: { regionCode: rc || undefined, provinceCode: pc || undefined, communeCode: cc || undefined },
    });
  };

  const onRegionChange = (rc: string) => {
    setRegionCode(rc); setProvinceCode(""); setCommuneCode("");
    setProvinces([]); setCommunes([]);
    emit(rc, "", "");
  };
  const onProvinceChange = (pc: string) => {
    setProvinceCode(pc); setCommuneCode(""); setCommunes([]);
    emit(regionCode, pc, "");
  };
  const onCommuneChange = (cc: string) => {
    setCommuneCode(cc);
    emit(regionCode, provinceCode, cc);
  };

  return (
    <div style={S.wrap} className={"admin-location-select"}>
      <div style={S.field}>
        <label style={S.label}>Région {required && <span style={S.req}>*</span>}</label>
        <select
          style={S.input}
          value={regionCode}
          onChange={(e) => onRegionChange(e.target.value)}
          disabled={disabled || busyR}
        >
          <option value="">{busyR ? "Chargement…" : "— Sélectionner —"}</option>
          {regions.map(r => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </div>

      <div style={S.field}>
        <label style={S.label}>Province / Préfecture {required && <span style={S.req}>*</span>}</label>
        <select
          style={S.input}
          value={provinceCode}
          onChange={(e) => onProvinceChange(e.target.value)}
          disabled={disabled || !regionCode || busyP}
        >
          <option value="">
            {!regionCode ? "Choisissez d'abord une région" : busyP ? "Chargement…" : "— Sélectionner —"}
          </option>
          {provinces.map(p => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      <div style={S.field}>
        <label style={S.label}>Commune {required && <span style={S.req}>*</span>}</label>
        <select
          style={S.input}
          value={communeCode}
          onChange={(e) => onCommuneChange(e.target.value)}
          disabled={disabled || !provinceCode || busyC}
        >
          <option value="">
            {!provinceCode ? "Choisissez d'abord une province" : busyC ? "Chargement…" : "— Sélectionner —"}
          </option>
          {communes.map(c => (
            <option key={c.code} value={c.code}>
              {c.name}{c.nameAr ? ` · ${c.nameAr}` : ""}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(11,27,58,0.8)" },
  req: { color: "rgba(201,162,39,0.95)", fontWeight: 900 },
  input: {
    width: "100%", padding: "12px 13px", border: "1px solid rgba(201,162,39,0.35)",
    background: "rgba(255,255,255,0.85)", borderRadius: 14,
    fontSize: 14, color: "#0B1B3A", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  },
  err: { gridColumn: "1 / -1", color: "#b91c1c", background: "rgba(220,38,38,0.07)", padding: "9px 12px", borderRadius: 10, fontSize: 12.5 },
};
