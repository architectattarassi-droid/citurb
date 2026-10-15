/**
 * /cc/dossiers/nouveau — création d'un dossier par l'admin.
 *
 * Client existant d'ARC-BATI ou d'un autre cabinet, dossier neuf ou déjà
 * avancé à n'importe quelle phase (phases antérieures « faites hors
 * plateforme », sans blocage), missions déjà réglées (jamais refacturées),
 * dédoublonnage avec les comptes et leads existants, lien d'invitation signé.
 * Serveur : POST /api/cc/dossiers, GET /api/cc/cabinets, GET /api/cc/dossiers/doublons
 * (functions/_lib/dossierAdmin.ts). Contrat : docs/architecture/contrat-devis-facturation.md.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CC } from "../../../theme/tokens";

type Phase = { code: string; titre: string; famille: string; ordre: number; conditionnelle: boolean };
type Cabinet = { id: string; nom: string; architecte: string | null; mentionsManquantes: string[] };
type Prestation = { code: string; libelle: string; famille: string };
type Doublons = {
  comptes: Array<{ id: string; nom: string | null; email: string | null; telephone: string | null; nbDossiers: number }>;
  leads: Array<{ id: string; nom: string | null; telephone: string | null; email: string | null; ville: string | null; createdAt: string | null; dossierId: string | null }>;
  dossiers: Array<{ id: string; titre: string; clientNom: string | null; commune: string | null; phase: string | null }>;
};
type Etape = { statut: "FAITE_HORS_PLATEFORME" | "SANS_OBJET"; date: string; note: string };
type Mission = { code: string; libelle: string; montant: string; date: string };
type Resultat = { dossierId: string; compteCree: boolean; lienInvitation: string | null; avertissements: string[] };

const TYPOLOGIES: Array<[string, string]> = [
  ["", "—"], ["MAISON_INDIVIDUELLE", "Maison individuelle"], ["VILLA", "Villa"], ["IMMEUBLE", "Immeuble"],
  ["LOCAL_COMMERCIAL", "Local commercial"], ["AMENAGEMENT_INTERIEUR", "Aménagement intérieur"],
];
const FAMILLES: Record<string, string> = {
  CADRAGE: "Cadrage", CONCEPTION: "Conception", AUTORISATION: "Autorisation", EXECUTION_ETUDES: "Études d'exécution",
  CPS_MARCHES: "Marchés", CHANTIER_GO: "Chantier gros œuvre", CHANTIER_SECOND_OEUVRE: "Second œuvre", RECEPTION: "Réception",
};
const ERREURS: Record<string, string> = {
  sql_a_coller: "Le SQL docs/sql/devis-facturation-neon.sql n'est pas encore collé dans Neon (il est inclus dans docs/sql/TOUT-NEON.sql). La création reprendra dès qu'il le sera.",
  storage_unavailable: "Base indisponible pour le moment.",
  cabinet_inconnu: "Cabinet inconnu ou inactif.",
  client_inconnu: "Compte client introuvable.",
  email_existant: "Un compte existe déjà avec cet e-mail : rattachez-le ci-dessous (doublons).",
  unauthenticated: "Session admin expirée : reconnectez-vous.",
};

const vide = { telephone: "", email: "" };
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const jours = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${aujourdhui()}T00:00:00Z`)) / 86_400_000);

export default function NouveauDossierAdmin() {
  const nav = useNavigate();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [sqlAColler, setSqlAColler] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [cabinetId, setCabinetId] = useState("cab_arc_bati");
  const [client, setClient] = useState({
    type: "PERSONNE", civilite: "M.", prenom: "", nom: "", raisonSociale: "", representant: "",
    ice: "", identifiantFiscal: "", rc: "", telephone: "", email: "", adresse: "", ville: "",
  });
  const [projet, setProjet] = useState({
    intitule: "", typologie: "", gabarit: "", lot: "", lotissement: "", commune: "", prefecture: "", titreFoncier: "",
    autorisationNum: "", autorisationDate: "", autorisationExpiration: "", etatChantier: "",
  });
  const [phaseActuelle, setPhaseActuelle] = useState("00_BRIEF");
  const [etapes, setEtapes] = useState<Record<string, Etape>>({});
  const [voirConditionnelles, setVoirConditionnelles] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [inviter, setInviter] = useState(true);
  const [test, setTest] = useState(false);

  const [doublons, setDoublons] = useState<Doublons | null>(null);
  const [cherche, setCherche] = useState(vide);
  const [clientExistantId, setClientExistantId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/cc/cabinets", { credentials: "include", cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(ERREURS[j.error] || `Erreur ${r.status}`);
        setPhases(j.phases || []); setCabinets(j.cabinets || []); setPrestations(j.prestations || []); setSqlAColler(!!j.sqlAColler);
      } catch (e) { setErreurChargement((e as Error).message); }
    })();
  }, []);

  // Dédoublonnage : à la sortie des champs téléphone / e-mail.
  const verifierDoublons = async () => {
    const q = { telephone: client.telephone.trim(), email: client.email.trim() };
    if ((!q.telephone && !q.email) || (q.telephone === cherche.telephone && q.email === cherche.email)) return;
    setCherche(q);
    const p = new URLSearchParams();
    if (q.telephone) p.set("telephone", q.telephone);
    if (q.email) p.set("email", q.email);
    const r = await fetch(`/api/cc/dossiers/doublons?${p}`, { credentials: "include", cache: "no-store" }).catch(() => null);
    const j = r?.ok ? await r.json() : null;
    setDoublons(j && (j.comptes.length || j.leads.length || j.dossiers.length) ? j : null);
  };

  const ordreActuel = phases.find((p) => p.code === phaseActuelle)?.ordre ?? 0;
  const anterieures = useMemo(() => phases.filter((p) => p.ordre < ordreActuel), [phases, ordreActuel]);
  const etapeDe = (p: Phase): Etape => etapes[p.code] ?? { statut: p.conditionnelle ? "SANS_OBJET" : "FAITE_HORS_PLATEFORME", date: "", note: "" };
  const majEtape = (p: Phase, m: Partial<Etape>) => setEtapes((e) => ({ ...e, [p.code]: { ...etapeDe(p), ...m } }));

  const alerteAut = projet.autorisationExpiration && /^\d{4}-\d{2}-\d{2}$/.test(projet.autorisationExpiration) ? jours(projet.autorisationExpiration) : null;
  const cabinet = cabinets.find((c) => c.id === cabinetId);

  const envoyer = async () => {
    setEnvoi(true); setErreurs([]);
    try {
      const corps = {
        cabinetId, client, projet, phaseActuelle, clientExistantId, leadId, inviter, test,
        etapes: anterieures.map((p) => ({ phaseCode: p.code, ...etapeDe(p) })),
        missionsReglees: missions.filter((m) => m.libelle.trim() || m.code !== "AUTRE"),
      };
      const r = await fetch("/api/cc/dossiers", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErreurs(j.erreurs || [ERREURS[j.error] || j.message || `Erreur ${r.status}`]); return; }
      setResultat(j);
      window.scrollTo({ top: 0 });
    } catch { setErreurs(["Réseau indisponible."]); } finally { setEnvoi(false); }
  };

  if (resultat) {
    return (
      <div style={S.page}>
        <h1 style={S.titre}>Dossier créé</h1>
        <div style={S.ok}>Dossier <code>{resultat.dossierId}</code> créé{resultat.compteCree ? " avec un nouveau compte client (sans mot de passe, activé par le lien)" : ", rattaché au compte existant"}.</div>
        {resultat.avertissements.map((a) => <div key={a} style={S.avert}>{a}</div>)}
        {resultat.lienInvitation && (
          <div style={S.carte}>
            <div style={S.h2}>Invitation du client (lien personnel, 90 jours)</div>
            <p style={S.aide}>À transmettre au client par le cabinet. Le lien donne accès à son dossier en lecture, sans aucune coordonnée de tiers.</p>
            <input readOnly value={resultat.lienInvitation} style={{ ...S.input, width: "100%" }} onFocus={(e) => e.currentTarget.select()} />
            <button style={{ ...S.btn, marginTop: 8 }} onClick={() => void navigator.clipboard?.writeText(resultat.lienInvitation as string)}>Copier le lien</button>
          </div>
        )}
        <div style={S.carte}>
          <div style={S.h2}>Documents existants</div>
          <p style={S.aide}>L'import des pièces (autorisation, plans, PV) passe par le dépôt de fichiers commun ; il s'ajoutera à la fiche du dossier à l'étape suivante.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={S.btn} onClick={() => nav("/cc/dossiers")}>Voir la liste des dossiers</button>
          <button style={S.btnGhost} onClick={() => window.location.reload()}>Créer un autre dossier</button>
        </div>
      </div>
    );
  }

  const champ = (label: string, valeur: string, maj: (v: string) => void, opts: { type?: string; placeholder?: string; onBlur?: () => void; large?: boolean } = {}) => (
    <label style={{ ...S.champ, ...(opts.large ? { gridColumn: "1 / -1" } : {}) }}>
      <span style={S.label}>{label}</span>
      <input type={opts.type || "text"} value={valeur} placeholder={opts.placeholder} onChange={(e) => maj(e.target.value)} onBlur={opts.onBlur} style={S.input} />
    </label>
  );
  const c = (k: keyof typeof client) => (v: string) => setClient((x) => ({ ...x, [k]: v }));
  const p = (k: keyof typeof projet) => (v: string) => setProjet((x) => ({ ...x, [k]: v }));

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 8 }}><Link to="/cc/dossiers" style={S.lien}>← Dossiers</Link></div>
      <h1 style={S.titre}>Nouveau dossier</h1>
      <p style={S.sous}>Client existant du cabinet, projet neuf ou déjà avancé. Rien n'est bloqué : les étapes antérieures sont marquées « faites hors plateforme ».</p>
      {erreurChargement && <div style={S.erreur}>{erreurChargement}</div>}
      {sqlAColler && <div style={S.avert}>{ERREURS.sql_a_coller}</div>}

      {/* 1. Cabinet */}
      <section style={S.carte}>
        <div style={S.h2}>1. Cabinet</div>
        <select value={cabinetId} onChange={(e) => setCabinetId(e.target.value)} style={S.input}>
          {cabinets.map((x) => <option key={x.id} value={x.id}>{x.nom}{x.architecte ? ` — ${x.architecte}` : ""}</option>)}
        </select>
        {cabinet && cabinet.mentionsManquantes.length > 0 && (
          <p style={S.aide}>Mentions légales à compléter pour facturer : {cabinet.mentionsManquantes.join(", ")}.</p>
        )}
        <AjoutCabinet onAjout={(x) => { setCabinets((l) => [...l, x]); setCabinetId(x.id); }} />
      </section>

      {/* 2. Client */}
      <section style={S.carte}>
        <div style={S.h2}>2. Client (maître d'ouvrage)</div>
        <div style={S.choix}>
          {(["PERSONNE", "SOCIETE"] as const).map((t) => (
            <label key={t} style={S.radio}><input type="radio" checked={client.type === t} onChange={() => setClient((x) => ({ ...x, type: t }))} /> {t === "PERSONNE" ? "Personne" : "Société"}</label>
          ))}
        </div>
        <div style={S.grille}>
          {client.type === "PERSONNE" ? (
            <>
              <label style={S.champ}><span style={S.label}>Civilité</span>
                <select value={client.civilite} onChange={(e) => c("civilite")(e.target.value)} style={S.input}><option>M.</option><option>Mme</option></select>
              </label>
              {champ("Prénom", client.prenom, c("prenom"))}
              {champ("Nom *", client.nom, c("nom"))}
            </>
          ) : (
            <>
              {champ("Raison sociale *", client.raisonSociale, c("raisonSociale"))}
              {champ("Représentant", client.representant, c("representant"))}
              {champ("ICE (15 chiffres)", client.ice, c("ice"))}
              {champ("Identifiant fiscal (IF)", client.identifiantFiscal, c("identifiantFiscal"))}
              {champ("RC", client.rc, c("rc"))}
            </>
          )}
          {champ("Téléphone", client.telephone, c("telephone"), { onBlur: () => void verifierDoublons(), placeholder: "06…" })}
          {champ("E-mail", client.email, c("email"), { type: "email", onBlur: () => void verifierDoublons() })}
          {champ("Adresse", client.adresse, c("adresse"))}
          {champ("Ville", client.ville, c("ville"))}
        </div>
        <p style={S.aide}>Coordonnées réservées au back-office : jamais montrées aux prestataires ni aux fournisseurs.</p>
        {doublons && (
          <div style={S.doublons}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Déjà connu de CITURBAREA</div>
            {doublons.comptes.map((x) => (
              <div key={x.id} style={S.ligneDoublon}>
                <span>Compte client : {x.nom || "—"} · {x.telephone || ""} {x.email || ""} · {x.nbDossiers} dossier(s)</span>
                <button style={clientExistantId === x.id ? S.btn : S.btnGhost} onClick={() => setClientExistantId(clientExistantId === x.id ? null : x.id)}>
                  {clientExistantId === x.id ? "Rattaché ✓" : "Rattacher ce compte"}
                </button>
              </div>
            ))}
            {doublons.leads.map((x) => (
              <div key={x.id} style={S.ligneDoublon}>
                <span>Lead : {x.nom || "—"} · {x.ville || ""} · {x.createdAt ? new Date(x.createdAt).toLocaleDateString("fr-FR") : ""}{x.dossierId ? " · déjà converti" : ""}</span>
                <button style={leadId === x.id ? S.btn : S.btnGhost} onClick={() => setLeadId(leadId === x.id ? null : x.id)}>{leadId === x.id ? "Rattaché ✓" : "Rattacher ce lead"}</button>
              </div>
            ))}
            {doublons.dossiers.map((x) => <div key={x.id} style={S.ligneDoublon}><span>Dossier existant : {x.titre} · {x.commune || ""} · {x.phase || ""}</span></div>)}
            {!clientExistantId && <p style={S.aide}>Sans rattachement, un nouveau compte client sera créé.</p>}
          </div>
        )}
      </section>

      {/* 3. Projet */}
      <section style={S.carte}>
        <div style={S.h2}>3. Projet</div>
        <div style={S.grille}>
          {champ("Intitulé *", projet.intitule, p("intitule"), { placeholder: "Construction d'un immeuble R+1", large: true })}
          <label style={S.champ}><span style={S.label}>Typologie</span>
            <select value={projet.typologie} onChange={(e) => p("typologie")(e.target.value)} style={S.input}>{TYPOLOGIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          {champ("Gabarit", projet.gabarit, p("gabarit"), { placeholder: "R+2, R+3+SS" })}
          {champ("Lot", projet.lot, p("lot"), { placeholder: "Lot n° 624" })}
          {champ("Lotissement", projet.lotissement, p("lotissement"))}
          {champ("Commune *", projet.commune, p("commune"), { placeholder: "Commune d'instruction" })}
          {champ("Préfecture / province", projet.prefecture, p("prefecture"))}
          {champ("Titre foncier", projet.titreFoncier, p("titreFoncier"), { placeholder: "TF 84848/13" })}
          {champ("Autorisation n°", projet.autorisationNum, p("autorisationNum"))}
          {champ("Date d'autorisation", projet.autorisationDate, p("autorisationDate"), { type: "date" })}
          {champ("Expiration de l'autorisation", projet.autorisationExpiration, p("autorisationExpiration"), { type: "date" })}
        </div>
        {alerteAut !== null && alerteAut <= 90 && (
          <div style={S.avert}>
            {alerteAut < 0 ? `Autorisation expirée depuis ${-alerteAut} jour(s)` : `Autorisation expirant dans ${alerteAut} jour(s)`} : le client sera alerté et un devis de renouvellement (« Dépôt et obtention d'une nouvelle décision ») sera proposé.
          </div>
        )}
        <label style={{ ...S.champ, marginTop: 10 }}><span style={S.label}>État du chantier (contexte, jamais facturé)</span>
          <textarea value={projet.etatChantier} onChange={(e) => p("etatChantier")(e.target.value)} rows={2} style={{ ...S.input, resize: "vertical" }} placeholder="Permis d'habiter partiel délivré pour le rez-de-chaussée" />
        </label>
      </section>

      {/* 4. Avancement */}
      <section style={S.carte}>
        <div style={S.h2}>4. Avancement</div>
        <label style={S.champ}><span style={S.label}>Phase actuelle</span>
          <select value={phaseActuelle} onChange={(e) => setPhaseActuelle(e.target.value)} style={S.input}>
            {Object.entries(FAMILLES).map(([f, l]) => (
              <optgroup key={f} label={l}>{phases.filter((x) => x.famille === f).map((x) => <option key={x.code} value={x.code}>{x.titre}</option>)}</optgroup>
            ))}
          </select>
        </label>
        {anterieures.length > 0 && (
          <>
            <p style={S.aide}>{anterieures.length} phase(s) antérieure(s) : « faite hors plateforme » par défaut (date et note facultatives), ou « sans objet ».</p>
            <label style={S.radio}><input type="checkbox" checked={voirConditionnelles} onChange={(e) => setVoirConditionnelles(e.target.checked)} /> Afficher aussi les phases particulières (lotissement, financement…)</label>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {anterieures.filter((x) => voirConditionnelles || !x.conditionnelle).map((x) => {
                const e = etapeDe(x);
                return (
                  <div key={x.code} style={S.etape}>
                    <span style={{ flex: "1 1 220px", fontSize: 13 }}>{x.titre}</span>
                    <select value={e.statut} onChange={(ev) => majEtape(x, { statut: ev.target.value as Etape["statut"] })} style={{ ...S.input, minWidth: 0 }}>
                      <option value="FAITE_HORS_PLATEFORME">Faite hors plateforme</option>
                      <option value="SANS_OBJET">Sans objet</option>
                    </select>
                    {e.statut === "FAITE_HORS_PLATEFORME" && <>
                      <input type="date" value={e.date} onChange={(ev) => majEtape(x, { date: ev.target.value })} style={{ ...S.input, minWidth: 0 }} />
                      <input placeholder="Note (facultatif)" value={e.note} onChange={(ev) => majEtape(x, { note: ev.target.value })} style={{ ...S.input, minWidth: 0, flex: "1 1 160px" }} />
                    </>}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div style={{ ...S.h2, fontSize: 14, marginTop: 16 }}>Missions déjà réglées par le client</div>
        <p style={S.aide}>Elles figurent en état du chantier et ne reparaîtront jamais en ligne facturable d'un devis (devis complémentaire possible).</p>
        {missions.map((m, i) => (
          <div key={i} style={S.etape}>
            <select value={m.code} onChange={(e) => setMissions((l) => l.map((x, j) => (j === i ? { ...x, code: e.target.value, libelle: x.libelle || (prestations.find((y) => y.code === e.target.value)?.libelle ?? "") } : x)))} style={{ ...S.input, minWidth: 0 }}>
              {prestations.map((y) => <option key={y.code} value={y.code}>{y.libelle}</option>)}
              <option value="AUTRE">Autre mission</option>
            </select>
            <input placeholder="Libellé" value={m.libelle} onChange={(e) => setMissions((l) => l.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))} style={{ ...S.input, minWidth: 0, flex: "1 1 180px" }} />
            <input placeholder="Montant DH" inputMode="decimal" value={m.montant} onChange={(e) => setMissions((l) => l.map((x, j) => (j === i ? { ...x, montant: e.target.value } : x)))} style={{ ...S.input, minWidth: 0, width: 120 }} />
            <input type="date" value={m.date} onChange={(e) => setMissions((l) => l.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} style={{ ...S.input, minWidth: 0 }} />
            <button style={S.btnGhost} onClick={() => setMissions((l) => l.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
          </div>
        ))}
        <button style={S.btnGhost} onClick={() => setMissions((l) => [...l, { code: "PERMIS_HABITER", libelle: prestations.find((y) => y.code === "PERMIS_HABITER")?.libelle ?? "", montant: "", date: "" }])}>+ Ajouter une mission réglée</button>
      </section>

      {/* 5. Envoi */}
      <section style={S.carte}>
        <label style={S.radio}><input type="checkbox" checked={inviter} onChange={(e) => setInviter(e.target.checked)} /> Générer le lien d'invitation du client à son espace (lien signé, 90 jours)</label>
        <label style={S.radio}><input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} /> Donnée de test (intitulé préfixé « TEST »)</label>
        {erreurs.length > 0 && <div style={S.erreur}>{erreurs.map((e) => <div key={e}>{e}</div>)}</div>}
        <button style={{ ...S.btn, marginTop: 10, opacity: envoi ? 0.6 : 1 }} disabled={envoi} onClick={() => void envoyer()}>{envoi ? "Création…" : "Créer le dossier"}</button>
      </section>
    </div>
  );
}

function AjoutCabinet({ onAjout }: { onAjout: (c: Cabinet) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ nom: "", architecte: "", numeroOrdre: "", ville: "", ice: "", identifiantFiscal: "", rc: "", patente: "" });
  const [err, setErr] = useState("");
  if (!ouvert) return <button style={{ ...S.btnGhost, marginTop: 8 }} onClick={() => setOuvert(true)}>+ Autre cabinet</button>;
  const ajouter = async () => {
    setErr("");
    const r = await fetch("/api/cc/cabinets", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr((j.erreurs || [ERREURS[j.error] || "Échec"]).join(" ; ")); return; }
    onAjout(j.cabinet); setOuvert(false);
  };
  const ch = (k: keyof typeof f, l: string) => (
    <label style={S.champ}><span style={S.label}>{l}</span><input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} style={S.input} /></label>
  );
  return (
    <div style={{ ...S.doublons, marginTop: 10 }}>
      <div style={S.grille}>
        {ch("nom", "Nom du cabinet *")}{ch("architecte", "Architecte")}{ch("numeroOrdre", "N° d'Ordre")}{ch("ville", "Ville")}
        {ch("ice", "ICE")}{ch("identifiantFiscal", "IF")}{ch("rc", "RC")}{ch("patente", "Patente")}
      </div>
      {err && <div style={S.erreur}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={S.btn} onClick={() => void ajouter()}>Ajouter le cabinet</button>
        <button style={S.btnGhost} onClick={() => setOuvert(false)}>Annuler</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { padding: "24px 28px", fontFamily: CC.font.body, color: CC.color.ink, maxWidth: 1000 },
  titre: { fontFamily: CC.font.display, fontSize: 28, margin: "0 0 4px", color: CC.color.navy },
  sous: { color: CC.color.inkMid, margin: "0 0 14px", fontSize: 14, lineHeight: 1.5 },
  lien: { color: CC.color.navy, fontSize: 13, textDecoration: "none" },
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: CC.size.radius, padding: 16, marginBottom: 14 },
  h2: { fontWeight: 600, color: CC.color.navy, marginBottom: 10, fontSize: 16 },
  grille: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 },
  champ: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: CC.color.inkMid },
  input: { padding: "8px 10px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 14, background: "#fff", fontFamily: "inherit" },
  choix: { display: "flex", gap: 16, marginBottom: 10 },
  radio: { display: "flex", alignItems: "center", gap: 6, fontSize: 14, margin: "4px 0" },
  aide: { fontSize: 12, color: CC.color.inkMid, margin: "8px 0 0", lineHeight: 1.5 },
  btn: { padding: "9px 16px", borderRadius: 6, border: 0, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 14 },
  btnGhost: { padding: "8px 12px", borderRadius: 6, border: `1px solid ${CC.color.border}`, background: "#fff", color: CC.color.ink, cursor: "pointer", fontSize: 13 },
  erreur: { background: CC.color.dangerBg, color: CC.color.danger, padding: "8px 12px", borderRadius: 6, margin: "10px 0", fontSize: 14 },
  avert: { background: CC.color.warnBg, color: CC.color.warn, padding: "8px 12px", borderRadius: 6, margin: "10px 0", fontSize: 13 },
  ok: { background: CC.color.successBg, color: CC.color.success, padding: "10px 12px", borderRadius: 6, margin: "10px 0", fontSize: 14 },
  doublons: { background: CC.color.infoBg, borderRadius: 6, padding: 12, marginTop: 10, fontSize: 13 },
  ligneDoublon: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "4px 0" },
  etape: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${CC.color.borderSoft}` },
};
