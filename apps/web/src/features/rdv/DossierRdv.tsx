/**
 * Dossier du rendez-vous : formulaire du client (sections repliables) et
 * résumé en lecture pour l'architecte (back-office).
 */
import React from "react";
import { CHAMPS, SECTIONS, valeurEnvoyee, type ChampUi } from "./dossier";

type Valeurs = Record<string, unknown>;
const champ = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base";

function Saisie({ c, v, onChange }: { c: ChampUi; v: unknown; onChange: (v: unknown) => void }) {
  if (c.type === "case") {
    return (
      <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-800">
        <input type="checkbox" checked={v === true} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0" />
        {c.libelle}
      </label>
    );
  }
  if (c.type === "choix") {
    return (
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold text-slate-700">{c.libelle}</legend>
        <div className="flex flex-wrap gap-2">
          {c.options!.map(([k, l]) => {
            const actif = String(v ?? "") === k;
            return (
              <button key={k} type="button" aria-pressed={actif} onClick={() => onChange(actif ? "" : valeurEnvoyee(c, k))}
                className={`min-h-[44px] rounded-full border px-3 text-sm ${actif ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  const commun = { id: `dossier-${c.cle}` };
  return (
    <label htmlFor={commun.id} className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{c.libelle}{c.aide && <span className="font-normal text-slate-500"> — {c.aide}</span>}</span>
      {c.type === "zone" ? (
        <textarea {...commun} value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={2000} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-normal" />
      ) : c.type === "nombre" ? (
        <span className="flex items-center gap-2">
          <input {...commun} inputMode="numeric" value={typeof v === "number" ? String(v) : ""} className={champ + " font-normal"}
            onChange={(e) => { const t = e.target.value.replace(/[^0-9]/g, ""); onChange(t ? Number(t) : ""); }} />
          {c.suffixe && <span className="shrink-0 font-normal text-slate-500">{c.suffixe}</span>}
        </span>
      ) : (
        <input {...commun} value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={80} className={champ + " font-normal"} />
      )}
    </label>
  );
}

/** Formulaire du client, sections repliables. */
export function FormulaireDossier({ valeurs, onChange, desactive }: { valeurs: Valeurs; onChange: (cle: string, v: unknown) => void; desactive?: boolean }) {
  return (
    <fieldset disabled={desactive} className="m-0 grid gap-3 border-0 p-0">
      {SECTIONS.map((s, i) => {
        const remplis = s.champs.filter((c) => valeurs[c.cle] !== undefined && valeurs[c.cle] !== "" && valeurs[c.cle] !== false).length;
        return (
          <details key={s.id} open={i === 0} className="group rounded-xl border border-slate-200 bg-white">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold text-[#0B1B3A]">
              <span>{s.titre}</span>
              <span className="text-xs font-normal text-slate-500">{remplis}/{s.champs.length} <span aria-hidden="true" className="inline-block transition group-open:rotate-180">▾</span></span>
            </summary>
            <div className="grid gap-4 border-t border-slate-100 px-4 py-4">
              {s.champs.map((c) => <Saisie key={c.cle} c={c} v={valeurs[c.cle]} onChange={(v) => onChange(c.cle, v)} />)}
            </div>
          </details>
        );
      })}
    </fieldset>
  );
}

const libelleValeur = (c: ChampUi, v: unknown): string => {
  if (c.type === "case") return v === true ? "oui" : "";
  if (c.type === "choix") return c.options!.find(([k]) => k === String(v))?.[1] ?? String(v);
  if (typeof v === "number") return `${v.toLocaleString("fr-FR")}${c.suffixe ? ` ${c.suffixe}` : ""}`;
  return String(v ?? "");
};

/** Résumé en lecture (back-office) : seulement les champs remplis. */
export function ResumeDossier({ valeurs }: { valeurs: Valeurs }) {
  const lignes = CHAMPS.filter((c) => valeurs[c.cle] !== undefined && valeurs[c.cle] !== "" && valeurs[c.cle] !== false);
  if (!lignes.length) return <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Le client n'a encore rien rempli.</p>;
  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(120px, 40%) 1fr", gap: "6px 12px", fontSize: 13 }}>
      {lignes.map((c) => (
        <React.Fragment key={c.cle}>
          <dt style={{ color: "#64748b" }}>{c.type === "case" ? "Document" : c.libelle}</dt>
          <dd style={{ margin: 0, fontWeight: 600, whiteSpace: "pre-line" }}>{c.type === "case" ? c.libelle : libelleValeur(c, valeurs[c.cle])}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
