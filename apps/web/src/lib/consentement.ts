/**
 * Bandeau de consentement (cookies de mesure et de publicité).
 *
 * Affiché seulement si des balises sont configurées (lib/marketing) et tant que
 * le visiteur n'a pas choisi. Deux boutons de même poids : Accepter / Refuser
 * (exigence CNIL / RGPD pour les visiteurs européens, loi 09-08 au Maroc).
 * Le choix met à jour Google Consent Mode v2 et le pixel Meta.
 * Sans React : monté une fois au démarrage, hors back-office.
 */
import { balisesConfigurees, choixConsentement, consentementPrealable, enregistrerConsentement, type Choix } from "./marketing";

const TEXTES: Record<string, { texte: string; accepter: string; refuser: string; lien: string }> = {
  fr: {
    texte: "Nous mesurons l'audience du site et l'efficacité de nos annonces (Google, Meta) pour améliorer CITURBAREA. Aucune donnée n'est vendue.",
    accepter: "Accepter", refuser: "Refuser", lien: "En savoir plus",
  },
  en: {
    texte: "We measure site traffic and the performance of our ads (Google, Meta) to improve CITURBAREA. No data is sold.",
    accepter: "Accept", refuser: "Decline", lien: "Learn more",
  },
  ar: {
    texte: "نقيس عدد زوار الموقع وفعالية إعلاناتنا (Google وMeta) لتحسين CITURBAREA. لا نبيع أي بيانات.",
    accepter: "قبول", refuser: "رفض", lien: "اعرف المزيد",
  },
};

function langue(): string {
  const l = (document.documentElement.lang || "fr").slice(0, 2);
  return TEXTES[l] ? l : "fr";
}

export function afficherBandeauConsentement(): void {
  if (typeof document === "undefined" || !balisesConfigurees) return;
  if (window.location.pathname.startsWith("/cc") || choixConsentement()) return;
  if (document.getElementById("citurbarea-consentement")) return;
  const t = TEXTES[langue()];
  const el = document.createElement("div");
  el.id = "citurbarea-consentement";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Cookies");
  el.dir = langue() === "ar" ? "rtl" : "ltr";
  el.style.cssText = [
    "position:fixed", "left:12px", "right:12px", "bottom:12px", "z-index:2147483000", "max-width:560px", "margin:0 auto",
    "background:#fff", "color:#0B1B3A", "border:1px solid #cbd5e1", "border-radius:14px", "box-shadow:0 10px 30px rgba(11,27,58,.18)",
    "padding:14px 16px", "font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
  ].join(";");
  const p = document.createElement("p");
  p.style.margin = "0";
  p.textContent = `${t.texte} `;
  const a = document.createElement("a");
  a.href = "/confidentialite.html";
  a.textContent = t.lien;
  a.style.cssText = "color:#0B1B3A;text-decoration:underline";
  p.appendChild(a);
  const boutons = document.createElement("div");
  boutons.style.cssText = "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap";
  const bouton = (libelle: string, choix: Choix, plein: boolean) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = libelle;
    b.style.cssText = `flex:1 1 120px;min-height:44px;border-radius:10px;font-weight:600;cursor:pointer;border:1px solid #0B1B3A;${plein ? "background:#0B1B3A;color:#fff" : "background:#fff;color:#0B1B3A"}`;
    b.addEventListener("click", () => { enregistrerConsentement(choix); el.remove(); });
    return b;
  };
  // Hors Europe, le consentement est accordé par défaut : « Accepter » ferme simplement.
  boutons.append(bouton(t.refuser, "refuse", false), bouton(t.accepter, "accepte", true));
  el.append(p, boutons);
  const monter = () => document.body.appendChild(el);
  // Visiteur européen : tout de suite. Ailleurs : après le premier rendu, pour ne pas gêner la lecture.
  if (consentementPrealable()) monter(); else window.setTimeout(monter, 4000);
}
