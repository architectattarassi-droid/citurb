/**
 * /cercles/espace — espace du fournisseur : connexion par code à usage unique
 * (lien magique : #email=…&code=…), fiches de prix, import tableur, profil.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CATALOGUE } from "../../domain/materiaux/catalogue";
import { lignesImport, lireTableau, modeleCsv } from "../../domain/materiaux/csv";
import { REGIONS_MA, VILLES_MA, nomRegion } from "../../domain/materiaux/regions";
import { CATEGORIES, type Categorie } from "../../domain/materiaux/types";
import { apiFournisseurs, ErreurApi, messageErreur, MESSAGES_ERREUR, type Fiche, type FicheSaisie, type FournisseurPrive } from "./api";
import FicheForm from "./FicheForm";
import { BadgeStatut, Champ, fmtDH, PageFournisseurs, Puces, T } from "./ui";

type Etat = { phase: "chargement" } | { phase: "connexion" } | { phase: "connecte"; f: FournisseurPrive; fiches: Fiche[]; peutPublierFiches: boolean };

export default function EspaceFournisseurPage() {
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const charger = useCallback(async () => {
    try {
      const r = await apiFournisseurs.moi();
      setEtat({ phase: "connecte", f: r.fournisseur, fiches: r.fiches, peutPublierFiches: r.peutPublierFiches });
    } catch { setEtat({ phase: "connexion" }); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  return (
    <PageFournisseurs>
      {etat.phase === "chargement" && <p>Chargement…</p>}
      {etat.phase === "connexion" && <Connexion onConnecte={charger} />}
      {etat.phase === "connecte" && <Espace f={etat.f} fiches={etat.fiches} peutPublierFiches={etat.peutPublierFiches} recharger={charger}
        onDeconnecte={() => setEtat({ phase: "connexion" })} />}
    </PageFournisseurs>
  );
}

function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [info, setInfo] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const verifier = useCallback(async (e: string, c: string) => {
    setErreur(""); setEnvoi(true);
    try { await apiFournisseurs.verifierCode(e, c); onConnecte(); }
    catch (err) { setErreur(messageErreur(err)); } finally { setEnvoi(false); }
  }, [onConnecte]);

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
    try { const r = await apiFournisseurs.demanderCode(email); setInfo(r.message); setEtape("code"); }
    catch (err) { setErreur(messageErreur(err)); } finally { setEnvoi(false); }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 className="frn-titre">Mon espace fournisseur</h1>
      <p className="frn-chapo">Pas de mot de passe : indiquez l'e-mail de votre inscription, vous recevez un code à usage unique.</p>
      {etape === "email" ? (
        <form className="frn-carte" onSubmit={demander} style={{ display: "grid", gap: 14 }}>
          <Champ label="E-mail"><input className="frn-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Champ>
          {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
          <button className="frn-btn" disabled={envoi}>{envoi ? "Envoi…" : "Recevoir mon code"}</button>
          <small>Pas encore inscrit ? <Link to="/cercles/inscription">Inscrire mon entreprise</Link></small>
        </form>
      ) : (
        <form className="frn-carte" onSubmit={(e) => { e.preventDefault(); void verifier(email, code); }} style={{ display: "grid", gap: 14 }}>
          {info && <div className="frn-alerte frn-info">{info}</div>}
          <Champ label="Code à 6 chiffres">
            <input className="frn-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric"
              autoComplete="one-time-code" required style={{ letterSpacing: 6, fontSize: 22, textAlign: "center" }} />
          </Champ>
          {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
          <button className="frn-btn" disabled={envoi || code.length !== 6}>{envoi ? "Vérification…" : "Ouvrir mon espace"}</button>
          <button type="button" className="frn-btn frn-btn-ghost" onClick={() => { setEtape("email"); setCode(""); setErreur(""); }}>Changer d'adresse ou renvoyer un code</button>
        </form>
      )}
    </div>
  );
}

const LIBELLES_FICHE = { PENDING: "En vérification", APPROVED: "Publiée", REJECTED: "Refusée" };
const DISPO: Record<string, string> = { EN_STOCK: "En stock", SUR_COMMANDE: "Sur commande", RUPTURE: "Rupture" };

function Espace({ f, fiches, peutPublierFiches, recharger, onDeconnecte }: {
  f: FournisseurPrive; fiches: Fiche[]; peutPublierFiches: boolean; recharger: () => void; onDeconnecte: () => void;
}) {
  const [onglet, setOnglet] = useState<"fiches" | "import" | "profil">(peutPublierFiches ? "fiches" : "profil");
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="frn-titre" style={{ marginRight: "auto" }}>{f.raisonSociale}</h1>
        <BadgeStatut statut={f.statut} />
        <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => { try { await apiFournisseurs.deconnexion(); } finally { onDeconnecte(); } }}>Se déconnecter</button>
      </div>
      {f.statut === "PENDING" && <div className="frn-alerte frn-warn">Profil en cours de vérification par l'équipe CITURBAREA. Vous pouvez préparer vos fiches : elles seront visibles dès la validation.</div>}
      {f.statut === "APPROVED" && <div className="frn-alerte frn-ok">Profil vérifié. <Link to={`/cercles/pro/${f.slug}`}>Voir ma fiche publique</Link></div>}

      <div className="frn-onglets" role="tablist">
        {peutPublierFiches && <button role="tab" aria-selected={onglet === "fiches"} className={`frn-onglet${onglet === "fiches" ? " frn-onglet-on" : ""}`} onClick={() => setOnglet("fiches")}>Mes fiches de prix ({fiches.length})</button>}
        {peutPublierFiches && <button role="tab" aria-selected={onglet === "import"} className={`frn-onglet${onglet === "import" ? " frn-onglet-on" : ""}`} onClick={() => setOnglet("import")}>Importer un tableur</button>}
        <button role="tab" aria-selected={onglet === "profil"} className={`frn-onglet${onglet === "profil" ? " frn-onglet-on" : ""}`} onClick={() => setOnglet("profil")}>Mon profil</button>
      </div>

      {onglet === "fiches" && <Fiches f={f} fiches={fiches} recharger={recharger} />}
      {onglet === "import" && <Import f={f} recharger={recharger} />}
      {onglet === "profil" && <Profil f={f} recharger={recharger} />}
    </>
  );
}

function Fiches({ f, fiches, recharger }: { f: FournisseurPrive; fiches: Fiche[]; recharger: () => void }) {
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
        <button className="frn-btn frn-btn-or" onClick={() => setEdition("nouvelle")}>+ Ajouter une fiche</button>
        <small style={{ color: T.inkMid }}>Une fiche par matériau ; chaque mise à jour est datée et conservée.</small>
      </div>
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      {!fiches.length ? (
        <div className="frn-carte">Aucune fiche pour l'instant. Ajoutez vos prix un par un ou importez un tableur.</div>
      ) : (
        <div className="frn-defil">
          <table className="frn-table frn-cartes-mobile">
            <thead><tr><th>Matériau</th><th>Prix HT</th><th>Pour le chiffrage</th><th>Disponibilité</th><th>Valable jusqu'au</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {fiches.map((x) => (
                <tr key={x.id}>
                  <td data-l="Matériau"><strong>{x.libelle}</strong><br /><small style={{ color: T.inkMuted }}>{x.materiauCode}</small></td>
                  <td data-l="Prix HT">{fmtDH(x.prixHT)} / {x.uniteVenteLibelle}</td>
                  <td data-l="Chiffrage">{fmtDH(x.prixRefHT, 3)} / {x.uniteRef}</td>
                  <td data-l="Disponibilité">{DISPO[x.disponibilite] || x.disponibilite}</td>
                  <td data-l="Validité">{x.validiteJusquau ? new Date(x.validiteJusquau).toLocaleDateString("fr-FR") : "—"}</td>
                  <td data-l="Statut"><BadgeStatut statut={x.statut} libelles={LIBELLES_FICHE} />{x.signalement && <><br /><small style={{ color: T.warn }}>Écart {Math.round((x.ecartRef || 0) * 100)} % / référence</small></>}</td>
                  <td data-l="">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setEdition(x)}>Modifier</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        try { const h = await apiFournisseurs.historique(x.id); setHistorique({ id: x.id, lignes: h.historique }); } catch (e) { setErreur(messageErreur(e)); }
                      }}>Historique</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        if (!window.confirm(`Retirer la fiche « ${x.libelle} » ?`)) return;
                        try { await apiFournisseurs.supprimerFiche(x.id); recharger(); } catch (e) { setErreur(messageErreur(e)); }
                      }}>Retirer</button>
                    </div>
                    {historique?.id === x.id && (
                      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: T.inkMid }}>
                        {historique.lignes.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("fr-FR")} — {h.action.toLowerCase().replace("_", " ")}{h.prixHT != null ? ` : ${fmtDH(h.prixHT)} / ${h.uniteVente}` : ""}</li>)}
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
    catch (e) { setErreur(e instanceof ErreurApi && e.code === "trop_de_lignes" ? "300 lignes maximum par import." : messageErreur(e)); }
    finally { setEnvoi(false); }
  }

  return (
    <div className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
        <li>Téléchargez le modèle (une ligne par matériau de vos catégories) et ouvrez-le dans Excel.</li>
        <li>Remplissez <strong>prix_ht</strong> pour ce que vous vendez (laissez vide le reste), ajustez l'unité de vente, la validité (jj/mm/aaaa), les frais et délais de livraison ({nomRegion(zone)}).</li>
        <li>Choisissez le fichier enregistré en CSV, ou copiez les cellules dans Excel et collez-les ci-dessous.</li>
      </ol>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={telechargerModele}>Télécharger le modèle CSV</button>
        <label className="frn-btn frn-btn-ghost">
          Choisir un fichier CSV
          <input type="file" accept=".csv,.txt,text/csv" style={{ display: "none" }} onChange={async (e) => { const fi = e.target.files?.[0]; if (fi) setTexte(await fi.text()); }} />
        </label>
      </div>
      <textarea className="frn-input" rows={8} placeholder="…ou collez ici les cellules copiées depuis Excel (avec la ligne d'en-tête)" value={texte} onChange={(e) => { setTexte(e.target.value); setResultat(null); }} />
      {apercu && (apercu.enteteManquante
        ? <div className="frn-alerte frn-ko">Ligne d'en-tête introuvable : gardez la première ligne du modèle (code, unite_vente, prix_ht…).</div>
        : <div className="frn-alerte frn-info">{apercu.lignes.length} ligne(s) avec un prix, {apercu.ignorees} ligne(s) sans prix ignorée(s).</div>)}
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      <div><button className="frn-btn" disabled={envoi || !apercu?.lignes.length} onClick={envoyer}>{envoi ? "Import…" : "Importer"}</button></div>
      {resultat && (
        <div className={`frn-alerte ${resultat.erreurs ? "frn-warn" : "frn-ok"}`}>
          {resultat.importees} fiche(s) enregistrée(s), {resultat.erreurs} erreur(s).
          {resultat.resultats.some((r) => !r.ok || r.signalement) && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {resultat.resultats.filter((r) => !r.ok || r.signalement).map((r) => (
                <li key={r.ligne}>Ligne {r.ligne + 1} ({r.materiauCode}) : {r.ok ? "écart de plus de 50 % avec la référence, vérification par l'équipe" : MESSAGES_ERREUR[r.error || ""] || r.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Profil({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const [v, setV] = useState({ contactNom: f.contactNom || "", ville: f.ville, telephone: f.telephone, ice: f.ice || "", logoUrl: f.logoUrl || "", siteWeb: f.siteWeb || "", description: f.description || "" });
  const [zones, setZones] = useState<string[]>(f.zonesLivraison);
  const [categories, setCategories] = useState<Categorie[]>(f.categories as Categorie[]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    try { await apiFournisseurs.majProfil({ ...v, zonesLivraison: zones, categories }); setMsg({ ok: true, t: "Profil enregistré." }); recharger(); }
    catch (err) { setMsg({ ok: false, t: messageErreur(err) }); }
  }
  return (
    <form className="frn-carte" onSubmit={enregistrer} style={{ display: "grid", gap: 14 }}>
      <div className="frn-grille2">
        <Champ label="Raison sociale" aide="modifiable par l'équipe"><input className="frn-input" value={f.raisonSociale} disabled /></Champ>
        <Champ label="E-mail" aide="identifiant de connexion"><input className="frn-input" value={f.email} disabled /></Champ>
        <Champ label="Nom du contact"><input className="frn-input" value={v.contactNom} onChange={maj("contactNom")} /></Champ>
        <Champ label="Ville"><input className="frn-input" value={v.ville} onChange={maj("ville")} list="frn-villes-p" /><datalist id="frn-villes-p">{VILLES_MA.map((x) => <option key={x} value={x} />)}</datalist></Champ>
        <Champ label="Téléphone"><input className="frn-input" type="tel" value={v.telephone} onChange={maj("telephone")} /></Champ>
        <Champ label="ICE"><input className="frn-input" value={v.ice} onChange={maj("ice")} inputMode="numeric" /></Champ>
        <Champ label="Logo (https)"><input className="frn-input" type="url" value={v.logoUrl} onChange={maj("logoUrl")} /></Champ>
        <Champ label="Site web (https)"><input className="frn-input" type="url" value={v.siteWeb} onChange={maj("siteWeb")} /></Champ>
      </div>
      <Champ label="Zones de livraison / d'intervention">
        <Puces options={[["national", "Tout le Maroc"], ...REGIONS_MA.map((r) => [r.code, r.nom] as [string, string])]} valeurs={zones} onChange={setZones} />
      </Champ>
      <Champ label="Catégories"><Puces options={Object.entries(CATEGORIES) as [Categorie, string][]} valeurs={categories} onChange={setCategories} /></Champ>
      <Champ label="Présentation"><textarea className="frn-input" rows={4} value={v.description} onChange={maj("description")} maxLength={1000} /></Champ>
      {msg && <div className={`frn-alerte ${msg.ok ? "frn-ok" : "frn-ko"}`}>{msg.t}</div>}
      <div><button className="frn-btn">Enregistrer</button></div>
    </form>
  );
}
