/**
 * « Mes prestations » : prix de pose, de main-d'œuvre ou de prestation à
 * l'unité du chiffrage. Rattachement à un ouvrage (domain/chiffrage/ouvrages.ts :
 * pose seule ou fourni-posé, unité imposée), à une prestation hors ouvrage
 * (domain/cercles/offres.ts : étude, essai, levé, contrôle, location,
 * transport) ou libre. Publication après modération.
 */
import React, { useMemo, useState } from "react";
import { TYPES_SOCIETE } from "../../domain/cercles/gabarits";
import { LOTS_L3, REGIONS_L3, unite3 } from "../../domain/cercles/libelles";
import { NATURES_SERVICE, PRESTATIONS, UNITES_SERVICE } from "../../domain/cercles/offres";
import { LOTS } from "../../domain/chiffrage/lots";
import { OUVRAGES } from "../../domain/chiffrage/ouvrages";
import { coefK, prixOuvrage } from "../../domain/chiffrage/prix";
import { REGIONS_MA } from "../../domain/materiaux/regions";
import { apiFournisseurs, codeErreur, type FournisseurPrive, type Service } from "./api";
import GalerieImages from "./GalerieImages";
import { useTextes } from "./textes";
import { BadgeStatut, Champ, Puces, T, TexteSaisi } from "./ui";

const lignes = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Référence du chiffrage pour une offre sur un ouvrage (même règle que functions/_lib/catalogue.ts). */
function referenceOuvrage(code: string, nature: string): number | null {
  const o = OUVRAGES[code];
  if (!o) return null;
  const p = prixOuvrage(code);
  return nature === "FOURNI_POSE" ? p.pu : (p.repartition.mainOeuvre + p.repartition.materiel) * coefK(o, "ref");
}

