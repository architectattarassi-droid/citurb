/**
 * Fiche société prédisposée par métier : les champs viennent du gabarit du
 * type de société (domain/cercles/gabarits.ts), rangés par section
 * (identité, capacités et garanties, offre, références, horaires et
 * conditions). Raison sociale et présentation en français et/ou en arabe.
 */
import React, { useState } from "react";
import { SECTIONS, TYPES_SOCIETE, champsDuType, type ChampFiche, type ReferenceChantier, type Section } from "../../domain/cercles/gabarits";
import { apiFournisseurs, codeErreur, type FournisseurPrive } from "./api";
import GalerieImages from "./GalerieImages";
import { useTextes } from "./textes";
import { Champ, Puces, T } from "./ui";

type Valeurs = Record<string, unknown>;
const lignes = (v: unknown) => (Array.isArray(v) ? (v as string[]).join("\n") : "");
const versListe = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export default function FicheSocieteForm({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const x = useTextes();
  const type = TYPES_SOCIETE[f.metier];
  const champs = champsDuType(f.metier);
  const [fiche, setFiche] = useState<Valeurs>({ ...f.fiche });
  const [nomAr, setNomAr] = useState(f.raisonSocialeAr || "");
  const [desc, setDesc] = useState(f.description || "");
  const [descAr, setDescAr] = useState(f.descriptionAr || "");
  const [refs, setRefs] = useState<ReferenceChantier[]>(Array.isArray(f.fiche.references) ? f.fiche.references : []);
  const [texteListes, setTexteListes] = useState<Record<string, string>>(() =>
    Object.fromEntries(champs.filter((c) => c.type === "liste" && c.cle !== "references").map((c) => [c.cle, lignes(f.fiche[c.cle])])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const maj = (cle: string, v: unknown) => setFiche((p) => ({ ...p, [cle]: v }));

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setEnvoi(true);
    const valeurs: Valeurs = { ...fiche, references: refs.filter((r) => r.titre.trim()) };
    for (const [cle, s] of Object.entries(texteListes)) valeurs[cle] = versListe(s);
    for (const c of champs) if (c.type === "nombre" && (valeurs[c.cle] === "" || valeurs[c.cle] == null)) delete valeurs[c.cle];
    try {
      await apiFournisseurs.majProfil({ raisonSocialeAr: nomAr, description: desc, descriptionAr: descAr, fiche: valeurs });
      setMsg({ ok: true, t: x.t("fsEnregistree") });
      recharger();
    } catch (err) { setMsg({ ok: false, t: x.erreur(codeErreur(err)) }); } finally { setEnvoi(false); }
  }

  function rendu(c: ChampFiche) {
    const v = fiche[c.cle];
    const aide = c.aide ? x.l3(c.aide) : undefined;
    switch (c.type) {
      case "texte":
        return <Champ key={c.cle} label={x.l3(c.libelle)} aide={aide}><input className="frn-input" value={String(v ?? "")} maxLength={c.max ?? 200} onChange={(e) => maj(c.cle, e.target.value)} /></Champ>;
      case "nombre":
        return <Champ key={c.cle} label={x.l3(c.libelle)} aide={aide}><input className="frn-input" inputMode="decimal" dir="ltr" value={v == null ? "" : String(v)} onChange={(e) => maj(c.cle, e.target.value === "" ? "" : Number(e.target.value.replace(",", ".")))} /></Champ>;
      case "choix":
        return (
          <Champ key={c.cle} label={x.l3(c.libelle)} aide={aide}>
            <select className="frn-input" value={String(v ?? "")} onChange={(e) => maj(c.cle, e.target.value || undefined)}>
              <option value="">—</option>
              {c.options?.map(([k, l]) => <option key={k} value={k}>{x.l3(l)}</option>)}
            </select>
          </Champ>
        );
      case "oui_non":
        return (
          <Champ key={c.cle} label={x.l3(c.libelle)} aide={aide}>
            <select className="frn-input" value={v === true ? "1" : v === false ? "0" : ""} onChange={(e) => maj(c.cle, e.target.value === "" ? undefined : e.target.value === "1")}>
              <option value="">—</option><option value="1">{x.t("oui")}</option><option value="0">{x.t("non")}</option>
            </select>
          </Champ>
        );
      case "multi":
        return <div key={c.cle} style={{ gridColumn: "1 / -1" }}><Champ label={x.l3(c.libelle)} aide={aide}><Puces options={(c.options || []).map(([k, l]) => [k, x.l3(l)] as [string, string])} valeurs={Array.isArray(v) ? (v as string[]) : []} onChange={(l) => maj(c.cle, l)} /></Champ></div>;
      case "liste":
        return (
          <Champ key={c.cle} label={x.l3(c.libelle)} aide={x.t("uneParLigne")}>
            <textarea className="frn-input" rows={3} value={texteListes[c.cle] ?? ""} onChange={(e) => setTexteListes((p) => ({ ...p, [c.cle]: e.target.value }))} />
          </Champ>
        );
    }
  }

  const sections = (Object.keys(SECTIONS) as Section[]).filter((s) => champs.some((c) => c.section === s));
  return (
    <form className="frn-carte" onSubmit={enregistrer} style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: T.navy }}>{x.t("fsTitre", { type: x.l3(type?.libelle) })}</h2>
        <p style={{ margin: 0, color: T.inkMid, fontSize: 14 }}>{x.t("fsChapo")}</p>
      </div>
      <div className="frn-grille2">
        <Champ label={x.t("raisonSociale")} aide={x.t("modifiableEquipe")}><input className="frn-input" value={f.raisonSociale} disabled /></Champ>
        <Champ label={x.t("nomAr")} aide={x.t("facultatif")}><input className="frn-input" dir="rtl" lang="ar" value={nomAr} maxLength={120} onChange={(e) => setNomAr(e.target.value)} /></Champ>
        <Champ label={x.t("descFr")}><textarea className="frn-input" dir="ltr" lang="fr" rows={5} value={desc} maxLength={2000} onChange={(e) => setDesc(e.target.value)} /></Champ>
        <Champ label={x.t("descAr")}><textarea className="frn-input" dir="rtl" lang="ar" rows={5} value={descAr} maxLength={2000} onChange={(e) => setDescAr(e.target.value)} /></Champ>
      </div>

      {sections.map((s) => (
        <fieldset key={s} className="frn-fieldset">
          <legend>{x.l3(SECTIONS[s])}</legend>
          {s === "REFERENCES" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {refs.map((r, i) => (
                <div key={i} style={{ display: "grid", gap: 8, paddingBottom: 12, borderBottom: `1px solid ${T.borderSoft}` }}>
                  <div className="frn-grille3">
                    <Champ label={x.t("refTitre")}><input className="frn-input" value={r.titre} maxLength={120} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, titre: e.target.value } : y))} /></Champ>
                    <Champ label={x.t("refVille")}><input className="frn-input" value={r.ville} maxLength={80} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, ville: e.target.value } : y))} /></Champ>
                    <Champ label={x.t("refAnnee")}><input className="frn-input" inputMode="numeric" dir="ltr" value={r.annee ?? ""} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, annee: e.target.value ? Number(e.target.value) : null } : y))} /></Champ>
                  </div>
                  <div className="frn-grille2">
                    <Champ label={x.t("refClient")}><input className="frn-input" value={r.client ?? ""} maxLength={80} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, client: e.target.value } : y))} /></Champ>
                    <Champ label={x.t("refDesc")}><input className="frn-input" value={r.description ?? ""} maxLength={600} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, description: e.target.value } : y))} /></Champ>
                  </div>
                  <Champ label={x.t("refPhotos")}>
                    <textarea className="frn-input" dir="ltr" rows={2} value={r.photos.join("\n")} onChange={(e) => setRefs(refs.map((y, j) => j === i ? { ...y, photos: versListe(e.target.value) } : y))} />
                  </Champ>
                  <div><button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setRefs(refs.filter((_, j) => j !== i))}>{x.t("retirerReference")}</button></div>
                </div>
              ))}
              {refs.length < 12 && <div><button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => setRefs([...refs, { titre: "", ville: f.ville, annee: new Date().getFullYear(), client: null, description: null, photos: [] }])}>{x.t("ajouterReference")}</button></div>}
            </div>
          ) : (
            <div className="frn-grille2">{champs.filter((c) => c.section === s).map(rendu)}</div>
          )}
        </fieldset>
      ))}

      <GalerieImages objetType="SOCIETE" objetId={f.id} titre={x.t("imgGalerieSociete")} />
      {msg && <div className={`frn-alerte ${msg.ok ? "frn-ok" : "frn-ko"}`} role="status">{msg.t}</div>}
      <div><button className="frn-btn" disabled={envoi}>{envoi ? x.t("enregistrement") : x.t("enregistrer")}</button></div>
    </form>
  );
}
