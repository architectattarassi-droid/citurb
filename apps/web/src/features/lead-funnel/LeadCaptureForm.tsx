/**
 * LeadCaptureForm.tsx
 *
 * Formulaire public de capture lead à 3 champs (nom, téléphone, projet).
 *
 * Soumission : POST /api/lead-funnel/capture
 * Succès : confirmation inline + contact direct (WhatsApp, appel).
 *
 * Mobile-first. RTL-ready (utilise `dir` du document).
 * i18n : clés `lead.*` — voir INTEGRATION.md pour le DICT à fusionner.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import { useT, useLang } from "../../i18n/i18n";
import { captureLead, currentUtm, leadKey, qualifierLead, sanitizeWizard, telephoneEnvoyable, type CaptureBody } from "./leadBridge";
import { lienTel, lienWhatsApp } from "../../config/contact";
import { evenement } from "../../lib/marketing";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { INDICATIFS, numeroComplet } from "./indicatifs";

const QUESTIONS = [
  { cle: "terrain", options: ["TITRE", "EN_COURS", "CHERCHE"] },
  { cle: "delai", options: ["MOINS_6", "6_12", "PLUS_12", "INFO"] },
  { cle: "residence", options: ["MAROC", "ETRANGER"] },
] as const;

/** Types de projet du formulaire générique → porte du parcours CITURBAREA. */
const TYPES_PROJET = [
  { id: "maison", porte: "P1" },
  { id: "renovation", porte: "P1" },
  { id: "immeuble", porte: "P2" },
  { id: "cle_en_main", porte: "P3" },
  { id: "terrain", porte: "P4" },
  { id: "expertise", porte: "P5" },
  { id: "professionnel", porte: "P6" },
] as const;

export interface LeadCaptureFormProps {
  /** Source page-context (passée au backend pour traçabilité). */
  source?: string;
  /** Type de porte pré-sélectionné (P1..P6). */
  porteType?: string;
  /** Affiche le champ email optionnel. Défaut : false. */
  withEmail?: boolean;
  /** Callback après succès. */
  onCaptured?: (leadId: string, score: number) => void;
  /** Compact (form inline / hero). */
  compact?: boolean;
  className?: string;
  /** Valeurs initiales (pré-remplissage depuis un draft de porte). */
  initial?: { nom?: string; telephone?: string; email?: string; projet?: string };
  /** Champs de capture supplémentaires (budget, ville, surface, délai…). */
  extraCapture?: () => Partial<CaptureBody>;
  /** Qualification de porte jointe en meta.wizard (filtrée et bornée par leadBridge). */
  extraMeta?: Record<string, unknown>;
  /**
   * « whatsapp » : palier 1 de l'entonnoir (prénom + numéro WhatsApp avec indicatif,
   * e-mail replié, projet joint sans zone de texte), puis palier 2 (3 questions à un clic).
   */
  variante?: "standard" | "whatsapp";
}

