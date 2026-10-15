/**
 * Onglet « Devis » de la fiche dossier admin (/cc/dossiers/:id, lot 3c).
 *
 * Liste des devis du dossier, éditeur de brouillon avec aperçu en direct
 * (même moteur que le serveur : domain/honoraires), émission numérotée,
 * révision, refus, téléchargement PDF et DOCX générés dans le navigateur.
 * Serveur : /api/cc/dossiers/:id/devis, /api/cc/devis/:id (functions/_lib/devisDepot.ts).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CC } from "../../../theme/tokens";
import { calculerDevisComplet, EXCLUSIONS_FORFAIT, entreeRenouvellement, type EntreeDevisComplet } from "../../../../domain/honoraires/devisComplet";
import { TEXTES_MODALITES } from "../../../../domain/honoraires/devis";
import { construireDocument, empreinteDocument, mentionEmpreinte, type ContexteDocument, type DocumentDevis } from "../../../../domain/honoraires/documentDevis";
import { formatDH } from "../../../../domain/honoraires/decimal";
import { GRILLE_ARC_BATI_2026_10 as GRILLE } from "../../../../domain/honoraires/grilleArcBati";
import { libelleNiveau, parserGabarit, puElevationPropose, visitesProposees, type Niveau } from "../../../../domain/honoraires/metre";
import type { CodeNiveau, ModalitePaiement, Typologie } from "../../../../domain/honoraires/types";
import ApercuDocument, { telecharger } from "./ApercuDocument";

type Contexte = {
  typologie: Typologie | null; commune: string; missionsDejaReglees: string[]; autorisationExpiration: string | null;
  importMetre: { superficieTerrain: string | null; gabarit: string | null };
  document: Omit<ContexteDocument, "numero" | "dateEmission">;
};
type DevisResume = {
  id: string; numero: string | null; revision: number; type: string; presentation: string; statut: string; statutEffectif: string;
  dateEmission: string | null; montantTotal: string | null; hashContenu: string | null; remplacePar: string | null; createdAt: string | null;
  entree: EntreeDevisComplet; document?: DocumentDevis | null;
};

const ERREURS: Record<string, string> = {
  sql_a_coller: "Tables des devis absentes : coller docs/sql/TOUT-NEON.sql (devis-facturation-neon.sql) dans la console Neon.",
  storage_unavailable: "Base indisponible.", not_found: "Introuvable.", devis_fige: "Devis émis : passer par une révision.",
  revision_en_cours: "Une révision est déjà en cours.", devis_incomplet: "Devis incomplet :",
};
const STATUT: Record<string, [string, string]> = {
  BROUILLON: ["Brouillon", CC.color.inkMid], EMIS: ["Émis", CC.color.navy], ACCEPTE: ["Accepté", CC.color.success], FACTURE: ["Facturé", CC.color.success],
  REFUSE: ["Refusé", CC.color.danger], EXPIRE: ["Expiré", CC.color.warn],
};
const TYPES: Array<[EntreeDevisComplet["type"], string]> = [["MISSION_COMPLETE", "Mission complète"], ["MISSION_PARTIELLE", "Mission partielle"], ["COMPLEMENTAIRE", "Complémentaire"]];
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dateFr = (s: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

async function appel(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init?.body ? { "content-type": "application/json" } : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error([ERREURS[j.error] || j.message || `Erreur ${r.status}`, ...(j.erreurs || [])].join(" "));
  return j;
}

function entreeVierge(ctx: Contexte): EntreeDevisComplet {
  return {
    type: "MISSION_COMPLETE", presentation: "DETAILLEE", modalitesPaiement: "PAR_TRANCHES", validiteJours: 30,
    metre: { superficieTerrain: ctx.importMetre.superficieTerrain ?? "", deductionEmprise: "", surfaceCour: "", niveaux: (ctx.importMetre.gabarit && parserGabarit(ctx.importMetre.gabarit)) || [] },
    puElevation: ctx.typologie ? puElevationPropose(GRILLE, ctx.typologie) ?? "" : "",
    // Choix par défaut validé le 15/10 : fondations chiffrées à part (§10, point 2), modifiable.
    fondations: { incluses: false, pu: GRILLE.puFondations, statut: "TRANCHE" },
    lignes: [{ code: "HON_AUTORISATION" }, { code: "HON_CHANTIER" }],
    exclusions: ["Taxes et redevances communales"],
  };
}

export default function OngletDevis({ dossierId }: { dossierId: string }) {
  const [ctx, setCtx] = useState<Contexte | null>(null);
  const [liste, setListe] = useState<DevisResume[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState<EntreeDevisComplet | null>(null);

  const charger = useCallback(async () => {
    try {
      const j = await appel(`/api/cc/dossiers/${encodeURIComponent(dossierId)}/devis`);
      setCtx(j.contexte); setListe(j.devis); setErreur(null);
    } catch (e) { setErreur((e as Error).message); }
  }, [dossierId]);
  useEffect(() => { void charger(); }, [charger]);

  if (erreur && !ctx) return <div style={S.erreur}>{erreur}</div>;
  if (!ctx) return <p style={S.aide}>Chargement…</p>;

  if (nouveau) return <Editeur ctx={ctx} dossierId={dossierId} initiale={nouveau} onFin={() => { setNouveau(null); void charger(); }} />;
  if (ouvert) return <Devis ctx={ctx} id={ouvert} onFin={(autre) => { setOuvert(autre ?? null); void charger(); }} />;

  const expire = ctx.autorisationExpiration && ctx.autorisationExpiration <= new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  return (
    <div>
      {erreur && <div style={S.erreur}>{erreur}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button style={S.btn} onClick={() => setNouveau(entreeVierge(ctx))}>+ Nouveau devis</button>
        <button style={expire ? S.btnAlerte : S.btnGhost} onClick={() => setNouveau(entreeRenouvellement())}>
          {expire ? "⚠ " : ""}Devis de renouvellement d'autorisation
        </button>
      </div>
      {ctx.missionsDejaReglees.length > 0 && <p style={S.aide}>Missions déjà réglées (jamais refacturées) : {ctx.missionsDejaReglees.join(", ")}.</p>}
      {liste.length === 0 ? <p style={S.aide}>Aucun devis pour ce dossier.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Numéro", "Type", "Statut", "Émis le", "Montant", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {liste.map((d) => {
                const [lib, coul] = STATUT[d.statutEffectif] ?? [d.statutEffectif, CC.color.inkMid];
                return (
                  <tr key={d.id}>
                    <td style={S.td}><strong>{d.numero ?? "Brouillon"}</strong>{d.remplacePar && <div style={S.aide}>remplacé par une révision</div>}</td>
                    <td style={S.td}>{TYPES.find(([k]) => k === d.type)?.[1] ?? d.type}{d.presentation === "PACKS" ? " · packs" : ""}</td>
                    <td style={S.td}><span style={{ color: coul, fontWeight: 600 }}>{lib}</span></td>
                    <td style={S.td}>{dateFr(d.dateEmission)}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{d.montantTotal ? formatDH(d.montantTotal) : "—"}</td>
                    <td style={S.td}><button style={S.btnGhost} onClick={() => setOuvert(d.id)}>Ouvrir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Un devis : brouillon → éditeur ; émis → document figé, téléchargements, révision, refus. */
