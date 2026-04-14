import React, { useMemo, useState } from "react";

export default function SimulatorPage() {
  const [ville, setVille] = useState("Kénitra");
  const [zone, setZone] = useState("villa");
  const [surface, setSurface] = useState(300);
  const [facades, setFacades] = useState(1);

  const result = useMemo(() => {
    const rules: Record<string, { cos: number; floors: number }> = {
      villa: { cos: 0.4, floors: 2 },
      immeuble: { cos: 0.6, floors: 4 },
      mixte: { cos: 0.5, floors: 3 },
    };
    const r = rules[zone] || rules.villa;
    const bonus = facades >= 2 ? 1.05 : 1;
    const surfaceConstructible = Math.round(surface * r.cos * bonus);
    return {
      surfaceConstructible,
      etagesMax: r.floors,
      surfaceTotale: surfaceConstructible * (r.floors + 1),
      ville,
    };
  }, [ville, zone, surface, facades]);

  return (
    <div style={styles.root}>
      <div style={styles.box}>
        <h1 style={styles.title}>Simulateur de constructibilité</h1>
        <div style={styles.grid}>
          <label style={styles.field}>Ville<select value={ville} onChange={(e) => setVille(e.target.value)} style={styles.input}><option>Kénitra</option><option>Rabat</option><option>Salé</option></select></label>
          <label style={styles.field}>Zone<select value={zone} onChange={(e) => setZone(e.target.value)} style={styles.input}><option value="villa">Villa</option><option value="immeuble">Immeuble</option><option value="mixte">Mixte</option></select></label>
          <label style={styles.field}>Surface terrain<input type="number" value={surface} onChange={(e) => setSurface(Number(e.target.value || 0))} style={styles.input} /></label>
          <label style={styles.field}>Nombre de façades<input type="number" value={facades} onChange={(e) => setFacades(Number(e.target.value || 1))} style={styles.input} /></label>
        </div>

        <div style={styles.result}>
          <div style={styles.resultRow}><span>Ville</span><b>{result.ville}</b></div>
          <div style={styles.resultRow}><span>Surface constructible</span><b>{result.surfaceConstructible} m²</b></div>
          <div style={styles.resultRow}><span>Étages max</span><b>R+{result.etagesMax}</b></div>
          <div style={styles.resultRow}><span>Surface totale potentielle</span><b>{result.surfaceTotale} m²</b></div>
        </div>

        <a href="/cc" style={styles.link}>Retour au cockpit</a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0a0c10', color: '#e8eaf0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 40 },
  box: { width: '100%', maxWidth: 920, background: '#0d1017', border: '1px solid #1e2330', borderRadius: 12, padding: 24 },
  title: { marginTop: 0 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 8, color: '#8892a4', fontSize: 12 },
  input: { background: '#131820', color: '#e8eaf0', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px' },
  result: { marginTop: 24, display: 'grid', gap: 10 },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#131820', borderRadius: 8 },
  link: { display: 'inline-block', marginTop: 20, color: '#00d4aa' },
};
