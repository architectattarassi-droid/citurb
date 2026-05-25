import React from "react";

/**
 * CITURBAREA — Skeleton loader universel.
 *
 * But: standardiser les états "chargement" partout dans l'app pour
 * remplacer les "Chargement…" / spinners / écrans vides qui font
 * croire à l'utilisateur que l'app a planté.
 *
 * Mobile-first, sans dépendance externe, sans CSS framework — fonctionne
 * dans toutes les pages qu'elles utilisent Tailwind ou les variables
 * citurbarea.css.
 *
 * Usage :
 *   <Skeleton kind="card" />
 *   <Skeleton kind="row" count={5} />
 *   <Skeleton kind="map" />
 *   <Skeleton kind="text" width="60%" />
 *   <Skeleton kind="avatar" />
 *
 * Conformité Tome 2 (UI system) : composant low-level, sans dépendance
 * réseau, accessible (role=status + aria-busy), respecte
 * prefers-reduced-motion.
 */

export type SkeletonKind =
  | "text"
  | "card"
  | "row"
  | "avatar"
  | "map"
  | "list"
  | "header"
  | "block";

export interface SkeletonProps {
  /** Pattern visuel à afficher. */
  kind?: SkeletonKind;
  /** Nombre de répétitions (pour row/list/text). */
  count?: number;
  /** Largeur CSS du bloc principal (par défaut 100%). */
  width?: string | number;
  /** Hauteur CSS (par défaut dépend du kind). */
  height?: string | number;
  /** Label accessibilité (par défaut "Chargement en cours"). */
  ariaLabel?: string;
  /** className additionnelle (Tailwind possible). */
  className?: string;
  /** Style additionnel. */
  style?: React.CSSProperties;
}

// ── Animation injectée 1× dans le DOM (pas de fichier CSS externe à charger) ──
const STYLE_ID = "cit-skeleton-style";
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
@keyframes cit-skel-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
.cit-skel {
  display: block;
  background: linear-gradient(90deg, #eef0f3 0%, #f7f8fa 50%, #eef0f3 100%);
  background-size: 200px 100%;
  background-repeat: no-repeat;
  border-radius: 6px;
  animation: cit-skel-shimmer 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .cit-skel { animation: none; background: #eef0f3; }
}
.cit-skel--card {
  border-radius: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e6ec;
  animation: none;
}
.cit-skel--row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
`;
  document.head.appendChild(el);
}

function Block({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="cit-skel"
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof radius === "number" ? `${radius}px` : radius,
        ...style,
      }}
    />
  );
}

function Card() {
  return (
    <div className="cit-skel--card">
      <Block width="40%" height={12} />
      <div style={{ height: 10 }} />
      <Block width="85%" height={20} />
      <div style={{ height: 14 }} />
      <Block width="100%" height={10} />
      <div style={{ height: 6 }} />
      <Block width="92%" height={10} />
      <div style={{ height: 6 }} />
      <Block width="60%" height={10} />
      <div style={{ height: 18 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Block width={86} height={32} radius={10} />
        <Block width={120} height={32} radius={10} />
      </div>
    </div>
  );
}

function Row() {
  return (
    <div className="cit-skel--row">
      <Block width={40} height={40} radius={999} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Block width="55%" height={12} />
        <div style={{ height: 8 }} />
        <Block width="35%" height={10} />
      </div>
      <Block width={64} height={22} radius={6} />
    </div>
  );
}

function Avatar() {
  return <Block width={40} height={40} radius={999} />;
}

function Header() {
  return (
    <div>
      <Block width="30%" height={28} />
      <div style={{ height: 10 }} />
      <Block width="60%" height={14} />
    </div>
  );
}

function MapSkel() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 320,
        borderRadius: 14,
        overflow: "hidden",
        background: "#eef0f3",
        border: "1px solid #e2e6ec",
      }}
    >
      <Block width="100%" height="100%" radius={14} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        Carte en chargement…
      </div>
    </div>
  );
}

function ListSkel({ count }: { count: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
          <Row />
        </div>
      ))}
    </div>
  );
}

function TextSkel({ count, width }: { count: number; width: string | number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <Block
            width={i === count - 1 ? "60%" : width}
            height={12}
          />
        </div>
      ))}
    </div>
  );
}

export function Skeleton(props: SkeletonProps) {
  ensureStyle();
  const {
    kind = "text",
    count = 3,
    width = "100%",
    height,
    ariaLabel = "Chargement en cours",
    className,
    style,
  } = props;

  let body: React.ReactNode;
  switch (kind) {
    case "card":
      body = <Card />;
      break;
    case "row":
      body = (
        <div>
          {Array.from({ length: count }).map((_, i) => (
            <Row key={i} />
          ))}
        </div>
      );
      break;
    case "avatar":
      body = <Avatar />;
      break;
    case "map":
      body = <MapSkel />;
      break;
    case "list":
      body = <ListSkel count={count} />;
      break;
    case "header":
      body = <Header />;
      break;
    case "block":
      body = <Block width={width} height={height ?? 120} radius={10} />;
      break;
    case "text":
    default:
      body = <TextSkel count={count} width={width} />;
      break;
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {body}
      <span style={visuallyHidden}>{ariaLabel}</span>
    </div>
  );
}

const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default Skeleton;
