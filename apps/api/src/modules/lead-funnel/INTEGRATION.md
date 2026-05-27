# LeadFunnel — Intégration

Module **Tome 0** (capture & qualification leads — amont du funnel commercial).

Livré dans cet épic :
- Backend NestJS : `LeadFunnelModule`, `LeadFunnelController`, `LeadFunnelService`, `LeadNurtureService`, `lead-scoring.ts`.
- Frontend React : `LeadCaptureForm`, `WhatsAppCTA`, `RoiCalculator`, `PorteSeoPage`.
- Sitemap : `apps/web/public/sitemap-lead.xml` (72 URLs).

Ce document liste **les modifications à appliquer hors périmètre** (le code livré ne touche jamais `app.module.ts`, `routes.tsx`, `i18n.tsx`, ni `mutation-gate.guard.ts`).

---

## 1. Wiring backend (`apps/api/src/app.module.ts`)

```ts
import { LeadFunnelModule } from "./modules/lead-funnel/lead-funnel.module";

@Module({
  imports: [
    /* … */
    LeadFunnelModule,
  ],
})
export class AppModule {}
```

> `LeadNurtureService` utilise `@nestjs/schedule` — déjà importé via `ScheduleModule.forRoot()` dans `AppModule`.
> `EmailService` est `@Global()` (cf. `EmailModule`) → pas besoin de l'importer manuellement.

---

## 2. MutationGate allow-list

`apps/api/src/common/guards/mutation-gate.guard.ts` — ajouter :

```ts
"/api/lead-funnel",   // Capture lead public + admin scoring/stage (Tome 0)
```

dans le tableau `allow` (juste après `/api/telemetry`).

---

## 3. Modèle Prisma `Lead` (à appliquer ultérieurement)

> **Statut actuel (MVP)** : persistence JSON in-memory dans `data/leads.json`.
> Une fois la migration Prisma appliquée, remplacer le `Map` interne de `LeadFunnelService` par des appels Prisma (signatures identiques).

Ajouter à `prisma/schema.prisma` (schéma principal, **pas** `dossiers/`) :

```prisma
enum LeadStage {
  NEW
  CONTACTED
  QUALIFIED
  WIZARD_STARTED
  DOSSIER_OPENED
  PAID
  LOST
  ARCHIVED
}

enum LeadSource {
  WEB_HERO
  WEB_PORTE_SEO
  WEB_ROI_CALC
  WEB_WHATSAPP_CTA
  WEB_NEWSLETTER
  PARTENAIRE
  WHATSAPP_INBOUND
  REFERRAL
  DIRECT
  AUTRE
}

model Lead {
  id                  String      @id @default(cuid())
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  nom                 String
  telephone           String
  email               String?
  projetType          String?     // P1..P6 | AUTRE
  budget              Int?
  ville               String?
  surface             Int?
  delaiMois           Int?
  source              LeadSource  @default(DIRECT)
  lang                String      @default("fr")
  pageContext         String?
  utmSource           String?
  utmMedium           String?
  utmCampaign         String?
  score               Int         @default(0)
  scoreBreakdown      Json?
  stage               LeadStage   @default(NEW)
  wizardStep          Int         @default(0)
  returnVisitor       Boolean     @default(false)
  nurtureLog          Json?       // { templateKey: ISOdate }
  convertedDossierId  String?
  events              Json        @default("[]")
  meta                Json?

  @@index([stage, score])
  @@index([telephone])
  @@index([email])
  @@index([createdAt])
}
```

Puis `npm run prisma:migrate` (nom suggéré : `lead-funnel`).

---

## 4. Routes web (`apps/web/src/tomes/tome1/AppRouter.tsx` ou équivalent)

```tsx
import { lazy } from "react";
const RoiCalculator = lazy(() => import("../../features/lead-funnel/RoiCalculator"));
const PorteSeoPage = lazy(() => import("../../ui/landing/PorteSeoPage"));

// Dans le <Routes> :
<Route path="/calculateur" element={<RoiCalculator />} />
<Route path="/:lang(fr|ar|en)/porte-:porte(1|2|3|4|5|6)-:slug" element={<PorteSeoRoute />} />
```

