/**
 * Documents attendus, phase par phase et lot par lot (lot GP2 — exigences A et B).
 * Un seul composant pour la fiche admin (/cc/dossiers/:id), l'espace client
 * (/mon-espace) et l'espace projet (/projet) : seule l'URL de base et le mode changent.
 *
 *   GET  <base>            phases, pièces, compteurs, normes, checklists
 *   POST <base>            { action, cle, … } (dépôt : contenu en base64)
 *   GET  <base>/<docId>    fichier déposé
 *
 * Une pièce absente s'affiche « Document manquant », bien en évidence, avec le
 * compteur de la phase. Images réduites dans le navigateur avant l'envoi (sans
 * métadonnées) ; PDF jusqu'à 4 Mo. Aucune coordonnée n'est affichée.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { preparerImage } from "../fournisseurs/imagesNavigateur";

type Lib = { fr: string; ar: string };
type Piece = {
  cle: string; code: string; phase: string; jalon: string | null; jalonTitre: string | null; lot: string; lotTitre: Lib;
  libelleFr: string; libelleAr: string; obligatoire: "OBLIGATOIRE" | "CONDITIONNEL"; applicabilite: "EXIGE" | "A_CONFIRMER"; condition: string | null;
  producteur: string | null; producteurLib: Lib; validateurLib: Lib; format: string | null; detail: string | null; backOffice: boolean; recurrent: boolean; pointArret: boolean;
  statut: "MANQUANT" | "DEPOSE" | "VALIDE" | "REFUSE" | "SANS_OBJET"; motif: string | null; documentIds: string[]; deposeLe: string | null; valideLe: string | null;
  /** Permis modifié : pièce DEXE à reprendre (mise à jour du dossier d'exécution en cours). */
  aReprendre?: boolean;
};
type Compteur = { attendues: number; manquantes: number; deposees: number; validees: number; refusees: number; sansObjet: number; aConfirmer: number };
type Norme = { code: string; reference: string; objet: string; statut: string; preparation: string[]; execution: string[] };
type Phase = {
  code: string; ordre: number; titre: string; titreAr: string; pieces: Piece[]; compteur: Compteur;
  normes: { lot: string; lotTitre: Lib; normes: Norme[] }[];
  checklists: { code: string; titre: string; titreAr: string; lot: string | null; pointArret: boolean; nbPoints: number; nbPointsArret: number }[];
};
type Reponse = { phases: Phase[] | null; phaseActuelle: string | null; fichiers: Record<string, { id: string; nom: string; type: string; taille: number }>; sqlACollerGestion: boolean; fichierSql: string; raison?: string };

export type Mode = "admin" | "superviseur" | "intervenant" | "client";

