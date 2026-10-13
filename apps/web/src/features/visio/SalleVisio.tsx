/**
 * SalleVisio — visio intégrée à CITURBAREA (Jitsi as a Service, 8x8.vc).
 *
 * Module générique : rendez-vous aujourd'hui, suivi de chantier et réunions
 * prestataires demain. La configuration (salle + jeton signé) vient toujours
 * du serveur (functions/_lib/visio.ts, fonction `acces`) : le jeton n'ouvre
 * que cette salle, pour 2 h.
 *
 * Charge https://8x8.vc/<appId>/external_api.js puis instancie
 * JitsiMeetExternalAPI dans le conteneur ; les permissions caméra/micro sont
 * demandées par le navigateur à ce moment-là (après le clic « Rejoindre »).
 * Pas de repli meet.jit.si (son intégration n'est plus autorisée).
 * Adapté de features/cercles/JitsiEmbed.tsx, sans dépendance à Cercles.
 */
import { useEffect, useRef, useState } from "react";

export type ConfigVisio = { domain: string; roomName: string; jwt: string; appId: string; expire?: string };

type ApiJitsi = { addEventListener(e: string, f: (...a: unknown[]) => void): void; dispose(): void };
type ConstructeurJitsi = new (domaine: string, options: Record<string, unknown>) => ApiJitsi;

const SCRIPT_ID = "visio-jaas-external-api";

function chargerScript(src: string): Promise<void> {
  return new Promise((resoudre, rejeter) => {
    const w = window as unknown as { JitsiMeetExternalAPI?: ConstructeurJitsi };
    const existant = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existant && existant.src === src && w.JitsiMeetExternalAPI) { resoudre(); return; }
    if (existant) existant.remove();
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = src;
    s.onload = () => resoudre();
    s.onerror = () => rejeter(new Error("Le service de visio ne répond pas."));
    document.head.appendChild(s);
  });
}

export default function SalleVisio({ config, nomAffiche, email, onQuitter, onErreur, className }: {
  config: ConfigVisio;
  nomAffiche: string;
  email?: string;
  onQuitter?: () => void;
  onErreur?: (message: string) => void;
  className?: string;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const api = useRef<ApiJitsi | null>(null);
  // Rappels dans des refs : un nouveau rendu du parent ne recrée pas la salle.
  const rappels = useRef({ onQuitter, onErreur });
  rappels.current = { onQuitter, onErreur };
  const [etat, setEtat] = useState<"chargement" | "pret" | "erreur">("chargement");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;
    const echec = (m: string) => { if (annule) return; setEtat("erreur"); setErreur(m); rappels.current.onErreur?.(m); };
    setEtat("chargement");
    chargerScript(`https://${config.domain}/${encodeURIComponent(config.appId)}/external_api.js`)
      .then(() => {
        if (annule || !conteneur.current) return;
        const Jitsi = (window as unknown as { JitsiMeetExternalAPI?: ConstructeurJitsi }).JitsiMeetExternalAPI;
        if (!Jitsi) { echec("Le service de visio est indisponible."); return; }
        try {
          api.current = new Jitsi(config.domain, {
            roomName: config.roomName,
            jwt: config.jwt,
            parentNode: conteneur.current,
            width: "100%",
            height: "100%",
            lang: "fr",
            userInfo: { displayName: nomAffiche, email: email || "" },
            configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, startWithAudioMuted: false, startWithVideoMuted: false, subject: "CITURBAREA" },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              MOBILE_APP_PROMO: false,
              TOOLBAR_BUTTONS: ["microphone", "camera", "desktop", "fullscreen", "fodeviceselection", "hangup", "chat", "tileview", "settings", "videoquality"],
            },
          });
          api.current.addEventListener("videoConferenceJoined", () => { if (!annule) setEtat("pret"); });
          api.current.addEventListener("readyToClose", () => rappels.current.onQuitter?.());
          setEtat("pret");
        } catch {
          echec("La salle n'a pas pu s'ouvrir.");
        }
      })
      .catch((e: Error) => echec(e.message));
    return () => {
      annule = true;
      try { api.current?.dispose(); } catch { /* déjà fermée */ }
      api.current = null;
    };
  }, [config.domain, config.appId, config.roomName, config.jwt, nomAffiche, email]);

  return (
    <div className={"relative h-full w-full overflow-hidden bg-[#0B1B3A] " + (className || "")}>
      <div ref={conteneur} className="h-full w-full" />
      {etat === "chargement" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-base text-white/85">Ouverture de la salle…</div>
      )}
      {etat === "erreur" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white" role="alert">
          <p className="m-0 font-semibold">{erreur}</p>
          <p className="m-0 text-sm text-white/75">Vérifiez votre connexion puis réessayez.</p>
        </div>
      )}
    </div>
  );
}
