/**
 * PaymentSummary — bloc paiements (total / versés / dus + jalons).
 *
 * Mobile-first : KPIs en colonne sur mobile, en ligne sur desktop.
 */

import React from "react";
import { PaymentsBlock } from "./mon-parcours.api";
import { useT } from "../../i18n/i18n";

interface Props {
  payments: PaymentsBlock;
}

const PaymentSummary: React.FC<Props> = ({ payments }) => {
  const t = useT();

  const money = (v: number): string => {
    const formatted = Number(v ?? 0).toLocaleString("fr-FR", {
      maximumFractionDigits: 0,
    });
    return `${formatted} ${t("common.payment.currency")}`;
  };

  const fmtDate = (iso: string | null): string => {
    if (!iso) return t("common.payment.no_date");
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const total = Math.max(0, payments.totalContractMAD);
  const paid = Math.max(0, payments.paidMAD);
  const due = Math.max(0, payments.dueMAD);
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <section
      aria-label={t("common.payment.aria")}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          {t("common.payment.title")}
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {t("common.payment.pct_label", { pct })}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Kpi label={t("common.payment.kpi_total")} value={money(total)} tone="navy" />
        <Kpi label={t("common.payment.kpi_paid")} value={money(paid)} tone="emerald" />
        <Kpi label={t("common.payment.kpi_due")} value={money(due)} tone={due > 0 ? "amber" : "slate"} />
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {payments.schedule.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("common.payment.schedule_title")}
          </h4>
          <ul className="divide-y divide-slate-100">
            {payments.schedule.map((s, i) => (
              <li
                key={`${s.jalon}-${i}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {s.jalon}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("common.payment.due_prefix")} {fmtDate(s.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {money(s.amount)}
                  </span>
                  {s.paid ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {t("common.payment.status_paid")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      {t("common.payment.status_due")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

const Kpi: React.FC<{
  label: string;
  value: string;
  tone: "navy" | "emerald" | "amber" | "slate";
}> = ({ label, value, tone }) => {
  const tones: Record<typeof tone, string> = {
    navy: "bg-slate-900 text-amber-300",
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    slate: "bg-slate-50 text-slate-700",
  } as const;
  return (
    <div className={["rounded-xl p-3 text-center sm:p-4", tones[tone]].join(" ")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold tabular-nums sm:text-base">{value}</p>
    </div>
  );
};

export default PaymentSummary;