Helper minimal pour extraire ville depuis slug :

```tsx
import { useParams } from "react-router-dom";
function PorteSeoRoute() {
  const { porte, slug } = useParams();
  // Slug pattern : "permis-construire-rabat" → derive ville = "Rabat"
  const parts = (slug || "").split("-");
  const villeRaw = parts[parts.length - 1] || "";
  const ville = villeRaw.charAt(0).toUpperCase() + villeRaw.slice(1);
  return <PorteSeoPage porte={porte as any} slug={slug} ville={ville} />;
}
```

> Le détail `/lead/:id` n'est pas une page publique : si tu veux l'exposer dans `/cc/leads/:id`, branche `GET /api/lead-funnel/lead/:id` (JWT) depuis le command-center existant.

---

## 5. Mount global du `WhatsAppCTA`

Dans `apps/web/src/app/App.tsx` (ou un layout parent commun) :

```tsx
import WhatsAppCTA from "../features/lead-funnel/WhatsAppCTA";

export default function App() {
  return (
    <GlobalErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <AppRouter />
          <WhatsAppCTA />
        </AuthProvider>
      </I18nProvider>
    </GlobalErrorBoundary>
  );
}
```

---

## 6. Clés i18n à fusionner dans `apps/web/src/i18n/i18n.tsx`

Ajouter à `DICT` :

