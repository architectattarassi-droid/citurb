/**
 * <DepotDocuments porte contexte objetId /> — documents et images déposés sur
 * la plateforme (pas envoyés « en message ») : liste avec versions, statut
 * (en vérification / visible / refusé), qui a déposé et quand ; envoi avec
 * progression (morceaux de 20 Mo pour les vidéos sur R2) ; métadonnées
 * libres (phase, catégorie, niveau, version, légende). Les photos sont
 * réduites dans le navigateur ; les plans gardent leur fichier d'origine.
 * Contrat : docs/architecture/contrat-depot-fichiers.md.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BTN_CONTOUR, BTN_NAVY, CHAMP } from "../appels/DemanderAppelVideo";
import { dateHeure } from "../appels/heures";
import type { LangueAppel } from "../appels/textes";
import { preparerImage } from "../fournisseurs/imagesNavigateur";
import AvertissementCoordonnees from "../messages/AvertissementCoordonnees";
import { apiDepot, ouvrirDocument, type ContexteDepot, type DocumentVue, type MetaDocument, type PorteDepot } from "./api";

const T = {
  fr: {
    titre: "Documents", aide: "Plans, photos, PDF déposés sur CITURBAREA : tout reste enregistré (versions, auteur, date).",
    deposer: "Déposer un document", choisir: "Choisir un fichier", envoi: "Envoi…", ouvrir: "Ouvrir", supprimer: "Supprimer", confirmer: "Supprimer ce document ? (il reste archivé)",
    rien: "Aucun document pour l'instant.", chargement: "Chargement…", photo: "Photo : réduire avant l'envoi (recommandé)",
    phase: "Phase", categorie: "Catégorie", niveau: "Niveau", version: "Version", legende: "Légende (facultatif)",
    statut: { A_MODERER: "En vérification", VISIBLE: "Visible", REFUSE: "Refusé", SUPPRIME: "Supprimé", PRIVE: "Pièce du dossier" } as Record<string, string>,
    moderation: "Visible des autres participants après vérification par CITURBAREA (un numéro écrit dans une image ou un PDF n'est pas détecté automatiquement).",
    types: "Images (JPEG, PNG, WebP), PDF ; vidéos quand le stockage étendu est activé.",
    v: (n: number) => `v${n}`, par: "par",
    erreurs: {
      type_refuse: "Type de fichier refusé.", extension_incoherente: "L'extension ne correspond pas au type du fichier.", type_incoherent: "Le contenu du fichier ne correspond pas à son type.",
      fichier_trop_lourd: "Fichier trop lourd.", video_r2_requis: "Les vidéos nécessitent le stockage étendu, pas encore activé.", pdf_contenu_actif: "PDF refusé : il contient du code ou un fichier joint.",
      quota_contexte: "Le nombre ou le volume de documents maximal est atteint ici.", stockage_plein: "Le stockage de la plateforme est plein : prévenez CITURBAREA.",
      trop_de_depots: "Trop de dépôts aujourd'hui : réessayez demain.", interdit: "Vous n'avez pas accès à ces documents.", depot_indisponible: "Le dépôt de documents n'est pas encore ouvert.",
      image_illisible: "Image illisible.", image_trop_grande: "Image trop grande.", reseau: "Connexion impossible.", defaut: "Une erreur est survenue.",
    } as Record<string, string>,
  },
  ar: {
    titre: "الوثائق", aide: "مخططات وصور وملفات PDF مودعة على CITURBAREA: يُحفظ كل شيء (النسخ، المودِع، التاريخ).",
    deposer: "إيداع وثيقة", choisir: "اختيار ملف", envoi: "جارٍ الإرسال…", ouvrir: "فتح", supprimer: "حذف", confirmer: "حذف هذه الوثيقة؟ (تبقى مؤرشفة)",
    rien: "لا توجد وثائق حاليًا.", chargement: "جارٍ التحميل…", photo: "صورة: تصغيرها قبل الإرسال (موصى به)",
    phase: "المرحلة", categorie: "الصنف", niveau: "الطابق", version: "النسخة", legende: "وصف (اختياري)",
    statut: { A_MODERER: "قيد التحقق", VISIBLE: "مرئية", REFUSE: "مرفوضة", SUPPRIME: "محذوفة", PRIVE: "وثيقة الملف" } as Record<string, string>,
    moderation: "تظهر للمشاركين الآخرين بعد تحقق CITURBAREA (لا يُكتشف تلقائيًا رقم مكتوب داخل صورة أو PDF).",
    types: "صور (JPEG، PNG، WebP)، PDF؛ فيديوهات عند تفعيل التخزين الموسع.",
    v: (n: number) => `ن${n}`, par: "من طرف",
    erreurs: {
      type_refuse: "نوع ملف مرفوض.", extension_incoherente: "الامتداد لا يطابق نوع الملف.", type_incoherent: "محتوى الملف لا يطابق نوعه.",
      fichier_trop_lourd: "الملف ثقيل جدًا.", video_r2_requis: "الفيديوهات تتطلب التخزين الموسع غير المفعّل بعد.", pdf_contenu_actif: "PDF مرفوض: يحتوي على شفرة أو ملف مرفق.",
      quota_contexte: "تم بلوغ الحد الأقصى للوثائق هنا.", stockage_plein: "التخزين ممتلئ: أخبر CITURBAREA.", trop_de_depots: "إيداعات كثيرة اليوم: أعد المحاولة غدًا.",
      interdit: "لا يمكنك الوصول إلى هذه الوثائق.", depot_indisponible: "إيداع الوثائق غير متاح بعد.", image_illisible: "صورة غير مقروءة.", image_trop_grande: "صورة كبيرة جدًا.",
      reseau: "تعذر الاتصال.", defaut: "حدث خطأ.",
    } as Record<string, string>,
  },
};

const PHASES = ["", "ESQ", "APS", "APD", "PC", "DCE", "EXE", "CHANTIER", "RECEPTION"];
const CATEGORIES = ["", "plan-niveau", "coupe", "facade", "vue-3d", "detail", "video", "photo-chantier", "piece-administrative", "devis", "autre"];
const LIB_CAT: Record<string, string> = { "plan-niveau": "Plan d'étage", coupe: "Coupe", facade: "Façade", "vue-3d": "Vue 3D", detail: "Détail", video: "Vidéo", "photo-chantier": "Photo de chantier", "piece-administrative": "Pièce administrative", devis: "Devis", autre: "Autre" };
const taille = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);
const b64VersBlob = (b64: string) => { const s = atob(b64); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return new Blob([o], { type: o[0] === 0x52 ? "image/webp" : "image/jpeg" }); };

type Props = {
  porte: PorteDepot; contexte: ContexteDepot; objetId: string; l: LangueAppel;
  /** Champs de classement proposés (pièces graphiques d'un projet). */
  classement?: boolean;
  titre?: string | null;
  onDepose?: (d: DocumentVue) => void;
  /** Mode pièce jointe (messagerie) : envoi seul, sans liste. */
  compact?: boolean;
};

