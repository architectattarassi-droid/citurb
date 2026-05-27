/**
 * WhatsAppCTA.tsx
 *
 * Bouton flottant WhatsApp (FAB) qui ouvre wa.me avec un message
 * contextualisé à la page courante.
 *
 * Numéro : `import.meta.env.VITE_WHATSAPP_NUMBER` (format +212XXXXXXXXX),
 * fallback `+212600000000`.
 *
 * Position fixed bas-droite (br) ; en RTL (arabe) → bas-gauche (bl)
 * pour rester ergonomique.
 *
 * Accessibilité : `aria-label` traduit, focus visible, kbd Esc minimise.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useT, useLang } from "../../i18n/i18n";

export interface WhatsAppCTAProps {
  /** Numéro override (sinon ENV ou fallback). */
  phone?: string;
  /** Message custom (sinon généré depuis la page courante). */
  message?: string;
  /** Force la couleur (déconseillé — vert brand WA par défaut). */
  className?: string;
  /** Cache à l'impression. Défaut : true. */
  hideOnPrint?: boolean;
}

const DEFAULT_PHONE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_WHATSAPP_NUMBER) ||
  "+212600000000";

const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.449L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const buildMessage = (pathname: string, t: ReturnType<typeof useT>): string => {
  const ctx = (() => {
    if (!pathname) return t("lead.wa.ctx.generic");
    if (pathname.includes("p1") || pathname.includes("particulier"))
      return t("lead.wa.ctx.p1");
    if (pathname.includes("p2") || pathname.includes("promoteur"))
      return t("lead.wa.ctx.p2");
    if (pathname.includes("p3")) return t("lead.wa.ctx.p3");
    if (pathname.includes("p4") || pathname.includes("foncier"))
      return t("lead.wa.ctx.p4");
    if (pathname.includes("p5") || pathname.includes("rapport"))
      return t("lead.wa.ctx.p5");
    if (pathname.includes("p6") || pathname.includes("prestataire"))
      return t("lead.wa.ctx.p6");
    if (pathname.includes("calculateur")) return t("lead.wa.ctx.calc");
    return t("lead.wa.ctx.generic");
  })();
  return `${t("lead.wa.hello")} ${ctx}`;
};

const WhatsAppCTA: React.FC<WhatsAppCTAProps> = ({
  phone,
  message,
  className,
  hideOnPrint = true,
}) => {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const number = (phone || DEFAULT_PHONE).replace(/[^\d]/g, "");
  const text = encodeURIComponent(message || buildMessage(pathname, t));
  const href = `https://wa.me/${number}?text=${text}`;

  const sideClass = useMemo(
    () => (lang === "ar" ? "left-4 sm:left-6" : "right-4 sm:right-6"),
    [lang],
  );

  const openClick = useCallback(() => {
    setOpen(true);
    // Analytics hook (no-op si non installé)
    try {
      (window as any).dataLayer?.push?.({
        event: "wa_cta_click",
        page: pathname,
      });
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return (
    <>
      {/* Tooltip teaser au survol — discret */}
      {open && (
        <div
          className={
            `fixed bottom-24 ${sideClass} z-50 max-w-[260px] rounded-lg bg-white p-3 shadow-xl ring-1 ring-slate-200` +
            (hideOnPrint ? " print:hidden" : "")
          }
          role="dialog"
          aria-label={t("lead.wa.dialog")}
        >
          <p className="text-sm text-slate-700">{t("lead.wa.teaser")}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <WhatsAppIcon size={18} />
            {t("lead.wa.open")}
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 w-full text-xs text-slate-500 hover:text-slate-700"
            aria-label={t("common.cancel")}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openClick}
        onContextMenu={(e) => {
          e.preventDefault();
          openClick();
        }}
        aria-label={t("lead.wa.cta")}
        className={
          `fixed bottom-4 ${sideClass} z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-600/40 transition hover:scale-105 hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300 sm:h-16 sm:w-16` +
          (hideOnPrint ? " print:hidden" : "") +
          (className ? " " + className : "")
        }
      >
        <WhatsAppIcon />
        <span className="sr-only">{t("lead.wa.cta")}</span>
      </a>
    </>
  );
};

export default WhatsAppCTA;