```ts
// ─── Lead funnel ────────────────────────────────────────────────────
"lead.field.nom":          { fr: "Votre nom",                ar: "اسمك",                       en: "Your name" },
"lead.field.tel":          { fr: "Téléphone",                ar: "الهاتف",                     en: "Phone" },
"lead.field.email":        { fr: "Email",                    ar: "البريد الإلكتروني",          en: "Email" },
"lead.field.projet":       { fr: "Décrivez votre projet",    ar: "صف مشروعك",                  en: "Describe your project" },
"lead.placeholder.nom":    { fr: "Ex. Yassine Attarassi",    ar: "مثال: ياسين العطراسي",        en: "e.g. Yassine Attarassi" },
"lead.placeholder.projet": { fr: "Ex. villa R+1 à Bouskoura, 220 m², livraison 2026", ar: "مثال: فيلا R+1 في بوسكورة 220م²", en: "e.g. R+1 villa in Bouskoura, 220 m², 2026 delivery" },
"lead.btn.send":           { fr: "Envoyer ma demande",       ar: "أرسل طلبي",                  en: "Send my request" },
"lead.btn.sending":        { fr: "Envoi en cours…",          ar: "جارٍ الإرسال…",              en: "Sending…" },
"lead.legal":              { fr: "Vos données ne sont jamais partagées hors CITURBAREA.", ar: "بياناتك لا تُشارك خارج CITURBAREA.", en: "Your data is never shared outside CITURBAREA." },
"lead.err.nom":            { fr: "Nom trop court.",          ar: "الاسم قصير جدًا.",            en: "Name too short." },
"lead.err.tel":            { fr: "Numéro invalide.",         ar: "رقم غير صالح.",              en: "Invalid number." },
"lead.err.tel_format":     { fr: "Format attendu: +212 6/7… ou 06/07…", ar: "النسق: +212 6/7… أو 06/07…", en: "Expected: +212 6/7… or 06/07…" },
"lead.err.generic":        { fr: "Erreur, réessayez.",       ar: "خطأ، حاول مجددًا.",           en: "Error, try again." },
"lead.success.title":      { fr: "Demande reçue",            ar: "تم استلام الطلب",            en: "Request received" },
"lead.success.msg":        { fr: "Notre équipe vous recontacte sous 24h.", ar: "سيتواصل فريقنا معك خلال 24 ساعة.", en: "Our team will reach out within 24h." },
"lead.success.ref":        { fr: "Référence",                ar: "المرجع",                     en: "Reference" },
"lead.success.score":      { fr: "Priorité dossier",         ar: "أولوية الملف",                en: "File priority" },

// WhatsApp CTA
"lead.wa.cta":             { fr: "Discuter sur WhatsApp",    ar: "تحدث عبر واتساب",            en: "Chat on WhatsApp" },
"lead.wa.teaser":          { fr: "Une question ? Un architecte vous répond sur WhatsApp.", ar: "هل لديك سؤال؟ مهندس يجيبك على واتساب.", en: "A question? An architect replies on WhatsApp." },
"lead.wa.open":            { fr: "Ouvrir WhatsApp",          ar: "افتح واتساب",                en: "Open WhatsApp" },
"lead.wa.dialog":          { fr: "Dialogue WhatsApp",        ar: "حوار واتساب",                en: "WhatsApp dialog" },
"lead.wa.hello":           { fr: "Bonjour CITURBAREA,",      ar: "مرحبًا CITURBAREA،",          en: "Hello CITURBAREA," },
"lead.wa.ctx.generic":     { fr: "j'ai un projet à étudier.", ar: "لدي مشروع للدراسة.",         en: "I have a project to study." },
"lead.wa.ctx.p1":          { fr: "j'ai un projet personnel (villa, maison).", ar: "لدي مشروع شخصي (فيلا، منزل).", en: "I have a personal project (villa, house)." },
"lead.wa.ctx.p2":          { fr: "je prépare un programme immobilier.", ar: "أحضّر برنامجًا عقاريًا.", en: "I'm preparing a real estate program." },
"lead.wa.ctx.p3":          { fr: "je cherche un MOD pour mon chantier.", ar: "أبحث عن MOD لمشروعي.", en: "I need delegated project management." },
"lead.wa.ctx.p4":          { fr: "je veux analyser un foncier.", ar: "أريد تحليل عقار.",       en: "I want to analyze a land plot." },
"lead.wa.ctx.p5":          { fr: "j'ai besoin d'un rapport / expertise.", ar: "أحتاج تقريرًا/خبرة.", en: "I need a report / expertise." },
"lead.wa.ctx.p6":          { fr: "je suis prestataire BTP intéressé par CITURBAREA.", ar: "أنا مزود خدمات بناء مهتم بـ CITURBAREA.", en: "I'm a construction provider interested in CITURBAREA." },
"lead.wa.ctx.calc":        { fr: "j'ai utilisé votre calculateur et veux le détail.", ar: "استخدمت الحاسبة وأود التفاصيل.", en: "I used your calculator and want the details." },

// ROI Calculator
"lead.calc.title":         { fr: "Calculateur projet clé en main", ar: "حاسبة المشروع تسليم المفتاح", en: "Turnkey project calculator" },
"lead.calc.subtitle":      { fr: "Estimez en 30 secondes le coût de votre projet.", ar: "احسب تكلفة مشروعك في 30 ثانية.", en: "Estimate your project cost in 30 seconds." },
"lead.calc.type":          { fr: "Type de projet",           ar: "نوع المشروع",                en: "Project type" },
"lead.calc.ville":         { fr: "Ville",                    ar: "المدينة",                    en: "City" },
"lead.calc.surface":       { fr: "Surface plancher",         ar: "المساحة الأرضية",            en: "Floor area" },
"lead.calc.standing":      { fr: "Standing",                 ar: "المستوى",                    en: "Standing" },
"lead.calc.standing.eco":  { fr: "Économique",               ar: "اقتصادي",                    en: "Economy" },
"lead.calc.standing.moyen":{ fr: "Moyen",                    ar: "متوسط",                      en: "Mid" },
"lead.calc.standing.haut": { fr: "Haut de gamme",            ar: "راقي",                       en: "Premium" },
"lead.calc.t.villa_rdc":   { fr: "Villa RDC",                ar: "فيلا طابق أرضي",             en: "Single-storey villa" },
"lead.calc.t.villa_r1":    { fr: "Villa R+1",                ar: "فيلا R+1",                   en: "Villa R+1" },
"lead.calc.t.villa_r2":    { fr: "Villa R+2",                ar: "فيلا R+2",                   en: "Villa R+2" },
"lead.calc.t.immeuble":    { fr: "Immeuble",                 ar: "عمارة",                      en: "Building" },
"lead.calc.t.lotissement": { fr: "Lotissement",              ar: "تجزئة",                      en: "Subdivision" },
"lead.calc.t.commerce":    { fr: "Commerce / bureau",        ar: "تجاري / مكتب",               en: "Retail / office" },
"lead.calc.result":        { fr: "Estimation clé en main",   ar: "تقدير تسليم المفتاح",        en: "Turnkey estimate" },
"lead.calc.range":         { fr: "Fourchette : {min} → {max}", ar: "النطاق: {min} → {max}",   en: "Range: {min} → {max}" },
"lead.calc.delai":         { fr: "Délai indicatif",          ar: "المدة التقديرية",            en: "Indicative duration" },
"lead.calc.mois":          { fr: "mois",                     ar: "شهور",                       en: "months" },
"lead.calc.disclaimer":    { fr: "Estimation indicative ; un devis détaillé est délivré par votre architecte référent.", ar: "تقدير إرشادي؛ سيُسلّم العرض المفصّل من مهندسك المرجعي.", en: "Indicative estimate; detailed quote delivered by your referent architect." },
"lead.calc.cta":           { fr: "Recevoir le détail par email", ar: "استلم التفاصيل بالبريد",  en: "Get details by email" },
"lead.calc.cta_sub":       { fr: "Gratuit, sans engagement.", ar: "مجاني، بدون التزام.",        en: "Free, no commitment." },
"lead.calc.form_title":    { fr: "Vos coordonnées",          ar: "بياناتك",                    en: "Your contact" },
"lead.calc.chart_alt":     { fr: "Fourchette d'estimation",  ar: "نطاق التقدير",               en: "Estimate range" },

// SEO porte page
"lead.seo.morocco":        { fr: "Maroc",                    ar: "المغرب",                     en: "Morocco" },
"lead.seo.kicker":         { fr: "CITURBAREA",               ar: "CITURBAREA",                 en: "CITURBAREA" },
"lead.seo.feat1.t":        { fr: "Architecte certifié CNOA", ar: "مهندس معتمد CNOA",           en: "CNOA-certified architect" },
"lead.seo.feat1.b":        { fr: "Inscription Ordre, garanties professionnelles.", ar: "تسجيل بالنقابة، ضمانات مهنية.", en: "Order registration, professional guarantees." },
"lead.seo.feat2.t":        { fr: "Dépôt rokhas en ligne",    ar: "إيداع رخصة عبر الإنترنت",     en: "Online rokhas filing" },
"lead.seo.feat2.b":        { fr: "Suivi temps réel de votre dossier.", ar: "متابعة فورية لملفك.", en: "Real-time tracking of your file." },
"lead.seo.feat3.t":        { fr: "Tarif fixe transparent",   ar: "سعر ثابت شفاف",              en: "Transparent fixed price" },
"lead.seo.feat3.b":        { fr: "Devis instantané basé sur le barème CNOA.", ar: "عرض فوري وفق سلم CNOA.", en: "Instant quote based on CNOA scale." },
"lead.seo.cta.title":      { fr: "Démarrez votre projet à {ville}", ar: "ابدأ مشروعك في {ville}", en: "Start your project in {ville}" },
"lead.seo.cta.subtitle":   { fr: "Réponse sous 24h.",        ar: "الرد خلال 24 ساعة.",          en: "Response within 24h." },
"lead.seo.faq.title":      { fr: "Questions fréquentes",     ar: "أسئلة شائعة",                en: "Frequently asked" },
"lead.seo.faq.q1":         { fr: "Combien coûte un permis de construire à {ville} ?", ar: "كم تكلف رخصة البناء في {ville}؟", en: "How much does a building permit cost in {ville}?" },
"lead.seo.faq.a1":         { fr: "Le tarif suit le barème CNOA — calculé en fonction de la surface et de la nature du projet. Utilisez notre calculateur pour une estimation immédiate.", ar: "السعر يتبع سلم CNOA — يُحسب حسب المساحة وطبيعة المشروع.", en: "Pricing follows the CNOA scale — based on area and project nature." },
"lead.seo.faq.q2":         { fr: "Combien de temps prend la procédure ?", ar: "كم تستغرق الإجراءات؟", en: "How long does the process take?" },
"lead.seo.faq.a2":         { fr: "De 2 à 6 mois selon la complexité, suivi en ligne tout au long.", ar: "من 2 إلى 6 أشهر حسب التعقيد، مع متابعة عبر الإنترنت.", en: "2 to 6 months depending on complexity, with online tracking." },
"lead.seo.faq.q3":         { fr: "CITURBAREA opère-t-il vraiment à {ville} ?", ar: "هل تعمل CITURBAREA فعلاً في {ville}؟", en: "Does CITURBAREA really operate in {ville}?" },
"lead.seo.faq.a3":         { fr: "Oui — réseau d'architectes partenaires dans les 12 principales villes marocaines.", ar: "نعم — شبكة مهندسين شركاء في 12 مدينة مغربية رئيسية.", en: "Yes — partner architects network across 12 major Moroccan cities." },
```

