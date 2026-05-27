"use strict";
/**
 * Tome 2 — PC PDF master renderer.
 *
 * Compile le dossier PC complet en 1 document HTML imprimable (PDF master).
 * Stratégie sans Puppeteer :
 *  - Page de garde (résumé projet + checklist pièces)
 *  - Sommaire (page 2)
 *  - Concatène toutes les pièces uploadées :
 *    · si PDF → lien d'inclusion + miniature placeholder
 *    · si image → embedded base64
 *  - Concatène les formulaires HTML (étape 3)
 *  - Bandeau QR + hash SHA-256 en bas de chaque page (CSS @page)
 *
 * L'utilisateur fait "Imprimer → Enregistrer en PDF" pour obtenir le master.
 * Une future intégration Puppeteer/Chromium produira le PDF binaire directement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMaster = renderMaster;
exports.renderAttestation = renderAttestation;
const crypto_1 = require("crypto");
const MASTER_CSS = `
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; }
  h1 { font-size: 26px; margin: 0 0 8px 0; }
  h2 { font-size: 18px; margin: 24px 0 8px 0; color: #1f2937; border-bottom: 2px solid #1f2937; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 12px 0 4px 0; color: #374151; }
  .cover { text-align: center; padding: 80px 20px; }
  .cover .logo { font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #111827; }
  .cover .ref { font-size: 12px; color: #6b7280; margin-top: 24px; }
  .meta { font-size: 12px; color: #4b5563; }
  table.kv { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.kv td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: top; }
  table.kv td.k { width: 38%; color: #6b7280; font-weight: 600; }
  ul.toc { list-style: none; padding: 0; font-size: 13px; }
  ul.toc li { padding: 4px 0; border-bottom: 1px dashed #e5e7eb; display: flex; justify-content: space-between; }
  .piece { page-break-before: always; }
  .piece h3 { background: #f3f4f6; padding: 6px 8px; border-radius: 4px; }
  .piece .status { display: inline-block; padding: 2px 6px; font-size: 10px; border-radius: 999px; margin-left: 6px; }
  .status-UPLOADED  { background: #dbeafe; color: #1e40af; }
  .status-VALIDATED { background: #dcfce7; color: #166534; }
  .status-MISSING   { background: #fee2e2; color: #991b1b; }
  .status-REJECTED  { background: #fef3c7; color: #92400e; }
  .piece img { max-width: 100%; max-height: 600px; display: block; margin: 12px auto; border: 1px solid #e5e7eb; }
  .formulaire { page-break-before: always; }
  .footer-fixed { position: fixed; bottom: 6mm; left: 15mm; right: 15mm; font-size: 9px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 4px; display: flex; justify-content: space-between; }
  .qr { font-family: monospace; font-size: 8px; word-break: break-all; }
  @media print { .no-print { display: none; } }
`;
function escapeHtml(s) {
    if (s === null || s === undefined)
        return "—";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function row(k, v) {
    return `<tr><td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`;
}
/**
 * Calcule un hash SHA-256 du dossier compilé pour vérification d'intégrité.
 * Input : concat (dossierId | step | pieces codes | uploadedAt) — déterministe.
 */
