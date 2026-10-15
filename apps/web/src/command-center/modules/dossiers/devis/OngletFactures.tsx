/**
 * Onglet « Factures » de la fiche dossier admin (/cc/dossiers/:id).
 *
 * Paiements par phase P00…P14 (chaque phase démarre après paiement de son
 * échéance — décision du 15/10/2026), échéancier modifiable du devis accepté,
 * émission des factures FAC, encaissements (virement, chèque, espèces, effet,
 * avec justificatif), avoirs AVO, déblocage motivé d'une phase.
 * Serveur : /api/cc/dossiers/:id/facturation, /api/cc/factures/:id (functions/_lib/facturationDepot.ts).
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../../theme/tokens";
import { Dec, formatDH } from "../../../../domain/honoraires/decimal";
import { mentionEmpreinte, type DocumentDevis } from "../../../../domain/honoraires/documentDevis";
import type { PhasePaiement } from "../../../../domain/honoraires/facturation";
import { telecharger } from "./ApercuDocument";
import { fichierEnBase64 } from "./Acceptation";

type Echeance = { id: string; devisId: string; phaseCode: string; phase: string; ordre: number; libelle: string; montantHT: string; declencheur: string; facture: string | null };
type Facture = {
  id: string; numero: string; type: string; statut: string; echeanceId: string | null; factureOrigineId: string | null; dateEmission: string; dateEcheance: string;
  montantHT: string; montantTTC: string; netAPayer: string; paye: string; restant: string;
  encaissements: Array<{ id: string; montant: string; date: string; mode: string; reference: string | null; justificatifId: string | null }>;
};
type Vue = { etat: PhasePaiement[]; devis: Array<{ id: string; numero: string | null; statut: string; montantAccepte: string | null; pack: string | null; dateAcceptation: string | null }>; echeances: Echeance[]; factures: Facture[] };

const STATUT: Record<string, [string, string]> = {
  NON_DUE: ["Non due", CC.color.inkMuted], A_EMETTRE: ["À facturer", CC.color.warn], EMISE: ["Facturée", CC.color.info], PARTIELLE: ["Partielle", CC.color.or],
  PAYEE: ["Payée", CC.color.success], EN_RETARD: ["En retard", CC.color.danger],
};
const ERREURS: Record<string, string> = { sql_a_coller: "Tables de facturation absentes : coller docs/sql/TOUT-NEON.sql dans la console Neon.", storage_unavailable: "Base indisponible." };
const dateFr = (s: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

async function appel(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init?.body ? { "content-type": "application/json" } : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error([ERREURS[j.error] || j.message || `Erreur ${r.status}`, ...(j.erreurs || [])].join(" "));
  return j;
}

export default function OngletFactures({ dossierId }: { dossierId: string }) {
  const [vue, setVue] = useState<Vue | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const base = `/api/cc/dossiers/${encodeURIComponent(dossierId)}/facturation`;
  const charger = useCallback(async () => {
    try { setVue(await appel(base)); setErreur(null); } catch (e) { setErreur((e as Error).message); }
  }, [base]);
  useEffect(() => { void charger(); }, [charger]);
  const action = async (corps: Record<string, unknown>, ok: string) => {
    setErreur(null); setMessage(null);
    try { const j = await appel(base, { method: "POST", body: JSON.stringify(corps) }); setMessage(j.numero ? `${ok} : ${j.numero}` : ok); await charger(); return true; }
    catch (e) { setErreur((e as Error).message); return false; }
  };
  const telechargerFacture = async (f: Facture, format: "pdf" | "docx") => {
    try { const j = await appel(`/api/cc/factures/${encodeURIComponent(f.id)}`); telecharger(j.document as DocumentDevis, mentionEmpreinte(j.hash), format); }
    catch (e) { setErreur((e as Error).message); }
  };

  if (erreur && !vue) return <div style={S.erreur}>{erreur}</div>;
  if (!vue) return <p style={S.aide}>Chargement…</p>;
  const phasesUtiles = vue.etat.filter((p) => !p.aucuneEcheance || p.deblocage);

  return (
    <div>
      {erreur && <div style={S.erreur}>{erreur}</div>}
      {message && <div style={S.ok}>{message}</div>}

      <section style={S.carte}>
        <div style={S.h3}>Paiements par phase</div>
        {vue.devis.length === 0 ? <p style={S.aide}>Aucun devis accepté : l'échéancier naît à l'acceptation (onglet Devis).</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead><tr>{["Phase", "Statut", "Dû TTC", "Payé", "Restant", "Démarrage", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {phasesUtiles.map((p) => {
                  const [lib, c] = STATUT[p.statut];
                  return (
                    <tr key={p.phase}>
                      <td style={S.td}>{p.libelle}</td>
                      <td style={S.td}><span style={{ color: c, fontWeight: 600 }}>{lib}</span>{p.datePaiementComplet ? <div style={S.aide}>le {dateFr(p.datePaiementComplet)}</div> : null}</td>
                      <td style={S.tdN}>{formatDH(p.du)}{p.estime ? <div style={S.aide}>estimé</div> : null}</td>
                      <td style={S.tdN}>{formatDH(p.paye)}</td>
                      <td style={S.tdN}>{formatDH(p.restant)}</td>
                      <td style={S.td}>{p.bloquante ? <span style={{ color: CC.color.danger }}>Bloqué jusqu'au paiement</span> : p.deblocage ? <span title={p.deblocage.motif}>Débloqué ({p.deblocage.par}, {dateFr(p.deblocage.le)})</span> : "Libre"}</td>
                      <td style={S.td}>{p.bloquante && <button style={S.btnGhost} onClick={() => {
                        const motif = window.prompt(`Débloquer « ${p.libelle} » sans paiement complet — motif écrit obligatoire :`);
                        if (motif) void action({ action: "debloquer", phase: p.phase, motif }, "Phase débloquée");
                      }}>Débloquer…</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {vue.devis.map((d) => <Echeancier key={d.id} phases={vue.etat.map((p) => ({ code: p.phase, libelle: p.libelle }))} devis={d} echeances={vue.echeances.filter((e) => e.devisId === d.id)} onAction={action} />)}

      <section style={S.carte}>
        <div style={S.h3}>Factures et avoirs</div>
        {vue.factures.length === 0 ? <p style={S.aide}>Aucune facture émise.</p> : vue.factures.map((f) => (
          <LigneFacture key={f.id} f={f} dossierId={dossierId} onAction={action} onTelecharger={telechargerFacture} />
        ))}
      </section>
    </div>
  );
}

function Echeancier({ phases, devis, echeances, onAction }: { phases: Array<{ code: string; libelle: string }>; devis: Vue["devis"][number]; echeances: Echeance[]; onAction: (c: Record<string, unknown>, ok: string) => Promise<boolean> }) {
  const [lignes, setLignes] = useState(echeances.map((e) => ({ ...e })));
  const [edition, setEdition] = useState(false);
  useEffect(() => setLignes(echeances.map((e) => ({ ...e }))), [echeances]);
  let somme = Dec.ZERO;
  try { somme = Dec.somme(lignes.map((l) => l.montantHT || "0")); } catch { /* saisie en cours */ }
  const ecart = devis.montantAccepte ? !somme.egal(devis.montantAccepte) : false;
  const maj = (i: number, m: Partial<Echeance>) => setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...m } : l)));
  return (
    <section style={S.carte}>
      <div style={S.h3}>Échéancier — devis {devis.numero} (accepté le {dateFr(devis.dateAcceptation)}{devis.pack ? `, pack ${devis.pack.toLowerCase()}` : ""}) — {devis.montantAccepte ? formatDH(devis.montantAccepte) : "—"} HT</div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr>{["Phase", "Libellé", "Montant HT", "Exigible", "Facture", ""].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {lignes.map((l, i) => {
              const fige = !!l.facture || !edition;
              return (
                <tr key={l.id || i}>
                  <td style={S.td}>{fige ? l.phase : (
                    <select value={l.phaseCode} onChange={(e) => maj(i, { phaseCode: e.target.value, phase: phases.find((p) => p.code === e.target.value)?.libelle ?? "" })} style={S.input}>
                      {phases.map((p) => <option key={p.code} value={p.code}>{p.libelle}</option>)}
                    </select>
                  )}</td>
                  <td style={S.td}>{fige ? l.libelle : <input value={l.libelle} onChange={(e) => maj(i, { libelle: e.target.value })} style={{ ...S.input, width: "100%" }} />}</td>
                  <td style={S.tdN}>{fige ? formatDH(l.montantHT) : <input inputMode="decimal" value={l.montantHT} onChange={(e) => maj(i, { montantHT: e.target.value })} style={{ ...S.input, width: 110, textAlign: "right" }} />}</td>
                  <td style={S.td}>{fige ? (l.declencheur === "SIGNATURE" ? "À la signature" : "Avant la phase") : (
                    <select value={l.declencheur} onChange={(e) => maj(i, { declencheur: e.target.value })} style={S.input}><option value="SIGNATURE">À la signature</option><option value="DEBUT_PHASE">Avant la phase</option></select>
                  )}</td>
                  <td style={S.td}>{l.facture ?? (edition ? "" : l.id ? (
                    <button style={S.btn} onClick={() => { if (window.confirm(`Émettre la facture de « ${l.libelle} » ? Le numéro FAC est définitif.`)) void onAction({ action: "facturer", echeanceId: l.id }, "Facture émise"); }}>Émettre la facture</button>
                  ) : "")}</td>
                  <td style={S.td}>{edition && !l.facture && <button style={S.btnGhost} aria-label="Retirer" onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))}>✕</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edition ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <button style={S.btnGhost} onClick={() => setLignes((ls) => [...ls, { id: "", devisId: devis.id, phaseCode: phases[0].code, phase: phases[0].libelle, ordre: ls.length + 1, libelle: "", montantHT: "0", declencheur: "DEBUT_PHASE", facture: null }])}>+ Échéance</button>
          <span style={{ ...S.aide, color: ecart ? CC.color.danger : CC.color.inkMid }}>Somme : {formatDH(somme)} / {devis.montantAccepte ? formatDH(devis.montantAccepte) : "—"}</span>
          <button style={{ ...S.btn, opacity: ecart ? 0.5 : 1 }} disabled={ecart} onClick={async () => {
            if (await onAction({ action: "echeancier", devisId: devis.id, echeances: lignes.map((l) => ({ id: l.id || undefined, phaseCode: l.phaseCode, libelle: l.libelle, montantHT: l.montantHT, declencheur: l.declencheur })) }, "Échéancier enregistré (journalisé)")) setEdition(false);
          }}>Enregistrer l'échéancier</button>
          <button style={S.btnGhost} onClick={() => { setLignes(echeances.map((e) => ({ ...e }))); setEdition(false); }}>Annuler</button>
        </div>
      ) : (
        <button style={{ ...S.btnGhost, marginTop: 8 }} onClick={() => setEdition(true)}>Modifier les modalités de paiement</button>
      )}
    </section>
  );
}

