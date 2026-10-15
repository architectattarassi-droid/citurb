/**
 * En-tête de chaque phase P.. de la fiche dossier (décisions du fondateur du 15/10/2026) :
 *   - paiement : devis lié, factures de la phase et leur statut, date de démarrage réelle ;
 *     « En attente de paiement » = point d'arrêt, déblocage motivé par l'admin
 *     (POST /api/cc/dossiers/:id/facturation { action: "debloquer", phase, motif }, session Devis & facturation) ;
 *   - P04 : enregistrer une révision du permis (observations, modificatif) → mise à jour du DEXE ;
 *   - P05 : mise à jour du DEXE suite au permis (journal des écarts, pièces à reprendre, clôture).
 */
import React, { useState } from "react";
import { CC } from "../../theme/tokens";

export type Paiement = {
  phase: string; statut: "NON_DUE" | "A_EMETTRE" | "EMISE" | "PARTIELLE" | "PAYEE" | "EN_RETARD"; du: string; paye: string; restant: string; estime: boolean;
  devis: Array<{ id: string; numero: string | null }>; factures: Array<{ id: string; numero: string; statut: string; restant: string; dateEcheance: string }>;
  bloquante: boolean; deblocage: { motif: string; par: string; le: string } | null; aucuneEcheance: boolean; dateDemarrage: string | null;
};
export type MajDexe = { ouverte: boolean; ouverteLe: string; declencheur: string; ecarts: Array<{ le: string; par: string; texte: string; source: string }>; piecesAReprendre: string[]; clotureLe?: string | null };

const LIB: Record<Paiement["statut"], { lib: string; fond: string; texte: string }> = {
  NON_DUE: { lib: "Pas encore due", fond: "#F2F4F7", texte: "#475467" }, A_EMETTRE: { lib: "Facture à émettre", fond: "#FFF6E0", texte: "#93370D" },
  EMISE: { lib: "Facture émise", fond: "#EEF4FF", texte: "#1F3864" }, PARTIELLE: { lib: "Payée partiellement", fond: "#FFF6E0", texte: "#93370D" },
  PAYEE: { lib: "Payée", fond: "#E7F6EC", texte: "#067647" }, EN_RETARD: { lib: "En retard", fond: "#FDECEC", texte: "#B42318" },
};
const dh = (s: string) => `${Number(s).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
const dateFr = (s: string | null | undefined) => (s ? new Date(s.length === 10 ? `${s}T00:00:00Z` : s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function BlocPhase({ dossierId, phase, paiement, majDexe, occupe, agir, recharger, setErreur }: {
  dossierId: string; phase: string; paiement: Paiement | null; majDexe: MajDexe | null; occupe: boolean;
  agir: (c: Record<string, unknown>, m: string) => Promise<void>; recharger: () => Promise<void>; setErreur: (e: string) => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const debloquer = async () => {
    const motif = window.prompt("Débloquer le démarrage de la phase sans paiement : motif écrit (10 caractères au moins, journalisé), ex. « paiement différé accordé jusqu'au 30/11 »");
    if (!motif) return;
    if (motif.trim().length < 10) { setErreur("Motif trop court (10 caractères au moins)."); return; }
    setEnvoi(true);
    try {
      const r = await fetch(`/api/cc/dossiers/${encodeURIComponent(dossierId)}/facturation`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "debloquer", phase, motif: motif.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) setErreur(`Déblocage impossible (${j.error || r.status}).`);
      await recharger();
    } finally { setEnvoi(false); }
  };

  return (
    <div style={{ display: "grid", gap: 6, margin: "0 0 8px" }}>
      {paiement && !paiement.aucuneEcheance && (
        <div style={{ ...S.ligne, background: paiement.bloquante ? "#FDECEC" : "#F9FAFB" }}>
          <span style={{ ...S.badge, background: LIB[paiement.statut].fond, color: LIB[paiement.statut].texte }}>{LIB[paiement.statut].lib}</span>
          {paiement.bloquante && <b style={{ color: "#B42318" }}>En attente de paiement — la phase ne démarre pas</b>}
          <span style={S.petit}>
            {paiement.devis.length ? `Devis ${paiement.devis.map((d) => d.numero || "brouillon").join(", ")} · ` : ""}
            Dû {dh(paiement.du)}{paiement.estime ? " (estimé)" : ""} · payé {dh(paiement.paye)} · reste {dh(paiement.restant)}
            {paiement.dateDemarrage ? ` · démarrage le ${dateFr(paiement.dateDemarrage)}` : ""}
          </span>
          {paiement.factures.length > 0 && (
            <span style={S.petit}>Factures : {paiement.factures.map((f) => `${f.numero} (${f.statut.toLowerCase()}, reste ${dh(f.restant)}, échéance ${dateFr(f.dateEcheance)})`).join(" · ")}</span>
          )}
          {paiement.deblocage && <span style={S.petit}>Débloquée le {dateFr(paiement.deblocage.le)} par {paiement.deblocage.par} : {paiement.deblocage.motif}</span>}
          {paiement.bloquante && <button style={S.btn} disabled={envoi || occupe} onClick={() => void debloquer()}>Débloquer (motif)</button>}
        </div>
      )}
      {phase === "P04_AUTORISATION" && (
        <div>
          <button style={S.btnGhost} disabled={occupe} onClick={() => {
            const t = window.prompt("Révision du permis (observations de la commission, permis modificatif…) : décrivez l'écart. Le dossier d'exécution sera mis à jour.");
            if (t && t.trim()) void agir({ action: "revision_permis", texte: t.trim() }, "Révision enregistrée : mise à jour du dossier d'exécution ouverte.");
          }}>Enregistrer une révision du permis</button>
        </div>
      )}
      {phase === "P05_ETUDES_EXECUTION" && majDexe && (
        <div style={{ ...S.ligne, background: majDexe.ouverte ? "#FFF6E0" : "#F9FAFB", display: "grid" }}>
          <b>Mise à jour du dossier d'exécution suite au permis — {majDexe.ouverte ? "en cours" : `close le ${dateFr(majDexe.clotureLe)}`}</b>
          <ul style={{ margin: "4px 0", paddingInlineStart: 18, fontSize: 13 }}>
            {majDexe.ecarts.map((e, i) => <li key={i}>{dateFr(e.le)} — {e.texte}</li>)}
          </ul>
          <span style={S.petit}>{majDexe.piecesAReprendre.length ? `${majDexe.piecesAReprendre.length} pièce(s) DEXE à reprendre (marquées dans « Documents par phase »).` : "Aucune pièce DEXE déposée à reprendre pour l'instant."}</span>
          {majDexe.ouverte && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={S.btnGhost} disabled={occupe} onClick={() => {
                const t = window.prompt("Nouvel écart à noter au journal");
                if (t && t.trim()) void agir({ action: "revision_permis", texte: t.trim() }, "Écart ajouté.");
              }}>Ajouter un écart</button>
              <button style={S.btn} disabled={occupe} onClick={() => {
                const m = window.prompt("Clore la mise à jour : le dossier d'exécution est à jour. Commentaire (facultatif)");
                if (m !== null) void agir({ action: "maj_dexe_cloturer", motif: m || null }, "Mise à jour du dossier d'exécution close.");
              }}>Clore la mise à jour</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  ligne: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, fontSize: 13.5 } as React.CSSProperties,
  badge: { fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6 } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.5 } as React.CSSProperties,
  btn: { padding: "6px 12px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 34 } as React.CSSProperties,
  btnGhost: { padding: "6px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13, minHeight: 34 } as React.CSSProperties,
};
