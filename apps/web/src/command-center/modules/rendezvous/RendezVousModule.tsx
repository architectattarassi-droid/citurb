/**
 * /cc/rendez-vous — rendez-vous visio des clients (Pages Functions /api/cc/rdv).
 *   - liste du jour / à venir / passés récents ;
 *   - fiche : coordonnées, statut, note, dossier rempli par le client
 *     (rafraîchi toutes les 10 s pendant l'appel), « Lancer l'appel » (modérateur) ;
 *   - paramètres : lien visio de secours, durée, plages horaires, fermetures.
 * Heures affichées à l'heure du Maroc.
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";
import SalleVisio, { type ConfigVisio } from "../../../features/visio/SalleVisio";
import { ResumeDossier } from "../../../features/rdv/DossierRdv";

type Rdv = {
  id: string; debut: string; dureeMin: number; statut: string; nom: string; telephone: string; email: string | null; porte: string | null;
  objet: string | null; message: string | null; dossierId: string | null; leadId: string | null; utm: Record<string, string> | null;
  dossierRdv: Record<string, unknown> | null; noteArchitecte: string | null; createdAt: string;
};
type Plage = [string, string];
type Parametres = { lienVisio: string; dureeMin: number; delaiMinHeures: number; horizonJours: number; plages: Record<string, Plage[]>; fermetures: string[] };

const TZ = "Africa/Casablanca";
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  CONFIRME: { libelle: "Confirmé", couleur: "#047857" },
  TERMINE: { libelle: "Terminé", couleur: "#475569" },
  ABSENT: { libelle: "Absent", couleur: "#b45309" },
  ANNULE: { libelle: "Annulé", couleur: "#b91c1c" },
};
const OBJETS: Record<string, string> = { MAISON: "Construire une maison", PERMIS: "Permis / autorisation", CHIFFRAGE: "Chiffrage / devis", TERRAIN: "Terrain", AUTRE: "Autre" };
const quand = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const jourMaroc = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const j = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
    return { ok: r.ok && !!j?.ok, status: r.status, data: j, error: j?.error };
  } catch {
    return { ok: false, status: 0, data: null, error: "reseau" };
  }
}

const btn = (c: string, plein = false): React.CSSProperties => ({ padding: "8px 12px", minHeight: 40, borderRadius: 8, border: `1px solid ${c}`, background: plein ? c : "transparent", color: plein ? "#fff" : c, fontWeight: 700, fontSize: 13, cursor: "pointer" });
const carte: React.CSSProperties = { border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, background: CC.color.bgRaised };

export default function RendezVousModule() {
  const [onglet, setOnglet] = useState<"liste" | "parametres">("liste");
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink }}>
      <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Rendez-vous visio</h1>
      <p style={{ fontSize: 13, color: CC.color.inkMid, margin: "0 0 16px" }}>Réservés depuis /rendez-vous. Heures du Maroc. Chaque réservation crée aussi un lead (source WEB_RDV) et un dossier.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["liste", "Rendez-vous"], ["parametres", "Paramètres"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${CC.color.border}`, background: onglet === k ? CC.color.navy : CC.color.bgRaised, color: onglet === k ? CC.color.inkOnDark : CC.color.inkMid, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{l}</button>
        ))}
      </div>
      {onglet === "liste" ? <Liste /> : <ParametresRdv />}
    </div>
  );
}

function Liste() {
  const [donnees, setDonnees] = useState<{ table: boolean; visioIntegree: boolean; rdv: Rdv[] } | null>(null);
  const [erreur, setErreur] = useState("");
  const [choisi, setChoisi] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const r = await api<{ table: boolean; visioIntegree: boolean; rdv: Rdv[] }>("/api/cc/rdv");
    if (!r.ok || !r.data) { setErreur(`Lecture impossible (${r.error || r.status}). En local, cette page ne fonctionne qu'avec les Pages Functions.`); return; }
    setErreur("");
    setDonnees(r.data);
  }, []);
  useEffect(() => { void charger(); const t = window.setInterval(() => void charger(), 60_000); return () => window.clearInterval(t); }, [charger]);

  if (choisi) return <Fiche id={choisi} visioIntegree={!!donnees?.visioIntegree} onRetour={() => { setChoisi(null); void charger(); }} />;

  const auj = jourMaroc(new Date().toISOString());
  const maintenant = Date.now();
  const liste = donnees?.rdv ?? [];
  const groupes: [string, Rdv[]][] = [
    ["Aujourd'hui", liste.filter((r) => jourMaroc(r.debut) === auj)],
    ["À venir", liste.filter((r) => jourMaroc(r.debut) > auj)],
    ["Passés (30 derniers jours)", liste.filter((r) => jourMaroc(r.debut) < auj).reverse()],
  ];

  return (
    <>
      {donnees && !donnees.table && <p style={{ background: "#fff7ed", border: "1px solid #fdba74", padding: 12, borderRadius: 8, fontSize: 13 }}>Les tables RendezVous / Parametre n'existent pas encore dans Neon : exécutez docs/sql/rendezvous-neon.sql dans la console SQL.</p>}
      {donnees && !donnees.visioIntegree && <p style={{ background: CC.color.infoBg, padding: 12, borderRadius: 8, fontSize: 13 }}>Visio intégrée non activée (variables JAAS_* absentes) : les clients voient le lien de secours (onglet Paramètres, sinon WhatsApp).</p>}
      {erreur && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erreur}</p>}
      {groupes.map(([titre, l]) => (
        <section key={titre} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, color: CC.color.navy, margin: "0 0 8px" }}>{titre} ({l.length})</h2>
          {!l.length && <p style={{ fontSize: 13, color: CC.color.inkMid, margin: 0 }}>Aucun.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {l.map((r) => {
              const enCours = r.statut === "CONFIRME" && maintenant >= Date.parse(r.debut) - 15 * 60_000 && maintenant <= Date.parse(r.debut) + r.dureeMin * 60_000;
              const rempli = Object.keys(r.dossierRdv || {}).filter((k) => k !== "majLe").length;
              return (
                <button key={r.id} onClick={() => setChoisi(r.id)} style={{ ...carte, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderColor: enCours ? CC.color.or : CC.color.border }}>
                  <span>
                    <strong style={{ fontSize: 15 }}>{quand(r.debut)}</strong> · {r.nom} · <span style={{ color: CC.color.inkMid }}>{OBJETS[r.objet || ""] ?? r.objet}</span>
                    <span style={{ display: "block", fontSize: 12, color: CC.color.inkMid }}>{r.telephone}{r.email ? ` · ${r.email}` : ""} · dossier : {rempli} réponse{rempli > 1 ? "s" : ""}{r.dossierRdv?.pret === true ? " (prêt)" : ""}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: enCours ? CC.color.or : STATUTS[r.statut]?.couleur }}>{enCours ? "Maintenant" : STATUTS[r.statut]?.libelle ?? r.statut}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Fiche({ id, visioIntegree, onRetour }: { id: string; visioIntegree: boolean; onRetour: () => void }) {
  const [r, setR] = useState<Rdv | null>(null);
  const [note, setNote] = useState("");
  const [noteModifiee, setNoteModifiee] = useState(false);
  const [msg, setMsg] = useState("");
  const [visio, setVisio] = useState<ConfigVisio | null>(null);

  const charger = useCallback(async () => {
    const x = await api<{ rdv: Rdv }>(`/api/cc/rdv/${encodeURIComponent(id)}`);
    if (x.ok && x.data) {
      setR(x.data.rdv);
      setNote((n) => (noteModifiee ? n : x.data!.rdv.noteArchitecte || ""));
    }
  }, [id, noteModifiee]);
  // Dossier du client en direct : relecture toutes les 10 s.
  useEffect(() => { void charger(); const t = window.setInterval(() => void charger(), 10_000); return () => window.clearInterval(t); }, [charger]);

  const patch = async (corps: Record<string, unknown>) => {
    const x = await api(`/api/cc/rdv/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(corps) });
    setMsg(x.ok ? "Enregistré." : x.error === "creneau_pris" ? "Ce créneau a été repris par un autre rendez-vous." : `Échec (${x.error || x.status}).`);
    if (x.ok) { setNoteModifiee(false); void charger(); }
  };
  const lancer = async () => {
    setMsg("");
    const x = await api<{ config: ConfigVisio }>(`/api/cc/rdv/${encodeURIComponent(id)}/visio`, { method: "POST", body: "{}" });
    if (x.ok && x.data) setVisio(x.data.config);
    else setMsg(x.error === "visio_non_configuree" ? "Visio intégrée non activée : configurez JAAS_APP_ID, JAAS_KEY_ID et JAAS_PRIVATE_KEY_PEM dans Cloudflare." : `La salle n'a pas pu s'ouvrir (${x.error || x.status}).`);
  };

  if (!r) return <p style={{ fontSize: 13 }}>Chargement…</p>;
  const dossier = r.dossierRdv || {};

  const details = (
    <div style={{ ...carte, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 16 }}>{quand(r.debut)} · {r.dureeMin} min</strong>
        <span style={{ fontWeight: 700, color: STATUTS[r.statut]?.couleur }}>{STATUTS[r.statut]?.libelle ?? r.statut}</span>
      </div>
      <div style={{ fontSize: 14 }}><b>{r.nom}</b> · <a href={`tel:${r.telephone}`}>{r.telephone}</a> · <a href={`https://wa.me/${r.telephone.replace(/[^0-9]/g, "").replace(/^0/, "212")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>{r.email ? <> · <a href={`mailto:${r.email}`}>{r.email}</a></> : null}</div>
      <div style={{ fontSize: 13, color: CC.color.inkMid }}>{OBJETS[r.objet || ""] ?? r.objet} · porte {r.porte || "—"}{r.utm?.source ? ` · source ${r.utm.source}` : ""}{r.utm?.canal ? ` · canal ${r.utm.canal}` : ""}</div>
      {r.message && <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-line" }}>« {r.message} »</p>}
      <div style={{ fontSize: 12, color: CC.color.inkMid }}>
        {r.dossierId ? <>Dossier <code>{r.dossierId}</code> — <a href="/cc/dossiers">Dossiers</a></> : "Pas de dossier"} · {r.leadId ? <>Lead <code>{r.leadId}</code> — <a href="/cc/leads">Leads</a></> : "pas de lead"}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {visioIntegree && r.statut !== "ANNULE" && !visio && <button onClick={() => void lancer()} style={btn(CC.color.navy, true)}>Lancer l'appel</button>}
        {(["TERMINE", "ABSENT", "ANNULE", "CONFIRME"] as const).filter((s) => s !== r.statut).map((s) => (
          <button key={s} onClick={() => void patch({ statut: s })} style={btn(STATUTS[s].couleur)}>{s === "CONFIRME" ? "Remettre confirmé" : `Marquer ${STATUTS[s].libelle.toLowerCase()}`}</button>
        ))}
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Note de l'architecte (interne)
        <textarea value={note} onChange={(e) => { setNote(e.target.value); setNoteModifiee(true); }} rows={4} maxLength={4000} style={{ font: "inherit", fontWeight: 400, padding: 8, borderRadius: 8, border: `1px solid ${CC.color.border}` }} />
      </label>
      <div><button onClick={() => void patch({ noteArchitecte: note })} disabled={!noteModifiee} style={btn(CC.color.navy)}>Enregistrer la note</button> {msg && <span style={{ fontSize: 12, marginLeft: 8 }}>{msg}</span>}</div>
    </div>
  );

  const panneauDossier = (
    <div style={{ ...carte, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ color: CC.color.navy }}>Dossier du client {dossier.pret === true && <span style={{ color: "#047857" }}>· prêt</span>}</strong>
        <span style={{ fontSize: 11, color: CC.color.inkMid }}>{typeof dossier.majLe === "string" ? `mis à jour ${new Date(dossier.majLe).toLocaleTimeString("fr-FR")}` : ""} · actualisé toutes les 10 s</span>
      </div>
      <ResumeDossier valeurs={dossier} />
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div><button onClick={onRetour} style={btn(CC.color.inkMid)}>← Tous les rendez-vous</button></div>
      {visio ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(280px, 2fr)", gap: 12 }}>
          <div style={{ height: "calc(100vh - 220px)", minHeight: 420, borderRadius: 12, overflow: "hidden" }}>
            <SalleVisio config={visio} nomAffiche="Architecte CITURBAREA" onQuitter={() => setVisio(null)} onErreur={(m) => setMsg(m)} />
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "start", maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            {panneauDossier}
            {details}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" }}>
          {details}
          {panneauDossier}
        </div>
      )}
    </div>
  );
}

function ParametresRdv() {
  const [p, setP] = useState<Parametres | null>(null);
  const [table, setTable] = useState(true);
  const [msg, setMsg] = useState("");
  const [nouvelleFermeture, setNouvelleFermeture] = useState("");

  useEffect(() => {
    void api<{ table: boolean; parametres: Parametres }>("/api/cc/rdv/parametres").then((x) => {
      if (x.ok && x.data) { setP(x.data.parametres); setTable(x.data.table); } else setMsg(`Lecture impossible (${x.error || x.status}).`);
    });
  }, []);
  if (!p) return <p style={{ fontSize: 13 }}>{msg || "Chargement…"}</p>;

  const maj = (x: Partial<Parametres>) => setP({ ...p, ...x });
  const majPlage = (j: string, i: number, k: 0 | 1, v: string) => maj({ plages: { ...p.plages, [j]: (p.plages[j] || []).map((pl, n) => (n === i ? (k === 0 ? [v, pl[1]] : [pl[0], v]) as Plage : pl)) } });
  const enregistrer = async () => {
    const x = await api("/api/cc/rdv/parametres", { method: "PUT", body: JSON.stringify(p) });
    setMsg(x.ok ? "Paramètres enregistrés." : `Refusé : ${x.error || x.status}`);
  };
  const nombre = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;
  const champ: React.CSSProperties = { font: "inherit", padding: "8px 10px", borderRadius: 8, border: `1px solid ${CC.color.border}`, minHeight: 38 };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      {!table && <p style={{ background: "#fff7ed", border: "1px solid #fdba74", padding: 12, borderRadius: 8, fontSize: 13 }}>Tables absentes : exécutez docs/sql/rendezvous-neon.sql dans Neon avant d'enregistrer.</p>}
      <div style={carte}>
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Lien visio de secours (Google Meet, Zoom, Teams…)
          <input value={p.lienVisio} onChange={(e) => maj({ lienVisio: e.target.value.trim() })} placeholder="https://meet.google.com/xxx-xxxx-xxx" style={champ} />
          <span style={{ fontWeight: 400, color: CC.color.inkMid }}>Utilisé seulement si la visio intégrée (JaaS) n'est pas activée. Vide : la visio se fait sur WhatsApp du cabinet.</span>
        </label>
      </div>
      <div style={{ ...carte, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Durée (min)<input inputMode="numeric" value={p.dureeMin} onChange={(e) => maj({ dureeMin: nombre(e.target.value) })} style={{ ...champ, width: 90 }} /></label>
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Délai minimum (h)<input inputMode="numeric" value={p.delaiMinHeures} onChange={(e) => maj({ delaiMinHeures: nombre(e.target.value) })} style={{ ...champ, width: 90 }} /></label>
        <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>Horizon (jours)<input inputMode="numeric" value={p.horizonJours} onChange={(e) => maj({ horizonJours: nombre(e.target.value) })} style={{ ...champ, width: 90 }} /></label>
      </div>
      <div style={{ ...carte, display: "grid", gap: 10 }}>
        <strong style={{ fontSize: 14 }}>Plages horaires (heure du Maroc)</strong>
        {JOURS.map((j) => (
          <div key={j} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ width: 90, textTransform: "capitalize", fontSize: 13, fontWeight: 600 }}>{j}</span>
            {(p.plages[j] || []).map((pl, i) => (
              <span key={i} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="time" value={pl[0]} onChange={(e) => majPlage(j, i, 0, e.target.value)} style={champ} />–
                <input type="time" value={pl[1]} onChange={(e) => majPlage(j, i, 1, e.target.value)} style={champ} />
                <button onClick={() => maj({ plages: { ...p.plages, [j]: (p.plages[j] || []).filter((_, n) => n !== i) } })} style={btn("#b91c1c")} aria-label="Retirer la plage">×</button>
              </span>
            ))}
            {!(p.plages[j] || []).length && <span style={{ fontSize: 12, color: CC.color.inkMid }}>fermé</span>}
            <button onClick={() => maj({ plages: { ...p.plages, [j]: [...(p.plages[j] || []), ["10:00", "12:00"]] } })} style={btn(CC.color.navy)}>+ plage</button>
          </div>
        ))}
      </div>
      <div style={{ ...carte, display: "grid", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Fermetures (jours sans rendez-vous : congés, jours fériés…)</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={nouvelleFermeture} onChange={(e) => setNouvelleFermeture(e.target.value)} style={champ} />
          <button disabled={!nouvelleFermeture} onClick={() => { maj({ fermetures: [...new Set([...p.fermetures, nouvelleFermeture])].sort() }); setNouvelleFermeture(""); }} style={btn(CC.color.navy)}>Ajouter</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {p.fermetures.map((d) => <button key={d} onClick={() => maj({ fermetures: p.fermetures.filter((x) => x !== d) })} style={btn(CC.color.inkMid)} title="Retirer">{d} ×</button>)}
          {!p.fermetures.length && <span style={{ fontSize: 12, color: CC.color.inkMid }}>Aucune.</span>}
        </div>
      </div>
      <div><button onClick={() => void enregistrer()} style={btn(CC.color.navy, true)}>Enregistrer les paramètres</button> {msg && <span style={{ fontSize: 13, marginLeft: 8 }}>{msg}</span>}</div>
    </div>
  );
}
