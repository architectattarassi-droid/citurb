/**
 * Enveloppe de page : affiche, sous la page d'une porte, les vidéos de la
 * chaîne correspondant à sa catégorie (lecture directe sur citurbarea.com).
 */
import React from "react";
import { useLang } from "../../i18n/i18n";
import { VIDEOS, VideosYoutube, type Video } from "./VideosYoutube";

type Theme = "p1" | "p2" | "p3" | "p4";

const PAR_THEME: Record<Theme, { videos: Video[]; titre: Record<string, string> }> = {
  p1: { videos: [VIDEOS.cout[0], VIDEOS.cout[1], VIDEOS.chantier[0], VIDEOS.terrain[1]], titre: { fr: "En vidéo : construire sa maison au Maroc, sans mauvaise surprise", en: "On video: building your home in Morocco without bad surprises", ar: "فيديوهات: كيفاش تبني دارك فالمغرب بلا مفاجآت" } },
  p2: { videos: VIDEOS.urbanisme, titre: { fr: "En vidéo : urbanisme, autorisations et montage de projet", en: "On video: planning, permits and project set-up", ar: "فيديوهات: التعمير، الرخص وتركيب المشاريع" } },
  p3: { videos: [VIDEOS.contrat[0], VIDEOS.contrat[1], VIDEOS.chantier[1], VIDEOS.chantier[2]], titre: { fr: "En vidéo : contrat, chantier et suivi des travaux", en: "On video: contracts, site works and supervision", ar: "فيديوهات: العقد، الورش وتتبع الأشغال" } },
  p4: { videos: VIDEOS.terrain, titre: { fr: "En vidéo : acheter et valoriser un terrain", en: "On video: buying and developing land", ar: "فيديوهات: شراء وتثمين الأرض" } },
};

export default function AvecVideos({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const { lang } = useLang();
  const c = PAR_THEME[theme];
  return (
    <>
      {children}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <VideosYoutube titre={c.titre[lang] ?? c.titre.fr} videos={c.videos} />
      </div>
    </>
  );
}
