/**
 * Pièces graphiques des études (ESQ, APS, APD, EXE) — galerie par phase, par catégorie
 * et par niveau (demande du fondateur du 15/10/2026).
 *
 * Fichiers : dépôt de documents commun (contrat v2, contexte « dossier »), aucun
 * stockage propre. Le nom de fichier est fixé par la case (phase + catégorie + niveau) :
 * le service numérote les versions (ESQ v1, APS v2…) et garde les précédentes.
 * Visionneuse : images en plein écran avec zoom, PDF lu dans la page, vidéos lues dans
 * un lecteur. Vidéos sans R2 : liens YouTube (non répertorié) ou Vimeo, « hébergées
 * hors CITURBAREA ». Le client voit ce qui est publié et commente par la messagerie.
 *
 * Modes : « admin » (dépose, publie, retire), « apercu » (ce que voit le client, depuis
 * le back-office), « client » (espace client).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { apiDepot, type DocumentVue, type PorteDepot } from "../documents/api";
import {
  CATEGORIES_PLANS, ORIENTATIONS, PHASES_PLANS, extensionDe, nomCanonique, niveauxDuProjet, trierNiveaux,
  type CategoriePlan, type PhasePlan, type VideoLien,
} from "../../../../../packages/contracts/src/gestion/plans";

const EcrireMessage = lazy(() => import("../messages/EcrireMessage"));

type Langue = "fr" | "ar";
type Mode = "admin" | "apercu" | "client";
type Video = Omit<VideoLien, "auteur"> & { auteur?: string };
type Element =
  | { genre: "fichier"; doc: DocumentVue; phase: PhasePlan; categorie: CategoriePlan; niveau: string; serie: string; version: number; date: string; auteur: string; publie: boolean }
  | { genre: "lien"; video: Video; phase: PhasePlan; categorie: "video"; niveau: string; serie: string; version: number; date: string; auteur: string; publie: boolean };

const T = {
  fr: {
    titre: "Plans, vues et vidéos", aucun: "Aucune pièce graphique pour cette phase.", versionsPrec: "Versions précédentes", ouvrir: "Voir",
    publier: "Publier", depublier: "Retirer de la vue client", retirer: "Retirer", brouillon: "Non publié", publie: "Publié",
    commenter: "Commenter", horsPlateforme: "Vidéo hébergée hors CITURBAREA", deposer: "Ajouter une pièce", categorie: "Catégorie", niveau: "Niveau",
    orientation: "Orientation", titrePiece: "Titre (facultatif)", fichier: "Fichier", envoyer: "Envoyer", envoi: "Envoi…", lien: "Lien YouTube (non répertorié) ou Vimeo",
    titreVideo: "Titre de la vidéo", ajouterLien: "Ajouter la vidéo", publierTout: "Publier tout de suite", telecharger: "Télécharger", fermer: "Fermer",
    pdfMobile: "Si le PDF ne s'affiche pas sur ce téléphone, utilisez « Télécharger ».", zoom: "Zoom",
    plafondNeon: "Stockage actuel : images jusqu'à 1,5 Mo et PDF jusqu'à 2 Mo. Vidéos : par lien en attendant le stockage étendu (R2).",
    plafondR2: "Stockage étendu actif : images jusqu'à 50 Mo, PDF jusqu'à 200 Mo, vidéos jusqu'à 5 Go (envoi en plusieurs morceaux).",
    regleCabinet: "Une pièce déposée reste « non publiée » (invisible du client) jusqu'au bouton « Publier », sauf si « Publier tout de suite » est coché. « Retirer » la masque, l'historique est conservé.",
    erreur: "Action impossible.", lienInvalide: "Lien refusé : seulement YouTube ou Vimeo (https).",
  },
  ar: {
    titre: "التصاميم والمناظر والفيديوهات", aucun: "لا توجد وثائق رسومية لهذه المرحلة.", versionsPrec: "النسخ السابقة", ouvrir: "عرض",
    publier: "نشر", depublier: "إخفاء عن الزبون", retirer: "سحب", brouillon: "غير منشور", publie: "منشور",
    commenter: "تعليق", horsPlateforme: "فيديو مستضاف خارج CITURBAREA", deposer: "إضافة وثيقة", categorie: "الفئة", niveau: "الطابق",
    orientation: "الاتجاه", titrePiece: "العنوان (اختياري)", fichier: "الملف", envoyer: "إرسال", envoi: "جارٍ الإرسال…", lien: "رابط يوتيوب أو فيميو",
    titreVideo: "عنوان الفيديو", ajouterLien: "إضافة الفيديو", publierTout: "نشر فوراً", telecharger: "تحميل", fermer: "إغلاق",
    pdfMobile: "إذا لم يظهر الملف على هذا الهاتف، استعملوا «تحميل».", zoom: "تكبير",
    plafondNeon: "", plafondR2: "", regleCabinet: "", erreur: "تعذر الإجراء.", lienInvalide: "رابط مرفوض.",
  },
};

const ERREURS: Record<string, string> = {
  fichier_trop_lourd: "Fichier trop lourd pour le stockage actuel (images 1,5 Mo, PDF 2 Mo sans R2).", video_r2_requis: "Les vidéos en fichier demandent le stockage étendu (R2) : utilisez un lien YouTube ou Vimeo.",
  type_refuse: "Type de fichier refusé.", type_incoherent: "Le contenu du fichier ne correspond pas à son type.", pdf_contenu_actif: "PDF refusé : il contient du code ou un fichier joint.",
  quota_contexte: "Nombre ou volume maximal de documents atteint pour ce dossier.", stockage_plein: "Stockage de la plateforme plein.", interdit: "Action non autorisée.",
  lien_video_invalide: "Lien refusé : seulement YouTube ou Vimeo (https).", titre_requis: "Donnez un titre à la vidéo.",
};

const lib = (l: Langue, x: { fr: string; ar: string }) => (l === "ar" ? x.ar : x.fr);
const dateCourte = (s: string, l: Langue) => (s ? new Date(s).toLocaleDateString(l === "ar" ? "ar-MA" : "fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");
const estPhase = (p: unknown): p is PhasePlan => PHASES_PLANS.some((x) => x.code === p);
const estCategorie = (c: unknown): c is CategoriePlan => CATEGORIES_PLANS.some((x) => x.code === c);

export default function GaleriePlans({ porte, dossierId, mode, langue = "fr", videos = [], agirVideo, niveaux, phaseUnique }: {
  porte: PorteDepot; dossierId: string; mode: Mode; langue?: Langue; videos?: Video[];
  /** Admin : actions sur les liens vidéo (fiche dossier). */
  agirVideo?: (corps: Record<string, unknown>, message: string) => Promise<void>;
  /** Niveaux du projet (onglets des plans d'étage). */
  niveaux?: string[];
  /** Page d'une étape : une seule phase graphique, sans onglets. */
  phaseUnique?: PhasePlan | null;
}) {
  const t = T[langue], l = langue;
  const [docs, setDocs] = useState<DocumentVue[] | null>(null);
  const [support, setSupport] = useState<"NEON" | "R2">("NEON");
  const [erreur, setErreur] = useState<string | null>(null);
  const [phase, setPhase] = useState<PhasePlan>(phaseUnique ?? "ESQ");
  const [vue, setVue] = useState<Element | null>(null);

  const charger = useCallback(async () => {
    const r = await apiDepot.lister(porte, "dossier", dossierId);
    if (!r.ok) { setErreur(ERREURS[r.error] || t.erreur); setDocs([]); return; }
    setDocs(r.data.documents); setSupport(r.data.support); setErreur(null);
  }, [porte, dossierId, t.erreur]);
  useEffect(() => { void charger(); }, [charger]);

  const elements = useMemo((): Element[] => {
    const fichiers = (docs ?? []).filter((d) => estPhase(d.meta?.phase) && estCategorie(d.meta?.categorie) && d.statut !== "SUPPRIME" && d.statut !== "REFUSE" && d.statut !== "EN_COURS")
      .filter((d) => mode === "admin" || d.statut === "VISIBLE")
      .map((d): Element => ({
        genre: "fichier", doc: d, phase: d.meta.phase as PhasePlan, categorie: d.meta.categorie as CategoriePlan, niveau: d.meta.niveau ?? "",
        serie: d.nom.replace(/\.[a-z0-9]+$/i, ""), version: d.version, date: d.createdAt, auteur: d.deposant, publie: d.statut === "VISIBLE",
      }));
    const liens = videos.filter((v) => mode === "admin" || v.publie).map((v): Element => ({
      genre: "lien", video: v, phase: v.phase, categorie: "video", niveau: "", serie: `lien-${v.phase}-${v.titre.toLowerCase()}`, version: v.version, date: v.createdAt, auteur: "CITURBAREA", publie: v.publie,
    }));
    return [...fichiers, ...liens];
  }, [docs, videos, mode]);

  const comptes = useMemo(() => Object.fromEntries(PHASES_PLANS.map((p) => [p.code, new Set(elements.filter((e) => e.phase === p.code).map((e) => e.serie)).size])), [elements]);
  useEffect(() => {
    // Ouvre la phase la plus avancée qui a des pièces.
    if (phaseUnique) return;
    const derniere = [...PHASES_PLANS].reverse().find((p) => comptes[p.code] > 0);
    if (derniere) setPhase(derniere.code);
  }, [docs]); // eslint-disable-line react-hooks/exhaustive-deps

  const dePhase = elements.filter((e) => e.phase === phase);

  return (
    <div dir={l === "ar" ? "rtl" : "ltr"} lang={l} style={{ display: "grid", gap: 10 }}>
      {erreur && <div style={S.erreur}>{erreur}</div>}
      {!phaseUnique && <div role="tablist" style={S.onglets}>
        {PHASES_PLANS.map((p) => (
          <button key={p.code} role="tab" aria-selected={phase === p.code} style={S.onglet(phase === p.code)} onClick={() => setPhase(p.code)}>
            {lib(l, p)}{comptes[p.code] ? ` (${comptes[p.code]})` : ""}
          </button>
        ))}
      </div>}
      {mode === "admin" && <Envoi porte={porte} dossierId={dossierId} phase={phase} support={support} niveaux={niveaux} t={t} onFini={charger} agirVideo={agirVideo} />}
      {docs === null ? <p style={S.petit}>…</p> : dePhase.length === 0 ? <p style={S.petit}>{t.aucun}</p> : (
        CATEGORIES_PLANS.map((c) => {
          const items = dePhase.filter((e) => e.categorie === c.code);
          if (!items.length) return null;
          const groupes = c.par === "niveau" ? trierNiveaux([...new Set(items.map((e) => e.niveau || "—"))]) : c.par === "orientation" ? [...new Set(items.map((e) => e.niveau || "—"))] : [""];
          return (
            <section key={c.code} style={S.carte}>
              <h3 style={S.h3}>{lib(l, c)}</h3>
              {groupes.map((g) => (
                <div key={g || "tout"}>
                  {g && <div style={S.sousTitre}>{c.par === "niveau" ? `${t.niveau} : ${g}` : `${t.orientation} : ${g}`}</div>}
                  <Series items={items.filter((e) => !g || (e.niveau || "—") === g)} mode={mode} porte={porte} dossierId={dossierId} l={l} t={t} ouvrir={setVue} recharger={charger} agirVideo={agirVideo} />
                </div>
              ))}
            </section>
          );
        })
      )}
      {vue && <Visionneuse e={vue} porte={porte} l={l} t={t} fermer={() => setVue(null)} />}
    </div>
  );
}

