/**
 * Aperçu HTML d'un document de devis (même modèle que le PDF et le DOCX :
 * domain/honoraires/documentDevis.ts), charte spec §5.5. Sert à l'éditeur
 * admin et servira à l'espace client.
 */
import React from "react";
import type { Bloc, Cellule, Colonne, DocumentDevis, StyleLigne } from "../../../../domain/honoraires/documentDevis";
import { telecharger } from "../../../../domain/honoraires/rendu/telecharger";

export { telecharger };

const NUIT = "#1F3864", CLAIR = "#EEF1F7", LIBELLE = "#F5F5F5", GRIS = "#595959", ROUGE = "#C00000", OR = "#7F6000";

function Tableau({ colonnes, lignes, styles = [], fondPremiere }: { colonnes: Colonne[]; lignes: Cellule[][]; styles?: StyleLigne[]; fondPremiere?: string }) {
  const align = (c: Colonne) => (c.align === "droite" ? "right" : c.align === "centre" ? "center" : "left") as React.CSSProperties["textAlign"];
  return (
    <div style={{ overflowX: "auto", margin: "0 0 8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #BFBFBF", fontSize: 13, minWidth: 480 }}>
        {colonnes.some((c) => c.titre) && (
          <thead><tr>{colonnes.map((c, i) => <th key={i} style={{ background: CLAIR, color: NUIT, textAlign: align(c), padding: "5px 7px", border: "1px solid #D9D9D9", width: `${c.largeur * 100}%` }}>{c.titre}</th>)}</tr></thead>
        )}
        <tbody>
          {lignes.map((l, j) => (
            <tr key={j} style={{ background: (styles[j] ?? "normal") !== "normal" ? CLAIR : undefined }}>
              {l.map((cel, i) => (
                <td key={i} style={{ textAlign: align(colonnes[i]), padding: "5px 7px", border: "1px solid #D9D9D9", verticalAlign: "top", background: i === 0 && fondPremiere ? fondPremiere : undefined, fontWeight: cel.gras || (styles[j] ?? "normal") !== "normal" ? 700 : 400, color: cel.or ? OR : undefined, width: colonnes[i].titre ? undefined : `${colonnes[i].largeur * 100}%` }}>
                  {cel.caseACocher && <span style={{ display: "inline-block", width: 12, height: 12, border: "1px solid #333" }} />}
                  {cel.texte}
                  {cel.alerte && <div style={{ color: ROUGE, fontWeight: 700, fontSize: 12 }}>{cel.alerte}</div>}
                  {cel.sous && <div style={{ color: GRIS, fontStyle: "italic", fontSize: 12, fontWeight: 400 }}>{cel.sous}</div>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlocHtml({ b }: { b: Bloc }) {
  switch (b.t) {
    case "entete":
      return <div style={{ borderBottom: `2px solid ${NUIT}`, paddingBottom: 6, marginBottom: 12 }}><div style={{ color: NUIT, fontWeight: 700, fontSize: 20 }}>{b.marque}</div>{b.lignes.map((l, i) => <div key={i} style={{ color: GRIS, fontSize: 12 }}>{l}</div>)}</div>;
    case "titre":
      return <div style={{ textAlign: "center", margin: "6px 0 12px" }}><div style={{ color: NUIT, fontWeight: 700, fontSize: 17 }}>{b.texte}</div><div>{b.reference}</div>{b.sousTitre && <div style={{ color: GRIS, fontStyle: "italic" }}>{b.sousTitre}</div>}</div>;
    case "identification":
      return <Tableau colonnes={[{ titre: "", largeur: 0.3 }, { titre: "", largeur: 0.7 }]} lignes={b.lignes.map(([k, v]) => [{ texte: k, gras: true }, { texte: v }])} fondPremiere={LIBELLE} />;
    case "hypotheses":
      return <div style={{ border: `1px solid ${ROUGE}`, color: ROUGE, padding: "6px 10px", margin: "8px 0", fontSize: 13 }}><strong>{b.titre}</strong>{b.lignes.map((l, i) => <div key={i}>• {l}</div>)}</div>;
    case "section":
      return <div style={{ color: NUIT, fontWeight: 700, fontSize: 15, margin: "14px 0 6px" }}>{b.titre}</div>;
    case "tableau":
      return <Tableau colonnes={b.colonnes} lignes={b.lignes} styles={b.styles} />;
    case "paragraphe":
      return <p style={{ margin: "0 0 6px", fontSize: b.style === "note" ? 12 : 14, fontStyle: b.style === "note" ? "italic" : undefined, color: b.style === "note" ? GRIS : b.style === "alerte" ? ROUGE : undefined, fontWeight: b.style === "gras" ? 700 : undefined }}>{b.texte}</p>;
    case "liste":
      return <ul style={{ margin: "0 0 8px", paddingInlineStart: 20, fontSize: 14 }}>{b.items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
    case "signatures":
      return <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "16px 0 30px", fontSize: 13 }}>{[b.gauche, b.droite].map((c, k) => <div key={k} style={{ flex: "1 1 220px" }}>{c.map((l, i) => <div key={i} style={{ fontWeight: i ? 400 : 700, color: i ? GRIS : undefined }}>{l}</div>)}</div>)}</div>;
    case "bandeau":
      return <div style={{ borderTop: `2px solid ${NUIT}`, paddingTop: 6, fontSize: 13 }}>{b.lignes.map((l, i) => <div key={i} style={{ fontWeight: i ? 400 : 700, color: i ? undefined : NUIT }}>{l}</div>)}</div>;
  }
}

export default function ApercuDocument({ document, pied }: { document: DocumentDevis; pied: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #D9D9D9", borderRadius: 6, padding: "18px 20px", fontFamily: "Calibri, 'Segoe UI', sans-serif", color: "#1a1a1a", position: "relative", overflow: "hidden" }}>
      {document.brouillon && <div aria-hidden style={{ position: "absolute", top: 220, left: 0, right: 0, textAlign: "center", fontSize: 90, fontWeight: 700, color: "rgba(0,0,0,0.06)", transform: "rotate(-30deg)", pointerEvents: "none" }}>BROUILLON</div>}
      {document.blocs.map((b, i) => <BlocHtml key={i} b={b} />)}
      <div style={{ borderTop: "1px solid #D9D9D9", marginTop: 12, paddingTop: 4, fontSize: 11, color: GRIS }}>{document.piedDePage} — {pied}</div>
    </div>
  );
}
