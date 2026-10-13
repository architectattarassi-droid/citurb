/**
 * Modération du catalogue Cercles (back-office /cc/fournisseurs) :
 *   - fiches produit : rattacher à un code du référentiel (catalogue statique
 *     ou code créé), ou créer un nouveau code CIT-<PFX>-9NN (libellés FR/AR,
 *     famille, unité, parent, lots), corriger la conversion → APPROUVÉ ;
 *     rejeter (motif) ; archiver ;
 *   - fiches service : approuver (rattachement ouvrage / prestation corrigible),
 *     rejeter, archiver.
 * Endpoints : /api/cc/produits[/:id], /api/cc/services[/:id] (functions/_lib/catalogue.ts).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FAMILLES_PRODUIT, NATURES_SERVICE, PRESTATIONS } from "../../../domain/cercles/offres";
import { CATEGORIES_L3, unite3 } from "../../../domain/cercles/libelles";
import { CATALOGUE, materiau } from "../../../domain/materiaux/catalogue";
import { UNITES_REF } from "../../../domain/materiaux/types";
import { OUVRAGES } from "../../../domain/chiffrage/ouvrages";
import { CC } from "../../theme/tokens";

interface ProduitAdmin {
  id: string; famille: string; categorie: string; designationFr: string | null; designationAr: string | null; marque: string | null; modele: string | null;
  gamme: string | null; caracteristiques: Record<string, unknown>; uniteVente: string; uniteRef: string; facteur: number; prixHT: number; prixRefHT: number;
  photos: string[]; ficheTechniqueUrl: string | null; codePropose: string | null; materiauCode: string | null; statut: string; signalement: string | null;
  ecartRef: number | null; motifRejet: string | null; raisonSociale: string | null; ville: string | null; statutFournisseur: string | null; updatedAt: string | null;
}
interface ServiceAdmin {
  id: string; nature: string; ouvrageCode: string | null; prestationCode: string | null; designationFr: string | null; designationAr: string | null;
  unite: string; prixHT: number; statut: string; signalement: string | null; ecartRef: number | null; reference: number | null;
  raisonSociale: string | null; ville: string | null; statutFournisseur: string | null; updatedAt: string | null; motifRejet: string | null;
}
interface CodeCree { code: string; libelleFr: string; libelleAr: string | null; categorie: string; famille: string; uniteRef: string; parent: string | null }

async function appel<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(chemin, { credentials: "include", ...init, headers: { ...(init.body ? { "content-type": "application/json" } : {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error === "not_installed" ? "Tables du catalogue absentes : collez docs/prix/sql/cercles-fiches-catalogue.sql dans Neon." : j.error || `Erreur ${r.status}`);
  return j as T;
}
const fmt = (n: number | null | undefined, d = 2) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n));
const S = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radiusLg, padding: 16 } as React.CSSProperties,
  btn: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  btnGhost: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  input: { padding: 8, border: `1px solid ${CC.color.border}`, borderRadius: 6, fontSize: 13, width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  label: { display: "grid", gap: 4, fontSize: 12, color: CC.color.inkMid } as React.CSSProperties,
};

export function ProduitsAModerer() {
  const [statut, setStatut] = useState("PENDING");
  const [liste, setListe] = useState<ProduitAdmin[] | null>(null);
  const [codes, setCodes] = useState<CodeCree[]>([]);
  const [vignettes, setVignettes] = useState<Record<string, { id: string; vignette: string; url: string }[]>>({});
  const [erreur, setErreur] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const charger = useCallback(async () => {
    setErreur("");
    try { const r = await appel<{ produits: ProduitAdmin[]; codesCrees: CodeCree[] }>(`/api/cc/produits?statut=${statut}`); setListe(r.produits); setCodes(r.codesCrees); }
    catch (e) { setErreur((e as Error).message); setListe([]); return; }
    // Photos en attente : approuvées avec la fiche, donc montrées ici avant la décision.
    try {
      const im = await appel<{ images: { id: string; objetId: string; vignette: string; url: string }[] }>("/api/cc/images?statut=PENDING");
      const m: Record<string, { id: string; vignette: string; url: string }[]> = {};
      for (const i of im.images) (m[i.objetId] ??= []).push(i);
      setVignettes(m);
    } catch { setVignettes({}); }
  }, [statut]);
  useEffect(() => { void charger(); }, [charger]);

  async function moderer(id: string, corps: Record<string, unknown>) {
    setErreur("");
    try { const r = await appel<{ codeCree?: string | null }>(`/api/cc/produits/${id}`, { method: "PATCH", body: JSON.stringify(corps) }); if (r.codeCree) window.alert(`Code créé : ${r.codeCree}`); setOuvert(null); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ ...S.btnGhost, padding: 8 }}>
          <option value="PENDING">À modérer</option><option value="APPROVED">Publiés</option><option value="REJECTED">Refusés</option><option value="ARCHIVED">Archivés</option>
        </select>
        <button style={S.btnGhost} onClick={() => void charger()}>Actualiser</button>
        <span style={{ color: CC.color.inkMid, fontSize: 13 }}>Approuver = rattacher à un code du référentiel : le produit apparaît alors dans la matériauthèque et compte dans le prix marché (à partir de 3 fournisseurs).</span>
      </div>
      {erreur && <div style={{ ...S.carte, background: CC.color.dangerBg, color: CC.color.danger }}>{erreur}</div>}
      {liste === null ? <div>Chargement…</div> : !liste.length ? <div style={S.carte}>Rien dans cette vue.</div> : liste.map((p) => (
        <div key={p.id} style={{ ...S.carte, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <strong style={{ color: CC.color.navy }}>{p.designationFr || p.designationAr}</strong>
            {p.designationAr && p.designationFr && <span dir="rtl" lang="ar">{p.designationAr}</span>}
            <span style={{ color: CC.color.inkMid, fontSize: 13 }}>{[p.marque, p.modele].filter(Boolean).join(" · ")} · {FAMILLES_PRODUIT[p.famille]?.libelle.fr || p.famille} · {p.raisonSociale} ({p.ville}){p.statutFournisseur !== "APPROVED" ? ` · fournisseur ${p.statutFournisseur}` : ""}</span>
          </div>
          <div style={{ fontSize: 13 }}>
            {fmt(p.prixHT)} DH HT / {p.uniteVente} → <strong>{fmt(p.prixRefHT, 3)} DH / {unite3(p.uniteRef).fr}</strong> (facteur {fmt(p.facteur, 4)})
            {p.codePropose && <> · code proposé <strong>{p.codePropose}</strong> ({materiau(p.codePropose)?.libelle || "créé"}, réf. {fmt(materiau(p.codePropose)?.prix.ref, 3)} DH)</>}
            {p.signalement === "COORDONNEES" ? <span style={{ color: CC.color.danger, fontWeight: 600 }}> · coordonnées détectées dans les textes (masquées au public) — faire corriger ou refuser</span>
              : p.signalement && <span style={{ color: CC.color.warn, fontWeight: 600 }}> · écart {Math.round((p.ecartRef || 0) * 100)} %</span>}
            {p.materiauCode && <> · rattaché à <strong>{p.materiauCode}</strong></>}
          </div>
          {!!Object.keys(p.caracteristiques).length && <div style={{ fontSize: 12, color: CC.color.inkMid }}>{Object.entries(p.caracteristiques).map(([k, v]) => `${k} : ${String(v)}`).join(" · ")}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
            {p.photos.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer">photo {i + 1}</a>)}
            {p.ficheTechniqueUrl && <a href={p.ficheTechniqueUrl} target="_blank" rel="noreferrer">fiche technique</a>}
          </div>
          {!!vignettes[p.id]?.length && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: CC.color.inkMid }}>Photos en attente (approuvées avec la fiche ; refus individuel dans l'onglet Images) :</span>
              {vignettes[p.id].map((i) => <a key={i.id} href={i.url} target="_blank" rel="noreferrer"><img src={i.vignette} alt="" width={64} height={48} style={{ objectFit: "cover", borderRadius: 4 }} /></a>)}
            </div>
          )}
          {p.motifRejet && <div style={{ fontSize: 12, color: CC.color.danger }}>Motif : {p.motifRejet}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => setOuvert(ouvert === p.id ? null : p.id)}>Approuver…</button>
            <button style={S.btnGhost} onClick={() => { const m = window.prompt("Motif du refus (visible par le fournisseur) :"); if (m) void moderer(p.id, { action: "REJETER", motif: m }); }}>Refuser</button>
            {p.statut !== "ARCHIVED" && <button style={S.btnGhost} onClick={() => moderer(p.id, { action: "ARCHIVER" })}>Archiver</button>}
          </div>
          {ouvert === p.id && <Rattachement p={p} codes={codes} onValider={(corps) => moderer(p.id, { action: "APPROUVER", ...corps })} />}
        </div>
      ))}
    </div>
  );
}

function Rattachement({ p, codes, onValider }: { p: ProduitAdmin; codes: CodeCree[]; onValider: (corps: Record<string, unknown>) => void }) {
  const [mode, setMode] = useState<"existant" | "nouveau">(p.codePropose || p.materiauCode ? "existant" : "nouveau");
  const [q, setQ] = useState("");
  const [code, setCode] = useState(p.materiauCode || p.codePropose || "");
  const [facteur, setFacteur] = useState("");
  const [n, setN] = useState({ libelleFr: p.designationFr || "", libelleAr: p.designationAr || "", categorie: p.categorie, famille: FAMILLES_PRODUIT[p.famille]?.libelle.fr || "", uniteRef: p.uniteRef, parent: p.codePropose || "", lots: "" });
  const options = useMemo(() => {
    const k = q.trim().toLowerCase();
    const statiques = CATALOGUE.filter((r) => r.actif !== false).map((r) => ({ code: r.code, libelle: r.libelle, uniteRef: r.uniteRef as string, categorie: r.categorie as string }));
    const crees = codes.map((c) => ({ code: c.code, libelle: `${c.libelleFr} (créé)`, uniteRef: c.uniteRef, categorie: c.categorie }));
    return [...crees, ...statiques].filter((r) => (!k || `${r.code} ${r.libelle}`.toLowerCase().includes(k)) && (k || r.categorie === p.categorie)).slice(0, 80);
  }, [q, codes, p.categorie]);
  const choisi = options.find((o) => o.code === code) || (code ? { code, uniteRef: materiau(code)?.uniteRef || codes.find((c) => c.code === code)?.uniteRef || "", libelle: "" } : null);
  const uniteDiff = choisi && choisi.uniteRef && choisi.uniteRef !== p.uniteRef;
  return (
    <div style={{ background: CC.color.bgSoft, borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
        <label><input type="radio" checked={mode === "existant"} onChange={() => setMode("existant")} /> Code existant</label>
        <label><input type="radio" checked={mode === "nouveau"} onChange={() => setMode("nouveau")} /> Créer un nouveau code (CIT-…-9NN)</label>
      </div>
      {mode === "existant" ? (
        <>
          <input style={S.input} placeholder="Rechercher un code ou un libellé…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={{ ...S.input, minHeight: 140 }} size={7} value={code} onChange={(e) => setCode(e.target.value)}>
            {options.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.libelle} ({unite3(o.uniteRef).fr})</option>)}
          </select>
          {uniteDiff && (
            <label style={S.label}>Unité du code : {unite3(choisi!.uniteRef).fr} ≠ unité du produit {unite3(p.uniteRef).fr}. Quantité d'unité du code dans une unité de vente « {p.uniteVente} » :
              <input style={S.input} inputMode="decimal" value={facteur} onChange={(e) => setFacteur(e.target.value)} placeholder="ex. 50" />
            </label>
          )}
          <div><button style={S.btn} disabled={!code || (!!uniteDiff && !facteur)} onClick={() => onValider({ materiauCode: code, ...(facteur ? { facteur: facteur.replace(",", ".") } : {}) })}>Rattacher et publier</button></div>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <label style={S.label}>Libellé (français)<input style={S.input} value={n.libelleFr} onChange={(e) => setN({ ...n, libelleFr: e.target.value })} /></label>
            <label style={S.label}>Libellé (arabe)<input style={S.input} dir="rtl" lang="ar" value={n.libelleAr} onChange={(e) => setN({ ...n, libelleAr: e.target.value })} /></label>
            <label style={S.label}>Catégorie
              <select style={S.input} value={n.categorie} onChange={(e) => setN({ ...n, categorie: e.target.value })}>{Object.entries(CATEGORIES_L3).map(([k, l]) => <option key={k} value={k}>{l.fr}</option>)}</select>
            </label>
            <label style={S.label}>Famille<input style={S.input} value={n.famille} onChange={(e) => setN({ ...n, famille: e.target.value })} /></label>
            <label style={S.label}>Unité d'ouvrage
              <select style={S.input} value={n.uniteRef} onChange={(e) => setN({ ...n, uniteRef: e.target.value })}>{Object.keys(UNITES_REF).map((u) => <option key={u} value={u}>{unite3(u).fr}</option>)}</select>
            </label>
            <label style={S.label}>Code générique (parent, même unité) — ses prix comptent pour lui<input style={S.input} value={n.parent} onChange={(e) => setN({ ...n, parent: e.target.value.toUpperCase() })} placeholder="ex. CIT-REV-020" /></label>
            <label style={S.label}>Lots CPS (séparés par des virgules)<input style={S.input} value={n.lots} onChange={(e) => setN({ ...n, lots: e.target.value })} placeholder="LOT_11_REVETEMENTS_SOLS" /></label>
            {n.uniteRef !== p.uniteRef && <label style={S.label}>Quantité d'unité du code par « {p.uniteVente} »<input style={S.input} value={facteur} onChange={(e) => setFacteur(e.target.value)} /></label>}
          </div>
          <div><button style={S.btn} disabled={n.libelleFr.trim().length < 3} onClick={() => onValider({
            nouveauCode: { ...n, parent: n.parent || null, lots: n.lots.split(",").map((s) => s.trim()).filter(Boolean) }, ...(facteur ? { facteur: facteur.replace(",", ".") } : {}),
          })}>Créer le code, rattacher et publier</button></div>
        </>
      )}
    </div>
  );
}

export function ServicesAModerer() {
  const [statut, setStatut] = useState("PENDING");
  const [liste, setListe] = useState<ServiceAdmin[] | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = useCallback(async () => {
    setErreur("");
    try { setListe((await appel<{ services: ServiceAdmin[] }>(`/api/cc/services?statut=${statut}`)).services); }
    catch (e) { setErreur((e as Error).message); setListe([]); }
  }, [statut]);
  useEffect(() => { void charger(); }, [charger]);
  async function moderer(id: string, corps: Record<string, unknown>) {
    try { await appel(`/api/cc/services/${id}`, { method: "PATCH", body: JSON.stringify(corps) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ ...S.btnGhost, padding: 8 }}>
          <option value="PENDING">À modérer</option><option value="APPROVED">Publiées</option><option value="REJECTED">Refusées</option><option value="ARCHIVED">Archivées</option>
        </select>
        <button style={S.btnGhost} onClick={() => void charger()}>Actualiser</button>
        <span style={{ color: CC.color.inkMid, fontSize: 13 }}>À partir de 3 pros approuvés dans une région, la médiane remplace la main-d'œuvre (pose) ou le prix de l'ouvrage (fourni-posé) dans le chiffrage.</span>
      </div>
      {erreur && <div style={{ ...S.carte, background: CC.color.dangerBg, color: CC.color.danger }}>{erreur}</div>}
      {liste === null ? <div>Chargement…</div> : !liste.length ? <div style={S.carte}>Rien dans cette vue.</div> : (
        <div style={{ ...S.carte, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Pro", "Prestation", "Rattachement", "Prix", "Référence chiffrage", "Actions"].map((h) => <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${CC.color.border}`, color: CC.color.inkMid, fontSize: 11 }}>{h}</th>)}</tr></thead>
            <tbody>
              {liste.map((s) => (
                <tr key={s.id}>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{s.raisonSociale}<div style={{ color: CC.color.inkMuted, fontSize: 12 }}>{s.ville}</div></td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{s.designationFr || s.designationAr}<div style={{ color: CC.color.inkMuted, fontSize: 12 }}>{NATURES_SERVICE[s.nature]?.fr || s.nature}</div>
                    {s.signalement === "COORDONNEES" && <div style={{ color: CC.color.danger, fontSize: 12, fontWeight: 600 }}>Coordonnées détectées (masquées au public)</div>}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{s.ouvrageCode ? `${s.ouvrageCode} — ${OUVRAGES[s.ouvrageCode]?.libelle || ""}` : s.prestationCode ? PRESTATIONS[s.prestationCode]?.libelle.fr || s.prestationCode : "libre"}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{fmt(s.prixHT)} DH / {unite3(s.unite).fr}</td>
                  <td style={{ padding: 8, verticalAlign: "top", color: s.signalement ? CC.color.warn : undefined }}>{s.reference ? `${fmt(s.reference)} DH` : "—"}{s.ecartRef != null ? ` (${s.ecartRef > 0 ? "+" : ""}${Math.round(s.ecartRef * 100)} %)` : ""}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.statut !== "APPROVED" && <button style={S.btn} onClick={() => moderer(s.id, { action: "APPROUVER" })}>Approuver</button>}
                      <button style={S.btnGhost} onClick={() => { const m = window.prompt("Motif du refus :"); if (m) void moderer(s.id, { action: "REJETER", motif: m }); }}>Refuser</button>
                      {s.statut !== "ARCHIVED" && <button style={S.btnGhost} onClick={() => moderer(s.id, { action: "ARCHIVER" })}>Archiver</button>}
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

interface ImageAdmin {
  id: string; objetType: string; objetId: string; principale: boolean; legendeFr: string | null; legendeAr: string | null; statut: string; motifRejet: string | null;
  largeur: number; hauteur: number; taille: number; url: string; vignette: string; raisonSociale: string | null; ville: string | null; objetLibelle: string | null;
  statutObjet: string | null; statutFournisseur: string | null;
}

/** Images déposées par les pros : approuver ou refuser (motif). Les images d'une fiche sont aussi approuvées avec elle. */
export function ImagesAModerer() {
  const [statut, setStatut] = useState("PENDING");
  const [liste, setListe] = useState<ImageAdmin[] | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = useCallback(async () => {
    setErreur("");
    try { setListe((await appel<{ images: ImageAdmin[] }>(`/api/cc/images?statut=${statut}`)).images); }
    catch (e) { setErreur((e as Error).message.replace("cercles-fiches-catalogue.sql", "cercles-images.sql")); setListe([]); }
  }, [statut]);
  useEffect(() => { void charger(); }, [charger]);
  async function moderer(id: string, corps: Record<string, unknown>) {
    try { await appel(`/api/cc/images/${id}`, { method: "PATCH", body: JSON.stringify(corps) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ ...S.btnGhost, padding: 8 }}>
          <option value="PENDING">À modérer</option><option value="APPROVED">Publiées</option><option value="REJECTED">Refusées</option>
        </select>
        <button style={S.btnGhost} onClick={() => void charger()}>Actualiser</button>
        <span style={{ color: CC.color.inkMid, fontSize: 13 }}>Publiques seulement si l'image, sa fiche et son pro sont approuvés. Métadonnées (GPS) déjà retirées.</span>
      </div>
      {erreur && <div style={{ ...S.carte, background: CC.color.dangerBg, color: CC.color.danger }}>{erreur}</div>}
      {liste === null ? <div>Chargement…</div> : !liste.length ? <div style={S.carte}>Rien dans cette vue.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {liste.map((i) => (
            <div key={i.id} style={{ ...S.carte, padding: 10, display: "grid", gap: 6 }}>
              <a href={i.url} target="_blank" rel="noreferrer"><img src={i.vignette} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6 }} /></a>
              <div style={{ fontSize: 12 }}><strong>{i.objetLibelle}</strong> · {i.objetType.toLowerCase()} {i.statutObjet && i.statutObjet !== "APPROVED" ? `(${i.statutObjet})` : ""}</div>
              <div style={{ fontSize: 12, color: CC.color.inkMid }}>{i.raisonSociale} ({i.ville}) · {i.largeur}×{i.hauteur} · {fmt(i.taille / 1024, 0)} Ko{i.principale ? " · principale" : ""}</div>
              {(i.legendeFr || i.legendeAr) && <div style={{ fontSize: 12 }}>{i.legendeFr}{i.legendeAr && <span dir="rtl" lang="ar"> · {i.legendeAr}</span>}</div>}
              {i.motifRejet && <div style={{ fontSize: 12, color: CC.color.danger }}>Motif : {i.motifRejet}</div>}
              <div style={{ display: "flex", gap: 6 }}>
                {i.statut !== "APPROVED" && <button style={S.btn} onClick={() => moderer(i.id, { statut: "APPROVED" })}>Approuver</button>}
                {i.statut !== "REJECTED" && <button style={S.btnGhost} onClick={() => { const m = window.prompt("Motif du refus (visible par le pro) :"); if (m) void moderer(i.id, { statut: "REJECTED", motif: m }); }}>Refuser</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
