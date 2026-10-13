/**
 * « Mes produits » : fiches produit d'un fournisseur (matériau ou équipement,
 * y compris hors référentiel). Caractéristiques techniques selon la famille
 * (domain/cercles/offres.ts), unité de vente + conversion vers l'unité
 * d'ouvrage du chiffrage, prix, dégressifs, délais, zones, photos, fiche
 * technique, gamme. Publication après modération (rattachement à un code).
 */
import React, { useState } from "react";
import { CATEGORIES_L3, REGIONS_L3, unite3 } from "../../domain/cercles/libelles";
import { DISPONIBILITES_L3, FAMILLES_PRODUIT, GAMMES, type ChampTechnique } from "../../domain/cercles/offres";
import { materiau } from "../../domain/materiaux/catalogue";
import { REGIONS_MA } from "../../domain/materiaux/regions";
import { UNITES_REF } from "../../domain/materiaux/types";
import { apiFournisseurs, codeErreur, type Degressif, type FournisseurPrive, type Produit } from "./api";
import { ChoixMateriau } from "./FicheForm";
import GalerieImages from "./GalerieImages";
import { useTextes } from "./textes";
import { BadgeStatut, Champ, Puces, T, TexteSaisi } from "./ui";

const lignes = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".").replace(/\s/g, "")));

export default function ProduitsPro({ f, produits, recharger }: { f: FournisseurPrive; produits: Produit[]; recharger: () => void }) {
  const x = useTextes();
  const [edition, setEdition] = useState<Produit | "nouveau" | null>(null);
  const [erreur, setErreur] = useState("");
  if (edition) return <ProduitForm f={f} initial={edition === "nouveau" ? undefined : edition} onFini={() => { setEdition(null); recharger(); }} onAnnuler={() => setEdition(null)} />;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0, color: T.inkMid, fontSize: 14, lineHeight: 1.55 }}>{x.t("prChapo")}</p>
      <div><button className="frn-btn frn-btn-or" onClick={() => setEdition("nouveau")}>{x.t("prAjouter")}</button></div>
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      {!produits.length ? <div className="frn-carte">{x.t("prAucun")}</div> : (
        <div className="frn-defil">
          <table className="frn-table frn-cartes-mobile">
            <thead><tr><th>{x.t("col_produit")}</th><th>{x.t("col_prix")}</th><th>{x.t("col_chiffrage")}</th><th>{x.t("col_statut")}</th><th /></tr></thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p.id}>
                  <td data-l={x.t("col_produit")}>
                    <TexteSaisi as="strong" fr={p.designationFr} ar={p.designationAr} />
                    <div style={{ color: T.inkMuted, fontSize: 12 }}>{[p.marque, p.modele].filter(Boolean).join(" · ")}{p.gamme ? ` · ${x.l3(GAMMES[p.gamme])}` : ""}</div>
                  </td>
                  <td data-l={x.t("col_prix")}>{x.dh(p.prixHT)} {x.t("ht")} / {p.uniteVente}</td>
                  <td data-l={x.t("col_chiffrage")}>{x.dh(p.prixRefHT, 3)} / {x.l3(unite3(p.uniteRef))}</td>
                  <td data-l={x.t("col_statut")}>
                    <BadgeStatut statut={p.statut || "PENDING"} offre />
                    {p.materiauCode && <div style={{ fontSize: 12, color: T.inkMid }}>{x.t("rattacheA", { code: p.materiauCode })}</div>}
                    {p.motifRejet && <div style={{ fontSize: 12, color: T.danger }}>{x.t("motif", { m: p.motifRejet })}</div>}
                    {p.signalement && <div style={{ fontSize: 12, color: T.warn }}>{x.t("ecart", { n: Math.round((p.ecartRef || 0) * 100) })}</div>}
                  </td>
                  <td data-l="">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setEdition(p)}>{x.t("modifier")}</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        if (!window.confirm(x.t("confirmerRetrait", { x: x.bi(p.designationFr, p.designationAr).texte }))) return;
                        try { await apiFournisseurs.retirerProduit(p.id); recharger(); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
                      }}>{x.t("retirer")}</button>
                    </div>
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

