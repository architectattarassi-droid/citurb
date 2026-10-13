/**
 * /p4/terrains/deposer — dépôt d'une annonce de terrain par un propriétaire ou un
 * intermédiaire mandaté. Publication après vérification ; coordonnées jamais publiques.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { deposerTerrain, type DepotTerrain } from "./api";
import { telephoneEnvoyable } from "../lead-funnel/leadBridge";
import { lienWhatsApp } from "../../config/contact";
import { evenement } from "../../lib/marketing";
import { HONEYPOT_STYLE } from "../../lib/honeypot";

const ERREURS: Record<string, string> = {
  mandat_requis: "Un intermédiaire doit confirmer disposer d'un mandat du propriétaire.",
  consentement_requis: "Merci d'accepter les conditions de publication.",
  nom_invalide: "Indiquez votre nom.",
  telephone_invalide: "Numéro de téléphone invalide (format marocain ou international).",
  ville_invalide: "Indiquez la ville.",
  surface_invalide: "Indiquez une surface valide (au moins 20 m²).",
  prix_invalide: "Prix invalide.",
  too_many_requests: "Trop de dépôts depuis cette connexion. Réessayez plus tard ou écrivez-nous sur WhatsApp.",
};

const champ = "min-h-[46px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base";

export default function DeposerTerrain() {
  const [f, setF] = useState<DepotTerrain>({ deposant: "PROPRIETAIRE", mandat: false, consentement: false, nom: "", telephone: "", ville: "", surface: 0, titre: "TITRE", usage: "VILLA" });
  const [etat, setEtat] = useState<"saisie" | "envoi" | "ok">("saisie");
  const [err, setErr] = useState("");
  const maj = (p: Partial<DepotTerrain>) => setF((x) => ({ ...x, ...p }));

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!telephoneEnvoyable(f.telephone)) { setErr(ERREURS.telephone_invalide); return; }
    setEtat("envoi");
    const r = await deposerTerrain(f);
    if (r.ok) { setEtat("ok"); evenement("terrain_depose", { usage: f.usage, deposant: f.deposant }); return; }
    setEtat("saisie");
    setErr(ERREURS[r.error || ""] || "L'envoi n'a pas abouti. Réessayez, ou envoyez-nous les informations sur WhatsApp.");
  };

  if (etat === "ok") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h1 className="text-2xl font-bold text-emerald-900">Annonce reçue, merci !</h1>
          <p className="mt-2 text-emerald-900">Elle sera publiée après vérification par notre équipe. Nous pouvons vous appeler pour préciser un point (titre, mandat, localisation).</p>
          <p className="mt-4 font-semibold text-[#0B1B3A]">Pour vendre mieux et plus vite :</p>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            <li>une étude de faisabilité jointe à l'annonce (ce qu'on peut construire, pour quel budget) ;</li>
            <li>la note de renseignements urbanistiques ;</li>
            <li>une estimation du coût de construction pour les acheteurs.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={lienWhatsApp(`Bonjour, je viens de déposer mon terrain de ${f.surface} m² à ${f.ville} sur citurbarea.com. Je souhaite une étude de faisabilité.`)} target="_blank" rel="noopener noreferrer"
              onClick={() => evenement("whatsapp_click", { emplacement: "depot_terrain" })}
              className="inline-flex min-h-[48px] items-center rounded-lg bg-emerald-600 px-4 font-semibold text-white" style={{ textDecoration: "none", color: "#fff" }}>Demander une étude sur WhatsApp</a>
            <Link to="/p4/terrains" className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>Voir les terrains</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">Porte 4 · Investisseur & foncier</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight text-[#0B1B3A]">Déposer mon terrain</h1>
      <p className="mt-2 text-slate-600">Gratuit. Votre annonce est vérifiée avant publication et vue par des acheteurs qui préparent un projet de construction. Vos coordonnées ne sont jamais publiées : les acheteurs passent par CITURBAREA.</p>

      <form onSubmit={envoyer} noValidate className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="text-sm font-semibold text-slate-700">Vous êtes</legend>
          <div className="flex flex-wrap gap-2">
            {(["PROPRIETAIRE", "INTERMEDIAIRE"] as const).map((d) => (
              <button key={d} type="button" aria-pressed={f.deposant === d} onClick={() => maj({ deposant: d })}
                className={`min-h-[44px] rounded-lg border px-4 font-semibold ${f.deposant === d ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                {d === "PROPRIETAIRE" ? "Propriétaire" : "Intermédiaire / agent"}
              </button>
            ))}
          </div>
          {f.deposant === "INTERMEDIAIRE" && (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={f.mandat} onChange={(e) => maj({ mandat: e.target.checked })} className="mt-1 h-5 w-5" />
              Je dispose d'un mandat du propriétaire pour proposer ce terrain.
            </label>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Ville<input value={f.ville} onChange={(e) => maj({ ville: e.target.value })} className={champ} autoComplete="address-level2" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Quartier / lotissement <span className="font-normal text-slate-400">(facultatif)</span><input value={f.quartier ?? ""} onChange={(e) => maj({ quartier: e.target.value })} className={champ} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Surface (m²)<input inputMode="numeric" value={f.surface || ""} onChange={(e) => maj({ surface: Number(e.target.value.replace(/[^0-9]/g, "")) })} className={champ} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Prix demandé (DH) <span className="font-normal text-slate-400">(facultatif)</span><input inputMode="numeric" value={f.prix ?? ""} onChange={(e) => maj({ prix: Number(e.target.value.replace(/[^0-9]/g, "")) || undefined })} className={champ} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Type de terrain
            <select value={f.usage} onChange={(e) => maj({ usage: e.target.value })} className={champ}>
              <option value="VILLA">Terrain à villa</option><option value="IMMEUBLE">Terrain à immeuble</option><option value="COMMERCIAL">Commercial</option><option value="AGRICOLE">Agricole</option><option value="AUTRE">Autre</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Situation foncière
            <select value={f.titre} onChange={(e) => maj({ titre: e.target.value })} className={champ}>
              <option value="TITRE">Titré</option><option value="EN_COURS">Titre en cours (réquisition)</option><option value="NON_TITRE">Non titré (melk)</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(facultatif : accès, voisinage, viabilisation… sans coordonnées)</span>
          <textarea value={f.description ?? ""} onChange={(e) => maj({ description: e.target.value })} rows={4} maxLength={1500} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Votre nom<input value={f.nom} onChange={(e) => maj({ nom: e.target.value })} className={champ} autoComplete="name" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Téléphone / WhatsApp<input type="tel" inputMode="tel" value={f.telephone} onChange={(e) => maj({ telephone: e.target.value })} placeholder="+212 6 12 34 56 78" className={champ} autoComplete="tel" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">E-mail <span className="font-normal text-slate-400">(facultatif)</span><input type="email" value={f.email ?? ""} onChange={(e) => maj({ email: e.target.value })} className={champ} autoComplete="email" /></label>
        </div>

        <input type="text" name="website" value={f.website ?? ""} onChange={(e) => maj({ website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.consentement} onChange={(e) => maj({ consentement: e.target.checked })} className="mt-1 h-5 w-5" />
          J'accepte que l'annonce soit publiée après vérification (sans mes coordonnées) et que CITURBAREA me contacte à son sujet (loi 09-08). Les informations déclarées sont exactes.
        </label>

        {err && <p className="text-sm text-rose-600" role="alert">{err}</p>}
        <button type="submit" disabled={etat === "envoi"} className="min-h-[48px] rounded-lg bg-[#C9A227] px-5 text-base font-bold text-[#0B1B3A] disabled:opacity-60">
          {etat === "envoi" ? "Envoi…" : "Déposer mon terrain"}
        </button>
      </form>
    </main>
  );
}
