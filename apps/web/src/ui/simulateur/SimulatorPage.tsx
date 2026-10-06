import React, { useCallback, useMemo, useState } from "react";
import { useT } from "../../i18n/i18n";
import LeadCaptureForm from "../../features/lead-funnel/LeadCaptureForm";
import type { CaptureBody } from "../../features/lead-funnel/leadBridge";

export default function SimulatorPage() {
  const t = useT();
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

  // Paramètres et résultat du calcul, joints au lead (meta.wizard).
  const extraMeta = useMemo(
    () => ({
      simulateur: {
        ville,
        zone,
        surfaceTerrainM2: surface,
        facades,
        surfaceConstructibleM2: result.surfaceConstructible,
        etagesMax: `R+${result.etagesMax}`,
        surfaceTotaleM2: result.surfaceTotale,
      },
    }),
    [ville, zone, surface, facades, result],
  );
  const extraCapture = useCallback(
    (): Partial<CaptureBody> => ({ ville, surface: surface > 0 ? surface : undefined }),
    [ville, surface],
  );
  // Villa → projet personnel / familial (P1) ; immeuble, mixte → projet immobilier (P2).
  const porteType = zone === "villa" ? "P1" : "P2";

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

        <section style={styles.lead} aria-labelledby="sim-lead-title">
          <h2 id="sim-lead-title" style={styles.leadTitle}>{t("lead.sim.title")}</h2>
          <p style={styles.leadIntro}>{t("lead.sim.intro")}</p>
          {/* Le formulaire est sur fond clair : on rétablit une couleur de texte sombre. */}
          {/* styles/citurbarea.css applique un reset global non « layered »
              (* { margin:0; padding:0 }) qui l'emporte sur les utilitaires
              Tailwind v4 : on rétablit les espacements du formulaire ici. */}
          <style>{SIM_LEAD_CSS}</style>
          <div className="sim-lead" style={styles.leadForm}>
            <LeadCaptureForm
              source="WEB_SIMULATEUR"
              porteType={porteType}
              withEmail
              extraCapture={extraCapture}
              extraMeta={extraMeta}
            />
          </div>
        </section>

        <a href="/" style={styles.link}>{t("lead.page.back")}</a>
      </div>
    </div>
  );
}

const SIM_LEAD_CSS = `
.sim-lead form, .sim-lead [role="status"] { padding: 20px; }
.sim-lead form .space-y-3 > * + * { margin-top: 12px; }
.sim-lead label { margin-bottom: 4px; }
.sim-lead input, .sim-lead textarea { padding: 10px 12px; font-family: inherit; }
.sim-lead button { padding: 12px 16px; }
.sim-lead [role="status"] > * + * { margin-top: 8px; }
.sim-lead [role="status"] a { padding: 10px 14px; }
`;

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0a0c10', color: '#e8eaf0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 'clamp(12px, 4vw, 40px)' },
  box: { width: '100%', maxWidth: 920, background: '#0d1017', border: '1px solid #1e2330', borderRadius: 12, padding: 'clamp(16px, 4vw, 24px)', boxSizing: 'border-box' },
  title: { marginTop: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 8, color: '#8892a4', fontSize: 12 },
  input: { background: '#131820', color: '#e8eaf0', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', fontSize: 16 },
  result: { marginTop: 24, display: 'grid', gap: 10 },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#131820', borderRadius: 8 },
  lead: { marginTop: 28, paddingTop: 24, borderTop: '1px solid #1e2330' },
  leadTitle: { margin: '0 0 8px', fontSize: 20, color: '#e8eaf0' },
  leadIntro: { margin: '0 0 16px', color: '#8892a4', fontSize: 14, lineHeight: 1.5, maxWidth: 640 },
  leadForm: { color: '#0f172a', maxWidth: 448 },
  link: { display: 'inline-block', marginTop: 20, color: '#00d4aa' },
};
