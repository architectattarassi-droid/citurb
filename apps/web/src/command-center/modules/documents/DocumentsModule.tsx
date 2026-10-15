/**
 * /cc/documents — modération du dépôt de documents commun (Pages Functions /api/cc/depot).
 * Un document déposé par un client, un pro ou un membre n'est visible des
 * autres participants qu'après vérification ici : un numéro de téléphone
 * écrit DANS une image ou un PDF n'est pas détecté automatiquement.
 */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { CC } from "../../theme/tokens";
import { apiDepot, ouvrirDocument, type DocumentVue } from "../../../features/documents/api";

const btn = (c: string, plein = false): CSSProperties => ({ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: `1px solid ${c}`, background: plein ? c : "#fff", color: plein ? "#fff" : c, fontWeight: 700, fontSize: 12, cursor: "pointer" });
const taille = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export default function DocumentsModule() {
  const [docs, setDocs] = useState<DocumentVue[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifs, setMotifs] = useState<Record<string, string>>({});

  const charger = useCallback(async () => {
    const r = await apiDepot.aModerer();
    if (!r.ok) { setErreur(r.error === "depot_indisponible" ? "Le dépôt de documents n'est pas encore ouvert (SQL Neon à coller : docs/sql/TOUT-NEON.sql)." : `Erreur : ${r.error}`); return; }
    setErreur(null); setDocs(r.data.documents);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const decider = async (id: string, decision: "VISIBLE" | "REFUSE") => {
    const r = await apiDepot.moderer(id, decision, motifs[id]);
    if (!r.ok) setErreur(`Erreur : ${r.error}`);
    await charger();
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink, display: "grid", gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Documents à vérifier</h1>
        <p style={{ fontSize: 13, color: CC.color.inkMid, margin: 0 }}>
          Ouvrez chaque document : s'il contient des coordonnées (numéro, e-mail, QR code, carte de visite…) ou un contenu inapproprié, refusez-le avec un motif.
          Les documents acceptés deviennent visibles des autres participants et sont archivés dans Google Drive quand il est configuré.
        </p>
      </header>
      {erreur && <p style={{ margin: 0, padding: 10, borderRadius: 8, background: "#fef2f2", color: "#991b1b", fontSize: 13 }} role="alert">{erreur}</p>}
      {docs && !docs.length && <p style={{ margin: 0, fontSize: 13, color: CC.color.inkMid }}>Rien à vérifier pour l'instant.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {(docs || []).map((d) => (
          <li key={d.id} style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 12, background: CC.color.bgRaised, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
              <span><strong>{d.nom}</strong> <span style={{ fontSize: 12, color: CC.color.inkMid }}>v{d.version} · {taille(d.taille)} · {d.type}</span></span>
              <span style={{ fontSize: 12, color: CC.color.inkMid }}>{d.contexte} · {d.objetId} · par {d.deposant} · {new Date(d.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            {(d.meta.phase || d.meta.categorie || d.meta.legende) && <span style={{ fontSize: 12 }}>{[d.meta.phase, d.meta.categorie, d.meta.niveau, d.meta.version].filter(Boolean).join(" · ")}{d.meta.legende ? ` — ${d.meta.legende}` : ""}</span>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button type="button" style={btn(CC.color.navy)} onClick={() => void ouvrirDocument({ type: "admin" }, d.id)}>Ouvrir</button>
              <button type="button" style={btn("#047857", true)} onClick={() => void decider(d.id, "VISIBLE")}>Accepter</button>
              <input style={{ minHeight: 36, flex: "1 1 200px", padding: "6px 10px", borderRadius: 8, border: `1px solid ${CC.color.border}`, fontSize: 13 }} placeholder="Motif du refus (montré au déposant)"
                value={motifs[d.id] ?? ""} onChange={(e) => setMotifs((m) => ({ ...m, [d.id]: e.target.value }))} />
              <button type="button" style={btn("#b91c1c")} onClick={() => void decider(d.id, "REFUSE")}>Refuser</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
