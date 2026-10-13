/**
 * Appels vidéo sur demande — textes des notifications (FR / AR) et liens.
 *
 * Chaque destinataire reçoit SON lien personnel (/appel/<jeton>) ; les
 * boutons « Accepter / Proposer un autre créneau / Refuser » ouvrent la page
 * avec l'action présélectionnée : un GET ne modifie jamais rien (les
 * antivirus de messagerie ouvrent les liens), la décision se fait d'un clic
 * sur la page. Aucune coordonnée d'un participant n'apparaît dans les textes.
 * Heures : heure du Maroc (Africa/Casablanca) ; la page affiche aussi l'heure locale.
 */
import type { Demande, Langue, Participant } from "./appels";

export const FUSEAU = "Africa/Casablanca";

export type Evenement = "demande" | "acceptee" | "contre" | "refusee" | "annulee" | "confirmee" | "rappel";

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** « mardi 14 octobre, 10:30 » à l'heure du Maroc. */
export function dateMaroc(iso: string, langue: Langue): string {
  const d = new Date(iso);
  const loc = langue === "ar" ? "ar-MA" : "fr-FR";
  const jour = new Intl.DateTimeFormat(loc, { timeZone: FUSEAU, weekday: "long", day: "numeric", month: "long" }).format(d);
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${jour}, ${heure}`;
}

const T = {
  fr: {
    heure: "heure du Maroc",
    desQuePossible: "dès que possible",
    sujet: {
      demande: (n: string) => `${n} vous propose un appel vidéo — CITURBAREA`,
      copie: () => "Votre demande d'appel vidéo est envoyée — CITURBAREA",
      acceptee: (n: string) => `${n} a répondu à la demande d'appel vidéo`,
      contre: (n: string) => `${n} propose un autre créneau pour l'appel vidéo`,
      refusee: () => "Demande d'appel vidéo déclinée",
      annulee: () => "Appel vidéo annulé",
      confirmee: (q: string) => `Appel vidéo confirmé — ${q}`,
      rappel: (q: string) => `Rappel : appel vidéo ${q}`,
    },
    corps: {
      demande: (n: string) => `${n} souhaite échanger avec vous en appel vidéo, via CITURBAREA. Aucun appel ne démarre sans votre accord : choisissez un créneau, proposez-en un autre ou déclinez.`,
      copie: () => "Votre demande est envoyée. L'appel n'aura lieu que lorsque toutes les personnes invitées auront accepté un même créneau ; vous serez prévenu(e).",
      acceptee: (n: string) => `${n} a accepté un ou plusieurs créneaux. L'appel sera confirmé dès que tout le monde sera d'accord sur le même créneau.`,
      contre: (n: string) => `${n} propose un autre créneau. Ouvrez la demande pour l'accepter ou en proposer un autre.`,
      refusee: () => "La demande d'appel vidéo a été déclinée. Aucun appel n'aura lieu.",
      annulee: () => "L'appel vidéo a été annulé. Aucun appel n'aura lieu.",
      confirmee: () => "Tout le monde a accepté : l'appel vidéo est confirmé. La salle ouvre 10 minutes avant, depuis le lien ci-dessous (sans mot de passe, ne le transférez pas).",
      rappel: () => "Votre appel vidéo commence bientôt. Rejoignez-le depuis le lien ci-dessous (sans mot de passe, ne le transférez pas).",
    },
    creneaux: "Créneaux proposés",
    message: "Message",
    accepter: "Accepter un créneau",
    proposer: "Proposer un autre créneau",
    refuser: "Refuser",
    ouvrir: "Ouvrir la demande",
    rejoindre: "Rejoindre l'appel",
    pied: "Lien personnel : il donne accès à cette demande seulement. CITURBAREA — architecte inscrit à l'Ordre.",
    salutation: (n: string) => `Bonjour ${n},`,
  },
  ar: {
    heure: "بتوقيت المغرب",
    desQuePossible: "في أقرب وقت",
    sujet: {
      demande: (n: string) => `${n} يقترح عليك مكالمة فيديو — CITURBAREA`,
      copie: () => "تم إرسال طلب مكالمة الفيديو — CITURBAREA",
      acceptee: (n: string) => `${n} ردّ على طلب مكالمة الفيديو`,
      contre: (n: string) => `${n} يقترح موعدًا آخر لمكالمة الفيديو`,
      refusee: () => "تم رفض طلب مكالمة الفيديو",
      annulee: () => "تم إلغاء مكالمة الفيديو",
      confirmee: (q: string) => `تم تأكيد مكالمة الفيديو — ${q}`,
      rappel: (q: string) => `تذكير: مكالمة فيديو ${q}`,
    },
    corps: {
      demande: (n: string) => `${n} يرغب في التحدث معك عبر مكالمة فيديو على CITURBAREA. لن تبدأ أي مكالمة دون موافقتك: اختر موعدًا أو اقترح موعدًا آخر أو اعتذر.`,
      copie: () => "تم إرسال طلبك. لن تتم المكالمة إلا بعد أن يوافق جميع المدعوين على نفس الموعد، وسنخبرك بذلك.",
      acceptee: (n: string) => `${n} وافق على موعد أو أكثر. سيتم تأكيد المكالمة عندما يتفق الجميع على نفس الموعد.`,
      contre: (n: string) => `${n} يقترح موعدًا آخر. افتح الطلب لقبوله أو لاقتراح موعد آخر.`,
      refusee: () => "تم رفض طلب مكالمة الفيديو. لن تتم أي مكالمة.",
      annulee: () => "تم إلغاء مكالمة الفيديو. لن تتم أي مكالمة.",
      confirmee: () => "وافق الجميع: تم تأكيد مكالمة الفيديو. تُفتح القاعة قبل 10 دقائق من الرابط أدناه (بدون كلمة مرور، لا تشاركه).",
      rappel: () => "تبدأ مكالمة الفيديو قريبًا. انضم إليها من الرابط أدناه (بدون كلمة مرور، لا تشاركه).",
    },
    creneaux: "المواعيد المقترحة",
    message: "الرسالة",
    accepter: "قبول موعد",
    proposer: "اقتراح موعد آخر",
    refuser: "اعتذار",
    ouvrir: "فتح الطلب",
    rejoindre: "الانضمام إلى المكالمة",
    pied: "رابط شخصي: يتيح الوصول إلى هذا الطلب فقط. CITURBAREA — مهندس معماري مسجل في الهيئة.",
    salutation: (n: string) => `مرحبًا ${n}،`,
  },
} as const;

