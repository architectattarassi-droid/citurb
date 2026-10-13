/**
 * /cc/messages — messagerie de la plateforme (Pages Functions /api/cc/messages).
 *   - tous les fils (modération) : signalés, fermés ; non lus côté cabinet ;
 *   - répondre au nom du cabinet quand il participe ; demander un appel vidéo ;
 *   - modération : coordonnées des participants (back-office seulement),
 *     retirer / rétablir un message, fermer / rouvrir un fil, signalements ;
 *   - écrire à un client de dossier, un pro ou le client d'un rendez-vous.
 */
import { useState, type CSSProperties } from "react";
import { CC } from "../../theme/tokens";
import type { Contexte, Invite } from "../../../features/appels/api";
import { apiMessages, type FilVue } from "../../../features/messages/api";
import BoiteMessages from "../../../features/messages/BoiteMessages";
import EcrireMessage from "../../../features/messages/EcrireMessage";

function Moderation({ f, recharger }: { f: FilVue; recharger: () => void }) {
  const c = f.conversation;
  const fermer = async (statut: "OUVERTE" | "FERMEE") => { await apiMessages.moderer(c.id, { statut }); recharger(); };
  return (
    <section style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 12, background: CC.color.bgRaised, display: "grid", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14, color: CC.color.navy }}>Modération (back-office seulement)</h3>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 13 }}>
        {c.participants.map((p) => <li key={p.id}><strong>{p.nom}</strong> · {p.email || "—"} · <span dir="ltr">{p.telephone || "—"}</span></li>)}
      </ul>
      {!!c.signalements?.length && (
        <div style={{ fontSize: 13, color: "#9f1239" }}>
          <strong>Signalements :</strong>
          <ul style={{ margin: "4px 0 0", paddingInlineStart: 18 }}>{c.signalements.map((s, i) => <li key={i}>{new Date(s.le).toLocaleString("fr-FR")} — {c.participants.find((p) => p.id === s.par)?.nom ?? "?"} : {s.motif}</li>)}</ul>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {c.statut === "FERMEE"
          ? <button type="button" onClick={() => void fermer("OUVERTE")} style={btn}>Rouvrir le fil</button>
          : <button type="button" onClick={() => void fermer("FERMEE")} style={{ ...btn, borderColor: "#b91c1c", color: "#b91c1c" }}>Fermer le fil</button>}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: CC.color.inkMid }}>Chaque message peut être retiré (le texte reste conservé, il n'est plus affiché aux participants).</p>
    </section>
  );
}
const btn: CSSProperties = { minHeight: 36, padding: "6px 12px", borderRadius: 8, border: `1px solid ${CC.color.navy}`, background: "#fff", color: CC.color.navy, fontWeight: 700, fontSize: 12, cursor: "pointer" };

const TYPES: { k: Invite["type"]; libelle: string; aide: string; contexte: Contexte }[] = [
  { k: "client", libelle: "Client d'un dossier", aide: "Identifiant du dossier", contexte: "dossier" },
  { k: "pro", libelle: "Professionnel / fournisseur", aide: "Slug public (ex. menuiserie-atlas)", contexte: "cercles" },
  { k: "rdv", libelle: "Client d'un rendez-vous", aide: "Référence du rendez-vous (rdv_…)", contexte: "rdv" },
];

export default function MessagesModule() {
  const [cle, setCle] = useState(0);
  const [type, setType] = useState<Invite["type"]>("client");
  const [ident, setIdent] = useState("");
  const id = ident.trim();
  const def = TYPES.find((x) => x.k === type)!;
  const invite: Invite | null = !id ? null : type === "client" ? { type, dossierId: id } : type === "pro" ? { type, slug: id } : { type: "rdv", id };
  const champ: CSSProperties = { minHeight: 40, padding: "6px 10px", borderRadius: 8, border: `1px solid ${CC.color.border}`, fontSize: 13 };
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink, display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Messages</h1>
        <p style={{ fontSize: 13, color: CC.color.inkMid, margin: 0 }}>Tous les échanges entre clients, pros et le cabinet passent ici : coordonnées masquées automatiquement, aucune transmise. La lecture par le back-office sert à la modération (mention CGU).</p>
      </header>
      <section style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 12, background: CC.color.bgRaised, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label style={{ fontSize: 12, display: "grid", gap: 4 }}>Écrire à
          <select style={champ} value={type} onChange={(e) => setType(e.target.value as Invite["type"])}>{TYPES.map((x) => <option key={x.k} value={x.k}>{x.libelle}</option>)}</select>
        </label>
        <label style={{ fontSize: 12, display: "grid", gap: 4, flex: "1 1 200px" }}>{def.aide}<input style={champ} value={ident} onChange={(e) => setIdent(e.target.value)} dir="ltr" /></label>
        {invite && <EcrireMessage porte="admin" contexte={def.contexte} objetId={id} invites={[invite]} avecNom={id} langue="fr" variante="navy" onCree={() => setCle((x) => x + 1)} />}
      </section>
      <BoiteMessages key={cle} source={{ type: "admin" }} l="fr" titre="Toutes les conversations" filtres extra={(f, r) => <Moderation f={f} recharger={r} />} />
    </div>
  );
}