function Devis({ ctx, id, onFin }: { ctx: Contexte; id: string; onFin: (autre?: string) => void }) {
  const [d, setD] = useState<DevisResume | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { void appel(`/api/cc/devis/${encodeURIComponent(id)}`).then((j) => setD(j.devis)).catch((e) => setErreur((e as Error).message)); }, [id]);
  if (erreur) return <div><div style={S.erreur}>{erreur}</div><button style={S.btnGhost} onClick={() => onFin()}>← Retour</button></div>;
  if (!d) return <p style={S.aide}>Chargement…</p>;
  if (d.statut === "BROUILLON") return <Editeur ctx={ctx} devisId={d.id} initiale={d.entree} onFin={() => onFin()} />;

  const action = async (a: "reviser" | "refuser") => {
    if (a === "refuser" && !window.confirm("Marquer ce devis comme refusé par le client ?")) return;
    setOccupe(true);
    try { const j = await appel(`/api/cc/devis/${encodeURIComponent(d.id)}`, { method: "POST", body: JSON.stringify({ action: a }) }); onFin(a === "reviser" ? j.devisId : undefined); }
    catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  const pied = mentionEmpreinte(d.hashContenu);
  return (
    <div>
      <button style={S.btnGhost} onClick={() => onFin()}>← Devis du dossier</button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {d.document && <>
          <button style={S.btn} onClick={() => telecharger(d.document as DocumentDevis, pied, "pdf")}>Télécharger le PDF</button>
          <button style={S.btn} onClick={() => telecharger(d.document as DocumentDevis, pied, "docx")}>Télécharger le DOCX</button>
        </>}
        {!d.remplacePar && <button style={S.btnGhost} disabled={occupe} onClick={() => void action("reviser")}>Réviser (nouvelle version -R)</button>}
        {d.statut === "EMIS" && <button style={S.btnGhost} disabled={occupe} onClick={() => void action("refuser")}>Marquer refusé</button>}
      </div>
      <p style={S.aide}>Statut : {STATUT[d.statutEffectif]?.[0] ?? d.statutEffectif} · {pied}. Un devis émis est figé ; toute modification passe par une révision. L'acceptation (pack, preuve) arrive à l'étape suivante.</p>
      {d.document ? <ApercuDocument document={d.document} pied={pied} /> : <div style={S.erreur}>Document en cours de reconstruction : rechargez.</div>}
    </div>
  );
}