export default function DepotDocuments({ porte, contexte, objetId, l, classement = false, titre, onDepose, compact = false }: Props) {
  const t = T[l];
  const [docs, setDocs] = useState<DocumentVue[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [reduire, setReduire] = useState(true);
  const [meta, setMeta] = useState<MetaDocument>({});
  const [progres, setProgres] = useState<number | null>(null);
  const entree = useRef<HTMLInputElement>(null);
  const cle = JSON.stringify(porte);
  const admin = porte.type === "admin";

  const charger = useCallback(async () => {
    if (compact) return;
    const r = await apiDepot.lister(JSON.parse(cle) as PorteDepot, contexte, objetId);
    if (!r.ok) { setErreur(t.erreurs[r.error] || t.erreurs.defaut); return; }
    setErreur(null); setDocs(r.data.documents);
  }, [cle, contexte, objetId, compact, l]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void charger(); }, [charger]);

  const envoyer = async () => {
    if (!fichier) return;
    setErreur(null); setProgres(0);
    let corps: Blob = fichier, vignette: Blob | null = null, nom = fichier.name, type = fichier.type;
    try {
      if (reduire && /^image\/(jpeg|webp)$/.test(fichier.type)) {
        const p = await preparerImage(fichier);
        corps = b64VersBlob(p.image); vignette = b64VersBlob(p.vignette);
        type = corps.type; nom = nom.replace(/\.[a-z0-9]+$/i, "") + (type === "image/webp" ? ".webp" : ".jpg");
      }
    } catch { /* image gardée telle quelle */ }
    const r = await apiDepot.televerser(porte, { contexte, objetId, nom, type, octets: corps, vignette, meta }, setProgres);
    setProgres(null);
    if (!r.ok) { setErreur(t.erreurs[r.error] || t.erreurs.defaut); return; }
    setFichier(null); setMeta({});
    if (entree.current) entree.current.value = "";
    onDepose?.(r.data.document);
    await charger();
  };

  const ouvrir = async (id: string) => { const e = await ouvrirDocument(porte, id); if (e) setErreur(t.erreurs[e] || t.erreurs.defaut); };
  const supprimer = async (id: string) => { if (!window.confirm(t.confirmer)) return; const r = await apiDepot.supprimer(porte, id); if (!r.ok) setErreur(t.erreurs[r.error] || t.erreurs.defaut); await charger(); };
  const maj = (k: keyof MetaDocument, v: string) => setMeta((m) => ({ ...m, [k]: v || undefined }));

  const formulaire = (
    <div className="grid gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <label className="text-sm font-semibold">{t.deposer}
        <input ref={entree} type="file" className="mt-1 block w-full text-sm" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
      </label>
      <p className="m-0 text-xs text-slate-500">{t.types}</p>
      {fichier && /^image\/(jpeg|webp)$/.test(fichier.type) && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#0B1B3A]" checked={reduire} onChange={(e) => setReduire(e.target.checked)} />{t.photo}</label>
      )}
      {fichier && <AvertissementCoordonnees texte={fichier.name} l={l} discret />}
      {classement && fichier && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs font-semibold">{t.phase}<select className={CHAMP} value={meta.phase ?? ""} onChange={(e) => maj("phase", e.target.value)}>{PHASES.map((p) => <option key={p} value={p}>{p || "—"}</option>)}</select></label>
          <label className="text-xs font-semibold">{t.categorie}<select className={CHAMP} value={meta.categorie ?? ""} onChange={(e) => maj("categorie", e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c ? LIB_CAT[c] : "—"}</option>)}</select></label>
          <label className="text-xs font-semibold">{t.niveau}<input className={CHAMP} value={meta.niveau ?? ""} maxLength={20} placeholder="RDC, R+1…" onChange={(e) => maj("niveau", e.target.value)} /></label>
          <label className="text-xs font-semibold">{t.version}<input className={CHAMP} value={meta.version ?? ""} maxLength={20} placeholder="A, B, v2…" onChange={(e) => maj("version", e.target.value)} /></label>
        </div>
      )}
      {fichier && (
        <label className="text-xs font-semibold">{t.legende}<input className={CHAMP} value={meta.legende ?? ""} maxLength={500} onChange={(e) => maj("legende", e.target.value)} />
          <AvertissementCoordonnees texte={meta.legende ?? ""} l={l} discret /></label>
      )}
      {!admin && <p className="m-0 text-xs text-slate-600">{t.moderation}</p>}
      {progres !== null && <progress className="h-2 w-full" max={1} value={progres} aria-label={t.envoi} />}
      <div><button type="button" className={BTN_NAVY} disabled={!fichier || progres !== null} onClick={() => void envoyer()}>{progres !== null ? t.envoi : t.deposer}</button></div>
    </div>
  );

  if (compact) return <div className="grid gap-2" dir={l === "ar" ? "rtl" : "ltr"}>{formulaire}{erreur && <p className="m-0 text-sm text-rose-800" role="alert">{erreur}</p>}</div>;

  return (
    <section className="grid gap-3 text-start" dir={l === "ar" ? "rtl" : "ltr"} lang={l} aria-label={titre ?? t.titre}>
      {titre !== null && <header><h2 className="m-0 text-lg font-bold text-[#0B1B3A]">{titre ?? t.titre}</h2><p className="m-0 text-sm text-slate-600">{t.aide}</p></header>}
      {formulaire}
      {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
      {!docs && !erreur && <p className="m-0 text-sm text-slate-600" role="status">{t.chargement}</p>}
      {docs && !docs.length && <p className="m-0 text-sm text-slate-600">{t.rien}</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {(docs || []).map((d) => (
          <li key={d.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 ${d.statut === "SUPPRIME" ? "opacity-60" : ""}`}>
            <span className="min-w-0">
              <strong className="break-all" dir="auto">{d.nom}</strong> <span className="text-xs text-slate-500">{t.v(d.version)} · {taille(d.taille)}</span>
              <span className="block text-xs text-slate-600">
                {[d.meta.phase, d.meta.categorie && (LIB_CAT[d.meta.categorie] || d.meta.categorie), d.meta.niveau, d.meta.version].filter(Boolean).join(" · ")}
                {d.meta.legende ? ` — ${d.meta.legende}` : ""}
              </span>
              <span className="block text-xs text-slate-500">{t.par} {d.deposant} · <span dir="ltr">{dateHeure(d.createdAt, l)}</span>{d.motif ? ` · ${d.motif}` : ""}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${d.statut === "VISIBLE" ? "bg-emerald-100 text-emerald-900" : d.statut === "REFUSE" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}>{t.statut[d.statut] || d.statut}</span>
              {d.statut !== "SUPPRIME" && d.statut !== "REFUSE" && <button type="button" className={BTN_CONTOUR} onClick={() => void ouvrir(d.id)}>{t.ouvrir}</button>}
              {(d.moi || admin) && d.statut !== "SUPPRIME" && <button type="button" className="min-h-[40px] px-2 text-xs font-semibold text-rose-800 underline" onClick={() => void supprimer(d.id)}>{t.supprimer}</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
