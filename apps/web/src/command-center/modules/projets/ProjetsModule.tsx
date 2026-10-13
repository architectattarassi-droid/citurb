/**
 * /cc/projets — espaces projet (Pages Functions /api/cc/projets).
 *   - liste des projets ;
 *   - création depuis un dossier existant (/cc/dossiers) avec saisie des
 *     caractéristiques : les jalons sont générés ici depuis le référentiel
 *     (module chargé à la demande) puis figés côté serveur ;
 *   - fiche : membres et liens d'accès (copier / WhatsApp / e-mail), révocation,
 *     régénération, journal, et la vue de l'espace avec tous les droits.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { CC } from "../../theme/tokens";
import VueProjet from "../../../features/projet/VueProjet";
import {
  activerMembre, appel, BASE_ADMIN, inviter, lireJournal, lireMembres, regenererLien, type Caracteristiques, type Invitation, type Membre,
} from "../../../features/projet/api";
import { dateHeure, erreur, role, T } from "../../../features/projet/libelles";
import type { Role } from "../../../domain/referentiel/types";

type Resume = { id: string; titre: string; dossierId: string | null; createdAt: string; nbJalons: number; nbValides: number; nbMembres: number };
type DossierCc = { id: string; title: string | null; clientNom: string | null; commune: string | null; porteType: string | null; createdAt: string; nbNiveaux?: number | null };

const BTN = "inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50";
const INPUT = "min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-base";

export default function ProjetsModule() {
  return (
    <div style={{ fontFamily: CC.font.body, color: CC.color.ink }} className="min-h-full bg-[#f8fafc]">
      <Routes>
        <Route index element={<Liste />} />
        <Route path=":id" element={<Fiche />} />
      </Routes>
    </div>
  );
}

function Liste() {
  const [d, setD] = useState<{ projets: Resume[]; stockage: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [creation, setCreation] = useState(false);
  const charger = useCallback(async () => {
    const r = await appel<{ projets: Resume[]; stockage: boolean }>(BASE_ADMIN);
    if (r.ok) { setD(r.data); setErr(""); } else setErr(r.error);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="m-0 text-xl font-semibold text-[#0B1B3A]">Espaces projet</h1>
      <p className="m-0 mt-1 text-sm text-slate-600">Chaque projet est rattaché à un dossier et décomposé en jalons générés depuis le référentiel. Les membres y accèdent par un lien personnel, sans mot de passe.</p>
      {err && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {err === "espace_projet_indisponible" ? "Tables absentes ou base injoignable : exécutez docs/sql/espace-projet-neon.sql dans la console SQL de Neon." : `Lecture impossible (${erreur(err)}). En local, cette page ne fonctionne qu'avec les Pages Functions.`}
        </p>
      )}
      {d && !d.stockage && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Stockage des photos non activé : créez un bucket R2 et liez-le au projet Pages sous le nom <code>FICHIERS</code> (Settings → Bindings).</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setCreation((x) => !x)} className={`${BTN} bg-[#0B1B3A] text-white`}>{creation ? "Fermer" : "Nouveau projet"}</button>
      </div>
      {creation && <Creation onCree={() => { setCreation(false); void charger(); }} />}
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {d?.projets.map((p) => (
          <li key={p.id}>
            <Link to={`/cc/projets/${p.id}`} className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 no-underline">
              <span>
                <strong className="block text-[#0B1B3A]">{p.titre}</strong>
                <span className="text-xs text-slate-500">{dateHeure(p.createdAt)}{p.dossierId ? ` · dossier ${p.dossierId}` : ""} · {p.nbMembres} membre(s)</span>
              </span>
              <span className="text-sm text-slate-700">{p.nbValides}/{p.nbJalons} jalons validés</span>
            </Link>
          </li>
        ))}
        {d && !d.projets.length && <li className="text-sm text-slate-500">Aucun projet pour l'instant.</li>}
      </ul>
    </div>
  );
}

const TYPES = ["VILLA", "MAISON", "IMMEUBLE", "MIXTE", "ERP", "LOTISSEMENT"] as const;

function Creation({ onCree }: { onCree: () => void }) {
  const naviguer = useNavigate();
  const [dossiers, setDossiers] = useState<DossierCc[] | null>(null);
  const [dossierId, setDossierId] = useState("");
  const [titre, setTitre] = useState("");
  const [c, setC] = useState<Caracteristiques>({ type: "VILLA", sousSols: 0, etagesHorsSol: 1, erp: false, ascenseur: false, piscine: false });
  const [apercu, setApercu] = useState<number | null>(null);
  const [etat, setEtat] = useState("");

  useEffect(() => {
    void fetch("/api/cc/dossiers", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((l) => setDossiers(Array.isArray(l) ? l : []))
      .catch(() => setDossiers([]));
  }, []);

  // Aperçu du nombre de jalons (référentiel chargé à la demande).
  useEffect(() => {
    let actif = true;
    void import("../../../features/projet/generation").then((g) => {
      if (actif) setApercu(g.instantane(c as Parameters<typeof g.instantane>[0]).jalons.length);
    }).catch(() => setApercu(null));
    return () => { actif = false; };
  }, [c]);

  const choisirDossier = (id: string) => {
    setDossierId(id);
    const d = dossiers?.find((x) => x.id === id);
    if (d && !titre) setTitre([d.title, d.clientNom, d.commune].filter(Boolean).join(" — ").slice(0, 200));
  };

  const creer = async () => {
    setEtat("Génération des jalons…");
    const g = await import("../../../features/projet/generation");
    const inst = g.instantane(c as Parameters<typeof g.instantane>[0]);
    const r = await appel<{ id: string; jalons: number }>(BASE_ADMIN, { method: "POST", body: JSON.stringify({ dossierId: dossierId || null, titre, caracteristiques: c, referentielVersion: g.versionReferentiel(), ...inst }) });
    if (!r.ok) { setEtat(`Création impossible : ${erreur(r.error)}`); return; }
    setEtat("");
    onCree();
    naviguer(`/cc/projets/${r.data.id}`);
  };

  const nombre = (k: keyof Caracteristiques, min: number, max: number, lib: string, optionnel = false) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{lib}</span>
      <input type="number" min={min} max={max} className={INPUT} value={c[k] === undefined ? "" : String(c[k])}
        onChange={(e) => setC((x) => ({ ...x, [k]: e.target.value === "" ? (optionnel ? undefined : 0) : Number(e.target.value) }))} />
    </label>
  );
  const coche = (k: "erp" | "ascenseur" | "piscine", lib: string) => (
    <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={c[k]} onChange={(e) => setC((x) => ({ ...x, [k]: e.target.checked }))} />{lib}</label>
  );

  return (
    <section className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Dossier (/cc/dossiers)</span>
        <select className={INPUT} value={dossierId} onChange={(e) => choisirDossier(e.target.value)}>
          <option value="">— Sans dossier —</option>
          {dossiers?.map((d) => <option key={d.id} value={d.id}>{[d.title || d.id, d.clientNom, d.commune, d.porteType].filter(Boolean).join(" · ")}</option>)}
        </select>
        {dossiers && !dossiers.length && <span className="mt-1 block text-xs text-slate-500">Aucun dossier lisible (base injoignable en local ?).</span>}
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Titre du projet</span>
        <input className={INPUT} value={titre} maxLength={200} onChange={(e) => setTitre(e.target.value)} placeholder="Villa R+1 — Kénitra" />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Type</span>
          <select className={INPUT} value={c.type} onChange={(e) => setC((x) => ({ ...x, type: e.target.value }))}>{TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select>
        </label>
        {nombre("etagesHorsSol", 0, 60, "Étages hors sol (R+n)")}
        {nombre("sousSols", 0, 6, "Sous-sols")}
        {nombre("hauteurM", 0, 400, "Hauteur (m)", true)}
        {nombre("zoneSismique", 0, 4, "Zone sismique (0 à 4)", true)}
      </div>
      <div className="flex flex-wrap gap-4">{coche("erp", "ERP")}{coche("ascenseur", "Ascenseur")}{coche("piscine", "Piscine")}</div>
      <p className="m-0 text-sm text-slate-600">{apercu === null ? "Calcul des jalons…" : `${apercu} jalon(s) seront générés depuis le référentiel.`}</p>
      <div><button type="button" disabled={titre.trim().length < 2 || !!etat} onClick={() => void creer()} className={`${BTN} bg-emerald-600 text-white`}>Créer le projet</button></div>
      {etat && <p className="m-0 text-sm text-slate-700">{etat}</p>}
    </section>
  );
}

function Fiche() {
  const { id = "" } = useParams();
  const [onglet, setOnglet] = useState<"espace" | "membres" | "journal">("espace");
  return (
    <div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 pt-4">
        <Link to="/cc/projets" className="text-sm font-semibold text-[#0B1B3A]">← Projets</Link>
        <span className="flex-1" />
        {([["espace", "Espace (tous droits)"], ["membres", "Membres et liens"], ["journal", "Journal"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setOnglet(k)} className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${onglet === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>{l}</button>
        ))}
      </div>
      {onglet === "espace" && <VueProjet base={BASE_ADMIN} projetId={id} />}
      {onglet === "membres" && <Membres projetId={id} />}
      {onglet === "journal" && <Journal projetId={id} />}
    </div>
  );
}

const ROLES_INVITABLES: Role[] = ["CLIENT", "ARCHITECTE", "BET_STRUCTURE", "BET_FLUIDES", "GEOTECHNICIEN", "TOPOGRAPHE", "BUREAU_CONTROLE", "LABORATOIRE", "ENTREPRISE", "SOUS_TRAITANT", "COORDINATEUR_SPS", "NOTAIRE", "ADMINISTRATION"];

function Membres({ projetId }: { projetId: string }) {
  const [liste, setListe] = useState<Membre[]>([]);
  const [f, setF] = useState<Invitation>({ role: "CLIENT", nom: "", telephone: "", email: "", entreprise: "", envoyerEmail: false });
  const [lien, setLien] = useState<{ nom: string; telephone?: string | null; email?: string | null; lien: string; emailEnvoye: boolean } | null>(null);
  const [e, setE] = useState("");
  const charger = useCallback(async () => { const r = await lireMembres(BASE_ADMIN, projetId); if (r.ok) setListe(r.data.membres); else setE(erreur(r.error)); }, [projetId]);
  useEffect(() => { void charger(); }, [charger]);

  const ajouter = async () => {
    const r = await inviter(BASE_ADMIN, projetId, { ...f, telephone: f.telephone || undefined, email: f.email || undefined, entreprise: f.entreprise || undefined });
    if (!r.ok) { setE(erreur(r.error)); return; }
    setE(""); setLien({ nom: r.data.membre.nom, telephone: r.data.membre.telephone, email: r.data.membre.email, lien: r.data.lien, emailEnvoye: r.data.emailEnvoye });
    setF({ role: f.role, nom: "", telephone: "", email: "", entreprise: "", envoyerEmail: false });
    void charger();
  };
  const regenerer = async (m: Membre) => {
    if (!window.confirm(`Régénérer le lien de ${m.nom} ? L'ancien lien et ses sessions ne fonctionneront plus.`)) return;
    const r = await regenererLien(BASE_ADMIN, projetId, m.id);
    if (r.ok) setLien({ nom: m.nom, telephone: m.telephone, email: m.email, lien: r.data.lien, emailEnvoye: false }); else setE(erreur(r.error));
    void charger();
  };
  const basculer = async (m: Membre) => { const r = await activerMembre(BASE_ADMIN, projetId, m.id, !m.actif); if (!r.ok) setE(erreur(r.error)); void charger(); };

  const message = lien ? `Bonjour ${lien.nom}, voici votre accès personnel à l'espace du projet sur CITURBAREA (ne le transmettez pas) : ${lien.lien}` : "";
  const wa = lien ? `https://wa.me/${(lien.telephone || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : "";

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
      {lien && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <h2 className="m-0 text-base font-semibold text-emerald-900">Lien d'accès de {lien.nom}</h2>
          <p className="m-0 mt-1 text-xs text-emerald-900">Affiché une seule fois (seule son empreinte est conservée). Régénérez-le en cas de perte.</p>
          <input readOnly value={lien.lien} className={`${INPUT} mt-2 bg-white font-mono text-sm`} onFocus={(ev) => ev.target.select()} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={`${BTN} bg-[#0B1B3A] text-white`} onClick={() => void navigator.clipboard?.writeText(lien.lien)}>Copier</button>
            {lien.telephone && <a className={`${BTN} bg-[#25D366] text-white no-underline`} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {lien.email && <a className={`${BTN} border border-slate-300 bg-white text-slate-800 no-underline`} href={`mailto:${lien.email}?subject=${encodeURIComponent("Votre accès à l'espace projet CITURBAREA")}&body=${encodeURIComponent(message)}`}>E-mail (messagerie)</a>}
            <button type="button" className={`${BTN} border border-slate-300 bg-white text-slate-800`} onClick={() => setLien(null)}>Fermer</button>
          </div>
          {lien.emailEnvoye && <p className="m-0 mt-2 text-sm text-emerald-900">E-mail envoyé par Resend.</p>}
        </section>
      )}

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="m-0 text-base font-semibold text-[#0B1B3A]">Inviter un membre</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="mb-1 block font-medium">Rôle</span>
            <select className={INPUT} value={f.role} onChange={(ev) => setF((x) => ({ ...x, role: ev.target.value as Role }))}>{ROLES_INVITABLES.map((r) => <option key={r} value={r}>{role(r)}</option>)}</select>
          </label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Nom</span><input className={INPUT} value={f.nom} maxLength={120} onChange={(ev) => setF((x) => ({ ...x, nom: ev.target.value }))} /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Téléphone (WhatsApp)</span><input className={INPUT} inputMode="tel" value={f.telephone} onChange={(ev) => setF((x) => ({ ...x, telephone: ev.target.value }))} /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">E-mail</span><input className={INPUT} type="email" value={f.email} onChange={(ev) => setF((x) => ({ ...x, email: ev.target.value }))} /></label>
          <label className="block text-sm sm:col-span-2"><span className="mb-1 block font-medium">Entreprise</span><input className={INPUT} value={f.entreprise} maxLength={160} onChange={(ev) => setF((x) => ({ ...x, entreprise: ev.target.value }))} /></label>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!f.envoyerEmail} onChange={(ev) => setF((x) => ({ ...x, envoyerEmail: ev.target.checked }))} />Envoyer le lien par e-mail (Resend, si configuré)</label>
        <div><button type="button" disabled={f.nom.trim().length < 2} onClick={() => void ajouter()} className={`${BTN} bg-emerald-600 text-white`}>Créer l'accès</button></div>
        {e && <p role="alert" className="m-0 text-sm text-red-700">{e}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="m-0 mb-2 text-base font-semibold text-[#0B1B3A]">Membres ({liste.length})</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {liste.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${m.actif ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
              <span className="text-sm">
                <strong>{m.nom}</strong> · {role(m.role)}{m.entreprise ? ` · ${m.entreprise}` : ""}
                <span className="block text-xs text-slate-500">{[m.telephone, m.email].filter(Boolean).join(" · ") || "—"} · {m.dernierAcces ? `dernier accès ${dateHeure(m.dernierAcces)}` : "jamais connecté"}{m.actif ? "" : " · révoqué"}</span>
              </span>
              <span className="flex gap-2">
                <button type="button" onClick={() => void regenerer(m)} className={`${BTN} border border-slate-300 bg-white text-slate-800`}>Nouveau lien</button>
                <button type="button" onClick={() => void basculer(m)} className={`${BTN} border ${m.actif ? "border-red-300 text-red-700" : "border-emerald-300 text-emerald-700"} bg-white`}>{m.actif ? "Révoquer" : "Réactiver"}</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Journal({ projetId }: { projetId: string }) {
  const [l, setL] = useState<{ id: string; auteur: string; action: string; cible: string | null; details: Record<string, unknown> | null; createdAt: string }[]>([]);
  const [e, setE] = useState("");
  useEffect(() => { void lireJournal(BASE_ADMIN, projetId).then((r) => (r.ok ? setL(r.data.evenements) : setE(erreur(r.error)))); }, [projetId]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {e && <p className="text-sm text-red-700">{e}</p>}
      <table className="w-full border-collapse bg-white text-sm">
        <thead><tr className="text-left text-slate-600"><th className="border-b p-2">Date</th><th className="border-b p-2">Auteur</th><th className="border-b p-2">Action</th><th className="border-b p-2">Cible</th><th className="border-b p-2">Détails</th></tr></thead>
        <tbody>
          {l.map((x) => (
            <tr key={x.id} className="align-top">
              <td className="border-b p-2 whitespace-nowrap">{dateHeure(x.createdAt)}</td><td className="border-b p-2">{x.auteur}</td>
              <td className="border-b p-2">{x.action === "statut" && x.details ? `${T.statuts[x.details.de as keyof typeof T.statuts] ?? x.details.de} → ${T.statuts[x.details.vers as keyof typeof T.statuts] ?? x.details.vers}` : x.action}</td>
              <td className="border-b p-2 font-mono text-xs">{x.cible}</td><td className="border-b p-2 font-mono text-xs">{x.details ? JSON.stringify(x.details) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
