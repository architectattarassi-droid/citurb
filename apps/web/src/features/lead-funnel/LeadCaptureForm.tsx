/**
 * LeadCaptureForm.tsx
 *
 * Formulaire public de capture lead à 3 champs (nom, téléphone, projet).
 *
 * Soumission : POST /api/lead-funnel/capture
 * Succès : state inline avec leadId visible + reset bouton.
 *
 * Mobile-first. RTL-ready (utilise `dir` du document).
 * i18n : clés `lead.*` — voir INTEGRATION.md pour le DICT à fusionner.
 */

import React, { useCallback, useMemo, useState } from "react";
import { useT, useLang } from "../../i18n/i18n";
import { captureLead, currentUtm, leadKey, sanitizeWizard, type CaptureBody } from "./leadBridge";

const RE_PHONE_MA = /^(\+212|0)[567]\d{8}$/;

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
}) => {
  const t = useT();
  const { lang } = useLang();
  const [nom, setNom] = useState(initial?.nom || "");
  const [tel, setTel] = useState(initial?.telephone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [projet, setProjet] = useState(initial?.projet || "");
  const [queued, setQueued] = useState(false);
  const [hp, setHp] = useState(""); // pot de miel anti-robots
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");
  const [score, setScore] = useState<number>(0);

  const phoneValid = useMemo(() => {
    if (!tel) return false;
    return RE_PHONE_MA.test(tel.replace(/[\s\-]/g, ""));
  }, [tel]);

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
        nom: nom.trim(),
        telephone: tel.trim(),
        email: email.trim() || undefined,
        projetType: porteType,
        meta: { projetLibre: projet.trim() || undefined, ...(wizard ? { wizard } : {}) },
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
      setLeadId(id);
      setScore(sc);
      setQueued(out.status === "queued");
      setStatus("success");
      onCaptured?.(id, sc);
    },
    [nom, tel, email, projet, hp, phoneValid, porteType, source, lang, t, onCaptured, extraCapture, extraMeta],
  );

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
        {leadId && (
          <p className="mt-2 text-xs text-emerald-800">
            {t("lead.success.ref")}: <code className="rounded bg-white/60 px-2 py-0.5">{leadId}</code>
          </p>
        )}
        {score > 0 && (
          <p className="mt-1 text-xs text-emerald-700">
            {t("lead.success.score")}: <b>{score}/100</b>
          </p>
        )}
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
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.field.nom")}
          </label>
          <input
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
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.field.tel")}
          </label>
          <input
            type="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+212 6 12 34 56 78"
            aria-invalid={tel ? !phoneValid : undefined}
            className={
              "w-full rounded-md border px-3 py-2.5 text-base focus:outline-none focus:ring-2 " +
              (tel && !phoneValid
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-200")
            }
          />
          {tel && !phoneValid && (
            <p className="mt-1 text-xs text-rose-600">{t("lead.err.tel_format")}</p>
          )}
        </div>

        {withEmail && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("lead.field.email")} <span className="text-slate-400">(optionnel)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="vous@exemple.ma"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("lead.field.projet")}
          </label>
          <textarea
            value={projet}
            onChange={(e) => setProjet(e.target.value)}
            rows={compact ? 2 : 3}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t("lead.placeholder.projet")}
          />
        </div>

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
          style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
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
          {status === "submitting" ? t("lead.btn.sending") : t("lead.btn.send")}
        </button>

        <p className="text-center text-[11px] text-slate-500">
          {t("lead.legal")}
        </p>
      </div>
    </form>
  );
};

export default LeadCaptureForm;
