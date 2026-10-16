/**
 * Page d'une étape vue par le client dans /mon-espace (lot GP6) — même structure que la page
 * admin, en lecture et en contribution : phase et paiement, documents à fournir (dépôt commun),
 * plans et vues publiés, intervenants (nom et rôle seulement), matériaux (à partir de l'APD,
 * l'architecte valide), message et appel vidéo par la plateforme. FR / AR.
 * GET /api/client/dossiers/:id/etapes/:code.
 */
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import type { PhasePlan, VideoLien } from "../../../../../packages/contracts/src/gestion/plans";

const DocumentsParPhase = lazy(() => import("../gestion/DocumentsParPhase"));
const GaleriePlans = lazy(() => import("../gestion/GaleriePlans"));
const EcrireMessage = lazy(() => import("../messages/EcrireMessage"));
const DemanderAppelVideo = lazy(() => import("../appels/DemanderAppelVideo"));
const PORTE_CLIENT = { type: "client" } as const;

type Donnees = {
  info: { code: string; titre: string; phaseRef: string | null; phaseTitre: string | null; phaseTitreAr: string | null; phaseGraphique: PhasePlan | null; chantier: boolean; clientProposeMateriaux: boolean };
  dossier: { id: string; titre: string | null };
  phaseFrise: { statut: string; parallele?: boolean; paiement?: { statut: string; enAttente: boolean; dateDemarrage: string | null } } | null;
  planning: { datePrevueDebut: string | null; datePrevueFin: string | null };
  videos: Array<Omit<VideoLien, "auteur">>;
  intervenants: Array<{ id: string; genre: string; nom: string; role: string }>;
};

