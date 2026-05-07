/**
 * DocsPage — Documentation utilisateur multilingue (FR/AR/EN)
 *
 * Accessible via:
 *   - Web:   /docs (route publique)
 *   - Desktop: app citurb-doc.exe pointe sur /docs
 *
 * Le contenu est en dur dans le composant pour garantir l'affichage
 * offline (l'app desktop ouvre cette page dans Electron).
 */

import React, { useState } from "react";
import { useT, useLang } from "../../i18n/i18n";
import LangSwitcher from "../../i18n/LangSwitcher";

type Section = "overview" | "portes" | "workflow" | "admin" | "support";

const SECTIONS: { id: Section; tKey: string; icon: string }[] = [
  { id: "overview",  tKey: "docs.section_overview",  icon: "📋" },
  { id: "portes",    tKey: "docs.section_portes",    icon: "🚪" },
  { id: "workflow",  tKey: "docs.section_workflow",  icon: "🔄" },
  { id: "admin",     tKey: "docs.section_admin",     icon: "🔧" },
  { id: "support",   tKey: "docs.section_support",   icon: "💬" },
];

// Contenu trilingue par section
const CONTENT: Record<Section, Record<"fr" | "ar" | "en", () => React.ReactNode>> = {
  overview: {
    fr: () => (
      <>
        <h2>Plateforme CITURBAREA</h2>
        <p>CITURBAREA est une plateforme intégrée d'orchestration architecturale et urbanistique au Maroc. Elle réunit en un seul lieu :</p>
        <ul>
          <li><strong>6 portes d'entrée</strong> selon votre profil : particulier, promoteur, MOD, investisseur, expertise, prestataire</li>
          <li><strong>Devis automatique</strong> conforme barème CNOA 2021 / Décret 2-94-223 (BTP)</li>
          <li><strong>Paiement sécurisé</strong> via Stripe + validation administrative</li>
          <li><strong>Suivi de dossier</strong> 24/7 depuis votre espace</li>
          <li><strong>Documents archivés</strong> avec recherche multi-critères (commune, titre foncier, ICE, etc.)</li>
        </ul>
        <p>La plateforme respecte la doctrine d'anti-désintermédiation : tous les échanges et paiements transitent exclusivement par CITURBAREA.</p>
      </>
    ),
    ar: () => (
      <>
        <h2>منصة CITURBAREA</h2>
        <p>CITURBAREA منصة متكاملة لتنسيق العمارة والتعمير بالمغرب. تجمع في مكان واحد:</p>
        <ul>
          <li><strong>6 بوابات دخول</strong> حسب ملفك: فرد، منعش، إدارة تفويض، مستثمر، خبرة، مزود خدمات</li>
          <li><strong>عرض سعر تلقائي</strong> مطابق لجدول CNOA 2021 / المرسوم 2-94-223 (البناء)</li>
          <li><strong>دفع آمن</strong> عبر Stripe + التحقق الإداري</li>
          <li><strong>متابعة الملف</strong> 24/7 من فضائك الخاص</li>
          <li><strong>أرشفة الوثائق</strong> مع البحث متعدد المعايير (البلدية، الرسم العقاري، ICE، إلخ)</li>
        </ul>
        <p>المنصة تحترم مبدأ منع الوساطة الموازية: كل التبادلات والمدفوعات تمر حصريا عبر CITURBAREA.</p>
      </>
    ),
    en: () => (
      <>
        <h2>CITURBAREA Platform</h2>
        <p>CITURBAREA is an integrated platform for architectural and urban planning orchestration in Morocco. It brings together in one place:</p>
        <ul>
          <li><strong>6 entry doors</strong> by profile: individual, developer, project management, investor, expertise, service provider</li>
          <li><strong>Automatic quotes</strong> following CNOA 2021 / Decree 2-94-223 (BTP) standards</li>
          <li><strong>Secure payment</strong> via Stripe + admin validation</li>
          <li><strong>24/7 file tracking</strong> from your space</li>
          <li><strong>Archived documents</strong> with multi-criteria search (commune, land title, ICE, etc.)</li>
        </ul>
        <p>The platform enforces an anti-disintermediation doctrine: all exchanges and payments transit exclusively through CITURBAREA.</p>
      </>
    ),
  },
  portes: {
    fr: () => (
      <>
        <h2>Les 6 portes</h2>
        <table>
          <thead><tr><th>Porte</th><th>Cible</th><th>Tarification</th></tr></thead>
          <tbody>
            <tr><td><strong>P1</strong> Particulier</td><td>Construction maison/villa, projet personnel ou familial</td><td>5% × budget × ratio pack</td></tr>
            <tr><td><strong>P2</strong> Promoteur</td><td>Immeuble, lotissement, équipement privé d'intérêt général</td><td>5% × surface plancher × coût barème CNOA</td></tr>
            <tr><td><strong>P3</strong> MOD</td><td>Maîtrise d'Ouvrage Déléguée — pilotage chantier complet</td><td>10% du coût de réalisation</td></tr>
            <tr><td><strong>P4</strong> Foncier</td><td>Analyse foncière pour investisseurs (urbanistique, juridique, rentabilité)</td><td>0.3% / 0.6% / 1% × prix vente</td></tr>
            <tr><td><strong>P5</strong> Rapports</td><td>Estimation valeur, conformité, risque, expertise technique</td><td>Forfait × surface × délai</td></tr>
            <tr><td><strong>P6</strong> Prestataires</td><td>Réseau entreprises BTP + fournisseurs matériaux</td><td>Score interne L7 (0-100)</td></tr>
          </tbody>
        </table>
      </>
    ),
    ar: () => (
      <>
        <h2>البوابات الستة</h2>
        <table>
          <thead><tr><th>البوابة</th><th>المستهدف</th><th>التسعير</th></tr></thead>
          <tbody>
            <tr><td><strong>P1</strong> فرد</td><td>بناء منزل/فيلا، مشروع شخصي أو عائلي</td><td>5% × الميزانية × معامل الباقة</td></tr>
            <tr><td><strong>P2</strong> منعش</td><td>عمارة، تجزئة، منشأة خاصة ذات نفع عام</td><td>5% × المساحة الأرضية × تكلفة جدول CNOA</td></tr>
            <tr><td><strong>P3</strong> إدارة تفويض</td><td>إدارة الأشغال المفوضة — إشراف ورش متكامل</td><td>10% من تكلفة الإنجاز</td></tr>
            <tr><td><strong>P4</strong> عقاري</td><td>تحليل عقاري للمستثمرين (تعمير، قانون، مردودية)</td><td>0.3% / 0.6% / 1% × سعر البيع</td></tr>
            <tr><td><strong>P5</strong> تقارير</td><td>تقدير القيمة، الامتثال، المخاطر، الخبرة التقنية</td><td>سعر مقطوع × المساحة × المهلة</td></tr>
            <tr><td><strong>P6</strong> مزودون</td><td>شبكة شركات البناء + موردي المواد</td><td>نقاط داخلية L7 (0-100)</td></tr>
          </tbody>
        </table>
      </>
    ),
    en: () => (
      <>
        <h2>The 6 portes</h2>
        <table>
          <thead><tr><th>Porte</th><th>Target</th><th>Pricing</th></tr></thead>
          <tbody>
            <tr><td><strong>P1</strong> Individual</td><td>House/villa construction, personal/family project</td><td>5% × budget × pack ratio</td></tr>
            <tr><td><strong>P2</strong> Developer</td><td>Building, subdivision, private facility of public interest</td><td>5% × floor area × CNOA cost table</td></tr>
            <tr><td><strong>P3</strong> DPM</td><td>Delegated Project Management — complete site control</td><td>10% of construction cost</td></tr>
            <tr><td><strong>P4</strong> Land</td><td>Land analysis for investors (urban, legal, profitability)</td><td>0.3% / 0.6% / 1% × sale price</td></tr>
            <tr><td><strong>P5</strong> Reports</td><td>Valuation, compliance, risk, technical expertise</td><td>Flat × area × delay</td></tr>
            <tr><td><strong>P6</strong> Providers</td><td>BTP companies network + materials suppliers</td><td>Internal L7 score (0-100)</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
  workflow: {
    fr: () => (
      <>
        <h2>Workflow client</h2>
        <ol>
          <li><strong>Choix de la porte</strong> sur la page d'accueil (P1 à P6)</li>
          <li><strong>Wizard guidé</strong> : section, catégorie, dimensions, mode de suivi</li>
          <li><strong>Devis instantané</strong> conforme barème CNOA</li>
          <li><strong>Identité client</strong> + soumission</li>
          <li><strong>Email de confirmation</strong> avec lien vers votre espace</li>
          <li><strong>Paiement sécurisé</strong> via Stripe Checkout (carte / Apple Pay / Google Pay)</li>
          <li><strong>Validation administrative</strong> par notre équipe sous 24h ouvrables</li>
          <li><strong>Pack activé</strong> — accès aux livrables</li>
        </ol>
      </>
    ),
    ar: () => (
      <>
        <h2>سير عمل العميل</h2>
        <ol>
          <li><strong>اختيار البوابة</strong> من الصفحة الرئيسية (P1 إلى P6)</li>
          <li><strong>معالج موجه</strong>: القسم، الفئة، الأبعاد، وضع المتابعة</li>
          <li><strong>عرض سعر فوري</strong> مطابق لجدول CNOA</li>
          <li><strong>هوية العميل</strong> + الإرسال</li>
          <li><strong>بريد إلكتروني للتأكيد</strong> مع رابط إلى فضائك</li>
          <li><strong>دفع آمن</strong> عبر Stripe Checkout (بطاقة / Apple Pay / Google Pay)</li>
          <li><strong>التحقق الإداري</strong> من فريقنا خلال 24 ساعة عمل</li>
          <li><strong>تفعيل الباقة</strong> — الوصول إلى الإنجازات</li>
        </ol>
      </>
    ),
    en: () => (
      <>
        <h2>Client workflow</h2>
        <ol>
          <li><strong>Choose porte</strong> on the home page (P1 to P6)</li>
          <li><strong>Guided wizard</strong>: section, category, dimensions, monitoring mode</li>
          <li><strong>Instant quote</strong> based on CNOA standards</li>
          <li><strong>Client identity</strong> + submission</li>
          <li><strong>Confirmation email</strong> with link to your space</li>
          <li><strong>Secure payment</strong> via Stripe Checkout (card / Apple Pay / Google Pay)</li>
          <li><strong>Admin validation</strong> by our team within 24 working hours</li>
          <li><strong>Pack activated</strong> — access to deliverables</li>
        </ol>
      </>
    ),
  },
  admin: {
    fr: () => (
      <>
        <h2>Backoffice admin</h2>
        <p>Accessible sur <code>/cc</code> avec un compte administrateur :</p>
        <ul>
          <li><strong>Leads</strong> : pipeline de qualification (NEW → CONTACTED → QUALIFIED → WON/LOST)</li>
          <li><strong>Validations</strong> : packs en attente d'activation + fiches P6 à reviewer</li>
          <li><strong>Dossiers</strong> : tous les dossiers avec shadow view (vue client + actions admin)</li>
          <li><strong>Archive</strong> : recherche multi-critères (commune, titre foncier, ICE, lotissement…) avec accès complet aux dossiers et documents</li>
          <li><strong>Génération contrats</strong> : contrat type unifié CNOA pour P2, contrats spécialisés P3/P4/P5/P6</li>
          <li><strong>Visa CROA</strong> : workflow J-15 conforme Règlement Intérieur CNOA</li>
        </ul>
      </>
    ),
    ar: () => (
      <>
        <h2>الإدارة الخلفية</h2>
        <p>متاحة على <code>/cc</code> بحساب مدير:</p>
        <ul>
          <li><strong>العملاء المحتملون</strong>: خط أنابيب التأهيل</li>
          <li><strong>التحققات</strong>: الباقات في انتظار التفعيل + ملفات P6 للمراجعة</li>
          <li><strong>الملفات</strong>: جميع الملفات مع عرض الظل (عرض العميل + إجراءات إدارية)</li>
          <li><strong>الأرشيف</strong>: بحث متعدد المعايير مع وصول كامل إلى الملفات والوثائق</li>
          <li><strong>إنشاء العقود</strong>: عقد نموذجي موحد CNOA لـ P2، عقود متخصصة P3/P4/P5/P6</li>
          <li><strong>تأشيرة CROA</strong>: سير عمل 15 يوما مطابق للنظام الداخلي CNOA</li>
        </ul>
      </>
    ),
    en: () => (
      <>
        <h2>Admin backoffice</h2>
        <p>Accessible at <code>/cc</code> with an admin account:</p>
        <ul>
          <li><strong>Leads</strong>: qualification pipeline (NEW → CONTACTED → QUALIFIED → WON/LOST)</li>
          <li><strong>Validations</strong>: packs awaiting activation + P6 records to review</li>
          <li><strong>Files</strong>: all files with shadow view (client view + admin actions)</li>
          <li><strong>Archive</strong>: multi-criteria search (commune, land title, ICE, subdivision…) with full access to files and documents</li>
          <li><strong>Contract generation</strong>: unified CNOA template for P2, specialized contracts for P3/P4/P5/P6</li>
          <li><strong>CROA visa</strong>: 15-day workflow compliant with CNOA internal regulations</li>
        </ul>
      </>
    ),
  },
  support: {
    fr: () => (
      <>
        <h2>Support</h2>
        <p>Pour toute question :</p>
        <ul>
          <li>📧 Email : <a href="mailto:contact@citurbarea.ma">contact@citurbarea.ma</a></li>
          <li>🌐 Site : <a href="https://citurb-web-production.up.railway.app">citurbarea.ma</a></li>
          <li>💼 Backoffice : <a href="/cc">cc.citurbarea.ma</a></li>
        </ul>
        <h3>Liens utiles</h3>
        <ul>
          <li><a href="/p1">Démarrer un projet personnel (P1)</a></li>
          <li><a href="/p2">Projet promoteur (P2)</a></li>
          <li><a href="/p3">Maîtrise d'Ouvrage Déléguée (P3)</a></li>
          <li><a href="/p4">Analyse foncière (P4)</a></li>
          <li><a href="/p5">Rapports & expertises (P5)</a></li>
          <li><a href="/p6">Rejoindre le réseau prestataires (P6)</a></li>
        </ul>
      </>
    ),
    ar: () => (
      <>
        <h2>الدعم</h2>
        <p>لأي سؤال:</p>
        <ul>
          <li>📧 البريد الإلكتروني: <a href="mailto:contact@citurbarea.ma">contact@citurbarea.ma</a></li>
          <li>🌐 الموقع: <a href="https://citurb-web-production.up.railway.app">citurbarea.ma</a></li>
          <li>💼 الإدارة الخلفية: <a href="/cc">cc.citurbarea.ma</a></li>
        </ul>
      </>
    ),
    en: () => (
      <>
        <h2>Support</h2>
        <p>For any question:</p>
        <ul>
          <li>📧 Email: <a href="mailto:contact@citurbarea.ma">contact@citurbarea.ma</a></li>
          <li>🌐 Website: <a href="https://citurb-web-production.up.railway.app">citurbarea.ma</a></li>
          <li>💼 Backoffice: <a href="/cc">cc.citurbarea.ma</a></li>
        </ul>
      </>
    ),
  },
};

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif", color: "#1f2937" },
  header: { background: "#1e3a8a", color: "#fff", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 },
  brand: { fontSize: 22, fontWeight: 800, letterSpacing: 0.5 },
  brandSub: { fontSize: 11, color: "#bfdbfe", marginTop: 2, letterSpacing: 1 },
  layout: { display: "grid", gridTemplateColumns: "240px 1fr", maxWidth: 1100, margin: "0 auto", gap: 24, padding: "24px" },
  sidebar: { background: "#fff", borderRadius: 12, padding: 16, height: "fit-content", border: "1px solid #e2e8f0", position: "sticky" as const, top: 16 },
  sidebarTitle: { fontSize: 11, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 },
  navItem: (active: boolean): React.CSSProperties => ({
    display: "block", padding: "8px 12px", borderRadius: 6, marginBottom: 4,
    fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? "#1e3a8a" : "#475569",
    background: active ? "#eff6ff" : "transparent",
    cursor: "pointer", border: 0, width: "100%", textAlign: "left" as const,
  }),
  content: { background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #e2e8f0", lineHeight: 1.6, fontSize: 15 },
};

export default function DocsPage() {
  const t = useT();
  const { lang } = useLang();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const renderContent = CONTENT[activeSection][lang] || CONTENT[activeSection].fr;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.brand}>📖 {t("docs.title")}</div>
          <div style={S.brandSub}>{t("docs.intro")}</div>
        </div>
        <LangSwitcher variant="compact" />
      </header>

      <div style={S.layout}>
        <aside style={S.sidebar}>
          <div style={S.sidebarTitle}>Navigation</div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              style={S.navItem(activeSection === s.id)}
              onClick={() => setActiveSection(s.id)}
            >
              {s.icon} {t(s.tKey)}
            </button>
          ))}
        </aside>

        <main style={S.content}>
          <div style={{ marginBottom: 16 }}>
            <a href="/" style={{ color: "#3b82f6", fontSize: 13, textDecoration: "none" }}>← {t("nav.home")}</a>
          </div>
          <style>{`
            main h2 { color: #1e3a8a; font-size: 22px; margin: 0 0 16px; font-weight: 700; }
            main h3 { color: #1e3a8a; font-size: 17px; margin: 24px 0 10px; font-weight: 700; }
            main p, main li { color: #334155; }
            main strong { color: #1f2937; }
            main ul, main ol { padding-left: 20px; line-height: 1.8; }
            main code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #0f172a; }
            main table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            main table th, main table td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
            main table th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
            main a { color: #3b82f6; }
          `}</style>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
