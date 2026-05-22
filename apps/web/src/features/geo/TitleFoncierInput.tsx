import React, { useState } from "react";

/**
 * TitleFoncierInput — saisie du numéro de titre foncier marocain.
 *
 * DOCTRINE (audit ANCFCC 2026) :
 * Le lookup automatique (propriétaire, surface, coords Lambert) à partir d'un
 * simple N° de TF est IMPOSSIBLE sans partenariat ANCFCC formalisé. La
 * consultation est ouverte aux notaires depuis janv. 2024 (10 DH/acte) et
 * une plateforme blockchain unifiée est annoncée pour fin 2025 / 2026 —
 * exclusivement notaires + banques.
 *
 * Ce que CE composant fait DE FAÇON RÉALISTE :
 *  1. Validation du format du N° (regex pattern marocain)
 *  2. Identification de la conservation foncière (préfixe / suffixe) →
 *     déduction de la région / ville où est immatriculé le titre
 *  3. Note honnête : pas de lookup auto. Le client est invité à uploader
 *     son certificat scanné via MohafadatiUpload (workflow OCR séparé).
 *  4. Le N° saisi est attaché au dossier pour traitement manuel par l'expert.
 *
 * Référentiel des conservations : extrait de
 *   https://www.ancfcc.gov.ma/ServicesExterieurs/
 * (saisie partielle — à étendre selon retours terrain).
 */

type Conservation = {
  code: string;        // lettre(s) de la conservation foncière dans le n° TF
  name: string;        // nom de la conservation
  city: string;        // ville principale
  region: string;      // région HCP
};

const CONSERVATIONS: Conservation[] = [
  { code: "R",  name: "Conservation Foncière de Rabat",           city: "Rabat",        region: "Rabat-Salé-Kénitra" },
  { code: "S",  name: "Conservation Foncière de Salé",            city: "Salé",         region: "Rabat-Salé-Kénitra" },
  { code: "K",  name: "Conservation Foncière de Kénitra",         city: "Kénitra",      region: "Rabat-Salé-Kénitra" },
  { code: "T",  name: "Conservation Foncière de Témara",          city: "Témara",       region: "Rabat-Salé-Kénitra" },
  { code: "C",  name: "Conservation Foncière de Casablanca",      city: "Casablanca",   region: "Casablanca-Settat" },
  { code: "MR", name: "Conservation Foncière de Mohammedia",      city: "Mohammedia",   region: "Casablanca-Settat" },
  { code: "EJ", name: "Conservation Foncière d'El Jadida",        city: "El Jadida",    region: "Casablanca-Settat" },
  { code: "SE", name: "Conservation Foncière de Settat",          city: "Settat",       region: "Casablanca-Settat" },
  { code: "F",  name: "Conservation Foncière de Fès",             city: "Fès",          region: "Fès-Meknès" },
  { code: "M",  name: "Conservation Foncière de Meknès",          city: "Meknès",       region: "Fès-Meknès" },
  { code: "TZ", name: "Conservation Foncière de Taza",            city: "Taza",         region: "Fès-Meknès" },
  { code: "TG", name: "Conservation Foncière de Tanger",          city: "Tanger",       region: "Tanger-Tétouan-Al Hoceima" },
  { code: "TE", name: "Conservation Foncière de Tétouan",         city: "Tétouan",      region: "Tanger-Tétouan-Al Hoceima" },
  { code: "AH", name: "Conservation Foncière d'Al Hoceima",       city: "Al Hoceima",   region: "Tanger-Tétouan-Al Hoceima" },
  { code: "MK", name: "Conservation Foncière de Marrakech",       city: "Marrakech",    region: "Marrakech-Safi" },
  { code: "SF", name: "Conservation Foncière de Safi",            city: "Safi",         region: "Marrakech-Safi" },
  { code: "AG", name: "Conservation Foncière d'Agadir",           city: "Agadir",       region: "Souss-Massa" },
  { code: "TR", name: "Conservation Foncière de Taroudant",       city: "Taroudant",    region: "Souss-Massa" },
  { code: "BM", name: "Conservation Foncière de Béni Mellal",     city: "Béni Mellal",  region: "Béni Mellal-Khénifra" },
  { code: "KH", name: "Conservation Foncière de Khouribga",       city: "Khouribga",    region: "Béni Mellal-Khénifra" },
  { code: "OU", name: "Conservation Foncière d'Oujda",            city: "Oujda",        region: "Oriental-Rif" },
  { code: "NA", name: "Conservation Foncière de Nador",           city: "Nador",        region: "Oriental-Rif" },
  { code: "BK", name: "Conservation Foncière de Berkane",         city: "Berkane",      region: "Oriental-Rif" },
  { code: "OZ", name: "Conservation Foncière de Ouarzazate",      city: "Ouarzazate",   region: "Drâa-Tafilalet" },
  { code: "ER", name: "Conservation Foncière d'Errachidia",       city: "Errachidia",   region: "Drâa-Tafilalet" },
  { code: "GU", name: "Conservation Foncière de Guelmim",         city: "Guelmim",      region: "Guelmim-Oued Noun" },
  { code: "LA", name: "Conservation Foncière de Laâyoune",        city: "Laâyoune",     region: "Laâyoune-Sakia El Hamra" },
  { code: "DK", name: "Conservation Foncière de Dakhla",          city: "Dakhla",       region: "Dakhla-Oued Ed-Dahab" },
];

