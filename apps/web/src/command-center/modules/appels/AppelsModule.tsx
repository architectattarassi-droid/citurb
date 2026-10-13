/**
 * /cc/appels — appels vidéo sur demande (Pages Functions /api/cc/appels).
 *   - toutes les demandes (supervision) : statut, participants, créneaux ;
 *   - au nom du cabinet : accepter, proposer, décliner, rejoindre un appel
 *     CONFIRMÉ (seulement si le cabinet en est participant) ;
 *   - coordonnées des participants (back-office seulement) et envoi du lien
 *     personnel par WhatsApp (wa.me prérempli, envoyé par vous) ;
 *   - nouvelle demande du cabinet vers un client de dossier, un pro, un
 *     membre de projet ou le client d'un rendez-vous.
 */
import { useState, type CSSProperties } from "react";
import { CC } from "../../theme/tokens";
import { apiAppels, type Contexte, type DemandeVue, type Invite } from "../../../features/appels/api";
import DemanderAppelVideo from "../../../features/appels/DemanderAppelVideo";
import MesAppels from "../../../features/appels/MesAppels";

function Coordonnees({ d }: { d: DemandeVue }) {
  const [msg, setMsg] = useState<string | null>(null);
  const whatsapp = async (pid: string) => {
    setMsg(null);
    const r = await apiAppels.whatsapp(d.id, pid);
    if (!r.ok) { setMsg("Lien WhatsApp indisponible."); return; }
    window.open(r.data.url, "_blank", "noopener,noreferrer");
    if (!r.data.avecNumero) setMsg("Pas de numéro connu : choisissez le contact dans WhatsApp.");
  };
  return (
    <section style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 12, background: CC.color.bgRaised }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: CC.color.navy }}>Coordonnées (back-office seulement)</h3>
      {!d.cabinetParticipe && <p style={{ margin: "0 0 8px", fontSize: 12, color: CC.color.inkMid }}>Le cabinet n'est pas invité à cet appel : supervision seulement, pas d'accès à la salle.</p>}
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {d.participants.filter((p) => p.cle !== "admin:cabinet").map((p) => (
          <li key={p.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
            <span><strong>{p.nom}</strong> · {p.email || "—"} · <span dir="ltr">{p.telephone || "—"}</span>{typeof p.jetonsVisio === "number" && p.jetonsVisio > 0 ? ` · ${p.jetonsVisio} entrée(s) en salle` : ""}</span>
            <button type="button" onClick={() => void whatsapp(p.id)} style={{ minHeight: 36, padding: "6px 10px", borderRadius: 8, border: "1px solid #128C7E", background: "#fff", color: "#075E54", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              Envoyer son lien par WhatsApp
            </button>
          </li>
        ))}
      </ul>
      {msg && <p style={{ margin: "8px 0 0", fontSize: 12, color: CC.color.inkMid }}>{msg}</p>}
    </section>
  );
}

const TYPES: { k: Invite["type"]; libelle: string; aide: string }[] = [
  { k: "client", libelle: "Client d'un dossier", aide: "Identifiant du dossier (liste /cc/dossiers)" },
  { k: "pro", libelle: "Professionnel / fournisseur", aide: "Slug public (ex. menuiserie-atlas)" },
  { k: "rdv", libelle: "Client d'un rendez-vous", aide: "Référence du rendez-vous (rdv_…)" },
  { k: "membre", libelle: "Membre d'un projet", aide: "Identifiant du membre (pm_…)" },
];
const CONTEXTE_PAR_TYPE: Record<string, Contexte> = { client: "dossier", pro: "cercles", rdv: "rdv", membre: "chantier" };

function NouvelleDemande({ onCree }: { onCree: () => void }) {
  const [type, setType] = useState<Invite["type"]>("client");
  const [ident, setIdent] = useState("");
  const [objet, setObjet] = useState("");
  const id = ident.trim();
  const invite: Invite | null = !id ? null : type === "client" ? { type, dossierId: id } : type === "pro" ? { type, slug: id } : type === "rdv" ? { type, id } : type === "membre" ? { type, id } : null;
  const champ: CSSProperties = { minHeight: 40, padding: "6px 10px", borderRadius: 8, border: `1px solid ${CC.color.border}`, fontSize: 13 };
  return (
    <section style={{ border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 12, background: CC.color.bgRaised, display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 15, color: CC.color.navy }}>Nouvelle demande du cabinet</h2>
      <p style={{ margin: 0, fontSize: 12, color: CC.color.inkMid }}>La personne reçoit une demande (e-mail + lien personnel) ; rien ne démarre avant son accord. Les boutons « Demander un appel vidéo » existent aussi sur chaque dossier.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label style={{ fontSize: 12, display: "grid", gap: 4 }}>Avec
          <select style={champ} value={type} onChange={(e) => setType(e.target.value as Invite["type"])}>{TYPES.map((x) => <option key={x.k} value={x.k}>{x.libelle}</option>)}</select>
        </label>
        <label style={{ fontSize: 12, display: "grid", gap: 4, flex: "1 1 200px" }}>{TYPES.find((x) => x.k === type)?.aide}
          <input style={champ} value={ident} onChange={(e) => setIdent(e.target.value)} dir="ltr" />
        </label>
        {type === "membre" && (
          <label style={{ fontSize: 12, display: "grid", gap: 4, flex: "1 1 160px" }}>Projet (prj_…)
            <input style={champ} value={objet} onChange={(e) => setObjet(e.target.value)} dir="ltr" />
          </label>
        )}
        {invite && (type !== "membre" || objet.trim()) && (
          <DemanderAppelVideo porte="admin" contexte={CONTEXTE_PAR_TYPE[type]} objetId={type === "membre" ? objet.trim() : id} invites={[invite]} avecNom={id} langue="fr" variante="navy" onCree={onCree} />
        )}
      </div>
    </section>
  );
}

export default function AppelsModule() {
  const [cle, setCle] = useState(0);
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink, display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Appels vidéo sur demande</h1>
        <p style={{ fontSize: 13, color: CC.color.inkMid, margin: 0 }}>Une demande ne déclenche jamais d'appel : la salle n'existe qu'une fois que toutes les parties ont accepté le même créneau, et n'ouvre que 10 min avant. Heures du Maroc.</p>
      </header>
      <NouvelleDemande onCree={() => setCle((x) => x + 1)} />
      <MesAppels key={cle} espace={{ type: "admin" }} l="fr" titre="Toutes les demandes" extra={(d) => <Coordonnees d={d} />}
        marque={(r) => (r.cabinetParticipe ? null : <span style={{ display: "block", fontSize: 11, color: CC.color.inkMid }}>Entre tiers — supervision</span>)} />
    </div>
  );
}
