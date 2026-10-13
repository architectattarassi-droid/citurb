/**
 * /rdv/:jeton — espace rendez-vous du client (lien secret, noindex).
 *
 * Desktop : appel vidéo à gauche (≈ 60 %), dossier à droite. Mobile : onglets
 * « Appel vidéo » / « Mon dossier » ; la salle reste montée (masquée) quand on
 * passe sur le dossier. Le dossier s'enregistre tout seul (≈ 1 s après la
 * dernière saisie) : l'architecte le voit en direct dans le back-office.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SalleVisio, { type ConfigVisio } from "../visio/SalleVisio";
import ChoixCreneau from "./ChoixCreneau";
import { FormulaireDossier } from "./DossierRdv";
import { lienChiffrage } from "./dossier";
import {
  annuler, deplacer, enregistrerDossier, fuseauLocalDifferent, heureLocale, heureMaroc, jourLong, jourParDefaut, LIB_OBJET, lienAgenda,
  lireCreneaux, lireRdv, ouvrirVisio, type Creneaux, type RdvClient,
} from "./api";

const ERREURS_VISIO: Record<string, string> = {
  trop_tot: "La salle ouvre 15 minutes avant l'heure du rendez-vous.",
  termine: "Ce rendez-vous est terminé.",
  rdv_non_actif: "Ce rendez-vous n'est plus actif.",
  visio_non_configuree: "La visio intégrée n'est pas encore activée.",
};

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function compteARebours(debut: number, maintenant: number): string {
  const s = Math.round((debut - maintenant) / 1000);
  if (s <= 0) return "C'est l'heure";
  const j = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (j) return `Dans ${j} j ${h} h`;
  if (h) return `Dans ${h} h ${String(m).padStart(2, "0")} min`;
  return `Dans ${m} min ${String(sec).padStart(2, "0")} s`;
}

/** Noindex et pas de référent : posés aussi par le serveur (functions/_middleware.ts). */
function useMetaPrivee() {
  useEffect(() => {
    const ajouts = [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]].map(([n, c]) => {
      const m = document.createElement("meta");
      m.name = n; m.content = c;
      document.head.appendChild(m);
      return m;
    });
    document.title = "Mon rendez-vous | CITURBAREA";
    return () => ajouts.forEach((m) => m.remove());
  }, []);
}

