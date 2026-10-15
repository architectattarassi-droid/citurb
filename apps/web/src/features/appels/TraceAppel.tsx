/**
 * Trace d'un appel vidéo, vue par un participant :
 *   - enregistrement : information (finalité, durée de conservation, droits —
 *     loi 09-08), consentement explicite de chacun, retrait possible à tout
 *     moment ; autorisé seulement si TOUS ont accepté ;
 *   - journal : entrées en salle, arrivées / départs, durée réelle ;
 *   - compte rendu écrit après l'appel, validé ou contesté par les autres.
 */
import { useState } from "react";
import AvertissementCoordonnees from "../messages/AvertissementCoordonnees";
import { apiAppels, type DemandeVue, type Espace } from "./api";
import { BTN_CONTOUR, BTN_NAVY, CHAMP } from "./DemanderAppelVideo";
import { dateHeure } from "./heures";
import { erreurLisible, TEXTES, type LangueAppel } from "./textes";

const T = {
  fr: {
    titreEnr: "Enregistrement de l'appel (facultatif)",
    info: (f: string, m: number) => `L'appel n'est enregistré que si TOUTES les personnes l'acceptent. Finalité : ${f}. Conservation : ${m} mois, puis suppression ; accessible aux seuls participants et à CITURBAREA. Vous pouvez retirer votre accord à tout moment, même pendant l'appel (bouton d'arrêt). Loi 09-08 : droit d'accès, de rectification et d'opposition auprès de CITURBAREA.`,
    accepter: "J'accepte l'enregistrement", retirer: "Je retire mon accord", attente: "en attente", oui: "accepte", non: "refuse",
    autorise: "● Tous ont accepté : l'enregistrement est possible dans la salle (chacun peut l'arrêter).", pasAutorise: "Pas d'enregistrement tant que chacun n'a pas accepté.",
    statutEnr: { EN_COURS: "Enregistrement en cours", TERMINE: "Enregistrement terminé, en cours de récupération", CONSERVE: "Enregistrement conservé dans les documents de l'appel", NON_CONSERVE: "Enregistrement non conservé" } as Record<string, string>,
    journal: "Journal de l'appel", entree: "entrée en salle", duree: (n: number) => `Durée réelle : ${n} min`,
    evts: { PARTICIPANT_JOINED: "arrivée", PARTICIPANT_LEFT: "départ", ROOM_CREATED: "ouverture de la salle", ROOM_DESTROYED: "fin de l'appel", RECORDING_STARTED: "début d'enregistrement", RECORDING_ENDED: "fin d'enregistrement", RECORDING_UPLOADED: "enregistrement disponible" } as Record<string, string>,
    cr: "Compte rendu", crAide: "Après l'appel, un participant rédige les décisions prises ; les autres le valident ou le contestent. Pas de coordonnées : elles sont masquées.",
    proposer: "Proposer le compte rendu", remplacer: "Proposer une nouvelle version", par: "par",
    statutCr: { PROPOSE: "En attente de validation", VALIDE: "Validé par tous", CONTESTE: "Contesté" } as Record<string, string>,
    daccord: "Je valide", pasDaccord: "Je conteste", remarque: "Votre remarque (obligatoire pour contester)",
  },
  ar: {
    titreEnr: "تسجيل المكالمة (اختياري)",
    info: (f: string, m: number) => `لا تُسجَّل المكالمة إلا إذا وافق عليها الجميع. الغاية: الاحتفاظ بأثر أمين للقرارات المتخذة. مدة الحفظ: ${m} شهرًا ثم الحذف؛ متاحة للمشاركين و CITURBAREA فقط. يمكنك سحب موافقتك في أي وقت حتى أثناء المكالمة. القانون 09-08: حق الولوج والتصحيح والتعرض لدى CITURBAREA.${f ? "" : ""}`,
    accepter: "أوافق على التسجيل", retirer: "أسحب موافقتي", attente: "في الانتظار", oui: "موافق", non: "رافض",
    autorise: "● وافق الجميع: يمكن التسجيل في القاعة (ويمكن لكل واحد إيقافه).", pasAutorise: "لا تسجيل ما لم يوافق الجميع.",
    statutEnr: { EN_COURS: "التسجيل جارٍ", TERMINE: "انتهى التسجيل، جارٍ استرجاعه", CONSERVE: "التسجيل محفوظ في وثائق المكالمة", NON_CONSERVE: "لم يُحفظ التسجيل" } as Record<string, string>,
    journal: "سجل المكالمة", entree: "دخول القاعة", duree: (n: number) => `المدة الفعلية: ${n} دقيقة`,
    evts: { PARTICIPANT_JOINED: "وصول", PARTICIPANT_LEFT: "مغادرة", ROOM_CREATED: "فتح القاعة", ROOM_DESTROYED: "نهاية المكالمة", RECORDING_STARTED: "بداية التسجيل", RECORDING_ENDED: "نهاية التسجيل", RECORDING_UPLOADED: "التسجيل متاح" } as Record<string, string>,
    cr: "المحضر", crAide: "بعد المكالمة، يكتب أحد المشاركين القرارات المتخذة؛ ويصادق عليها الآخرون أو يعترضون. لا معلومات اتصال: تُخفى.",
    proposer: "اقتراح المحضر", remplacer: "اقتراح نسخة جديدة", par: "من طرف",
    statutCr: { PROPOSE: "في انتظار المصادقة", VALIDE: "صادق عليه الجميع", CONTESTE: "محل اعتراض" } as Record<string, string>,
    daccord: "أصادق", pasDaccord: "أعترض", remarque: "ملاحظتك (إلزامية للاعتراض)",
  },
} as const;

