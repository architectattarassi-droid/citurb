import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * CpsGeneratorService — génère un CPS (Cahier des Prescriptions Spéciales)
 * canonique, TRILINGUE (fr/ar/en), à partir des gabarits JSON
 * `apps/api/data/cps-templates/`.
 *
 * Le document assemblé couvre :
 *   1. Page de garde
 *   2. Clauses administratives & juridiques (bibliothèque, filtrées public/privé)
 *   3. Clauses techniques par lot (structure 3-parties CSI : General/Products/
 *      Execution), groupées par famille (gros œuvre, second œuvre, technique…)
 *   4. Bordereau des prix - détail estimatif (BPDE) consolidé
 *
 * Compatibilité : accepte les gabarits v1 (texte simple) ET v2 (objets i18n
 * {fr,ar,en}). Le helper `pick()` retombe sur fr → en → ar si la langue
 * demandée manque.
 */

export type CpsLang = "fr" | "ar" | "en";
type I18n = { fr?: string; ar?: string; en?: string } | string | undefined | null;

type LotRef = { code: string; obligatoire: boolean; ordre: number; condition?: string };

type Article = {
  numero: string;
  partie?: "GENERAL" | "PRODUITS" | "EXECUTION";
  titre: I18n;
  corpsMD: I18n;
};
type BordereauPoste = {
  code?: string;
  designation: I18n;
  unite?: string;
  modeMetreMD?: I18n;
};
type LotTemplate = {
  code: string;
  numero: number;
  famille?: string;
  intitule: I18n;
  description?: I18n;
  normesRefs?: string[];
  secteurQualifMA?: string[];
  competencesRequises?: string[];
  articles: Article[];
  bordereau?: BordereauPoste[];
  cross_referencesInterlots?: Array<{ lotCible: string; type?: string; description?: I18n }>;
  metadata?: Record<string, any>;
};
type ProjectType = {
  code: string;
  label: I18n;
  description?: I18n;
  porteScope?: string[];
  defaultClasseSismique?: string;
  defaultZoneSismique?: string;
  defaultZoneRT?: string;
  defaultZoneRTCM?: string;
  lots: LotRef[];
  normesPivots?: string[];
  clausesLegalesObligatoires?: string[];
  assurancesObligatoires?: Array<Record<string, any>>;
  visasObligatoires?: Array<Record<string, any>>;
  marketTypes?: string[];
  permisRequis?: string[];
  metadata?: Record<string, any>;
};
type Clause = {
  code: string;
  categorie?: string;
  titre: I18n;
  corpsMD: I18n;
  fondement?: string;
  marche?: string[];
};

export type CpsGenerateInput = {
  projectTypeCode: string;
  projectName: string;
  projectAddress?: string;
  commune?: string;
  zoneSismique?: string;
  coefA?: string | number;
  maxTransportKm?: string | number;
  montantTravauxLot?: string | number;
  lang?: CpsLang;
  marketType?: "PUBLIC" | "PRIVE";
  options?: string[];
  vars?: Record<string, string | number>;
};

export type CpsLotResult = {
  code: string;
  numero: number | null;
  famille: string;
  intitule: string;
  obligatoire: boolean;
  present: boolean;
  articlesCount: number;
};

export type CpsBordereauRow = {
  code: string;
  lotCode: string;
  lotNumero: number | null;
  lotIntitule: string;
  famille: string;
  designation: string;
  unite: string;
};

export type CpsDocument = {
  projectTypeCode: string;
  projectTypeLabel: string;
  projectName: string;
  lang: CpsLang;
  marketType: "PUBLIC" | "PRIVE";
  generatedAt: string;
  lots: CpsLotResult[];
  missingLots: string[];
  clausesCount: number;
  bordereauCount: number;
  bordereau: CpsBordereauRow[];
  markdown: string;
  html: string;
};

