/**
 * /mon-espace (et /portal) — espace client (lots 3a / 3b).
 *
 * Session : cookie cli_session ouvert par le lien /mon-dossier/<jeton> ou par
 * « Recevoir mon lien » (functions/_lib/clientSession.ts). Sans session : page
 * d'accès (/login), avec le formulaire « Recevoir mon lien ».
 * Avec session : mes dossiers (GET /api/client/moi), le dossier choisi tel que le
 * client le voit (GET /api/client/dossiers/<id>, même vue que /mon-dossier), et
 * ses devis et factures (DevisFactures : consultation, PDF, acceptation en ligne, paiements par phase),
 * les échanges qui passent TOUS par la plateforme : message ou appel vidéo au
 * cabinet (contexte « dossier »), boîte de messages, appels. Documents : dépôt
 * commun à venir (docs/architecture/contrat-depot-fichiers.md), emplacement réservé.
 * Aucune coordonnée de tiers n'est affichée (seulement celles de CITURBAREA).
 */
import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useLang, useT } from "../../i18n/i18n";
import Login from "../../tomes/tome5/pages/Login";
import { VueDossierClient, type DossierClient } from "../mon-dossier/MonDossierPage";
const DocumentsParPhase = lazy(() => import("../gestion/DocumentsParPhase"));
const GaleriePlans = lazy(() => import("../gestion/GaleriePlans"));
const PORTE_CLIENT = { type: "client" } as const;

const EcrireMessage = lazy(() => import("../messages/EcrireMessage"));
const DemanderAppelVideo = lazy(() => import("../appels/DemanderAppelVideo"));
const BoiteMessages = lazy(() => import("../messages/BoiteMessages"));
const MesAppels = lazy(() => import("../appels/MesAppels"));
const DevisFactures = lazy(() => import("./DevisFactures"));
const CarnetClient = lazy(() => import("../materiaux/CarnetClient"));

type Resume = { id: string; titre: string | null; commune: string | null; porte: string | null; creeLe: string | null; phase: { code: string; titre: string } | null };

