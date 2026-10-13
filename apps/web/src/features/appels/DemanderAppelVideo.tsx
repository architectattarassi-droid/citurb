/**
 * <DemanderAppelVideo contexte objetId invites /> — bouton unique « Demander
 * un appel vidéo », partout où deux parties travaillent ensemble.
 *
 * Le bouton n'appelle personne : il ouvre un formulaire de DEMANDE (1 à 3
 * créneaux ou « dès que possible », durée, audio seul, message). La salle
 * n'existe qu'une fois que toutes les personnes invitées ont accepté un même
 * créneau (functions/_lib/appels.ts). Contrat : docs/architecture/contrat-appels-video.md.
 *
 * `porte` : qui demande — "public" (visiteur sans compte : nom + e-mail ou
 * téléphone), "admin" (back-office), "pro" (espace Cercles), "membre" (espace projet).
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { apiAppels, type Contexte, type Invite, type PorteCreation, type ReponseCreation } from "./api";
import { bornesSaisie, dateHeure, demainDixHeures, fuseauLocal, heureLocaleDiffere, localVersIso } from "./heures";
import { erreurLisible, TEXTES, type LangueAppel } from "./textes";

export function useLangueAppel(force?: LangueAppel): LangueAppel {
  const { lang } = useLang();
  return force ?? (lang === "ar" ? "ar" : "fr");
}

export const BTN = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_OR = `${BTN} bg-[#C9A227] text-[#0B1B3A] hover:bg-[#b8931f]`;
export const BTN_NAVY = `${BTN} bg-[#0B1B3A] text-white hover:bg-[#13285a]`;
export const BTN_CONTOUR = `${BTN} border border-[#0B1B3A]/30 bg-white text-[#0B1B3A] hover:bg-slate-50`;
export const CHAMP = "mt-1 block w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base text-[#0B1B3A] focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40";

export function IconeCamera({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3z" />
    </svg>
  );
}

type Props = {
  contexte: Contexte;
  objetId: string;
  invites: Invite[];
  /** Réunion : personnes proposées, cochées par le demandeur (s'ajoutent à `invites`). */
  candidats?: { invite: Invite; nom: string }[];
  /** Nom(s) affiché(s) : « avec Atlas Menuiserie ». */
  avecNom?: string;
  /** Sujet lisible joint à la demande (produit, jalon, dossier…). */
  sujet?: string;
  porte?: PorteCreation;
  langue?: LangueAppel;
  /** Libellé du bouton (par défaut « Demander un appel vidéo »). */
  libelle?: string;
  variante?: "or" | "navy" | "contour" | "lien";
  className?: string;
  onCree?: (r: ReponseCreation) => void;
};

type Formulaire = {
  mode: "creneaux" | "dqp"; creneaux: string[]; dureeMin: number; audioSeul: boolean; message: string;
  nom: string; email: string; telephone: string; consentement: boolean; website: string;
};

export default function DemanderAppelVideo({ contexte, objetId, invites, candidats, avecNom, sujet, porte = "public", langue, libelle, variante = "or", className = "", onCree }: Props) {
  const l = useLangueAppel(langue);
  const t = TEXTES[l];
  const [ouvert, setOuvert] = useState(false);
  const classe = variante === "lien" ? "inline-flex items-center gap-1 font-semibold text-[#0B1B3A] underline underline-offset-2" : variante === "navy" ? BTN_NAVY : variante === "contour" ? BTN_CONTOUR : BTN_OR;
  return (
    <>
      <button type="button" className={`${classe} ${className}`} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        <IconeCamera />{libelle ?? t.demander}
      </button>
      {ouvert && <Dialogue {...{ contexte, objetId, invites, candidats, avecNom, sujet, porte, l, onCree }} onFermer={() => setOuvert(false)} />}
    </>
  );
}

