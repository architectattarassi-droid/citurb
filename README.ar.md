# CITURBAREA

منصّة متكاملة لتنسيق المشاريع المعمارية والعمرانية بالمغرب.

🌍 **توثيق متعدّد اللغات** : [Français](README.md) · [English](README.en.md) · [العربية](README.ar.md)

---

## نظرة عامة

تجمع CITURBAREA ستّة أبواب (P1–P6) تغطّي دورة حياة المشروع المبني بالمغرب :

| الباب | الملفّ الشخصي | التسعير |
|-------|---------------|--------|
| **P1** | خاص (فيلا، أرضي + طوابق) | 5% × الميزانية × نسبة الباقة |
| **P2** | منعش عقاري | جدول CNOA 2021 (خمسة أقسام) |
| **P3** | تفويض إدارة المشروع | 10% × تكلفة الإنجاز |
| **P4** | مستثمر عقاري | 0.3% / 0.6% / 1% × ثمن البيع |
| **P5** | تقارير وخبرات | جزافي × المساحة × الأجل |
| **P6** | مقاولات وموردون | تنقيط L7 (تصنيف BTP، الاعتمادات) |

## انطلاق سريع

```bash
npm run docker:up          # تشغيل PostgreSQL
npm run dev                # API (:4000) + Web (:5173)
```

الولوج :
- الويب : http://localhost:5173
- الـAPI : http://localhost:4000
- الفحص : http://localhost:4000/health

📖 الدليل المفصّل : [QUICKSTART.md](./QUICKSTART.md)

## الهندسة

```
apps/
  api/              NestJS (المنفذ 4000)
  web/              Vite + React + Tailwind (المنفذ 5173)
  desktop/          Electron (portal + backoffice + doc)
  backoffice-desktop/
  ops/
packages/
  contracts/        أنواع مشتركة
  config/
prisma/
  schema.prisma           المخطّط الرئيسي (مستخدمون، استحقاقات، جغرافيا)
  dossiers/schema.prisma  مخطّط الملفّات (Prisma client مستقل)
docs/
  tomes/MAP.md            خريطة الأسفار المرجعية
  rules/registry.yml      سجلّ القواعد التنفيذي
  doctrine/               الوثيقة المرجعية الأم
```

### تراتبية الأسفار (API)

| السفر | الدور |
|-------|------|
| `@`  | النواة الدستورية (حوادث، سجلات إثباتية، السجلّ) |
| `0`  | الدستور النظامي (حوكمة المعطيات، الجغرافيا، datalake) |
| `1`  | الحوكمة والاقتصاد (الأداء، الاستحقاقات، scope-lock) |
| `2`  | الأبواب P1..P6، مقاومة التهرّب من المنصّة |
| `3`  | آلة الحالات والأقفال L1..L7 |
| `4`  | الربط التنفيذي (controllers، jobs، Stripe) |
| `5–10` | حزم التوسعة (ذكاء اصطناعي، وسائط، روابط مؤسساتية) |

**القاعدة الذهبية** : السفر لا يستورد إلا للأسفل. الأمر `npm run tome:check` يفرض هذا الاتجاه.

## التعدّد اللغوي

التطبيق كلّه (واجهة + خلفية + توثيق) متاح بـ 🇫🇷 الفرنسية و🇬🇧 الإنجليزية و🇲🇦 العربية. مبدّل اللغة حاضر في كلّ الصفحات العمومية وفي التوثيق.

- الواجهة : [`apps/web/src/i18n/i18n.tsx`](./apps/web/src/i18n/i18n.tsx) — `I18nProvider`, `useT()`, `useLang()`
- المبدّل : [`apps/web/src/i18n/LangSwitcher.tsx`](./apps/web/src/i18n/LangSwitcher.tsx)
- الاستمرارية : `localStorage('citurbarea.lang')`، تحويل تلقائي إلى RTL في العربية

## تطبيقات Desktop

ثلاث صيغ Electron موحّدة في [`apps/desktop`](./apps/desktop) :

```bash
npm --prefix apps/desktop run start:portal       # بوّابة العميل
npm --prefix apps/desktop run start:backoffice   # المركز الإداري
npm --prefix apps/desktop run start:doc          # التوثيق
```

البناء على ويندوز :
```bash
npm --prefix apps/desktop run build:all   # ثلاث ملفّات .exe (portal + backoffice + doc)
```

## الوثيقة المرجعية

- الردود العمومية مُجرّدة : لا يكشف أبداً `rule_id` ولا `tome_ref` ولا `error_code`. فقط `incident_id` علني.
- كلّ تعديل يمرّ عبر منسّق Tome @ (`MutationGateGuard`).
- مقاومة التهرّب : دفعة ليلية (`0 2 * * *` Africa/Casablanca) + تصعيد عند ≥3 إشارات HIGH خلال 7 أيام.
- تفعيل الباقة يستلزم مصادقة الإدارة (`PENDING_PAYMENT` → `PAYMENT_RECEIVED` → `PENDING_ADMIN_VALIDATION` → `ACTIVATED`).
- النسخ الاحتياطية : Postgres (L1) + واجهة الأرشيف (L2) + GitHub backup ليلي (L3).

## نقاط مرجعية

- الوثيقة الأم : [`docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md`](./docs/doctrine/CITURBAREA_DOCTRINE_MASTER_TECH_EXHAUSTIF_v1.0.md)
- خريطة الأسفار : [`docs/tomes/MAP.md`](./docs/tomes/MAP.md)
- الجذر المرجعي : [`CANONICAL_ROOT.md`](./CANONICAL_ROOT.md)
- خريطة أسفار الويب : [`apps/web/src/TOME_MAP.ts`](./apps/web/src/TOME_MAP.ts)
