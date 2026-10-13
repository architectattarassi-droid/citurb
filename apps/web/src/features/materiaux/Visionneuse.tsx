/**
 * Visionneuse d'images (galeries des produits fournisseurs) : plein écran,
 * glisser pour changer d'image (sens inversé en arabe), appui ou clic pour
 * zoomer (puis glisser pour déplacer), vignettes, légendes FR/AR,
 * clavier (← → Échap), chargement paresseux.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Lang } from "../../i18n/i18n";
import { texteLocal } from "./catalogueProduits";
import type { ImageProduit } from "./fournisseursCatalogue";

export default function Visionneuse({ images, depart = 0, titre, lang, fermer }: {
  images: ImageProduit[]; depart?: number; titre: string; lang: Lang; fermer: () => void;
}) {
  const [i, setI] = useState(Math.min(depart, images.length - 1));
  const [zoom, setZoom] = useState(false);
  const [decalage, setDecalage] = useState({ x: 0, y: 0 });
  const toucher = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rtl = lang === "ar";
  const aller = (d: number) => { setZoom(false); setDecalage({ x: 0, y: 0 }); setI((x) => (x + d + images.length) % images.length); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight") aller(rtl ? -1 : 1);
      else if (e.key === "ArrowLeft") aller(rtl ? 1 : -1);
    };
    document.addEventListener("keydown", k);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ancien; };
  }, [rtl]); // eslint-disable-line react-hooks/exhaustive-deps

  const img = images[i];
  if (!img) return null;
  const legende = img.legende ? texteLocal(img.legende, lang) : "";

  return (
    <div role="dialog" aria-modal="true" aria-label={titre} className="fixed inset-0 flex flex-col bg-black/95 text-white" style={{ zIndex: 2100 }}>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="min-w-0 truncate text-sm">{titre} · {i + 1}/{images.length}</p>
        <button type="button" onClick={fermer} className="min-h-[44px] rounded-lg bg-white/10 px-4 text-sm font-semibold">✕</button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={(e) => { const t = e.touches[0]; toucher.current = { x: t.clientX, y: t.clientY }; }}
        onTouchMove={(e) => {
          if (!zoom) return;
          const t = e.touches[0];
          setDecalage((d) => ({ x: d.x + (t.clientX - toucher.current.x), y: d.y + (t.clientY - toucher.current.y) }));
          toucher.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          const dx = t.clientX - toucher.current.x;
          if (!zoom && Math.abs(dx) > 40 && images.length > 1) aller((dx < 0) !== rtl ? 1 : -1);
        }}>
        <img src={img.url} alt={legende || titre} onClick={() => { setZoom((z) => !z); setDecalage({ x: 0, y: 0 }); }}
          className="max-h-full max-w-full select-none object-contain transition-transform"
          style={{ transform: zoom ? `translate(${decalage.x}px, ${decalage.y}px) scale(2)` : "none", cursor: zoom ? "zoom-out" : "zoom-in", touchAction: zoom ? "none" : "pan-y" }}
          draggable={false} />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="‹" onClick={() => aller(-1)} className="absolute top-1/2 hidden min-h-[48px] -translate-y-1/2 rounded-full bg-white/15 px-4 text-2xl sm:block" style={{ insetInlineStart: 12 }}>{rtl ? "›" : "‹"}</button>
            <button type="button" aria-label="›" onClick={() => aller(1)} className="absolute top-1/2 hidden min-h-[48px] -translate-y-1/2 rounded-full bg-white/15 px-4 text-2xl sm:block" style={{ insetInlineEnd: 12 }}>{rtl ? "‹" : "›"}</button>
          </>
        )}
      </div>
      {legende && <p className="px-4 pb-2 text-center text-sm text-white/90">{legende}</p>}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((x, k) => (
            <button key={x.url} type="button" onClick={() => { setI(k); setZoom(false); }} aria-label={`${k + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded ${k === i ? "ring-2 ring-[#C9A227]" : "opacity-70"}`}>
              <img src={x.vignette || x.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
