/**
 * PorteSeoPage.tsx
 *
 * Page landing SEO générique par porte × ville (12 villes × 6 portes).
 *
 * Route attendue (cf. INTEGRATION.md, à wirer dans `routes.tsx`) :
 *   /fr/porte-:n-:slug
 *   /ar/porte-:n-:slug
 *   /en/porte-:n-:slug
 *
 * Le slug est de la forme `{porte}-{ville}` (ex: `permis-construire-rabat`).
 *
 * Le composant lit `useLang()` pour le contenu, expose les balises SEO via
 * `<title>` / `<meta>` posés directement dans `document.head` (pas de
 * react-helmet pour éviter une dep) et embarque un JSON-LD Schema.org
 * (LocalBusiness + Service).
 */

import React, { useEffect, useMemo } from "react";
import { useT, useLang } from "../../i18n/i18n";
import LeadCaptureForm from "../../features/lead-funnel/LeadCaptureForm";

type PorteNum = "1" | "2" | "3" | "4" | "5" | "6";

export interface PorteSeoPageProps {
  /** Numéro de porte (1..6). Si lecture URL, à dériver côté router. */
  porte: PorteNum;
  /** Slug court (ex: "permis-construire-rabat"). */
  slug?: string;
  /** Ville extraite du slug (fallback : Maroc). */
  ville?: string;
}

const TITRES: Record<PorteNum, Record<"fr" | "ar" | "en", string>> = {
  "1": {
    fr: "Permis de construire {ville} — CITURBAREA",
    ar: "رخصة البناء {ville} — CITURBAREA",
    en: "Building permit {ville} — CITURBAREA",
  },
  "2": {
    fr: "Promotion immobilière {ville} — CITURBAREA",
    ar: "الترويج العقاري {ville} — CITURBAREA",
    en: "Real estate development {ville} — CITURBAREA",
  },
  "3": {
    fr: "Maîtrise d'ouvrage déléguée {ville} — CITURBAREA",
    ar: "إدارة التفويض {ville} — CITURBAREA",
    en: "Delegated project management {ville} — CITURBAREA",
  },
  "4": {
    fr: "Étude foncière {ville} — CITURBAREA",
    ar: "تحليل عقاري {ville} — CITURBAREA",
    en: "Land analysis {ville} — CITURBAREA",
  },
  "5": {
    fr: "Rapports & expertises {ville} — CITURBAREA",
    ar: "تقارير وخبرات {ville} — CITURBAREA",
    en: "Reports & expertise {ville} — CITURBAREA",
  },
  "6": {
    fr: "Prestataires BTP {ville} — CITURBAREA",
    ar: "مزودي خدمات البناء {ville} — CITURBAREA",
    en: "Construction providers {ville} — CITURBAREA",
  },
};

const DESC: Record<PorteNum, Record<"fr" | "ar" | "en", string>> = {
  "1": {
    fr: "Obtenez votre permis de construire à {ville} avec CITURBAREA : architecte certifié, dépôt rokhas, suivi en ligne.",
    ar: "احصل على رخصة البناء في {ville} مع CITURBAREA: مهندس معتمد، إيداع رخصة، متابعة عبر الإنترنت.",
    en: "Get your building permit in {ville} with CITURBAREA: certified architect, rokhas filing, online tracking.",
  },
  "2": {
    fr: "Lancez votre programme immobilier à {ville} : devis CNOA instantané, dossier P2 conforme, escrow plateforme.",
    ar: "أطلق مشروعك العقاري في {ville}: عرض CNOA فوري، ملف P2 مطابق، ضمان عبر المنصة.",
    en: "Launch your real estate program in {ville}: instant CNOA quote, compliant P2 file, platform escrow.",
  },
  "3": {
    fr: "Pilotage de chantier clé en main à {ville} — MOD, coordination 40+ corps de métiers Maroc.",
    ar: "إدارة الورش تسليم المفتاح في {ville} — تنسيق أكثر من 40 حرفة مغربية.",
    en: "Turnkey site management in {ville} — MOD coordination, 40+ Moroccan trades.",
  },
  "4": {
    fr: "Analyse de rentabilité foncière à {ville} : rapport CITURBAREA exclusif, 3 packs (Basique / Moyen / Rentabilité).",
    ar: "تحليل المردودية العقارية في {ville}: تقرير CITURBAREA حصري، 3 باقات.",
    en: "Land profitability analysis in {ville}: exclusive CITURBAREA report, 3 packs.",
  },
  "5": {
    fr: "Rapports & expertises techniques à {ville} : valeur vénale, conformité urbanistique, audit de risque.",
    ar: "تقارير وخبرات تقنية في {ville}: تقدير القيمة، الامتثال العمراني، تدقيق المخاطر.",
    en: "Technical reports & expertise in {ville}: market valuation, urban compliance, risk audit.",
  },
  "6": {
    fr: "Trouvez les prestataires BTP qualifiés à {ville} — réseau CITURBAREA scoré L7, classes BTP, agréments.",
    ar: "اعثر على مزودي خدمات البناء المؤهلين في {ville} — شبكة CITURBAREA مصنفة L7.",
    en: "Find qualified construction providers in {ville} — CITURBAREA L7-scored network.",
  },
};

