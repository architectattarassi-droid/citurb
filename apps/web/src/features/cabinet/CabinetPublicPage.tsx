/**
 * CabinetPublicPage — /cabinet/:slug
 * Vue publique de la fiche cabinet d'architecte (lecture seule).
 * Injecte le JSON-LD agrégé (ProfessionalService + CreativeWork + Image/VideoObject)
 * dans <head> pour le référencement (équivalent prerender côté client en attendant le SSR).
 *
 * i18n : namespace "cabinet" (cabinet.public.*, cabinet.error.*, cabinet.loading).
 * Responsive desktop : conteneurs élargis à 1400px (cit-container-xl) et grille
 * projets auto-fit minmax(280px, 1fr) — 4 à 5 colonnes naturellement en >=1280px.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { cabinetApi, CabinetProfile } from "./api";
import { useT, useLang } from "../../i18n/i18n";

function fmtNum(n: number | null | undefined, lang: string): string {
  if (n == null) return "—";
  const locale = lang === "ar" ? "ar-MA" : lang === "en" ? "en-US" : "fr-FR";
  return new Intl.NumberFormat(locale).format(n);
}

function statusColor(s: string): string {
  return s === "LIVRE" ? "#15803d" : s === "EN_COURS" ? "#b45309" : "#475569";
}

function useInjectJsonLd(slug: string | undefined) {
  useEffect(() => {
    if (!slug) return;
    let nodes: HTMLScriptElement[] = [];
    let cancelled = false;
    cabinetApi
      .getSchemaJson(slug)
      .then((arr) => {
        if (cancelled) return;
        for (const obj of arr || []) {
          const s = document.createElement("script");
          s.type = "application/ld+json";
          s.dataset.cabinetSlug = slug;
          s.text = JSON.stringify(obj);
          document.head.appendChild(s);
          nodes.push(s);
        }
      })
      .catch(() => {
        /* silencieux : la page publique reste lisible sans JSON-LD */
      });
    return () => {
      cancelled = true;
      for (const n of nodes) n.parentNode?.removeChild(n);
    };
  }, [slug]);
}

export default function CabinetPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CabinetProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const { lang } = useLang();

  const statusLabel = (s: string): string => {
    if (s === "LIVRE") return t("cabinet.public.status.livre");
    if (s === "EN_COURS") return t("cabinet.public.status.en_cours");
    return t("cabinet.public.status.etude");
  };

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setError(null);
    cabinetApi
      .getPublic(slug)
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch((e) => {
        if (alive) setError(e?.message || t("cabinet.error.load_failed"));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useInjectJsonLd(slug);

  useEffect(() => {
    if (!data) return;
    const name = data.cabinetName || data.displayName;
    document.title = `${name} | ${t("cabinet.public.page_title_suffix")}`;
    const fallback = t("cabinet.public.default_desc", { name });
    const desc = (data.bio || fallback).slice(0, 160);
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang]);

  const projects = useMemo(() => data?.portfolioProjects || [], [data]);

  if (error) {
    return (
      <div style={{ maxWidth: 820, margin: "60px auto", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, color: "#0f172a", marginBottom: 12 }}>{t("cabinet.error.not_found")}</h1>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          {t("cabinet.error.not_found_desc", { slug: slug || "" })
            .split(`/${slug || ""}`)
            .map((part, i, arr) =>
              i < arr.length - 1 ? (
                <React.Fragment key={i}>
                  {part}
                  <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>/{slug}</code>
                </React.Fragment>
              ) : (
                <React.Fragment key={i}>{part}</React.Fragment>
              )
            )}
        </p>
        <Link to="/" style={{ color: "#1e3a8a", fontWeight: 700, textDecoration: "none" }}>{t("cabinet.error.back_home")}</Link>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>{t("cabinet.loading")}</div>;
  }

  const name = data.cabinetName || data.displayName;
  const cover = data.coverUrl || data.avatarUrl;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header style={{ position: "relative", background: cover ? `linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)),url(${cover}) center/cover` : "linear-gradient(135deg,#0f172a,#1e3a8a)", color: "#fff", padding: "60px 20px 50px" }}>
        <div className="cit-container-xl" style={{ maxWidth: 1400, margin: "0 auto" }}>
          {data.isVerified && (
            <div style={{ display: "inline-block", background: "#0891b2", color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 12px", borderRadius: 99, marginBottom: 12 }}>
              {t("cabinet.public.verified_badge")}
            </div>
          )}
          <h1 style={{ fontSize: 36, margin: "0 0 6px", fontWeight: 900, letterSpacing: "-0.02em" }}>{name}</h1>
          {data.title && <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 10 }}>{data.title}</div>}
          {data.villePrincipale && <div style={{ fontSize: 14, opacity: 0.8 }}>📍 {data.villePrincipale}{data.regions?.length ? ` · ${data.regions.slice(0, 3).join(" · ")}` : ""}</div>}
          {data.bio && <p style={{ fontSize: 15, lineHeight: 1.7, marginTop: 18, maxWidth: 920, opacity: 0.95 }}>{data.bio}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            {data.websiteUrl && <a href={data.websiteUrl} target="_blank" rel="noreferrer" style={chipStyle}>{t("cabinet.public.link_website")}</a>}
            {data.linkedinUrl && <a href={data.linkedinUrl} target="_blank" rel="noreferrer" style={chipStyle}>{t("cabinet.public.link_linkedin")}</a>}
            {data.behanceUrl && <a href={data.behanceUrl} target="_blank" rel="noreferrer" style={chipStyle}>{t("cabinet.public.link_behance")}</a>}
            {data.instagramUrl && <a href={data.instagramUrl} target="_blank" rel="noreferrer" style={chipStyle}>{t("cabinet.public.link_instagram")}</a>}
            {data.phonePublic && <a href={`tel:${data.phonePublic}`} style={chipStyle}>📞 {data.phonePublic}</a>}
            {data.emailPublic && <a href={`mailto:${data.emailPublic}`} style={chipStyle}>{t("cabinet.public.link_contact")}</a>}
          </div>
        </div>
      </header>

      {/* ── Projets ──────────────────────────────────────────────── */}
      <main className="cit-container-xl" style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>
          {t("cabinet.public.projects_title")} <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: 14 }}>({projects.length})</span>
        </h2>
        {projects.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            {t("cabinet.public.no_projects")}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {projects.map((proj) => {
              const cover = proj.media.find((m) => m.kind === "PHOTO") || proj.media[0];
              const coverUrl = cover?.url || cover?.thumbnailUrl;
              return (
                <article key={proj.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}>
                  <div style={{ height: 200, background: coverUrl ? `url(${coverUrl}) center/cover` : "linear-gradient(135deg,#1e293b,#0f172a)", position: "relative" }}>
                    <span style={{ position: "absolute", top: 12, insetInlineStart: 12, background: statusColor(proj.status), color: "#fff", padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {statusLabel(proj.status)}
                    </span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{proj.title}</h3>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                      {proj.type} · {proj.location}{proj.year ? ` · ${proj.year}` : ""}{proj.surface ? ` · ${fmtNum(proj.surface, lang)} m²` : ""}
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {proj.description}
                    </p>
                    <Link to={`/cabinet/${data.slug}/projet/${proj.slug}`} style={{ color: "#1e3a8a", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                      {t("cabinet.public.view_project")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  padding: "7px 14px",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  borderRadius: 99,
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.25)",
};