export default function EspaceRdv() {
  useMetaPrivee();
  const { jeton = "" } = useParams();
  const [rdv, setRdv] = useState<RdvClient | null>(null);
  const [erreur, setErreur] = useState("");
  const [maintenant, setMaintenant] = useState(Date.now());
  const [onglet, setOnglet] = useState<"appel" | "dossier">("appel");
  const [valeurs, setValeurs] = useState<Record<string, unknown>>({});
  const [sauvegarde, setSauvegarde] = useState<"" | "attente" | "ok" | "erreur">("");
  const [visio, setVisio] = useState<ConfigVisio | null>(null);
  const [visioMsg, setVisioMsg] = useState("");
  const [visioCharge, setVisioCharge] = useState(false);
  const [modif, setModif] = useState<"" | "deplacer">("");
  const [offre, setOffre] = useState<Creneaux | null>(null);
  const [jour, setJour] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [modifMsg, setModifMsg] = useState("");
  const minuterie = useRef<number | undefined>(undefined);
  const aEnvoyer = useRef<Record<string, unknown>>({});
  const tzLocal = fuseauLocalDifferent();

  const charger = useCallback(async () => {
    const r = await lireRdv(jeton);
    if (!r.ok) { setErreur(r.status === 404 ? "introuvable" : "indisponible"); return; }
    setRdv(r.data.rdv);
    const { majLe: _m, ...d } = r.data.rdv.dossierRdv;
    void _m;
    setValeurs(d);
    aEnvoyer.current = d;
  }, [jeton]);
  useEffect(() => { void charger(); }, [charger]);
  useEffect(() => { const t = window.setInterval(() => setMaintenant(Date.now()), 1000); return () => window.clearInterval(t); }, []);

  const enregistrer = useCallback(async () => {
    const r = await enregistrerDossier(jeton, aEnvoyer.current);
    setSauvegarde(r.ok ? "ok" : "erreur");
  }, [jeton]);

  const changer = (cle: string, v: unknown) => {
    setValeurs((x) => {
      const n = { ...x, [cle]: v };
      aEnvoyer.current = n;
      return n;
    });
    setSauvegarde("attente");
    window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => void enregistrer(), 1000);
  };
  // Saisie en attente au départ de la page : envoi immédiat.
  useEffect(() => () => { if (minuterie.current) { window.clearTimeout(minuterie.current); void enregistrerDossier(jeton, aEnvoyer.current); } }, [jeton]);

  const rejoindre = async () => {
    setVisioMsg("");
    setVisioCharge(true);
    const r = await ouvrirVisio(jeton);
    setVisioCharge(false);
    if (r.ok) { setVisio(r.data.config); setOnglet("appel"); return; }
    setVisioMsg(ERREURS_VISIO[r.error] || "La salle n'a pas pu s'ouvrir. Réessayez dans un instant.");
  };

  const ouvrirDeplacement = async () => {
    setModif("deplacer"); setModifMsg(""); setNouveau("");
    const r = await lireCreneaux();
    if (r.ok) { setOffre(r.data); setJour((j) => jourParDefaut(r.data, j)); } else setModifMsg("Les créneaux ne peuvent pas être chargés pour le moment.");
  };
  const confirmerDeplacement = async () => {
    if (!nouveau) return;
    const r = await deplacer(jeton, nouveau);
    if (r.ok) { setModif(""); void charger(); return; }
    setModifMsg(r.error === "creneau_pris" ? "Ce créneau vient d'être pris. Choisissez-en un autre." : r.error === "trop_tard" ? "Il est trop tard pour déplacer ce rendez-vous (moins de 2 h)." : "Le déplacement n'a pas abouti.");
    if (r.error === "creneau_pris") void ouvrirDeplacement();
  };
  const confirmerAnnulation = async () => {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    const r = await annuler(jeton);
    if (r.ok) void charger();
    else setModifMsg(r.error === "trop_tard" ? "Il est trop tard pour annuler en ligne (moins de 2 h) : prévenez-nous sur WhatsApp." : "L'annulation n'a pas abouti.");
  };

  if (erreur) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-[#0B1B3A]">{erreur === "introuvable" ? "Rendez-vous introuvable" : "Espace momentanément indisponible"}</h1>
        <p className="mt-2 text-slate-600">{erreur === "introuvable" ? "Ce lien n'est pas valide. Vérifiez qu'il est complet (copié depuis l'e-mail de confirmation)." : "Réessayez dans un instant."}</p>
        <Link to="/rendez-vous" className="mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-[#C9A227] px-5 font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Réserver un appel vidéo</Link>
      </main>
    );
  }
  if (!rdv) return <main className="mx-auto max-w-xl px-4 py-12 text-slate-500">Chargement de votre rendez-vous…</main>;

  const debut = Date.parse(rdv.debut);
  const ouvert = rdv.statut === "CONFIRME" && maintenant >= Date.parse(rdv.visio.ouverture) && maintenant <= Date.parse(rdv.visio.fermeture);
  const secoursActif = rdv.statut === "CONFIRME" && maintenant >= debut - 10 * 60_000 && maintenant <= Date.parse(rdv.visio.fermeture);
  const chiffrage = lienChiffrage(valeurs);
  const espace = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";

  const bandeau = (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="m-0 text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">Appel vidéo avec l'architecte · {LIB_OBJET[rdv.objet] ?? "Rendez-vous"}</p>
      <h1 className="m-0 mt-1 text-xl font-bold text-[#0B1B3A] sm:text-2xl">{majuscule(jourLong(rdv.debut))} à {heureMaroc(rdv.debut)}</h1>
      <p className="m-0 mt-1 text-sm text-slate-600">Heure du Maroc · {rdv.dureeMin} min{tzLocal ? ` · ${heureLocale(rdv.debut, tzLocal)} chez vous` : ""}</p>
      {rdv.statut === "CONFIRME" && <p className="m-0 mt-2 text-lg font-semibold text-[#0B1B3A]" aria-live="polite">{compteARebours(debut, maintenant)}</p>}
      {rdv.statut === "ANNULE" && <p className="m-0 mt-2 font-semibold text-rose-700">Rendez-vous annulé. <Link to="/rendez-vous" className="underline">Réserver un autre créneau</Link></p>}
      {rdv.statut === "TERMINE" && <p className="m-0 mt-2 font-semibold text-emerald-700">Rendez-vous terminé — merci ! Vous pouvez encore compléter votre dossier.</p>}
      {rdv.statut === "ABSENT" && <p className="m-0 mt-2 font-semibold text-slate-700">Nous ne vous avons pas vu à l'heure prévue. <Link to="/rendez-vous" className="underline">Réserver un autre créneau</Link></p>}
      {rdv.peutModifier && !modif && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href={lienAgenda(rdv.debut, rdv.dureeMin, espace)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 px-3 font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Ajouter à Google Agenda</a>
          <button type="button" onClick={() => void ouvrirDeplacement()} className="min-h-[44px] rounded-lg border border-slate-300 px-3 font-semibold text-[#0B1B3A]">Déplacer</button>
          <button type="button" onClick={() => void confirmerAnnulation()} className="min-h-[44px] rounded-lg border border-rose-300 px-3 font-semibold text-rose-700">Annuler</button>
        </div>
      )}
      {modif === "deplacer" && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <p className="m-0 font-semibold text-[#0B1B3A]">Choisissez un nouveau créneau</p>
          {offre && <ChoixCreneau offre={offre} jour={jour} debut={nouveau} tzLocal={tzLocal} onJour={(d) => { setJour(d); setNouveau(""); }} onDebut={setNouveau} />}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!nouveau} onClick={() => void confirmerDeplacement()} className="min-h-[44px] rounded-lg bg-[#C9A227] px-4 font-bold text-[#0B1B3A] disabled:opacity-50">Confirmer le déplacement</button>
            <button type="button" onClick={() => setModif("")} className="min-h-[44px] rounded-lg border border-slate-300 px-4 font-semibold">Fermer</button>
          </div>
        </div>
      )}
      {modifMsg && <p className="m-0 mt-2 text-sm text-rose-700" role="alert">{modifMsg}</p>}
    </section>
  );

  const panneauVisio = (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1B3A] lg:h-[calc(100vh-140px)]">
      {visio ? (
        <SalleVisio config={visio} nomAffiche={rdv.nom} onQuitter={() => setVisio(null)} onErreur={(m) => setVisioMsg(m)} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
          {rdv.visio.integree ? (
            <>
              <p className="m-0 max-w-sm text-base text-white/85">L'appel se fait ici, sur citurbarea. Au clic, votre navigateur demandera l'accès à la caméra et au micro.</p>
              <button type="button" disabled={!ouvert || visioCharge} onClick={() => void rejoindre()}
                className="min-h-[52px] rounded-xl bg-[#C9A227] px-6 text-lg font-bold text-[#0B1B3A] disabled:opacity-50">
                {visioCharge ? "Ouverture…" : "Rejoindre l'appel vidéo"}
              </button>
              {!ouvert && rdv.statut === "CONFIRME" && maintenant < debut && <p className="m-0 text-sm text-white/70">La salle ouvre 15 minutes avant l'heure du rendez-vous. En attendant, remplissez votre dossier.</p>}
            </>
          ) : (
            <>
              <p className="m-0 max-w-sm text-base text-white/85">La visio intégrée n'est pas encore activée. L'appel se fera {rdv.visio.secours.type === "whatsapp" ? "en vidéo sur WhatsApp" : "par le lien ci-dessous"} ; gardez cette page ouverte pour remplir votre dossier.</p>
              <a href={secoursActif ? rdv.visio.secours.url : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!secoursActif}
                className={`inline-flex min-h-[52px] items-center rounded-xl px-6 text-lg font-bold ${secoursActif ? "bg-[#C9A227] text-[#0B1B3A]" : "pointer-events-none bg-white/20 text-white/60"}`} style={{ textDecoration: "none" }}>
                {rdv.visio.secours.type === "whatsapp" ? "Rejoindre sur WhatsApp" : "Rejoindre l'appel vidéo"}
              </a>
              {!secoursActif && rdv.statut === "CONFIRME" && maintenant < debut && <p className="m-0 text-sm text-white/70">Le bouton s'active 10 minutes avant l'heure du rendez-vous.</p>}
            </>
          )}
          {visioMsg && <p className="m-0 text-sm text-amber-200" role="alert">{visioMsg}</p>}
        </div>
      )}
    </div>
  );

  const panneauDossier = (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-lg font-bold text-[#0B1B3A]">Mon dossier</h2>
        <span className="text-xs text-slate-500" aria-live="polite">
          {sauvegarde === "attente" ? "Enregistrement…" : sauvegarde === "ok" ? "✓ Enregistré" : sauvegarde === "erreur" ? <span className="text-rose-600">Non enregistré — vérifiez la connexion</span> : "Enregistrement automatique"}
        </span>
      </div>
      <p className="m-0 text-sm text-slate-600">Remplissez ce que vous savez, pendant ou avant l'appel : l'architecte le voit en direct. Aucun numéro de pièce d'identité ou de titre n'est demandé.</p>
      <FormulaireDossier valeurs={valeurs} onChange={changer} desactive={rdv.statut === "ANNULE"} />
      {chiffrage && <a href={chiffrage} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#0B1B3A] underline">Estimer le coût de construction avec ces informations ↗</a>}
      {rdv.statut !== "ANNULE" && (
        <button type="button" onClick={() => changer("pret", true)} disabled={valeurs.pret === true}
          className="min-h-[48px] rounded-lg bg-[#0B1B3A] px-5 font-bold text-white disabled:bg-emerald-700">
          {valeurs.pret === true ? "✓ Dossier marqué prêt — merci !" : "Mon dossier est prêt"}
        </button>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">
      {bandeau}
      <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden" role="tablist" aria-label="Espace rendez-vous">
        {(["appel", "dossier"] as const).map((o) => (
          <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setOnglet(o)}
            className={`min-h-[48px] rounded-lg border font-semibold ${onglet === o ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-[#0B1B3A]"}`}>
            {o === "appel" ? "Appel vidéo" : "Mon dossier"}
          </button>
        ))}
      </div>
      <div className="mt-3 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-4">
        {/* Masqué, jamais démonté : l'appel continue quand on passe sur le dossier. */}
        <div className={onglet === "appel" ? "" : "hidden lg:block"}>{panneauVisio}</div>
        <div className={(onglet === "dossier" ? "" : "hidden lg:block ") + "lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto"}>{panneauDossier}</div>
      </div>
    </main>
  );
}