type Status = "idle" | "submitting" | "success" | "error";

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  source,
  porteType,
  withEmail = false,
  onCaptured,
  compact = false,
  className,
  initial,
  extraCapture,
  extraMeta,
  variante = "standard",
}) => {
  const wa = variante === "whatsapp";
  const t = useT();
  const { lang } = useLang();
  const [nom, setNom] = useState(initial?.nom || "");
  const [tel, setTel] = useState(initial?.telephone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [projet, setProjet] = useState(initial?.projet || "");
  // Formulaire générique (sans porte imposée) : type de projet et ville,
  // facultatifs, pour qualifier le lead dès le premier contact.
  const generique = !porteType;
  const [typeChoisi, setTypeChoisi] = useState("");
  const [ville, setVille] = useState("");
  const [queued, setQueued] = useState(false);
  const [hp, setHp] = useState(""); // pot de miel anti-robots
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const ids = useId();
  const [indicatif, setIndicatif] = useState("+212");
  const [whatsapp, setWhatsapp] = useState(true);
  const [voirEmail, setVoirEmail] = useState(false);
  const [capture, setCapture] = useState<{ leadId: string; cle: string } | null>(null);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const telComplet = wa ? numeroComplet(indicatif, tel) : tel;
  // Marocain ou international (diaspora MRE) : même règle que la Pages Function.
  const phoneValid = useMemo(() => !!telephoneEnvoyable(telComplet), [telComplet]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrMsg("");
      if (nom.trim().length < 2) {
        setErrMsg(t("lead.err.nom"));
        setStatus("error");
        return;
      }
      if (!phoneValid) {
        setErrMsg(t("lead.err.tel"));
        setStatus("error");
        return;
      }
      setStatus("submitting");
      // Tout part par leadBridge : file de reprise si le réseau manque,
      // idempotence par porte + téléphone.
      const wizard = extraMeta ? sanitizeWizard(extraMeta) : undefined;
      const body: CaptureBody = {
        source: source || "WEB_HERO",
        lang,
        pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
        utm: currentUtm(),
        ...(extraCapture?.() || {}),
        ...(generique && ville.trim() ? { ville: ville.trim() } : {}),
        nom: nom.trim(),
        telephone: telComplet.trim(),
        email: email.trim() || undefined,
        projetType: porteType || TYPES_PROJET.find((x) => x.id === typeChoisi)?.porte,
        meta: {
          projetLibre: projet.trim() || undefined,
          ...(wa && whatsapp ? { whatsapp: true } : {}),
          ...(generique && typeChoisi ? { typeProjet: typeChoisi } : {}),
          ...(wizard ? { wizard } : {}),
        },
        website: hp || undefined,
      };
      const out = await captureLead(leadKey(body.projetType, body.telephone), body);
      if (out.status === "invalid") {
        setErrMsg(
          out.code === "phone_invalid"
            ? t("lead.err.tel")
            : out.code === "nom_invalid"
              ? t("lead.err.nom")
              : t("lead.err.generic"),
        );
        setStatus("error");
        return;
      }
      const id = out.status === "sent" || out.status === "already" ? out.leadId || "" : "";
      const sc = out.status === "sent" ? out.score || 0 : 0;
      if (out.status === "sent" && out.cle) setCapture({ leadId: out.leadId, cle: out.cle });
      // Conversion Google : envoyée par captureLead (leadBridge), pour toutes les portes.
      evenement("formulaire_envoye", { source: body.source, porte: body.projetType, whatsapp: wa && whatsapp });
      setQueued(out.status === "queued");
      setStatus("success");
      onCaptured?.(id, sc);
    },
    [nom, telComplet, email, projet, hp, phoneValid, porteType, source, lang, t, onCaptured, extraCapture, extraMeta, generique, typeChoisi, ville, wa, whatsapp],
  );

  const messageWa = `Bonjour, je viens de faire mon chiffrage sur citurbarea.com${projet.trim() ? ` : ${projet.trim()}` : ""}. Je souhaite recevoir le devis détaillé.`;
  const repondre = (cle: string, valeur: string) => {
    const r = { ...reponses, [cle]: valeur };
    setReponses(r);
    evenement("palier2_repondu", { question: cle, reponse: valeur });
    if (capture) void qualifierLead(capture.leadId, capture.cle, { [cle]: valeur, ...(cle === "residence" && valeur === "ETRANGER" ? { pays: INDICATIFS.find((x) => x.code === indicatif)?.pays } : {}) });
  };

  if (status === "success" && wa) {
    const fini = QUESTIONS.every((q) => reponses[q.cle]);
    return (
      <div className={"rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 " + (className || "")} role="status" aria-live="polite">
        <div className="text-lg font-semibold">{t("lead.success.title")}</div>
        <p className="mt-1 text-sm">{t("lead.wa.success")}</p>
        {queued && <p className="mt-2 text-xs text-emerald-800">{t("lead.success.queued")}</p>}
        <a href={lienWhatsApp(messageWa)} target="_blank" rel="noopener noreferrer" onClick={() => evenement("whatsapp_click", { emplacement: "apres_lead" })}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          {t("lead.wa.ecrire")}
        </a>
        <a href="/rendez-vous" onClick={() => evenement("cta_rdv", { emplacement: "apres_lead" })}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
          {t("lead.wa.rdv")}
        </a>
        {capture && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-white p-4 text-slate-800">
            <p className="text-sm font-semibold text-slate-900">{fini ? t("lead.q.merci") : t("lead.q.titre")}</p>
            {QUESTIONS.map((q) => (
              <fieldset key={q.cle} className="mt-3">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t(`lead.q.${q.cle}`)}</legend>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const actif = reponses[q.cle] === o;
                    return (
                      <button key={o} type="button" aria-pressed={actif} onClick={() => repondre(q.cle, o)}
                        className={"min-h-11 rounded-full border px-3 text-sm " + (actif ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500")}>
                        {t(`lead.q.${q.cle}.${o}`)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className={
          "rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 " +
          (className || "")
        }
        role="status"
        aria-live="polite"
      >
        <div className="text-lg font-semibold">{t("lead.success.title")}</div>
        <p className="mt-1 text-sm">{t("lead.success.msg")}</p>
        {queued && <p className="mt-2 text-xs text-emerald-800">{t("lead.success.queued")}</p>}
        {/* Ni référence interne ni score : un contact direct à la place. */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={lienWhatsApp(`Bonjour, je viens d'envoyer une demande sur citurbarea.com (${nom.trim()}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t("lead.success.whatsapp")}
          </a>
          <a
            href={lienTel}
            className="inline-flex min-h-11 items-center rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            {t("lead.success.call")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        "w-full max-w-md " +
        (compact ? "" : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm ") +
        (className || "")
      }
      noValidate
    >
      <div className="space-y-3">
        <div>
          <label htmlFor={`${ids}-nom`} className="mb-1 block text-sm font-medium text-slate-700">
            {wa ? t("lead.wa.prenom") : t("lead.field.nom")}
          </label>
          <input
            id={`${ids}-nom`}
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t("lead.placeholder.nom")}
          />
        </div>

        <div>
          <label htmlFor={`${ids}-tel`} className="mb-1 block text-sm font-medium text-slate-700">
            {wa ? t("lead.wa.tel") : t("lead.field.tel")}
          </label>
          <div className={wa ? "flex gap-2" : ""}>
          {wa && (
            <select aria-label={t("lead.wa.indicatif")} value={indicatif} onChange={(e) => setIndicatif(e.target.value)}
              className="min-h-[46px] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-base">
              {INDICATIFS.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
            </select>
          )}
          <input
            id={`${ids}-tel`}
            type="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder={wa ? (indicatif === "+212" ? "6 12 34 56 78" : "") : "+212 6 12 34 56 78"}
            aria-invalid={tel ? !phoneValid : undefined}
            aria-describedby={tel && !phoneValid ? `${ids}-tel-err` : undefined}
            className={
              "w-full rounded-md border px-3 py-2.5 text-base focus:outline-none focus:ring-2 " +
              (tel && !phoneValid
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-200")
            }
          />
          </div>
          {tel && !phoneValid && (
            <p id={`${ids}-tel-err`} className="mt-1 text-xs text-rose-600">{t("lead.err.tel_format")}</p>
          )}
          {wa && (
            <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
              {t("lead.wa.check")}
            </label>
          )}
        </div>

        {wa && withEmail && !voirEmail && (
          <button type="button" onClick={() => setVoirEmail(true)} className="text-sm font-semibold text-slate-600 underline" style={{ background: "none", border: 0, padding: 0, boxShadow: "none" }}>
            {t("lead.wa.addEmail")}
          </button>
        )}

        {withEmail && (!wa || voirEmail) && (
          <div>
            <label htmlFor={`${ids}-email`} className="mb-1 block text-sm font-medium text-slate-700">
              {t("lead.field.email")} <span className="text-slate-400">(optionnel)</span>
            </label>
            <input
              id={`${ids}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="vous@exemple.ma"
            />
          </div>
        )}

        {generique && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-type`} className="mb-1 block text-sm font-medium text-slate-700">
                {t("lead.field.type")} <span className="text-slate-400">({t("lead.porte.optional")})</span>
              </label>
              <select
                id={`${ids}-type`}
                value={typeChoisi}
                onChange={(e) => setTypeChoisi(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">{t("lead.type.choose")}</option>
                {TYPES_PROJET.map((x) => (
                  <option key={x.id} value={x.id}>{t(`lead.type.${x.id}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${ids}-ville`} className="mb-1 block text-sm font-medium text-slate-700">
                {t("lead.field.ville")} <span className="text-slate-400">({t("lead.porte.optional")})</span>
              </label>
              <input
                id={`${ids}-ville`}
                type="text"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                autoComplete="address-level2"
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder={t("lead.placeholder.ville")}
              />
            </div>
          </div>
        )}

        {!wa && <div>
          <label htmlFor={`${ids}-projet`} className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.field.projet")}
          </label>
          <textarea
            id={`${ids}-projet`}
            value={projet}
            onChange={(e) => setProjet(e.target.value)}
            rows={compact ? 2 : 3}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t("lead.placeholder.projet")}
          />
        </div>}

        {/* Pot de miel : hors écran, hors tabulation, ignoré des lecteurs
            d'écran. Un humain le laisse vide ; rempli → capture ignorée. */}
        <input
          type="text"
          name="website"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={HONEYPOT_STYLE}
        />

        {status === "error" && errMsg && (
          <p className="text-sm text-rose-600" role="alert">
            {errMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? t("lead.btn.sending") : wa ? t("lead.wa.btn") : t("lead.btn.send")}
        </button>
        {wa && <p className="-mt-1 text-center text-xs font-semibold text-slate-600">{t("lead.wa.sous")}</p>}

        <p className="text-center text-[11px] text-slate-500">
          {t("lead.legal")}
        </p>
      </div>
    </form>
  );
};

export default LeadCaptureForm;
