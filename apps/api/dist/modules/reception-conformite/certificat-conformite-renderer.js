"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificatConformiteRenderer = void 0;
const common_1 = require("@nestjs/common");
/**
 * CertificatConformiteRenderer — génère l'attestation probante CITURBAREA
 * accompagnant le permis d'habiter / certificat de conformité officiel.
 *
 * Doctrine : ce certificat n'est PAS le permis d'habiter officiel (qui reste
 * délivré par la commune). C'est une **attestation CITURBAREA** garantissant
 * que le chantier a été vérifié conforme au PC autorisé, scellée par un
 * hash SHA-256 et un QR de vérification.
 */
let CertificatConformiteRenderer = class CertificatConformiteRenderer {
    renderCertificat(cert, permis, opts = {}) {
        const dateFr = this.fmtDate(cert.dateDelivrance);
        const finalize = cert.finalizedAt ? this.fmtDateTime(cert.finalizedAt) : null;
        const verifyUrl = this.verifyUrl(cert.hashSha256);
        const visitesRecap = (permis.visites || [])
            .map((v) => `<tr><td>${this.fmtDate(v.dateVisite)}</td><td>${this.escape(v.agentName)}</td><td>${this.escape(v.resultat)}</td><td>${this.escape(v.observations ?? "—")}</td></tr>`)
            .join("");
        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Certificat de conformité CITURBAREA · ${this.escape(cert.refOfficial)}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none !important; } }
  html, body { background: #fff; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; max-width: 820px; margin: 0 auto; padding: 24px 28px 60px; line-height: 1.55; font-size: 11.5pt; position: relative; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 10px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 100; }
  .toolbar button { background: #0f172a; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }
  .watermark { position: fixed; inset: 0; pointer-events: none; z-index: 1; display: flex; align-items: center; justify-content: center; }
  .watermark span { transform: rotate(-28deg); font-size: 36pt; color: rgba(15,23,42,0.08); font-weight: 800; letter-spacing: 8px; }
  .content { position: relative; z-index: 5; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { font-weight: 800; font-size: 16pt; color: #0f172a; letter-spacing: 1.5px; }
  .meta { text-align: right; font-size: 10pt; color: #475569; }
  h1 { font-size: 22pt; margin: 14px 0 6px; color: #0f172a; text-align: center; }
  .subtitle { color: #475569; text-align: center; margin-bottom: 28px; font-size: 12pt; }
  .declaration { background: #f8fafc; border-left: 4px solid #0f172a; padding: 18px 22px; border-radius: 4px; margin: 18px 0; font-size: 11.5pt; }
  .declaration strong { color: #0f172a; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; background: #f1f5f9; padding: 14px 18px; border-radius: 6px; margin: 14px 0; font-size: 10.5pt; }
  .grid .k { color: #64748b; font-size: 9.5pt; }
  .grid .v { font-weight: 700; color: #0f172a; }
  h2 { font-size: 12.5pt; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 6px 0 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 9px; text-align: left; }
  th { background: #f1f5f9; }
  .seal { display: flex; justify-content: center; align-items: center; gap: 30px; margin-top: 30px; }
  .seal .qr { padding: 8px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; }
  .seal .info { font-size: 10pt; color: #334155; max-width: 320px; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 9pt; }
  .hash { font-family: "SF Mono", Consolas, monospace; font-size: 8.5pt; color: #475569; word-break: break-all; }
  .official-link { display: inline-block; margin-top: 6px; color: #0369a1; }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<div class="watermark"><span>CITURBAREA · ATTESTATION PROBANTE</span></div>

<div class="content">

<div class="header">
  <div>
    <div class="brand">CITURBAREA</div>
    <div style="color:#64748b;font-size:10pt;">Plateforme d'orchestration architecturale et urbanistique · Maroc</div>
  </div>
  <div class="meta">
    Réf. attestation<br/>
    <strong>${this.escape(cert.refOfficial)}</strong>
  </div>
</div>

<h1>Certificat de conformité</h1>
<div class="subtitle">Attestation probante CITURBAREA accompagnant le permis d'habiter délivré par la commune</div>

<div class="declaration">
  La plateforme <strong>CITURBAREA</strong> atteste avoir vérifié la conformité
  du chantier au permis de construire autorisé n° <strong>${this.escape(opts.permisConstruireRef ?? "—")}</strong>
  ${opts.permisConstruireDateDelivrance ? `délivré le <strong>${this.fmtDate(opts.permisConstruireDateDelivrance)}</strong>` : ""}.
  Le permis d'habiter officiel a été délivré par la commune sous la
  référence <strong>${this.escape(cert.refOfficial)}</strong> en date du
  <strong>${dateFr}</strong>.
</div>

<div class="grid">
  <div><div class="k">Référence officielle PH</div><div class="v">${this.escape(cert.refOfficial)}</div></div>
  <div><div class="k">Date de délivrance</div><div class="v">${dateFr}</div></div>
  ${opts.dossierTitle ? `<div><div class="k">Dossier</div><div class="v">${this.escape(opts.dossierTitle)}</div></div>` : ""}
  ${opts.dossierRef ? `<div><div class="k">Référence interne</div><div class="v">${this.escape(opts.dossierRef)}</div></div>` : ""}
  ${opts.commune ? `<div><div class="k">Commune</div><div class="v">${this.escape(opts.commune)}</div></div>` : ""}
  ${opts.moaName ? `<div><div class="k">Maître d'ouvrage</div><div class="v">${this.escape(opts.moaName)}</div></div>` : ""}
</div>

${(permis.visites && permis.visites.length > 0) ? `
<h2>Visites de conformité agent communal</h2>
<table>
  <thead><tr><th>Date</th><th>Agent</th><th>Résultat</th><th>Observations</th></tr></thead>
  <tbody>${visitesRecap}</tbody>
</table>` : ""}

<h2>Cadre légal</h2>
<p style="font-size:10pt;color:#334155;">Le permis d'habiter et le certificat
de conformité sont délivrés par la commune en application de la
<strong>loi 66-12</strong> relative au contrôle et à la répression des
infractions en matière d'urbanisme et de construction, et du <strong>décret
n° 2-14-394</strong>. La présente attestation CITURBAREA constitue la preuve
documentaire scellée (hash SHA-256) que le dossier a été suivi sur la
plateforme jusqu'à la délivrance du PH officiel.</p>

${cert.urlOfficial ? `<p>Lien officiel commune : <a class="official-link" href="${this.escapeAttr(cert.urlOfficial)}" target="_blank" rel="noopener">${this.escape(cert.urlOfficial)}</a></p>` : ""}

<div class="seal">
  ${verifyUrl ? `<div class="qr">${this.qrSvgPlaceholder(verifyUrl)}</div>` : ""}
  <div class="info">
    <div><strong>Vérification d'authenticité</strong></div>
    ${verifyUrl ? `<div style="margin-top:4px;">Scannez ce QR ou rendez-vous sur :<br/><span class="hash">${this.escape(verifyUrl)}</span></div>` : ""}
    ${cert.hashSha256 ? `<div style="margin-top:8px;">Empreinte SHA-256 :<br/><span class="hash">${this.escape(cert.hashSha256)}</span></div>` : ""}
  </div>
</div>

<div class="footer">
  ${finalize ? `<div>Attestation scellée le <strong>${finalize}</strong></div>` : "<div>Attestation en cours de scellement</div>"}
  <div style="margin-top:8px;">© CITURBAREA · Attestation probante non substituable au PH officiel</div>
</div>

</div>
</body>
</html>`;
    }
    verifyUrl(hash) {
        if (!hash)
            return null;
        const base = process.env.PUBLIC_WEB_URL || "https://citurbarea.com";
        return `${base.replace(/\/+$/, "")}/verify/${hash}`;
    }
    qrSvgPlaceholder(payload) {
        const size = 25;
        const cell = 6;
        let bits = "";
        for (let i = 0; i < payload.length; i++) {
            bits += payload.charCodeAt(i).toString(2).padStart(8, "0");
        }
        while (bits.length < size * size)
            bits += bits;
        const rects = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const isFinder = (x < 7 && y < 7) ||
                    (x >= size - 7 && y < 7) ||
                    (x < 7 && y >= size - 7);
                const onFinderBorder = isFinder &&
                    ((x === 0 || y === 0 || x === 6 || y === 6) ||
                        (x === size - 7 || y === size - 7 || x === size - 1 || y === 6) ||
                        (x === 0 || y === size - 7 || x === 6 || y === size - 1));
                const finderCore = isFinder &&
                    ((x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                        (x >= size - 5 && x <= size - 3 && y >= 2 && y <= 4) ||
                        (x >= 2 && x <= 4 && y >= size - 5 && y <= size - 3));
                let dark;
                if (isFinder)
                    dark = onFinderBorder || finderCore;
                else
                    dark = bits.charAt(y * size + x) === "1";
                if (dark)
                    rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" />`);
            }
        }
        const dim = size * cell;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" aria-label="QR code"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#0f172a">${rects.join("")}</g></svg>`;
    }
    fmtDate(iso) {
        try {
            return new Date(iso).toLocaleDateString("fr-MA", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });
        }
        catch {
            return iso;
        }
    }
    fmtDateTime(iso) {
        try {
            return new Date(iso).toLocaleString("fr-MA", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        catch {
            return iso;
        }
    }
    escape(s) {
        if (s == null)
            return "";
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    escapeAttr(s) {
        return this.escape(s);
    }
};
exports.CertificatConformiteRenderer = CertificatConformiteRenderer;
exports.CertificatConformiteRenderer = CertificatConformiteRenderer = __decorate([
    (0, common_1.Injectable)()
], CertificatConformiteRenderer);
