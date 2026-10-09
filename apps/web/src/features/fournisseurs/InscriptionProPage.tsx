/**
 * /cercles/inscription (et /inscription) — inscription d'un fournisseur de
 * matériaux ou d'un pro du BTP, sans mot de passe. Remplace l'ancien
 * formulaire qui dépendait de l'API NestJS éteinte.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { REGIONS_MA, VILLES_MA } from "../../domain/materiaux/regions";
import { CATEGORIES, type Categorie } from "../../domain/materiaux/types";
import { apiFournisseurs, messageErreur } from "./api";
import { Champ, PageFournisseurs, Puces } from "./ui";

export const METIERS: [string, string][] = [
  ["FOURNISSEUR_MATERIAUX", "Fournisseur / négociant de matériaux"],
  ["ENTREPRISE_GO", "Entreprise de gros œuvre"],
  ["ENTREPRISE_SECOND_OEUVRE", "Entreprise de second œuvre"],
  ["ARTISAN_QUALIFIE", "Artisan qualifié"],
  ["BET_STRUCTURE", "BET structure"],
  ["BET_FLUIDES", "BET fluides"],
  ["BET_VRD", "BET VRD"],
  ["LABORATOIRE", "Laboratoire"],
  ["TOPOGRAPHE", "Topographe"],
  ["GEOMETRE", "Géomètre"],
  ["CONTROLE_TECHNIQUE", "Bureau de contrôle"],
];

const cleIdempotence = () => `ins_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export default function InscriptionProPage() {
  const [f, setF] = useState({
    metier: "FOURNISSEUR_MATERIAUX", raisonSociale: "", contactNom: "", ville: "", telephone: "", email: "", ice: "",
    logoUrl: "", siteWeb: "", description: "", website: "",
  });
  const [zones, setZones] = useState<string[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [conditions, setConditions] = useState(false);
  const [envoi, setEnvoi] = useState<"" | "en_cours" | "ok">("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [cle] = useState(cleIdempotence);
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const optionsZones = useMemo<[string, string][]>(() => [["national", "Tout le Maroc"], ...REGIONS_MA.map((r) => [r.code, r.nom] as [string, string])], []);
  const optionsCategories = useMemo(() => Object.entries(CATEGORIES) as [Categorie, string][], []);
  const vendeur = ["FOURNISSEUR_MATERIAUX", "ENTREPRISE_GO", "ENTREPRISE_SECOND_OEUVRE", "ARTISAN_QUALIFIE"].includes(f.metier);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnvoi("en_cours");
    try {
      const r = await apiFournisseurs.inscrire({ ...f, zonesLivraison: zones, categories, accepteConditions: conditions, idempotencyKey: cle });
      setMessage(r.message);
      setEnvoi("ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErreur(messageErreur(err));
      setEnvoi("");
    }
  }

  if (envoi === "ok") {
    return (
      <PageFournisseurs>
        <h1 className="frn-titre">Merci, votre inscription est enregistrée</h1>
        <div className="frn-alerte frn-ok" role="status">{message}</div>
        <p className="frn-chapo" style={{ marginTop: 16 }}>
          Vous pouvez dès maintenant ouvrir votre espace pour préparer vos fiches de prix : elles seront publiées dès la validation de votre profil.
        </p>
        <Link className="frn-btn" to="/cercles/espace">Accéder à mon espace</Link>
      </PageFournisseurs>
    );
  }

  return (
    <PageFournisseurs>
      <h1 className="frn-titre">Inscrire mon entreprise sur Cercles</h1>
      <p className="frn-chapo">
        Fournisseurs de matériaux, entreprises, artisans, BET, laboratoires, topographes : publiez vos prix et recevez des demandes
        de prix de maîtres d'ouvrage dont le projet est chiffré par CITURBAREA. Inscription gratuite, sans mot de passe.
      </p>

      <form className="frn-carte" onSubmit={soumettre} noValidate style={{ display: "grid", gap: 16 }}>
        {/* Pot de miel : invisible pour un humain. */}
        <input type="text" name="website" value={f.website} onChange={maj("website")} tabIndex={-1} autoComplete="off"
          aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

        <div className="frn-grille2">
          <Champ label="Métier">
            <select className="frn-input" value={f.metier} onChange={maj("metier")} required>
              {METIERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Champ>
          <Champ label="Raison sociale">
            <input className="frn-input" value={f.raisonSociale} onChange={maj("raisonSociale")} required maxLength={120} autoComplete="organization" />
          </Champ>
          <Champ label="Nom du contact" aide="facultatif">
            <input className="frn-input" value={f.contactNom} onChange={maj("contactNom")} maxLength={80} autoComplete="name" />
          </Champ>
          <Champ label="Ville">
            <input className="frn-input" value={f.ville} onChange={maj("ville")} list="frn-villes" required maxLength={80} />
            <datalist id="frn-villes">{VILLES_MA.map((v) => <option key={v} value={v} />)}</datalist>
          </Champ>
          <Champ label="Téléphone" aide="jamais affiché publiquement">
            <input className="frn-input" type="tel" value={f.telephone} onChange={maj("telephone")} required autoComplete="tel" inputMode="tel" placeholder="06 12 34 56 78" />
          </Champ>
          <Champ label="E-mail" aide="sert à recevoir votre code d'accès">
            <input className="frn-input" type="email" value={f.email} onChange={maj("email")} required autoComplete="email" />
          </Champ>
          <Champ label="ICE" aide="facultatif, 15 chiffres">
            <input className="frn-input" value={f.ice} onChange={maj("ice")} inputMode="numeric" maxLength={20} />
          </Champ>
          <Champ label="Logo" aide="facultatif, adresse https d'une image">
            <input className="frn-input" type="url" value={f.logoUrl} onChange={maj("logoUrl")} placeholder="https://…" />
          </Champ>
        </div>

        <Champ label={vendeur ? "Zones de livraison" : "Zones d'intervention"} aide="par défaut, la région de votre ville">
          <Puces options={optionsZones} valeurs={zones} onChange={setZones} />
        </Champ>
        <Champ label="Catégories" aide="ce que vous vendez ou réalisez">
          <Puces options={optionsCategories} valeurs={categories} onChange={setCategories} />
        </Champ>
        <Champ label="Présentation" aide="facultatif, 1 000 caractères">
          <textarea className="frn-input" rows={3} value={f.description} onChange={maj("description")} maxLength={1000} />
        </Champ>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5 }}>
          <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.target.checked)} style={{ marginTop: 4 }} />
          <span>
            J'accepte les conditions de mise en relation : mes coordonnées ne sont communiquées à un client qu'après une demande passée
            par CITURBAREA, je m'engage à ne pas contourner la plateforme pour les affaires qu'elle m'apporte, et une commission
            de mise en relation (3 à 5 % selon les cas, annoncée avant toute acceptation) pourra s'appliquer.
          </span>
        </label>

        {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="frn-btn frn-btn-or" type="submit" disabled={envoi === "en_cours"}>
            {envoi === "en_cours" ? "Envoi…" : "Envoyer mon inscription"}
          </button>
          <Link to="/cercles/espace" style={{ color: "inherit", fontSize: 14 }}>Déjà inscrit ? Accéder à mon espace</Link>
        </div>
      </form>
    </PageFournisseurs>
  );
}
