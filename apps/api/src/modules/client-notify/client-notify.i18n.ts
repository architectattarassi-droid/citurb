/**
 * Client-notify i18n — emails transactionnels FR / EN / AR.
 *
 * La langue est lue depuis Dossier.payload.lang (alimenté par le wizard).
 * Fallback : 'fr'.
 */

export type Lang = "fr" | "en" | "ar";

export const LANGS: Lang[] = ["fr", "en", "ar"];

export function normalizeLang(input: unknown): Lang {
  const v = String(input ?? "").toLowerCase().slice(0, 2);
  return v === "en" || v === "ar" ? (v as Lang) : "fr";
}

export const DIR: Record<Lang, "ltr" | "rtl"> = { fr: "ltr", en: "ltr", ar: "rtl" };
export const HTML_LANG: Record<Lang, string> = { fr: "fr", en: "en", ar: "ar" };

// ────────────────────────────────────────────────────────────────
//  Common shell strings
// ────────────────────────────────────────────────────────────────

export const SHELL = {
  brand: { fr: "CITURBAREA", en: "CITURBAREA", ar: "CITURBAREA" },
  tagline: {
    fr: "Plateforme architecturale",
    en: "Architectural platform",
    ar: "منصّة معمارية",
  },
  footerLine: {
    fr: "CITURBAREA · Plateforme d'orchestration architecturale au Maroc",
    en: "CITURBAREA · Architectural orchestration platform in Morocco",
    ar: "CITURBAREA · منصّة تنسيق المشاريع المعمارية بالمغرب",
  },
  footerNote: {
    fr: "Cet email vous est envoyé automatiquement, vous pouvez répondre directement à",
    en: "This email is sent automatically, you can reply directly to",
    ar: "أُرسلت هذه الرسالة تلقائياً، يمكنك الرد مباشرة على",
  },
  refDossier: {
    fr: "Référence dossier",
    en: "Dossier reference",
    ar: "مرجع الملف",
  },
};

// ────────────────────────────────────────────────────────────────
//  1) demandeRecue — confirmation après /p2/intake
// ────────────────────────────────────────────────────────────────

export const DEMANDE_RECUE = {
  subject: {
    fr: (porte: string) => `✓ Votre demande ${porte} est bien reçue — CITURBAREA`,
    en: (porte: string) => `✓ Your ${porte} request has been received — CITURBAREA`,
    ar: (porte: string) => `✓ تم استلام طلبك ${porte} — CITURBAREA`,
  },
  title: {
    fr: "Votre demande est reçue",
    en: "Your request has been received",
    ar: "تم استلام طلبك",
  },
  preheader: {
    fr: (id: string) => `Référence dossier : ${id}…`,
    en: (id: string) => `Dossier reference: ${id}…`,
    ar: (id: string) => `مرجع الملف : ${id}…`,
  },
  hello: {
    fr: (n: string) => `Bonjour ${n}`,
    en: (n: string) => `Hello ${n}`,
    ar: (n: string) => `مرحباً ${n}`,
  },
  body: {
    fr: (porte: string) => `Nous avons bien reçu votre demande <strong>${porte}</strong> sur la plateforme CITURBAREA.`,
    en: (porte: string) => `We have received your <strong>${porte}</strong> request on the CITURBAREA platform.`,
    ar: (porte: string) => `لقد استلمنا طلبك <strong>${porte}</strong> على منصّة CITURBAREA.`,
  },
  projectLabel: {
    fr: "Projet",
    en: "Project",
    ar: "المشروع",
  },
  ctaIntro: {
    fr: "Pour accéder à votre tableau de bord et procéder au paiement :",
    en: "To access your dashboard and proceed with payment:",
    ar: "للوصول إلى لوحة التحكم والقيام بالدفع :",
  },
  ctaPortal: { fr: "📁 Mes dossiers", en: "📁 My dossiers", ar: "📁 ملفّاتي" },
  ctaPay: { fr: "💳 Payer maintenant", en: "💳 Pay now", ar: "💳 الأداء الآن" },
  followup: {
    fr: "Notre équipe vous recontacte sous 24h ouvrables si vous avez besoin d'assistance.",
    en: "Our team will get back to you within 24 business hours if you need assistance.",
    ar: "سيتواصل معك فريقنا خلال 24 ساعة عمل إذا احتجت إلى مساعدة.",
  },
};

