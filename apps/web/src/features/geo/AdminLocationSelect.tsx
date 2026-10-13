import React, { useState } from "react";

/**
 * AdminLocationSelect — Région / Province / Commune.
 *
 * Les listes officielles (HCP — 14 régions, 77 provinces, 1505 communes) étaient
 * servies par l'API SIG NestJS (/api/sig/admin/...), éteinte ; aucune route
 * équivalente dans functions/ et les données sources (data/geo) ne sont pas
 * dans le dépôt. Saisie libre en attendant leur republication en JSON statique
 * (docs/architecture/plan-rebranchement.md, module geo).
 * Le parent reçoit les NOMS (brief.region/province/commune), sans codes.
 *
 *   <AdminLocationSelect value={{ region, province, commune }} onChange={...} />
 */

type Value = { region?: string; province?: string; commune?: string };
type Codes = { regionCode?: string; provinceCode?: string; communeCode?: string };

type Props = {
  value?: Value;
  onChange?: (v: Value & { codes: Codes }) => void;
  required?: boolean;
  className?: string;
  /** Désactive les champs (lecture seule) */
  disabled?: boolean;
};

export default function AdminLocationSelect({ value, onChange, required, disabled }: Props) {
  const [txt, setTxt] = useState<Value>({
    region: value?.region || "", province: value?.province || "", commune: value?.commune || "",
  });
  const maj = (k: keyof Value, v: string) => {
    const next = { ...txt, [k]: v };
    setTxt(next);
    onChange?.({ region: next.region || "", province: next.province || "", commune: next.commune || "", codes: {} });
  };
  return (
    <div style={S.wrap} className={"admin-location-select"}>
      {(["region", "province", "commune"] as const).map((k) => (
        <div key={k} style={S.field}>
          <label style={S.label}>{LIBELLES[k]} {required && <span style={S.req}>*</span>}</label>
          <input style={S.input} value={txt[k] || ""} disabled={disabled} onChange={(e) => maj(k, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

const LIBELLES: Record<keyof Value, string> = { region: "Région", province: "Province / Préfecture", commune: "Commune" };

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
};
