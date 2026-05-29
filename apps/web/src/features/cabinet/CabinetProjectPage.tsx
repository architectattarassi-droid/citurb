/**
 * CabinetProjectPage — /cabinet/:slug/projet/:projectSlug
 * Page projet dédiée (meilleur SEO qu'un tout-en-un).
 */
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cabinetApi, CabinetProject, CabinetProfile, youtubeId } from "./api";

export default function CabinetProjectPage() {
  const { slug, projectSlug } = useParams<{ slug: string; projectSlug: string }>();
  const [data, setData] = useState<(CabinetProject & { proProfile: CabinetProfile }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !projectSlug) return;
    let alive = true;
    cabinetApi
      .getPublicProject(slug, projectSlug)
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e?.message || "Erreur"));
    return () => {
      alive = false;
    };
  }, [slug, projectSlug]);

  useEffect(() => {
    if (!data) return;
    document.title = `${data.title} — ${data.proProfile.cabinetName || data.proProfile.displayName} | CITURBAREA`;
  }, [data]);

  if (error)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, color: "#0f172a" }}>Projet introuvable</h1>
        <Link to={slug ? `/cabinet/${slug}` : "/"} style={{ color: "#1e3a8a", fontWeight: 700, textDecoration: "none" }}>← Retour à la fiche cabinet</Link>
      </div>
    );
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Chargement…</div>;

  const photos = data.media.filter((m) => m.kind === "PHOTO");
  const videos = data.media.filter((m) => m.kind === "VIDEO_FILE" || m.kind === "VIDEO_URL");

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 20px 80px" }}>
        <Link to={`/cabinet/${slug}`} style={{ color: "#1e3a8a", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          ← {data.proProfile.cabinetName || data.proProfile.displayName}
        </Link>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "16px 0 8px", color: "#0f172a", letterSpacing: "-0.02em" }}>{data.title}</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          {data.type} · {data.location}{data.year ? ` · ${data.year}` : ""}{data.surface ? ` · ${new Intl.NumberFormat("fr-FR").format(data.surface)} m²` : ""}
        </div>

        {photos.length > 0 && (
          <section style={{ marginBottom: 30 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {photos.map((m) => (
                <img key={m.id} src={m.url} alt={m.alt || data.title} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }} />
              ))}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section style={{ marginBottom: 30 }}>
            {videos.map((m) => {
              const ytId = m.kind === "VIDEO_URL" ? youtubeId(m.url) : null;
              return (
                <div key={m.id} style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 14, borderRadius: 12, overflow: "hidden", background: "#000" }}>
                  {ytId ? (
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} title={m.caption || data.title} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                  ) : (
                    <video src={m.url} controls poster={m.thumbnailUrl || undefined} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                  )}
                </div>
              );
            })}
          </section>
        )}

        <section style={{ background: "#fff", padding: 24, borderRadius: 14, border: "1px solid #e2e8f0" }}>
          {data.programme && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>Programme</h2>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 18 }}>{data.programme}</p>
            </>
          )}
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>Description</h2>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{data.description}</p>
          {data.materials && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".04em", margin: "18px 0 8px" }}>Matériaux</h2>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>{data.materials}</p>
            </>
          )}
          {data.missions?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
              {data.missions.map((m, i) => (
                <span key={i} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1e3a8a", border: "1px solid #bfdbfe" }}>{m}</span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