export const lienPersonnel = (origine: string, jeton: string, langue: Langue, action?: "accepter" | "contre" | "refuser") =>
  `${origine}${langue === "ar" ? "/ar" : ""}/appel/${jeton}${action ? `?action=${action}` : ""}`;

/** Numéro au format wa.me (chiffres, indicatif 212 pour un 0X marocain). */
export function numeroWhatsApp(tel: string | null): string | null {
  if (!tel) return null;
  const c = tel.replace(/[^\d+]/g, "");
  if (/^0[5-7]\d{8}$/.test(c)) return `212${c.slice(1)}`;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(c)) return c.replace(/^\+|^00/, "");
  return null;
}

export const lienWhatsApp = (tel: string | null, texte: string) => {
  const n = numeroWhatsApp(tel);
  return `https://wa.me/${n ?? ""}?text=${encodeURIComponent(texte)}`;
};

export type Message = { subject: string; text: string; html: string };

/**
 * Message pour UN destinataire. `acteur` : participant à l'origine de
 * l'événement (son nom seulement). `copie` : accusé au demandeur.
 */
export function composer(ev: Evenement, d: Demande, dest: Participant, acteur: Participant | null, lien: string, copie = false): Message {
  const t = T[dest.langue];
  const n = acteur?.nom ?? "CITURBAREA";
  const quand = d.creneauRetenu ? `${dateMaroc(d.creneauRetenu, dest.langue)} (${t.heure})` : "";
  const sujet = copie ? t.sujet.copie() : ev === "confirmee" || ev === "rappel" ? t.sujet[ev](quand) : (t.sujet[ev] as (x: string) => string)(n);
  const corps = copie ? t.corps.copie() : (t.corps[ev] as (x: string) => string)(n);
  const creneaux = d.desQuePossible && !d.creneaux.length ? [t.desQuePossible] : d.creneaux.map((c) => `${dateMaroc(c, dest.langue)} (${t.heure})`);
  const repondre = ev === "demande" || ev === "contre" || ev === "acceptee";
  const lignes = [
    t.salutation(dest.nom), "", corps, "",
    ...(quand ? [quand, ""] : []),
    ...(repondre && !copie ? [`${t.creneaux} :`, ...creneaux.map((c) => `• ${c}`), ""] : []),
    ...(d.message && ev === "demande" ? [`${t.message} : ${d.message}`, ""] : []),
    ...(repondre && !copie
      ? [`${t.accepter} : ${lien}?action=accepter`, `${t.proposer} : ${lien}?action=contre`, `${t.refuser} : ${lien}?action=refuser`]
      : [`${ev === "confirmee" || ev === "rappel" ? t.rejoindre : t.ouvrir} : ${lien}`]),
    "", t.pied,
  ];
  const dir = dest.langue === "ar" ? "rtl" : "ltr";
  const bouton = (href: string, libelle: string, fort: boolean) =>
    `<a href="${echapper(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 16px;border-radius:8px;font-weight:bold;text-decoration:none;${fort ? "background:#C9A227;color:#0B1B3A" : "background:#fff;color:#0B1B3A;border:1px solid #0B1B3A"}">${echapper(libelle)}</a>`;
  const html = `<div dir="${dir}" style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#0B1B3A">
<p>${echapper(t.salutation(dest.nom))}</p><p>${echapper(corps)}</p>
${quand ? `<p><strong>${echapper(quand)}</strong></p>` : ""}
${repondre && !copie ? `<p>${echapper(t.creneaux)} :</p><ul>${creneaux.map((c) => `<li>${echapper(c)}</li>`).join("")}</ul>` : ""}
${d.message && ev === "demande" ? `<p><em>${echapper(d.message)}</em></p>` : ""}
<p>${repondre && !copie
    ? bouton(`${lien}?action=accepter`, t.accepter, true) + bouton(`${lien}?action=contre`, t.proposer, false) + bouton(`${lien}?action=refuser`, t.refuser, false)
    : bouton(lien, ev === "confirmee" || ev === "rappel" ? t.rejoindre : t.ouvrir, true)}</p>
<p style="font-size:12px;color:#475569">${echapper(t.pied)}</p></div>`;
  return { subject: sujet, text: lignes.join("\n"), html };
}

/** Texte court pour WhatsApp (envoyé par le cabinet depuis le back-office). */
export function texteWhatsApp(d: Demande, dest: Participant, lien: string): string {
  const t = T[dest.langue];
  const s = statutLisible(d);
  if (s === "confirmee" && d.creneauRetenu) return `${t.salutation(dest.nom)} ${t.sujet.confirmee(`${dateMaroc(d.creneauRetenu, dest.langue)} (${t.heure})`)}. ${t.rejoindre} : ${lien}`;
  return `${t.salutation(dest.nom)} ${t.corps.demande("CITURBAREA")} ${t.ouvrir} : ${lien}`;
}

const statutLisible = (d: Demande) => (d.statut === "CONFIRMEE" ? "confirmee" : "attente");
