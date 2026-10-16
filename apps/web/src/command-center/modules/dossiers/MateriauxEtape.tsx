/**
 * Matériaux d'une étape — carnet commun des matériaux du projet (table "DossierMateriau",
 * session Matériauthèque : functions/_lib/carnetMateriaux.ts, docs/architecture/contrat-carnet-materiaux.md).
 * L'architecte prescrit depuis la
 * matériauthèque (référentiel CIT + produits fournisseurs) et valide ; le client peut proposer
 * à partir de l'APD. Seules les lignes VALIDE entrent au carnet (CPS, DQE, planning d'achat).
 *   GET   /api/cc/dossiers/:id/materiaux?etape=<code>
 *   POST  /api/cc/dossiers/:id/materiaux            { code, source, refId, etapeCode } (ligne VALIDE : prescription de l'architecte)
 *   PATCH /api/cc/dossiers/:id/materiaux/<ligne>    { statut, motif }
 *   GET   /api/materiaux/recherche?q=&limite=
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";

type Ligne = { id: string; etapeCode: string | null; code: string; nom: string; categorie: string | null; unite: string | null; quantite: number | string | null; proposePar: string; statut: string; motif: string | null; origine?: string };
type Resultat = { code: string; nom: { fr: string; ar?: string }; categorie: string; unite: string; prixReference: { ref: number } | null; nbVariantes: number };

const LIB: Record<string, string> = { PROPOSE: "Proposé", EN_ETUDE: "En étude", VALIDE: "Validé", REFUSE: "Refusé", VARIANTE_PROPOSEE: "Variante proposée" };

export default function MateriauxEtape({ dossierId, etape }: { dossierId: string; etape: string }) {
  const base = `/api/cc/dossiers/${encodeURIComponent(dossierId)}/materiaux`;
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [indispo, setIndispo] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultat[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const r = await fetch(`${base}?etape=${encodeURIComponent(etape)}`, { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!r?.ok || !j?.ok) { setIndispo(true); setLignes([]); return; }
    setIndispo(false);
    const toutes = (j.lignes ?? []) as Ligne[];
    setLignes(toutes.filter((l) => l.etapeCode === etape));
  }, [base, etape]);
  useEffect(() => { void charger(); }, [charger]);

  const chercher = async () => {
    if (q.trim().length < 2) return;
    const r = await fetch(`/api/materiaux/recherche?q=${encodeURIComponent(q.trim())}&limite=20`, { cache: "no-store" }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setRes(j?.resultats ?? []);
  };
  const proposer = async (m: Resultat) => {
    setErreur(null);
    const r = await fetch(base, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: m.code, source: "referentiel", refId: m.code, etapeCode: etape }),
    }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (!r?.ok || j?.ok === false) setErreur(`Ajout impossible (${j?.error ?? r?.status ?? "réseau"}).`);
    await charger();
  };
  const statuer = async (l: Ligne, statut: "VALIDE" | "REFUSE") => {
    const motif = statut === "REFUSE" ? window.prompt("Motif du refus (visible du client)") : null;
    if (statut === "REFUSE" && !motif) return;
    await fetch(`${base}/${encodeURIComponent(l.id)}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ statut, motif }) }).catch(() => null);
    await charger();
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {indispo && <p style={S.petit}>Carnet des matériaux pas encore disponible (table du carnet à coller dans Neon, ou module en cours de livraison). La matériauthèque reste consultable :</p>}
      {lignes && lignes.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {lignes.map((l) => (
            <li key={l.id} style={{ padding: "6px 0", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13.5, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <b>{l.nom}</b> <span style={S.petit}>{l.code}{l.quantite ? ` · ${l.quantite} ${l.unite ?? ""}` : ""} · proposé par {l.proposePar === "CLIENT" ? "le client" : "l'architecte"} · {LIB[l.statut] ?? l.statut}{l.motif ? ` (${l.motif})` : ""}</span>
              {l.statut !== "VALIDE" && <button style={S.btn} onClick={() => void statuer(l, "VALIDE")}>Valider</button>}
              {l.statut !== "REFUSE" && <button style={S.btnGhost} onClick={() => void statuer(l, "REFUSE")}>Refuser</button>}
            </li>
          ))}
        </ul>
      )}
      {lignes && lignes.length === 0 && !indispo && <p style={S.petit}>Aucun matériau proposé pour cette étape.</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={S.input} value={q} placeholder="Chercher dans la matériauthèque (ex. carrelage, ciment)" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void chercher(); }} />
        <button style={S.btnGhost} onClick={() => void chercher()}>Chercher</button>
        <a style={S.lien} href={`/materiaux?dossier=${encodeURIComponent(dossierId)}&etape=${encodeURIComponent(etape)}`} target="_blank" rel="noopener noreferrer">Ouvrir la matériauthèque</a>
      </div>
      {res.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {res.map((m) => (
            <li key={m.code} style={{ padding: "5px 0", fontSize: 13.5, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {m.nom.fr} <span style={S.petit}>{m.code} · {m.unite}{m.prixReference ? ` · réf. ${m.prixReference.ref} DH` : ""}{m.nbVariantes ? ` · ${m.nbVariantes} produit(s) fournisseur` : ""}</span>
              <button style={S.btn} disabled={indispo} onClick={() => void proposer(m)}>Prescrire pour cette étape</button>
            </li>
          ))}
        </ul>
      )}
      {erreur && <p style={{ ...S.petit, color: CC.color.danger }}>{erreur}</p>}
    </div>
  );
}

const S = {
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.5, margin: 0 } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34, flex: "1 1 260px" } as React.CSSProperties,
  btn: { padding: "5px 11px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 12.5, minHeight: 32 } as React.CSSProperties,
  btnGhost: { padding: "5px 11px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 12.5, minHeight: 32 } as React.CSSProperties,
  lien: { color: CC.color.info, fontSize: 13, fontWeight: 600, textDecoration: "none", alignSelf: "center" } as React.CSSProperties,
};