// ────────────────────────────────────────────────────────────────
//  2) paiementRecu — après webhook Stripe / mark-paid
// ────────────────────────────────────────────────────────────────

export const PAIEMENT_RECU = {
  subject: {
    fr: "💰 Paiement reçu — CITURBAREA",
    en: "💰 Payment received — CITURBAREA",
    ar: "💰 تم استلام الأداء — CITURBAREA",
  },
  title: {
    fr: "Paiement bien reçu",
    en: "Payment successfully received",
    ar: "تم استلام الأداء",
  },
  preheader: {
    fr: (amt: string) => `${amt} · Validation admin sous 24h`,
    en: (amt: string) => `${amt} · Admin validation within 24h`,
    ar: (amt: string) => `${amt} · مصادقة الإدارة خلال 24 ساعة`,
  },
  body: {
    fr: (amt: string) => `Nous avons bien reçu votre paiement de <strong style="color:#34d399; font-size:18px;">${amt}</strong>.`,
    en: (amt: string) => `We have received your payment of <strong style="color:#34d399; font-size:18px;">${amt}</strong>.`,
    ar: (amt: string) => `لقد استلمنا أداءك بقيمة <strong style="color:#34d399; font-size:18px;">${amt}</strong>.`,
  },
  txRef: {
    fr: "Référence transaction",
    en: "Transaction reference",
    ar: "مرجع المعاملة",
  },
  nextStepHeading: {
    fr: "📋 <strong>Prochaine étape :</strong> validation administrative",
    en: "📋 <strong>Next step:</strong> administrative validation",
    ar: "📋 <strong>الخطوة الموالية :</strong> المصادقة الإدارية",
  },
  nextStepBody: {
    fr: "Notre équipe valide votre pack <strong>sous 24h ouvrables</strong>. Vous recevrez un email dès que votre pack sera activé et accessible.",
    en: "Our team validates your pack <strong>within 24 business hours</strong>. You will receive an email as soon as your pack is activated and accessible.",
    ar: "يصادق فريقنا على باقتك <strong>خلال 24 ساعة عمل</strong>. ستصلك رسالة بريد بمجرد تفعيل الباقة.",
  },
  followLink: {
    fr: "Vous pouvez suivre le statut dans votre tableau de bord :",
    en: "You can track the status in your dashboard:",
    ar: "يمكنك متابعة الحالة في لوحة التحكم :",
  },
  ctaPortal: { fr: "📁 Mes dossiers", en: "📁 My dossiers", ar: "📁 ملفّاتي" },
};

// ────────────────────────────────────────────────────────────────
//  3) packActive — admin a validé le pack
// ────────────────────────────────────────────────────────────────

