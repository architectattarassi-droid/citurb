/**
 * Avertissement AVANT envoi (décision du fondateur) : si le texte saisi
 * contient un numéro, un e-mail, un lien ou un pseudo de messagerie — même
 * écrit en lettres —, on prévient tout de suite qu'il sera masqué et signalé.
 * Même moteur que le serveur (functions/_lib/coordonnees.ts).
 */
import { detecterCoordonnees } from "../../../../../functions/_lib/coordonnees";
import type { LangueAppel } from "../appels/textes";

const T = {
  fr: {
    alerte: "Ce texte contient des coordonnées (numéro, e-mail, lien ou réseau) : elles seront masquées et la tentative signalée à la modération. Tout passe par CITURBAREA : pour vous parler, utilisez « Demander un appel vidéo ».",
    rappel: "Pas de coordonnées : elles sont masquées et signalées. Utilisez l'appel vidéo pour vous parler.",
  },
  ar: {
    alerte: "يحتوي هذا النص على معلومات اتصال (رقم أو بريد أو رابط أو حساب): ستُخفى ويُبلَّغ عن المحاولة للإدارة. كل شيء يمر عبر CITURBAREA: للتحدث، استعمل « طلب مكالمة فيديو ».",
    rappel: "لا معلومات اتصال: تُخفى ويُبلَّغ عنها. استعمل مكالمة الفيديو للتحدث.",
  },
};

export default function AvertissementCoordonnees({ texte, l, discret = false }: { texte: string; l: LangueAppel; discret?: boolean }) {
  const detecte = !!texte && detecterCoordonnees(texte).length > 0;
  if (detecte) return <p className="m-0 mt-1 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-semibold text-rose-900" role="alert">⚠ {T[l].alerte}</p>;
  if (discret) return null;
  return <p className="m-0 mt-1 text-xs text-slate-500">{T[l].rappel}</p>;
}
