/**
 * /mon-dossier/:jeton (et /ar/mon-dossier/:jeton) — le client ouvre son dossier
 * par le lien d'invitation signé envoyé par le cabinet. Lecture seule, mobile
 * d'abord, FR / AR. Le même lien ouvre sa session d'espace client (lot 3a :
 * POST /api/client/acces/lien) : bouton « Mon espace » (/mon-espace).
 * Données : GET /api/mon-dossier/<jeton> — aucune coordonnée de tiers ;
 * seul contact affiché : CITURBAREA (config/contact.ts).
 * VueDossierClient est réutilisée par l'espace client et la vue « shadow » du back-office.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { lienWhatsApp } from "../../config/contact";

type Etape = { code: string; titre: string; statut: string; date: string | null };
export type DossierClient = {
  titre: string | null; commune: string | null; prefecture: string | null; lot: string | null; lotissement: string | null;
  titreFoncier: string | null; gabarit: string | null;
  autorisation: { numero: string | null; date: string | null; expiration: string | null; niveauAlerte: "EXPIREE" | "J90" | null; joursRestants: number | null } | null;
  etatChantier: string | null; client: { nom: string | null }; cabinet: { nom: string | null; architecte: string | null } | null;
  phaseActuelle: { code: string; titre: string } | null; etapes: Etape[]; missionsReglees: Array<{ libelle: string; date: string | null }>;
  frise?: Array<{
    code: string; ordre: number; titre: string; titreAr: string; statut: "FAIT" | "EN_COURS" | "A_VENIR"; dureeSemaines: [number, number] | null; parallele?: boolean; miseAJourPermis?: boolean;
    paiement?: { statut: string; enAttente: boolean; restant: string; dateDemarrage: string | null; factures: Array<{ numero: string; statut: string; du: string; paye: string; restant: string; dateEcheance: string }> };
  }>;
  prochaineEcheance?: { phase: string; numero: string; restant: string; dateEcheance: string } | null;
  dureeTotaleMois?: [number, number] | null; libelleDuree?: string | null;
  piecesClient?: Array<{ phase: string; libelleFr: string; libelleAr: string }>;
  videos?: Array<{ id: string; phase: "ESQ" | "APS" | "APD" | "EXE"; titre: string; lien: string; integration: string; fournisseur: "youtube" | "vimeo"; version: number; publie: boolean; createdAt: string }>;
};

const T = {
  fr: {
    titre: "Mon dossier", bonjour: "Bonjour", suivi: "Dossier suivi par", phase: "Étape en cours", projet: "Projet", situation: "Situation",
    tf: "Titre foncier", aut: "Autorisation", expire: "Expire le", expiree: "Votre autorisation de construire a expiré le",
    j90: (j: number) => `Votre autorisation de construire expire dans ${j} jour(s). Le cabinet peut s'occuper de son renouvellement.`,
    parcours: "Parcours du dossier", fait: "Fait", enCours: "En cours", aVenir: "À venir", etat: "État du chantier", reglees: "Missions déjà réalisées et réglées",
    question: "Une question ? Tout passe par CITURBAREA :", ecrire: "Écrire sur WhatsApp", invalide: "Ce lien n'est plus valable. Demandez un nouveau lien au cabinet ou à CITURBAREA.",
    charge: "Chargement…", indispo: "Service momentanément indisponible. Réessayez dans quelques minutes.", langue: "العربية", lot: "Lot", lotissement: "Lotissement",
    espace: "Mon espace : messages, appels vidéo et tous mes dossiers",
    frise: "Avancement de mon projet", semaines: (a: number, b: number) => (a === b ? `environ ${a} semaine(s)` : `${a} à ${b} semaines`),
    total: (a: number, b: number) => `Durée habituelle d'un projet comme le vôtre : ${a} à ${b} mois.`, indicatif: "Durées indicatives : elles dépendent des décisions, de l'administration et du chantier.",
    parallele: "En parallèle de l'instruction du permis", majPermis: "Mise à jour suite au permis en cours", attentePaiement: "En attente de votre paiement",
    payee: "Réglée", demarree: "Démarrée le", prochaine: "Prochaine échéance", facture: "Facture", reste: "reste à régler", avant: "avant le",
    attendu: "Ce que nous attendons de vous", attenduTexte: "Documents à fournir (déposez-les dans « Mon espace », rubrique Documents) :",
  },
  ar: {
    titre: "ملفي", bonjour: "مرحباً", suivi: "الملف يتابعه", phase: "المرحلة الحالية", projet: "المشروع", situation: "الموقع",
    tf: "الرسم العقاري", aut: "رخصة البناء", expire: "تنتهي في", expiree: "انتهت صلاحية رخصة البناء الخاصة بكم في",
    j90: (j: number) => `تنتهي صلاحية رخصة البناء خلال ${j} يوماً. يمكن للمكتب التكفل بتجديدها.`,
    parcours: "مراحل الملف", fait: "منجز", enCours: "جارٍ", aVenir: "قادم", etat: "حالة الورش", reglees: "مهام أُنجزت وتم أداؤها",
    question: "لديكم سؤال؟ كل شيء يمر عبر CITURBAREA:", ecrire: "راسلونا عبر واتساب", invalide: "هذا الرابط لم يعد صالحاً. اطلبوا رابطاً جديداً من المكتب أو من CITURBAREA.",
    charge: "جارٍ التحميل…", indispo: "الخدمة غير متاحة مؤقتاً. أعيدوا المحاولة بعد دقائق.", langue: "Français", lot: "البقعة", lotissement: "التجزئة",
    espace: "فضائي: الرسائل، مكالمات الفيديو وجميع ملفاتي",
    frise: "تقدم مشروعي", semaines: (a: number, b: number) => (a === b ? `حوالي ${a} أسبوع` : `من ${a} إلى ${b} أسابيع`),
    total: (a: number, b: number) => `المدة المعتادة لمشروع مثل مشروعكم: من ${a} إلى ${b} شهراً.`, indicatif: "مدد تقريبية: تتعلق بالقرارات والإدارة والورش.",
    parallele: "بالموازاة مع دراسة الرخصة", majPermis: "تحيين جارٍ بعد الرخصة", attentePaiement: "في انتظار أدائكم",
    payee: "تم الأداء", demarree: "انطلقت في", prochaine: "الاستحقاق القادم", facture: "الفاتورة", reste: "المتبقي", avant: "قبل",
    attendu: "ما ننتظره منكم", attenduTexte: "الوثائق المطلوبة (أودعوها في «فضائي»، قسم الوثائق):",
  },
};

const date = (s: string | null, ar: boolean) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString(ar ? "ar-MA" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

export default function MonDossierPage({ langue = "fr" }: { langue?: "fr" | "ar" }) {
  const { jeton = "" } = useParams();
  const ar = langue === "ar", t = T[langue];
  const [d, setD] = useState<DossierClient | null>(null);
  const [session, setSession] = useState(false);
  const [etat, setEtat] = useState<"charge" | "ok" | "invalide" | "indispo">("charge");

  useEffect(() => {
    const ajouts = [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]].map(([n, c]) => {
      const m = document.createElement("meta"); m.name = n; m.content = c; document.head.appendChild(m); return m;
    });
    document.title = `${t.titre} | CITURBAREA`;
    return () => ajouts.forEach((m) => m.remove());
  }, [t.titre]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/mon-dossier/${encodeURIComponent(jeton)}`, { cache: "no-store" });
        if (r.status === 404) { setEtat("invalide"); return; }
        const j = await r.json();
        if (!r.ok || !j.ok) { setEtat("indispo"); return; }
        setD(j.dossier); setEtat("ok");
        // Le lien ouvre aussi la session de l'espace client (cookie, 30 jours) ; sans effet s'il n'y a pas de compte client.
        const s = await fetch("/api/client/acces/lien", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jeton }) }).catch(() => null);
        setSession(!!s?.ok);
      } catch { setEtat("indispo"); }
    })();
  }, [jeton]);

  const autre = ar ? `/mon-dossier/${jeton}` : `/ar/mon-dossier/${jeton}`;
  return (
    <main dir={ar ? "rtl" : "ltr"} style={S.page}>
      <div style={S.entete}>
        <span style={S.marque}>CITURBAREA</span>
        <a href={autre} style={S.langue}>{t.langue}</a>
      </div>
      {etat === "charge" && <p style={S.doux}>{t.charge}</p>}
      {etat === "invalide" && <div style={S.carte}>{t.invalide}</div>}
      {etat === "indispo" && <div style={S.carte}>{t.indispo}</div>}
      {etat === "ok" && d && (
        <>
          <VueDossierClient d={d} langue={langue} />
          {session && <Link to="/mon-espace" style={{ ...S.bouton, display: "block", textAlign: "center", margin: "12px 0" }}>{t.espace}</Link>}

          <section style={{ ...S.carte, background: "#EEF1F7" }}>
            <p style={{ margin: "0 0 8px" }}>{t.question}</p>
            <a href={lienWhatsApp(`Dossier : ${d.titre ?? ""}`)} style={S.bouton} target="_blank" rel="noreferrer">{t.ecrire}</a>
          </section>
        </>
      )}
    </main>
  );
}

/** Le dossier tel que le voit le client (titre, alertes, phase, projet, parcours). */
export function VueDossierClient({ d, langue = "fr" }: { d: DossierClient; langue?: "fr" | "ar" }) {
  const ar = langue === "ar", t = T[langue];
  return (
    <>
    <h1 style={S.h1}>{d.titre}</h1>
    {d.client.nom && <p style={S.doux}>{t.bonjour} {d.client.nom}</p>}
    {d.cabinet?.nom && <p style={S.doux}>{t.suivi} {d.cabinet.nom}{d.cabinet.architecte ? ` — ${d.cabinet.architecte}` : ""}</p>}

    {d.autorisation?.niveauAlerte === "EXPIREE" && <div style={S.alerte}>{t.expiree} {date(d.autorisation.expiration, ar)}.</div>}
    {d.autorisation?.niveauAlerte === "J90" && d.autorisation.joursRestants != null && <div style={S.alerte}>{t.j90(d.autorisation.joursRestants)}</div>}

    {d.phaseActuelle && (
      <div style={{ ...S.carte, borderInlineStart: "4px solid #1F3864" }}>
        <div style={S.petit}>{t.phase}</div>
        <div style={{ fontWeight: 600, fontSize: 17 }}>{d.phaseActuelle.titre}</div>
      </div>
    )}

    <section style={S.carte}>
      <h2 style={S.h2}>{t.projet}</h2>
      <Ligne k={t.situation} v={[d.commune, d.prefecture].filter(Boolean).join(" — ")} />
      <Ligne k={t.lot} v={d.lot} />
      <Ligne k={t.lotissement} v={d.lotissement} />
      <Ligne k={t.tf} v={d.titreFoncier} />
      {d.autorisation && <Ligne k={t.aut} v={[d.autorisation.numero, d.autorisation.date ? date(d.autorisation.date, ar) : null].filter(Boolean).join(" · ")} />}
      {d.autorisation?.expiration && <Ligne k={t.expire} v={date(d.autorisation.expiration, ar)} />}
    </section>

    {(d.etatChantier || d.missionsReglees.length > 0) && (
      <section style={S.carte}>
        {d.etatChantier && <><h2 style={S.h2}>{t.etat}</h2><p style={{ margin: "0 0 8px" }}>{d.etatChantier}</p></>}
        {d.missionsReglees.length > 0 && <>
          <div style={S.petit}>{t.reglees}</div>
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>{d.missionsReglees.map((m, i) => <li key={i}>{m.libelle}{m.date ? ` (${date(m.date, ar)})` : ""}</li>)}</ul>
        </>}
      </section>
    )}

    {d.frise && d.frise.length > 0 && (
      <section style={S.carte}>
        <h2 style={S.h2}>{t.frise}</h2>
        {d.dureeTotaleMois && <p style={{ ...S.petit, margin: "0 0 8px" }}>{t.total(d.dureeTotaleMois[0], d.dureeTotaleMois[1])}</p>}
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {d.frise.map((p) => {
            const fait = p.statut === "FAIT", cours = p.statut === "EN_COURS";
            return (
              <li key={p.code} style={{ ...S.etape, alignItems: "flex-start", ...(cours ? { background: "#EEF1F7", borderRadius: 8, padding: "8px 6px" } : {}) }}>
                <span style={{ ...S.puce, marginTop: 4, background: fait ? "#6B7F5C" : cours ? "#1F3864" : "#D9D9D9" }} aria-hidden />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: cours ? 700 : 400, color: fait || cours ? "#1A1F2E" : "#8B91A1" }}>{ar ? p.titreAr : p.titre}</span>
                  {p.dureeSemaines && !fait && <span style={S.petit}>{t.semaines(p.dureeSemaines[0], p.dureeSemaines[1])}</span>}
                  {p.parallele && <span style={{ ...S.petit, display: "block" }}>{t.parallele}</span>}
                  {p.miseAJourPermis && <span style={{ ...S.petit, display: "block", color: "#93370D" }}>{t.majPermis}</span>}
                  {p.paiement?.enAttente && <span style={{ ...S.petit, display: "block", color: "#B42318", fontWeight: 700 }}>{t.attentePaiement}</span>}
                  {p.paiement?.statut === "PAYEE" && <span style={{ ...S.petit, display: "block", color: "#067647" }}>{t.payee}{p.paiement.dateDemarrage ? ` · ${t.demarree} ${date(p.paiement.dateDemarrage, ar)}` : ""}</span>}
                </span>
                <span style={S.petit}>{fait ? t.fait : cours ? t.enCours : t.aVenir}</span>
              </li>
            );
          })}
        </ol>
        <p style={{ ...S.petit, margin: "8px 0 0" }}>{t.indicatif}</p>
      </section>
    )}

    {d.prochaineEcheance && (
      <div style={{ ...S.carte, borderInlineStart: "4px solid #B8860B" }}>
        <div style={S.petit}>{t.prochaine}</div>
        <div style={{ fontWeight: 600 }}>
          {t.facture} {d.prochaineEcheance.numero} — {t.reste} {Number(d.prochaineEcheance.restant).toLocaleString(ar ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2 })} DH {t.avant} {date(d.prochaineEcheance.dateEcheance.slice(0, 10), ar)}
        </div>
      </div>
    )}

    {d.piecesClient && d.piecesClient.length > 0 && (
      <section style={S.carte}>
        <h2 style={S.h2}>{t.attendu}</h2>
        <p style={{ ...S.petit, margin: "0 0 6px" }}>{t.attenduTexte}</p>
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>{d.piecesClient.slice(0, 12).map((x) => <li key={`${x.phase}-${x.libelleFr}`}>{ar ? x.libelleAr : x.libelleFr}</li>)}</ul>
      </section>
    )}

    {!d.frise?.length && <section style={S.carte}>
      <h2 style={S.h2}>{t.parcours}</h2>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {d.etapes.map((e) => {
          const fait = e.statut === "FAITE_HORS_PLATEFORME" || e.statut === "FAITE", cours = e.statut === "EN_COURS";
          return (
            <li key={e.code} style={S.etape}>
              <span style={{ ...S.puce, background: fait ? "#6B7F5C" : cours ? "#1F3864" : "#D9D9D9" }} aria-hidden />
              <span style={{ flex: 1, fontWeight: cours ? 600 : 400, color: fait || cours ? "#1A1F2E" : "#8B91A1" }}>{e.titre}</span>
              <span style={S.petit}>{fait ? `${t.fait}${e.date ? ` · ${date(e.date, ar)}` : ""}` : cours ? t.enCours : t.aVenir}</span>
            </li>
          );
        })}
      </ol>
    </section>}
    </>
  );
}