// Ordre + libellés trilingues des familles de lots.
const FAMILLE_ORDER = ["GENERALITES", "GROS_OEUVRE", "CLOS_COUVERT", "SECOND_OEUVRE", "TECHNIQUE_CES", "VRD", "SPECIAL"];
const FAMILLE_LABELS: Record<string, Record<CpsLang, string>> = {
  GENERALITES: { fr: "Généralités & prescriptions communes", ar: "مقتضيات عامة", en: "General provisions" },
  GROS_OEUVRE: { fr: "Gros œuvre & structure", ar: "الأشغال الكبرى والهيكل", en: "Structural works" },
  CLOS_COUVERT: { fr: "Clos & couvert", ar: "الإغلاق والتغطية", en: "Building envelope" },
  SECOND_OEUVRE: { fr: "Second œuvre & finitions", ar: "الأشغال الثانوية والتشطيبات", en: "Finishing works" },
  TECHNIQUE_CES: { fr: "Lots techniques (fluides & courants)", ar: "الأشغال التقنية", en: "Technical (MEP) works" },
  VRD: { fr: "VRD & aménagements extérieurs", ar: "الطرق والشبكات والتهيئة الخارجية", en: "Infrastructure & external works" },
  SPECIAL: { fr: "Lots spéciaux", ar: "أشغال خاصة", en: "Special works" },
};

const PARTIE_LABELS: Record<string, Record<CpsLang, string>> = {
  GENERAL: { fr: "Dispositions générales", ar: "أحكام عامة", en: "General" },
  PRODUITS: { fr: "Produits & matériaux", ar: "المنتجات والمواد", en: "Products" },
  EXECUTION: { fr: "Exécution & contrôles", ar: "التنفيذ والمراقبة", en: "Execution" },
};

// Chrome du document (titres de sections) en 3 langues.
const UI: Record<string, Record<CpsLang, string>> = {
  cpsTitle: { fr: "Cahier des Prescriptions Spéciales (CPS)", ar: "دفتر التحملات الخاصة", en: "Special Technical Specifications" },
  project: { fr: "Projet", ar: "المشروع", en: "Project" },
  type: { fr: "Type", ar: "النوع", en: "Type" },
  location: { fr: "Localisation", ar: "الموقع", en: "Location" },
  seismicZone: { fr: "Zone sismique (RPS 2011)", ar: "المنطقة الزلزالية (RPS 2011)", en: "Seismic zone (RPS 2011)" },
  thermalZone: { fr: "Zone thermique (RTCM)", ar: "المنطقة الحرارية (RTCM)", en: "Thermal zone (RTCM)" },
  date: { fr: "Date d'établissement", ar: "تاريخ الإعداد", en: "Issue date" },
  market: { fr: "Type de marché", ar: "نوع الصفقة", en: "Contract type" },
  marketPublic: { fr: "Marché public", ar: "صفقة عمومية", en: "Public contract" },
  marketPrive: { fr: "Marché privé", ar: "صفقة خاصة", en: "Private contract" },
  disclaimer: {
    fr: "Document généré par CITURBAREA. À valider par l'architecte et le BET avant diffusion.",
    ar: "وثيقة مُنشأة بواسطة CITURBAREA. تخضع لمصادقة المهندس المعماري ومكتب الدراسات قبل النشر.",
    en: "Generated by CITURBAREA. To be validated by the architect and engineering office before release.",
  },
  legalClauses: { fr: "Clauses administratives & juridiques", ar: "البنود الإدارية والقانونية", en: "Administrative & legal clauses" },
  technicalClauses: { fr: "Prescriptions techniques par lot", ar: "المواصفات التقنية حسب الصنف", en: "Technical specifications by lot" },
  normesPivots: { fr: "Normes pivots applicables", ar: "المعايير المرجعية المطبقة", en: "Reference standards" },
  assurances: { fr: "Assurances obligatoires", ar: "التأمينات الإجبارية", en: "Mandatory insurance" },
  visas: { fr: "Visas obligatoires", ar: "التأشيرات الإجبارية", en: "Mandatory approvals" },
  bordereau: { fr: "Bordereau des prix — détail estimatif (BPDE)", ar: "جدول الأثمان والتقدير التفصيلي", en: "Bill of quantities (BoQ)" },
  bColLot: { fr: "Lot", ar: "الصنف", en: "Lot" },
  bColCode: { fr: "N°", ar: "رقم", en: "No." },
  bColDesignation: { fr: "Désignation", ar: "التعيين", en: "Description" },
  bColUnit: { fr: "U", ar: "الوحدة", en: "Unit" },
  bColQty: { fr: "Qté", ar: "الكمية", en: "Qty" },
  bColPU: { fr: "P.U. (MAD)", ar: "الثمن الفردي (د.م)", en: "Unit price (MAD)" },
  bColTotal: { fr: "Montant (MAD)", ar: "المبلغ (د.م)", en: "Amount (MAD)" },
  refStandards: { fr: "Normes de référence", ar: "المعايير المرجعية", en: "Reference standards" },
  qualif: { fr: "Qualification requise", ar: "التأهيل المطلوب", en: "Required qualification" },
  basisLabel: { fr: "Fondement", ar: "الأساس القانوني", en: "Legal basis" },
  toComplete: { fr: "Gabarit technique en cours de rédaction.", ar: "النموذج التقني قيد الإعداد.", en: "Technical template under preparation." },
};

