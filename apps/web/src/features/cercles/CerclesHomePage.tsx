import React from "react";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";

/**
 * CerclesHomePage — landing du module Cercles (lorsque aucun cercle sélectionné)
 */
export default function CerclesHomePage() {
  return (
    <CerclesShell>
      <div style={S.root}>
        <div>
          <div style={S.eyebrow}>Atelier · Réseau pro</div>
          <h1 style={S.title}>Bienvenue dans Cercles</h1>
          <p style={S.lead}>
            L'espace officiel d'échanges entre architectes, BET, bureaux de contrôle,
            entreprises GO et fournisseurs matériaux du Maroc.
          </p>
          <p style={S.lead}>
            Sélectionne un cercle dans la barre latérale, ou crée le tien.
          </p>

          <div style={S.bullets}>
            <Bullet icon="💬" title="Discussions"   body="Threads structurés, replies, upvotes, posts épinglés." />
            <Bullet icon="🎥" title="Visioconférence" body="Salles dédiées, jusqu'à 50 participants, recording sur le cloud Cercles." />
            <Bullet icon="📡" title="Diffusion live"  body="Multi-RTMP simultané vers YouTube, Facebook, LinkedIn." />
            <Bullet icon="🏛"  title="Pour les pros"   body="Réservé aux architectes, BET et entreprises BTP qualifiées." />
          </div>
        </div>
      </div>
    </CerclesShell>
  );
}

function Bullet({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={S.bullet}>
      <span style={S.bulletIcon}>{icon}</span>
      <div>
        <div style={S.bulletTitle}>{title}</div>
        <div style={S.bulletBody}>{body}</div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "60px 48px", maxWidth: 720 },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "8px 0 14px", fontFamily: CC_THEME.fontDisplay, fontSize: 42, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.02em", lineHeight: 1.1 },
  lead: { color: CC_THEME.inkMid, fontSize: 15, fontStyle: "italic", lineHeight: 1.6, maxWidth: 560 },

  bullets: { marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  bullet: { display: "flex", gap: 14, padding: "16px 18px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10 },
  bulletIcon: { fontSize: 22, lineHeight: 1, width: 30, flexShrink: 0 },
  bulletTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 16, fontWeight: 600, color: CC_THEME.navy },
  bulletBody: { fontSize: 12.5, color: CC_THEME.inkMid, marginTop: 4, lineHeight: 1.5 },
};