const T = {
  fr: {
    titre: "Documents par phase", manquant: "Document manquant", depose: "Déposé, à vérifier", valide: "Validé", refuse: "Refusé", sansObjet: "Sans objet",
    compteur: (c: Compteur) => (c.attendues === 0 ? "Aucun document attendu" : c.manquantes ? `${c.manquantes} document(s) manquant(s) sur ${c.attendues}` : `Complet : ${c.validees} validé(s), ${c.deposees} à vérifier`),
    aConfirmer: "à confirmer selon le projet", conditionnel: "selon le projet", fournitPar: "Fourni par", validePar: "validé par",
    deposer: "Déposer", envoi: "Envoi…", valider: "Valider", refuser: "Refuser", sansObjetBtn: "Sans objet", reinit: "Remettre à « manquant »",
    motifRefus: "Motif du refus (obligatoire)", motifSo: "Pourquoi cette pièce est sans objet ? (obligatoire)", motif: "Motif",
    normes: "Normes à respecter", preparation: "Pour préparer les documents", execution: "Pour l'exécution sur chantier",
    checklists: "Contrôles de chantier (PV)", pointsArret: (n: number) => `${n} point(s) d'arrêt`, points: (n: number) => `${n} point(s) de contrôle`,
    sql: "Dépôt pas encore activé : coller le SQL", charge: "Chargement…", erreur: "Impossible de charger les documents.", tout: "Tout ouvrir", phaseEnCours: "phase en cours",
    sansDossier: "Ce projet n'est rattaché à aucun dossier : pas de liste de documents.", reservee: "réservé au back-office", fichierTrop: "Fichier trop lourd (PDF : 4 Mo maximum).",
    typeRefuse: "Type refusé : PDF, JPEG, PNG ou WebP seulement.",
  },
  ar: {
    titre: "الوثائق حسب المرحلة", manquant: "وثيقة ناقصة", depose: "مودعة، في انتظار التحقق", valide: "مصادق عليها", refuse: "مرفوضة", sansObjet: "غير معنية",
    compteur: (c: Compteur) => (c.attendues === 0 ? "لا توجد وثائق مطلوبة" : c.manquantes ? `${c.manquantes} وثيقة ناقصة من أصل ${c.attendues}` : `مكتمل: ${c.validees} مصادق عليها، ${c.deposees} في انتظار التحقق`),
    aConfirmer: "يُحدَّد حسب المشروع", conditionnel: "حسب المشروع", fournitPar: "يقدمها", validePar: "يصادق عليها",
    deposer: "إيداع", envoi: "جارٍ الإرسال…", valider: "مصادقة", refuser: "رفض", sansObjetBtn: "غير معنية", reinit: "إرجاع إلى «ناقصة»",
    motifRefus: "سبب الرفض (إلزامي)", motifSo: "لماذا هذه الوثيقة غير معنية؟ (إلزامي)", motif: "السبب",
    normes: "المعايير الواجب احترامها", preparation: "لإعداد الوثائق", execution: "للتنفيذ في الورش",
    checklists: "مراقبة الورش (محاضر)", pointsArret: (n: number) => `${n} نقطة توقف`, points: (n: number) => `${n} نقطة مراقبة`,
    sql: "الإيداع غير مفعل بعد", charge: "جارٍ التحميل…", erreur: "تعذر تحميل الوثائق.", tout: "فتح الكل", phaseEnCours: "المرحلة الحالية",
    sansDossier: "هذا المشروع غير مرتبط بأي ملف.", reservee: "خاص بالإدارة", fichierTrop: "الملف ثقيل جداً (PDF: 4 ميغابايت كحد أقصى).",
    typeRefuse: "نوع غير مقبول: PDF أو JPEG أو PNG أو WebP فقط.",
  },
};

const ERREURS: Record<string, string> = {
  sql_a_coller: "Tables absentes : coller docs/sql/TOUT-NEON.sql dans la console Neon.", interdit: "Vous ne pouvez pas déposer cette pièce (elle est fournie par un autre intervenant).",
  pdf_actif_refuse: "PDF refusé : il contient du code ou des fichiers joints.", type_refuse: "Type refusé : PDF, JPEG, PNG ou WebP seulement.",
  document_trop_lourd: "Fichier trop lourd (PDF : 4 Mo maximum).", image_trop_lourde: "Image trop lourde.", quota_depasse: "Espace de stockage du dossier plein.",
  aucun_document_depose: "Aucun fichier déposé : rien à valider.", motif_obligatoire: "Motif obligatoire.", piece_inconnue: "Pièce inconnue pour ce dossier.",
};

const COULEUR: Record<Piece["statut"], { fond: string; texte: string }> = {
  MANQUANT: { fond: "#FDECEC", texte: "#B42318" }, REFUSE: { fond: "#FDECEC", texte: "#B42318" }, DEPOSE: { fond: "#FFF6E0", texte: "#93370D" },
  VALIDE: { fond: "#E7F6EC", texte: "#067647" }, SANS_OBJET: { fond: "#F2F4F7", texte: "#667085" },
};

const lireBase64 = (f: File) => new Promise<string>((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ""));
  r.onerror = () => ko(r.error);
  r.readAsDataURL(f);
});