const T = {
  fr: {
    fermer: "Fermer", statut: { FAIT: "Terminée", EN_COURS: "En cours", A_VENIR: "À venir" } as Record<string, string>, prevu: "Prévu", au: "au",
    attente: "En attente de votre paiement", demarree: "Démarrée le", documents: "Documents de cette étape", plans: "Plans et vues", intervenants: "Intervenants",
    materiaux: "Matériaux", materiauxTexte: "Vous pouvez proposer des matériaux depuis la matériauthèque ; l'architecte les valide.", ouvrirMat: "Ouvrir la matériauthèque",
    echanger: "Une question sur cette étape ?", aucun: "Aucun pour le moment.", parallele: "En parallèle de l'instruction du permis",
    roles: { ENTREPRISE: "Entreprise", BET_STRUCTURE: "Bureau d'études structure", BET_FLUIDES: "Bureau d'études fluides", LABORATOIRE: "Laboratoire", TOPOGRAPHE: "Topographe", BUREAU_CONTROLE: "Bureau de contrôle", FOURNISSEUR: "Fournisseur" } as Record<string, string>,
  },
  ar: {
    fermer: "إغلاق", statut: { FAIT: "منتهية", EN_COURS: "جارية", A_VENIR: "قادمة" } as Record<string, string>, prevu: "المتوقع", au: "إلى",
    attente: "في انتظار أدائكم", demarree: "انطلقت في", documents: "وثائق هذه المرحلة", plans: "التصاميم والمناظر", intervenants: "المتدخلون",
    materiaux: "المواد", materiauxTexte: "يمكنكم اقتراح مواد من مكتبة المواد، والمهندس يصادق عليها.", ouvrirMat: "فتح مكتبة المواد",
    echanger: "سؤال حول هذه المرحلة؟", aucun: "لا شيء حالياً.", parallele: "بالموازاة مع دراسة الرخصة",
    roles: { ENTREPRISE: "مقاولة", BET_STRUCTURE: "مكتب دراسات البنية", BET_FLUIDES: "مكتب دراسات الشبكات", LABORATOIRE: "مختبر", TOPOGRAPHE: "طوبوغرافي", BUREAU_CONTROLE: "مكتب المراقبة", FOURNISSEUR: "مورد" } as Record<string, string>,
  },
};
const date = (s: string | null, ar: boolean) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString(ar ? "ar-MA" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

export default function EtapeClient({ dossierId, code, langue = "fr", fermer }: { dossierId: string; code: string; langue?: "fr" | "ar"; fermer: () => void }) {
  const t = T[langue], ar = langue === "ar";
  const [d, setD] = useState<Donnees | null | "erreur">(null);
  useEffect(() => {
    setD(null);
    void fetch(`/api/client/dossiers/${encodeURIComponent(dossierId)}/etapes/${encodeURIComponent(code)}`, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j) => setD(j?.ok ? j : "erreur")).catch(() => setD("erreur"));
  }, [dossierId, code]);
  if (d === null) return <section style={S.carte}><p style={S.petit}>…</p></section>;
  if (d === "erreur") return null;
  const f = d.phaseFrise;
  return (
    <section style={{ ...S.carte, borderInlineStart: "4px solid #1F3864" }} dir={ar ? "rtl" : "ltr"} lang={langue}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <h2 style={S.h2}>{ar ? d.info.phaseTitreAr ?? d.info.phaseTitre : d.info.phaseTitre}</h2>
        <button type="button" onClick={fermer} style={S.lienBtn}>{t.fermer}</button>
      </div>
      <p style={S.petit}>
        {f ? t.statut[f.statut] ?? f.statut : ""}{f?.parallele ? ` · ${t.parallele}` : ""}
        {d.planning.datePrevueDebut ? ` · ${t.prevu} : ${date(d.planning.datePrevueDebut, ar)}${d.planning.datePrevueFin ? ` ${t.au} ${date(d.planning.datePrevueFin, ar)}` : ""}` : ""}
      </p>
      {f?.paiement?.enAttente && <p style={{ ...S.petit, color: "#B42318", fontWeight: 700 }}>{t.attente}</p>}
      {f?.paiement?.dateDemarrage && <p style={S.petit}>{t.demarree} {date(f.paiement.dateDemarrage, ar)}</p>}

      {d.info.phaseRef && (
        <>
          <h3 style={S.h3}>{t.documents}</h3>
          <Suspense fallback={null}>
            <DocumentsParPhase base={`/api/client/dossiers/${encodeURIComponent(dossierId)}/pieces`} mode="client" langue={langue} seulementPhase={d.info.phaseRef}
              depot={{ porte: PORTE_CLIENT, contexte: "dossier", objetId: dossierId }} />
          </Suspense>
        </>
      )}
      {d.info.phaseGraphique && (
        <>
          <h3 style={S.h3}>{t.plans}</h3>
          <Suspense fallback={null}><GaleriePlans porte={PORTE_CLIENT} dossierId={dossierId} mode="client" langue={langue} phaseUnique={d.info.phaseGraphique} videos={d.videos} /></Suspense>
        </>
      )}
      <h3 style={S.h3}>{t.intervenants}</h3>
      {d.intervenants.length ? <ul style={{ margin: 0, paddingInlineStart: 18 }}>{d.intervenants.map((i) => <li key={i.id}>{i.nom} — {t.roles[i.role] ?? i.role}</li>)}</ul> : <p style={S.petit}>{t.aucun}</p>}
      {d.info.clientProposeMateriaux && (
        <>
          <h3 style={S.h3}>{t.materiaux}</h3>
          <p style={S.petit}>{t.materiauxTexte}</p>
          <a href={`/materiaux?dossier=${encodeURIComponent(dossierId)}&etape=${encodeURIComponent(code)}`} style={S.lien}>{t.ouvrirMat}</a>
        </>
      )}
      <h3 style={S.h3}>{t.echanger}</h3>
      <Suspense fallback={null}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <EcrireMessage porte="client" contexte="dossier" objetId={dossierId} invites={[{ type: "admin" }]} avecNom="CITURBAREA" sujet={`${d.dossier.titre ?? ""} — ${d.info.phaseTitre ?? ""}`} langue={langue} variante="navy" />
          <DemanderAppelVideo porte="client" contexte="dossier" objetId={dossierId} invites={[{ type: "admin" }]} avecNom="CITURBAREA" sujet={d.info.phaseTitre ?? undefined} langue={langue} />
        </div>
      </Suspense>
    </section>
  );
}

const S: Record<string, CSSProperties> = {
  carte: { background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 16, margin: "12px 0" },
  h2: { fontSize: 18, margin: "0 0 4px", color: "#1F3864" },
  h3: { fontSize: 15, margin: "14px 0 6px", color: "#1F3864" },
  petit: { fontSize: 13.5, color: "#475467", margin: "2px 0" },
  lien: { color: "#175CD3", fontWeight: 600 },
  lienBtn: { background: "none", border: "none", color: "#175CD3", cursor: "pointer", fontSize: 14, textDecoration: "underline", minHeight: 44 },
};