const fmt = (tpl: string, ville: string) => tpl.replace(/\{ville\}/g, ville);

const PorteSeoPage: React.FC<PorteSeoPageProps> = ({
  porte,
  slug,
  ville,
}) => {
  const t = useT();
  const { lang } = useLang();
  const v = ville && ville.trim().length > 0 ? ville : t("lead.seo.morocco");

  const title = useMemo(() => fmt(TITRES[porte][lang], v), [porte, v, lang]);
  const description = useMemo(() => fmt(DESC[porte][lang], v), [porte, v, lang]);

  // Pose les meta SEO (sans react-helmet)
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
    // hreflang alternates
    setLinkAlt("fr", `/fr/porte-${porte}-${slug || ""}`);
    setLinkAlt("ar", `/ar/porte-${porte}-${slug || ""}`);
    setLinkAlt("en", `/en/porte-${porte}-${slug || ""}`);
    setLinkAlt("x-default", `/fr/porte-${porte}-${slug || ""}`);
  }, [title, description, porte, slug]);

  const jsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          name: "CITURBAREA",
          url: "https://citurbarea.com",
          areaServed: v,
          address: {
            "@type": "PostalAddress",
            addressCountry: "MA",
            addressLocality: v,
          },
          telephone: "+212-6-00-00-00-00",
        },
        {
          "@type": "Service",
          serviceType: title,
          provider: { "@type": "Organization", name: "CITURBAREA" },
          areaServed: v,
          description,
        },
      ],
    };
  }, [v, title, description]);

  const features: Array<{ title: string; body: string }> = [
    {
      title: t("lead.seo.feat1.t"),
      body: t("lead.seo.feat1.b"),
    },
    {
      title: t("lead.seo.feat2.t"),
      body: t("lead.seo.feat2.b"),
    },
    {
      title: t("lead.seo.feat3.t"),
      body: t("lead.seo.feat3.b"),
    },
  ];

  return (
    <main
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
          {t("lead.seo.kicker")} · Porte {porte}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
          {description}
        </p>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((f, i) => (
          <article
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white sm:p-10">
        <h2 className="text-xl font-bold sm:text-2xl">
          {t("lead.seo.cta.title", { ville: v })}
        </h2>
        <p className="mt-2 text-sm text-blue-100">{t("lead.seo.cta.subtitle")}</p>
        <div className="mt-6 rounded-xl bg-white p-4 text-slate-900 shadow-lg">
          <LeadCaptureForm
            source="WEB_PORTE_SEO"
            porteType={`P${porte}`}
            withEmail
            compact
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          {t("lead.seo.faq.title")}
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <details
              key={n}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <summary className="cursor-pointer font-medium text-slate-800">
                {t(`lead.seo.faq.q${n}`, { ville: v })}
              </summary>
              <p className="mt-2 text-sm text-slate-600">
                {t(`lead.seo.faq.a${n}`, { ville: v })}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Image lazy-loaded illustrative (placeholder gradient si pas d'asset) */}
      <figure className="mt-12">
        <img
          src={`/seo/porte-${porte}.webp`}
          alt={title}
          loading="lazy"
          decoding="async"
          width={1200}
          height={600}
          className="w-full rounded-xl object-cover shadow-md"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </figure>
    </main>
  );
};

// ── Helpers DOM ────────────────────────────────────────────────────

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkAlt(hreflang: string, href: string) {
  let el = document.querySelector(
    `link[rel="alternate"][hreflang="${hreflang}"]`,
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default PorteSeoPage;
