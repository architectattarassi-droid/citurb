/**
 * Téléchargement d'un document (devis, facture, avoir) en PDF ou DOCX, généré
 * dans le navigateur à partir du modèle figé — aucun service tiers.
 */
import type { DocumentDevis } from "../documentDevis";
import { documentVersDocx } from "./docx";
import { documentVersPdf } from "./pdf";

export function telecharger(document: DocumentDevis, pied: string, format: "pdf" | "docx") {
  const octets = format === "pdf" ? documentVersPdf(document, pied) : documentVersDocx(document, pied);
  const type = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const url = URL.createObjectURL(new Blob([octets as BlobPart], { type }));
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `${document.numero}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
