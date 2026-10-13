/**
 * Saisie d'une fiche de prix sur un matériau du référentiel : choix du code
 * CIT, unité de vente (avec sa conversion vers l'unité du chiffrage),
 * prix HT/TTC, quantité minimale, dégressifs, livraison, disponibilité,
 * validité. Pour un produit absent du référentiel : ProduitsPro.tsx.
 */
import React, { useMemo, useState } from "react";
import { CATEGORIES_L3, REGIONS_L3, famille3, unite3 } from "../../domain/cercles/libelles";
import { CATALOGUE, materiau } from "../../domain/materiaux/catalogue";
import { prixAberrant, prixParUniteRef, unitesVente } from "../../domain/materiaux/conversions";
import { prixReference } from "../../domain/materiaux/reference";
import { REGIONS_MA } from "../../domain/materiaux/regions";
import type { MaterialRef } from "../../domain/materiaux/types";
import { apiFournisseurs, codeErreur, type Degressif, type Fiche, type Livraison } from "./api";
import { useTextes } from "./textes";
import { Champ, T } from "./ui";

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ChoixMateriau({ categories, valeur, onChange, uniteRef }: { categories: string[]; valeur: string; onChange: (code: string) => void; uniteRef?: string }) {
  const x = useTextes();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(categories[0] || "");
  const resultats = useMemo(() => {
    const k = sansAccent(q.trim());
    return CATALOGUE.filter((r) => r.actif !== false && (!cat || r.categorie === cat) && (!uniteRef || r.uniteRef === uniteRef) &&
      (!k || sansAccent(`${r.code} ${r.libelle} ${r.famille} ${(r.motsCles || []).join(" ")}`).includes(k))).slice(0, 60);
  }, [q, cat, uniteRef]);
  const choisi = valeur ? materiau(valeur) : undefined;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="frn-grille2">
        <input className="frn-input" placeholder={x.t("rechercherMateriau")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={x.t("rechercherMateriau")} />
        <select className="frn-input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={x.t("categorie")}>
          <option value="">{x.t("toutesCategories")}</option>
          {Object.entries(CATEGORIES_L3).map(([c, l]) => <option key={c} value={c}>{x.l3(l)}</option>)}
        </select>
      </div>
      <select className="frn-input" size={6} value={valeur} onChange={(e) => onChange(e.target.value)} aria-label={x.t("materiauCatalogue")} style={{ minHeight: 150 }}>
        {resultats.map((r) => <option key={r.code} value={r.code} lang="fr">{r.libelle} — {r.code} · {x.l3(famille3(r.famille))}</option>)}
      </select>
      {choisi && (
        <small style={{ color: T.inkMid }}>
          <span lang="fr">{choisi.libelle}</span> · {x.t("compteEn", { u: x.l3(unite3(choisi.uniteRef)) })} ·{" "}
          {x.t("prixReference", { p: x.dh(prixReference(choisi.code)?.ref ?? choisi.prix.ref), u: x.l3(unite3(choisi.uniteRef)), f: prixReference(choisi.code)?.fiabilite ?? choisi.prix.fiabilite })}
        </small>
      )}
    </div>
  );
}