/** Une série = même case ; la dernière version en tête, les précédentes repliées. */
function Series({ items, mode, porte, dossierId, l, t, ouvrir, recharger, agirVideo }: {
  items: Element[]; mode: Mode; porte: PorteDepot; dossierId: string; l: Langue; t: (typeof T)["fr"];
  ouvrir: (e: Element) => void; recharger: () => Promise<void>; agirVideo?: (c: Record<string, unknown>, m: string) => Promise<void>;
}) {
  const series = new Map<string, Element[]>();
  for (const e of items) series.set(e.serie, [...(series.get(e.serie) ?? []), e]);
  return (
    <div style={S.grille}>
      {[...series.values()].map((v) => {
        const tries = [...v].sort((a, b) => b.version - a.version || b.date.localeCompare(a.date));
        const [derniere, ...anciennes] = tries;
        return (
          <div key={derniere.serie} style={S.vignette}>
            <Carte e={derniere} mode={mode} porte={porte} dossierId={dossierId} l={l} t={t} ouvrir={ouvrir} recharger={recharger} agirVideo={agirVideo} />
            {anciennes.length > 0 && (
              <details>
                <summary style={S.petitLien}>{t.versionsPrec} ({anciennes.length})</summary>
                {anciennes.map((a) => <Carte key={a.genre === "fichier" ? a.doc.id : a.video.id} e={a} mode={mode} porte={porte} dossierId={dossierId} l={l} t={t} ouvrir={ouvrir} recharger={recharger} agirVideo={agirVideo} compacte />)}
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Apercu({ e, porte }: { e: Element; porte: PorteDepot }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (e.genre !== "fichier" || !e.doc.type.startsWith("image/")) return;
    void apiDepot.lien(porte, e.doc.id, e.doc.aVignette).then((r) => r.ok && setUrl(r.data.url));
  }, [e, porte]);
  if (e.genre === "lien") return <div style={{ ...S.apercu, background: "#0B1B3A", color: "#fff" }}>▶ {e.video.fournisseur === "youtube" ? "YouTube" : "Vimeo"}</div>;
  if (e.doc.type.startsWith("video/")) return <div style={{ ...S.apercu, background: "#0B1B3A", color: "#fff" }}>▶</div>;
  if (e.doc.type === "application/pdf") return <div style={{ ...S.apercu, background: "#FDECEC", color: "#B42318", fontWeight: 700 }}>PDF</div>;
  return url ? <img src={url} alt="" style={{ ...S.apercu, objectFit: "cover" }} loading="lazy" /> : <div style={S.apercu} />;
}

function Carte({ e, mode, porte, dossierId, l, t, ouvrir, recharger, agirVideo, compacte = false }: {
  e: Element; mode: Mode; porte: PorteDepot; dossierId: string; l: Langue; t: (typeof T)["fr"]; ouvrir: (e: Element) => void;
  recharger: () => Promise<void>; agirVideo?: (c: Record<string, unknown>, m: string) => Promise<void>; compacte?: boolean;
}) {
  const [occupe, setOccupe] = useState(false);
  const titre = e.genre === "lien" ? e.video.titre : (e.doc.meta.legende || CATEGORIES_PLANS.find((c) => c.code === e.categorie)?.fr || e.doc.nom);
  const libVersion = `${e.phase} v${e.version}`;
  const agir = async (f: () => Promise<unknown>) => { setOccupe(true); try { await f(); await recharger(); } finally { setOccupe(false); } };
  return (
    <div style={{ display: "grid", gap: 4, padding: compacte ? "6px 0" : 0 }}>
      {!compacte && <button style={S.boutonApercu} onClick={() => ouvrir(e)} aria-label={t.ouvrir}><Apercu e={e} porte={porte} /></button>}
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{titre}{e.niveau && e.categorie !== "plan-niveau" && e.categorie !== "facade" ? ` — ${e.niveau}` : ""}</div>
      <div style={S.petit}>
        <b>{libVersion}</b> · {dateCourte(e.date, l)} · {e.auteur}
        {mode === "admin" && <span style={{ ...S.badge, ...(e.publie ? { background: "#E7F6EC", color: "#067647" } : { background: "#FFF6E0", color: "#93370D" }) }}>{e.publie ? t.publie : t.brouillon}</span>}
      </div>
      {e.genre === "lien" && <div style={S.petit}>{t.horsPlateforme}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button style={S.btnGhost} onClick={() => ouvrir(e)}>{t.ouvrir}</button>
        {mode === "admin" && e.genre === "fichier" && !e.publie && (
          <button style={S.btn} disabled={occupe} onClick={() => void agir(() => apiDepot.moderer(e.doc.id, "VISIBLE"))}>{t.publier}</button>
        )}
        {mode === "admin" && e.genre === "fichier" && (
          <button style={S.btnGhost} disabled={occupe} onClick={() => { if (window.confirm(`${t.retirer} ?`)) void agir(() => apiDepot.supprimer(porte, e.doc.id)); }}>{t.retirer}</button>
        )}
        {mode === "admin" && e.genre === "lien" && agirVideo && (
          <button style={S.btnGhost} disabled={occupe} onClick={() => void agirVideo({ action: "video_publier", id: e.video.id, publie: !e.publie }, e.publie ? "Vidéo retirée de la vue client." : "Vidéo publiée.")}>{e.publie ? t.depublier : t.publier}</button>
        )}
        {mode === "client" && (
          <Suspense fallback={null}>
            <EcrireMessage porte="client" contexte="dossier" objetId={dossierId} invites={[{ type: "admin" }]} avecNom="CITURBAREA" sujet={`${t.commenter} — ${titre} (${libVersion})`} langue={l} variante="contour" />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function Visionneuse({ e, porte, l, t, fermer }: { e: Element; porte: PorteDepot; l: Langue; t: (typeof T)["fr"]; fermer: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const fichier = e.genre === "fichier" ? e.doc : null;
  useEffect(() => {
    if (!fichier) return;
    let lien: string | null = null;
    void apiDepot.lien(porte, fichier.id).then(async (r) => {
      if (!r.ok) return;
      setUrl(r.data.url);
      // PDF lu dans la page : le fichier est servi en téléchargement, on l'affiche depuis une copie locale.
      if (fichier.type === "application/pdf") {
        const b = await fetch(r.data.url, { credentials: "include" }).then((x) => (x.ok ? x.blob() : null)).catch(() => null);
        if (b) { lien = URL.createObjectURL(new Blob([b], { type: "application/pdf" })); setBlob(lien); }
      }
    });
    return () => { if (lien) URL.revokeObjectURL(lien); };
  }, [fichier, porte]);
  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === "Escape") fermer(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fermer]);

  return (
    <div role="dialog" aria-modal="true" style={S.voile} onClick={fermer}>
      <div style={S.cadre} onClick={(ev) => ev.stopPropagation()}>
        <div style={S.barre}>
          <span style={{ fontWeight: 600 }}>{e.genre === "lien" ? e.video.titre : (e.doc.meta.legende || e.doc.nom)} · {e.phase} v{e.version}</span>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {fichier?.type.startsWith("image/") && <>
              <button style={S.btnSombre} onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))} aria-label={`${t.zoom} −`}>−</button>
              <span style={{ alignSelf: "center" }}>{Math.round(zoom * 100)} %</span>
              <button style={S.btnSombre} onClick={() => setZoom((z) => Math.min(8, z * 1.25))} aria-label={`${t.zoom} +`}>+</button>
            </>}
            {url && <a style={S.btnSombre} href={url} download>{t.telecharger}</a>}
            <button style={S.btnSombre} onClick={fermer}>{t.fermer}</button>
          </span>
        </div>
        <div style={S.zone} onWheel={(ev) => { if (fichier?.type.startsWith("image/") && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); setZoom((z) => Math.min(8, Math.max(0.25, z * (ev.deltaY < 0 ? 1.15 : 0.87)))); } }}>
          {e.genre === "lien" && (
            <div style={{ width: "100%", maxWidth: 1100 }}>
              <div style={{ position: "relative", paddingTop: "56.25%" }}>
                <iframe src={e.video.integration} title={e.video.titre} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>
              <p style={{ color: "#D0D5DD", fontSize: 13 }}>{t.horsPlateforme}</p>
            </div>
          )}
          {fichier?.type.startsWith("image/") && url && <img src={url} alt="" style={{ width: `${zoom * 100}%`, maxWidth: "none", height: "auto", display: "block", margin: "auto" }} />}
          {fichier?.type.startsWith("video/") && url && <video src={url} controls playsInline style={{ maxWidth: "100%", maxHeight: "80vh" }} />}
          {fichier?.type === "application/pdf" && (blob ? (
            <div style={{ width: "100%", height: "100%", display: "grid" }}>
              <iframe src={blob} title="PDF" style={{ width: "100%", height: "78vh", border: 0, background: "#fff" }} />
              <p style={{ color: "#D0D5DD", fontSize: 12.5 }}>{t.pdfMobile}</p>
            </div>
          ) : <p style={{ color: "#fff" }}>…</p>)}
        </div>
      </div>
    </div>
  );
}

function Envoi({ porte, dossierId, phase, support, niveaux, t, onFini, agirVideo }: {
  porte: PorteDepot; dossierId: string; phase: PhasePlan; support: "NEON" | "R2"; niveaux?: string[]; t: (typeof T)["fr"];
  onFini: () => Promise<void>; agirVideo?: (c: Record<string, unknown>, m: string) => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [categorie, setCategorie] = useState<CategoriePlan>("plan-niveau");
  const [niveau, setNiveau] = useState("RDC");
  const [titre, setTitre] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [publierLien, setPublierLien] = useState(true);
  const [publierFichier, setPublierFichier] = useState(false);
  const [progres, setProgres] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const liste = niveaux?.length ? niveaux : niveauxDuProjet(0, 1);
  const parCat = CATEGORIES_PLANS.find((c) => c.code === categorie)!.par;
  const videoParLien = categorie === "video" && support !== "R2";
  const accept = categorie === "video" ? "video/mp4,video/quicktime,video/webm" : categorie === "notice" ? "application/pdf" : "image/jpeg,image/png,image/webp,application/pdf";

  const envoyer = async () => {
    if (!fichier) return;
    const ext = extensionDe(fichier.type);
    if (!ext) { setErreur(ERREURS.type_refuse); return; }
    setErreur(null); setProgres(0);
    const n = parCat ? niveau : "";
    const r = await apiDepot.televerser(porte, {
      contexte: "dossier", objetId: dossierId, nom: nomCanonique(phase, categorie, n, ext, titre), type: fichier.type, octets: fichier,
      meta: { phase, categorie, ...(n ? { niveau: n } : {}), ...(titre.trim() ? { legende: titre.trim() } : {}) },
      // Déposé non publié par défaut : l’architecte publie ensuite (bouton « Publier »).
      brouillon: !publierFichier,
    }, setProgres);
    setProgres(null);
    if (!r.ok) { setErreur(ERREURS[r.error] || t.erreur); return; }
    setFichier(null); setTitre("");
    await onFini();
  };

  if (!ouvert) return <div><button style={S.btn} onClick={() => setOuvert(true)}>+ {t.deposer}</button></div>;
  return (
    <div style={{ ...S.carte, borderStyle: "dashed", display: "grid", gap: 8 }}>
      <p style={S.petit}>{support === "R2" ? t.plafondR2 : t.plafondNeon} {t.regleCabinet}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={S.champ}>{t.categorie}
          <select style={S.input} value={categorie} onChange={(e) => setCategorie(e.target.value as CategoriePlan)}>{CATEGORIES_PLANS.map((c) => <option key={c.code} value={c.code}>{c.fr}</option>)}</select>
        </label>
        {parCat === "niveau" && <label style={S.champ}>{t.niveau}<select style={S.input} value={niveau} onChange={(e) => setNiveau(e.target.value)}>{liste.map((n) => <option key={n}>{n}</option>)}</select></label>}
        {parCat === "orientation" && <label style={S.champ}>{t.orientation}<select style={S.input} value={niveau} onChange={(e) => setNiveau(e.target.value)}>{ORIENTATIONS.map((n) => <option key={n}>{n}</option>)}</select></label>}
        <label style={S.champ}>{videoParLien ? t.titreVideo : t.titrePiece}<input style={S.input} value={titre} maxLength={120} onChange={(e) => setTitre(e.target.value)} /></label>
      </div>
      {videoParLien ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ ...S.champ, flex: "1 1 280px" }}>{t.lien}<input style={S.input} value={url} placeholder="https://youtu.be/… ou https://vimeo.com/…" onChange={(e) => setUrl(e.target.value)} /></label>
          <label style={{ ...S.petit, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={publierLien} onChange={(e) => setPublierLien(e.target.checked)} /> {t.publierTout}</label>
          <button style={S.btn} disabled={!url || !titre.trim() || !agirVideo} onClick={() => void agirVideo?.({ action: "video_ajouter", phase, titre, url, publie: publierLien }, "Vidéo ajoutée.").then(() => { setUrl(""); setTitre(""); })}>{t.ajouterLien}</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={S.champ}>{t.fichier}<input type="file" accept={accept} onChange={(e) => setFichier(e.target.files?.[0] ?? null)} /></label>
          <label style={{ ...S.petit, display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={publierFichier} onChange={(e) => setPublierFichier(e.target.checked)} /> {t.publierTout}</label>
          <button style={S.btn} disabled={!fichier || progres !== null} onClick={() => void envoyer()}>{progres !== null ? `${t.envoi} ${Math.round(progres * 100)} %` : t.envoyer}</button>
        </div>
      )}
      {progres !== null && <progress max={1} value={progres} style={{ width: "100%" }} />}
      {erreur && <div style={S.erreur}>{erreur}</div>}
    </div>
  );
}

const S = {
  onglets: { display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #E4E7EC" } as CSSProperties,
  onglet: (on: boolean): CSSProperties => ({ padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 14, minHeight: 40,
    borderBottom: `2px solid ${on ? "#B8860B" : "transparent"}`, color: on ? "#1F3864" : "#475467", fontWeight: on ? 700 : 400 }),
  carte: { background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, padding: 12 } as CSSProperties,
  h3: { fontSize: 14.5, margin: "0 0 8px", color: "#1F3864" } as CSSProperties,
  sousTitre: { fontSize: 12.5, fontWeight: 700, color: "#344054", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: 0.4 } as CSSProperties,
  grille: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 } as CSSProperties,
  vignette: { display: "grid", gap: 4, alignContent: "start" } as CSSProperties,
  apercu: { width: "100%", aspectRatio: "4 / 3", borderRadius: 8, background: "#F2F4F7", display: "grid", placeItems: "center", fontSize: 18 } as CSSProperties,
  boutonApercu: { padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "block" } as CSSProperties,
  petit: { fontSize: 12.5, color: "#475467", lineHeight: 1.5, margin: 0 } as CSSProperties,
  petitLien: { fontSize: 12.5, color: "#175CD3", cursor: "pointer" } as CSSProperties,
  badge: { fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 6, marginInlineStart: 6 } as CSSProperties,
  btn: { padding: "6px 12px", borderRadius: 6, border: "1px solid #1F3864", background: "#1F3864", color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 34 } as CSSProperties,
  btnGhost: { padding: "6px 12px", borderRadius: 6, border: "1px solid #D0D5DD", background: "#fff", color: "#344054", cursor: "pointer", fontSize: 13, minHeight: 34 } as CSSProperties,
  btnSombre: { padding: "6px 12px", borderRadius: 6, border: "1px solid #475467", background: "#1D2939", color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 34, textDecoration: "none" } as CSSProperties,
  champ: { display: "grid", gap: 3, fontSize: 12.5, color: "#475467" } as CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: "1px solid #D0D5DD", fontSize: 13, background: "#fff", minHeight: 34 } as CSSProperties,
  erreur: { background: "#FDECEC", color: "#B42318", padding: "8px 12px", borderRadius: 6, fontSize: 13.5 } as CSSProperties,
  voile: { position: "fixed", inset: 0, background: "rgba(10,15,30,.92)", zIndex: 1000, display: "grid", placeItems: "center", padding: 12 } as CSSProperties,
  cadre: { width: "min(1200px, 100%)", maxHeight: "96vh", display: "grid", gridTemplateRows: "auto 1fr", gap: 8, color: "#fff" } as CSSProperties,
  barre: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 14 } as CSSProperties,
  zone: { overflow: "auto", maxHeight: "86vh", display: "grid", placeItems: "center" } as CSSProperties,
};
