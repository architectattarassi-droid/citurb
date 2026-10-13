/**
 * DossiersListe — /cc/dossiers (lecture seule)
 *
 * Dossiers créés par les portes (POST /api/intake) et lus dans Neon via
 * GET /api/cc/dossiers (Pages Function, garde functions/api/cc/_middleware.ts).
 * Remplace DossiersModule, dont les actions (documents, paiements, transitions,
 * invitation, vues détail/shadow, devis) visaient l'API NestJS éteinte : elles
 * reviendront avec le lot « back-office dossiers » du plan de rebranchement.
 */
import React, { useEffect, useMemo, useState } from "react";
import { CC } from "../../theme/tokens";
import DemanderAppelVideo from "../../../features/appels/DemanderAppelVideo";

type Dossier = {
  id: string; title: string | null; commune: string | null; status: string; createdAt: string | null; submittedAt: string | null;
  porteType: string | null; phase: string | null; clientNom: string | null; clientTel: string | null; clientEmail: string | null;
  packSelected: string | null; packPriceMAD: number | null; budgetEstime: number | null; surfacePlancher: number | null; opsNote: string | null;
  payload: unknown;
  owner?: { email: string; phone: string | null };
  _count?: { documents: number };
};

const ERREURS: Record<string, string> = {
  storage_unavailable: "Base indisponible (DATABASE_URL).",
  access_not_configured: "Accès back-office non configuré.",
};

const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const mad = (n: number | null) => (n == null ? "—" : `${new Intl.NumberFormat("fr-FR").format(n)} MAD`);
const wa = (tel: string) => `https://wa.me/${tel.replace(/[^0-9]/g, "").replace(/^0/, "212")}`;

export default function DossiersListe() {
  const [items, setItems] = useState<Dossier[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [porte, setPorte] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = async () => {
    setErreur(null);
    try {
      const r = await fetch("/api/cc/dossiers", { credentials: "include", cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!r.ok || !Array.isArray(j)) throw new Error(ERREURS[j?.error] || j?.error || `Erreur ${r.status}`);
      setItems(j as Dossier[]);
    } catch (e) {
      setErreur((e as Error).message);
      setItems([]);
    }
  };
  useEffect(() => { void charger(); }, []);

  const portes = useMemo(() => [...new Set((items ?? []).map((d) => d.porteType).filter(Boolean))] as string[], [items]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((d) => (!porte || d.porteType === porte)
      && (!t || [d.title, d.commune, d.clientNom, d.clientTel, d.clientEmail, d.id].some((v) => v && String(v).toLowerCase().includes(t))));
  }, [items, q, porte]);

  return (
    <div style={S.page}>
      <h1 style={S.titre}>Dossiers</h1>
      <p style={S.sous}>
        Dossiers ouverts par les formulaires des portes (Neon). Consultation seule pour l'instant :
        les actions (documents, statuts, devis, invitation du client) arrivent avec le lot « back-office dossiers ».
      </p>

      <div style={S.barre}>
        <input placeholder="Rechercher (nom, téléphone, commune…)" value={q} onChange={(e) => setQ(e.target.value)} style={S.input} />
        <select value={porte} onChange={(e) => setPorte(e.target.value)} style={S.input}>
          <option value="">Toutes les portes</option>
          {portes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => void charger()} style={S.btnGhost}>Actualiser</button>
      </div>

      {erreur && <div style={S.erreur}>{erreur}</div>}
      {items === null ? <p style={S.sous}>Chargement…</p> : visibles.length === 0 ? <p style={S.sous}>Aucun dossier.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Date", "Porte", "Dossier", "Client", "Statut", "Montants"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visibles.map((d) => (
                <React.Fragment key={d.id}>
                  <tr onClick={() => setOuvert(ouvert === d.id ? null : d.id)} style={{ cursor: "pointer" }}>
                    <td style={S.td}>{date(d.submittedAt || d.createdAt)}</td>
                    <td style={S.td}><b>{d.porteType ?? "—"}</b></td>
                    <td style={S.td}>{d.title || "Sans titre"}<div style={S.petit}>{d.commune ?? ""}</div></td>
                    <td style={S.td}>
                      {d.clientNom ?? "—"}
                      <div style={S.petit}>
                        {d.clientTel && <><a href={`tel:${d.clientTel}`} onClick={(e) => e.stopPropagation()}>{d.clientTel}</a> · <a href={wa(d.clientTel)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>WhatsApp</a></>}
                        {d.clientEmail && <div><a href={`mailto:${d.clientEmail}`} onClick={(e) => e.stopPropagation()}>{d.clientEmail}</a></div>}
                      </div>
                    </td>
                    <td style={S.td}>{d.status}{d.phase ? <div style={S.petit}>{d.phase}</div> : null}</td>
                    <td style={S.td}>
                      {d.packPriceMAD != null && <div>Pack : {mad(d.packPriceMAD)}</div>}
                      {d.budgetEstime != null && <div style={S.petit}>Budget : {mad(d.budgetEstime)}</div>}
                    </td>
                  </tr>
                  {ouvert === d.id && (
                    <tr>
                      <td colSpan={6} style={{ ...S.td, background: CC.color.bgSoft }}>
                        <div style={S.petit}>Réf. {d.id}{d.surfacePlancher ? ` · ${d.surfacePlancher} m² plancher` : ""}{d.opsNote ? ` · Note : ${d.opsNote}` : ""}</div>
                        {/* Appel vidéo sur demande avec le client du dossier : rien ne démarre sans son accord (suivi dans /cc/appels). */}
                        <div style={{ margin: "8px 0" }}><DemanderAppelVideo porte="admin" contexte="dossier" objetId={d.id} sujet={d.title || undefined} invites={[{ type: "client", dossierId: d.id }]} avecNom={d.clientNom || "le client"} langue="fr" variante="navy" /></div>
                        <pre style={S.pre}>{JSON.stringify(d.payload ?? {}, null, 2)}</pre>
                      </td>
                    </tr>
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

const S: Record<string, React.CSSProperties> = {
  page: { padding: "24px 28px", fontFamily: CC.font.body, color: CC.color.ink },
  titre: { fontFamily: CC.font.display, fontSize: 28, margin: "0 0 4px", color: CC.color.navy },
  sous: { color: CC.color.inkMid, margin: "0 0 14px", fontSize: 14, lineHeight: 1.5 },
  barre: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  input: { padding: "8px 10px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 14, minWidth: 200, background: "#fff" },
  btnGhost: { padding: "8px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 },
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14 },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: CC.color.inkMid, padding: "8px 10px", borderBottom: `1px solid ${CC.color.border}` },
  td: { padding: "10px", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13, verticalAlign: "top" },
  petit: { fontSize: 12, color: CC.color.inkMid, marginTop: 2 },
  pre: { fontSize: 11, maxHeight: 280, overflow: "auto", background: "#fff", border: `1px solid ${CC.color.border}`, borderRadius: 6, padding: 10, margin: "8px 0 0", whiteSpace: "pre-wrap" },
};