> Toutes ces clés respectent le pattern `lead.*` ⇒ une seule fusion à faire.

---

## 7. Variables d'environnement

```ini
# .env (API)
LEAD_NOTIFY_TO=architectattarassi@gmail.com   # destinataire alerte nouveau lead
WHATSAPP_VERIFY_TOKEN=<token Meta business>   # challenge webhook
WHATSAPP_APP_SECRET=<app secret Meta>         # HMAC-SHA256 du webhook
PUBLIC_WEB_URL=https://citurbarea.com         # déjà existant
RESEND_API_KEY=<resend>                       # déjà existant (EmailService)

# .env (Web)
VITE_WHATSAPP_NUMBER=+212600000000            # numéro vert WA Business CITURBAREA
```

> Pour activer le webhook WA, ajouter `/api/lead-funnel/webhook/whatsapp` dans la console Meta Business Manager (callback URL + verify token).

---

## 8. Hook conversion (optionnel mais recommandé)

Pour relier les leads aux dossiers créés via `/p2/intake` (ou autre porte) :

Dans le service d'intake (P1–P6), après création du dossier :

```ts
import { LeadFunnelService } from "../../../modules/lead-funnel/lead-funnel.service";

if (leadId) {
  this.leadFunnel.markConverted(leadId, dossier.id);
}
```

