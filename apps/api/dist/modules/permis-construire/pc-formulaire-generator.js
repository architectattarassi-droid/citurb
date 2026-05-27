"use strict";
/**
 * Tome 2 — PC Formulaires generator.
 *
 * Génère les formulaires officiels (HTML imprimable) auto-pré-remplis à
 * partir des données d'identification du brouillon PC.
 *
 * Doctrine :
 *  - 100 % HTML inline-styled, pas de dépendance lourde (pas de Puppeteer).
 *  - L'utilisateur final fait File > Print → Save as PDF dans son navigateur.
 *  - Watermark CITURBAREA + horodatage générés systématiquement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formulairesRequis = formulairesRequis;
exports.renderFormulaire = renderFormulaire;
exports.prefillFormulaire = prefillFormulaire;
exports.listFormulairesCatalog = listFormulairesCatalog;
const baseHeadStyle = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 16px; margin-top: 24px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table.kv { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.kv td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-size: 13px; }
  table.kv td.k { width: 38%; color: #6b7280; font-weight: 600; }
  table.kv td.v { color: #111827; }
  .sign { margin-top: 32px; display: flex; gap: 32px; }
  .sign .box { flex: 1; border: 1px solid #d1d5db; height: 90px; padding: 8px; font-size: 11px; color: #6b7280; }
  .footer { margin-top: 40px; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  .watermark { position: fixed; bottom: 12px; right: 12px; font-size: 10px; color: #d1d5db; }
  @media print { .no-print { display: none; } body { padding: 16px; } }
`;
function htmlShell(title, body) {
    const now = new Date().toISOString();
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — CITURBAREA</title>
  <style>${baseHeadStyle}</style>
</head>
<body>
  <div class="no-print" style="background:#fef3c7;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:12px;">
    Pour générer le PDF, utilisez <strong>Fichier → Imprimer → Enregistrer en PDF</strong>.
  </div>
  ${body}
  <div class="footer">
    Document généré automatiquement par CITURBAREA — ${now} — citurbarea.com
  </div>
  <div class="watermark">CITURBAREA · ${now.slice(0, 10)}</div>
</body>
</html>`;
}
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
    return `<tr><td class="k">${escapeHtml(k)}</td><td class="v">${escapeHtml(v)}</td></tr>`;
}
function applyOverrides(base, overrides) {
    if (!overrides)
        return base;
    return { ...base, ...overrides };
}
// ───────────────────────────────────── Formulaires
const DEMANDE_AUTORISATION = {
    code: "DEMANDE_AUTORISATION",
    label: "Demande d'autorisation de construire",
    prefill: (d) => ({
        commune: d.identification.commune ?? "",
        prefecture: d.identification.prefecture ?? "",
        typeProjet: d.identification.projectType ?? "",
        surfaceTerrainM2: d.identification.surfaceTerrainM2 ?? "",
        surfacePlancherM2: d.identification.surfacePlancherM2 ?? "",
        niveaux: d.identification.niveaux ?? "",
        architecteSlug: d.identification.architecteSlug ?? "",
        architecteCnoa: d.identification.architecteCnoa ?? "",
        visaCroa: d.identification.visaCroa ?? "",
    }),
    render: (d, overrides) => {
        const data = applyOverrides(DEMANDE_AUTORISATION.prefill(d), overrides);
        const body = `
      <h1>Demande d'autorisation de construire</h1>
      <p style="font-size:12px;color:#6b7280;">Référentiel : Code de l'urbanisme — Décret 2-13-424 et arrêtés d'application.</p>
      <h2>Identification du projet</h2>
      <table class="kv">
        ${row("Commune", data.commune)}
        ${row("Préfecture / Province", data.prefecture)}
        ${row("Type de projet", data.typeProjet)}
        ${row("Surface du terrain (m²)", data.surfaceTerrainM2)}
        ${row("Surface plancher (m²)", data.surfacePlancherM2)}
        ${row("Nombre de niveaux", data.niveaux)}
      </table>
      <h2>Architecte conception</h2>
      <table class="kv">
        ${row("Architecte (slug Cercles)", data.architecteSlug)}
        ${row("N° CNOA", data.architecteCnoa)}
        ${row("Visa CROA", data.visaCroa)}
      </table>
      <h2>Engagement du maître d'ouvrage</h2>
      <p style="font-size:12px;">Le maître d'ouvrage soussigné déclare exact l'ensemble des informations
      figurant dans le présent dossier et s'engage à respecter les prescriptions du Plan d'Aménagement
      en vigueur ainsi que les règlements de construction applicables.</p>
      <div class="sign">
        <div class="box">Signature MO + cachet</div>
        <div class="box">Signature architecte + visa CROA</div>
      </div>
    `;
        return htmlShell(DEMANDE_AUTORISATION.label, body);
    },
};
const ENGAGEMENT_ARCHITECTE = {
    code: "ENGAGEMENT_ARCHITECTE",
    label: "Engagement de l'architecte",
    prefill: (d) => ({
        architecteSlug: d.identification.architecteSlug ?? "",
        architecteCnoa: d.identification.architecteCnoa ?? "",
        visaCroa: d.identification.visaCroa ?? "",
        commune: d.identification.commune ?? "",
        typeProjet: d.identification.projectType ?? "",
    }),
    render: (d, overrides) => {
        const data = applyOverrides(ENGAGEMENT_ARCHITECTE.prefill(d), overrides);
        const body = `
      <h1>Engagement de l'architecte</h1>
      <p style="font-size:12px;color:#6b7280;">Article 4 de la loi 016-89 relative à l'exercice de la profession d'architecte.</p>
      <table class="kv">
        ${row("Architecte (slug Cercles)", data.architecteSlug)}
        ${row("N° CNOA", data.architecteCnoa)}
        ${row("Visa CROA", data.visaCroa)}
        ${row("Commune du projet", data.commune)}
        ${row("Type de projet", data.typeProjet)}
      </table>
      <p style="font-size:13px;margin-top:16px;">
        Je soussigné, architecte inscrit au tableau de l'Ordre National des Architectes,
        m'engage à assurer la mission de conception et de suivi architectural du présent
        projet conformément aux règles de l'art et à la déontologie professionnelle.
      </p>
      <div class="sign">
        <div class="box">Cachet + signature architecte</div>
      </div>
    `;
        return htmlShell(ENGAGEMENT_ARCHITECTE.label, body);
    },
};
const NOTICE_INCENDIE = {
    code: "NOTICE_INCENDIE",
    label: "Notice sécurité incendie (ERP)",
    prefill: (d) => ({
        typeProjet: d.identification.projectType ?? "",
        surfacePlancherM2: d.identification.surfacePlancherM2 ?? "",
        niveaux: d.identification.niveaux ?? "",
    }),
    render: (d, overrides) => {
        const data = applyOverrides(NOTICE_INCENDIE.prefill(d), overrides);
        const body = `
      <h1>Notice sécurité incendie</h1>
      <p style="font-size:12px;color:#6b7280;">Décret n° 2-14-499 relatif aux ERP — Protection Civile.</p>
      <table class="kv">
        ${row("Type d'établissement", data.typeProjet)}
        ${row("Surface plancher (m²)", data.surfacePlancherM2)}
        ${row("Niveaux", data.niveaux)}
      </table>
      <h2>Dégagements et issues</h2>
      <p style="font-size:12px;">Nombre, largeur et localisation des issues à compléter par le BET incendie.</p>
      <h2>Moyens de secours</h2>
      <p style="font-size:12px;">Extincteurs, RIA, désenfumage, SSI — à détailler.</p>
      <div class="sign">
        <div class="box">BET incendie</div>
        <div class="box">Architecte</div>
      </div>
    `;
        return htmlShell(NOTICE_INCENDIE.label, body);
    },
};
const NOTICE_PMR = {
    code: "NOTICE_PMR",
    label: "Notice accessibilité PMR (NM ISO 23599)",
    prefill: (d) => ({
        typeProjet: d.identification.projectType ?? "",
    }),
    render: (d, overrides) => {
        const data = applyOverrides(NOTICE_PMR.prefill(d), overrides);
        const body = `
      <h1>Notice accessibilité PMR</h1>
      <p style="font-size:12px;color:#6b7280;">Norme marocaine NM ISO 23599 — accessibilité des bâtiments aux PMR.</p>
      <table class="kv">
        ${row("Type d'établissement", data.typeProjet)}
      </table>
      <h2>Cheminements extérieurs</h2>
      <p style="font-size:12px;">Pente ≤ 5 %, ressaut ≤ 2 cm, largeur ≥ 1,40 m.</p>
      <h2>Sanitaires adaptés</h2>
      <p style="font-size:12px;">Au moins un sanitaire PMR par niveau accessible au public.</p>
      <h2>Ascenseur</h2>
      <p style="font-size:12px;">Cabine ≥ 1,10 × 1,40 m, signalétique tactile et sonore.</p>
      <div class="sign">
        <div class="box">Architecte</div>
      </div>
    `;
        return htmlShell(NOTICE_PMR.label, body);
    },
};
const NOTICE_THERMIQUE = {
    code: "NOTICE_THERMIQUE",
    label: "Notice thermique RT 2024 (simplifiée)",
    prefill: (d) => ({
        typeProjet: d.identification.projectType ?? "",
        surfacePlancherM2: d.identification.surfacePlancherM2 ?? "",
        zoneSismique: d.identification.zoneSismique ?? "",
    }),
    render: (d, overrides) => {
        const data = applyOverrides(NOTICE_THERMIQUE.prefill(d), overrides);
        const body = `
      <h1>Notice thermique RT 2024 (simplifiée)</h1>
      <p style="font-size:12px;color:#6b7280;">Règlement Thermique de Construction au Maroc — édition 2024.</p>
      <table class="kv">
        ${row("Type de projet", data.typeProjet)}
        ${row("Surface plancher (m²)", data.surfacePlancherM2)}
        ${row("Zone climatique (référence)", data.zoneSismique)}
      </table>
      <h2>Enveloppe</h2>
      <p style="font-size:12px;">Coefficients U mur / toiture / plancher / vitrage — à compléter.</p>
      <h2>Inertie et confort d'été</h2>
      <p style="font-size:12px;">Choix matériaux + protections solaires.</p>
      <div class="sign">
        <div class="box">BET thermique</div>
      </div>
    `;
        return htmlShell(NOTICE_THERMIQUE.label, body);
    },
};
const REGISTRY = {
    DEMANDE_AUTORISATION,
    ENGAGEMENT_ARCHITECTE,
    NOTICE_INCENDIE,
    NOTICE_PMR,
    NOTICE_THERMIQUE,
};
/** Détermine les formulaires à générer selon le type projet. */
function formulairesRequis(draft) {
    const base = [
        "DEMANDE_AUTORISATION",
        "ENGAGEMENT_ARCHITECTE",
        "NOTICE_THERMIQUE",
    ];
    const t = draft.identification.projectType;
    if (t === "ERP" || t === "MOSQUEE")
        base.push("NOTICE_INCENDIE");
    if (t === "ERP" || t === "EQUIPEMENT_PUBLIC")
        base.push("NOTICE_PMR");
    return base;
}
/** Rend un formulaire en HTML imprimable. */
function renderFormulaire(code, draft, overrides) {
    const spec = REGISTRY[code];
    if (!spec)
        throw new Error(`Formulaire inconnu : ${code}`);
    return { html: spec.render(draft, overrides), label: spec.label };
}
/** Pré-saisie d'un formulaire (pour affichage UI avant validation). */
function prefillFormulaire(code, draft) {
    const spec = REGISTRY[code];
    if (!spec)
        return {};
    return spec.prefill(draft);
}
/** Liste des formulaires connus avec leur label. */
function listFormulairesCatalog() {
    return Object.values(REGISTRY).map((s) => ({ code: s.code, label: s.label }));
}