export default function FicheForm({ categories, regionParDefaut, initiale, onEnregistree, onAnnuler }: {
  categories: string[]; regionParDefaut: string | null; initiale?: Fiche; onEnregistree: (f: Fiche) => void; onAnnuler: () => void;
}) {
  const x = useTextes();
  const [code, setCode] = useState(initiale?.materiauCode || "");
  const ref: MaterialRef | undefined = code ? materiau(code) : undefined;
  const [unite, setUnite] = useState(initiale?.uniteVente || "");
  const [prix, setPrix] = useState(initiale ? String(initiale.prixHT) : "");
  const [tva, setTva] = useState(initiale?.tvaPct ?? 20);
  const [qMin, setQMin] = useState(initiale?.quantiteMin != null ? String(initiale.quantiteMin) : "");
  const [dispo, setDispo] = useState(initiale?.disponibilite || "EN_STOCK");
  const [validite, setValidite] = useState(initiale?.validiteJusquau || new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10));
  const [marque, setMarque] = useState(initiale?.marque || "");
  const [note, setNote] = useState(initiale?.note || "");
  const [degressifs, setDegressifs] = useState<Degressif[]>(initiale?.degressifs || []);
  const [livraison, setLivraison] = useState<Livraison[]>(initiale?.livraison?.length ? initiale.livraison : [{ zone: regionParDefaut || "national", frais: 0, delaiJours: 2 }]);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const zonesOptions: [string, string][] = [["national", x.t("toutMaroc")], ...REGIONS_MA.map((r) => [r.code, x.l3(REGIONS_L3[r.code])] as [string, string])];

  const unites = ref ? unitesVente(ref) : [];
  const uniteEff = unites.some((u) => u.code === unite) ? unite : unites[1]?.code || unites[0]?.code || "";
  const prixNum = Number(prix.replace(",", "."));
  const prixRef = ref && prixNum > 0 ? prixParUniteRef(ref.code, uniteEff, prixNum) : null;
  const aberrant = ref && prixRef !== null && prixAberrant(ref.code, prixRef);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!ref) { setErreur(x.t("choisirMateriau")); return; }
    setEnvoi(true);
    try {
      const r = await apiFournisseurs.enregistrerFiche({
        materiauCode: ref.code, uniteVente: uniteEff, prixHT: prix, tvaPct: tva, quantiteMin: qMin || null, disponibilite: dispo,
        validiteJusquau: validite, marque, note, degressifs: degressifs.filter((d) => d.aPartirDe > 0 && d.prixHT > 0),
        livraison: livraison.filter((l) => l.zone),
      });
      onEnregistree(r.fiche);
    } catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }

  return (
    <form onSubmit={enregistrer} className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: T.navy }}>{initiale ? x.t("modifierX", { x: initiale.libelle }) : x.t("nouvelleFiche")}</h2>
      {!initiale && <Champ label={x.t("materiauCatalogue")}><ChoixMateriau categories={categories} valeur={code} onChange={(c) => { setCode(c); setUnite(""); }} /></Champ>}

      {ref && (<>
        <div className="frn-grille3">
          <Champ label={x.t("uniteVente")}>
            <select className="frn-input" value={uniteEff} onChange={(e) => setUnite(e.target.value)}>
              {unites.map((u) => <option key={u.code} value={u.code}>{u.code === ref.uniteRef ? x.l3(unite3(ref.uniteRef)) : `${u.libelle}${u.approx ? " (≈)" : ""}`}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("prixHTDH")} aide={x.t("parUniteVente")}>
            <input className="frn-input" inputMode="decimal" dir="ltr" value={prix} onChange={(e) => setPrix(e.target.value)} required />
          </Champ>
          <Champ label={x.t("tva")}>
            <select className="frn-input" value={tva} onChange={(e) => setTva(Number(e.target.value))}>
              {[20, 14, 10, 7, 0].map((t) => <option key={t} value={t}>{t} %</option>)}
            </select>
          </Champ>
        </div>
        {prixRef !== null && (
          <div className={`frn-alerte ${aberrant ? "frn-warn" : "frn-info"}`}>
            {x.t("soitTTC", { ttc: x.dh(prixNum * (1 + tva / 100)), ref: x.dh(prixRef, 3), u: x.l3(unite3(ref.uniteRef)) })}
            {aberrant ? x.t("aberrant", { ref: x.dh(prixReference(ref.code)?.ref ?? ref.prix.ref) }) : "."}
          </div>
        )}
        <div className="frn-grille3">
          <Champ label={x.t("qMin")} aide={x.t("qMinAide")}>
            <input className="frn-input" inputMode="decimal" dir="ltr" value={qMin} onChange={(e) => setQMin(e.target.value)} />
          </Champ>
          <Champ label={x.t("disponibilite")}>
            <select className="frn-input" value={dispo} onChange={(e) => setDispo(e.target.value)}>
              {(["EN_STOCK", "SUR_COMMANDE", "RUPTURE"] as const).map((d) => <option key={d} value={d}>{x.t(`dispo_${d}`)}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("valableJusquau")}>
            <input className="frn-input" type="date" value={validite} onChange={(e) => setValidite(e.target.value)} />
          </Champ>
        </div>

        <fieldset className="frn-fieldset">
          <legend>{x.t("livraison")}</legend>
          {livraison.map((l, i) => (
            <div key={i} className="frn-grille3" style={{ marginBottom: 8 }}>
              <select className="frn-input" value={l.zone} aria-label={x.t("zone")} onChange={(e) => setLivraison(livraison.map((y, j) => j === i ? { ...y, zone: e.target.value } : y))}>
                {zonesOptions.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
              <input className="frn-input" inputMode="decimal" dir="ltr" aria-label={x.t("fraisHT")} placeholder={x.t("fraisHT")} value={l.frais || ""}
                onChange={(e) => setLivraison(livraison.map((y, j) => j === i ? { ...y, frais: Number(e.target.value.replace(",", ".")) || 0 } : y))} />
              <div style={{ display: "flex", gap: 8 }}>
                <input className="frn-input" inputMode="numeric" dir="ltr" aria-label={x.t("delaiJours")} placeholder={x.t("delaiJours")} value={l.delaiJours ?? ""}
                  onChange={(e) => setLivraison(livraison.map((y, j) => j === i ? { ...y, delaiJours: e.target.value === "" ? null : Number(e.target.value) } : y))} />
                <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" aria-label={x.t("retirer")} onClick={() => setLivraison(livraison.filter((_, j) => j !== i))}>×</button>
              </div>
            </div>
          ))}
          {livraison.length < 15 && <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setLivraison([...livraison, { zone: "national", frais: 0, delaiJours: null }])}>{x.t("plusZone")}</button>}
        </fieldset>

        <fieldset className="frn-fieldset">
          <legend>{x.t("degressifs")} <small style={{ fontWeight: 400 }}>— {x.t("facultatif")}</small></legend>
          {degressifs.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>{x.t("aPartirDe")}</span>
              <input className="frn-input" style={{ width: 110 }} inputMode="decimal" dir="ltr" aria-label={x.t("qMin")} value={d.aPartirDe || ""}
                onChange={(e) => setDegressifs(degressifs.map((y, j) => j === i ? { ...y, aPartirDe: Number(e.target.value.replace(",", ".")) || 0 } : y))} />
              <span style={{ fontSize: 14 }}>{x.t("unites")}</span>
              <input className="frn-input" style={{ width: 120 }} inputMode="decimal" dir="ltr" aria-label={x.t("prixHTDH")} value={d.prixHT || ""}
                onChange={(e) => setDegressifs(degressifs.map((y, j) => j === i ? { ...y, prixHT: Number(e.target.value.replace(",", ".")) || 0 } : y))} />
              <span style={{ fontSize: 14 }}>{x.t("dh")} {x.t("ht")}</span>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" aria-label={x.t("retirer")} onClick={() => setDegressifs(degressifs.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {degressifs.length < 5 && <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setDegressifs([...degressifs, { aPartirDe: 0, prixHT: 0 }])}>{x.t("plusPalier")}</button>}
        </fieldset>

        <div className="frn-grille2">
          <Champ label={x.t("marqueRef")} aide={x.t("facultatif")}><input className="frn-input" value={marque} onChange={(e) => setMarque(e.target.value)} maxLength={80} /></Champ>
          <Champ label={x.t("note")} aide={x.t("facultatif")}><input className="frn-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Champ>
        </div>
      </>)}

      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn" type="submit" disabled={envoi || !ref}>{envoi ? x.t("enregistrement") : x.t("enregistrer")}</button>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={onAnnuler}>{x.t("annuler")}</button>
      </div>
    </form>
  );
}