export default function MonEspacePage() {
  const t = useT();
  const { lang } = useLang();
  const l: "fr" | "ar" = lang === "ar" ? "ar" : "fr";
  const [etat, setEtat] = useState<"charge" | "anonyme" | "ok" | "indispo">("charge");
  const [nom, setNom] = useState<string | null>(null);
  const [dossiers, setDossiers] = useState<Resume[]>([]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [vue, setVue] = useState<DossierClient | null>(null);

  useEffect(() => {
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, nofollow"; document.head.appendChild(m);
    return () => m.remove();
  }, []);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/client/moi", { cache: "no-store", credentials: "same-origin" });
      if (r.status === 401 || r.status === 503 && (await r.clone().json().catch(() => null))?.error === "access_not_configured") { setEtat("anonyme"); return; }
      const j = await r.json();
      if (!r.ok || !j.ok) { setEtat("indispo"); return; }
      setNom(j.client?.nom ?? null);
      setDossiers(j.dossiers || []);
      setChoisi((c) => c ?? j.dossiers?.[0]?.id ?? null);
      setEtat("ok");
    } catch { setEtat("indispo"); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  useEffect(() => {
    if (!choisi) { setVue(null); return; }
    let actif = true;
    void (async () => {
      const r = await fetch(`/api/client/dossiers/${encodeURIComponent(choisi)}`, { cache: "no-store", credentials: "same-origin" }).catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) : null;
      if (actif) setVue(j?.dossier ?? null);
    })();
    return () => { actif = false; };
  }, [choisi]);

  const deconnecter = async () => {
    await fetch("/api/client/acces/deconnexion", { method: "POST" }).catch(() => null);
    setEtat("anonyme");
  };

  if (etat === "anonyme") return <Login />;
  return (
    <main dir={l === "ar" ? "rtl" : "ltr"} style={S.page}>
      {etat === "charge" && <p style={S.doux}>{t("espace.charge")}</p>}
      {etat === "indispo" && <div style={S.carte}>{t("espace.indispo")}</div>}
      {etat === "ok" && (
        <>
          <div style={S.entete}>
            <div>
              <h1 style={S.h1}>{t("espace.titre")}</h1>
              {nom && <p style={S.doux}>{t("espace.bonjour")} {nom}</p>}
            </div>
            <button type="button" onClick={deconnecter} style={S.lienBtn}>{t("espace.deconnexion")}</button>
          </div>

          <section style={S.carte}>
            <h2 style={S.h2}>{t("espace.mesDossiers")}</h2>
            {dossiers.length === 0 ? <p style={S.doux}>{t("espace.aucunDossier")}</p> : (
              <ul style={S.liste}>
                {dossiers.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setChoisi(d.id)} aria-pressed={choisi === d.id}
                      style={{ ...S.dossier, ...(choisi === d.id ? S.dossierActif : {}) }}>
                      <span style={{ fontWeight: 600 }}>{d.titre || "—"}</span>
                      <span style={S.petit}>{[d.commune, d.phase?.titre].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {vue && choisi && (
            <>
              <VueDossierClient d={vue} langue={l} />

              <section style={S.carte}>
                <h2 style={S.h2}>{l === "ar" ? "عروض الأسعار والفواتير" : "Devis et factures"}</h2>
                <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}>
                  <DevisFactures key={choisi} dossierId={choisi} langue={l} />
                </Suspense>
              </section>
              {/* Carnet des matériaux : propositions du client (à partir de l'APD) et décisions de l'architecte. */}
              <section style={S.carte}>
                <h2 style={S.h2}>{l === "ar" ? "دفتر مواد المشروع" : "Carnet des matériaux du projet"}</h2>
                <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}>
                  <CarnetClient key={choisi} dossierId={choisi} lang={l === "ar" ? "ar" : "fr"} />
                </Suspense>
              </section>

              <section style={{ ...S.carte, background: "#EEF1F7" }}>
                <h2 style={S.h2}>{t("espace.echanger")}</h2>
                <p style={{ ...S.doux, marginBottom: 12 }}>{t("espace.echanger.texte")}</p>
                <Suspense fallback={null}>
                  <div style={S.actions}>
                    <EcrireMessage porte="client" contexte="dossier" objetId={choisi} invites={[{ type: "admin" }]} avecNom="CITURBAREA" sujet={vue.titre ?? undefined} langue={l} variante="navy" />
                    <DemanderAppelVideo porte="client" contexte="dossier" objetId={choisi} invites={[{ type: "admin" }]} avecNom="CITURBAREA" sujet={vue.titre ?? undefined} langue={l} />
                  </div>
                </Suspense>
              </section>

              <section style={S.carte}>
                <h2 style={S.h2}>{l === "ar" ? "التصاميم والمناظر" : "Plans et vues de mon projet"}</h2>
                <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}>
                  <GaleriePlans porte={PORTE_CLIENT} dossierId={choisi} mode="client" langue={l === "ar" ? "ar" : "fr"} videos={vue.videos ?? []} />
                </Suspense>
              </section>

              <section style={S.carte}>
                <h2 style={S.h2}>{t("espace.documents")}</h2>
                <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}>
                  <DocumentsParPhase base={`/api/client/dossiers/${encodeURIComponent(choisi)}/pieces`} mode="client" langue={l === "ar" ? "ar" : "fr"} depot={{ porte: PORTE_CLIENT, contexte: "dossier", objetId: choisi }} />
                </Suspense>
              </section>
            </>
          )}

          <section style={S.carte}>
            <h2 style={S.h2}>{t("espace.messages")}</h2>
            <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}><BoiteMessages source={{ type: "client" }} l={l} titre={null} /></Suspense>
          </section>
          <section style={S.carte}>
            <h2 style={S.h2}>{t("espace.appels")}</h2>
            <Suspense fallback={<p style={S.doux}>{t("espace.charge")}</p>}><MesAppels espace={{ type: "client" }} l={l} titre={null} /></Suspense>
          </section>
        </>
      )}
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: "0 auto", padding: "16px 16px 96px", color: "#1A1F2E", boxSizing: "border-box" },
  entete: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  h1: { fontSize: 24, color: "#1F3864", margin: "0 0 4px" },
  h2: { fontSize: 16, color: "#1F3864", margin: "0 0 8px" },
  doux: { color: "#595959", margin: "0 0 6px", fontSize: 15, lineHeight: 1.5 },
  petit: { fontSize: 13, color: "#595959" },
  carte: { background: "#fff", border: "1px solid #D9D9D9", borderRadius: 10, padding: 14, margin: "12px 0" },
  liste: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 },
  dossier: { width: "100%", display: "grid", gap: 2, textAlign: "start", padding: "10px 12px", minHeight: 44, borderRadius: 8, border: "1px solid #D9D9D9", background: "#FAF7F2", cursor: "pointer", fontSize: 15, color: "#1A1F2E" },
  dossierActif: { borderColor: "#1F3864", boxShadow: "inset 3px 0 0 #1F3864", background: "#fff" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10 },
  lienBtn: { background: "none", border: "none", color: "#1F3864", textDecoration: "underline", cursor: "pointer", fontSize: 14, minHeight: 44 },
};
