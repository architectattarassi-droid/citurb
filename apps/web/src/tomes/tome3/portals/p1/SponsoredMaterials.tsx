/**
 * SponsoredMaterials — cartes "Sponsorisé" de fournisseurs matériaux, affichées
 * dans le devis client au contexte du lot de finition (ex. REV → carrelage).
 *
 * Régie native (pas de pub tierce) : source /api/ads/materials. Impression comptée
 * côté serveur au chargement ; clic tracké via /api/ads/click/:offerId.
 * N'affiche RIEN s'il n'y a pas de promo active (dégradé propre).
 */
import React, { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";
const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString("fr-MA") + " DH";

type Card = {
  offerId: string; productId: string; lot: string; name: string; photo: string | null;
  unit?: string; famille?: string; priceDH: number; city?: string | null; supplier: string;
};

const LOT_LABEL: Record<string, string> = {
  REV: "Revêtements / carrelage", PEI: "Peinture", ALU: "Menuiserie aluminium",
  FAC: "Façade", BOI: "Menuiserie bois", PLO: "Plomberie / sanitaire",
};

export default function SponsoredMaterials({ lots }: { lots: string[] }) {
  const [byLot, setByLot] = useState<Record<string, Card[]>>({});

  useEffect(() => {
    const uniq = Array.from(new Set(lots.filter(Boolean)));
    if (!uniq.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/ads/materials?lots=${encodeURIComponent(uniq.join(","))}`);
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setByLot(j.byLot || {});
      } catch { /* silencieux */ }
    })();
    return () => { cancelled = true; };
  }, [lots.join(",")]);

  const onClick = (c: Card) => {
    try {
      const url = `${apiBase()}/api/ads/click/${c.offerId}`;
      if (navigator.sendBeacon) navigator.sendBeacon(url);
      else fetch(url, { method: "POST", keepalive: true }).catch(() => {});
    } catch { /* noop */ }
    window.open(`/cercles/marketplace/produit/${c.productId}`, "_blank", "noopener");
  };

  const activeLots = Object.keys(byLot).filter((l) => (byLot[l] || []).length > 0);
  if (!activeLots.length) return null;

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.badge}>Sponsorisé</span>
        <span style={S.title}>Fournisseurs recommandés pour votre projet</span>
      </div>
      {activeLots.map((lot) => (
        <div key={lot} style={{ marginTop: 12 }}>
          <div style={S.lotLabel}>{LOT_LABEL[lot] || lot}</div>
          <div style={S.grid}>
            {byLot[lot].map((c) => (
              <button key={c.offerId} type="button" onClick={() => onClick(c)} style={S.card}>
                <div style={{ ...S.photo, background: c.photo ? `center/cover url(${c.photo})` : "linear-gradient(135deg,#ece7dc,#cfc7b6)" }} />
                <div style={S.name}>{c.name}</div>
                <div style={S.meta}>{c.supplier}{c.city ? ` · ${c.city}` : ""}</div>
                <div style={S.price}>{fmt(c.priceDH)}{c.unit ? ` / ${c.unit.toLowerCase()}` : ""}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={S.disc}>Contenu sponsorisé — fournisseurs partenaires CITURBAREA. Les prix sont indicatifs.</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 16, padding: 16, borderRadius: 16, background: "rgba(201,162,39,0.05)", border: "1px dashed rgba(201,162,39,0.5)" },
  head: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  badge: { fontSize: 10.5, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: GOLD, padding: "3px 8px", borderRadius: 6 },
  title: { fontSize: 14, fontWeight: 800, color: NAVY },
  lotLabel: { fontSize: 12, fontWeight: 800, color: "rgba(11,27,58,0.6)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 },
  card: { textAlign: "left", padding: 10, borderRadius: 12, border: "1px solid rgba(11,27,58,0.12)", background: "#fff", cursor: "pointer" },
  photo: { height: 78, borderRadius: 8, marginBottom: 8, border: "1px solid rgba(11,27,58,0.08)" },
  name: { fontSize: 13, fontWeight: 800, color: NAVY, lineHeight: 1.25 },
  meta: { fontSize: 11.5, color: "rgba(11,27,58,0.55)", marginTop: 3 },
  price: { fontSize: 13, fontWeight: 900, color: GOLD, marginTop: 5 },
  disc: { fontSize: 10.5, color: "rgba(11,27,58,0.45)", marginTop: 12 },
};
