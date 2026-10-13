/**
 * <EcrireMessage contexte objetId invites /> — « Écrire un message » à un pro,
 * un fournisseur ou au cabinet, depuis l'endroit où l'on se trouve (mêmes
 * props que <DemanderAppelVideo />). Le message passe par CITURBAREA : les
 * coordonnées sont masquées ; un visiteur sans compte reçoit un lien
 * personnel vers le fil et un lien vers sa boîte de réception.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import type { Contexte, Invite } from "../appels/api";
import { BTN_CONTOUR, BTN_NAVY, BTN_OR, CHAMP, useLangueAppel } from "../appels/DemanderAppelVideo";
import type { LangueAppel } from "../appels/textes";
import { apiMessages, type CreationFil, type PorteMsg } from "./api";
import { erreurMsg, TEXTES_MSG } from "./textes";

export function IconeMessage({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type Props = {
  contexte: Contexte; objetId: string; invites: Invite[]; avecNom?: string; sujet?: string;
  porte?: PorteMsg; langue?: LangueAppel; libelle?: string; variante?: "or" | "navy" | "contour" | "lien"; className?: string;
  onCree?: (r: CreationFil) => void;
};

export default function EcrireMessage(props: Props) {
  const l = useLangueAppel(props.langue);
  const t = TEXTES_MSG[l];
  const [ouvert, setOuvert] = useState(false);
  const v = props.variante ?? "contour";
  const classe = v === "lien" ? "inline-flex items-center gap-1 font-semibold text-[#0B1B3A] underline underline-offset-2" : v === "navy" ? BTN_NAVY : v === "or" ? BTN_OR : BTN_CONTOUR;
  return (
    <>
      <button type="button" className={`${classe} ${props.className ?? ""}`} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        <IconeMessage />{props.libelle ?? t.ecrire}
      </button>
      {ouvert && <Dialogue {...props} l={l} onFermer={() => setOuvert(false)} />}
    </>
  );
}

function Dialogue({ contexte, objetId, invites, avecNom, sujet, porte = "public", l, onCree, onFermer }: Props & { l: LangueAppel; onFermer: () => void }) {
  const t = TEXTES_MSG[l];
  const titreId = useId();
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;
  const [f, setF] = useState({ texte: "", nom: "", email: "", telephone: "", consentement: false, website: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<CreationFil | null>(null);
  const [copie, setCopie] = useState(false);
  const maj = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.querySelector<HTMLElement>("textarea, input, button")?.focus();
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") fermer.current(); };
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("keydown", touche); document.body.style.overflow = debordement; avant?.focus?.(); };
  }, []);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!f.texte.trim()) { setErreur(t.erreurs.message_vide); return; }
    setEnvoi(true);
    const r = await apiMessages.creer(porte, {
      contexte, objetId, invites, sujet: sujet || undefined, texte: f.texte, langue: l,
      ...(porte === "public" ? { demandeur: { nom: f.nom, email: f.email || undefined, telephone: f.telephone || undefined, langue: l }, consentement: f.consentement, website: f.website } : {}),
    });
    setEnvoi(false);
    if (!r.ok) { setErreur(erreurMsg(l, r.error)); return; }
    setFait(r.data);
    onCree?.(r.data);
  };

  const prefixe = l === "ar" ? "/ar" : "";
  const lienFil = fait?.jeton ? `${prefixe}/messages/${fait.jeton}` : null;
  const lienBoite = fait?.boite ? `${prefixe}/messages/boite/${fait.boite}` : null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#0B1B3A]/60 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div ref={boite} role="dialog" aria-modal="true" aria-labelledby={titreId} dir={l === "ar" ? "rtl" : "ltr"} lang={l}
        className="relative max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-start text-[#0B1B3A] shadow-2xl sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/20"><IconeMessage className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 id={titreId} className="m-0 text-lg font-bold">{t.titre}</h2>
            {avecNom && <p className="m-0 text-sm text-slate-600">{t.avec(avecNom)}{sujet ? ` · ${sujet}` : ""}</p>}
          </div>
          <button type="button" onClick={onFermer} className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:bg-slate-100" aria-label={t.fermer}>×</button>
        </div>

        {fait ? (
          <div className="mt-4 grid gap-3" role="status">
            <p className="m-0 text-base font-bold text-emerald-800">✓ {t.envoye}</p>
            <p className="m-0 text-sm text-slate-700">{t.envoyeTexte}</p>
            {fait.messageMasque && <p className="m-0 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{t.masque}</p>}
            {lienFil && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="m-0 text-sm text-slate-700">{t.lienPerso}</p>
                <p className="mt-1 break-all text-xs text-slate-600" dir="ltr">{window.location.origin}{lienFil}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={lienFil} className={BTN_NAVY} style={{ textDecoration: "none" }}>{t.ouvrirFil}</Link>
                  {lienBoite && <Link to={lienBoite} className={BTN_CONTOUR} style={{ textDecoration: "none" }}>{t.maBoite}</Link>}
                  <button type="button" className={BTN_CONTOUR} onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}${lienFil}`).then(() => setCopie(true)); }}>{copie ? t.copie : t.copier}</button>
                </div>
              </div>
            )}
            <div className="flex justify-end"><button type="button" className={BTN_CONTOUR} onClick={onFermer}>{t.fermer}</button></div>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-4 grid gap-4" noValidate>
            <p className="m-0 rounded-lg bg-[#0B1B3A]/5 p-3 text-sm leading-relaxed">{t.principe}</p>
            <label className="text-sm font-semibold">{t.message}
              <textarea className={`${CHAMP} min-h-[120px] py-2`} maxLength={4000} value={f.texte} onChange={(e) => maj("texte", e.target.value)} required />
            </label>
            {porte === "public" && (
              <fieldset className="m-0 grid gap-3 border-0 p-0">
                <legend className="mb-1 text-sm font-bold">{t.vous}</legend>
                <label className="text-sm font-semibold">{t.nom}<input className={CHAMP} value={f.nom} onChange={(e) => maj("nom", e.target.value)} autoComplete="name" maxLength={80} required /></label>
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
