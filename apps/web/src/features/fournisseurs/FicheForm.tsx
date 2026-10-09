/**
 * Saisie d'une fiche de prix : choix du matériau dans le catalogue de
 * référence, unité de vente (avec sa conversion vers l'unité du chiffrage),
 * prix HT/TTC, quantité minimale, dégressifs, livraison, disponibilité, validité.
 */
import React, { useMemo, useState } from "react";
import { CATALOGUE, materiau } from "../../domain/materiaux/catalogue";
import { prixAberrant, prixParUniteRef, unitesVente } from "../../domain/materiaux/conversions";
import { REGIONS_MA } from "../../domain/materiaux/regions";
import { CATEGORIES, UNITES_REF, type Categorie, type MaterialRef } from "../../domain/materiaux/types";
import { apiFournisseurs, messageErreur, type Degressif, type Fiche, type Livraison } from "./api";
import { Champ, fmtDH, T } from "./ui";

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ChoixMateriau({ categories, valeur, onChange }: { categories: string[]; valeur: string; onChange: (code: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(categories[0] || "");
  const resultats = useMemo(() => {
    const k = sansAccent(q.trim());
    return CATALOGUE.filter((r) => r.actif !== false && (!cat || r.categorie === cat) &&
      (!k || sansAccent(`${r.code} ${r.libelle} ${r.famille} ${(r.motsCles || []).join(" ")}`).includes(k))).slice(0, 60);
  }, [q, cat]);
  const choisi = valeur ? materiau(valeur) : undefined;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="frn-grille2">
        <input className="frn-input" placeholder="Rechercher : ciment, HA 12, sable, câble…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un matériau" />
        <select className="frn-input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {(Object.entries(CATEGORIES) as [Categorie, string][]).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </select>
      </div>
      <select className="frn-input" size={6} value={valeur} onChange={(e) => onChange(e.target.value)} aria-label="Matériau" style={{ minHeight: 150 }}>
        {resultats.map((r) => <option key={r.code} value={r.code}>{r.libelle} — {r.code}</option>)}
      </select>
      {choisi && (
        <small style={{ color: T.inkMid }}>
          {choisi.libelle} · compté au chiffrage en <strong>{UNITES_REF[choisi.uniteRef]}</strong> · prix de référence {fmtDH(choisi.prix.ref)} / {choisi.uniteRef} (fiabilité {choisi.prix.fiabilite})
        </small>
      )}
    </div>
  );
}

const zonesOptions: [string, string][] = [["national", "Tout le Maroc"], ...REGIONS_MA.map((r) => [r.code, r.nom] as [string, string])];

export default function FicheForm({ categories, regionParDefaut, initiale, onEnregistree, onAnnuler }: {
  categories: string[]; regionParDefaut: string | null; initiale?: Fiche; onEnregistree: (f: Fiche) => void; onAnnuler: () => void;
}) {
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

  const unites = ref ? unitesVente(ref) : [];
  const uniteEff = unites.some((u) => u.code === unite) ? unite : unites[1]?.code || unites[0]?.code || "";
  const prixNum = Number(prix.replace(",", "."));
  const prixRef = ref && prixNum > 0 ? prixParUniteRef(ref.code, uniteEff, prixNum) : null;
  const aberrant = ref && prixRef !== null && prixAberrant(ref.code, prixRef);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    if (!ref) { setErreur("Choisissez un matériau."); return; }
    setEnvoi(true);
    try {
      const r = await apiFournisseurs.enregistrerFiche({
        materiauCode: ref.code, uniteVente: uniteEff, prixHT: prix, tvaPct: tva, quantiteMin: qMin || null, disponibilite: dispo,
        validiteJusquau: validite, marque, note, degressifs: degressifs.filter((d) => d.aPartirDe > 0 && d.prixHT > 0),
        livraison: livraison.filter((l) => l.zone),
      });
      onEnregistree(r.fiche);
    } catch (err) { setErreur(messageErreur(err)); } finally { setEnvoi(false); }
  }

  return (
    <form onSubmit={enregistrer} className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: T.navy }}>{initiale ? `Modifier : ${initiale.libelle}` : "Nouvelle fiche de prix"}</h2>
      {!initiale && <Champ label="Matériau du catalogue"><ChoixMateriau categories={categories} valeur={code} onChange={(c) => { setCode(c); setUnite(""); }} /></Champ>}

      {ref && (<>
        <div className="frn-grille3">
          <Champ label="Unité de vente">
            <select className="frn-input" value={uniteEff} onChange={(e) => setUnite(e.target.value)}>
              {unites.map((u) => <option key={u.code} value={u.code}>{u.code === ref.uniteRef ? `${UNITES_REF[ref.uniteRef]}` : `${u.libelle}${u.approx ? " (≈)" : ""}`}</option>)}
            </select>
          </Champ>
          <Champ label="Prix HT (DH)" aide="par unité de vente">
            <input className="frn-input" inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} required />
          </Champ>
          <Champ label="TVA">
            <select className="frn-input" value={tva} onChange={(e) => setTva(Number(e.target.value))}>
              {[20, 14, 10, 7, 0].map((t) => <option key={t} value={t}>{t} %</option>)}
            </select>
          </Champ>
        </div>
        {prixRef !== null && (
          <div className={`frn-alerte ${aberrant ? "frn-warn" : "frn-info"}`}>
            Soit {fmtDH(prixNum * (1 + tva / 100))} TTC, et {fmtDH(prixRef, 3)} HT par {ref.uniteRef} pour le chiffrage
            {aberrant ? ` — écart de plus de 50 % avec la référence (${fmtDH(ref.prix.ref)}) : la fiche sera vérifiée par l'équipe avant publication.` : "."}
          </div>
        )}
        <div className="frn-grille3">
          <Champ label="Quantité minimale" aide="en unités de vente, facultatif">
            <input className="frn-input" inputMode="decimal" value={qMin} onChange={(e) => setQMin(e.target.value)} />
          </Champ>
          <Champ label="Disponibilité">
            <select className="frn-input" value={dispo} onChange={(e) => setDispo(e.target.value)}>
              <option value="EN_STOCK">En stock</option><option value="SUR_COMMANDE">Sur commande</option><option value="RUPTURE">Rupture</option>
            </select>
          </Champ>
          <Champ label="Prix valable jusqu'au">
            <input className="frn-input" type="date" value={validite} onChange={(e) => setValidite(e.target.value)} />
          </Champ>
        </div>

        <fieldset style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: 12 }}>
          <legend style={{ fontSize: 14, fontWeight: 600 }}>Livraison</legend>
          {livraison.map((l, i) => (
            <div key={i} className="frn-grille3" style={{ marginBottom: 8 }}>
              <select className="frn-input" value={l.zone} aria-label="Zone" onChange={(e) => setLivraison(livraison.map((x, j) => j === i ? { ...x, zone: e.target.value } : x))}>
                {zonesOptions.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
              <input className="frn-input" inputMode="decimal" aria-label="Frais HT" placeholder="Frais HT (DH)" value={l.frais || ""}
                onChange={(e) => setLivraison(livraison.map((x, j) => j === i ? { ...x, frais: Number(e.target.value.replace(",", ".")) || 0 } : x))} />
              <div style={{ display: "flex", gap: 8 }}>
                <input className="frn-input" inputMode="numeric" aria-label="Délai en jours" placeholder="Délai (jours)" value={l.delaiJours ?? ""}
                  onChange={(e) => setLivraison(livraison.map((x, j) => j === i ? { ...x, delaiJours: e.target.value === "" ? null : Number(e.target.value) } : x))} />
                <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" aria-label="Retirer" onClick={() => setLivraison(livraison.filter((_, j) => j !== i))}>×</button>
              </div>
            </div>
          ))}
          {livraison.length < 15 && <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setLivraison([...livraison, { zone: "national", frais: 0, delaiJours: null }])}>+ Zone</button>}
        </fieldset>

        <fieldset style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 8, padding: 12 }}>
          <legend style={{ fontSize: 14, fontWeight: 600 }}>Prix dégressifs <small style={{ fontWeight: 400 }}>— facultatif</small></legend>
          {degressifs.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>À partir de</span>
              <input className="frn-input" style={{ width: 110 }} inputMode="decimal" aria-label="Quantité" value={d.aPartirDe || ""}
                onChange={(e) => setDegressifs(degressifs.map((x, j) => j === i ? { ...x, aPartirDe: Number(e.target.value.replace(",", ".")) || 0 } : x))} />
              <span style={{ fontSize: 14 }}>unités :</span>
              <input className="frn-input" style={{ width: 120 }} inputMode="decimal" aria-label="Prix HT" value={d.prixHT || ""}
                onChange={(e) => setDegressifs(degressifs.map((x, j) => j === i ? { ...x, prixHT: Number(e.target.value.replace(",", ".")) || 0 } : x))} />
              <span style={{ fontSize: 14 }}>DH HT</span>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" aria-label="Retirer" onClick={() => setDegressifs(degressifs.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          {degressifs.length < 5 && <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setDegressifs([...degressifs, { aPartirDe: 0, prixHT: 0 }])}>+ Palier</button>}
        </fieldset>

        <div className="frn-grille2">
          <Champ label="Marque / référence" aide="facultatif"><input className="frn-input" value={marque} onChange={(e) => setMarque(e.target.value)} maxLength={80} /></Champ>
          <Champ label="Note" aide="facultatif"><input className="frn-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Champ>
        </div>
      </>)}

      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn" type="submit" disabled={envoi || !ref}>{envoi ? "Enregistrement…" : "Enregistrer la fiche"}</button>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={onAnnuler}>Annuler</button>
      </div>
    </form>
  );
}
