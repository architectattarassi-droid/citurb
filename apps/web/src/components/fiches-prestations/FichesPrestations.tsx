/**
 * FichesPrestations.tsx — Fiches détaillées "Que comprend la prestation ?"
 *
 * Affiche les phases / tâches / lots de chaque métier (archi, topo, BE) à
 * partir du référentiel `data/prestations.ts`. Trois tabs en desktop, un
 * accordéon empilé en mobile (<768px). Toutes les chaînes sont traduites via
 * `useT()`.
 *
 * Usage :
 *   <FichesPrestations porte="P1" />
 *
 * La prop `porte` n'influence aujourd'hui que la note d'intro affichée en
 * tête (clé `prestations.note_porte_p1|p2|p3`). Le contenu des phases est
 * identique quelle que soit la porte — la doctrine BTP ne change pas.
 */

import React, { useState } from "react";
import { useT } from "../../i18n/i18n";
import { PRESTATIONS, type PrestationMetier, type PrestationPhase } from "../../data/prestations";

interface Props {
  porte: "P1" | "P2" | "P3";
}

const METIERS: { key: PrestationMetier; labelKey: string }[] = [
  { key: "archi", labelKey: "prestations.tabs.architecte" },
  { key: "topo", labelKey: "prestations.tabs.topographe" },
  { key: "be", labelKey: "prestations.tabs.be" },
];

const STYLES = `
.fp-root { width: 100%; padding: 24px 0; }
.fp-intro { margin: 0 0 20px 0; padding: 14px 18px; background: #f3f6fb; border-left: 4px solid #1e3a5f; border-radius: 6px; color: #1a2540; font-size: 15px; line-height: 1.55; }
.fp-tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e6ee; margin-bottom: 20px; }
.fp-tab { background: transparent; border: none; padding: 12px 18px; font-size: 15px; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; }
.fp-tab[aria-selected="true"] { color: #1e3a5f; border-bottom-color: #1e3a5f; }
.fp-tab:hover { color: #1e3a5f; }
.fp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.fp-card { border: 1px solid #e2e6ee; border-radius: 10px; padding: 18px 20px; background: #fff; }
.fp-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.fp-card-num { width: 32px; height: 32px; border-radius: 50%; background: #1e3a5f; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
.fp-card-title { font-size: 16px; font-weight: 600; color: #1a2540; margin: 0; line-height: 1.3; }
.fp-list { list-style: disc; padding-left: 22px; margin: 8px 0 0 0; }
.fp-list li { font-size: 14px; line-height: 1.55; color: #2c3a52; margin-bottom: 4px; }
.fp-sublist-title { font-size: 13px; font-weight: 600; color: #1e3a5f; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: .04em; }
.fp-sublist { list-style: square; padding-left: 22px; margin: 0; }
.fp-sublist li { font-size: 13px; line-height: 1.5; color: #4a5568; margin-bottom: 3px; }
.fp-note { margin-top: 10px; padding: 8px 12px; background: #fff8e1; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 13px; color: #5c4400; line-height: 1.5; }

/* Mobile accordion */
.fp-acc { display: none; }
.fp-acc-item { border: 1px solid #e2e6ee; border-radius: 10px; margin-bottom: 10px; overflow: hidden; background: #fff; }
.fp-acc-head { width: 100%; background: #f8fafc; border: none; padding: 14px 16px; font-size: 15px; font-weight: 600; color: #1a2540; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.fp-acc-head[aria-expanded="true"] { background: #1e3a5f; color: #fff; }
.fp-acc-caret { font-size: 18px; line-height: 1; }
.fp-acc-body { padding: 14px 16px; }

@media (max-width: 768px) {
  .fp-tabs { display: none; }
  .fp-grid { display: none; }
  .fp-acc { display: block; }
  .fp-intro { font-size: 14px; padding: 12px 14px; }
  .fp-card { padding: 14px 16px; }
}
`;

function Card({ phase, t }: { phase: PrestationPhase; t: (k: string) => string }) {
  return (
    <div className="fp-card">
      <div className="fp-card-head">
        <span className="fp-card-num">{phase.number}</span>
        <h4 className="fp-card-title">{t(phase.titleKey)}</h4>
      </div>
      <ul className="fp-list">
        {phase.deliverableKeys.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
      {phase.pvCadenceKeys && phase.pvCadenceKeys.length > 0 && (
        <>
          <div className="fp-sublist-title">{t("prestations.archi.phase_7.pv.title")}</div>
          <ul className="fp-sublist">
            {phase.pvCadenceKeys.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </>
      )}
      {phase.noteKey && <div className="fp-note">{t(phase.noteKey)}</div>}
    </div>
  );
}

const FichesPrestations: React.FC<Props> = ({ porte }) => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<PrestationMetier>("archi");
  const [expanded, setExpanded] = useState<string | null>("archi");

  const noteKey =
    porte === "P1"
      ? "prestations.note_porte_p1"
      : porte === "P2"
        ? "prestations.note_porte_p2"
        : "prestations.note_porte_p3";

  const phases = PRESTATIONS[activeTab];

  return (
    <div className="fp-root cit-container-wide">
      <style>{STYLES}</style>
      <p className="fp-intro">{t(noteKey)}</p>

      {/* Desktop : tabs */}
      <div className="fp-tabs" role="tablist">
        {METIERS.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={activeTab === m.key}
            className="fp-tab"
            onClick={() => setActiveTab(m.key)}
            type="button"
          >
            {t(m.labelKey)}
          </button>
        ))}
      </div>
      <div className="fp-grid">
        {phases.map((p) => (
          <Card key={p.id} phase={p} t={t} />
        ))}
      </div>

      {/* Mobile : accordion */}
      <div className="fp-acc">
        {METIERS.map((m) => {
          const isOpen = expanded === m.key;
          return (
            <div key={m.key} className="fp-acc-item">
              <button
                type="button"
                className="fp-acc-head"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : m.key)}
              >
                <span>{t(m.labelKey)}</span>
                <span className="fp-acc-caret">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="fp-acc-body">
                  {PRESTATIONS[m.key].map((p) => (
                    <Card key={p.id} phase={p} t={t} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FichesPrestations;
