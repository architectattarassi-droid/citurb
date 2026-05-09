/**
 * JitsiEmbed — wrapper React pour Jitsi external_api.js (8x8.vc JaaS ou meet.jit.si).
 *
 * Charge le script external_api.js du domaine fourni puis instancie
 * `JitsiMeetExternalAPI` dans la div parent. Hot-reload aware (cleanup
 * sur démontage).
 *
 * - mode "jaas"   : domain `8x8.vc`, JWT signé serveur (jaas.service.ts)
 * - mode "public" : domain `meet.jit.si`, anonyme (pas de JWT)
 */

import React, { useEffect, useRef, useState } from "react";
import { CC_THEME } from "./theme";
import { JoinRoomJitsiResponse } from "./api";

// Type minimal pour ne pas dépendre du package npm Jitsi
declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

const SCRIPT_ID = "jitsi-external-api-script";

function loadJitsiScript(domain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing && (existing as any)._loadedDomain === domain && window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    if (existing) existing.remove();

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = `https://${domain}/external_api.js`;
    (s as any)._loadedDomain = domain;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Échec chargement ${s.src}`));
    document.head.appendChild(s);
  });
}

export default function JitsiEmbed({
  config,
  displayName,
  email,
  onLeft,
  onError,
}: {
  config: JoinRoomJitsiResponse;
  displayName: string;
  email: string;
  onLeft?: () => void;
  onError?: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setScriptError(null);
    setScriptLoading(true);

    loadJitsiScript(config.domain)
      .then(() => {
        if (cancelled) return;
        setScriptLoading(false);

        if (!window.JitsiMeetExternalAPI) {
          setScriptError("API Jitsi indisponible");
          onError?.("API Jitsi indisponible");
          return;
        }
        if (!containerRef.current) return;

        const options: any = {
          roomName: config.roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName,
            email,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            DEFAULT_BACKGROUND: CC_THEME.bgDeep,
            DEFAULT_REMOTE_DISPLAY_NAME: "Membre",
            TOOLBAR_BUTTONS: [
              "microphone", "camera", "fullscreen", "fodeviceselection",
              "hangup", "chat", "raisehand", "videoquality", "filmstrip",
              "tileview", "settings",
            ],
          },
        };
        if (config.mode === "jaas" && config.jwt) options.jwt = config.jwt;

        try {
          apiRef.current = new window.JitsiMeetExternalAPI(config.domain, options);
          apiRef.current.addEventListener("readyToClose", () => {
            onLeft?.();
          });
          apiRef.current.addEventListener("videoConferenceLeft", () => {
            onLeft?.();
          });
        } catch (e: any) {
          setScriptError(e?.message || "Erreur initialisation Jitsi");
          onError?.(e?.message || "Erreur Jitsi");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setScriptLoading(false);
        setScriptError(e?.message || "Échec chargement script Jitsi");
        onError?.(e?.message || "Échec script");
      });

    return () => {
      cancelled = true;
      try {
        apiRef.current?.dispose?.();
      } catch {}
      apiRef.current = null;
    };
  }, [config.domain, config.roomName, config.jwt, config.mode, displayName, email, onError, onLeft]);

  return (
    <div style={S.wrap}>
      {scriptLoading && (
        <div style={S.overlay}>
          <div style={S.spinner}>Chargement de la salle…</div>
        </div>
      )}
      {scriptError && (
        <div style={S.overlay}>
          <div style={{ ...S.spinner, color: CC_THEME.danger }}>
            ⚠ {scriptError}
            <div style={{ fontSize: 12, marginTop: 8, color: CC_THEME.inkMuted }}>
              Vérifie ta connexion ou réessaie plus tard.
            </div>
          </div>
        </div>
      )}
      <div ref={containerRef} style={S.container} />
      {config.mode === "public" && (
        <div style={S.publicBadge} title="Salle publique anonyme — passez en JaaS Pro pour la modération avancée">
          🌐 Mode public
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { position: "relative", width: "100%", height: "calc(100vh - 60px)", background: CC_THEME.bgDeep },
  container: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    background: CC_THEME.bgDeep, color: CC_THEME.bgSoft, zIndex: 5, pointerEvents: "none",
  },
  spinner: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, opacity: 0.85 },
  publicBadge: {
    position: "absolute", bottom: 12, right: 12, background: "rgba(15, 42, 74, 0.85)",
    color: CC_THEME.or, padding: "6px 12px", borderRadius: 14, fontSize: 11,
    letterSpacing: "0.04em", zIndex: 10, fontFamily: CC_THEME.fontBody,
  },
};
