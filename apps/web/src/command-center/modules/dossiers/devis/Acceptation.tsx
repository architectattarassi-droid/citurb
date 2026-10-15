/**
 * Acceptation d'un devis émis par l'admin (spec §6.2) : pack retenu (exactement un),
 * prestations facultatives commandées (règle 4), date, et devis signé scanné
 * obligatoire (déposé dans le dépôt commun). L'acceptation crée l'échéancier par phase.
 * Le client peut aussi accepter en ligne depuis son espace (horodaté).
 */
import React, { useMemo, useState } from "react";
import { CC } from "../../../theme/tokens";
import { calculerDevisComplet, type ContexteProjet, type EntreeDevisComplet } from "../../../../domain/honoraires/devisComplet";
import { formatDH } from "../../../../domain/honoraires/decimal";
import { lignesAcceptees } from "../../../../domain/honoraires/acceptation";
import { GRILLE_ARC_BATI_2026_10 as GRILLE } from "../../../../domain/honoraires/grilleArcBati";

export async function fichierEnBase64(f: File): Promise<string> {
  const url = await new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ko(r.error); r.readAsDataURL(f); });
  return url.slice(url.indexOf(",") + 1);
}

export default function Acceptation({ devisId, entree, ctx, onFait }: { devisId: string; entree: EntreeDevisComplet; ctx: ContexteProjet; onFait: () => void }) {
  const calc = useMemo(() => calculerDevisComplet(entree, GRILLE, ctx), [entree, ctx]);
  const [pack, setPack] = useState<string>("");
  const [commandees, setCommandees] = useState<string[]>([]);
  const [horsHonoraires, setHorsHonoraires] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  if (!calc.ok) return <div style={S.avert}>Devis non recalculable : {calc.questions.join(" ; ")}</div>;
  const r = calc.resultat;
  const facultatives = r.lignes.filter((l) => l.caractere !== "OBLIGATOIRE" && l.montant && !(r.presentation === "PACKS" && !l.horsHonoraires));
  const apercu = lignesAcceptees(r, GRILLE, { pack: (pack || null) as never, commandees, inclureHorsHonoraires: horsHonoraires });

  const accepter = async () => {
    if (!fichier) { setErreur("Joindre le devis signé scanné (PDF, JPEG ou WebP)."); return; }
    setOccupe(true); setErreur(null);
    try {
      const contenu = await fichierEnBase64(fichier);
      const res = await fetch(`/api/cc/devis/${encodeURIComponent(devisId)}`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accepter", pack: pack || null, commandees, inclureHorsHonoraires: horsHonoraires, dateAcceptation: date, justificatif: { nom: fichier.name, contenu } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || j.error || `Erreur ${res.status}`);
      onFait();
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };

  return (
    <section style={S.carte}>
      <div style={S.h3}>Acceptation du devis</div>
      {r.presentation === "PACKS" && (
        <label style={S.champ}><span style={S.label}>Pack retenu (un seul)</span>
          <select value={pack} onChange={(e) => setPack(e.target.value)} style={S.input}>
            <option value="">— choisir —</option>
            {r.packs.map((p) => <option key={p.code} value={p.code}>{p.libelle} — {formatDH(p.montant)} HT</option>)}
          </select>
        </label>
      )}
      {facultatives.length > 0 && (
        <div style={{ margin: "6px 0" }}>
          <div style={S.label}>Prestations facultatives commandées (non cochée = non facturée)</div>
          {facultatives.map((l) => (
            <label key={l.code} style={S.case}>
              <input type="checkbox" checked={commandees.includes(l.code)} onChange={(e) => setCommandees((c) => (e.target.checked ? [...c, l.code] : c.filter((x) => x !== l.code)))} />
              {l.libelle} — {formatDH(l.montant!)}{l.horsHonoraires ? " (hors honoraires)" : ""}
            </label>
          ))}
        </div>
      )}
      <label style={S.case}><input type="checkbox" checked={horsHonoraires} onChange={(e) => setHorsHonoraires(e.target.checked)} /> Facturer aussi les prestations hors honoraires (BET, laboratoire, géomètre) par CITURBAREA — à trancher, non par défaut</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={S.champ}><span style={S.label}>Date d'acceptation</span><input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} style={S.input} /></label>
        <label style={S.champ}><span style={S.label}>Devis signé scanné (obligatoire)</span><input type="file" accept="application/pdf,image/jpeg,image/webp" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} /></label>
      </div>
      <p style={S.aide}>{apercu.ok ? `Montant engagé : ${formatDH(apercu.total)} HT — l'échéancier par phase sera proposé selon les modalités du devis.` : apercu.erreur}</p>
      {erreur && <div style={S.erreur}>{erreur}</div>}
      <button style={{ ...S.btn, opacity: apercu.ok && !occupe ? 1 : 0.5 }} disabled={!apercu.ok || occupe} onClick={() => void accepter()}>{occupe ? "Enregistrement…" : "Enregistrer l'acceptation"}</button>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radius, padding: 12, margin: "10px 0" },
  h3: { fontWeight: 600, color: CC.color.navy, marginBottom: 8 },
  champ: { display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 },
  label: { fontSize: 12, color: CC.color.inkMid },
  case: { display: "flex", gap: 6, alignItems: "center", fontSize: 13, margin: "3px 0" },
  aide: { fontSize: 12, color: CC.color.inkMid, margin: "6px 0" },
  input: { padding: "6px 8px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff" },
  btn: { padding: "8px 14px", borderRadius: 6, border: 0, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 },
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
  avert: { background: CC.color.warnBg, color: CC.color.warn, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
};