export const PACK_ACTIVE = {
  subject: {
    fr: (porte: string) => `✅ Votre pack ${porte} est activé — CITURBAREA`,
    en: (porte: string) => `✅ Your ${porte} pack is activated — CITURBAREA`,
    ar: (porte: string) => `✅ تم تفعيل باقة ${porte} الخاصة بك — CITURBAREA`,
  },
  title: {
    fr: "Pack activé !",
    en: "Pack activated!",
    ar: "تمّ تفعيل الباقة !",
  },
  preheader: {
    fr: "Votre dossier est désormais opérationnel",
    en: "Your dossier is now operational",
    ar: "ملفّك جاهز للعمل الآن",
  },
  banner: {
    fr: (porte: string) => `🎉 <strong>Votre pack ${porte} est activé !</strong>`,
    en: (porte: string) => `🎉 <strong>Your ${porte} pack is activated!</strong>`,
    ar: (porte: string) => `🎉 <strong>تم تفعيل باقة ${porte} !</strong>`,
  },
  body: {
    fr: (ref: string) => `Votre dossier <strong>${ref}</strong> est maintenant opérationnel et notre équipe peut commencer à travailler dessus.`,
    en: (ref: string) => `Your dossier <strong>${ref}</strong> is now operational and our team can start working on it.`,
    ar: (ref: string) => `ملفّك <strong>${ref}</strong> أصبح جاهزاً، وفريقنا قادر على بدء العمل عليه.`,
  },
  nextStepsTitle: {
    fr: "Prochaines étapes :",
    en: "Next steps:",
    ar: "الخطوات الموالية :",
  },
  step1: {
    fr: "Notre équipe vous contactera dans les 48h pour démarrer la mission",
    en: "Our team will contact you within 48 hours to kick off the mission",
    ar: "سيتواصل معك فريقنا خلال 48 ساعة لانطلاق المهمّة",
  },
  step2: {
    fr: "Vous recevrez régulièrement des mises à jour sur l'avancement",
    en: "You will receive regular progress updates",
    ar: "ستتوصّل بتحديثات منتظمة حول التقدم",
  },
  step3: {
    fr: "Vous pouvez consulter le statut à tout moment dans votre espace",
    en: "You can check the status at any time in your space",
    ar: "يمكنك مراجعة الحالة في أي وقت من فضائك",
  },
  ctaPortal: {
    fr: "📁 Accéder à mes dossiers",
    en: "📁 Access my dossiers",
    ar: "📁 الولوج إلى ملفّاتي",
  },
};

// ────────────────────────────────────────────────────────────────
//  4) rapportPret — rapport P4/P5 prêt à télécharger
// ────────────────────────────────────────────────────────────────

export const RAPPORT_PRET = {
  subject: {
    fr: "📄 Votre rapport est prêt — CITURBAREA",
    en: "📄 Your report is ready — CITURBAREA",
    ar: "📄 تقريرك جاهز — CITURBAREA",
  },
  title: {
    fr: "Votre rapport est disponible",
    en: "Your report is available",
    ar: "تقريرك متاح",
  },
  preheader: {
    fr: "Téléchargement immédiat depuis votre espace",
    en: "Immediate download from your space",
    ar: "تحميل فوري من فضائك",
  },
  body: {
    fr: (name: string) => `Votre rapport <strong>${name}</strong> a été finalisé par notre expert et est prêt à être téléchargé.`,
    en: (name: string) => `Your report <strong>${name}</strong> has been finalized by our expert and is ready for download.`,
    ar: (name: string) => `تقريرك <strong>${name}</strong> أنجزه خبيرنا وأصبح جاهزاً للتحميل.`,
  },
  ctaDownload: {
    fr: "📄 Télécharger le rapport",
    en: "📄 Download the report",
    ar: "📄 تحميل التقرير",
  },
  warningTitle: {
    fr: "📌 <strong>Important :</strong>",
    en: "📌 <strong>Important:</strong>",
    ar: "📌 <strong>مهم :</strong>",
  },
  warningBody: {
    fr: "le rapport est marqué d'un filigrane « Rapport exclusif CITURBAREA — utilisable sur autorisation écrite ». Il est destiné à votre usage exclusif. Toute reproduction ou transmission à un tiers nécessite une autorisation écrite préalable.",
    en: "the report carries a watermark “CITURBAREA exclusive report — use subject to written authorization”. It is intended for your exclusive use. Any reproduction or transmission to a third party requires prior written authorization.",
    ar: "يحمل التقرير علامة مائية «تقرير حصري لـCITURBAREA — استعماله رهين برخصة مكتوبة». التقرير مخصّص لاستعمالك الحصري، وكلّ استنساخ أو تمرير للغير يستوجب ترخيصاً كتابياً مسبقاً.",
  },
};
