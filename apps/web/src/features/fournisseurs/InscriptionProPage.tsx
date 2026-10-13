/**
 * /cercles/inscription (et /inscription) — inscription d'un pro (négociant,
 * fabricant, importateur, entreprise, artisan, BET, laboratoire, topographe,
 * bureau de contrôle, loueur, transporteur), sans mot de passe. Trilingue.
 */
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TYPES_SOCIETE, type GroupeMetier } from "../../domain/cercles/gabarits";
import { CATEGORIES_L3, REGIONS_L3 } from "../../domain/cercles/libelles";
import { REGIONS_MA, VILLES_MA } from "../../domain/materiaux/regions";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { apiFournisseurs, codeErreur } from "./api";
import { useTextes, type CleTexte } from "./textes";
import { Champ, PageFournisseurs, Puces } from "./ui";

const cleIdempotence = () => `ins_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
export const GROUPES: GroupeMetier[] = ["MATERIAUX", "TRAVAUX", "ETUDES", "SERVICES"];

export default function InscriptionProPage() {
  const x = useTextes();
  const [f, setF] = useState({
    metier: "FOURNISSEUR_MATERIAUX", raisonSociale: "", contactNom: "", ville: "", telephone: "", email: "", ice: "",
    logoUrl: "", siteWeb: "", description: "", website: "",
  });
  const [zones, setZones] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [conditions, setConditions] = useState(false);
  const [envoi, setEnvoi] = useState<"" | "en_cours" | "ok">("");
  const [erreur, setErreur] = useState("");
  const [cle] = useState(cleIdempotence);
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const optionsZones = useMemo<[string, string][]>(() => [["national", x.t("toutMaroc")], ...REGIONS_MA.map((r) => [r.code, x.l3(REGIONS_L3[r.code])] as [string, string])], [x.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const optionsCategories = useMemo<[string, string][]>(() => Object.entries(CATEGORIES_L3).map(([c, l]) => [c, x.l3(l)]), [x.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const type = TYPES_SOCIETE[f.metier];

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnvoi("en_cours");
    try {
      await apiFournisseurs.inscrire({ ...f, zonesLivraison: zones, categories, accepteConditions: conditions, idempotencyKey: cle });
      setEnvoi("ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErreur(x.erreur(codeErreur(err)));
      setEnvoi("");
    }
  }

  if (envoi === "ok") {
    return (
      <PageFournisseurs>
        <h1 className="frn-titre">{x.t("merciTitre")}</h1>
        <div className="frn-alerte frn-ok" role="status">{x.t("merciTexte")}</div>
        <p style={{ marginTop: 16 }}><Link className="frn-btn" to="/cercles/espace">{x.t("accederEspace")}</Link></p>
      </PageFournisseurs>
    );
  }

  return (
    <PageFournisseurs>
      <h1 className="frn-titre">{x.t("insTitre")}</h1>
      <p className="frn-chapo">{x.t("insChapo")}</p>

      <form className="frn-carte" onSubmit={soumettre} noValidate style={{ display: "grid", gap: 16 }}>
        {/* Pot de miel : invisible pour un humain (sans décalage horizontal, RTL). */}
        <input type="text" name="website" value={f.website} onChange={maj("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />

        <div className="frn-grille2">
          <Champ label={x.t("metier")}>
            <select className="frn-input" value={f.metier} onChange={maj("metier")} required>
              {GROUPES.map((g) => (
                <optgroup key={g} label={x.t(`grp_${g}` as CleTexte)}>
                  {Object.entries(TYPES_SOCIETE).filter(([, t]) => t.groupe === g).map(([k, t]) => <option key={k} value={k}>{x.l3(t.libelle)}</option>)}
                </optgroup>
              ))}
            </select>
          </Champ>
          <Champ label={x.t("raisonSociale")}>
            <input className="frn-input" value={f.raisonSociale} onChange={maj("raisonSociale")} required maxLength={120} autoComplete="organization" />
          </Champ>
          <Champ label={x.t("contactNom")} aide={x.t("facultatif")}>
            <input className="frn-input" value={f.contactNom} onChange={maj("contactNom")} maxLength={80} autoComplete="name" />
          </Champ>
          <Champ label={x.t("ville")}>
            <input className="frn-input" value={f.ville} onChange={maj("ville")} list="frn-villes" required maxLength={80} />
            <datalist id="frn-villes">{VILLES_MA.map((v) => <option key={v} value={v} />)}</datalist>
          </Champ>
          <Champ label={x.t("telephone")} aide={x.t("telAide")}>
            <input className="frn-input" type="tel" dir="ltr" value={f.telephone} onChange={maj("telephone")} required autoComplete="tel" inputMode="tel" placeholder="06 12 34 56 78" />
          </Champ>
          <Champ label={x.t("email")} aide={x.t("emailAide")}>
            <input className="frn-input" type="email" dir="ltr" value={f.email} onChange={maj("email")} required autoComplete="email" />
          </Champ>
          <Champ label={x.t("ice")} aide={x.t("iceAide")}>
            <input className="frn-input" dir="ltr" value={f.ice} onChange={maj("ice")} inputMode="numeric" maxLength={20} />
          </Champ>
          <Champ label={x.t("logo")} aide={x.t("logoAide")}>
            <input className="frn-input" type="url" dir="ltr" value={f.logoUrl} onChange={maj("logoUrl")} placeholder="https://…" />
          </Champ>
        </div>

        <Champ label={type?.zones === "livraison" ? x.t("zonesLivraison") : x.t("zonesIntervention")} aide={x.t("zonesAide")}>
          <Puces options={optionsZones} valeurs={zones} onChange={setZones} />
        </Champ>
        {(type?.groupe === "MATERIAUX" || type?.groupe === "TRAVAUX") && (
          <Champ label={x.t("categories")} aide={x.t("categoriesAide")}>
            <Puces options={optionsCategories} valeurs={categories} onChange={setCategories} />
          </Champ>
        )}
        <Champ label={x.t("presentation")} aide={x.t("presentationAide")}>
          <textarea className="frn-input" rows={3} value={f.description} onChange={maj("description")} maxLength={2000} />
        </Champ>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.55 }}>
          <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.target.checked)} style={{ marginTop: 4 }} />
          <span>{x.t("conditions")}</span>
        </label>

        {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="frn-btn frn-btn-or" type="submit" disabled={envoi === "en_cours"}>
            {envoi === "en_cours" ? x.t("envoi") : x.t("envoyerInscription")}
          </button>
          <Link to="/cercles/espace" style={{ color: "inherit", fontSize: 14 }}>{x.t("dejaInscrit")}</Link>
        </div>
      </form>
    </PageFournisseurs>
  );
}
