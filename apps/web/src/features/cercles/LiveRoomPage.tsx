/**
 * LiveRoomPage — coquille de la salle de visioconférence
 *
 * À ce stade (Sprint C3) : récupère le token LiveKit côté serveur et
 * affiche un placeholder. L'intégration `@livekit/components-react`
 * (LiveKitRoom + VideoConference) sera branchée Sprint C4 dès que les
 * dépendances npm seront installées dans `apps/web/package.json`
 * (livekit-client, @livekit/components-react, @livekit/components-styles).
 *
 * Le token n'est JAMAIS persisté en localStorage (sécurité prompt §8.3).
 * Il vit uniquement dans le state du composant.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CC_THEME } from "./theme";
import { cerclesApi, JoinRoomResponse, LiveRoom, CercleDetail } from "./api";

export default function LiveRoomPage() {
  const { slug, roomSlug } = useParams<{ slug: string; roomSlug: string }>();
  const navigate = useNavigate();
  const [cercle, setCercle] = useState<CercleDetail | null>(null);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [join, setJoin] = useState<JoinRoomResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "preflight" | "joined" | "ended">("loading");

  const load = useCallback(async () => {
    if (!slug || !roomSlug) return;
    try {
      const c = await cerclesApi.detail(slug);
      setCercle(c.data);
      // Récupère la liste pour trouver l'id de la room par slug
      const all = await cerclesApi.listRooms(c.data.id);
      const r = all.data.find(x => x.slug === roomSlug);
      if (!r) { setErr("Salle introuvable"); return; }
      setRoom(r);
      setPhase(r.status === "ENDED" ? "ended" : "preflight");
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    }
  }, [slug, roomSlug]);

  useEffect(() => { load(); }, [load]);

  const enterRoom = async () => {
    if (!cercle || !room) return;
    try {
      const r = await cerclesApi.joinRoom(cercle.id, room.id);
      setJoin(r.data);
      setPhase("joined");
    } catch (e: any) {
      setErr(e?.message || "Impossible de rejoindre");
    }
  };

  if (err) return <ErrorScreen msg={err} onBack={() => navigate(`/cercles/${slug}`)} />;
  if (!room) return <LoadingScreen />;

  if (phase === "ended") return (
    <div style={S.root}>
      <h2 style={S.h2}>Salle terminée</h2>
      <p style={S.p}>Cette session est close. {room.recordingUrl ? "Le replay est disponible." : "Aucun replay enregistré."}</p>
      <button onClick={() => navigate(`/cercles/${slug}`)} style={S.btn}>← Retour au cercle</button>
    </div>
  );

  if (phase === "preflight") return (
    <div style={S.root}>
      <div style={S.eyebrow}>{cercle?.name} · Visioconférence</div>
      <h1 style={S.h1}>{room.title}</h1>
      {room.description && <p style={S.p}>{room.description}</p>}
      <div style={S.statusBar}>
        <span style={{ ...S.statusPill, background: room.status === "LIVE" ? CC_THEME.dangerBg : CC_THEME.infoBg, color: room.status === "LIVE" ? CC_THEME.danger : CC_THEME.info }}>
          {room.status === "LIVE" ? "● EN DIRECT" : room.status}
        </span>
        <span style={S.metaTxt}>Hôte : {room.host.username || room.host.email}</span>
        <span style={S.metaTxt}>Max : {room.maxParticipants} pers.</span>
      </div>

      <div style={S.preflight}>
        <h3 style={S.h3}>Avant d'entrer</h3>
        <ul style={S.checks}>
          <li>Vérifie que ton micro et ta caméra sont autorisés dans le navigateur.</li>
          <li>Pour une qualité optimale : connexion câblée ou Wi-Fi 5 GHz.</li>
          <li>Ferme les applications gourmandes en bande passante (Zoom, Teams en parallèle).</li>
        </ul>
        <button onClick={enterRoom} style={{ ...S.btn, marginTop: 16 }}>📹 Entrer dans la salle</button>
      </div>
    </div>
  );

  // phase === "joined"
  return (
    <div style={S.liveRoot}>
      <div style={S.liveHeader}>
        <span style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.bg }}>{room.title}</span>
        <button onClick={() => navigate(`/cercles/${slug}`)} style={S.leaveBtn}>Quitter</button>
      </div>
      <div style={S.placeholder}>
        <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.or, marginBottom: 14 }}>
          📹 Salle prête
        </div>
        <div style={{ color: CC_THEME.inkOnDark, marginBottom: 8 }}>
          Token JWT reçu. WebSocket : <code style={{ color: CC_THEME.or }}>{join?.wsUrl}</code>
        </div>
        <div style={{ color: CC_THEME.inkOnDark, opacity: 0.7, fontSize: 13, fontStyle: "italic" }}>
          L'intégration vidéo native (LiveKit React) sera branchée à l'installation des dépendances <code>@livekit/components-react</code> + provisioning du serveur LiveKit (cf <code>docs/cercles/INFRA.md</code>).
        </div>
        <div style={{ color: CC_THEME.inkMuted, fontSize: 11, marginTop: 14, fontFamily: CC_THEME.fontMono, wordBreak: "break-all", maxWidth: 600 }}>
          {join?.token.slice(0, 80)}…
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return <div style={{ padding: 48, color: CC_THEME.inkMid, fontStyle: "italic" }}>Chargement de la salle…</div>;
}
function ErrorScreen({ msg, onBack }: { msg: string; onBack: () => void }) {
  return (
    <div style={{ padding: 48 }}>
      <h2 style={{ color: CC_THEME.danger, fontFamily: CC_THEME.fontDisplay }}>{msg}</h2>
      <button onClick={onBack} style={S.btn}>← Retour</button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "40px 48px", maxWidth: 760, fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  h1: { margin: "8px 0 12px", fontFamily: CC_THEME.fontDisplay, fontSize: 30, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },
  h2: { fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },
  h3: { fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600, marginBottom: 10 },
  p: { color: CC_THEME.inkMid, fontSize: 14, fontStyle: "italic", lineHeight: 1.55 },

  statusBar: { display: "flex", gap: 12, marginTop: 16, alignItems: "center" },
  statusPill: { fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 4, letterSpacing: "0.10em" },
  metaTxt: { fontSize: 12, color: CC_THEME.inkMid },

  preflight: { marginTop: 32, padding: 24, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10 },
  checks: { fontSize: 13, color: CC_THEME.ink, lineHeight: 1.7, paddingLeft: 18 },

  btn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },

  liveRoot: { height: "100vh", background: CC_THEME.bgDeep, display: "flex", flexDirection: "column" },
  liveHeader: { padding: "12px 24px", borderBottom: `1px solid #1A3A5C`, display: "flex", justifyContent: "space-between", alignItems: "center" },
  leaveBtn: { background: CC_THEME.danger, color: "#fff", border: 0, padding: "7px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  placeholder: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 },
};