@Injectable()
export class CpsGeneratorService {
  private readonly log = new Logger(CpsGeneratorService.name);
  private rootCache: string | null = null;

  // ── Catalogue ───────────────────────────────────────────────────

  async listProjectTypes(lang: CpsLang = "fr") {
    const dir = path.join(await this.root(), "project-types");
    const files = await this.safeReaddir(dir);
    const out: any[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const pt = await this.readJson<ProjectType>(path.join(dir, f));
      if (pt) {
        out.push({
          code: pt.code,
          label: pick(pt.label, lang),
          description: pick(pt.description, lang),
          porteScope: pt.porteScope,
          marketTypes: pt.marketTypes ?? ["PUBLIC", "PRIVE"],
          lotsCount: Array.isArray(pt.lots) ? pt.lots.length : 0,
        });
      }
    }
    return out;
  }

  async listLots(lang: CpsLang = "fr") {
    const dir = path.join(await this.root(), "lots");
    const files = await this.safeReaddir(dir);
    const out: any[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const lot = await this.readJson<LotTemplate>(path.join(dir, f));
      if (lot) {
        out.push({
          code: lot.code,
          numero: lot.numero,
          famille: lot.famille ?? this.inferFamille(lot),
          intitule: pick(lot.intitule, lang),
          articlesCount: Array.isArray(lot.articles) ? lot.articles.length : 0,
          bordereauCount: Array.isArray(lot.bordereau) ? lot.bordereau.length : 0,
        });
      }
    }
    return out.sort((a, b) => a.numero - b.numero);
  }

  // ── Génération ──────────────────────────────────────────────────

  async generate(input: CpsGenerateInput): Promise<CpsDocument> {
    if (!input?.projectTypeCode) throw new BadRequestException("projectTypeCode requis");
    if (!input?.projectName) throw new BadRequestException("projectName requis");
    const lang: CpsLang = input.lang && ["fr", "ar", "en"].includes(input.lang) ? input.lang : "fr";
    const marketType = input.marketType === "PUBLIC" ? "PUBLIC" : "PRIVE";

    const pt = await this.loadProjectType(input.projectTypeCode);
    const vars = this.buildVars(input, pt);
    const options = new Set((input.options ?? []).map(String));

    const resolved = (pt.lots ?? [])
      .filter((l) => l.obligatoire || !l.condition || options.has(l.condition))
      .sort((a, b) => a.ordre - b.ordre);

    const lotResults: CpsLotResult[] = [];
    const missingLots: string[] = [];
    const loadedLots: Array<{ ref: LotRef; tpl: LotTemplate }> = [];

    for (const ref of resolved) {
      const tpl = await this.loadLot(ref.code);
      if (tpl) {
        const famille = tpl.famille ?? this.inferFamille(tpl);
        lotResults.push({
          code: ref.code,
          numero: tpl.numero,
          famille,
          intitule: pick(tpl.intitule, lang),
          obligatoire: ref.obligatoire,
          present: true,
          articlesCount: tpl.articles?.length ?? 0,
        });
        loadedLots.push({ ref, tpl: { ...tpl, famille } });
      } else {
        lotResults.push({
          code: ref.code,
          numero: null,
          famille: "SPECIAL",
          intitule: ref.code,
          obligatoire: ref.obligatoire,
          present: false,
          articlesCount: 0,
        });
        missingLots.push(ref.code);
      }
    }

    const clauses = await this.loadClauses(pt.clausesLegalesObligatoires ?? [], marketType);
    const bordereau = this.collectBordereau(loadedLots, lang);

    const markdown = this.composeMarkdown(pt, input, vars, lang, marketType, loadedLots, missingLots, clauses);
    const html = this.renderHtml(pt, input, vars, lang, marketType, loadedLots, missingLots, clauses);

    return {
      projectTypeCode: pt.code,
      projectTypeLabel: pick(pt.label, lang),
      projectName: input.projectName,
      lang,
      marketType,
      generatedAt: new Date().toISOString(),
      lots: lotResults,
      missingLots,
      clausesCount: clauses.length,
      bordereauCount: bordereau.length,
      bordereau,
      markdown,
      html,
    };
  }

