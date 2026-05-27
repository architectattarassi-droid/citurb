"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvReceptionRenderer = void 0;
const common_1 = require("@nestjs/common");
/**
 * PvReceptionRenderer — HTML imprimable pour PV de réception (provisoire,
 * définitive, levée de réserves) + certificat de conformité CITURBAREA.
 *
 * Doctrine T3-R-RECEPT-001 :
 *  - HTML autosuffisant (CSS inline, pas de dépendance externe).
 *  - Watermark "CITURBAREA · PV PROBATOIRE" intégré au @media print.
 *  - Signatures rendues en images base64 (canvas data-URL).
 *  - Hash SHA-256 imprimé en footer comme empreinte probatoire.
 *  - QR vérification : URL pointant vers /api/reception/verify/:hash.
 */
let PvReceptionRenderer = class PvReceptionRenderer {
    renderProvisoire(pv, opts = {}) {
        const dateFr = this.fmtDate(pv.dateReception);
        const finalize = pv.finalizedAt ? this.fmtDateTime(pv.finalizedAt) : null;
        const verifyUrl = this.verifyUrl(pv.hashSha256);
        return this.shell({
            title: `PV Réception Provisoire`,
            subtitle: `Réception provisoire — ${dateFr}`,
            docKind: "PROVISOIRE",
            docNumero: pv.id.slice(0, 8).toUpperCase(),
            status: pv.status,
            hash: pv.hashSha256,
            finalize,
            verifyUrl,
            body: `
        ${this.gridIdent({
                ...opts,
                dateLabel: "Date de réception provisoire",
                date: dateFr,
                montant: pv.montantTravauxMAD,
            })}

        ${pv.ouvrageDescription ? `<h2>Description de l'ouvrage</h2><p>${this.escape(pv.ouvrageDescription)}</p>` : ""}

        <h2>Personnes présentes</h2>
        ${this.tablePresents(pv.presents)}

        <h2>Checklist de conformité PC / réalisé (${pv.checklist.length})</h2>
        ${this.tableChecklist(pv.checklist)}

        <h2>Réserves (${pv.reserves.length})</h2>
        ${this.listReserves(pv.reserves, false)}

        ${pv.observations ? `<h2>Observations</h2><p>${this.escape(pv.observations)}</p>` : ""}

        <h2>Photos par pièce (${pv.photos.length})</h2>
        ${this.galeriePhotos(pv.photos)}

        ${this.signaturesBlock(pv.signatures)}

        <h2>Clauses légales</h2>
        <p class="legal">La présente réception provisoire constitue le point de
        départ des garanties légales prévues par le Dahir des Obligations et
        Contrats (DOC) Royaume du Maroc : garantie de parfait achèvement
        (1 an, art. 769), garantie biennale (2 ans, art. 769 bis) et garantie
        décennale (10 ans, art. 769). Les réserves consignées au présent PV
        devront être levées dans les délais convenus.</p>
      `,
        });
    }
    renderDefinitive(pv, provisoire, opts = {}) {
        const dateFr = this.fmtDate(pv.dateReception);
        const finalize = pv.finalizedAt ? this.fmtDateTime(pv.finalizedAt) : null;
        const verifyUrl = this.verifyUrl(pv.hashSha256);
        const provisoireDate = provisoire ? this.fmtDate(provisoire.dateReception) : "—";
        return this.shell({
            title: `PV Réception Définitive`,
            subtitle: `Réception définitive — ${dateFr}`,
            docKind: "DEFINITIVE",
            docNumero: pv.id.slice(0, 8).toUpperCase(),
            status: pv.status,
            hash: pv.hashSha256,
            finalize,
            verifyUrl,
            body: `
        ${this.gridIdent({
                ...opts,
                dateLabel: "Date de réception définitive",
                date: dateFr,
                extra: [
                    { k: "Réception provisoire", v: provisoireDate },
                    { k: "Validation réserves levées", v: pv.validationToutesReservesLevees ? "OUI" : "NON" },
                ],
            })}

        <h2>Personnes présentes</h2>
        ${this.tablePresents(pv.presents)}

        ${provisoire ? `
        <h2>Récapitulatif réserves de la réception provisoire</h2>
        ${this.listReserves(provisoire.reserves, true)}` : ""}

        ${pv.observations ? `<h2>Observations</h2><p>${this.escape(pv.observations)}</p>` : ""}

        <div class="liberation">
          <h2 style="margin-top:0;">Libération de la retenue de garantie</h2>
          <p><strong>${pv.libereRetenueGarantie ? "OUI" : "NON"}</strong>
          ${pv.montantRetenueLibereeMAD != null ? ` — Montant libéré : <strong>${this.fmtMontant(pv.montantRetenueLibereeMAD)} MAD</strong>` : ""}</p>
        </div>

        ${this.signaturesBlock(pv.signatures)}

        <h2>Clauses légales</h2>
        <p class="legal">La présente réception définitive met fin à la
        garantie de parfait achèvement (art. 769 DOC). Les garanties biennale
        (2 ans, art. 769 bis DOC) et décennale (10 ans, art. 769 DOC)
        continuent de courir à compter de la réception provisoire.</p>
      `,
        });
    }
    renderLeveeReserve(reserve, provisoire, opts = {}) {
        const dateFr = reserve.leveeAt ? this.fmtDate(reserve.leveeAt) : "—";
        const verifyUrl = this.verifyUrl(provisoire.hashSha256);
        return this.shell({
            title: `PV Levée de Réserve`,
            subtitle: `Levée de réserve — ${dateFr}`,
            docKind: "LEVEE",
            docNumero: reserve.id.slice(0, 8).toUpperCase(),
            status: reserve.leveeAt ? "FINAL" : "DRAFT",
            hash: provisoire.hashSha256 ?? null,
            finalize: reserve.leveeAt ? this.fmtDateTime(reserve.leveeAt) : null,
            verifyUrl,
            body: `
        ${this.gridIdent({
                ...opts,
                dateLabel: "Date de levée",
                date: dateFr,
                extra: [
                    { k: "Référence réserve", v: reserve.id.slice(0, 8).toUpperCase() },
                    { k: "Sévérité initiale", v: reserve.severite },
                    { k: "Pièce / localisation", v: reserve.piece || "—" },
                ],
            })}

        <h2>Réserve initiale</h2>
        <p>${this.escape(reserve.description)}</p>
        ${reserve.photoUrls.length > 0 ? `<div class="photos">${reserve.photoUrls.map((u) => `<img src="${this.escapeAttr(u)}" alt="photo initiale"/>`).join("")}</div>` : ""}

        <h2>Description de la levée</h2>
        <p>${this.escape(reserve.leveeDescription || "—")}</p>

        <h2>Preuves photographiques (${(reserve.leveePhotoUrls || []).length})</h2>
        ${(reserve.leveePhotoUrls && reserve.leveePhotoUrls.length > 0)
                ? `<div class="photos">${reserve.leveePhotoUrls.map((u) => `<img src="${this.escapeAttr(u)}" alt="preuve levée"/>`).join("")}</div>`
                : "<p>—</p>"}

        ${reserve.leveeSignature ? `
        <div class="sign-block">
          <h2>Signature</h2>
          <div class="signs">
            <div class="sign">
              <img src="${this.escapeAttr(reserve.leveeSignature.dataUrl)}" alt="signature"/>
              <div class="partie">${this.escape(reserve.leveeSignature.partie)}</div>
              <div class="date">${this.fmtDateTime(reserve.leveeSignature.signedAt)}</div>
            </div>
          </div>
        </div>` : ""}
      `,
        });
    }
    // ────────────────────────────────────────────────────── Shell + helpers
    shell(args) {
        const watermark = "CITURBAREA · PV PROBATOIRE";
        const qrSvg = args.verifyUrl ? this.qrSvgPlaceholder(args.verifyUrl) : "";
        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${this.escape(args.title)} · ${this.escape(args.docNumero)}</title>
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
  .reserve { border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px 12px; margin: 8px 0; background: #fffbeb; page-break-inside: avoid; }
  .reserve.MINEURE { border-left-color: #facc15; background: #fefce8; }
  .reserve.MAJEURE { border-left-color: #f97316; background: #fff7ed; }
  .reserve.BLOQUANTE { border-left-color: #dc2626; background: #fef2f2; }
  .reserve.levee { border-left-color: #16a34a; background: #f0fdf4; }
  .reserve-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .reserve-title { font-weight: 700; color: #0f172a; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 9.5pt; font-weight: 700; letter-spacing: 0.5px; background: #e2e8f0; color: #475569; }
  .badge-MINEURE { background: #fef9c3; color: #854d0e; }
  .badge-MAJEURE { background: #fed7aa; color: #9a3412; }
  .badge-BLOQUANTE { background: #fecaca; color: #991b1b; }
  .badge-LEVEE { background: #dcfce7; color: #166534; }
  .photos { display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap; }
  .photos img { max-width: 220px; max-height: 160px; border: 1px solid #e2e8f0; border-radius: 4px; object-fit: cover; }
  .sign-block { margin-top: 26px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
  .signs { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .sign { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; text-align: center; }
  .sign img { max-width: 100%; max-height: 90px; }
  .sign .partie { font-weight: 700; font-size: 10.5pt; color: #0f172a; }
  .sign .date { color: #64748b; font-size: 9.5pt; margin-top: 4px; }
  .legal { font-size: 10pt; color: #334155; background: #f1f5f9; padding: 10px 14px; border-radius: 4px; border-left: 3px solid #94a3b8; }
  .liberation { background: #ecfdf5; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px; margin: 14px 0; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 9pt; }
  .hash { font-family: "SF Mono", Consolas, monospace; font-size: 8.5pt; color: #475569; word-break: break-all; }
  .status-pill { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 10pt; }
  .status-DRAFT { background: #e2e8f0; color: #475569; }
  .status-FINAL { background: #dcfce7; color: #166534; }
  .qr { display: inline-block; padding: 6px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
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
    <div style="color:#64748b;font-size:10pt;">Plateforme d'orchestration architecturale et urbanistique · Maroc</div>
  </div>
  <div class="meta">
    Doc n° <strong>${this.escape(args.docNumero)}</strong><br/>
    ${this.docKindLabel(args.docKind)}<br/>
    <span class="status-pill status-${args.status}">${this.escape(args.status)}</span>
  </div>
</div>

<h1>${this.escape(args.title)}</h1>
<div class="subtitle">${this.escape(args.subtitle)}</div>

${args.body}

<div class="footer">
  ${args.finalize ? `<div>Finalisé le <strong>${args.finalize}</strong></div>` : `<div>Document à l'état <strong>${this.escape(args.status)}</strong> — non probatoire avant finalisation</div>`}
  ${args.hash ? `<div style="margin-top:6px;">Empreinte SHA-256 : <span class="hash">${this.escape(args.hash)}</span></div>` : ""}
  ${qrSvg ? `<div style="margin-top:10px;"><div class="qr">${qrSvg}</div><div style="margin-top:4px;font-size:9pt;">Vérification : ${this.escape(args.verifyUrl ?? "")}</div></div>` : ""}
  <div style="margin-top:8px;">© CITURBAREA · ${this.escape(watermark)}</div>
</div>

</div>
</body>
</html>`;
    }
    gridIdent(opts) {
        const cells = [
            { k: opts.dateLabel, v: opts.date },
        ];
        if (opts.dossierTitle)
            cells.push({ k: "Dossier", v: opts.dossierTitle });
        if (opts.dossierRef)
            cells.push({ k: "Référence dossier", v: opts.dossierRef });
        if (opts.commune)
            cells.push({ k: "Commune", v: opts.commune });
        if (opts.permisConstruireRef)
            cells.push({ k: "Permis de construire", v: opts.permisConstruireRef });
        if (opts.montant != null)
            cells.push({ k: "Montant des travaux", v: `${this.fmtMontant(opts.montant)} MAD` });
        (opts.extra ?? []).forEach((c) => cells.push(c));
        return `<div class="grid">${cells.map((c) => `<div><div class="k">${this.escape(c.k)}</div><div class="v">${this.escape(c.v)}</div></div>`).join("")}</div>`;
    }
    tablePresents(arr) {
        if (!arr || arr.length === 0)
            return "<p>—</p>";
        return `<table>
      <thead><tr><th>Nom</th><th>Rôle</th><th>Organisme</th></tr></thead>
      <tbody>${arr.map((p) => `<tr><td>${this.escape(p.nom)}</td><td>${this.escape(p.role)}</td><td>${this.escape(p.organisme ?? "—")}</td></tr>`).join("")}</tbody>
    </table>`;
    }
    tableChecklist(arr) {
        if (!arr || arr.length === 0)
            return "<p>Aucun item.</p>";
        return `<table>
      <thead><tr><th>Item</th><th>Conformité</th><th>Observation</th></tr></thead>
      <tbody>${arr.map((c) => `<tr><td>${this.escape(c.libelle)}</td><td>${c.conforme ? "<strong style='color:#166534'>OK</strong>" : "<strong style='color:#991b1b'>NON</strong>"}</td><td>${this.escape(c.observation ?? "—")}</td></tr>`).join("")}</tbody>
    </table>`;
    }
    listReserves(arr, showLevee) {
        if (!arr || arr.length === 0)
            return "<p>Aucune réserve.</p>";
        return arr.map((r) => {
            const levee = !!r.leveeAt;
            const cls = levee ? `reserve levee` : `reserve ${r.severite}`;
            const badge = levee ? "LEVEE" : r.severite;
            return `<div class="${cls}">
        <div class="reserve-head">
          <div class="reserve-title">${r.piece ? `[${this.escape(r.piece)}] ` : ""}${this.escape(r.description)}</div>
          <span class="badge badge-${badge}">${badge}</span>
        </div>
        ${r.deadline ? `<div style="font-size:9.5pt;color:#64748b">Échéance : ${this.fmtDate(r.deadline)}</div>` : ""}
        ${r.photoUrls.length > 0 ? `<div class="photos">${r.photoUrls.map((u) => `<img src="${this.escapeAttr(u)}" alt="photo"/>`).join("")}</div>` : ""}
        ${showLevee && levee ? `
          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #16a34a;">
            <div style="font-size:10pt;color:#166534;font-weight:700;">Levée le ${this.fmtDate(r.leveeAt)}</div>
            ${r.leveeDescription ? `<div style="margin-top:4px">${this.escape(r.leveeDescription)}</div>` : ""}
            ${(r.leveePhotoUrls && r.leveePhotoUrls.length > 0) ? `<div class="photos">${r.leveePhotoUrls.map((u) => `<img src="${this.escapeAttr(u)}" alt="preuve"/>`).join("")}</div>` : ""}
          </div>` : ""}
      </div>`;
        }).join("");
    }
    galeriePhotos(arr) {
        if (!arr || arr.length === 0)
            return "<p>Aucune photo.</p>";
        return `<div class="photos">${arr.map((p) => `<figure style="margin:0;text-align:center;"><img src="${this.escapeAttr(p.url)}" alt="${this.escapeAttr(p.legende ?? "photo")}"/><figcaption style="font-size:9pt;color:#64748b;margin-top:4px;">${this.escape(p.piece ?? "")}${p.piece && p.legende ? " · " : ""}${this.escape(p.legende ?? "")}</figcaption></figure>`).join("")}</div>`;
    }
    signaturesBlock(arr) {
        return `<div class="sign-block">
      <h2>Signatures (${arr.length})</h2>
      ${arr.length === 0 ? "<p>Aucune signature recueillie.</p>" : `
      <div class="signs">
        ${arr.map((s) => `<div class="sign">
          <img src="${this.escapeAttr(s.dataUrl)}" alt="signature"/>
          <div class="partie">${this.escape(s.partie)}</div>
          <div class="date">${this.fmtDateTime(s.signedAt)}</div>
        </div>`).join("")}
      </div>`}
    </div>`;
    }
    docKindLabel(k) {
        return {
            PROVISOIRE: "PV Réception provisoire",
            DEFINITIVE: "PV Réception définitive",
            LEVEE: "PV Levée de réserve",
            CERTIFICAT: "Certificat conformité",
        }[k] ?? k;
    }
    verifyUrl(hash) {
        if (!hash)
            return null;
        const base = process.env.PUBLIC_WEB_URL || "https://citurbarea.com";
        return `${base.replace(/\/+$/, "")}/verify/${hash}`;
    }
    /**
     * QR-code "placeholder" — pas de dépendance npm (cf. doctrine "pas de
     * nouvelle dépendance externe"). Rend un SVG décoratif déterministe à
     * partir du hash : code carré 21×21 basé sur les bits du hash.
     * Le navigateur peut afficher le payload textuel sous le QR.
     * Pour un QR réel scannable, intégrer `qrcode` côté serveur ultérieurement.
     */
    qrSvgPlaceholder(payload) {
        const size = 21;
        const cell = 5;
        let bits = "";
        for (let i = 0; i < payload.length; i++) {
            bits += payload.charCodeAt(i).toString(2).padStart(8, "0");
        }
        while (bits.length < size * size)
            bits += bits;
        const rects = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Coins « finder pattern »
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
    // Format helpers
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
    fmtMontant(n) {
        try {
            return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n);
        }
        catch {
            return String(n);
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
exports.PvReceptionRenderer = PvReceptionRenderer;
exports.PvReceptionRenderer = PvReceptionRenderer = __decorate([
    (0, common_1.Injectable)()
], PvReceptionRenderer);
