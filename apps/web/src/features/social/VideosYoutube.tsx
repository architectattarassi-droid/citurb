/**
 * Vidéos de la chaîne « مدن تتحدت - Cities Talk » (@citiestalkmaroc) intégrées
 * en lecteur vidéo (youtube-nocookie, lecture sur place), choisies selon la
 * catégorie de la page et le type de projet, + liens vers les réseaux.
 * Façade : seule la miniature est chargée, le lecteur n'arrive qu'au clic.
 */
import React from "react";
import { RESEAUX, lienWhatsApp } from "../../config/contact";
import { evenement } from "../../lib/marketing";

export type Video = { id: string; titre: string };

/** Bibliothèque par thème (titres exacts de la chaîne). */
export const VIDEOS = {
  cout: [
    { id: "Q2mrtPRfB8s", titre: "شحال بصح كتكلّف تبني فيلا… ولا كاتغلط من اللول؟" },
    { id: "EHWO28GaLIo", titre: "150 مليون تكفي ؟ الحقيقة الصادمة" },
    { id: "F2VMiXeYC8Q", titre: "مشروع فيلا من 150 لـ300 مليون… فين الغلط؟" },
    { id: "jKo54pB0J1I", titre: "أخطاء خطيرة قبل البناء كتقدر تخرّجك من الميزانية" },
  ],
  contrat: [
    { id: "H61TM7maAIU", titre: "قبل ما توقع عقد البناء: التفاصيل الصغيرة اللي كتقدر تكلفك بزاف" },
  ],
  terrain: [
    { id: "BVz5IIkA0Jk", titre: "بغيتي تشري أرض؟ هاد القرار يقدر يبدل مستقبلك المالي" },
    { id: "3o2c3s1fcfs", titre: "قبل ما تبني… تأكد أن هاد البقعة قانونية وقابلة للبناء" },
  ],
  chantier: [
    { id: "GKS37QJ0lIo", titre: "من التصميم حتى الرخصة: المسار الحقيقي لرخصة البناء فالمغرب" },
    { id: "2YG7BrlzIYQ", titre: "بداية الورش والأساسات — مع المهندس المعماري ياسين الطراسي" },
    { id: "mVYle_6vfak", titre: "الرطوبة ما كتبدأش من الحيط… كتبدأ من الأساسات" },
    { id: "FxxLH1tJ1HI", titre: "ها شنو خاصني نعرف قبل ما نصايب الدروج!" },
  ],
  urbanisme: [
    { id: "DY46gpV1ukc", titre: "العمارة والقيود الإدارية" },
    { id: "HSK9On5sRHc", titre: "المدن الجديدة وتمويل المشاريع" },
    { id: "3dOvOLS-hcE", titre: "« الترخيص مرحلة… والمنهجية هي اللي كتخلق القيمة »" },
    { id: "ctUrBYCDXlE", titre: "تصميم تهيئة القنيطرة 2026 — لايف مع المعماري ياسين الطراسي" },
  ],
} satisfies Record<string, Video[]>;

/** Vidéos selon le type de projet du simulateur. */
export function videosPourProjet(type: string): Video[] {
  if (type === "IMMEUBLE" || type === "MIXTE") return [...VIDEOS.urbanisme.slice(0, 2), VIDEOS.chantier[0], VIDEOS.contrat[0]];
  if (type === "MAISON") return [VIDEOS.cout[0], VIDEOS.chantier[0], VIDEOS.chantier[1], VIDEOS.cout[3]];
  return VIDEOS.cout;
}

/**
 * Lecteur en « façade » : seule la miniature (i.ytimg.com, ~20 Ko) est chargée ;
 * le lecteur youtube-nocookie (≈ 1 Mo de JS) n'est injecté qu'au clic, puis
 * démarre directement. La page reste légère même avec plusieurs vidéos.
 */
export function LecteurYoutube({ v, className = "" }: { v: Video; className?: string }) {
  const [actif, setActif] = React.useState(false);
  return (
    <figure className={`m-0 ${className}`}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900 shadow-sm">
        {actif ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&autoplay=1`}
            title={v.titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setActif(true); evenement("video_lecture", { video: v.id }); }}
            aria-label={`Lire la vidéo : ${v.titre}`}
            className="group absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
          >
            <img
              src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              width={480}
              height={360}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-black/10 transition group-hover:bg-black/25" />
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#C9A227] text-[#0B1B3A] shadow-lg transition group-hover:scale-110">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
      </div>
      <figcaption dir="auto" className="mt-2 text-sm font-semibold leading-snug text-[#0B1B3A]">{v.titre}</figcaption>
    </figure>
  );
}

const Lecteur = LecteurYoutube;

export function VideosYoutube({ titre, videos, className = "" }: { titre: string; videos: Video[]; className?: string }) {
  if (!videos.length) return null;
  return (
    <section className={`print:hidden ${className}`} aria-label={titre}>
      <h2 className="text-2xl font-bold text-[#0B1B3A]">{titre}</h2>
      <div className={`mt-4 grid gap-5 ${videos.length > 1 ? "sm:grid-cols-2" : "max-w-xl"}`}>
        {videos.map((v) => <Lecteur key={v.id} v={v} />)}
      </div>
      <ReseauxArchitecte className="mt-4" />
    </section>
  );
}

/** Liens vers les réseaux de l'architecte et WhatsApp. */
export function ReseauxArchitecte({ className = "" }: { className?: string }) {
  const lien = "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold";
  const suivre = (reseau: string) => () => evenement("reseau_click", { reseau });
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={RESEAUX.youtube} target="_blank" rel="noopener noreferrer" onClick={suivre("youtube")} className={`${lien} border-red-200 text-red-700`} style={{ textDecoration: "none" }}>▶ YouTube</a>
      <a href={RESEAUX.facebook} target="_blank" rel="noopener noreferrer" onClick={suivre("facebook")} className={`${lien} border-blue-200 text-blue-700`} style={{ textDecoration: "none" }}>Facebook</a>
      <a href={RESEAUX.tiktok} target="_blank" rel="noopener noreferrer" onClick={suivre("tiktok")} className={`${lien} border-slate-300 text-slate-800`} style={{ textDecoration: "none" }}>TikTok</a>
      <a href={lienWhatsApp("Bonjour, je vous ai découvert sur citurbarea.com.")} target="_blank" rel="noopener noreferrer" onClick={() => evenement("whatsapp_click", { emplacement: "reseaux" })}
        className={`${lien} border-emerald-300 text-emerald-700`} style={{ textDecoration: "none" }}>WhatsApp</a>
    </div>
  );
}