function ChampTech({ c, valeur, onChange }: { c: ChampTechnique; valeur: unknown; onChange: (v: unknown) => void }) {
  const x = useTextes();
  const label = `${x.l3(c.libelle)}${c.unite ? ` (${c.unite})` : ""}`;
  if (c.type === "choix") {
    return (
      <Champ label={label}>
        <select className="frn-input" value={String(valeur ?? "")} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">—</option>
          {c.options?.map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}
        </select>
      </Champ>
    );
  }
  if (c.type === "oui_non") {
    return (
      <Champ label={label}>
        <select className="frn-input" value={valeur === true ? "1" : valeur === false ? "0" : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "1")}>
          <option value="">—</option><option value="1">{x.t("oui")}</option><option value="0">{x.t("non")}</option>
        </select>
      </Champ>
    );
  }
  return (
    <Champ label={label}>
      <input className="frn-input" inputMode={c.type === "nombre" ? "decimal" : undefined} dir={c.type === "nombre" ? "ltr" : undefined} value={valeur == null ? "" : String(valeur)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : c.type === "nombre" ? num(e.target.value) : e.target.value)} />
    </Champ>
  );
}

function ProduitForm({ f, initial, onFini, onAnnuler }: { f: FournisseurPrive; initial?: Produit; onFini: () => void; onAnnuler: () => void }) {
  const x = useTextes();
  const [famille, setFamille] = useState(initial?.famille || Object.keys(FAMILLES_PRODUIT)[0]);
  const fam = FAMILLES_PRODUIT[famille];
  const [categorie, setCategorie] = useState(initial?.categorie || fam.categorie);
  const [v, setV] = useState({
    designationFr: initial?.designationFr || "", designationAr: initial?.designationAr || "", descriptionFr: initial?.descriptionFr || "",
    descriptionAr: initial?.descriptionAr || "", marque: initial?.marque || "", modele: initial?.modele || "", gamme: initial?.gamme || "",
    uniteVente: initial?.uniteVente || "", conditionnement: initial?.conditionnement || "", prixHT: initial?.prixHT != null ? String(initial.prixHT) : "",
    facteur: initial ? String(initial.facteur) : "1", quantiteMin: initial?.quantiteMin != null ? String(initial.quantiteMin) : "",
    delaiJours: initial?.delaiJours != null ? String(initial.delaiJours) : "", disponibilite: initial?.disponibilite || "EN_STOCK",
    validiteJusquau: initial?.validiteJusquau || new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10),
    photos: (initial?.photos || []).join("\n"), ficheTechniqueUrl: initial?.ficheTechniqueUrl || "",
  });
  const [uniteRef, setUniteRef] = useState(initial?.uniteRef || fam.uniteRef);
  const [tva, setTva] = useState(initial?.tvaPct ?? 20);
  const [car, setCar] = useState<Record<string, unknown>>(initial?.caracteristiques || {});
  const [zones, setZones] = useState<string[]>(initial?.zones || []);
  const [degressifs, setDegressifs] = useState<Degressif[]>(initial?.degressifs || []);
  const [codePropose, setCodePropose] = useState(initial?.codePropose || "");
  const [choisirCode, setChoisirCode] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  const prix = num(v.prixHT), facteur = num(v.facteur);
  const prixRef = prix && facteur ? prix / facteur : null;
  const uniteLib = x.l3(unite3(uniteRef));
  const zonesOptions: [string, string][] = [["national", x.t("toutMaroc")], ...REGIONS_MA.map((r) => [r.code, x.l3(REGIONS_L3[r.code])] as [string, string])];

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setEnvoi(true);
    try {
      await apiFournisseurs.enregistrerProduit(initial?.id || null, {
        famille, categorie, designationFr: v.designationFr, designationAr: v.designationAr, descriptionFr: v.descriptionFr, descriptionAr: v.descriptionAr,
        marque: v.marque, modele: v.modele, gamme: v.gamme || null, caracteristiques: car, uniteRef, uniteVente: v.uniteVente, facteur: v.facteur,
        conditionnement: v.conditionnement, prixHT: v.prixHT, tvaPct: tva, quantiteMin: v.quantiteMin, degressifs: degressifs.filter((d) => d.aPartirDe > 0 && d.prixHT > 0),
        delaiJours: v.delaiJours, zones, disponibilite: v.disponibilite, validiteJusquau: v.validiteJusquau, photos: lignes(v.photos),
        ficheTechniqueUrl: v.ficheTechniqueUrl, codePropose: codePropose || null,
      });
      onFini();
    } catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }

  return (
    <form onSubmit={enregistrer} className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: T.navy }}>{initial ? x.t("prModifier") : x.t("prNouveau")}</h2>
      <div className="frn-alerte frn-info">{x.t("prEnVerif")}</div>
      <div className="frn-grille3">
        <Champ label={x.t("famille")}>
          <select className="frn-input" value={famille} onChange={(e) => { const k = e.target.value; setFamille(k); setCategorie(FAMILLES_PRODUIT[k].categorie); setUniteRef(FAMILLES_PRODUIT[k].uniteRef); setCar({}); }}>
            {Object.entries(FAMILLES_PRODUIT).map(([k, fp]) => <option key={k} value={k}>{x.l3(fp.libelle)}</option>)}
          </select>
        </Champ>
        <Champ label={x.t("categorie")}>
          <select className="frn-input" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            {Object.entries(CATEGORIES_L3).map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}
          </select>
        </Champ>
        <Champ label={x.t("gamme")} aide={x.t("facultatif")}>
          <select className="frn-input" value={v.gamme} onChange={maj("gamme")}>
            <option value="">—</option>
            {Object.entries(GAMMES).map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}
          </select>
        </Champ>
      </div>
      <div className="frn-grille2">
        <Champ label={x.t("designationFr")}><input className="frn-input" dir="ltr" lang="fr" value={v.designationFr} maxLength={140} onChange={maj("designationFr")} /></Champ>
        <Champ label={x.t("designationAr")}><input className="frn-input" dir="rtl" lang="ar" value={v.designationAr} maxLength={140} onChange={maj("designationAr")} /></Champ>
        <Champ label={x.t("marqueProduit")}><input className="frn-input" value={v.marque} maxLength={80} onChange={maj("marque")} /></Champ>
        <Champ label={x.t("modele")}><input className="frn-input" value={v.modele} maxLength={80} onChange={maj("modele")} /></Champ>
        <Champ label={x.t("descriptionFr")}><textarea className="frn-input" dir="ltr" lang="fr" rows={3} value={v.descriptionFr} maxLength={2000} onChange={maj("descriptionFr")} /></Champ>
        <Champ label={x.t("descriptionAr")}><textarea className="frn-input" dir="rtl" lang="ar" rows={3} value={v.descriptionAr} maxLength={2000} onChange={maj("descriptionAr")} /></Champ>
      </div>

      <fieldset className="frn-fieldset">
        <legend>{x.t("caracteristiques")}</legend>
        <div className="frn-grille3">{fam.champs.map((c) => <ChampTech key={c.cle} c={c} valeur={car[c.cle]} onChange={(val) => setCar((p) => ({ ...p, [c.cle]: val }))} />)}</div>
      </fieldset>

      <fieldset className="frn-fieldset">
        <legend>{x.t("vente")}</legend>
        <div className="frn-grille3">
          <Champ label={x.t("uniteVenteLibelle")} aide={x.t("uniteVenteAide")}><input className="frn-input" value={v.uniteVente} maxLength={60} onChange={maj("uniteVente")} /></Champ>
          <Champ label={x.t("uniteOuvrage")}>
            <select className="frn-input" value={uniteRef} onChange={(e) => { setUniteRef(e.target.value); setCodePropose(""); }}>
              {Object.keys(UNITES_REF).map((u) => <option key={u} value={u}>{x.l3(unite3(u))}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("facteur")} aide={x.t("facteurAide")}><input className="frn-input" inputMode="decimal" dir="ltr" value={v.facteur} onChange={maj("facteur")} /></Champ>
          <Champ label={x.t("prixHTDH")} aide={x.t("parUniteVente")}><input className="frn-input" inputMode="decimal" dir="ltr" value={v.prixHT} onChange={maj("prixHT")} required /></Champ>
          <Champ label={x.t("tva")}>
            <select className="frn-input" value={tva} onChange={(e) => setTva(Number(e.target.value))}>{[20, 14, 10, 7, 0].map((t) => <option key={t} value={t}>{t} %</option>)}</select>
          </Champ>
          <Champ label={x.t("conditionnement")} aide={x.t("conditionnementAide")}><input className="frn-input" value={v.conditionnement} maxLength={120} onChange={maj("conditionnement")} /></Champ>
        </div>
        {prixRef !== null && Number.isFinite(prixRef) && <div className="frn-alerte frn-info" style={{ marginTop: 10 }}>{x.t("prixParUniteRef", { p: x.dh(prixRef, 3), u: uniteLib })}</div>}
        <div className="frn-grille3" style={{ marginTop: 10 }}>
          <Champ label={x.t("qMin")} aide={x.t("qMinAide")}><input className="frn-input" inputMode="decimal" dir="ltr" value={v.quantiteMin} onChange={maj("quantiteMin")} /></Champ>
          <Champ label={x.t("delai")}><input className="frn-input" inputMode="numeric" dir="ltr" value={v.delaiJours} onChange={maj("delaiJours")} /></Champ>
          <Champ label={x.t("disponibilite")}>
            <select className="frn-input" value={v.disponibilite} onChange={maj("disponibilite")}>{Object.entries(DISPONIBILITES_L3).map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}</select>
          </Champ>
          <Champ label={x.t("valableJusquau")}><input className="frn-input" type="date" value={v.validiteJusquau} onChange={maj("validiteJusquau")} /></Champ>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{x.t("degressifs")}</span> <small style={{ color: T.inkMuted }}>— {x.t("facultatif")}</small>
          {degressifs.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, margin: "8px 0", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>{x.t("aPartirDe")}</span>
              <input className="frn-input" style={{ width: 110 }} inputMode="decimal" dir="ltr" value={d.aPartirDe || ""} aria-label={x.t("qMin")}
                onChange={(e) => setDegressifs(degressifs.map((y, j) => j === i ? { ...y, aPartirDe: num(e.target.value) || 0 } : y))} />
              <span style={{ fontSize: 14 }}>{x.t("unites")}</span>
              <input className="frn-input" style={{ width: 120 }} inputMode="decimal" dir="ltr" value={d.prixHT || ""} aria-label={x.t("prixHTDH")}
                onChange={(e) => setDegressifs(degressifs.map((y, j) => j === i ? { ...y, prixHT: num(e.target.value) || 0 } : y))} />
              <span style={{ fontSize: 14 }}>{x.t("dh")} {x.t("ht")}</span>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" aria-label={x.t("retirer")} onClick={() => setDegressifs(degressifs.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {degressifs.length < 5 && <div><button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setDegressifs([...degressifs, { aPartirDe: 0, prixHT: 0 }])}>{x.t("plusPalier")}</button></div>}
        </div>
      </fieldset>

      <Champ label={x.t("zonesProduit")} aide={x.t("zonesProduitAide")}><Puces options={zonesOptions} valeurs={zones} onChange={setZones} /></Champ>
      <div className="frn-grille2">
        <Champ label={x.t("photos")}><textarea className="frn-input" dir="ltr" rows={3} value={v.photos} onChange={maj("photos")} placeholder="https://…" /></Champ>
        <Champ label={x.t("ficheTechnique")}><input className="frn-input" type="url" dir="ltr" value={v.ficheTechniqueUrl} onChange={maj("ficheTechniqueUrl")} placeholder="https://…" /></Champ>
      </div>

      <Champ label={x.t("codePropose")} aide={x.t("codeProposeAide")}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="frn-etiquette" lang="fr">{codePropose ? `${codePropose} — ${materiau(codePropose)?.libelle || ""}` : x.t("aucun")}</span>
          <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setChoisirCode(!choisirCode)}>{x.t("modifier")}</button>
          {codePropose && <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setCodePropose("")}>{x.t("retirer")}</button>}
        </div>
      </Champ>
      {choisirCode && <ChoixMateriau categories={[categorie]} uniteRef={uniteRef} valeur={codePropose} onChange={(c) => { setCodePropose(c); setChoisirCode(false); }} />}

      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn" type="submit" disabled={envoi}>{envoi ? x.t("enregistrement") : x.t("enregistrer")}</button>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={onAnnuler}>{x.t("annuler")}</button>
      </div>
      <GalerieImages objetType="PRODUIT" objetId={initial?.id || null} />
      <small style={{ color: T.inkMuted }}>{f.raisonSociale}</small>
    </form>
  );
}