// Regex : accepte les variantes les plus courantes
//   TF 12345/R · 12345/R · 12.345-R · T-12345-R · 12-345/MR
const TF_REGEX = /^\s*(?:t\.?f\.?\s*)?(\d+(?:[.\-\s]\d+)*)\s*[\/\-]\s*([a-z]{1,3})\s*$/i;

type Props = {
  value?: string;
  onChange?: (data: { raw: string; numero?: string; conservationCode?: string; conservation?: Conservation; valid: boolean }) => void;
};

export default function TitleFoncierInput({ value, onChange }: Props) {
  const [raw, setRaw] = useState<string>(value || "");
  const [touched, setTouched] = useState(false);

  const parsed = (() => {
    const m = raw.match(TF_REGEX);
    if (!m) return { valid: false };
    const numero = m[1].replace(/[^0-9]/g, "");
    const code = m[2].toUpperCase();
    const conservation = CONSERVATIONS.find(c => c.code === code);
    return { valid: !!conservation, numero, code, conservation };
  })();

  const handleChange = (v: string) => {
    setRaw(v);
    setTouched(true);
    onChange?.({
      raw: v,
      numero: parsed.numero,
      conservationCode: parsed.code,
      conservation: parsed.conservation,
      valid: parsed.valid,
    });
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div style={S.eyebrow}>📜 Source officielle (optionnel)</div>
        <div style={S.title}>Numéro du titre foncier (TF)</div>
        <div style={S.sub}>
          Si vous connaissez le N° de titre foncier de votre bien, indiquez-le ici.
          Format : <code style={S.code}>numéro/conservation</code> — ex.{" "}
          <code style={S.code}>12345/R</code> (Rabat), <code style={S.code}>56789/C</code> (Casablanca),{" "}
          <code style={S.code}>1234/MK</code> (Marrakech).
        </div>
      </div>

      <input
        type="text"
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="ex. 12345/R ou TF 56789/C"
        style={{
          ...S.input,
          borderColor: touched && raw && !parsed.valid ? "rgba(220,38,38,0.45)" :
                       parsed.valid ? "rgba(34,197,94,0.55)" : "rgba(201,162,39,0.35)",
        }}
      />

      {raw && touched && !parsed.valid && (
        <div style={S.warnBox}>
          ⚠ Format non reconnu. Attendu : <code>numéro/conservation</code> (ex.{" "}
          <code>12345/R</code>, <code>56789/C</code>, <code>1234/MK</code>).
        </div>
      )}

      {parsed.valid && parsed.conservation && (
        <div style={S.okBox}>
          <div style={{ fontWeight: 700, color: "#0B1B3A", marginBottom: 4 }}>
            ✓ TF n° {parsed.numero} — {parsed.conservation.name}
          </div>
          <div style={{ fontSize: 12, color: "rgba(11,27,58,0.7)" }}>
            Localisé à <strong>{parsed.conservation.city}</strong> · région <strong>{parsed.conservation.region}</strong>.
          </div>
        </div>
      )}

      <div style={S.disclosure}>
        <strong>ℹ Lookup automatique non disponible.</strong> L'ANCFCC ne publie pas
        de base de données ouverte des titres fonciers — la consultation détaillée
        (propriétaire, surface, coordonnées Lambert) est réservée aux notaires
        certifiés (10 DH/acte) et bientôt aux banques (plateforme blockchain
        annoncée 2026). En attendant, votre N° est transmis à l'expert
        CITURBAREA qui croisera les références lors du rapport. Pour aller plus
        loin, vous pouvez aussi uploader directement votre certificat de
        propriété (bloc précédent « Extrait Mohafadati / titre foncier »).
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    background: "linear-gradient(135deg, rgba(11,27,58,0.04), rgba(201,162,39,0.06))",
    border: "1px solid rgba(11,27,58,0.18)",
    borderLeft: "4px solid #0B1B3A",
    borderRadius: 14, padding: 18, margin: "16px 0",
  },
  header: { marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "rgba(11,27,58,0.65)", textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, color: "#0B1B3A", marginBottom: 6 },
  sub: { fontSize: 13, color: "rgba(11,27,58,0.75)", lineHeight: 1.55 },
  code: { background: "rgba(11,27,58,0.06)", padding: "1px 6px", borderRadius: 4, fontSize: 12, fontFamily: "ui-monospace, Menlo, Consolas, monospace" },
  input: {
    width: "100%", padding: "12px 14px",
    border: "1px solid rgba(201,162,39,0.35)",
    background: "#fff", borderRadius: 12, fontSize: 14, color: "#0B1B3A",
    outline: "none", fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    letterSpacing: "0.04em", boxSizing: "border-box",
  },
  warnBox: { marginTop: 10, fontSize: 12.5, color: "#92400e", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", padding: "9px 12px", borderRadius: 8, lineHeight: 1.55 },
  okBox: { marginTop: 10, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", padding: "10px 14px", borderRadius: 8, lineHeight: 1.6 },
  disclosure: { marginTop: 14, fontSize: 11.5, color: "rgba(11,27,58,0.72)", lineHeight: 1.65, background: "rgba(11,27,58,0.04)", border: "1px solid rgba(11,27,58,0.10)", padding: "10px 12px", borderRadius: 8 },
};
