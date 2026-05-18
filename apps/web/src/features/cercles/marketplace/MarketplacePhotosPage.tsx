/**
 * MarketplacePhotosPage — /cercles/marketplace/photos
 * Écran admin : gérer la photo de chaque famille de matériaux.
 * Pour chaque famille : voir la photo actuelle, en uploader une (pro),
 * ou re-piocher automatiquement une photo Pixabay.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, resolveUploadUrl } from "../api";
import { CORPS_LABELS, CORPS_ICONS } from "./ProductCard";

type Famille = { corpsMetier: string; famille: string; photo: string | null; productCount: number };

export default function MarketplacePhotosPage() {
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const key = (f: Famille) => `${f.corpsMetier}|${f.famille}`;

  const load = () => {
    setLoading(true);
    marketplaceApi.adminFamilles()
      .then(r => setFamilles(r.data))
      .catch((e: any) => setErr(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const upload = async (f: Famille, file: File) => {
    setBusy(key(f)); setErr(null);
    try {
      const up = await marketplaceApi.uploadPhotos([file]);
      if (!up[0]?.url) throw new Error("Upload échoué");
      await marketplaceApi.setFamillePhoto(f.corpsMetier, f.famille, up[0].url);
      load();
    } catch (e: any) { setErr(e?.message || "Erreur upload"); }
    finally { setBusy(null); }
  };

  const reroll = async (f: Famille) => {
    setBusy(key(f)); setErr(null);
    try {
      await marketplaceApi.rerollFamillePhoto(f.famille);
      load();
    } catch (e: any) { setErr(e?.message || "Erreur re-pioche"); }
    finally { setBusy(null); }
  };

  // Regroupe par corps de métier
  const grouped: Record<string, Famille[]> = {};
  familles.forEach(f => { (grouped[f.corpsMetier] ||= []).push(f); });

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Admin · Photos du référentiel</div>
            <h1 style={S.title}>Gestion des photos matériaux</h1>
            <p style={S.lead}>
              Chaque famille a une photo partagée par ses produits. Remplace-la par ta propre
              photo professionnelle, ou re-pioche une photo automatique.
            </p>
          </div>
          <Link to="/cercles/marketplace" style={S.backBtn}>← Marketplace</Link>
        </header>

        {err && <div style={S.err}>{err}</div>}
        {loading && <div style={S.muted}>Chargement…</div>}

        {!loading && Object.keys(grouped).map(corps => (
          <div key={corps} style={{ marginBottom: 26 }}>
            <div style={S.corpsTitle}>
              {CORPS_ICONS[corps] || "📦"} {CORPS_LABELS[corps] || corps}
            </div>
            <div style={S.grid}>
              {grouped[corps].map(f => {
                const photo = resolveUploadUrl(f.photo);
                const isBusy = busy === key(f);
                return (
                  <div key={key(f)} style={S.card}>
                    <div style={{ ...S.photo, backgroundImage: photo ? `url(${photo})` : undefined }}>
                      {!photo && <span style={{ fontSize: 32, opacity: 0.4 }}>{CORPS_ICONS[corps] || "📦"}</span>}
                      {isBusy && <div style={S.busyOverlay}>…</div>}
                    </div>
                    <div style={S.cardBody}>
                      <div style={S.famName}>{f.famille}</div>
                      <div style={S.famCount}>{f.productCount} produit(s)</div>
                      <div style={S.actions}>
                        <label style={S.uploadBtn}>
                          {isBusy ? "…" : "Remplacer"}
                          <input
                            type="file" accept="image/*" style={{ display: "none" }}
                            disabled={isBusy}
                            onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(f, fl); }}
                          />
                        </label>
                        <button onClick={() => reroll(f)} disabled={isBusy} style={S.rerollBtn}>
                          Re-piocher
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "26px 32px 60px", maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22, flexWrap: "wrap" },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 27, fontWeight: 600, color: CC_THEME.navy },
  lead: { color: CC_THEME.inkMid, fontSize: 13, fontStyle: "italic", maxWidth: 560 },
  backBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "9px 14px", borderRadius: 6, textDecoration: "none", fontSize: 12.5, whiteSpace: "nowrap" },

  err: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 14 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 30 },

  corpsTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 17, fontWeight: 600, color: CC_THEME.navy, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${CC_THEME.border}` },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 },
  card: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, overflow: "hidden" },
  photo: { height: 110, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" },
  busyOverlay: { position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: CC_THEME.navy },
  cardBody: { padding: "9px 11px" },
  famName: { fontSize: 12.5, fontWeight: 600, color: CC_THEME.navy },
  famCount: { fontSize: 10.5, color: CC_THEME.inkMuted, marginTop: 1, marginBottom: 8 },
  actions: { display: "flex", gap: 6 },
  uploadBtn: { flex: 1, textAlign: "center", background: CC_THEME.navy, color: CC_THEME.bg, padding: "6px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" },
  rerollBtn: { flex: 1, background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.inkMid, padding: "6px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
};
