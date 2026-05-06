"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRendererService = void 0;
const common_1 = require("@nestjs/common");
const WATERMARK_TEXT = "Rapport exclusif CITURBAREA — utilisable sur autorisation écrite";
let ReportRendererService = class ReportRendererService {
    renderHtml(ctx) {
        const today = new Date().toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
        const dash = (s) => (s == null || s === "" ? "_______________" : String(s));
        const fmt = (n) => Number.isFinite(Number(n))
            ? new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n))
            : "—";
        const isP4 = ctx.porteType === "P4";
        const isP5 = ctx.porteType === "P5";
        const brief = ctx.brief || {};
        const quote = brief.quoteSnapshot || {};
        // Header par porte
        const reportTitle = isP4
            ? "Rapport d'analyse foncière"
            : "Rapport d'expertise";
        const subtitle = isP4
            ? `Pack ${brief.packLabel ?? "—"}`
            : `${brief.reportLabel ?? "—"}`;
        // Métadonnées projet
        const projectInfo = isP4
            ? [
                ["Pack", brief.packLabel],
                ["N° titre foncier", brief.titreFoncierNum],
                ["Adresse", brief.adresse],
                ["Surface terrain", brief.surfaceTerrainHa ? `${brief.surfaceTerrainHa} ha` : null],
                ["Prix de vente / acquisition", brief.prixVenteFoncierDH ? `${fmt(brief.prixVenteFoncierDH)} DH` : null],
                ["Nature usage prévu", brief.natureUsagePrevu],
            ]
            : [
                ["Type de rapport", brief.reportLabel],
                ["Surface du bien", brief.surfaceSlot],
                ["Délai mode", brief.delayMode],
                ["Adresse du bien", brief.adresseBien],
            ];
        const sections = ctx.adminContent?.sections ?? this.defaultSections(ctx);
        const conclusion = ctx.adminContent?.conclusion ?? this.defaultConclusion(ctx);
        const expertNom = ctx.adminContent?.expertNom ?? "[Expert à compléter]";
        const expertOrdre = ctx.adminContent?.expertNumeroOrdre ?? "—";
        const dateDelivrance = ctx.adminContent?.dateDelivrance
            ? new Date(ctx.adminContent.dateDelivrance).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" })
            : today;
        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${reportTitle} — ${dash(ctx.clientNom || ctx.raisonSociale)}</title>
