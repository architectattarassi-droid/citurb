/**
 * /cc/dashboard — tableau de bord de gestion de projet (lot GP4).
 *   - échéances de tous les dossiers : péremption du permis (loi 12-90 art. 49),
 *     autorisations, assurances, cautions, parfait achèvement, décennale ;
 *   - rappels J−90 / J−30 / J−7 par e-mail à l'administration : envoyés à l'ouverture
 *     (une fois par jour et par navigateur) ou par le bouton ; une tâche planifiée
 *     peut aussi appeler POST /api/taches/rappels chaque matin ;
 *   - réglages des questions encore ouvertes (raccordements, réserves, art. 770, budget).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CC } from "../../theme/tokens";
import { COULEUR_NIVEAU, type Echeance } from "../dossiers/PanneauDates";

type Dossier = { id: string; titre: string; clientNom: string | null; commune: string | null; echeances: Echeance[] };
type Parametres = { raccordementsAvantPermisHabiter: boolean; leveeReservesAvantPermisHabiter: boolean; article770DelaiJours: number | null; budgetVisibleClientAvantSignature: boolean };

const dateFr = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const CLE_JOUR = "cc-rappels-echeances";

export default function TableauDeBordGestion() {
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [email, setEmail] = useState(true);
  const [info, setInfo] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tout, setTout] = useState(false);
  const [p, setP] = useState<Parametres | null>(null);
  const [libelles, setLibelles] = useState<Record<string, string>>({});

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/cc/echeances", { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || String(r.status));
      setDossiers(j.dossiers); setEmail(!!j.emailConfigure);
    } catch { setErreur("Échéances indisponibles pour le moment."); setDossiers([]); }
    try {
      const r = await fetch("/api/cc/gestion/parametres", { credentials: "include", cache: "no-store" });
      const j = await r.json();
      if (j.ok) { setP(j.parametres); setLibelles(j.libelles || {}); }
    } catch { /* réglages indisponibles */ }
  }, []);

  const rappels = useCallback(async (manuel: boolean) => {
    try {
      const r = await fetch("/api/cc/echeances/rappels", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json();
      if (manuel) setInfo(j.ok ? (j.envoyes ? `${j.envoyes} rappel(s) envoyé(s) par e-mail.` : "Aucun nouveau rappel à envoyer.") : "Envoi impossible.");
      try { localStorage.setItem(CLE_JOUR, new Date().toISOString().slice(0, 10)); } catch { /* stockage indisponible */ }
    } catch { if (manuel) setInfo("Envoi impossible."); }
  }, []);

  useEffect(() => {
    void charger();
    let deja = false;
    try { deja = localStorage.getItem(CLE_JOUR) === new Date().toISOString().slice(0, 10); } catch { /* stockage indisponible */ }
    if (!deja) void rappels(false);
  }, [charger, rappels]);

  const enregistrer = async (n: Parametres) => {
    setP(n);
    const r = await fetch("/api/cc/gestion/parametres", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(n) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setInfo(j?.ok ? "Réglage enregistré." : "Réglage non enregistré (table Parametre absente : coller docs/sql/TOUT-NEON.sql).");
  };

  const lignes = (dossiers ?? []).flatMap((d) => d.echeances.map((e) => ({ d, e })))
    .filter(({ e }) => tout || e.niveau !== null)
    .sort((a, b) => a.e.joursRestants - b.e.joursRestants);

  return (
    <div style={S.page}>
      <h1 style={S.titre}>Tableau de bord — échéances</h1>
      <p style={S.sous}>Permis à démarrer, autorisations, assurances, cautions, garanties. Rappels par e-mail à J−90, J−30 et J−7.</p>
      {!email && <div style={S.alerte}>E-mails non configurés (RESEND_API_KEY et LEAD_NOTIFY_TO) : les rappels s'affichent ici mais ne partent pas.</div>}
      {erreur && <div style={S.erreur}>{erreur}</div>}
      {info && <div style={S.info}>{info}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "8px 0" }}>
        <button style={S.btn} onClick={() => void rappels(true)}>Envoyer les rappels maintenant</button>
        <label style={{ ...S.petit, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} /> Voir aussi les échéances lointaines</label>
      </div>
      <section style={S.carte}>
        {dossiers === null ? <p style={S.petit}>Chargement…</p> : lignes.length === 0 ? <p style={S.petit}>Aucune échéance dans les 90 jours.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr style={{ textAlign: "left", color: CC.color.inkMid }}><th style={S.th}>Quand</th><th style={S.th}>Dossier</th><th style={S.th}>Échéance</th><th style={S.th}>À faire</th></tr></thead>
            <tbody>
              {lignes.map(({ d, e }) => {
                const c = COULEUR_NIVEAU[String(e.niveau)];
                return (
                  <tr key={`${d.id}-${e.cle}`} style={{ borderTop: `1px solid ${CC.color.borderSoft}` }}>
                    <td style={S.td}><span style={{ ...S.badge, background: c.fond, color: c.texte }}>{c.lib}</span><div style={S.petit}>{dateFr(e.date)}</div></td>
                    <td style={S.td}><Link to={`/cc/dossiers/${encodeURIComponent(d.id)}`} style={S.lien}>{d.titre}</Link><div style={S.petit}>{[d.clientNom, d.commune].filter(Boolean).join(" · ")}</div></td>
                    <td style={S.td}>{e.libelle}<div style={S.petit}>{e.joursRestants < 0 ? `dépassée de ${-e.joursRestants} j` : `dans ${e.joursRestants} j`}</div></td>
                    <td style={S.td}>{e.action}<div style={S.petit}>{e.base}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      {p && (
        <section style={S.carte}>
          <h2 style={S.h2}>Réglages (questions encore ouvertes)</h2>
          {(["raccordementsAvantPermisHabiter", "leveeReservesAvantPermisHabiter", "budgetVisibleClientAvantSignature"] as const).map((k) => (
            <label key={k} style={{ ...S.petit, display: "flex", gap: 8, alignItems: "center", margin: "4px 0" }}>
              <input type="checkbox" checked={p[k]} onChange={(e) => void enregistrer({ ...p, [k]: e.target.checked })} /> {libelles[k] || k}
            </label>
          ))}
          <label style={{ ...S.petit, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {libelles.article770DelaiJours || "Article 770 du DOC (jours)"}
            <input style={{ ...S.input, width: 90 }} inputMode="numeric" defaultValue={p.article770DelaiJours ?? ""} onBlur={(e) => void enregistrer({ ...p, article770DelaiJours: e.target.value ? Number(e.target.value) : null })} />
          </label>
        </section>
      )}
    </div>
  );
}

const S = {
  page: { padding: "20px 24px 60px", fontFamily: CC.font.body, color: CC.color.ink } as React.CSSProperties,
  titre: { fontFamily: CC.font.display, fontSize: 26, margin: "0 0 4px", color: CC.color.navy } as React.CSSProperties,
  sous: { color: CC.color.inkMid, margin: "0 0 10px", fontSize: 14 } as React.CSSProperties,
  h2: { fontSize: 15, color: CC.color.navy, margin: "0 0 8px" } as React.CSSProperties,
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, margin: "12px 0", overflowX: "auto" } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.5 } as React.CSSProperties,
  th: { padding: "6px 8px", fontWeight: 600 } as React.CSSProperties,
  td: { padding: "8px", verticalAlign: "top" } as React.CSSProperties,
  badge: { fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 } as React.CSSProperties,
  lien: { color: CC.color.info, fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34 } as React.CSSProperties,
  alerte: { background: CC.color.warnBg, color: CC.color.warn, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 13.5 } as React.CSSProperties,
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14 } as React.CSSProperties,
  info: { background: CC.color.successBg, color: CC.color.success, padding: "8px 12px", borderRadius: 6, margin: "8px 0", fontSize: 14 } as React.CSSProperties,
};