Le champ `leadId` doit être propagé depuis le wizard frontend (lu depuis `?lead=…` ou `localStorage` après capture).

---

## 9. /robots.txt

Ajouter une ligne (fichier `apps/web/public/robots.txt`) :

```
Sitemap: https://citurbarea.com/sitemap-lead.xml
```

---

## 10. Tests rapides (smoke manual)

```bash
# Capture publique
curl -X POST http://localhost:4000/api/lead-funnel/capture \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","telephone":"+212612345678","email":"t@t.ma","projetType":"P1","budget":800000,"ville":"Casablanca","delaiMois":3,"source":"WEB_HERO","lang":"fr"}'

# Liste (JWT requis)
curl http://localhost:4000/api/lead-funnel/list -H "Authorization: Bearer $TOKEN"

# Stats funnel (JWT requis)
curl http://localhost:4000/api/lead-funnel/funnel-stats -H "Authorization: Bearer $TOKEN"
```

Réponse attendue capture : `{ ok:true, leadId:"lead_…", scoreInitial:>=55, stage:"NEW" }`
(20 budget + 15 contact + 15 urgency + 10 ville Casablanca = 60).

---

## 11. Roadmap immédiate (post-merge)

1. Branchement `LeadFunnelModule` dans `app.module.ts` + redéploiement Railway.
2. Allow-list `/api/lead-funnel` dans `mutation-gate.guard.ts`.
3. Fusion DICT i18n.
4. Routes `/calculateur` + `/:lang/porte-:n-:slug`.
5. Mount `<WhatsAppCTA />` global.
6. Configuration ENV vars (`VITE_WHATSAPP_NUMBER`, `LEAD_NOTIFY_TO`).
7. Migration Prisma `Lead` quand vous voulez quitter le JSON in-memory.
