/**
 * /cercles/annuaire (et /ar/cercles/annuaire) — annuaire public des pros
 * vérifiés : GET /api/cercles/annuaire (aucune coordonnée). Filtres type de
 * société, région, texte. Trilingue ; la version /ar force l'arabe.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TYPES_SOCIETE, libelleMetier } from "../../domain/cercles/gabarits";
import { REGIONS_L3 } from "../../domain/cercles/libelles";
import { REGIONS_MA } from "../../domain/materiaux/regions";
import { apiFournisseurs, codeErreur, type ProAnnuaire } from "./api";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";
import { GROUPES } from "./InscriptionProPage";
import { useTextes, type CleTexte } from "./textes";
import { PageFournisseurs, T, TexteSaisi } from "./ui";
import { useLangueForcee } from "./langue";

export default function AnnuaireProPage({ langue }: { langue?: "ar" }) {
  useLangueForcee(langue);
  const x = useTextes();
  const [q, setQ] = useState("");
  const [metier, setMetier] = useState("");
  const [region, setRegion] = useState("");
  const [liste, setListe] = useState<ProAnnuaire[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => { document.title = `${x.t("anTitre")} | CITURBAREA`; }, [x.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vivant = true;
    const minuterie = setTimeout(() => {
      apiFournisseurs.annuaire({ q, metier, region, limite: "120" })
        .then((r) => { if (vivant) { setListe(r.fournisseurs); setErreur(null); } })
        .catch((e) => { if (vivant) { setListe([]); setErreur(codeErreur(e) || "reseau"); } });
    }, q ? 250 : 0);
    return () => { vivant = false; clearTimeout(minuterie); };
  }, [q, metier, region]);

  const prefixe = x.lang === "ar" ? "/ar" : "";
  return (
    <PageFournisseurs>
      <h1 className="frn-titre">{x.t("anTitre")}</h1>
      <p className="frn-chapo">{x.t("anChapo")}</p>
      <div className="frn-carte" style={{ display: "grid", gap: 10, padding: 14 }}>
        <div className="frn-grille3">
          <input className="frn-input" placeholder={x.t("anRecherche")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={x.t("anRecherche")} />
          <select className="frn-input" value={metier} onChange={(e) => setMetier(e.target.value)} aria-label={x.t("metier")}>
            <option value="">{x.t("anTousTypes")}</option>
            {GROUPES.map((g) => (
              <optgroup key={g} label={x.t(`grp_${g}` as CleTexte)}>
                {Object.entries(TYPES_SOCIETE).filter(([, t]) => t.groupe === g).map(([k, t]) => <option key={k} value={k}>{x.l3(t.libelle)}</option>)}
              </optgroup>
            ))}
          </select>
          <select className="frn-input" value={region} onChange={(e) => setRegion(e.target.value)} aria-label={x.t("fpZones")}>
            <option value="">{x.t("anToutesRegions")}</option>
            {REGIONS_MA.map((r) => <option key={r.code} value={r.code}>{x.l3(REGIONS_L3[r.code])}</option>)}
          </select>
        </div>
      </div>

      {liste === null ? <p>{x.t("chargement")}</p> : erreur && erreur !== "reseau" && !liste.length ? (
        <div className="frn-alerte frn-info" style={{ marginTop: 16 }}>{erreur === "not_installed" || erreur === "storage_unavailable" ? x.t("anIndispo") : x.erreur(erreur)}</div>
      ) : (
        <>
          <p style={{ color: T.inkMid, margin: "16px 0 10px" }}>{x.t("anResultats", { n: liste.length })}</p>
          {!liste.length ? <div className="frn-carte">{x.t("anAucun")}</div> : (
            <div className="frn-cartes">
              {liste.map((f) => (
                <article key={f.slug} className="frn-carte" style={{ display: "grid", gap: 8, alignContent: "start" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {f.logoUrl ? <img src={f.logoUrl} alt="" width={48} height={48} loading="lazy" style={{ borderRadius: 8, objectFit: "contain", background: "#fff", border: `1px solid ${T.borderSoft}` }} /> : null}
                    <div style={{ minWidth: 0 }}>
                      <TexteSaisi as="h2" fr={f.raisonSociale} ar={f.raisonSocialeAr} style={{ fontSize: 17, margin: 0, color: T.navy }} />
                      <div style={{ fontSize: 13, color: T.inkMid }}>{x.l3(libelleMetier(f.metier))} · {f.ville}</div>
                    </div>
                  </div>
                  <div className="frn-puces">
                    {f.verifie && <span className="frn-badge" style={{ background: T.successBg, color: T.success }}>✓ {x.t("anVerifie")}</span>}
                    {f.documentsVerifies && <span className="frn-badge" style={{ background: T.infoBg, color: T.info }}>{x.t("anDocsVerifies")}</span>}
                    {f.nbProduits > 0 && <span className="frn-etiquette">{x.t("anProduits", { n: f.nbProduits })}</span>}
                    {f.nbServices > 0 && <span className="frn-etiquette">{x.t("anServices", { n: f.nbServices })}</span>}
                  </div>
                  <TexteSaisi fr={(f.description || "").slice(0, 220)} ar={(f.descriptionAr || "").slice(0, 220)} style={{ margin: 0, fontSize: 14, color: T.inkMid, lineHeight: 1.5 }} />
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <Link className="frn-btn frn-btn-ghost frn-btn-petit" to={`${prefixe}/cercles/pro/${f.slug}`}>{x.t("anVoir")}</Link>
                    <DemanderAppelVideo contexte="cercles" objetId={f.slug} invites={[{ type: "pro", slug: f.slug }]} avecNom={x.bi(f.raisonSociale, f.raisonSocialeAr).texte} variante="lien" className="text-sm" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <p style={{ marginTop: 24 }}><Link to="/cercles/inscription">{x.t("anCtaPro")}</Link></p>
    </PageFournisseurs>
  );
}
