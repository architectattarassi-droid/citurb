/**
 * /cc/terrains — modération des annonces de terrains (porte P4).
 * Lit /api/cc/terrains (Pages Function, session back-office) : coordonnées du
 * déposant visibles ici seulement. Publier / refuser / marquer vendu.
 */
import React, { useCallback, useEffect, useState } from "react";
import { CC } from "../../theme/tokens";

type Annonce = {
  id: string; slug: string; statut: string; deposant: string; mandat: boolean; nom: string; telephone: string; email: string | null;
  ville: string; quartier: string | null; surface: number; prix: number | null; titre: string; usage: string; description: string | null;
  noteAdmin: string | null; createdAt: string; publieAt: string | null; leadId: string | null;
};

const STATUTS: Record<string, { libelle: string; couleur: string }> = {
  EN_ATTENTE: { libelle: "À valider", couleur: "#b45309" },
  PUBLIE: { libelle: "Publiée", couleur: "#047857" },
  REFUSE: { libelle: "Refusée", couleur: "#b91c1c" },
  VENDU: { libelle: "Vendue", couleur: "#475569" },
};
const dh = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DH`;

export default function TerrainsModule() {
  const [donnees, setDonnees] = useState<{ table: boolean; annonces: Annonce[] } | null>(null);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("EN_ATTENTE");

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const r = await fetch("/api/cc/terrains", { credentials: "include", cache: "no-store" });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) throw new Error(`HTTP ${r.status}`);
      setDonnees(await r.json());
    } catch (e) {
      setErreur(`Lecture impossible (${(e as Error).message}). En local, cette page ne fonctionne qu'avec les Pages Functions.`);
    }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const changer = async (id: string, statut: string) => {
    const noteAdmin = statut === "REFUSE" ? window.prompt("Motif du refus (interne, facultatif)") ?? undefined : undefined;
    const r = await fetch("/api/cc/terrains", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, statut, noteAdmin }) });
    if (!r.ok) { alert(`Échec (${r.status})`); return; }
    void charger();
  };

  const liste = (donnees?.annonces ?? []).filter((a) => !filtre || a.statut === filtre);
  const compte = (s: string) => (donnees?.annonces ?? []).filter((a) => a.statut === s).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink }}>
      <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Annonces de terrains</h1>
      <p style={{ fontSize: 13, color: CC.color.inkMid, margin: "0 0 16px" }}>Déposées depuis /p4/terrains/deposer. Une annonce n'est visible du public qu'une fois publiée ; les coordonnées du déposant ne le sont jamais.</p>
      {donnees && !donnees.table && <p style={{ background: "#fff7ed", border: "1px solid #fdba74", padding: 12, borderRadius: 8, fontSize: 13 }}>La table TerrainAnnonce n'existe pas encore dans Neon : exécutez docs/sql/terrains-neon.sql dans la console SQL.</p>}
      {erreur && <p style={{ color: "#b91c1c", fontSize: 13 }}>{erreur}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[["EN_ATTENTE", "À valider"], ["PUBLIE", "Publiées"], ["VENDU", "Vendues"], ["REFUSE", "Refusées"], ["", "Toutes"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${CC.color.border}`, background: filtre === k ? CC.color.navy : CC.color.bgRaised, color: filtre === k ? CC.color.inkOnDark : CC.color.inkMid, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {l}{k ? ` (${compte(k)})` : ""}
          </button>
        ))}
      </div>
      {donnees && liste.length === 0 && <p style={{ fontSize: 13, color: CC.color.inkMid }}>Aucune annonce.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {liste.map((a) => (
          <div key={a.id} style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, background: CC.color.bgRaised }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.surface.toLocaleString("fr-FR")} m² · {a.quartier ? `${a.quartier}, ` : ""}{a.ville} · {a.prix ? dh(a.prix) : "prix sur demande"}</div>
                <div style={{ fontSize: 12, color: CC.color.inkMid }}>{a.usage} · {a.titre} · déposée le {new Date(a.createdAt).toLocaleDateString("fr-FR")} par {a.deposant === "INTERMEDIAIRE" ? `un intermédiaire${a.mandat ? " (mandat déclaré)" : ""}` : "le propriétaire"}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}><b>{a.nom}</b> · <a href={`tel:${a.telephone}`}>{a.telephone}</a>{a.email ? ` · ${a.email}` : ""}</div>
                {a.description && <p style={{ fontSize: 13, margin: "6px 0 0", whiteSpace: "pre-line" }}>{a.description}</p>}
                {a.noteAdmin && <p style={{ fontSize: 12, margin: "6px 0 0", color: CC.color.inkMid }}>Note : {a.noteAdmin}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUTS[a.statut]?.couleur }}>{STATUTS[a.statut]?.libelle ?? a.statut}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {a.statut !== "PUBLIE" && <button onClick={() => changer(a.id, "PUBLIE")} style={btn("#047857")}>Publier</button>}
                  {a.statut !== "REFUSE" && <button onClick={() => changer(a.id, "REFUSE")} style={btn("#b91c1c")}>Refuser</button>}
                  {a.statut === "PUBLIE" && <button onClick={() => changer(a.id, "VENDU")} style={btn("#475569")}>Vendu</button>}
                  {a.statut === "PUBLIE" && <a href={`https://citurbarea.com/p4/terrains/${a.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, alignSelf: "center" }}>Voir ↗</a>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btn = (c: string): React.CSSProperties => ({ padding: "8px 12px", minHeight: 40, borderRadius: 8, border: `1px solid ${c}`, background: "transparent", color: c, fontWeight: 700, fontSize: 13, cursor: "pointer" });
