/**
 * /cercles/espace — espace du pro : connexion par code à usage unique (lien
 * magique : #email=…&code=…), fiche société prédisposée par métier, fiches
 * produit, prestations, prix des matériaux du référentiel, import tableur,
 * documents justificatifs, coordonnées. Trilingue (FR / AR / EN).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CHAMPS_FICHE, DOCUMENTS, type Score } from "../../domain/cercles/gabarits";
import { CATEGORIES_L3, REGIONS_L3 } from "../../domain/cercles/libelles";
import { CATALOGUE } from "../../domain/materiaux/catalogue";
import { lignesImport, lireTableau, modeleCsv } from "../../domain/materiaux/csv";
import { REGIONS_MA, VILLES_MA } from "../../domain/materiaux/regions";
import { apiFournisseurs, codeErreur, ErreurApi, type Fiche, type FicheSaisie, type FournisseurPrive, type Moi } from "./api";
import DocumentsPro from "./DocumentsPro";
import FicheForm from "./FicheForm";
import FicheSocieteForm from "./FicheSocieteForm";
import ProduitsPro from "./ProduitsPro";
import ServicesPro from "./ServicesPro";
import { useTextes, type CleTexte } from "./textes";
import { BadgeStatut, Champ, PageFournisseurs, Puces, T } from "./ui";
import MesAppels from "../appels/MesAppels";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";

type Etat = { phase: "chargement" } | { phase: "connexion" } | { phase: "connecte"; m: Moi };

export default function EspaceFournisseurPage() {
  const x = useTextes();
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const charger = useCallback(async () => {
    try { setEtat({ phase: "connecte", m: await apiFournisseurs.moi() }); } catch { setEtat({ phase: "connexion" }); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  return (
    <PageFournisseurs>
      {etat.phase === "chargement" && <p>{x.t("chargement")}</p>}
      {etat.phase === "connexion" && <Connexion onConnecte={charger} />}
      {etat.phase === "connecte" && <Espace m={etat.m} recharger={charger} onDeconnecte={() => setEtat({ phase: "connexion" })} />}
    </PageFournisseurs>
  );
}

function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const x = useTextes();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [info, setInfo] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const verifier = useCallback(async (e: string, c: string) => {
    setErreur(""); setEnvoi(true);
    try { await apiFournisseurs.verifierCode(e, c); onConnecte(); }
    catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }, [onConnecte]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lien magique reçu par e-mail : le code est dans le fragment (#), jamais envoyé au serveur dans l'URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const e = p.get("email"), c = p.get("code");
    if (e && c) {
      history.replaceState(null, "", window.location.pathname);
      setEmail(e); setCode(c); setEtape("code");
      void verifier(e, c);
    }
  }, [verifier]);

  async function demander(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(""); setEnvoi(true);
    try { const r = await apiFournisseurs.demanderCode(email); setInfo(x.t(r.envoi === "email" ? "codeEnvoyeEmail" : "codeEnvoyeAdmin")); setEtape("code"); }
    catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <h1 className="frn-titre">{x.t("cnxTitre")}</h1>
      <p className="frn-chapo">{x.t("cnxChapo")}</p>
      {etape === "email" ? (
        <form className="frn-carte" onSubmit={demander} style={{ display: "grid", gap: 14 }}>
          <Champ label={x.t("email")}><input className="frn-input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Champ>
          {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
          <button className="frn-btn" disabled={envoi}>{envoi ? x.t("envoi") : x.t("recevoirCode")}</button>
          <small>{x.t("pasInscrit")} <Link to="/cercles/inscription">{x.t("navInscription")}</Link></small>
        </form>
      ) : (
        <form className="frn-carte" onSubmit={(e) => { e.preventDefault(); void verifier(email, code); }} style={{ display: "grid", gap: 14 }}>
          {info && <div className="frn-alerte frn-info">{info}</div>}
          <Champ label={x.t("code6")}>
            <input className="frn-input" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric"
              autoComplete="one-time-code" required style={{ letterSpacing: 6, fontSize: 22, textAlign: "center" }} />
          </Champ>
          {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
          <button className="frn-btn" disabled={envoi || code.length !== 6}>{envoi ? x.t("verification") : x.t("ouvrirEspace")}</button>
          <button type="button" className="frn-btn frn-btn-ghost" onClick={() => { setEtape("email"); setCode(""); setErreur(""); }}>{x.t("changerAdresse")}</button>
        </form>
      )}
    </div>
  );
}

type Onglet = "fiche" | "produits" | "services" | "prix" | "import" | "documents" | "appels" | "profil";

function libelleManquant(cle: string, x: ReturnType<typeof useTextes>): string {
  if (cle === "description") return x.t("presentation");
  if (cle === "logoUrl") return x.t("logo");
  if (cle === "zonesLivraison") return x.t("zonesIntervention");
  if (cle === "categories") return x.t("categories");
  return x.l3(CHAMPS_FICHE[cle]?.libelle) || cle;
}

function PanneauScore({ s }: { s: Score }) {
  const x = useTextes();
  return (
    <div className="frn-carte" style={{ display: "grid", gap: 8, padding: 16 }}>
      <strong>{x.t("scoreTitre", { n: s.total })}</strong>
      <div className="frn-barre" role="progressbar" aria-valuenow={s.total} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${s.total}%` }} /></div>
      <small style={{ color: T.inkMid }}>{x.t("scoreAide")}</small>
      {!!s.manquants.length && <small>{x.t("scoreManquants", { liste: s.manquants.slice(0, 8).map((c) => libelleManquant(c, x)).join(", ") })}{s.manquants.length > 8 ? "…" : ""}</small>}
      {!!s.documentsManquants.length && <small>{x.t("scoreDocs", { liste: s.documentsManquants.map((d) => x.l3(DOCUMENTS[d])).join(", ") })}</small>}
    </div>
  );
}

function Espace({ m, recharger, onDeconnecte }: { m: Moi; recharger: () => void; onDeconnecte: () => void }) {
  const x = useTextes();
  const f = m.fournisseur;
  const [onglet, setOnglet] = useState<Onglet>("fiche");
  const onglets: [Onglet, CleTexte, number?][] = [
    ["fiche", "tab_fiche"],
    ...(m.peutPublierFiches ? [["produits", "tab_produits", m.produits.length] as [Onglet, CleTexte, number]] : []),
    ["services", "tab_services", m.services.length],
    ...(m.peutPublierFiches ? [["prix", "tab_prix", m.fiches.length] as [Onglet, CleTexte, number], ["import", "tab_import"] as [Onglet, CleTexte]] : []),
    ["documents", "tab_documents"],
    // Demandes d'appel vidéo reçues et envoyées (features/appels, /api/cercles/espace/appels).
    ["appels", "tab_appels"],
    ["profil", "tab_profil"],
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="frn-titre" style={{ marginInlineEnd: "auto" }}>{x.lang === "ar" && f.raisonSocialeAr ? f.raisonSocialeAr : f.raisonSociale}</h1>
        <BadgeStatut statut={f.statut} />
        <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => { try { await apiFournisseurs.deconnexion(); } finally { onDeconnecte(); } }}>{x.t("deconnexion")}</button>
      </div>
      {f.statut === "PENDING" && <div className="frn-alerte frn-warn">{x.t("alerteAttente")}</div>}
      {f.statut === "APPROVED" && <div className="frn-alerte frn-ok">{x.t("alerteVerifie")} <Link to={`${x.lang === "ar" ? "/ar" : ""}/cercles/pro/${f.slug}`}>{x.t("voirFiche")}</Link></div>}
      {f.statut === "REJECTED" && f.motifRejet && <div className="frn-alerte frn-ko">{x.t("motif", { m: f.motifRejet })}</div>}
      <div style={{ marginTop: 14 }}><PanneauScore s={m.score} /></div>

      <div className="frn-onglets" role="tablist">
        {onglets.map(([k, cle, n]) => (
          <button key={k} role="tab" aria-selected={onglet === k} className={`frn-onglet${onglet === k ? " frn-onglet-on" : ""}`} onClick={() => setOnglet(k)}>
            {x.t(cle, { n: n ?? 0 })}
          </button>
        ))}
      </div>

      {onglet === "fiche" && <FicheSocieteForm f={f} recharger={recharger} />}
      {onglet === "produits" && <ProduitsPro f={f} produits={m.produits} recharger={recharger} />}
      {onglet === "services" && <ServicesPro f={f} services={m.services} recharger={recharger} />}
      {onglet === "prix" && <Fiches f={f} fiches={m.fiches} recharger={recharger} />}
      {onglet === "import" && <Import f={f} recharger={recharger} />}
      {onglet === "documents" && <DocumentsPro f={f} recharger={recharger} />}
      {onglet === "appels" && (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <div><DemanderAppelVideo porte="pro" contexte="cercles" objetId={f.slug} invites={[{ type: "admin" }]} avecNom="CITURBAREA" libelle={x.lang === "ar" ? "طلب مكالمة فيديو مع المكتب" : "Demander un appel vidéo au cabinet"} variante="navy" /></div>
          <MesAppels espace={{ type: "pro" }} l={x.lang === "ar" ? "ar" : "fr"} />
        </div>
      )}
      {onglet === "profil" && <Profil f={f} recharger={recharger} />}
    </>
  );
}

function Fiches({ f, fiches, recharger }: { f: FournisseurPrive; fiches: Fiche[]; recharger: () => void }) {
  const x = useTextes();
  const [edition, setEdition] = useState<Fiche | "nouvelle" | null>(null);
  const [historique, setHistorique] = useState<{ id: string; lignes: { at: string; action: string; prixHT: number; uniteVente: string }[] } | null>(null);
  const [erreur, setErreur] = useState("");

  if (edition) {
    return <FicheForm categories={f.categories} regionParDefaut={f.region} initiale={edition === "nouvelle" ? undefined : edition}
      onEnregistree={() => { setEdition(null); recharger(); }} onAnnuler={() => setEdition(null)} />;
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="frn-btn frn-btn-or" onClick={() => setEdition("nouvelle")}>{x.t("ajouterFiche")}</button>
        <small style={{ color: T.inkMid }}>{x.t("unParMateriau")}</small>
      </div>
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      {!fiches.length ? (
        <div className="frn-carte">{x.t("aucuneFiche")}</div>
      ) : (
        <div className="frn-defil">
          <table className="frn-table frn-cartes-mobile">
            <thead><tr><th>{x.t("col_materiau")}</th><th>{x.t("col_prixHT")}</th><th>{x.t("col_chiffrage")}</th><th>{x.t("col_dispo")}</th><th>{x.t("col_validite")}</th><th>{x.t("col_statut")}</th><th /></tr></thead>
            <tbody>
              {fiches.map((y) => (
                <tr key={y.id}>
                  <td data-l={x.t("col_materiau")}><strong lang="fr">{y.libelle}</strong><br /><small style={{ color: T.inkMuted }}>{y.materiauCode}</small></td>
                  <td data-l={x.t("col_prixHT")}>{x.dh(y.prixHT)} / {y.uniteVenteLibelle}</td>
                  <td data-l={x.t("col_chiffrage")}>{x.dh(y.prixRefHT, 3)} / {y.uniteRef}</td>
                  <td data-l={x.t("col_dispo")}>{x.t(`dispo_${y.disponibilite}` as CleTexte) || y.disponibilite}</td>
                  <td data-l={x.t("col_validite")}>{x.date(y.validiteJusquau)}</td>
                  <td data-l={x.t("col_statut")}><BadgeStatut statut={y.statut} offre />{y.signalement && <><br /><small style={{ color: T.warn }}>{x.t("ecart", { n: Math.round((y.ecartRef || 0) * 100) })}</small></>}</td>
                  <td data-l="">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setEdition(y)}>{x.t("modifier")}</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        try { const h = await apiFournisseurs.historique(y.id); setHistorique({ id: y.id, lignes: h.historique }); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
                      }}>{x.t("historique")}</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        if (!window.confirm(x.t("confirmerRetrait", { x: y.libelle }))) return;
                        try { await apiFournisseurs.supprimerFiche(y.id); recharger(); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
                      }}>{x.t("retirer")}</button>
                    </div>
                    {historique?.id === y.id && (
                      <ul className="frn-liste" style={{ margin: "8px 0 0", fontSize: 13, color: T.inkMid }}>
                        {historique.lignes.map((h, i) => <li key={i}>{x.date(h.at)} — {h.action.toLowerCase().replace("_", " ")}{h.prixHT != null ? ` : ${x.dh(h.prixHT)} / ${h.uniteVente}` : ""}</li>)}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Import({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const x = useTextes();
  const [texte, setTexte] = useState("");
  const [resultat, setResultat] = useState<{ importees: number; erreurs: number; resultats: { ligne: number; ok: boolean; materiauCode?: string; error?: string; signalement?: string | null }[] } | null>(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const zone = f.region || "national";
  const apercu = texte.trim() ? lignesImport(lireTableau(texte), zone) : null;

  function telechargerModele() {
    const refs = CATALOGUE.filter((r) => r.actif !== false && (!f.categories.length || f.categories.includes(r.categorie)));
    const url = URL.createObjectURL(new Blob([modeleCsv(refs)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "modele-fiches-prix-citurbarea.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function envoyer() {
    if (!apercu || !apercu.lignes.length) return;
    setErreur(""); setEnvoi(true);
    try { const r = await apiFournisseurs.importer(apercu.lignes as FicheSaisie[]); setResultat(r); recharger(); }
    catch (e) { setErreur(e instanceof ErreurApi && e.code === "trop_de_lignes" ? x.t("max300") : x.erreur(codeErreur(e))); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <ol className="frn-liste">
        <li>{x.t("imp1")}</li>
        <li>{x.t("imp2", { zone: x.l3(REGIONS_L3[zone]) })}</li>
        <li>{x.t("imp3")}</li>
      </ol>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={telechargerModele}>{x.t("telechargerModele")}</button>
        <label className="frn-btn frn-btn-ghost">
          {x.t("choisirCsv")}
          <input type="file" accept=".csv,.txt,text/csv" style={{ display: "none" }} onChange={async (e) => { const fi = e.target.files?.[0]; if (fi) setTexte(await fi.text()); }} />
        </label>
      </div>
      <textarea className="frn-input" dir="ltr" rows={8} placeholder={x.t("coller")} value={texte} onChange={(e) => { setTexte(e.target.value); setResultat(null); }} />
      {apercu && (apercu.enteteManquante
        ? <div className="frn-alerte frn-ko">{x.t("enteteManquante")}</div>
        : <div className="frn-alerte frn-info">{x.t("lignesAvecPrix", { n: apercu.lignes.length, m: apercu.ignorees })}</div>)}
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      <div><button className="frn-btn" disabled={envoi || !apercu?.lignes.length} onClick={envoyer}>{envoi ? x.t("importEnCours") : x.t("importer")}</button></div>
      {resultat && (
        <div className={`frn-alerte ${resultat.erreurs ? "frn-warn" : "frn-ok"}`}>
          {x.t("resultatImport", { n: resultat.importees, m: resultat.erreurs })}
          {resultat.resultats.some((r) => !r.ok || r.signalement) && (
            <ul className="frn-liste" style={{ marginTop: 6 }}>
              {resultat.resultats.filter((r) => !r.ok || r.signalement).map((r) => (
                <li key={r.ligne}>{x.t("ligneErreur", { n: r.ligne + 1, code: r.materiauCode || "", msg: r.ok ? x.t("ecartVerif") : x.erreur(r.error || null) })}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Profil({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const x = useTextes();
  const [v, setV] = useState({ contactNom: f.contactNom || "", ville: f.ville, telephone: f.telephone, ice: f.ice || "", logoUrl: f.logoUrl || "", siteWeb: f.siteWeb || "" });
  const [zones, setZones] = useState<string[]>(f.zonesLivraison);
  const [categories, setCategories] = useState<string[]>(f.categories);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    try { await apiFournisseurs.majProfil({ ...v, zonesLivraison: zones, categories }); setMsg({ ok: true, t: x.t("enregistre") }); recharger(); }
    catch (err) { setMsg({ ok: false, t: x.erreur(codeErreur(err)) }); }
  }
  return (
    <form className="frn-carte" onSubmit={enregistrer} style={{ display: "grid", gap: 14 }}>
      <div className="frn-grille2">
        <Champ label={x.t("raisonSociale")} aide={x.t("modifiableEquipe")}><input className="frn-input" value={f.raisonSociale} disabled /></Champ>
        <Champ label={x.t("email")} aide={x.t("identifiantConnexion")}><input className="frn-input" dir="ltr" value={f.email} disabled /></Champ>
        <Champ label={x.t("contactNom")}><input className="frn-input" value={v.contactNom} onChange={maj("contactNom")} /></Champ>
        <Champ label={x.t("ville")}><input className="frn-input" value={v.ville} onChange={maj("ville")} list="frn-villes-p" /><datalist id="frn-villes-p">{VILLES_MA.map((y) => <option key={y} value={y} />)}</datalist></Champ>
        <Champ label={x.t("telephone")} aide={x.t("telAide")}><input className="frn-input" type="tel" dir="ltr" value={v.telephone} onChange={maj("telephone")} /></Champ>
        <Champ label={x.t("ice")} aide={x.t("iceAide")}><input className="frn-input" dir="ltr" value={v.ice} onChange={maj("ice")} inputMode="numeric" /></Champ>
        <Champ label={x.t("logo")} aide={x.t("logoAide")}><input className="frn-input" type="url" dir="ltr" value={v.logoUrl} onChange={maj("logoUrl")} /></Champ>
        <Champ label={x.t("siteWeb")} aide={x.t("facultatif")}><input className="frn-input" type="url" dir="ltr" value={v.siteWeb} onChange={maj("siteWeb")} /></Champ>
      </div>
      <Champ label={x.t("zonesIntervention")}>
        <Puces options={[["national", x.t("toutMaroc")], ...REGIONS_MA.map((r) => [r.code, x.l3(REGIONS_L3[r.code])] as [string, string])]} valeurs={zones} onChange={setZones} />
      </Champ>
      <Champ label={x.t("categories")}><Puces options={Object.entries(CATEGORIES_L3).map(([c, l]) => [c, x.l3(l)] as [string, string])} valeurs={categories} onChange={setCategories} /></Champ>
      {msg && <div className={`frn-alerte ${msg.ok ? "frn-ok" : "frn-ko"}`}>{msg.t}</div>}
      <div><button className="frn-btn">{x.t("enregistrer")}</button></div>
    </form>
  );
}
