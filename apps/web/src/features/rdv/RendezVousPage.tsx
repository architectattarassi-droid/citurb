/**
 * /rendez-vous — réservation d'un appel vidéo gratuit de 30 min avec l'architecte.
 * Sujet → créneau (heure du Maroc, heure locale pour les MRE) → coordonnées → confirmation.
 * La visio se tient DANS l'espace rendez-vous (/rdv/<jeton>), où le client remplit son dossier.
 */
import React, { useCallback, useEffect, useState } from "react";
import { evenement, conversionLead } from "../../lib/marketing";
import { lienWhatsApp } from "../../config/contact";
import { currentUtm, telephoneEnvoyable } from "../lead-funnel/leadBridge";
import { INDICATIFS, numeroComplet } from "../lead-funnel/indicatifs";
import { fuseauLocalDifferent, heureLocale, heureMaroc, jourLong, jourParDefaut, lienAgenda, lireCreneaux, OBJETS, reserver, type Creneaux } from "./api";
import ChoixCreneau from "./ChoixCreneau";
import { HONEYPOT_STYLE } from "../../lib/honeypot";

const ERREURS: Record<string, string> = {
  nom_invalide: "Indiquez votre nom.",
  telephone_invalide: "Numéro de téléphone invalide (format marocain ou international).",
  email_invalide: "Adresse e-mail invalide.",
  consentement_requis: "Merci d'accepter d'être contacté au sujet de ce rendez-vous.",
  creneau_invalide: "Ce créneau n'est plus proposé. Choisissez-en un autre.",
  creneau_pris: "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.",
  too_many_requests: "Trop de réservations depuis cette connexion. Réessayez plus tard ou écrivez-nous sur WhatsApp.",
};

const champ = "min-h-[46px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base";
const titreEtape = "m-0 text-lg font-bold text-[#0B1B3A]";