export default function DocumentsParPhase({ base, mode, langue = "fr", phaseInitiale }: { base: string; mode: Mode; langue?: "fr" | "ar"; phaseInitiale?: string | null }) {
  const t = T[langue], ar = langue === "ar";
  const [r, setR] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [occupe, setOccupe] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const x = await fetch(base, { credentials: "include", cache: "no-store" });
      const j = await x.json().catch(() => ({}));
      if (!x.ok || j.ok === false) throw new Error(j.error || String(x.status));
      setR(j as Reponse); setErreur(null);
    } catch { setErreur(t.erreur); }
  }, [base, t.erreur]);
  useEffect(() => { void charger(); }, [charger]);

  const actuelle = useMemo(() => {
    if (!r?.phases) return null;
    const voulue = phaseInitiale ?? r.phaseActuelle;
    if (voulue && r.phases.some((p) => p.code === voulue)) return voulue;
    return r.phases.find((p) => p.compteur.manquantes > 0)?.code ?? null;
  }, [r, phaseInitiale]);
  useEffect(() => { if (actuelle) setOuvertes((s) => new Set(s).add(actuelle)); }, [actuelle]);

  const agir = async (corps: Record<string, unknown>) => {
    setOccupe(String(corps.cle)); setErreur(null);
    try {
      const x = await fetch(base, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
      const j = await x.json().catch(() => ({}));
      if (!x.ok || j.ok === false) throw new Error(ERREURS[j.error] || j.error || `Erreur ${x.status}`);
      await charger();
    } catch (e) { setErreur((e as Error).message); } finally { setOccupe(null); }
  };

  const deposer = async (p: Piece, f: File) => {
    try {
      let contenu: string, nom = f.name;
      if (f.type === "application/pdf") {
        if (f.size > 4 * 1024 * 1024) { setErreur(t.fichierTrop); return; }
        contenu = await lireBase64(f);
      } else if (/^image\//.test(f.type)) {
        contenu = (await preparerImage(f)).image;
        nom = nom.replace(/\.[a-z0-9]+$/i, "") + ".webp";
      } else { setErreur(t.typeRefuse); return; }
      await agir({ action: "deposer", cle: p.cle, nom, contenu });
    } catch { setErreur(t.typeRefuse); }
  };

  if (erreur && !r) return <p style={S.erreur}>{erreur}</p>;
  if (!r) return <p style={S.petit}>{t.charge}</p>;
  if (!r.phases) return <p style={S.petit}>{t.sansDossier}</p>;

  const basculer = (c: string) => setOuvertes((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const libStatut = (s: Piece["statut"]) => ({ MANQUANT: t.manquant, DEPOSE: t.depose, VALIDE: t.valide, REFUSE: t.refuse, SANS_OBJET: t.sansObjet })[s];

  return (
    <div dir={ar ? "rtl" : "ltr"} lang={langue} style={{ display: "grid", gap: 10 }}>
      {r.sqlACollerGestion && mode === "admin" && <div style={S.alerte}>{t.sql} {r.fichierSql} (ou docs/sql/TOUT-NEON.sql).</div>}
      {erreur && <div style={S.erreur}>{erreur}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={S.lienBtn} onClick={() => setOuvertes(new Set(r.phases!.map((p) => p.code)))}>{t.tout}</button>
      </div>
      {r.phases.map((ph) => {
        const ouvert = ouvertes.has(ph.code);
        const lots = new Map<string, Piece[]>();
        for (const p of ph.pieces) lots.set(p.lot, [...(lots.get(p.lot) ?? []), p]);
        const enCours = ph.code === actuelle;
        return (
          <section key={ph.code} style={{ ...S.carte, borderColor: enCours ? "#1F3864" : "#E4E7EC" }}>
            <button style={S.tete} onClick={() => basculer(ph.code)} aria-expanded={ouvert}>
              <span style={{ fontWeight: 700, color: "#1F3864" }}>{String(ph.ordre).padStart(2, "0")} · {ar ? ph.titreAr : ph.titre}{enCours ? ` — ${t.phaseEnCours}` : ""}</span>
              <span style={{ ...S.badge, ...(ph.compteur.manquantes ? { background: "#FDECEC", color: "#B42318" } : { background: "#E7F6EC", color: "#067647" }) }}>{t.compteur(ph.compteur)}</span>
            </button>
            {ouvert && (
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                {[...lots.entries()].map(([lot, pieces]) => (
                  <div key={lot}>
                    <h4 style={S.h4}>{ar ? pieces[0].lotTitre.ar : pieces[0].lotTitre.fr}</h4>
                    {pieces.map((p) => (
                      <LignePiece key={p.cle} p={p} mode={mode} ar={ar} t={t} libStatut={libStatut} fichiers={r.fichiers} base={base}
                        occupe={occupe === p.cle} agir={agir} deposer={deposer} />
                    ))}
                  </div>
                ))}
                {ph.normes.length > 0 && (
                  <details style={S.details}>
                    <summary style={S.summary}>{t.normes} ({ph.normes.reduce((n, l) => n + l.normes.length, 0)})</summary>
                    {ph.normes.map((l) => (
                      <div key={l.lot} style={{ marginTop: 8 }}>
                        <h4 style={S.h4}>{ar ? l.lotTitre.ar : l.lotTitre.fr}</h4>
                        {l.normes.map((n) => (
                          <div key={n.code} style={S.norme}>
                            <b>{n.reference}</b> — {n.objet}{n.statut !== "VERIFIE" ? <span style={S.petit}> (texte à vérifier)</span> : null}
                            {n.preparation.length > 0 && <><div style={S.sousTitre}>{t.preparation}</div><ul style={S.ul}>{n.preparation.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
                            {n.execution.length > 0 && <><div style={S.sousTitre}>{t.execution}</div><ul style={S.ul}>{n.execution.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </details>
                )}
                {ph.checklists.length > 0 && mode !== "client" && (
                  <div>
                    <h4 style={S.h4}>{t.checklists}</h4>
                    <ul style={S.ul}>
                      {ph.checklists.map((c) => <li key={c.code}>{ar ? c.titreAr : c.titre} — {t.points(c.nbPoints)}{c.nbPointsArret ? `, ${t.pointsArret(c.nbPointsArret)}` : ""}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LignePiece({ p, mode, ar, t, libStatut, fichiers, base, occupe, agir, deposer }: {
  p: Piece; mode: Mode; ar: boolean; t: (typeof T)["fr"]; libStatut: (s: Piece["statut"]) => string; fichiers: Reponse["fichiers"]; base: string; occupe: boolean;
  agir: (c: Record<string, unknown>) => Promise<void>; deposer: (p: Piece, f: File) => Promise<void>;
}) {
  const c = COULEUR[p.statut];
  const peutDeposer = mode !== "client" || p.producteur === "MAITRE_OUVRAGE";
  const validateur = mode === "admin" || mode === "superviseur";
  const demander = (question: string, action: string) => {
    const m = window.prompt(question);
    if (m && m.trim()) void agir({ action, cle: p.cle, motif: m.trim() });
  };
  return (
    <div style={{ ...S.ligne, borderInlineStart: `4px solid ${c.texte}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>
          {ar ? p.libelleAr : p.libelleFr}
          {p.obligatoire === "CONDITIONNEL" && <span style={S.petit}> ({p.applicabilite === "A_CONFIRMER" ? t.aConfirmer : t.conditionnel})</span>}
          {p.backOffice && mode === "admin" && <span style={S.petit}> ({t.reservee})</span>}
        </span>
        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
          {p.aReprendre && <span style={{ ...S.statut, background: "#FFF6E0", color: "#93370D", fontWeight: 700 }}>{ar ? "يجب تحيينها (تعديل الرخصة)" : "À reprendre (permis modifié)"}</span>}
          <span style={{ ...S.statut, background: c.fond, color: c.texte, fontWeight: p.statut === "MANQUANT" ? 800 : 600 }}>{libStatut(p.statut)}</span>
        </span>
      </div>
      <div style={S.petit}>
        {t.fournitPar} : {ar ? p.producteurLib.ar : p.producteurLib.fr}{p.validateurLib ? ` · ${t.validePar} : ${ar ? p.validateurLib.ar : p.validateurLib.fr}` : ""}
        {p.format ? ` · ${p.format}` : ""}
      </div>
      {p.detail && mode !== "client" && <div style={S.petit}>{p.detail}</div>}
      {p.motif && <div style={{ ...S.petit, color: "#B42318" }}>{t.motif} : {p.motif}</div>}
      {p.documentIds.length > 0 && (
        <div style={S.petit}>
          {p.documentIds.map((id) => fichiers[id] ? <a key={id} href={`${base}/${id}`} target="_blank" rel="noopener noreferrer" style={{ marginInlineEnd: 10 }}>{fichiers[id].nom}</a> : null)}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {peutDeposer && p.statut !== "VALIDE" && p.statut !== "SANS_OBJET" && (
          <label style={{ ...S.btn, opacity: occupe ? 0.6 : 1 }}>
            {occupe ? t.envoi : t.deposer}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={{ display: "none" }} disabled={occupe}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void deposer(p, f); }} />
          </label>
        )}
        {validateur && p.statut === "DEPOSE" && <button style={S.btn} disabled={occupe} onClick={() => void agir({ action: "valider", cle: p.cle })}>{t.valider}</button>}
        {validateur && (p.statut === "DEPOSE" || p.statut === "VALIDE") && <button style={S.btnGhost} disabled={occupe} onClick={() => demander(t.motifRefus, "refuser")}>{t.refuser}</button>}
        {validateur && p.statut !== "SANS_OBJET" && <button style={S.btnGhost} disabled={occupe} onClick={() => demander(t.motifSo, "sans_objet")}>{t.sansObjetBtn}</button>}
        {mode === "admin" && p.statut !== "MANQUANT" && <button style={S.lienBtn} disabled={occupe} onClick={() => void agir({ action: "reinitialiser", cle: p.cle })}>{t.reinit}</button>}
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  carte: { background: "#fff", border: "1px solid #E4E7EC", borderRadius: 10, padding: 12 },
  tete: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "start", fontSize: 14.5 },
  badge: { fontSize: 12.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 },
  h4: { fontSize: 13, margin: "4px 0 6px", color: "#344054", textTransform: "uppercase", letterSpacing: 0.4 },
  ligne: { padding: "8px 10px", margin: "6px 0", background: "#FCFCFD", borderRadius: 6, display: "grid", gap: 3, fontSize: 14 },
  statut: { fontSize: 12.5, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" },
  petit: { fontSize: 12.5, color: "#475467", lineHeight: 1.55 },
  btn: { padding: "6px 12px", borderRadius: 6, border: "1px solid #1F3864", background: "#1F3864", color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 34, display: "inline-flex", alignItems: "center" },
  btnGhost: { padding: "6px 12px", borderRadius: 6, border: "1px solid #D0D5DD", background: "#fff", color: "#344054", cursor: "pointer", fontSize: 13, minHeight: 34 },
  lienBtn: { background: "none", border: "none", color: "#175CD3", cursor: "pointer", fontSize: 12.5, textDecoration: "underline" },
  alerte: { background: "#FFF6E0", color: "#93370D", padding: "8px 12px", borderRadius: 6, fontSize: 13.5 },
  erreur: { background: "#FDECEC", color: "#B42318", padding: "8px 12px", borderRadius: 6, fontSize: 13.5 },
  details: { background: "#F9FAFB", borderRadius: 6, padding: "8px 10px" },
  summary: { cursor: "pointer", fontWeight: 600, color: "#1F3864", fontSize: 13.5 },
  norme: { fontSize: 13, padding: "6px 0", borderBottom: "1px solid #EAECF0" },
  sousTitre: { fontSize: 12, fontWeight: 700, color: "#344054", marginTop: 4 },
  ul: { margin: "4px 0", paddingInlineStart: 18, fontSize: 13, color: "#344054", lineHeight: 1.55 },
};