function Editeur({ ctx, dossierId, devisId, initiale, onFin }: { ctx: Contexte; dossierId?: string; devisId?: string; initiale: EntreeDevisComplet; onFin: () => void }) {
  const [e, setE] = useState<EntreeDevisComplet>(initiale);
  const [id, setId] = useState<string | undefined>(devisId);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const maj = (m: Partial<EntreeDevisComplet>) => setE((x) => ({ ...x, ...m }));

  const calc = useMemo(() => calculerDevisComplet(e, GRILLE, ctx), [e, ctx]);
  const apercu = useMemo<DocumentDevis | null>(() => (calc.ok ? construireDocument(e, calc, { ...ctx.document, numero: null, dateEmission: aujourdhui() }) : null), [calc, e, ctx]);
  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => { if (apercu) void empreinteDocument(apercu).then(setHash); }, [apercu]);

  const avecMetre = e.presentation === "PACKS" || e.lignes.some((l) => GRILLE.prestations.find((p) => p.code === l.code)?.modeTarification.startsWith("POURCENTAGE"));
  const metre = e.metre ?? { superficieTerrain: "", niveaux: [] };
  const majMetre = (m: Partial<typeof metre>) => maj({ metre: { ...metre, ...m } });
  const choisie = (code: string) => e.lignes.find((l) => l.code === code);
  const basculer = (code: string, on: boolean) => {
    const p = GRILLE.prestations.find((x) => x.code === code);
    maj({ lignes: on ? [...e.lignes, { code, quantite: p?.modeTarification === "UNITAIRE" ? String(code === "CTRL_BET" && metre.niveaux.length ? visitesProposees(metre.niveaux) : 1) : undefined }] : e.lignes.filter((l) => l.code !== code) });
  };
  const majLigne = (code: string, m: Record<string, string | undefined>) => maj({ lignes: e.lignes.map((l) => (l.code === code ? { ...l, ...m } : l)) });

  const enregistrer = async (): Promise<string | undefined> => {
    setOccupe(true); setErreur(null);
    try {
      if (id) { await appel(`/api/cc/devis/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ entree: e }) }); setMessage("Brouillon enregistré."); return id; }
      const j = await appel(`/api/cc/dossiers/${encodeURIComponent(dossierId as string)}/devis`, { method: "POST", body: JSON.stringify({ entree: e }) });
      setId(j.devisId); setMessage("Brouillon créé."); return j.devisId as string;
    } catch (err) { setErreur((err as Error).message); return undefined; } finally { setOccupe(false); }
  };
  const emettre = async () => {
    if (!window.confirm("Émettre ce devis ? Il recevra un numéro définitif et ne pourra plus être modifié (seulement révisé).")) return;
    const dId = await enregistrer();
    if (!dId) return;
    setOccupe(true);
    try { const j = await appel(`/api/cc/devis/${encodeURIComponent(dId)}`, { method: "POST", body: JSON.stringify({ action: "emettre" }) }); window.alert(`Devis émis : ${j.numero}`); onFin(); }
    catch (err) { setErreur((err as Error).message); } finally { setOccupe(false); }
  };
  const supprimer = async () => {
    if (!id) { onFin(); return; }
    if (!window.confirm("Supprimer ce brouillon ?")) return;
    try { await appel(`/api/cc/devis/${encodeURIComponent(id)}`, { method: "DELETE" }); onFin(); } catch (err) { setErreur((err as Error).message); }
  };

  const familles: Array<[string, string]> = [["HONORAIRES", "Honoraires d'architecte (quote-part des 5 %)"], ["HORS_HONORAIRES", "Prestations hors honoraires"], ["FORFAIT_ADMINISTRATIF", "Forfaits administratifs"]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, alignItems: "start" }}>
      <div>
        <button style={S.btnGhost} onClick={onFin}>← Devis du dossier</button>
        <section style={S.carte}>
          <div style={S.h3}>Devis</div>
          <div style={S.grille}>
            <Champ label="Type"><select value={e.type} onChange={(v) => maj({ type: v.target.value as EntreeDevisComplet["type"] })} style={S.input}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
            <Champ label="Présentation"><select value={e.presentation} onChange={(v) => maj({ presentation: v.target.value as EntreeDevisComplet["presentation"] })} style={S.input}><option value="DETAILLEE">Détaillée</option><option value="PACKS">Trois packs au choix</option></select></Champ>
            <Champ label="Modalités de paiement"><select value={e.modalitesPaiement} onChange={(v) => maj({ modalitesPaiement: v.target.value as ModalitePaiement })} style={S.input}>{(Object.keys(TEXTES_MODALITES) as ModalitePaiement[]).map((k) => <option key={k} value={k}>{TEXTES_MODALITES[k].slice(0, 60)}…</option>)}</select></Champ>
            <Champ label="Validité (jours)"><input type="number" min={1} max={365} value={e.validiteJours} onChange={(v) => maj({ validiteJours: Math.max(1, Math.min(365, Number(v.target.value) || 30)) })} style={S.input} /></Champ>
          </div>
          <Champ label="Objet (sous-titre, facultatif)"><input value={e.objet ?? ""} placeholder={ctx.document.projet.intitule} onChange={(v) => maj({ objet: v.target.value })} style={S.input} /></Champ>
        </section>

        <section style={S.carte}>
          <div style={S.h3}>Prestations</div>
          {familles.map(([f, titre]) => (
            <div key={f} style={{ marginBottom: 10 }}>
              <div style={S.label}>{titre}</div>
              {GRILLE.prestations.filter((p) => p.famille === f && p.actif).map((p) => {
                const l = choisie(p.code), reglee = ctx.missionsDejaReglees.includes(p.code);
                return (
                  <div key={p.code} style={S.ligne}>
                    <label style={{ display: "flex", gap: 6, alignItems: "flex-start", flex: "1 1 220px", fontSize: 13, color: reglee ? CC.color.inkMuted : undefined }}>
                      <input type="checkbox" checked={!!l} disabled={reglee} onChange={(v) => basculer(p.code, v.target.checked)} />
                      <span>{p.libelle}{reglee ? " — déjà réglée (état du chantier)" : ""}<span style={S.aide}> · {p.modeTarification === "POURCENTAGE_HONORAIRES" ? `${p.valeur} %` : p.valeur ? `${formatDH(p.valeur)}${p.unite ? ` / ${p.unite.toLowerCase()}` : ""}` : "sur devis"}</span></span>
                    </label>
                    {l && p.modeTarification === "UNITAIRE" && <input aria-label="Quantité" inputMode="decimal" value={l.quantite != null ? String(l.quantite) : ""} onChange={(v) => majLigne(p.code, { quantite: v.target.value })} style={{ ...S.input, width: 70 }} />}
                    {l && (p.modeTarification === "FORFAIT" || p.modeTarification === "UNITAIRE") && <input aria-label="Prix négocié" placeholder={p.valeur ? "prix de grille" : "prix (DH)"} inputMode="decimal" value={l.prix != null ? String(l.prix) : ""} onChange={(v) => majLigne(p.code, { prix: v.target.value || undefined })} style={{ ...S.input, width: 110 }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        {avecMetre && (
          <section style={S.carte}>
            <div style={S.h3}>Métré et coût prévisionnel</div>
            <div style={S.grille}>
              <Champ label="Superficie du terrain (m²)"><input inputMode="decimal" value={String(metre.superficieTerrain ?? "")} onChange={(v) => majMetre({ superficieTerrain: v.target.value })} style={S.input} /></Champ>
              <Champ label="Déduction d'emprise (m²)"><input inputMode="decimal" value={String(metre.deductionEmprise ?? "")} onChange={(v) => majMetre({ deductionEmprise: v.target.value })} style={S.input} /></Champ>
              <Champ label="Surface de cour (m²)"><input inputMode="decimal" value={String(metre.surfaceCour ?? "")} onChange={(v) => majMetre({ surfaceCour: v.target.value })} style={S.input} /></Champ>
              <Champ label="Emprise d'étage avec encorbellement (m²)"><input inputMode="decimal" value={String(metre.empriseEtageAvecEncorbellement ?? "")} onChange={(v) => majMetre({ empriseEtageAvecEncorbellement: v.target.value || undefined })} style={S.input} /></Champ>
            </div>
            <Niveaux niveaux={metre.niveaux} gabarit={ctx.importMetre.gabarit} onChange={(niveaux) => majMetre({ niveaux })} />
            {metre.niveaux.some((n) => n.code === "SOUS_SOL") && (
              <Choix titre="Sous-sol" valeur={metre.regles?.sousSol ? `${metre.regles.sousSol.emprise}|${metre.regles.sousSol.courDeduite}` : ""}
                options={[["TOTALE|false", "Emprise totale du terrain, cour non déduite"], ["TOTALE|true", "Emprise totale, cour déduite"], ["REDUITE|false", "Emprise réduite (− déduction), cour non déduite"], ["REDUITE|true", "Emprise réduite, cour déduite"]]}
                statut={metre.regles?.sousSol?.statut}
                onChange={(v, statut) => { const [emprise, cour] = v.split("|"); majMetre({ regles: { ...metre.regles, sousSol: v ? { emprise: emprise as "TOTALE" | "REDUITE", courDeduite: cour === "true", statut } : undefined } }); }} />
            )}
            {Number(String(metre.surfaceCour || "0").replace(",", ".")) > 0 && metre.niveaux.some((n) => n.code === "RDC") && (
              <Choix titre="Cour au rez-de-chaussée" valeur={metre.regles?.courRdc ? String(metre.regles.courRdc.deduite) : ""}
                options={[["true", "Cour déduite au RDC"], ["false", "Cour déduite seulement aux étages"]]} statut={metre.regles?.courRdc?.statut}
                onChange={(v, statut) => majMetre({ regles: { ...metre.regles, courRdc: v ? { deduite: v === "true", statut } : undefined } })} />
            )}
            <div style={S.grille}>
              <Champ label={`PU d'élévation (DH/m²)${ctx.typologie && puElevationPropose(GRILLE, ctx.typologie) ? ` — proposé : ${puElevationPropose(GRILLE, ctx.typologie)}` : ""}`}><input inputMode="decimal" value={e.puElevation ?? ""} onChange={(v) => maj({ puElevation: v.target.value })} style={S.input} /></Champ>
              <Champ label="Fondations">
                <select value={e.fondations ? (e.fondations.incluses ? "incluses" : "apart") : ""} onChange={(v) => maj({ fondations: v.target.value === "incluses" ? { incluses: true, statut: "TRANCHE" } : v.target.value === "apart" ? { incluses: false, pu: GRILLE.puFondations, statut: "TRANCHE" } : undefined })} style={S.input}>
                  <option value="">— à choisir —</option><option value="apart">Chiffrées à part (emprise au sol)</option><option value="incluses">Comprises dans le PU d'élévation</option>
                </select>
              </Champ>
              {e.fondations && !e.fondations.incluses && <Champ label="PU fondations (DH/m²)"><input inputMode="decimal" value={String(e.fondations.pu)} onChange={(v) => maj({ fondations: { incluses: false, pu: v.target.value, statut: "TRANCHE" } })} style={S.input} /></Champ>}
            </div>
          </section>
        )}

        <section style={S.carte}>
          <div style={S.h3}>Exclusions et hypothèses</div>
          <Champ label="Exclusions (une par ligne)"><textarea rows={4} value={e.exclusions.join("\n")} onChange={(v) => maj({ exclusions: v.target.value.split("\n") })} style={S.input} /></Champ>
          {e.exclusions.length === 0 && <button style={S.btnGhost} onClick={() => maj({ exclusions: [...EXCLUSIONS_FORFAIT] })}>Proposer les exclusions usuelles</button>}
          <Champ label="Hypothèses supplémentaires affichées au client (une par ligne)"><textarea rows={2} value={(e.hypothesesLibres ?? []).join("\n")} onChange={(v) => maj({ hypothesesLibres: v.target.value.split("\n") })} style={S.input} /></Champ>
          <label style={{ display: "flex", gap: 6, fontSize: 13 }}><input type="checkbox" checked={!!e.pourRemplissageManuel} onChange={(v) => maj({ pourRemplissageManuel: v.target.checked })} /> Imprimé pour remplissage manuel (lignes vides visibles)</label>
        </section>

        {!calc.ok && <div style={S.avert}><strong>À compléter avant émission :</strong>{calc.questions.map((q) => <div key={q}>• {q}</div>)}</div>}
        {calc.ok && calc.avertissements.length > 0 && <div style={S.info}>{calc.avertissements.map((a) => <div key={a}>• {a}</div>)}</div>}
        {erreur && <div style={S.erreur}>{erreur}</div>}
        {message && !erreur && <div style={S.ok}>{message}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button style={S.btnGhost} disabled={occupe} onClick={() => void enregistrer()}>Enregistrer le brouillon</button>
          <button style={{ ...S.btn, opacity: calc.ok && !occupe ? 1 : 0.5 }} disabled={!calc.ok || occupe} onClick={() => void emettre()}>Émettre (numéro définitif)</button>
          <button style={S.btnGhost} onClick={() => void supprimer()}>{id ? "Supprimer le brouillon" : "Annuler"}</button>
        </div>
      </div>

      <div style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={S.label}>Aperçu (brouillon)</span>
          {apercu && <>
            <button style={S.btnGhost} onClick={() => telecharger(apercu, mentionEmpreinte(null), "pdf")}>PDF brouillon</button>
            <button style={S.btnGhost} onClick={() => telecharger(apercu, mentionEmpreinte(null), "docx")}>DOCX brouillon</button>
          </>}
        </div>
        {apercu ? <ApercuDocument document={apercu} pied={mentionEmpreinte(null)} /> : <div style={S.aide}>L'aperçu s'affiche dès que le devis est complet.</div>}
        {hash && <p style={S.aide}>Empreinte provisoire : {hash.slice(0, 16)} (définitive à l'émission)</p>}
      </div>
    </div>
  );
}

function Niveaux({ niveaux, gabarit, onChange }: { niveaux: Niveau[]; gabarit: string | null; onChange: (n: Niveau[]) => void }) {
  const [g, setG] = useState(gabarit ?? "");
  const proposes = parserGabarit(g);
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={S.label}>Niveaux (proposés depuis le gabarit, à confirmer ; surface laissée vide = calculée)</div>
      <div style={{ display: "flex", gap: 6, margin: "4px 0 6px" }}>
        <input value={g} onChange={(v) => setG(v.target.value)} placeholder="R+2, R+3+SS" style={{ ...S.input, width: 120 }} />
        <button style={S.btnGhost} disabled={!proposes} onClick={() => proposes && onChange(proposes)}>{proposes ? `Proposer ${proposes.length} niveau(x)` : "Gabarit illisible"}</button>
      </div>
      {niveaux.map((n, i) => (
        <div key={`${n.code}${n.rang}`} style={S.ligne}>
          <span style={{ flex: "1 1 120px", fontSize: 13 }}>{libelleNiveau(n)}</span>
          <input aria-label="Surface saisie" placeholder="calculée" inputMode="decimal" value={n.surface != null ? String(n.surface) : ""} onChange={(v) => onChange(niveaux.map((x, j) => (j === i ? { ...x, surface: v.target.value || undefined, surfaceSource: v.target.value ? "SAISIE" : undefined } : x)))} style={{ ...S.input, width: 100 }} />
          <button style={S.btnGhost} aria-label="Retirer" onClick={() => onChange(niveaux.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <select value="" onChange={(v) => {
        const code = v.target.value as CodeNiveau;
        if (!code) return;
        const rang = code === "ETAGE" ? Math.max(0, ...niveaux.filter((x) => x.code === "ETAGE").map((x) => x.rang)) + 1 : code === "SOUS_SOL" ? Math.min(0, ...niveaux.filter((x) => x.code === "SOUS_SOL").map((x) => x.rang)) - 1 : code === "RDC" ? 0 : 99;
        onChange([...niveaux, { code, rang }].sort((a, b) => a.rang - b.rang));
      }} style={{ ...S.input, width: 180 }}>
        <option value="">+ Ajouter un niveau</option><option value="SOUS_SOL">Sous-sol</option><option value="RDC">Rez-de-chaussée</option><option value="ETAGE">Étage</option><option value="MEZZANINE">Mezzanine</option>
      </select>
    </div>
  );
}

function Choix({ titre, valeur, options, statut, onChange }: { titre: string; valeur: string; options: Array<[string, string]>; statut?: "TRANCHE" | "HYPOTHESE"; onChange: (v: string, statut: "TRANCHE" | "HYPOTHESE") => void }) {
  return (
    <div style={{ ...S.ligne, borderBottom: 0 }}>
      <Champ label={`${titre} — réponse explicite exigée`}>
        <select value={valeur} onChange={(v) => onChange(v.target.value, statut ?? "HYPOTHESE")} style={S.input}>
          <option value="">— à trancher —</option>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Champ>
      {valeur && (
        <Champ label="Statut">
          <select value={statut ?? "HYPOTHESE"} onChange={(v) => onChange(valeur, v.target.value as "TRANCHE" | "HYPOTHESE")} style={S.input}>
            <option value="HYPOTHESE">Hypothèse (affichée au client)</option><option value="TRANCHE">Tranché par le cabinet</option>
          </select>
        </Champ>
      )}
    </div>
  );
}

const Champ = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8, flex: "1 1 160px" }}><span style={S.label}>{label}</span>{children}</label>
);

const S: Record<string, React.CSSProperties> = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radius, padding: 12, margin: "10px 0" },
  h3: { fontWeight: 600, color: CC.color.navy, marginBottom: 8 },
  grille: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 },
  label: { fontSize: 12, color: CC.color.inkMid },
  aide: { fontSize: 12, color: CC.color.inkMid, margin: "4px 0" },
  input: { padding: "6px 8px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", fontFamily: "inherit" },
  ligne: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "4px 0", borderBottom: `1px solid ${CC.color.borderSoft}` },
  btn: { padding: "8px 14px", borderRadius: 6, border: 0, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 },
  btnGhost: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 },
  btnAlerte: { padding: "7px 12px", borderRadius: 6, border: `1px solid ${CC.color.warn}`, background: CC.color.warnBg, color: CC.color.warn, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", color: CC.color.inkMid, padding: "6px 8px", borderBottom: `1px solid ${CC.color.border}` },
  td: { padding: "8px", borderBottom: `1px solid ${CC.color.borderSoft}`, verticalAlign: "top" },
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
  avert: { background: CC.color.warnBg, color: CC.color.warn, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
  info: { background: CC.color.infoBg, color: CC.color.info, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
  ok: { background: CC.color.successBg, color: CC.color.success, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
};