export default function RendezVousPage() {
  const [objet, setObjet] = useState("");
  const [offre, setOffre] = useState<Creneaux | null>(null);
  const [offreErreur, setOffreErreur] = useState(false);
  const [jour, setJour] = useState("");
  const [debut, setDebut] = useState("");
  const [f, setF] = useState({ nom: "", tel: "", email: "", message: "", consentement: false, website: "" });
  const [indicatif, setIndicatif] = useState("+212");
  const [envoi, setEnvoi] = useState(false);
  const [err, setErr] = useState("");
  const [fait, setFait] = useState<{ jeton: string; debut: string; reference: string } | null>(null);
  const tzLocal = fuseauLocalDifferent();

  useEffect(() => { document.title = "Rendez-vous visio gratuit avec un architecte | CITURBAREA"; }, []);

  const charger = useCallback(async () => {
    setOffreErreur(false);
    const r = await lireCreneaux();
    if (!r.ok) { setOffreErreur(true); return; }
    setOffre(r.data);
    setJour((j) => jourParDefaut(r.data, j));
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const maj = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const tel = numeroComplet(indicatif, f.tel);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!debut) { setErr("Choisissez un créneau."); return; }
    if (f.nom.trim().length < 2) { setErr(ERREURS.nom_invalide); return; }
    if (!telephoneEnvoyable(tel)) { setErr(ERREURS.telephone_invalide); return; }
    if (!f.consentement) { setErr(ERREURS.consentement_requis); return; }
    setEnvoi(true);
    const r = await reserver({ debut, nom: f.nom.trim(), telephone: tel, email: f.email.trim() || undefined, objet: objet || "AUTRE", message: f.message.trim() || undefined, consentement: true, website: f.website, utm: currentUtm() });
    setEnvoi(false);
    if (r.ok) {
      setFait(r.data);
      evenement("rdv_reserve", { objet: objet || "AUTRE", transaction_id: r.data.reference });
      void conversionLead({ source: "WEB_RDV", porte: objet === "TERRAIN" ? "P4" : "P1", transaction_id: r.data.reference }, { email: f.email.trim() || undefined, telephone: tel });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErr(ERREURS[r.error] || "La réservation n'a pas abouti. Réessayez, ou écrivez-nous sur WhatsApp.");
    if (r.error === "creneau_pris" || r.error === "creneau_invalide") { setDebut(""); void charger(); }
  };

  if (fait) {
    const espace = `${window.location.origin}/rdv/${fait.jeton}`;
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h1 className="m-0 text-2xl font-bold text-emerald-900">Rendez-vous confirmé</h1>
          <p className="mt-2 text-lg text-emerald-900"><strong>{jourLong(fait.debut)} à {heureMaroc(fait.debut)}</strong> (heure du Maroc){tzLocal ? <> — soit {heureLocale(fait.debut, tzLocal)} chez vous</> : null}.</p>
          <p className="mt-3 text-slate-700">Votre <strong>espace rendez-vous</strong> est votre accès personnel : vous y rejoindrez l'appel vidéo, directement sur citurbarea, et remplirez votre dossier pendant l'échange. <strong>Gardez ce lien</strong>{f.email ? " (il vous a aussi été envoyé par e-mail)" : " : ajoutez-le à vos favoris ou à votre agenda"}.</p>
          <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
            {/* Navigation complète (pas de routeur) : les balises publicitaires ne se chargent pas sur l'espace privé. */}
            <a href={espace} className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#C9A227] px-5 font-bold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Ouvrir mon espace rendez-vous</a>
            <a href={lienAgenda(fait.debut, offre?.dureeMin ?? 30, espace)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Ajouter à Google Agenda</a>
            <a href={lienWhatsApp(`Bonjour, j'ai réservé un appel vidéo le ${jourLong(fait.debut)} à ${heureMaroc(fait.debut)}.`)} target="_blank" rel="noopener noreferrer"
              onClick={() => evenement("whatsapp_click", { emplacement: "rdv_confirme" })}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-600 px-4 font-semibold text-white" style={{ textDecoration: "none", color: "#fff" }}>WhatsApp</a>
          </div>
          <p className="mt-4 break-all text-xs text-slate-500">Votre lien : {espace}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <p className="m-0 text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">Gratuit · 30 min · sans engagement</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A]">Réservez un appel vidéo gratuit de 30 min avec l'architecte</h1>
      <p className="mt-2 text-slate-600">Un architecte inscrit à l'Ordre répond à vos questions en visio, sur citurbarea, depuis le Maroc ou l'étranger. Pendant l'appel, vous remplissez votre dossier : l'architecte le voit en direct.</p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="etape-sujet">
        <h2 id="etape-sujet" className={titreEtape}>1. Le sujet de l'appel</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OBJETS.map(([k, l, d]) => (
            <button key={k} type="button" aria-pressed={objet === k} onClick={() => setObjet(k)}
              className={`min-h-[56px] rounded-xl border px-4 py-2 text-left ${objet === k ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-800 hover:border-[#0B1B3A]"}`}>
              <span className="block font-semibold">{l}</span>
              <span className={`block text-xs ${objet === k ? "text-white/80" : "text-slate-500"}`}>{d}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="etape-creneau">
        <h2 id="etape-creneau" className={titreEtape}>2. Le créneau</h2>
        <p className="m-0 mt-1 text-sm text-slate-500">Heures du Maroc{tzLocal ? <> · votre heure locale ({tzLocal.split("/").pop()?.replace(/_/g, " ")}) est indiquée en dessous</> : null}.</p>
        {offreErreur && (
          <p className="mt-3 text-sm text-rose-700" role="alert">Les créneaux ne peuvent pas être chargés pour le moment. <button type="button" onClick={() => void charger()} className="font-semibold underline">Réessayer</button> ou <a href={lienWhatsApp("Bonjour, je souhaite réserver un appel vidéo avec l'architecte.")} target="_blank" rel="noopener noreferrer" className="font-semibold underline">écrivez-nous sur WhatsApp</a>.</p>
        )}
        {!offre && !offreErreur && <p className="mt-3 text-sm text-slate-500">Chargement des créneaux…</p>}
        {offre && (
          <>
            <ChoixCreneau offre={offre} jour={jour} debut={debut} tzLocal={tzLocal} onJour={(d) => { setJour(d); setDebut(""); }} onDebut={setDebut} />
          </>
        )}
      </section>

      <form onSubmit={envoyer} noValidate className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="etape-coord">
        <h2 id="etape-coord" className={titreEtape}>3. Vos coordonnées</h2>
        {debut && <p className="m-0 rounded-lg bg-[#fbf6e4] px-3 py-2 text-sm text-[#0B1B3A]">Créneau choisi : <strong>{jourLong(debut)} à {heureMaroc(debut)}</strong> (heure du Maroc){tzLocal ? ` — ${heureLocale(debut, tzLocal)} chez vous` : ""}</p>}
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Nom et prénom<input value={f.nom} onChange={(e) => maj({ nom: e.target.value })} className={champ} autoComplete="name" /></label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Téléphone / WhatsApp
          <span className="flex gap-2">
            <select aria-label="Indicatif" value={indicatif} onChange={(e) => setIndicatif(e.target.value)} className="min-h-[46px] shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-base">
              {INDICATIFS.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
            </select>
            <input type="tel" inputMode="tel" value={f.tel} onChange={(e) => maj({ tel: e.target.value })} placeholder={indicatif === "+212" ? "6 12 34 56 78" : ""} className={champ} autoComplete="tel" />
          </span>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">E-mail <span className="font-normal text-slate-500">(facultatif, conseillé : vous y recevez le lien de votre espace et l'invitation agenda)</span>
          <input type="email" value={f.email} onChange={(e) => maj({ email: e.target.value })} className={champ} autoComplete="email" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Message <span className="font-normal text-slate-500">(facultatif)</span>
          <textarea value={f.message} onChange={(e) => maj({ message: e.target.value })} rows={3} maxLength={1500} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
        </label>
        <input type="text" name="website" value={f.website} onChange={(e) => maj({ website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.consentement} onChange={(e) => maj({ consentement: e.target.checked })} className="mt-1 h-5 w-5 shrink-0" />
          J'accepte que CITURBAREA utilise ces informations pour organiser ce rendez-vous et me recontacter à son sujet (loi 09-08). Elles ne sont jamais revendues.
        </label>
        {err && <p className="m-0 text-sm text-rose-600" role="alert">{err}</p>}
        <button type="submit" disabled={envoi} className="min-h-[48px] rounded-lg bg-[#C9A227] px-5 text-base font-bold text-[#0B1B3A] disabled:opacity-60">
          {envoi ? "Réservation…" : "Réserver mon appel vidéo"}
        </button>
      </form>
    </main>
  );
}