export default function ServicesPro({ f, services, recharger }: { f: FournisseurPrive; services: Service[]; recharger: () => void }) {
  const x = useTextes();
  const [edition, setEdition] = useState<Service | "nouveau" | null>(null);
  const [erreur, setErreur] = useState("");
  if (edition) return <ServiceForm f={f} initial={edition === "nouveau" ? undefined : edition} onFini={() => { setEdition(null); recharger(); }} onAnnuler={() => setEdition(null)} />;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0, color: T.inkMid, fontSize: 14, lineHeight: 1.55 }}>{x.t("svChapo")}</p>
      <div><button className="frn-btn frn-btn-or" onClick={() => setEdition("nouveau")}>{x.t("svAjouter")}</button></div>
      {erreur && <div className="frn-alerte frn-ko">{erreur}</div>}
      {!services.length ? <div className="frn-carte">{x.t("svAucun")}</div> : (
        <div className="frn-defil">
          <table className="frn-table frn-cartes-mobile">
            <thead><tr><th>{x.t("col_prestation")}</th><th>{x.t("nature")}</th><th>{x.t("col_prix")}</th><th>{x.t("col_statut")}</th><th /></tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td data-l={x.t("col_prestation")}>
                    <TexteSaisi as="strong" fr={s.designationFr} ar={s.designationAr} />
                    <div style={{ color: T.inkMuted, fontSize: 12 }}>{s.ouvrageCode || s.prestationCode || ""}</div>
                  </td>
                  <td data-l={x.t("nature")}>{x.l3(NATURES_SERVICE[s.nature])}</td>
                  <td data-l={x.t("col_prix")}>{x.dh(s.prixHT)} {x.t("ht")} / {x.l3(unite3(s.unite))}</td>
                  <td data-l={x.t("col_statut")}>
                    <BadgeStatut statut={s.statut || "PENDING"} offre />
                    {s.motifRejet && <div style={{ fontSize: 12, color: T.danger }}>{x.t("motif", { m: s.motifRejet })}</div>}
                    {s.signalement && <div style={{ fontSize: 12, color: T.warn }}>{x.t("ecart", { n: Math.round((s.ecartRef || 0) * 100) })}</div>}
                  </td>
                  <td data-l="">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setEdition(s)}>{x.t("modifier")}</button>
                      <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={async () => {
                        if (!window.confirm(x.t("confirmerRetrait", { x: x.bi(s.designationFr, s.designationAr).texte }))) return;
                        try { await apiFournisseurs.retirerService(s.id); recharger(); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
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

type Mode = "ouvrage" | "prestation" | "libre";

function ServiceForm({ f, initial, onFini, onAnnuler }: { f: FournisseurPrive; initial?: Service; onFini: () => void; onAnnuler: () => void }) {
  const x = useTextes();
  const naturesType = TYPES_SOCIETE[f.metier]?.natures || [];
  const [mode, setMode] = useState<Mode>(initial?.ouvrageCode ? "ouvrage" : initial?.prestationCode ? "prestation" : initial ? "libre"
    : naturesType.some((n) => n === "POSE" || n === "FOURNI_POSE") ? "ouvrage" : "prestation");
  const [lot, setLot] = useState(initial?.ouvrageCode ? OUVRAGES[initial.ouvrageCode]?.lot || "" : "");
  const [q, setQ] = useState("");
  const [ouvrage, setOuvrage] = useState(initial?.ouvrageCode || "");
  const [prestation, setPrestation] = useState(initial?.prestationCode || "");
  const [nature, setNature] = useState(initial?.nature || (naturesType.includes("POSE") ? "POSE" : naturesType[0] || "AUTRE"));
  const [unite, setUnite] = useState(initial?.unite || "u");
  const [v, setV] = useState({
    designationFr: initial?.designationFr || "", designationAr: initial?.designationAr || "", descriptionFr: initial?.descriptionFr || "",
    descriptionAr: initial?.descriptionAr || "", prixHT: initial?.prixHT != null ? String(initial.prixHT) : "", delaiJours: initial?.delaiJours != null ? String(initial.delaiJours) : "",
    conditions: initial?.conditions || "", validiteJusquau: initial?.validiteJusquau || new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10),
    photos: (initial?.photos || []).join("\n"),
  });
  const [tva, setTva] = useState(initial?.tvaPct ?? 20);
  const [zones, setZones] = useState<string[]>(initial?.zones || []);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  const ouvrages = useMemo(() => {
    const k = sansAccent(q.trim());
    return Object.values(OUVRAGES).filter((o) => !o.interne && (!lot || o.lot === lot) && (!k || sansAccent(`${o.code} ${o.libelle}`).includes(k)));
  }, [lot, q]);
  const o = mode === "ouvrage" ? OUVRAGES[ouvrage] : undefined;
  const p = mode === "prestation" ? PRESTATIONS[prestation] : undefined;
  const uniteEff = o ? o.unite : p ? p.unite : unite;
  const natureEff = p ? p.nature : nature;
  const ref = o && (natureEff === "POSE" || natureEff === "FOURNI_POSE") ? referenceOuvrage(o.code, natureEff) : null;
  const zonesOptions: [string, string][] = [["national", x.t("toutMaroc")], ...REGIONS_MA.map((r) => [r.code, x.l3(REGIONS_L3[r.code])] as [string, string])];

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setEnvoi(true);
    try {
      await apiFournisseurs.enregistrerService(initial?.id || null, {
        nature: natureEff, ouvrageCode: mode === "ouvrage" ? ouvrage : null, prestationCode: mode === "prestation" ? prestation : null, unite: uniteEff,
        designationFr: v.designationFr, designationAr: v.designationAr, descriptionFr: v.descriptionFr, descriptionAr: v.descriptionAr,
        prixHT: v.prixHT, tvaPct: tva, zones, delaiJours: v.delaiJours, conditions: v.conditions, validiteJusquau: v.validiteJusquau, photos: lignes(v.photos),
      });
      onFini();
    } catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }

  return (
    <form onSubmit={enregistrer} className="frn-carte" style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: T.navy }}>{initial ? x.t("svModifier") : x.t("svNouveau")}</h2>
      <Champ label={x.t("rattachement")}>
        <div className="frn-puces">
          {(["ouvrage", "prestation", "libre"] as Mode[]).map((m) => (
            <label key={m} className={`frn-puce${mode === m ? " frn-puce-on" : ""}`}>
              <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />{x.t(`rat_${m}`)}
            </label>
          ))}
        </div>
      </Champ>

      {mode === "ouvrage" && (<>
        <div className="frn-grille3">
          <Champ label={x.t("tousLots")}>
            <select className="frn-input" value={lot} onChange={(e) => setLot(e.target.value)}>
              <option value="">{x.t("tousLots")}</option>
              {LOTS.map((l) => <option key={l.code} value={l.code}>{x.l3(LOTS_L3[l.code])}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("rechercherOuvrage")}><input className="frn-input" value={q} onChange={(e) => setQ(e.target.value)} /></Champ>
          <Champ label={x.t("nature")}>
            <select className="frn-input" value={nature} onChange={(e) => setNature(e.target.value)}>
              {(["POSE", "FOURNI_POSE"] as const).map((n) => <option key={n} value={n}>{x.l3(NATURES_SERVICE[n])}</option>)}
            </select>
          </Champ>
        </div>
        <select className="frn-input" size={6} value={ouvrage} onChange={(e) => setOuvrage(e.target.value)} aria-label={x.t("ouvrage")} style={{ minHeight: 150 }}>
          {ouvrages.map((y) => <option key={y.code} value={y.code} lang="fr">{y.code} — {y.libelle} ({y.unite})</option>)}
        </select>
      </>)}

      {mode === "prestation" && (
        <Champ label={x.t("prestation")}>
          <select className="frn-input" value={prestation} onChange={(e) => setPrestation(e.target.value)}>
            <option value="">—</option>
            {Object.entries(NATURES_SERVICE).filter(([n]) => Object.values(PRESTATIONS).some((y) => y.nature === n)).map(([n, l]) => (
              <optgroup key={n} label={x.l3(l)}>
                {Object.entries(PRESTATIONS).filter(([, y]) => y.nature === n).map(([k, y]) => <option key={k} value={k}>{x.l3(y.libelle)}</option>)}
              </optgroup>
            ))}
          </select>
        </Champ>
      )}

      {mode === "libre" && (
        <div className="frn-grille2">
          <Champ label={x.t("nature")}>
            <select className="frn-input" value={nature} onChange={(e) => setNature(e.target.value)}>
              {Object.entries(NATURES_SERVICE).map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("unite")}>
            <select className="frn-input" value={unite} onChange={(e) => setUnite(e.target.value)}>
              {UNITES_SERVICE.map((u) => <option key={u} value={u}>{x.l3(unite3(u))}</option>)}
            </select>
          </Champ>
        </div>
      )}

      <div className="frn-grille2">
        <Champ label={x.t("designationFr")} aide={mode === "libre" ? undefined : x.t("facultatif")}><input className="frn-input" dir="ltr" lang="fr" value={v.designationFr} maxLength={140} onChange={maj("designationFr")} placeholder={o?.libelle || (p ? p.libelle.fr : "")} /></Champ>
        <Champ label={x.t("designationAr")} aide={x.t("facultatif")}><input className="frn-input" dir="rtl" lang="ar" value={v.designationAr} maxLength={140} onChange={maj("designationAr")} placeholder={p ? p.libelle.ar : ""} /></Champ>
        <Champ label={x.t("descriptionFr")}><textarea className="frn-input" dir="ltr" lang="fr" rows={3} value={v.descriptionFr} maxLength={2000} onChange={maj("descriptionFr")} /></Champ>
        <Champ label={x.t("descriptionAr")}><textarea className="frn-input" dir="rtl" lang="ar" rows={3} value={v.descriptionAr} maxLength={2000} onChange={maj("descriptionAr")} /></Champ>
      </div>

      <div className="frn-grille3">
        <Champ label={x.t("prixHTUnite", { u: x.l3(unite3(uniteEff)) })}><input className="frn-input" inputMode="decimal" dir="ltr" value={v.prixHT} onChange={maj("prixHT")} required /></Champ>
        <Champ label={x.t("tva")}><select className="frn-input" value={tva} onChange={(e) => setTva(Number(e.target.value))}>{[20, 14, 10, 7, 0].map((t) => <option key={t} value={t}>{t} %</option>)}</select></Champ>
        <Champ label={x.t("delai")}><input className="frn-input" inputMode="numeric" dir="ltr" value={v.delaiJours} onChange={maj("delaiJours")} /></Champ>
      </div>
      {ref !== null && <div className="frn-alerte frn-info">{x.t("refChiffrage", { p: x.dh(ref), u: x.l3(unite3(uniteEff)) })}</div>}
      <div className="frn-grille2">
        <Champ label={x.t("conditionsService")}><input className="frn-input" value={v.conditions} maxLength={500} onChange={maj("conditions")} /></Champ>
        <Champ label={x.t("valableJusquau")}><input className="frn-input" type="date" value={v.validiteJusquau} onChange={maj("validiteJusquau")} /></Champ>
      </div>
      <Champ label={x.t("zonesIntervention")} aide={x.t("zonesProduitAide")}><Puces options={zonesOptions} valeurs={zones} onChange={setZones} /></Champ>
      <Champ label={x.t("photos")}><textarea className="frn-input" dir="ltr" rows={2} value={v.photos} onChange={maj("photos")} placeholder="https://…" /></Champ>
      <GalerieImages objetType="SERVICE" objetId={initial?.id || null} />

      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="frn-btn" type="submit" disabled={envoi || (mode === "ouvrage" && !ouvrage) || (mode === "prestation" && !prestation)}>{envoi ? x.t("enregistrement") : x.t("enregistrer")}</button>
        <button className="frn-btn frn-btn-ghost" type="button" onClick={onAnnuler}>{x.t("annuler")}</button>
      </div>
    </form>
  );
}