  // ── Variables ───────────────────────────────────────────────────

  private buildVars(input: CpsGenerateInput, pt: ProjectType): Record<string, string> {
    const vars: Record<string, string> = {
      PROJECT_NAME: input.projectName,
      PROJECT_ADDRESS: input.projectAddress || input.commune || "[adresse du projet]",
      COMMUNE: input.commune || input.projectAddress || "[commune]",
      ZONE_SISMIQUE: String(input.zoneSismique || pt.defaultZoneSismique || pt.defaultClasseSismique || "[à préciser]"),
      MAX_TRANSPORT_KM: String(input.maxTransportKm ?? 40),
      COEF_A: input.coefA != null ? String(input.coefA) : "[à préciser par le BET]",
      MONTANT_TRAVAUX_LOT:
        input.montantTravauxLot != null ? `${Number(input.montantTravauxLot).toLocaleString("fr-FR")}` : "[montant du lot]",
    };
    for (const [k, v] of Object.entries(input.vars ?? {})) vars[k] = String(v);
    return vars;
  }

  private substitute(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_m, key: string) =>
      key in vars ? vars[key] : `[à compléter : ${key}]`,
    );
  }

  // ── Markdown ────────────────────────────────────────────────────

  private composeMarkdown(
    pt: ProjectType,
    input: CpsGenerateInput,
    vars: Record<string, string>,
    lang: CpsLang,
    marketType: "PUBLIC" | "PRIVE",
    loadedLots: Array<{ ref: LotRef; tpl: LotTemplate }>,
    missingLots: string[],
    clauses: Clause[],
  ): string {
    const t = (k: string) => UI[k][lang];
    const d = new Date();
    const out: string[] = [];

    // Page de garde
    out.push(`# ${t("cpsTitle")}`);
    out.push("");
    out.push(`**${t("project")}** : ${input.projectName}`);
    out.push(`**${t("type")}** : ${pick(pt.label, lang)}`);
    out.push(`**${t("location")}** : ${vars.PROJECT_ADDRESS}`);
    out.push(`**${t("market")}** : ${marketType === "PUBLIC" ? t("marketPublic") : t("marketPrive")}`);
    out.push(`**${t("seismicZone")}** : ${vars.ZONE_SISMIQUE}`);
    const zRT = pt.defaultZoneRTCM || pt.defaultZoneRT;
    if (zRT) out.push(`**${t("thermalZone")}** : ${zRT}`);
    out.push(`**${t("date")}** : ${d.toLocaleDateString("fr-FR")}`);
    out.push("");
    out.push(`> ${t("disclaimer")}`);
    out.push("");

    // Normes pivots
    if (pt.normesPivots?.length) {
      out.push(`## ${t("normesPivots")}`);
      out.push("");
      for (const n of pt.normesPivots) out.push(`- ${n}`);
      out.push("");
    }

    // Clauses administratives & juridiques
    if (clauses.length) {
      out.push(`# ${t("legalClauses")}`);
      out.push("");
      let i = 1;
      for (const c of clauses) {
        out.push(`## A.${i} ${pick(c.titre, lang)}`);
        if (c.fondement) out.push(`\n_${t("basisLabel")} : ${c.fondement}_`);
        out.push("");
        out.push(this.substitute(pick(c.corpsMD, lang), vars));
        out.push("");
        i++;
      }
    }

    // Assurances / visas
    if (pt.assurancesObligatoires?.length) {
      out.push(`## ${t("assurances")}`);
      out.push("");
      for (const a of pt.assurancesObligatoires)
        out.push(`- **${a.type}** — ${a.souscripteur ?? a.souscripteurDefault ?? "—"}${a.fondement ? ` (${a.fondement})` : ""}`);
      out.push("");
    }
    if (pt.visasObligatoires?.length) {
      out.push(`## ${t("visas")}`);
      out.push("");
      for (const v of pt.visasObligatoires)
        out.push(`- **${v.type}** — ${v.phase ?? "—"}${v.delaiLegal ? ` (${v.delaiLegal} j)` : ""}`);
      out.push("");
    }

    // Clauses techniques par lot, groupées par famille
    out.push(`# ${t("technicalClauses")}`);
    out.push("");
    for (const famille of this.familleOrder(loadedLots)) {
      const lotsInFam = loadedLots.filter((l) => l.tpl.famille === famille);
      if (!lotsInFam.length) continue;
      out.push(`## ${FAMILLE_LABELS[famille]?.[lang] ?? famille}`);
      out.push("");
      for (const { tpl } of lotsInFam) out.push(this.renderLotMd(tpl, vars, lang));
    }
    for (const code of missingLots) {
      out.push(`## ${code}`);
      out.push("");
      out.push(`> _${t("toComplete")}_`);
      out.push("");
    }

    // Bordereau des prix
    const bordereau = this.collectBordereau(loadedLots, lang);
    if (bordereau.length) {
      out.push(`# ${t("bordereau")}`);
      out.push("");
      out.push(`| ${t("bColCode")} | ${t("bColDesignation")} | ${t("bColUnit")} | ${t("bColQty")} | ${t("bColPU")} | ${t("bColTotal")} |`);
      out.push(`|---|---|---|---|---|---|`);
      for (const r of bordereau) out.push(`| ${r.code} | ${escapePipe(r.designation)} | ${r.unite} | | | |`);
      out.push("");
    }

    return out.join("\n");
  }

  private renderLotMd(lot: LotTemplate, vars: Record<string, string>, lang: CpsLang): string {
    const t = (k: string) => UI[k][lang];
    const lines: string[] = [];
    lines.push(`### ${this.lotNumeroLabel(lot)} — ${pick(lot.intitule, lang)}`);
    if (lot.description) lines.push(`\n_${this.substitute(pick(lot.description, lang), vars)}_`);
    if (lot.normesRefs?.length) lines.push(`\n**${t("refStandards")}** : ${lot.normesRefs.join(", ")}`);
    if (lot.secteurQualifMA?.length) lines.push(`\n**${t("qualif")}** : ${lot.secteurQualifMA.join(", ")}`);
    lines.push("");
    // Articles groupés par partie CSI s'ils sont étiquetés.
    const hasParts = lot.articles?.some((a) => a.partie);
    if (hasParts) {
      for (const partie of ["GENERAL", "PRODUITS", "EXECUTION"]) {
        const arts = lot.articles.filter((a) => (a.partie ?? "GENERAL") === partie);
        if (!arts.length) continue;
        lines.push(`#### ${PARTIE_LABELS[partie][lang]}`);
        lines.push("");
        for (const art of arts) this.pushArticleMd(lines, art, vars, lang);
      }
    } else {
      for (const art of lot.articles ?? []) this.pushArticleMd(lines, art, vars, lang);
    }
    return lines.join("\n");
  }

  private pushArticleMd(lines: string[], art: Article, vars: Record<string, string>, lang: CpsLang) {
    lines.push(`##### ${art.numero} ${pick(art.titre, lang)}`);
    lines.push("");
    lines.push(this.substitute(pick(art.corpsMD, lang), vars));
    lines.push("");
  }

  // ── HTML (assemblé depuis le markdown ; RTL pour l'arabe) ────────

  private renderHtml(
    pt: ProjectType,
    input: CpsGenerateInput,
    vars: Record<string, string>,
    lang: CpsLang,
    marketType: "PUBLIC" | "PRIVE",
    loadedLots: Array<{ ref: LotRef; tpl: LotTemplate }>,
    missingLots: string[],
    clauses: Clause[],
  ): string {
    const md = this.composeMarkdown(pt, input, vars, lang, marketType, loadedLots, missingLots, clauses);
    const body = mdToHtml(md);
    const dir = lang === "ar" ? "rtl" : "ltr";
    const title = `CPS — ${escapeHtml(input.projectName)}`;
    return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  body{font-family:${lang === "ar" ? "'Noto Naskh Arabic',Amiri," : ""}Georgia,'Times New Roman',serif;max-width:840px;margin:0 auto;padding:40px 28px;color:#1a1a2e;line-height:1.7;direction:${dir}}
  h1{font-size:24px;border-bottom:3px solid #0B1B3A;padding-bottom:8px;color:#0B1B3A;margin-top:34px}
  h2{font-size:19px;color:#0B1B3A;margin-top:26px;border-bottom:1px solid #ddd;padding-bottom:4px}
  h3{font-size:16px;color:#23314f;margin-top:20px}
  h4{font-size:14px;color:#C9A227;text-transform:uppercase;letter-spacing:.04em;margin-top:16px}
  h5{font-size:13.5px;color:#23314f;margin-top:14px}
  blockquote{background:#f5f3ec;border-${dir === "rtl" ? "right" : "left"}:4px solid #C9A227;margin:12px 0;padding:8px 14px;color:#555;font-style:italic}
  table{border-collapse:collapse;width:100%;margin:14px 0;font-size:12.5px}
  th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:${dir === "rtl" ? "right" : "left"}}
  th{background:#0B1B3A;color:#fff}
  code{background:#f0f0f0;padding:1px 4px;border-radius:3px}
  .cit-foot{margin-top:40px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#888;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
${body}
<div class="cit-foot">CITURBAREA — ${escapeHtml(pick(pt.label, lang))} · ${new Date().toLocaleDateString("fr-FR")}</div>
</body></html>`;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private collectBordereau(loadedLots: Array<{ ref: LotRef; tpl: LotTemplate }>, lang: CpsLang): CpsBordereauRow[] {
    const rows: CpsBordereauRow[] = [];
    for (const { tpl } of loadedLots) {
      for (const p of tpl.bordereau ?? []) {
        rows.push({
          code: p.code ?? `${tpl.numero}.${rows.length + 1}`,
          lotCode: tpl.code,
          lotNumero: typeof tpl.numero === "number" ? tpl.numero : null,
          lotIntitule: pick(tpl.intitule, lang),
          famille: tpl.famille ?? "SPECIAL",
          designation: pick(p.designation, lang),
          unite: p.unite ?? "",
        });
      }
    }
    return rows;
  }

  private familleOrder(loadedLots: Array<{ ref: LotRef; tpl: LotTemplate }>): string[] {
    const present = new Set(loadedLots.map((l) => l.tpl.famille ?? "SPECIAL"));
    const ordered = FAMILLE_ORDER.filter((f) => present.has(f));
    for (const f of present) if (!ordered.includes(f)) ordered.push(f);
    return ordered;
  }

  private inferFamille(lot: LotTemplate): string {
    const n = lot.numero;
    if (n === 0) return "GENERALITES";
    if (n >= 1 && n <= 3) return "GROS_OEUVRE";
    if (n === 5) return "GROS_OEUVRE";
    if (n === 4 || n === 6 || n === 7) return "CLOS_COUVERT";
    if ([8, 9, 10, 11, 12, 13, 18, 19].includes(n)) return "SECOND_OEUVRE";
    if ([14, 15, 16, 17, 20, 22, 23, 24].includes(n)) return "TECHNIQUE_CES";
    if ([21, 26, 29].includes(n)) return "VRD";
    return "SPECIAL";
  }

  private lotNumeroLabel(lot: LotTemplate): string {
    return `Lot ${lot.numero}`;
  }

  private async loadProjectType(code: string): Promise<ProjectType> {
    const dir = path.join(await this.root(), "project-types");
    const files = await this.safeReaddir(dir);
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const pt = await this.readJson<ProjectType>(path.join(dir, f));
      if (pt && pt.code === code) return pt;
    }
    throw new NotFoundException(`Type de projet inconnu: ${code}`);
  }

  private async loadLot(code: string): Promise<LotTemplate | null> {
    const dir = path.join(await this.root(), "lots");
    const files = await this.safeReaddir(dir);
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const lot = await this.readJson<LotTemplate>(path.join(dir, f));
      if (lot && lot.code === code) return lot;
    }
    return null;
  }

  private async loadClauses(codes: string[], marketType: "PUBLIC" | "PRIVE"): Promise<Clause[]> {
    if (!codes?.length) return [];
    const dir = path.join(await this.root(), "clauses");
    const files = await this.safeReaddir(dir);
    const all: Clause[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const data = await this.readJson<{ clauses?: Clause[] } | Clause[]>(path.join(dir, f));
      if (Array.isArray(data)) all.push(...data);
      else if (data?.clauses) all.push(...data.clauses);
    }
    const byCode = new Map(all.map((c) => [c.code, c]));
    const out: Clause[] = [];
    for (const code of codes) {
      const c = byCode.get(code);
      if (c && (!c.marche || c.marche.includes(marketType))) out.push(c);
    }
    return out;
  }

  private async root(): Promise<string> {
    if (this.rootCache) return this.rootCache;
    const candidates = [
      process.env.CPS_TEMPLATES_ROOT,
      path.resolve(process.cwd(), "apps/api/data/cps-templates"),
      path.resolve(process.cwd(), "data/cps-templates"),
      path.resolve(__dirname, "../../../data/cps-templates"),
      path.resolve(__dirname, "../../../../data/cps-templates"),
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      try {
        await fs.access(path.join(c, "project-types"));
        this.rootCache = c;
        return c;
      } catch {
        /* next */
      }
    }
    this.rootCache = candidates[1] ?? candidates[0];
    this.log.warn(`[CPS] templates root introuvable, fallback: ${this.rootCache}`);
    return this.rootCache;
  }

  private async safeReaddir(dir: string): Promise<string[]> {
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }

  private async readJson<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch (e: any) {
      this.log.warn(`[CPS] lecture ${path.basename(file)} échouée: ${e?.message}`);
      return null;
    }
  }
}

// ── i18n picker ────────────────────────────────────────────────────

function pick(v: I18n, lang: CpsLang): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.fr || v.en || v.ar || "";
}

// ── Mini markdown → HTML (sous-ensemble + tables pipe) ──────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapePipe(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let tableBuf: string[] = [];
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.filter((r) => !/^\|[\s:|-]+\|$/.test(r.trim()));
    const cells = rows.map((r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    out.push("<table>");
    cells.forEach((row, i) => {
      const tag = i === 0 ? "th" : "td";
      out.push("<tr>" + row.map((c) => `<${tag}>${inlineMd(c.replace(/\\\|/g, "|"))}</${tag}>`).join("") + "</tr>");
    });
    out.push("</table>");
    tableBuf = [];
  };
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      tableBuf.push(line);
      continue;
    }
    flushTable();
    if (/^##### /.test(line)) { closeList(); out.push(`<h5>${inlineMd(line.slice(6))}</h5>`); }
    else if (/^#### /.test(line)) { closeList(); out.push(`<h4>${inlineMd(line.slice(5))}</h4>`); }
    else if (/^### /.test(line)) { closeList(); out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); }
    else if (/^## /.test(line)) { closeList(); out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); }
    else if (/^# /.test(line)) { closeList(); out.push(`<h1>${inlineMd(line.slice(2))}</h1>`); }
    else if (/^> /.test(line)) { closeList(); out.push(`<blockquote>${inlineMd(line.slice(2))}</blockquote>`); }
    else if (/^---\s*$/.test(line)) { closeList(); out.push("<hr/>"); }
    else if (/^[-*] /.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineMd(line.slice(2))}</li>`);
    } else if (line.trim() === "") { closeList(); }
    else { closeList(); out.push(`<p>${inlineMd(line)}</p>`); }
  }
  flushTable();
  closeList();
  return out.join("\n");
}