function Ligne({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return <div style={S.ligne}><span style={S.petit}>{k}</span><span>{v}</span></div>;
}

const S: Record<string, CSSProperties> = {
  page: { maxWidth: 640, margin: "0 auto", padding: "16px 16px 40px", fontFamily: "Calibri, 'Segoe UI', system-ui, sans-serif", color: "#1A1F2E", background: "#FAF7F2", minHeight: "100vh", boxSizing: "border-box" },
  entete: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  marque: { fontWeight: 700, letterSpacing: 1, color: "#1F3864" },
  langue: { fontSize: 14, color: "#1F3864" },
  h1: { fontSize: 22, color: "#1F3864", margin: "0 0 6px", lineHeight: 1.3 },
  h2: { fontSize: 16, color: "#1F3864", margin: "0 0 8px" },
  doux: { color: "#595959", margin: "0 0 6px", fontSize: 15 },
  petit: { fontSize: 13, color: "#595959" },
  carte: { background: "#fff", border: "1px solid #D9D9D9", borderRadius: 10, padding: 14, margin: "12px 0" },
  alerte: { background: "#FBEAEA", color: "#C00000", borderRadius: 10, padding: 12, margin: "12px 0", fontSize: 15 },
  ligne: { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #F0F0F0", flexWrap: "wrap" },
  etape: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F0F0F0", flexWrap: "wrap" },
  puce: { width: 10, height: 10, borderRadius: "50%", flex: "0 0 10px" },
  bouton: { display: "inline-block", background: "#1F3864", color: "#fff", padding: "10px 16px", borderRadius: 8, textDecoration: "none" },
};