function computeHash(draft, checklist) {
    const pieceFingerprint = checklist
        .map((p) => `${p.code}:${p.state.status}:${p.state.fileSize ?? 0}`)
        .sort()
        .join("|");
    const payload = [
        draft.dossierId,
        draft.step,
        draft.identification.projectType ?? "",
        draft.identification.commune ?? "",
        pieceFingerprint,
        draft.updatedAt,
    ].join("§");
    return (0, crypto_1.createHash)("sha256").update(payload).digest("hex");
}
/** Compile le PDF master HTML. */
function renderMaster(opts) {
    const { draft, checklist, formulairesHtml, embeds = {} } = opts;
    const now = new Date().toISOString();
    const hash = computeHash(draft, checklist);
    const qrPayload = `https://citurbarea.com/verify/pc/${draft.dossierId}?h=${hash.slice(0, 16)}`;
    const uploadedPieces = checklist.filter((p) => p.state.status === "UPLOADED" || p.state.status === "VALIDATED").length;
    // ── Cover
    const cover = `
    <div class="cover">
      <div class="logo">CITURBAREA</div>
      <h1 style="margin-top:32px;">Dossier Permis de Construire</h1>
      <p class="meta">Compilé le ${now.slice(0, 10)} à ${now.slice(11, 16)} UTC</p>
      <table class="kv" style="max-width:520px;margin:32px auto;">
        ${row("Dossier ID", draft.dossierId)}
        ${row("Type projet", draft.identification.projectType ?? "—")}
        ${row("Commune", draft.identification.commune ?? "—")}
        ${row("Surface terrain (m²)", draft.identification.surfaceTerrainM2 ?? "—")}
        ${row("Surface plancher (m²)", draft.identification.surfacePlancherM2 ?? "—")}
        ${row("Architecte CNOA", draft.identification.architecteCnoa ?? "—")}
        ${row("Visa CROA", draft.identification.visaCroa ?? "—")}
        ${row("Pièces uploadées", `${uploadedPieces} / ${checklist.length}`)}
      </table>
      <p class="ref">Hash SHA-256 : <span class="qr">${hash}</span></p>
      <p class="ref">Vérification : ${escapeHtml(qrPayload)}</p>
    </div>
  `;
    // ── Sommaire
    const tocItems = checklist
        .map((p) => `<li><span>${escapeHtml(p.label)}</span><span>${p.state.status}</span></li>`)
        .join("");
    const tocForms = formulairesHtml
        .map((f) => `<li><span>📄 ${escapeHtml(f.label)}</span><span>auto</span></li>`)
        .join("");
    const toc = `
    <div style="page-break-before: always;">
      <h2>Sommaire des pièces</h2>
      <ul class="toc">${tocItems}</ul>
      <h2>Formulaires générés</h2>
      <ul class="toc">${tocForms}</ul>
    </div>
  `;
    // ── Pièces
    const piecesHtml = checklist
        .map((p) => {
        const st = p.state.status;
        const statusBadge = `<span class="status status-${st}">${st}</span>`;
        let body = "";
        if (st === "UPLOADED" || st === "VALIDATED") {
            const embed = p.state.filePath ? embeds[p.state.filePath] : undefined;
            if (embed && embed.mimeType.startsWith("image/")) {
                body = `<img src="data:${embed.mimeType};base64,${embed.base64}" alt="${escapeHtml(p.label)}" />`;
            }
            else {
                body = `
            <p class="meta">Pièce fournie : <strong>${escapeHtml(p.state.fileName ?? "fichier")}</strong>
            (${((p.state.fileSize ?? 0) / 1024).toFixed(1)} KB)</p>
            <p class="meta" style="font-style: italic;">Le contenu original (PDF/document) est joint au dossier sous le code <code>${escapeHtml(p.code)}</code>.</p>
          `;
            }
        }
        else if (st === "MISSING") {
            body = `<p class="meta" style="color:#991b1b;">⚠ Pièce manquante — à fournir avant soumission.</p>`;
        }
        else {
            body = `<p class="meta" style="color:#92400e;">Pièce rejetée : ${escapeHtml(p.state.rejectReason ?? "raison non précisée")}.</p>`;
        }
        return `
        <div class="piece">
          <h3>${escapeHtml(p.label)} ${statusBadge}</h3>
          <p class="meta">${escapeHtml(p.description)}</p>
          ${body}
        </div>
      `;
    })
        .join("\n");
    // ── Formulaires (HTML déjà rendu — injection directe sans réécriture)
    const formulairesSection = formulairesHtml
        .map((f) => `
    <div class="formulaire">
      <h2>Formulaire — ${escapeHtml(f.label)}</h2>
      ${stripShell(f.html)}
    </div>
  `)
        .join("\n");
    // ── Document final
    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Dossier PC — ${escapeHtml(draft.identification.commune ?? "")} — ${escapeHtml(draft.dossierId.slice(0, 8))}</title>
  <style>${MASTER_CSS}</style>
</head>
<body>
  <div class="no-print" style="background:#fef3c7;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:12px;">
    Pour télécharger le PDF master, utilisez <strong>Fichier → Imprimer → Enregistrer en PDF</strong>
    (format A4, marges par défaut). Le hash SHA-256 figure en page de garde.
  </div>
  ${cover}
  ${toc}
  <h2 style="page-break-before:always;">Pièces du dossier</h2>
  ${piecesHtml}
  <h2 style="page-break-before:always;">Formulaires officiels</h2>
  ${formulairesSection}
  <div class="footer-fixed">
    <span>CITURBAREA · Dossier PC ${escapeHtml(draft.dossierId.slice(0, 8))}</span>
    <span class="qr">${hash.slice(0, 32)}…</span>
  </div>
</body>
</html>`;
    return {
        html,
        hash,
        qrPayload,
        totalPieces: checklist.length,
        uploadedPieces,
        formulairesCount: formulairesHtml.length,
    };
}
/** Retire l'enveloppe <html><body> des formulaires pour ré-injection. */
function stripShell(full) {
    const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch)
        return bodyMatch[1];
    return full;
}
/** Génère l'attestation "Dossier complet généré le X par CITURBAREA". */
function renderAttestation(opts) {
    const { draft, hash, qrPayload } = opts;
    const now = new Date().toISOString();
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Attestation CITURBAREA — Dossier PC</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; max-width: 720px; margin: 0 auto; color: #111827; }
    .seal { border: 4px double #1f2937; padding: 32px; text-align: center; }
    h1 { font-size: 24px; margin: 0 0 8px 0; }
    .ref { font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-all; }
    .qr { width: 140px; height: 140px; background: #f3f4f6; margin: 24px auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af; text-align: center; padding: 8px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="seal">
    <h1>Attestation de dossier complet</h1>
    <p style="font-size:13px;">CITURBAREA atteste que le dossier de demande de permis de construire
    référence <strong>${escapeHtml(draft.dossierId)}</strong> a été compilé et préparé conformément
    aux exigences réglementaires applicables à la commune de
    <strong>${escapeHtml(draft.identification.commune ?? "—")}</strong>.</p>
    <div class="qr">QR<br/>${escapeHtml(qrPayload)}</div>
    <p class="ref">Hash SHA-256 : ${hash}</p>
    <p style="font-size:11px;color:#6b7280;">Délivrée le ${now.slice(0, 10)} via citurbarea.com</p>
  </div>
</body>
</html>`;
}
