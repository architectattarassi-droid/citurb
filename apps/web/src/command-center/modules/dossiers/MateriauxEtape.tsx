/**
 * Matériaux d'une étape — carnet commun des matériaux du projet (table "DossierMateriau",
 * session Matériauthèque, functions/_lib/carnetMateriaux.ts, en cours de livraison).
 * En attendant ses routes (/api/cc/dossiers/:id/materiaux, /api/materiaux/recherche), la page
 * renvoie vers la matériauthèque avec le dossier et l'étape : aucun appel vers une route absente.
 * L'architecte propose et valide ; le client peut proposer à partir de l'APD.
 */
import React from "react";
import { CC } from "../../theme/tokens";

export default function MateriauxEtape({ dossierId, etape }: { dossierId: string; etape: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <p style={{ fontSize: 12.5, color: CC.color.inkMid, margin: 0, lineHeight: 1.5 }}>
        Proposez des matériaux depuis la matériauthèque (référentiel CITURBAREA et produits des fournisseurs validés). Seuls les matériaux validés par l'architecte entrent au carnet du projet (CPS, DQE, planning d'achat).
      </p>
      <a href={`/materiaux?dossier=${encodeURIComponent(dossierId)}&etape=${encodeURIComponent(etape)}`} target="_blank" rel="noopener noreferrer"
        style={{ color: CC.color.info, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Proposer des matériaux depuis la matériauthèque</a>
    </div>
  );
}
