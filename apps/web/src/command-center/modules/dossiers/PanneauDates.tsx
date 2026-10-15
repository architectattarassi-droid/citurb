/**
 * Dates clés et échéances d'un dossier (lot GP4) — fiche /cc/dossiers/:id.
 * Les échéances (péremption du permis, assurances, cautions, parfait achèvement,
 * décennale) se calculent depuis ces dates ; les rappels J−90 / J−30 / J−7 partent
 * par e-mail à l'administration (tableau de bord /cc/dashboard).
 */
import React, { useEffect, useState } from "react";
import { CC } from "../../theme/tokens";

export type Dates = {
  debutFondations?: string; ouvertureChantier?: string; receptionProvisoire?: string; receptionDefinitive?: string;
  assurances?: { libelle: string; fin: string }[]; cautions?: { libelle: string; fin: string }[]; autres?: { libelle: string; date: string }[];
};
export type Echeance = { cle: string; libelle: string; date: string; joursRestants: number; niveau: "DEPASSEE" | "J7" | "J30" | "J90" | null; action: string; base: string };

const dateFr = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const COULEUR_NIVEAU: Record<string, { fond: string; texte: string; lib: string }> = {
  DEPASSEE: { fond: "#FDECEC", texte: "#B42318", lib: "Dépassée" }, J7: { fond: "#FDECEC", texte: "#B42318", lib: "J−7" },
  J30: { fond: "#FFF6E0", texte: "#93370D", lib: "J−30" }, J90: { fond: "#EEF4FF", texte: "#1F3864", lib: "J−90" }, null: { fond: "#F2F4F7", texte: "#475467", lib: "Plus tard" },
};

type Liste = "assurances" | "cautions" | "autres";

export default function PanneauDates({ dates, echeances, occupe, agir }: { dates: Dates; echeances: Echeance[]; occupe: boolean; agir: (c: Record<string, unknown>, m: string) => Promise<void> }) {
  const [d, setD] = useState<Dates>(dates);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => setD(dates), [dates]);
  const champ = (k: "debutFondations" | "ouvertureChantier" | "receptionProvisoire" | "receptionDefinitive", l: string) => (
    <label style={S.champ}>{l}<input type="date" style={S.input} value={d[k] ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value || undefined })} /></label>
  );
  const liste = (k: Liste, titre: string, cleDate: "fin" | "date") => {
    const l = (d[k] ?? []) as Array<Record<string, string>>;
    const maj = (n: Array<Record<string, string>>) => setD({ ...d, [k]: n });
    return (
      <div>
        <div style={S.sousTitre}>{titre}</div>
        {l.map((x, i) => (
          <div key={i} style={S.ligne}>
            <input style={{ ...S.input, flex: "1 1 200px" }} placeholder="Libellé (ex. TRC — police n°…, caution de bonne fin)" value={x.libelle} onChange={(e) => maj(l.map((y, j) => (j === i ? { ...y, libelle: e.target.value } : y)))} />
            <input type="date" style={S.input} value={x[cleDate] ?? ""} onChange={(e) => maj(l.map((y, j) => (j === i ? { ...y, [cleDate]: e.target.value } : y)))} />
            <button style={S.lienBtn} onClick={() => maj(l.filter((_, j) => j !== i))}>Retirer</button>
          </div>
        ))}
        <button style={S.lienBtn} onClick={() => maj([...l, { libelle: "", [cleDate]: "" }])}>+ Ajouter</button>
      </div>
    );
  };

  return (
    <section style={S.carte}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 style={S.h2}>Échéances du dossier</h2>
        <button style={S.lienBtn} onClick={() => setOuvert(!ouvert)}>{ouvert ? "Fermer" : "Saisir les dates clés"}</button>
      </div>
      {echeances.length === 0 ? <p style={S.petit}>Aucune échéance : renseigner la date du permis (création du dossier), les assurances, les cautions et la réception.</p> : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {echeances.map((e) => {
            const c = COULEUR_NIVEAU[String(e.niveau)];
            return (
              <li key={e.cle} style={{ padding: "6px 0", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 13.5 }}>
                <span style={{ ...S.badge, background: c.fond, color: c.texte }}>{c.lib}</span>{" "}
                <b>{e.libelle}</b> — {dateFr(e.date)} ({e.joursRestants < 0 ? `dépassée de ${-e.joursRestants} j` : `dans ${e.joursRestants} j`})
                <div style={S.petit}>{e.action} <i>({e.base})</i></div>
              </li>
            );
          })}
        </ul>
      )}
      {ouvert && (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div style={S.ligne}>
            {champ("debutFondations", "Début réel des fondations")}
            {champ("ouvertureChantier", "Ouverture du chantier")}
            {champ("receptionProvisoire", "Réception provisoire")}
            {champ("receptionDefinitive", "Réception définitive")}
          </div>
          {liste("assurances", "Assurances (TRC, décennale, RC…) — date de fin", "fin")}
          {liste("cautions", "Cautions (avance, bonne exécution, retenue) — date de fin", "fin")}
          {liste("autres", "Autres échéances", "date")}
          <div><button style={S.btn} disabled={occupe} onClick={() => void agir({ action: "dates", dates: d }, "Dates enregistrées.")}>Enregistrer les dates</button></div>
        </div>
      )}
    </section>
  );
}

const S = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, margin: "12px 0" } as React.CSSProperties,
  h2: { fontSize: 15, color: CC.color.navy, margin: "0 0 6px" } as React.CSSProperties,
  sousTitre: { fontSize: 12.5, fontWeight: 700, color: CC.color.ink, margin: "4px 0" } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.6 } as React.CSSProperties,
  badge: { fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 } as React.CSSProperties,
  lienBtn: { background: "none", border: "none", color: CC.color.info, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" } as React.CSSProperties,
  ligne: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 4 } as React.CSSProperties,
  champ: { display: "grid", gap: 3, fontSize: 12.5, color: CC.color.inkMid } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34 } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
};