export default function TraceAppel({ d, espace, l, onMaj }: { d: DemandeVue; espace: Espace; l: LangueAppel; onMaj: (d: DemandeVue) => void }) {
  const t = T[l];
  const te = TEXTES[l];
  const tr = d.trace;
  const [texte, setTexte] = useState("");
  const [remarque, setRemarque] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  if (!tr || !d.moi) return null;
  const moi = d.moi.id;
  const monConsentement = tr.consentements.find((c) => c.participantId === moi)?.accepte ?? null;
  const ouvert = d.statut === "EN_ATTENTE" || d.statut === "CONFIRMEE";
  const appelTenu = (d.statut === "CONFIRMEE" || d.statut === "TERMINEE") && !!d.creneauRetenu && Date.now() >= Date.parse(d.creneauRetenu) - 10 * 60_000;
  const cr = tr.compteRendu;
  const jeSuisAuteur = cr?.auteurId === moi;
  const monAvis = cr?.avis.find((a) => a.participantId === moi);

  const faire = async (f: () => ReturnType<typeof apiAppels.enregistrement>) => {
    setOccupe(true); setErreur(null);
    const r = await f();
    setOccupe(false);
    if (!r.ok) { setErreur(te.erreurs[r.error] || erreurLisible(te, r.error)); return false; }
    onMaj(r.data.demande);
    return true;
  };

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="m-0 mb-1 text-sm font-bold">{t.titreEnr}</h3>
        <p className="m-0 text-xs leading-relaxed text-slate-600">{t.info(tr.finalite, tr.conservationMois)}</p>
        <ul className="m-0 mt-2 grid list-none gap-1 p-0 text-sm">
          {tr.consentements.map((c) => (
            <li key={c.participantId}>{c.nom} : <strong className={c.accepte ? "text-emerald-800" : c.accepte === false ? "text-rose-800" : "text-slate-500"}>{c.accepte ? t.oui : c.accepte === false ? t.non : t.attente}</strong></li>
          ))}
        </ul>
        <p className={`m-0 mt-2 text-sm font-semibold ${tr.enregistrementAutorise ? "text-rose-800" : "text-slate-600"}`}>{tr.enregistrementAutorise ? t.autorise : t.pasAutorise}</p>
        {tr.enregistrement.statut !== "AUCUN" && <p className="m-0 mt-1 text-sm">{t.statutEnr[tr.enregistrement.statut]}{tr.enregistrement.motif ? ` — ${tr.enregistrement.motif}` : ""}</p>}
        {ouvert && (
          <div className="mt-2 flex flex-wrap gap-2">
            {monConsentement !== true && <button type="button" className={BTN_NAVY} disabled={occupe} onClick={() => void faire(() => apiAppels.enregistrement(espace, d.id, true))}>{t.accepter}</button>}
            {monConsentement === true && <button type="button" className={BTN_CONTOUR} disabled={occupe} onClick={() => void faire(() => apiAppels.enregistrement(espace, d.id, false))}>{t.retirer}</button>}
          </div>
        )}
      </section>

      {(tr.entrees.length > 0 || tr.evenements.length > 0) && (
        <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold">{t.journal}{tr.duree.minutes != null ? ` · ${t.duree(tr.duree.minutes)}` : ""}</summary>
          <ol className="m-0 mt-2 grid gap-1 ps-5 text-xs text-slate-700">
            {[...tr.entrees.map((e) => ({ le: e.le, txt: `${e.nom} — ${t.entree}` })), ...tr.evenements.map((e) => ({ le: e.le, txt: `${t.evts[e.type] || e.type}${e.nom ? ` — ${e.nom}` : ""}` }))]
              .sort((a, b) => a.le.localeCompare(b.le)).map((x, i) => <li key={i}><span dir="ltr">{dateHeure(x.le, l)}</span> · {x.txt}</li>)}
          </ol>
        </details>
      )}

      {appelTenu && (
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="m-0 mb-1 text-sm font-bold">{t.cr}{cr ? ` · ${t.statutCr[cr.statut]}` : ""}</h3>
          <p className="m-0 text-xs text-slate-600">{t.crAide}</p>
          {cr && (
            <div className="mt-2 rounded-lg bg-slate-50 p-3">
              <p className="m-0 whitespace-pre-wrap text-sm" dir="auto">{cr.texte}</p>
              <p className="m-0 mt-1 text-xs text-slate-500">{t.par} {cr.auteur} · <span dir="ltr">{dateHeure(cr.le, l)}</span></p>
              {cr.avis.map((a) => <p key={a.participantId} className="m-0 mt-1 text-xs">{a.nom} : {a.accord ? "✓" : "✗"}{a.remarque ? ` — ${a.remarque}` : ""}</p>)}
            </div>
          )}
          {cr && !jeSuisAuteur && !monAvis?.accord && (
            <div className="mt-2 grid gap-2">
              <input className={CHAMP} value={remarque} maxLength={1000} placeholder={t.remarque} onChange={(e) => setRemarque(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN_NAVY} disabled={occupe} onClick={() => void faire(() => apiAppels.avis(espace, d.id, true, remarque || undefined))}>{t.daccord}</button>
                <button type="button" className={BTN_CONTOUR} disabled={occupe || !remarque.trim()} onClick={() => void faire(() => apiAppels.avis(espace, d.id, false, remarque))}>{t.pasDaccord}</button>
              </div>
            </div>
          )}
          {(!cr || jeSuisAuteur || cr.statut === "CONTESTE") && (
            <div className="mt-2 grid gap-2">
              <textarea className={`${CHAMP} min-h-[100px] py-2`} maxLength={8000} value={texte} onChange={(e) => setTexte(e.target.value)} />
              <AvertissementCoordonnees texte={texte} l={l} discret />
              <button type="button" className={`${BTN_NAVY} justify-self-start`} disabled={occupe || texte.trim().length < 10}
                onClick={async () => { if (await faire(() => apiAppels.compteRendu(espace, d.id, texte))) setTexte(""); }}>{cr ? t.remplacer : t.proposer}</button>
            </div>
          )}
        </section>
      )}
      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
    </div>
  );
}
