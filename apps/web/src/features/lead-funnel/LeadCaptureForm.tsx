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
}

type Status = "idle" | "submitting" | "success" | "error";

interface CaptureResponse {
  ok: boolean;
  leadId?: string;
  scoreInitial?: number;
  message?: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  source,
  porteType,
  withEmail = false,
  onCaptured,
  compact = false,
  className,
}) => {
  const t = useT();
  const { lang } = useLang();
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [projet, setProjet] = useState("");
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
      try {
        const res = await fetch("/api/lead-funnel/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: nom.trim(),
            telephone: tel.trim(),
            email: email.trim() || undefined,
            projetType: porteType,
            source: source || "WEB_HERO",
            lang,
            pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
            meta: { projetLibre: projet.trim() || undefined },
          }),
        });
        const json: CaptureResponse = await res.json();
        if (!res.ok || !json.ok || !json.leadId) {
          setErrMsg(json.message || t("lead.err.generic"));
          setStatus("error");
          return;
        }
        setLeadId(json.leadId);
        setScore(json.scoreInitial || 0);
        setStatus("success");
        onCaptured?.(json.leadId, json.scoreInitial || 0);
      } catch (err: any) {
        setErrMsg(err?.message || t("lead.err.generic"));
        setStatus("error");
      }
    },
    [nom, tel, email, projet, phoneValid, porteType, source, lang, t, onCaptured],
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
        <p className="mt-2 text-xs text-emerald-800">
          {t("lead.success.ref")}: <code className="rounded bg-white/60 px-2 py-0.5">{leadId}</code>
        </p>
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
