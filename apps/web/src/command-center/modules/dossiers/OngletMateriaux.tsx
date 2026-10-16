/**
 * Onglet « Matériaux » de la fiche dossier (/cc/dossiers/:id) : propositions du
 * client (à partir de l'APD) et carnet des matériaux du projet. Seul l'architecte
 * maître d'œuvre statue : en étude, validé, refusé (motif obligatoire), variante.
 * Chaque décision est journalisée ; le client est prévenu par la messagerie.
 * Routes : /api/cc/dossiers/:id/materiaux (contrat docs/architecture/contrat-carnet-materiaux.md).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CC } from "../../theme/tokens";
import { fournitureEstimee, phasesAchat, type LigneCarnet } from "../../../domain/materiaux/carnet";
import { LOTS } from "../../../domain/chiffrage/lots";
import { PHASE_REAL } from "../../../domain/materiaux/phases";
import { prixReference, slugMateriau } from "../../../domain/materiaux/reference";
import { rechercherMateriaux } from "../../../domain/materiaux/recherche";

const LIB: Record<string, [string, string]> = {
  PROPOSE: ["Proposé par le client", CC.color.warn], EN_ETUDE: ["En étude", CC.color.navy], VALIDE: ["Validé — au carnet", CC.color.success],
  REFUSE: ["Refusé", CC.color.danger], VARIANTE_PROPOSEE: ["Variante proposée", CC.color.or],
};
const ERREURS: Record<string, string> = {
  sql_a_coller: "Table du carnet absente : collez docs/sql/TOUT-NEON.sql (ou carnet-materiaux-neon.sql) dans la console Neon.",
  motif_obligatoire: "Le motif est obligatoire pour un refus.", variante_inconnue: "Code de variante inconnu.", transition_interdite: "Décision déjà rendue : rouvrez d'abord « En étude ».",
  storage_unavailable: "Base indisponible.",
};
const dh = (n: number | null) => (n == null ? "—" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)} DH`);
const S = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radiusLg, padding: 14, marginBottom: 10 } as React.CSSProperties,
  btn: (c: string): React.CSSProperties => ({ padding: "6px 10px", borderRadius: 6, border: `1px solid ${c}`, background: "#fff", color: c, cursor: "pointer", fontSize: 13 }),
  input: { padding: "6px 8px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13 } as React.CSSProperties,
  petit: { fontSize: 12, color: CC.color.inkMid } as React.CSSProperties,
};

async function appel<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init.body ? { "content-type": "application/json" } : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(ERREURS[j.error] || j.error || `Erreur ${r.status}`);
  return j as T;
}

export default function OngletMateriaux({ dossierId }: { dossierId: string }) {
  const [lignes, setLignes] = useState<LigneCarnet[] | null>(null);
  const [erreur, setErreur] = useState("");
  const base = `/api/cc/dossiers/${encodeURIComponent(dossierId)}/materiaux`;
  const charger = useCallback(() => {
    appel<{ lignes: LigneCarnet[] }>(base).then((j) => { setLignes(j.lignes); setErreur(""); }).catch((e: Error) => { setLignes([]); setErreur(e.message); });
  }, [base]);
  useEffect(charger, [charger]);

  const decider = async (l: LigneCarnet, corps: Record<string, unknown>) => {
    try { await appel(`${base}/${encodeURIComponent(l.id)}`, { method: "PATCH", body: JSON.stringify(corps) }); charger(); }
    catch (e) { setErreur((e as Error).message); }
  };

  const enAttente = (lignes || []).filter((l) => l.statut === "PROPOSE" || l.statut === "EN_ETUDE");
  const autres = (lignes || []).filter((l) => !enAttente.includes(l));
  return (
    <div>
      <p style={S.petit}>Le client propose à partir de l'avant-projet détaillé ; seule la validation de l'architecte fait entrer un matériau dans le carnet du projet (CPS, DQE, planning d'achat).</p>
      {erreur && <p style={{ color: CC.color.danger }}>{erreur}</p>}
      {lignes === null ? <p>Chargement…</p> : (
        <>
          <h3 style={{ margin: "12px 0 6px" }}>À valider ({enAttente.length})</h3>
          {enAttente.length === 0 && <p style={S.petit}>Aucune proposition en attente.</p>}
          {enAttente.map((l) => <Ligne key={l.id} l={l} decider={decider} />)}
          <h3 style={{ margin: "16px 0 6px" }}>Carnet et décisions ({autres.length})</h3>
          {autres.map((l) => <Ligne key={l.id} l={l} decider={decider} />)}
          <Prescrire base={base} apres={charger} />
        </>
      )}
    </div>
  );
}

function Ligne({ l, decider }: { l: LigneCarnet; decider: (l: LigneCarnet, c: Record<string, unknown>) => Promise<void> }) {
  const [motif, setMotif] = useState("");
  const [variante, setVariante] = useState("");
  const ref = prixReference(l.code);
  const phases = phasesAchat(l.code);
  const fourniture = fournitureEstimee(l);
  const ouvert = l.statut === "PROPOSE" || l.statut === "EN_ETUDE";
  const [lib, couleur] = LIB[l.statut] || [l.statut, CC.color.inkMid];
  const choix = useMemo(() => (variante.length >= 2 ? rechercherMateriaux({ texte: variante, limite: 8 }).resultats : []), [variante]);
  return (
    <div style={S.carte}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong>{l.nom} <a href={`/materiaux/${slugMateriau(l.code)}`} target="_blank" rel="noreferrer" style={S.petit}>{l.code} ↗</a></strong>
        <span style={{ color: couleur, fontWeight: 600, fontSize: 13 }}>{lib}</span>
      </div>
      <div style={S.petit}>
        {l.proposePar === "CLIENT" ? "Proposé par le client" : "Prescrit par l'architecte"}{l.etapeCode ? ` · étape ${l.etapeCode}` : ""} · {new Date(l.proposeLe).toLocaleDateString("fr-FR")}
        {l.lot ? ` · lot ${LOTS.find((x) => x.code === l.lot)?.libelle || l.lot}` : ""}{l.emplacement ? ` · ${l.emplacement}` : ""}
      </div>
      <div style={{ fontSize: 13, marginTop: 4 }}>
        Quantité indicative : {l.quantite ?? "—"} {l.unite || ""} · prix de référence {ref ? `${dh(ref.ref)} HT/${l.unite} (fiabilité ${ref.fiabilite})` : "sur demande"}
        {fourniture != null ? ` · fourniture estimée ${dh(fourniture)} HT (impact sur le lot, hors pose)` : ""}
        {phases.length ? ` · achat : ${phases.map((p) => PHASE_REAL[p].libelle.fr).join(", ")}` : ""}
      </div>
      {l.note && <p style={{ fontSize: 13, margin: "4px 0" }}>« {l.note} »</p>}
      {l.motif && <p style={{ ...S.petit, margin: "4px 0" }}>Motif : {l.motif}</p>}
      {l.varianteCode && <p style={{ ...S.petit, margin: "4px 0" }}>Variante : {l.varianteCode}</p>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
        {ouvert ? (
          <>
            {l.statut === "PROPOSE" && <button type="button" style={S.btn(CC.color.navy)} onClick={() => decider(l, { statut: "EN_ETUDE" })}>Mettre en étude</button>}
            <button type="button" style={S.btn(CC.color.success)} onClick={() => decider(l, { statut: "VALIDE" })}>Valider</button>
            <input style={{ ...S.input, minWidth: 200 }} placeholder="Motif (obligatoire pour refuser)" value={motif} onChange={(e) => setMotif(e.target.value)} />
            <button type="button" style={S.btn(CC.color.danger)} onClick={() => decider(l, { statut: "REFUSE", motif })}>Refuser</button>
            <input style={S.input} placeholder="Variante : rechercher…" value={variante} onChange={(e) => setVariante(e.target.value)} list={`var-${l.id}`} />
            <datalist id={`var-${l.id}`}>{choix.map((c) => <option key={c.code} value={c.code}>{c.nom.fr}</option>)}</datalist>
            <button type="button" style={S.btn(CC.color.or)} onClick={() => decider(l, { statut: "VARIANTE_PROPOSEE", varianteCode: variante.trim(), motif })}>Proposer la variante</button>
          </>
        ) : (
          <button type="button" style={S.btn(CC.color.navy)} onClick={() => decider(l, { statut: "EN_ETUDE" })}>Rouvrir en étude</button>
        )}
      </div>
    </div>
  );
}

/** L'architecte ajoute directement un matériau au carnet (statut VALIDE). */
function Prescrire({ base, apres }: { base: string; apres: () => void }) {
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [lot, setLot] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [quantite, setQuantite] = useState("");
  const [msg, setMsg] = useState("");
  const choix = useMemo(() => (q.length >= 2 ? rechercherMateriaux({ texte: q, lot: lot || null, limite: 12 }).resultats : []), [q, lot]);
  const envoyer = async () => {
    setMsg("");
    try {
      await appel(base, { method: "POST", body: JSON.stringify({ code, lot: lot || null, emplacement, quantite: quantite || null }) });
      setQ(""); setCode(""); setEmplacement(""); setQuantite(""); setMsg("Ajouté au carnet."); apres();
    } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div style={{ ...S.carte, marginTop: 16 }}>
      <strong>Prescrire un matériau (ajout direct au carnet)</strong>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <select style={S.input} value={lot} onChange={(e) => setLot(e.target.value)}>
          <option value="">Lot : tous</option>
          {LOTS.map((l) => <option key={l.code} value={l.code}>{l.libelle}</option>)}
        </select>
        <input style={{ ...S.input, minWidth: 220 }} placeholder="Rechercher dans la matériauthèque…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...S.input, minWidth: 260 }} value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">— choisir —</option>
          {choix.map((c) => <option key={c.code} value={c.code}>{c.nom.fr} ({c.code})</option>)}
        </select>
        <input style={S.input} placeholder="Emplacement" value={emplacement} onChange={(e) => setEmplacement(e.target.value)} />
        <input style={{ ...S.input, width: 90 }} placeholder="Quantité" inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        <button type="button" style={S.btn(CC.color.navy)} disabled={!code} onClick={envoyer}>Ajouter</button>
      </div>
      {msg && <p style={S.petit}>{msg}</p>}
    </div>
  );
}