function LigneFacture({ f, dossierId, onAction, onTelecharger }: { f: Facture; dossierId: string; onAction: (c: Record<string, unknown>, ok: string) => Promise<boolean>; onTelecharger: (f: Facture, format: "pdf" | "docx") => void }) {
  const [panneau, setPanneau] = useState<"" | "encaisser" | "avoir">("");
  const [enc, setEnc] = useState({ montant: f.restant, date: new Date().toISOString().slice(0, 10), mode: "VIREMENT", reference: "" });
  const [fichier, setFichier] = useState<File | null>(null);
  const [avoir, setAvoir] = useState({ montantHT: "", motif: "" });
  const avoirDoc = f.type === "AVOIR";
  const couleur = f.statut === "REGLEE" ? CC.color.success : f.statut === "ANNULEE" ? CC.color.inkMuted : !avoirDoc && f.dateEcheance < new Date().toISOString().slice(0, 10) && f.restant !== "0.00" ? CC.color.danger : CC.color.info;
  return (
    <div style={{ borderBottom: `1px solid ${CC.color.borderSoft}`, padding: "8px 0" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <strong>{f.numero}</strong>
        <span style={S.aide}>{avoirDoc ? "Avoir" : f.type.toLowerCase().replace("_", " ")} · émise le {dateFr(f.dateEmission)}{avoirDoc ? "" : ` · échéance ${dateFr(f.dateEcheance)}`}</span>
        <span style={{ color: couleur, fontWeight: 600 }}>{f.statut.replace("_", " ").toLowerCase()}</span>
        <span style={{ marginLeft: "auto" }}>{formatDH(f.netAPayer)} TTC{!avoirDoc && ` · payé ${formatDH(f.paye)} · reste ${formatDH(f.restant)}`}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <button style={S.btnGhost} onClick={() => onTelecharger(f, "pdf")}>PDF</button>
        <button style={S.btnGhost} onClick={() => onTelecharger(f, "docx")}>DOCX</button>
        {!avoirDoc && ["EMISE", "PARTIELLEMENT_REGLEE"].includes(f.statut) && <button style={S.btn} onClick={() => setPanneau(panneau === "encaisser" ? "" : "encaisser")}>Enregistrer un encaissement</button>}
        {!avoirDoc && f.statut !== "ANNULEE" && <button style={S.btnGhost} onClick={() => setPanneau(panneau === "avoir" ? "" : "avoir")}>Émettre un avoir</button>}
      </div>
      {f.encaissements.length > 0 && (
        <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, fontSize: 13 }}>
          {f.encaissements.map((e) => (
            <li key={e.id}>{dateFr(e.date)} — {formatDH(e.montant)} — {e.mode.toLowerCase()}{e.reference ? ` (${e.reference})` : ""}
              {e.justificatifId && <> — <a href={`/api/cc/dossiers/${encodeURIComponent(dossierId)}/justificatifs/${encodeURIComponent(e.justificatifId)}`} target="_blank" rel="noreferrer">justificatif</a></>}</li>
          ))}
        </ul>
      )}
      {panneau === "encaisser" && (
        <div style={S.panneau}>
          <input inputMode="decimal" value={enc.montant} onChange={(e) => setEnc({ ...enc, montant: e.target.value })} style={{ ...S.input, width: 110 }} aria-label="Montant" />
          <input type="date" value={enc.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEnc({ ...enc, date: e.target.value })} style={S.input} />
          <select value={enc.mode} onChange={(e) => setEnc({ ...enc, mode: e.target.value })} style={S.input}>
            <option value="VIREMENT">Virement</option><option value="CHEQUE">Chèque</option><option value="ESPECES">Espèces</option><option value="EFFET">Effet</option>
          </select>
          <input placeholder="Référence (n° de chèque, virement…)" value={enc.reference} onChange={(e) => setEnc({ ...enc, reference: e.target.value })} style={{ ...S.input, flex: "1 1 180px" }} />
          <input type="file" accept="application/pdf,image/jpeg,image/webp" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} aria-label="Justificatif" />
          <button style={S.btn} onClick={async () => {
            const justificatif = fichier ? { nom: fichier.name, contenu: await fichierEnBase64(fichier) } : undefined;
            if (await onAction({ action: "encaisser", factureId: f.id, ...enc, justificatif }, "Encaissement enregistré")) setPanneau("");
          }}>Valider</button>
        </div>
      )}
      {panneau === "avoir" && (
        <div style={S.panneau}>
          <input inputMode="decimal" placeholder={`Montant HT (vide = total ${formatDH(f.montantHT)})`} value={avoir.montantHT} onChange={(e) => setAvoir({ ...avoir, montantHT: e.target.value })} style={{ ...S.input, width: 230 }} />
          <input placeholder="Motif (obligatoire)" value={avoir.motif} onChange={(e) => setAvoir({ ...avoir, motif: e.target.value })} style={{ ...S.input, flex: "1 1 220px" }} />
          <button style={S.btn} onClick={async () => {
            if (!window.confirm("Émettre l'avoir ? Le numéro AVO est définitif ; la facture d'origine reste inchangée.")) return;
            if (await onAction({ action: "avoir", factureId: f.id, ...avoir }, "Avoir émis")) setPanneau("");
          }}>Émettre l'avoir</button>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radius, padding: 12, margin: "10px 0" },
  h3: { fontWeight: 600, color: CC.color.navy, marginBottom: 8 },
  aide: { fontSize: 12, color: CC.color.inkMid },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", color: CC.color.inkMid, padding: "6px 8px", borderBottom: `1px solid ${CC.color.border}` },
  td: { padding: "7px 8px", borderBottom: `1px solid ${CC.color.borderSoft}`, verticalAlign: "top" },
  tdN: { padding: "7px 8px", borderBottom: `1px solid ${CC.color.borderSoft}`, verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" },
  input: { padding: "6px 8px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff" },
  btn: { padding: "6px 12px", borderRadius: 6, border: 0, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13 },
  btnGhost: { padding: "6px 10px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 },
  panneau: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: CC.color.bgSoft, padding: 8, borderRadius: 6, marginTop: 6 },
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
  ok: { background: CC.color.successBg, color: CC.color.success, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13 },
};
