/**
 * FournisseursModule — /cc/fournisseurs
 *
 * Modération Cercles servie par les Pages Functions (Neon) :
 *   - Inscrits : approuver / refuser (motif) / suspendre, commission %,
 *     code d'accès à transmettre (mode sans e-mail), export CSV ;
 *   - Fiches de prix en attente ou signalées (hors ±50 % de la référence) ;
 *   - Fiche société (score de complétude/confiance), documents à vérifier,
 *     formule (abonnement préparé, sans paiement) ;
 *   - Fiches produit et prestations à modérer (ModerationCatalogue.tsx).
 * Endpoints : /api/cc/fournisseurs, /api/cc/fournisseurs/:id[/code],
 * /api/cc/fiches-prix[/:id] (garde functions/api/cc/_middleware.ts).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DOCUMENTS, type DocumentPro, type Score } from "../../../domain/cercles/gabarits";
import { CC } from "../../theme/tokens";
import { ImagesAModerer, ProduitsAModerer, ServicesAModerer } from "./ModerationCatalogue";

interface Fournisseur {
  id: string; slug: string; raisonSociale: string; metier: string; metierLibelle: string; ville: string; region: string | null;
  zonesLivraison: string[]; categories: string[]; statut: string; contactNom: string | null; telephone: string; email: string; ice: string | null;
  siteWeb: string | null; description: string | null; createdAt: string; commissionPct: number | null; motifRejet: string | null;
  derniereConnexion: string | null; nbFiches: number; codeDemandeLe: string | null; fictif: boolean;
  raisonSocialeAr: string | null; alerteCoordonnees?: Record<string, string[]>; score: Score; documents: DocumentPro[]; formule: string; fiche: Record<string, unknown>;
}
interface FicheModeration {
  id: string; materiauCode: string; libelle: string; uniteRef: string | null; uniteVenteLibelle: string; prixHT: number; prixRefHT: number;
  prixReference: number | null; ecartRef: number | null; signalement: string | null; statut: string; raisonSociale: string; ville: string; updatedAt: string | null;
}

const STATUTS: [string, string, string, string][] = [
  ["PENDING", "À valider", CC.color.warnBg, CC.color.warn],
  ["APPROVED", "Approuvé", CC.color.successBg, CC.color.success],
  ["REJECTED", "Refusé", CC.color.dangerBg, CC.color.danger],
  ["SUSPENDED", "Suspendu", CC.color.dangerBg, CC.color.danger],
];
const ERREURS: Record<string, string> = {
  not_installed: "Tables Cercles absentes dans Neon : collez docs/prix/sql/cercles-fournisseurs.sql dans la console Neon.",
  storage_unavailable: "Base indisponible.",
  access_not_configured: "Secret de session absent (FOURNISSEUR_SESSION_SECRET ou ADMIN_SESSION_SECRET).",
};

async function appel<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(chemin, { credentials: "include", ...init, headers: { ...(init.body ? { "content-type": "application/json" } : {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(ERREURS[j.error] || j.error || `Erreur ${r.status}`);
  return j as T;
}

const fmt = (n: number | null | undefined, d = 2) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n));
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");
const csvChamp = (v: unknown) => { const s = v == null ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function telechargerCsv(nom: string, lignes: unknown[][]) {
  const url = URL.createObjectURL(new Blob([`${String.fromCharCode(0xfeff)}${lignes.map((l) => l.map(csvChamp).join(";")).join("\n")}\n`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const S = {
  page: { padding: "24px 28px", fontFamily: CC.font.body, color: CC.color.ink } as React.CSSProperties,
  titre: { fontFamily: CC.font.display, fontSize: 28, margin: "0 0 4px", color: CC.color.navy } as React.CSSProperties,
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radiusLg, padding: 16 } as React.CSSProperties,
  btn: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  btnGhost: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: CC.color.inkMid, padding: "8px 10px", borderBottom: `1px solid ${CC.color.border}` } as React.CSSProperties,
  td: { padding: "10px", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13, verticalAlign: "top" } as React.CSSProperties,
  onglet: (on: boolean): React.CSSProperties => ({ padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
    borderBottom: `2px solid ${on ? CC.color.or : "transparent"}`, color: on ? CC.color.navy : CC.color.inkMid, fontWeight: on ? 600 : 400 }),
};

function Badge({ statut }: { statut: string }) {
  const s = STATUTS.find((x) => x[0] === statut);
  return <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s?.[2] || CC.color.bgSoft, color: s?.[3] || CC.color.inkMid }}>{s?.[1] || statut}</span>;
}

export default function FournisseursModule() {
  const [onglet, setOnglet] = useState<"inscrits" | "fiches" | "produits" | "services" | "images">("inscrits");
  return (
    <div style={S.page}>
      <h1 style={S.titre}>Fournisseurs & prix</h1>
      <p style={{ color: CC.color.inkMid, margin: "0 0 12px" }}>Inscrits Cercles, fiches de prix et modération.</p>
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${CC.color.border}`, marginBottom: 16 }}>
        <button style={S.onglet(onglet === "inscrits")} onClick={() => setOnglet("inscrits")}>Inscrits</button>
        <button style={S.onglet(onglet === "produits")} onClick={() => setOnglet("produits")}>Produits à modérer</button>
        <button style={S.onglet(onglet === "services")} onClick={() => setOnglet("services")}>Prestations à modérer</button>
        <button style={S.onglet(onglet === "images")} onClick={() => setOnglet("images")}>Images à modérer</button>
        <button style={S.onglet(onglet === "fiches")} onClick={() => setOnglet("fiches")}>Fiches de prix signalées</button>
      </div>
      {onglet === "inscrits" && <Inscrits />}
      {onglet === "produits" && <ProduitsAModerer />}
      {onglet === "services" && <ServicesAModerer />}
      {onglet === "images" && <ImagesAModerer />}
      {onglet === "fiches" && <FichesSignalees />}
    </div>
  );
}

function Inscrits() {
  const [liste, setListe] = useState<Fournisseur[] | null>(null);
  const [filtre, setFiltre] = useState("PENDING");
  const [q, setQ] = useState("");
  const [erreur, setErreur] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [code, setCode] = useState<{ id: string; code: string; expire: string } | null>(null);

  const charger = useCallback(async () => {
    setErreur("");
    try { setListe((await appel<{ fournisseurs: Fournisseur[] }>(`/api/cc/fournisseurs${filtre ? `?statut=${filtre}` : ""}`)).fournisseurs); }
    catch (e) { setErreur((e as Error).message); setListe([]); }
  }, [filtre]);
  useEffect(() => { void charger(); }, [charger]);

  const visibles = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (liste || []).filter((f) => !k || `${f.raisonSociale} ${f.ville} ${f.email} ${f.telephone} ${f.metierLibelle}`.toLowerCase().includes(k));
  }, [liste, q]);

  async function moderer(f: Fournisseur, statut: string) {
    let motif: string | null = null;
    if (statut === "REJECTED" || statut === "SUSPENDED") {
      motif = window.prompt(`Motif (${statut === "REJECTED" ? "refus" : "suspension"}) pour ${f.raisonSociale} :`);
      if (!motif) return;
    }
    try { await appel(`/api/cc/fournisseurs/${f.id}`, { method: "PATCH", body: JSON.stringify({ statut, motif }) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  async function commission(f: Fournisseur) {
    const v = window.prompt(`Commission % pour ${f.raisonSociale} (vide = taux par défaut de la plateforme) :`, f.commissionPct == null ? "" : String(f.commissionPct));
    if (v === null) return;
    try { await appel(`/api/cc/fournisseurs/${f.id}`, { method: "PATCH", body: JSON.stringify({ statut: f.statut, commissionPct: v.trim() === "" ? null : v.replace(",", ".") }) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  async function formule(f: Fournisseur, v: string) {
    try { await appel(`/api/cc/fournisseurs/${f.id}`, { method: "PATCH", body: JSON.stringify({ statut: f.statut, formule: v }) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  async function verifierDoc(f: Fournisseur, d: DocumentPro, statut: "VERIFIE" | "REFUSE") {
    const motif = statut === "REFUSE" ? window.prompt(`Motif du refus (${DOCUMENTS[d.type]?.fr || d.type}) :`) : null;
    if (statut === "REFUSE" && !motif) return;
    try { await appel(`/api/cc/fournisseurs/${f.id}/documents/${d.id}`, { method: "PATCH", body: JSON.stringify({ statut, motif }) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  async function genererCode(f: Fournisseur) {
    try { const r = await appel<{ code: string; expire: string }>(`/api/cc/fournisseurs/${f.id}/code`, { method: "POST" }); setCode({ id: f.id, ...r }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ ...S.btnGhost, padding: 8 }}>
          <option value="">Tous</option>
          {STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...S.btnGhost, padding: 8, minWidth: 220 }} />
        <button style={S.btnGhost} onClick={() => void charger()}>Actualiser</button>
        <button style={{ ...S.btnGhost, marginLeft: "auto" }} disabled={!visibles.length} onClick={() => telechargerCsv("fournisseurs-cercles.csv", [
          ["id", "statut", "raison_sociale", "metier", "ville", "region", "zones", "categories", "contact", "telephone", "email", "ice", "commission_pct", "nb_fiches", "inscrit_le"],
          ...visibles.map((f) => [f.id, f.statut, f.raisonSociale, f.metierLibelle, f.ville, f.region, f.zonesLivraison.join(" "), f.categories.join(" "), f.contactNom, f.telephone, f.email, f.ice, f.commissionPct, f.nbFiches, f.createdAt]),
        ])}>Exporter CSV</button>
      </div>
      {erreur && <div style={{ ...S.carte, background: CC.color.dangerBg, color: CC.color.danger }}>{erreur}</div>}
      {code && (
        <div style={{ ...S.carte, background: CC.color.infoBg }}>
          Code d'accès à transmettre (valable jusqu'au {new Date(code.expire).toLocaleString("fr-FR")}) :{" "}
          <strong style={{ fontSize: 22, letterSpacing: 4 }}>{code.code}</strong> — le fournisseur le saisit sur citurbarea.com/cercles/espace avec son e-mail.
          <button style={{ ...S.btnGhost, marginLeft: 12 }} onClick={() => setCode(null)}>Masquer</button>
        </div>
      )}
      {liste === null ? <div>Chargement…</div> : !visibles.length ? <div style={S.carte}>Aucun inscrit dans cette vue.</div> : (
        <div style={{ ...S.carte, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={S.th}>Entreprise</th><th style={S.th}>Métier</th><th style={S.th}>Ville</th><th style={S.th}>Contact</th><th style={S.th}>Fiches</th><th style={S.th}>Score</th><th style={S.th}>Statut</th><th style={S.th}>Actions</th></tr></thead>
            <tbody>
              {visibles.map((f) => (
                <React.Fragment key={f.id}>
                  <tr>
                    <td style={S.td}>
                      <button onClick={() => setOuvert(ouvert === f.id ? null : f.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600, color: CC.color.navy, textAlign: "left" }}>{f.raisonSociale}</button>
                      {f.fictif && <span style={{ marginLeft: 6, fontSize: 11, color: CC.color.warn }}>(fictif)</span>}
                      <div style={{ color: CC.color.inkMuted, fontSize: 12 }}>inscrit le {date(f.createdAt)}</div>
                    </td>
                    <td style={S.td}>{f.metierLibelle}</td>
                    <td style={S.td}>{f.ville}</td>
                    <td style={S.td}>{f.contactNom && <div>{f.contactNom}</div>}<a href={`tel:${f.telephone}`}>{f.telephone}</a><div><a href={`mailto:${f.email}`}>{f.email}</a></div></td>
                    <td style={S.td}>{f.nbFiches}</td>
                    <td style={S.td} title={f.score ? `complétude ${f.score.completude}/50 · confiance ${f.score.confiance}/35 · activité ${f.score.activite}/15` : ""}><strong>{f.score?.total ?? "—"}</strong>{f.score?.documentsManquants.length ? <div style={{ fontSize: 11, color: CC.color.warn }}>{f.score.documentsManquants.length} doc. à vérifier</div> : null}</td>
                    <td style={S.td}><Badge statut={f.statut} />{f.codeDemandeLe && <div style={{ color: CC.color.warn, fontSize: 12, marginTop: 4 }}>Code demandé le {new Date(f.codeDemandeLe).toLocaleString("fr-FR")}</div>}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {f.statut !== "APPROVED" && <button style={S.btn} onClick={() => moderer(f, "APPROVED")}>Approuver</button>}
                        {f.statut === "PENDING" && <button style={S.btnGhost} onClick={() => moderer(f, "REJECTED")}>Refuser</button>}
                        {f.statut === "APPROVED" && <button style={S.btnGhost} onClick={() => moderer(f, "SUSPENDED")}>Suspendre</button>}
                        {(f.statut === "PENDING" || f.statut === "APPROVED") && <button style={S.btnGhost} onClick={() => genererCode(f)}>Code d'accès</button>}
                        <button style={S.btnGhost} onClick={() => commission(f)}>Commission {f.commissionPct != null ? `${fmt(f.commissionPct)} %` : "(défaut)"}</button>
                      </div>
                    </td>
                  </tr>
                  {ouvert === f.id && (
                    <tr><td colSpan={8} style={{ ...S.td, background: CC.color.bgSoft }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div><strong>Zones :</strong> {f.zonesLivraison.join(", ") || "—"} · <strong>Catégories :</strong> {f.categories.join(", ") || "—"}</div>
                        <div><strong>ICE :</strong> {f.ice || "—"} · <strong>Site :</strong> {f.siteWeb || "—"} · <strong>Dernière connexion :</strong> {date(f.derniereConnexion)}</div>
                        {f.description && <div><strong>Présentation :</strong> {f.description}</div>}
                        {f.motifRejet && <div><strong>Motif :</strong> {f.motifRejet}</div>}
                        {f.alerteCoordonnees && Object.keys(f.alerteCoordonnees).length > 0 && (
                          <div style={{ color: CC.color.danger, fontWeight: 600 }}>Coordonnées détectées (masquées au public, à faire retirer) : {Object.entries(f.alerteCoordonnees).map(([k, v]) => `${k} (${v.join(", ")})`).join(" · ")}</div>
                        )}
                        {f.raisonSocialeAr && <div dir="rtl" lang="ar"><strong>الاسم بالعربية :</strong> {f.raisonSocialeAr}</div>}
                        {f.fiche && Object.keys(f.fiche).length > 0 && <div style={{ fontSize: 12 }}><strong>Fiche :</strong> {Object.entries(f.fiche).filter(([k]) => k !== "references").map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ")}{Array.isArray(f.fiche.references) && f.fiche.references.length ? ` · ${f.fiche.references.length} référence(s)` : ""}</div>}
                        <div><strong>Formule :</strong>{" "}
                          <select value={f.formule || "GRATUIT"} onChange={(e) => formule(f, e.target.value)} style={{ ...S.btnGhost, padding: 4 }}>
                            <option value="GRATUIT">Gratuit</option><option value="PRO">Pro</option><option value="PREMIUM">Premium</option>
                          </select> <span style={{ color: CC.color.inkMuted, fontSize: 12 }}>(préparée, aucun paiement)</span>
                        </div>
                        <div><strong>Documents :</strong> {!(f.documents || []).length ? "aucun" : null}</div>
                        {(f.documents || []).map((d) => (
                          <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
                            <span>{DOCUMENTS[d.type]?.fr || d.type}</span>
                            <span style={{ color: d.statut === "VERIFIE" ? CC.color.success : d.statut === "REFUSE" ? CC.color.danger : CC.color.warn, fontWeight: 600 }}>{d.statut}</span>
                            {d.url && <a href={d.url} target="_blank" rel="noreferrer noopener">ouvrir</a>}
                            {d.note && <span style={{ color: CC.color.inkMid }}>{d.note}</span>}
                            {d.expireLe && <span>expire le {date(d.expireLe)}</span>}
                            {d.statut !== "VERIFIE" && <button style={S.btn} onClick={() => verifierDoc(f, d, "VERIFIE")}>Vérifié</button>}
                            {d.statut !== "REFUSE" && <button style={S.btnGhost} onClick={() => verifierDoc(f, d, "REFUSE")}>Refuser</button>}
                          </div>
                        ))}
                        {f.score && <div style={{ fontSize: 12, color: CC.color.inkMid }}>Score {f.score.total}/100 — à compléter : {f.score.manquants.join(", ") || "rien"}{f.score.documentsManquants.length ? ` · documents : ${f.score.documentsManquants.map((d) => DOCUMENTS[d]?.fr || d).join(", ")}` : ""}</div>}
                        {f.statut === "APPROVED" && <a href={`/cercles/pro/${f.slug}`} target="_blank" rel="noreferrer">Fiche publique</a>}
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FichesSignalees() {
  const [liste, setListe] = useState<FicheModeration[] | null>(null);
  const [erreur, setErreur] = useState("");
  const charger = useCallback(async () => {
    setErreur("");
    try { setListe((await appel<{ fiches: FicheModeration[] }>("/api/cc/fiches-prix")).fiches); }
    catch (e) { setErreur((e as Error).message); setListe([]); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);
  async function moderer(id: string, statut: string) {
    try { await appel(`/api/cc/fiches-prix/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) }); void charger(); }
    catch (e) { setErreur((e as Error).message); }
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, color: CC.color.inkMid, fontSize: 14 }}>Prix hors ±50 % de la référence de recherche : enregistrés, hors médiane du « prix marché » tant qu'ils ne sont pas validés.</p>
      {erreur && <div style={{ ...S.carte, background: CC.color.dangerBg, color: CC.color.danger }}>{erreur}</div>}
      {liste === null ? <div>Chargement…</div> : !liste.length ? <div style={S.carte}>Rien à modérer.</div> : (
        <div style={{ ...S.carte, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={S.th}>Fournisseur</th><th style={S.th}>Matériau</th><th style={S.th}>Prix saisi</th><th style={S.th}>Par unité de chiffrage</th><th style={S.th}>Référence</th><th style={S.th}>Écart</th><th style={S.th}>Actions</th></tr></thead>
            <tbody>
              {liste.map((p) => (
                <tr key={p.id}>
                  <td style={S.td}>{p.raisonSociale}<div style={{ color: CC.color.inkMuted, fontSize: 12 }}>{p.ville} · {date(p.updatedAt)}</div></td>
                  <td style={S.td}>{p.libelle}<div style={{ color: CC.color.inkMuted, fontSize: 12 }}>{p.materiauCode}</div></td>
                  <td style={S.td}>{fmt(p.prixHT)} DH / {p.uniteVenteLibelle}</td>
                  <td style={S.td}>{fmt(p.prixRefHT, 3)} DH / {p.uniteRef}</td>
                  <td style={S.td}>{fmt(p.prixReference, 3)} DH</td>
                  <td style={{ ...S.td, color: CC.color.warn, fontWeight: 600 }}>{p.ecartRef == null ? "—" : `${p.ecartRef > 0 ? "+" : ""}${Math.round(p.ecartRef * 100)} %`}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.btn} onClick={() => moderer(p.id, "APPROVED")}>Valider</button>
                      <button style={S.btnGhost} onClick={() => moderer(p.id, "REJECTED")}>Refuser</button>
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