<style>
  @media print {
    body { margin: 0; }
    .no-print { display: none !important; }
    .watermark-grid::before, .watermark-grid::after { opacity: 0.18; }
  }
  html, body { background: #fff; }
  body { font-family: "Times New Roman", Times, serif; color: #111; max-width: 760px; margin: 24px auto; padding: 0 32px 60px; line-height: 1.55; font-size: 12pt; position: relative; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 12px 0; border-bottom: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; z-index: 100; }
  .toolbar button { background: #b45309; color: #fff; border: 0; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .toolbar button.secondary { background: #fff; color: #111; border: 1px solid #d1d5db; }

  /* WATERMARK répété en grille fixe via pseudo-éléments + CSS répété */
  .watermark-grid {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background-image:
      repeating-linear-gradient(
        -28deg,
        transparent 0,
        transparent 200px,
        rgba(180, 83, 9, 0.08) 200px,
        rgba(180, 83, 9, 0.08) 240px
      );
  }
  .watermark-text {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
  }
  .watermark-text span {
    transform: rotate(-28deg);
    font-size: 28pt;
    color: rgba(180, 83, 9, 0.16);
    font-weight: 800;
    letter-spacing: 4px;
    white-space: nowrap;
    text-align: center;
    line-height: 1.6;
  }

  .content { position: relative; z-index: 5; }

  h1 { font-size: 20pt; text-align: center; margin: 32px 0 6px; text-transform: uppercase; letter-spacing: 1.5px; color: #1f2937; }
  h2 { font-size: 14pt; text-align: center; margin: 6px 0 32px; font-weight: normal; color: #6b7280; }
  h3 { font-size: 13pt; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; color: #1f2937; }
  .ribbon { background: linear-gradient(90deg,#92400e,#b45309); color: #fff; padding: 10px 18px; border-radius: 4px; text-align: center; font-weight: 700; font-size: 12pt; margin: 16px 0; letter-spacing: 1px; }
  .meta-grid { display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; background: #fafafa; padding: 16px 20px; border-left: 4px solid #b45309; margin: 20px 0; font-size: 11pt; }
  .meta-grid .k { color: #6b7280; }
  .meta-grid .v { font-weight: 600; }
  .section-body { white-space: pre-wrap; line-height: 1.7; padding: 4px 0 12px; }
  .conclusion-box { background: #fef3c7; border: 1.5px solid #fbbf24; border-radius: 6px; padding: 18px 22px; margin: 28px 0; font-size: 11.5pt; line-height: 1.7; }
  .signature-block { margin-top: 64px; padding-top: 24px; border-top: 1px solid #d1d5db; }
  .signature-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .signature-block .label { font-size: 10pt; color: #6b7280; margin-bottom: 4px; }
  .signature-block .name { font-weight: 700; }
  .signature-block .ordre { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .signature-block .date { text-align: right; font-size: 10pt; color: #6b7280; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 9pt; }

  ${ctx.isAdminPreview ? ".admin-banner { background: #1f2937; color: #fde68a; padding: 8px 16px; text-align: center; font-size: 10pt; margin-bottom: 16px; border-radius: 4px; }" : ""}
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<div class="watermark-grid"></div>
<div class="watermark-text"><span>${WATERMARK_TEXT}</span></div>

<div class="content">

${ctx.isAdminPreview ? `<div class="admin-banner">⚠️ APERÇU ADMIN — Le client ne voit ce rapport qu'après activation du pack</div>` : ""}

<h1>${reportTitle}</h1>
<h2>${subtitle}</h2>

<div class="ribbon">${WATERMARK_TEXT}</div>

<h3>I — Maître d'Ouvrage</h3>
<div class="meta-grid">
  <div class="k">Nom / Raison sociale</div><div class="v">${dash(ctx.clientNom || ctx.raisonSociale)}</div>
  ${ctx.raisonSociale && ctx.clientNom ? `<div class="k">Représentant</div><div class="v">${dash(ctx.clientNom)}</div>` : ""}
  <div class="k">Commune</div><div class="v">${dash(ctx.commune)}</div>
  <div class="k">Référence dossier</div><div class="v">${ctx.dossierId.slice(0, 12)}…</div>
</div>

<h3>II — Objet du rapport</h3>
<div class="meta-grid">
  ${projectInfo.filter(([_, v]) => v).map(([k, v]) => `<div class="k">${k}</div><div class="v">${dash(v)}</div>`).join("")}
</div>

${quote && quote.amounts ? `
<h3>III — Honoraires</h3>
<div class="meta-grid">
  <div class="k">Montant TTC</div><div class="v">${fmt(quote.amounts.totalTTC)} DH</div>
  <div class="k">Délai de livraison</div><div class="v">${quote.meta?.deliveryDays ?? "—"} jours ouvrables</div>
</div>
` : ""}

<h3>IV — Analyse</h3>
${sections.map(s => `
  <div style="margin: 18px 0;">
    <div style="font-weight: 700; color: #92400e; font-size: 12.5pt; margin-bottom: 8px;">${s.title}</div>
    <div class="section-body">${s.body}</div>
  </div>
`).join("")}

<h3>V — Conclusion</h3>
<div class="conclusion-box">${conclusion}</div>

<div class="signature-block">
  <div class="signature-row">
    <div>
      <div class="label">L'Expert signataire</div>
      <div class="name">${expertNom}</div>
      <div class="ordre">N° Ordre : ${expertOrdre}</div>
    </div>
    <div class="date">
      <div>Délivré le</div>
      <div style="font-weight: 600; color: #111;">${dateDelivrance}</div>
    </div>
  </div>
</div>

<div class="footer">
  ${WATERMARK_TEXT}<br/>
  Toute reproduction, transmission ou utilisation à des fins autres que celles convenues<br/>
  avec CITURBAREA est strictement interdite et expose à des poursuites judiciaires.<br/>
  <br/>
  © CITURBAREA · Plateforme d'orchestration architecturale et urbanistique · ${today}
</div>

</div>
</body>
</html>`;
    }
    defaultSections(ctx) {
        const isP4 = ctx.porteType === "P4";
        if (isP4) {
            const pack = ctx.brief?.pack;
            const sections = [
                {
                    title: "Analyse urbanistique",
                    body: "[À compléter par l'expert]\n\n• Zonage applicable au plan d'aménagement\n• Coefficients d'occupation (COS) et d'emprise au sol (CES) admissibles\n• Hauteurs maximales et nombre de niveaux\n• Servitudes urbanistiques (recul, prospect, alignement)\n• Restrictions environnementales et patrimoniales applicables",
                },
            ];
            if (pack === "MOYEN" || pack === "RENTABILITE") {
                sections.push({
                    title: "Analyse juridique",
                    body: "[À compléter par l'expert]\n\n• Vérification du titre foncier et de ses inscriptions\n• État des charges réelles (hypothèques, privilèges)\n• Mitoyennetés et servitudes inscrites\n• Audit des actes antérieurs (vente, donation, succession)\n• Avis sur risque juridique (litiges, conflits potentiels)",
                });
            }
            if (pack === "RENTABILITE") {
                sections.push({
                    title: "Scénario de rentabilité",
                    body: "[À compléter par l'expert]\n\n• Étude de marché immobilier comparé (prix m² zone)\n• Programmation optimale (typologies, densités)\n• Estimation prix de vente prévisionnels (3 hypothèses)\n• Calcul de marge promoteur (coût total vs CA prévisionnel)\n• Analyse de sensibilité prix / délais / coûts\n• Recommandation Go/No-Go avec ROI attendu",
                });
            }
            return sections;
        }
        // P5
        const reportType = ctx.brief?.reportType;
        if (reportType === "ESTIMATION_VENALE") {
            return [{ title: "Méthodologie d'estimation", body: "[À compléter]\n\n• Visite et relevé du bien\n• Étude de marché comparée (3 références minimum)\n• Note d'expertise méthodologique\n• Estimation de valeur fondée (fourchette + valeur centrale)" }];
        }
        if (reportType === "CONFORMITE_URBANISTIQUE") {
            return [{ title: "Vérification de conformité", body: "[À compléter]\n\n• Analyse du titre foncier et note de renseignement urbanistique\n• Vérification COS/CES/hauteur/recul/façades\n• Comparaison plans autorisés vs réalisé\n• Identification des écarts et infractions" }];
        }
        if (reportType === "RISQUE_TECHNIQUE") {
            return [{ title: "Audit de risque", body: "[À compléter]\n\n• Étude des aléas (sismique, inondation, glissement)\n• Consultation des cartes officielles et zonage\n• Visite et observations terrain\n• Note de vulnérabilité du bâti\n• Mesures de mitigation recommandées" }];
        }
        return [{ title: "Diagnostic technique", body: "[À compléter]\n\n• Diagnostic gros œuvre + second œuvre + équipements\n• Identification des pathologies\n• Estimation chiffrée des travaux à prévoir\n• Photos référencées + plans annotés" }];
    }
    defaultConclusion(_ctx) {
        return "[Conclusion à compléter par l'expert : avis synthétique, recommandations actionnables, points de vigilance.]";
    }
};
exports.ReportRendererService = ReportRendererService;
exports.ReportRendererService = ReportRendererService = __decorate([
    (0, common_1.Injectable)()
], ReportRendererService);
