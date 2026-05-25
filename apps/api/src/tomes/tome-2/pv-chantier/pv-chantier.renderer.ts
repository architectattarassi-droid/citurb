import { Injectable } from "@nestjs/common";
import { PvChantier, PvSeverite } from "./pv-chantier.types";

/**
 * PvChantierRenderer — génère l'HTML imprimable d'un PV de chantier.
 *
 * Doctrine T2-R-PV-001 :
 *  - HTML auto-suffisant (CSS inline, pas de dépendance externe).
 *  - Watermark "CITURBAREA · PV PROBATOIRE" intégré au @media print.
 *  - Signatures rendues sous forme d'images base64 (canvas data-URL).
 *  - Hash SHA-256 imprimé en footer comme empreinte probatoire.
 */
@Injectable()
export class PvChantierRenderer {
  renderHtml(pv: PvChantier, opts?: { dossierTitle?: string; commune?: string }): string {
    const title = `PV de chantier · ${pv.numero}`;
    const dateFr = this.fmtDate(pv.date);
    const finalize = pv.finalizedAt ? this.fmtDate(pv.finalizedAt) : null;
    const watermark = "CITURBAREA · PV PROBATOIRE";

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${this.escape(title)}</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    .pagebreak { page-break-before: always; }
  }
  html, body { background: #fff; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; max-width: 820px; margin: 0 auto; padding: 24px 28px 60px; line-height: 1.5; font-size: 11.5pt; position: relative; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 10px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 100; }
  .toolbar button { background: #0f172a; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }

  .watermark { position: fixed; inset: 0; pointer-events: none; z-index: 1; display: flex; align-items: center; justify-content: center; }
  .watermark span { transform: rotate(-28deg); font-size: 32pt; color: rgba(15,23,42,0.07); font-weight: 800; letter-spacing: 6px; }
  .content { position: relative; z-index: 5; }

  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
  .header .brand { font-weight: 800; font-size: 14pt; color: #0f172a; letter-spacing: 1px; }
  .header .meta { text-align: right; font-size: 10pt; color: #475569; }

  h1 { font-size: 18pt; margin: 6px 0 4px; color: #0f172a; }
  .subtitle { color: #475569; margin-bottom: 16px; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; background: #f8fafc; padding: 14px 18px; border-left: 4px solid #0f172a; border-radius: 4px; margin: 14px 0; font-size: 10.5pt; }
  .grid .k { color: #64748b; font-size: 10pt; }
  .grid .v { font-weight: 600; }

  h2 { font-size: 12.5pt; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }

  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 10.5pt; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; color: #0f172a; }

  .obs { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin: 10px 0; background: #fff; page-break-inside: avoid; }
  .obs-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.5px; }
  .badge-INFO { background: #e0f2fe; color: #0369a1; }
  .badge-AVIS { background: #fef9c3; color: #854d0e; }
  .badge-RESERVE { background: #fed7aa; color: #9a3412; }
  .badge-BLOQUANT { background: #fecaca; color: #991b1b; }
  .obs-title { font-weight: 700; color: #0f172a; }
  .obs-desc { white-space: pre-wrap; margin: 4px 0; color: #1f2937; }
  .obs-photos { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
  .obs-photos img { max-width: 220px; max-height: 160px; border: 1px solid #e2e8f0; border-radius: 4px; object-fit: cover; }
  .obs-meta { color: #64748b; font-size: 9.5pt; margin-top: 4px; }

  .sign-block { margin-top: 26px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
  .signs { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .sign { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .sign img { max-width: 100%; max-height: 90px; }
  .sign .partie { font-weight: 700; font-size: 10.5pt; color: #0f172a; }
  .sign .date { color: #64748b; font-size: 9.5pt; margin-top: 4px; }

  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 9pt; }
  .hash { font-family: "SF Mono", Consolas, monospace; font-size: 8.5pt; color: #475569; word-break: break-all; }
  .status-pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 10pt; }
  .status-DRAFT { background: #e2e8f0; color: #475569; }
  .status-SIGNED_PARTIEL { background: #fef9c3; color: #854d0e; }
  .status-FINAL { background: #dcfce7; color: #166534; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<div class="watermark"><span>${this.escape(watermark)}</span></div>

<div class="content">

<div class="header">
  <div>
    <div class="brand">CITURBAREA</div>
    <div style="color:#64748b;font-size:10pt;">Plateforme d'orchestration architecturale et urbanistique</div>
  </div>
  <div class="meta">
    PV n° <strong>${this.escape(pv.numero)}</strong><br/>
    Dossier ${this.escape(pv.dossierId.slice(0, 12))}…<br/>
    <span class="status-pill status-${pv.status}">${this.escape(pv.status)}</span>
  </div>
</div>

<h1>Procès-Verbal de Chantier</h1>
<div class="subtitle">${this.typeLabel(pv.typeVisite)} — ${dateFr}</div>

<div class="grid">
  <div><div class="k">Type de visite</div><div class="v">${this.typeLabel(pv.typeVisite)}</div></div>
  <div><div class="k">Date de visite</div><div class="v">${dateFr}</div></div>
  ${opts?.dossierTitle ? `<div><div class="k">Dossier</div><div class="v">${this.escape(opts.dossierTitle)}</div></div>` : ""}
  ${opts?.commune ? `<div><div class="k">Commune</div><div class="v">${this.escape(opts.commune)}</div></div>` : ""}
  ${pv.meteo ? `<div><div class="k">Météo</div><div class="v">${this.escape(pv.meteo)}</div></div>` : ""}
  ${pv.temperatureC != null ? `<div><div class="k">Température</div><div class="v">${pv.temperatureC} °C</div></div>` : ""}
  ${pv.vent ? `<div><div class="k">Vent</div><div class="v">${this.escape(pv.vent)}</div></div>` : ""}
  ${pv.prochaineVisite ? `<div><div class="k">Prochaine visite</div><div class="v">${this.fmtDate(pv.prochaineVisite)}</div></div>` : ""}
</div>

<h2>Personnes présentes</h2>
${pv.presents.length === 0 ? "<p>—</p>" : `
<table>
  <thead><tr><th>Nom</th><th>Rôle</th><th>Organisme</th></tr></thead>
  <tbody>
    ${pv.presents.map((p) => `<tr><td>${this.escape(p.nom)}</td><td>${this.escape(p.role)}</td><td>${this.escape(p.organisme ?? "—")}</td></tr>`).join("")}
  </tbody>
</table>`}

${pv.absents.length > 0 ? `
<h2>Personnes absentes</h2>
<table>
  <thead><tr><th>Nom</th><th>Rôle</th><th>Motif</th></tr></thead>
  <tbody>
    ${pv.absents.map((p) => `<tr><td>${this.escape(p.nom)}</td><td>${this.escape(p.role)}</td><td>${this.escape(p.motif ?? "—")}</td></tr>`).join("")}
  </tbody>
</table>` : ""}

<h2>Observations (${pv.observations.length})</h2>
${pv.observations.length === 0 ? "<p>Aucune observation consignée.</p>" : pv.observations.map((o) => this.renderObservation(o)).join("")}

${pv.decisions.length > 0 ? `
<h2>Décisions</h2>
<table>
  <thead><tr><th>Description</th><th>Responsable</th><th>Échéance</th></tr></thead>
  <tbody>
    ${pv.decisions.map((d) => `<tr><td>${this.escape(d.description)}</td><td>${this.escape(d.responsable ?? "—")}</td><td>${d.deadline ? this.fmtDate(d.deadline) : "—"}</td></tr>`).join("")}
  </tbody>
</table>` : ""}

<div class="sign-block">
  <h2>Signatures (${pv.signatures.length})</h2>
  ${pv.signatures.length === 0 ? "<p>Aucune signature recueillie.</p>" : `
  <div class="signs">
    ${pv.signatures.map((s) => `
      <div class="sign">
        <img src="${this.escapeAttr(s.dataUrl)}" alt="signature"/>
        <div class="partie">${this.escape(s.partie)}</div>
        <div class="date">${this.fmtDateTime(s.signedAt)}</div>
      </div>`).join("")}
  </div>`}
</div>

<div class="footer">
  ${finalize ? `<div>Finalisé le <strong>${finalize}</strong></div>` : `<div>Document à l'état <strong>${pv.status}</strong> — non probatoire avant finalisation</div>`}
  ${pv.hashSha256 ? `<div style="margin-top:6px;">Empreinte SHA-256 : <span class="hash">${pv.hashSha256}</span></div>` : ""}
  <div style="margin-top:8px;">© CITURBAREA · ${watermark}</div>
</div>

</div>
</body>
</html>`;
  }

  // ───────────────────────────────────────────────────────── Helpers

  private renderObservation(o: PvChantier["observations"][number]): string {
    const sev = o.severite as PvSeverite;
    const geo = o.geoloc
      ? `· GPS ${o.geoloc.lat.toFixed(5)}, ${o.geoloc.lng.toFixed(5)}`
      : "";
    const lot = o.lot ? `Lot ${this.escape(o.lot)} ` : "";
    const deadline = o.deadline ? ` · Échéance ${this.fmtDate(o.deadline)}` : "";
    return `
<div class="obs">
  <div class="obs-head">
    <div class="obs-title">${lot}${this.escape(o.titre)}</div>
    <span class="badge badge-${sev}">${sev}</span>
  </div>
  ${o.description ? `<div class="obs-desc">${this.escape(o.description)}</div>` : ""}
  ${o.photoUrls.length > 0 ? `<div class="obs-photos">${o.photoUrls.map((u) => `<img src="${this.escapeAttr(u)}" alt="photo"/>`).join("")}</div>` : ""}
  <div class="obs-meta">${geo}${deadline}</div>
</div>`;
  }

  private typeLabel(t: PvChantier["typeVisite"]): string {
    const map: Record<PvChantier["typeVisite"], string> = {
      INITIALE: "Visite initiale",
      AVANCEMENT: "Visite d'avancement",
      RECEPTION_PROVISOIRE: "Réception provisoire",
      RECEPTION_DEFINITIVE: "Réception définitive",
      LEVE_RESERVES: "Levée de réserves",
    };
    return map[t] ?? t;
  }

  private fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString("fr-MA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  private fmtDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString("fr-MA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  private escape(s: string | null | undefined): string {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private escapeAttr(s: string | null | undefined): string {
    return this.escape(s);
  }
}