function Dialogue({ contexte, objetId, invites, candidats = [], avecNom, sujet, porte, l, onCree, onFermer }: Omit<Props, "langue" | "libelle" | "variante" | "className"> & { porte: PorteCreation; l: LangueAppel; onFermer: () => void }) {
  const t = TEXTES[l];
  const titreId = useId();
  const boite = useRef<HTMLDivElement>(null);
  const [f, setF] = useState<Formulaire>({ mode: "creneaux", creneaux: [demainDixHeures()], dureeMin: 30, audioSeul: false, message: "", nom: "", email: "", telephone: "", consentement: false, website: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<ReponseCreation | null>(null);
  const [copie, setCopie] = useState(false);
  const [coches, setCoches] = useState<number[]>(candidats.length && !invites.length ? [0] : []);
  const bornes = bornesSaisie();
  const maj = <K extends keyof Formulaire>(k: K, v: Formulaire[K]) => setF((x) => ({ ...x, [k]: v }));

  const fermer = useRef(onFermer);
  fermer.current = onFermer;
  // Fenêtre modale accessible : Échap ferme, focus dans la boîte, fond figé.
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.querySelector<HTMLElement>("input, button, textarea, select")?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer.current();
      if (e.key === "Tab" && boite.current) {
        const l = Array.from(boite.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([tabindex='-1']), select, textarea"));
        if (!l.length) return;
        if (e.shiftKey && document.activeElement === l[0]) { e.preventDefault(); l[l.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === l[l.length - 1]) { e.preventDefault(); l[0].focus(); }
      }
    };
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("keydown", touche); document.body.style.overflow = debordement; avant?.focus?.(); };
  }, []);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    const creneaux = f.mode === "dqp" ? [] : f.creneaux.map(localVersIso).filter((x): x is string => !!x);
    if (f.mode === "creneaux" && !creneaux.length) { setErreur(t.erreurs.creneaux_invalides); return; }
    const tous = [...invites, ...coches.map((i) => candidats[i].invite)];
    if (!tous.length) { setErreur(t.choisirInvites); return; }
    setEnvoi(true);
    const corps: Record<string, unknown> = {
      contexte, objetId, invites: tous, sujet: sujet || undefined, creneaux, desQuePossible: f.mode === "dqp", dureeMin: f.dureeMin,
      audioSeul: f.audioSeul, message: f.message || undefined, langue: l,
      ...(porte === "public" ? { demandeur: { nom: f.nom, email: f.email || undefined, telephone: f.telephone || undefined, langue: l }, consentement: f.consentement, website: f.website } : {}),
    };
    const r = await apiAppels.creer(porte, corps);
    setEnvoi(false);
    if (!r.ok) { setErreur(erreurLisible(t, r.error)); return; }
    setFait(r.data);
    onCree?.(r.data);
  };

  const lienSuivi = fait?.jeton ? `${l === "ar" ? "/ar" : ""}/appel/${fait.jeton}` : null;
  const lienAbsolu = lienSuivi ? `${window.location.origin}${lienSuivi}` : "";

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#0B1B3A]/60 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div ref={boite} role="dialog" aria-modal="true" aria-labelledby={titreId} dir={l === "ar" ? "rtl" : "ltr"} lang={l}
        className="relative max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-start text-[#0B1B3A] shadow-2xl sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/20 text-[#0B1B3A]"><IconeCamera className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 id={titreId} className="m-0 text-lg font-bold">{t.titreDialogue}</h2>
            {avecNom && <p className="m-0 text-sm text-slate-600">{t.avec(avecNom)}{sujet ? ` · ${sujet}` : ""}</p>}
          </div>
          <button type="button" onClick={onFermer} className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-slate-100" aria-label={t.fermer}>×</button>
        </div>

        {fait ? (
          <div className="mt-4" role="status">
            <p className="m-0 text-base font-bold text-emerald-800">✓ {t.envoyee}</p>
            <p className="mt-2 text-sm text-slate-700">{t.envoyeeTexte}</p>
            {fait.messageMasque && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{t.messageMasque}</p>}
            {lienSuivi && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="m-0 text-sm text-slate-700">{t.lienPerso}</p>
                <p className="mt-1 break-all text-xs text-slate-600" dir="ltr">{lienAbsolu}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={lienSuivi} className={BTN_NAVY} style={{ textDecoration: "none" }}>{t.suivre}</Link>
                  <button type="button" className={BTN_CONTOUR} onClick={() => { void navigator.clipboard?.writeText(lienAbsolu).then(() => setCopie(true)); }}>{copie ? t.copie : t.copier}</button>
                  <a className={BTN_CONTOUR} style={{ textDecoration: "none" }} href={`https://wa.me/?text=${encodeURIComponent(`${t.suivre} — CITURBAREA : ${lienAbsolu}`)}`} target="_blank" rel="noopener noreferrer">{t.surWhatsApp}</a>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end"><button type="button" className={BTN_CONTOUR} onClick={onFermer}>{t.fermer}</button></div>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-4 grid gap-4" noValidate>
            <p className="m-0 rounded-lg bg-[#0B1B3A]/5 p-3 text-sm leading-relaxed">{t.principe}</p>

            {candidats.length > 0 && (
              <fieldset className="m-0 grid gap-1 border-0 p-0">
                <legend className="mb-1 text-sm font-bold">{t.inviter}</legend>
                {candidats.map((c, i) => (
                  <label key={i} className="flex min-h-[40px] items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#0B1B3A]" checked={coches.includes(i)} onChange={(e) => setCoches((x) => (e.target.checked ? [...x, i] : x.filter((y) => y !== i)))} />
                    {c.nom}
                  </label>
                ))}
              </fieldset>
            )}

            <fieldset className="m-0 grid gap-2 border-0 p-0">
              <legend className="mb-1 text-sm font-bold">{t.quand}</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {(["creneaux", "dqp"] as const).map((m) => (
                  <label key={m} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${f.mode === m ? "border-[#C9A227] bg-[#C9A227]/10" : "border-slate-300"}`}>
                    <input type="radio" name="mode" checked={f.mode === m} onChange={() => maj("mode", m)} className="h-4 w-4 accent-[#0B1B3A]" />
                    {m === "creneaux" ? t.creneaux : t.desQuePossible}
                  </label>
                ))}
              </div>
              {f.mode === "dqp" ? <p className="m-0 text-xs text-slate-600">{t.desQuePossibleAide}</p> : (
                <div className="grid gap-2">
                  {f.creneaux.map((c, i) => {
                    const iso = localVersIso(c);
                    return (
                      <div key={i}>
                        <label className="text-xs font-semibold text-slate-700">{t.creneau(i + 1)}
                          <div className="flex items-center gap-2">
                            <input type="datetime-local" className={CHAMP} dir="ltr" min={bornes.min} max={bornes.max} step={300} value={c} required
                              onChange={(e) => maj("creneaux", f.creneaux.map((x, j) => (j === i ? e.target.value : x)))} />
                            {f.creneaux.length > 1 && <button type="button" className="mt-1 min-h-[44px] shrink-0 rounded-lg px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => maj("creneaux", f.creneaux.filter((_, j) => j !== i))}>{t.retirer}</button>}
                          </div>
                        </label>
                        {iso && heureLocaleDiffere(iso) && <p className="m-0 mt-1 text-xs text-slate-600">= {dateHeure(iso, l)} ({t.heureMaroc})</p>}
                      </div>
                    );
                  })}
                  {f.creneaux.length < 3 && <button type="button" className="justify-self-start text-sm font-semibold text-[#0B1B3A] underline underline-offset-2" onClick={() => maj("creneaux", [...f.creneaux, demainDixHeures(Date.now() + 24 * 3600_000 * f.creneaux.length)])}>+ {t.ajouterCreneau}</button>}
                  <p className="m-0 text-xs text-slate-500">{t.votreHeure(fuseauLocal())}</p>
                </div>
              )}
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">{t.duree}
                <select className={CHAMP} value={f.dureeMin} onChange={(e) => maj("dureeMin", Number(e.target.value))}>
                  {[15, 30, 45, 60, 90].map((n) => <option key={n} value={n}>{t.minutes(n)}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" className="mb-1 h-5 w-5 shrink-0 accent-[#0B1B3A]" checked={f.audioSeul} onChange={(e) => maj("audioSeul", e.target.checked)} />
                <span>{t.audioSeul}</span>
              </label>
            </div>

            <label className="text-sm font-semibold">{t.message}
              <textarea className={`${CHAMP} min-h-[88px] py-2`} maxLength={1000} value={f.message} onChange={(e) => maj("message", e.target.value)} />
              <span className="mt-1 block text-xs font-normal text-slate-500">{t.messageAide}</span>
            </label>

            {porte === "public" && (
              <fieldset className="m-0 grid gap-3 border-0 p-0">
                <legend className="mb-1 text-sm font-bold">{t.vous}</legend>
                <label className="text-sm font-semibold">{t.nom}<input className={CHAMP} value={f.nom} onChange={(e) => maj("nom", e.target.value)} autoComplete="name" required maxLength={80} /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">{t.email}<input className={CHAMP} type="email" dir="ltr" value={f.email} onChange={(e) => maj("email", e.target.value)} autoComplete="email" /></label>
                  <label className="text-sm font-semibold">{t.telephone}<input className={CHAMP} type="tel" dir="ltr" inputMode="tel" value={f.telephone} onChange={(e) => maj("telephone", e.target.value)} autoComplete="tel" /></label>
                </div>
                <p className="m-0 text-xs text-slate-500">{t.contactAide}</p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#0B1B3A]" checked={f.consentement} onChange={(e) => maj("consentement", e.target.checked)} required />
                  <span>{t.consentement}</span>
                </label>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} value={f.website} onChange={(e) => maj("website", e.target.value)} />
              </fieldset>
            )}

            {erreur && <p className="m-0 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{erreur}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={BTN_CONTOUR} onClick={onFermer}>{t.annuler}</button>
              <button type="submit" className={BTN_OR} disabled={envoi}>{envoi ? t.envoi : t.envoyer}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
