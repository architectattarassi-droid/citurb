/**
 * RokhasTrackerPage — page client suivi temps réel d'un permis Rokhas.
 *
 * Route : /dossier/:dossierId/rokhas
 *
 * Structure :
 *  - Header (titre + réf. dossier)
 *  - DeadlineCountdown sticky (décision légale ou warning si ajourné/refusé)
 *  - Cartouche décision (si décidé)
 *  - Timeline verticale étapes
 *  - ReservesTracker (si réserves)
 *  - Block "ajourné" → countdown relance auto
 *  - Block "défavorable" → motifs refus + bouton "Composer recours"
 *
 * Mobile-first : tout est full-width, max-width 720 pour desktop.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getInstance,
  registerDepot,
  type ProjectCategory,
  type RokhasInstanceView,
} from "./rokhas-tracker.api";
import RokhasTimeline from "./RokhasTimeline";
import RokhasDeadlineCountdown from "./RokhasDeadlineCountdown";
import ReservesTracker from "./ReservesTracker";
import RokhasStatusBadge from "./RokhasStatusBadge";
import { useT, useLang } from "../../i18n/i18n";

const C = {
  bg: "#f7f8fa",
  card: "#ffffff",
  border: "#e3e7ec",
  ink: "#11181f",
  inkMid: "#5a6573",
  primary: "#0d4f8c",
  success: "#0a7f3a",
  warning: "#b76e00",
  warningBg: "#fff5e6",
  danger: "#b91c1c",
  dangerBg: "#fde8e8",
};

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: C.bg, padding: "16px 14px", color: C.ink, fontFamily: "-apple-system, system-ui, sans-serif" },
  container: { maxWidth: 720, margin: "0 auto" },
  back: { fontSize: 13, color: C.primary, textDecoration: "none", marginBottom: 8, display: "inline-block" },
  h1: { fontSize: 22, fontWeight: 700, margin: "4px 0 4px" },
  sub: { fontSize: 13, color: C.inkMid, margin: "0 0 14px" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  progressBar: { height: 6, background: "#eef2f7", borderRadius: 999, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", background: C.primary, borderRadius: 999, transition: "width 400ms ease" },
  motif: { padding: 10, background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 8, marginBottom: 8 },
  motifTitle: { fontWeight: 700, color: C.danger, fontSize: 14 },
  motifDesc: { fontSize: 13, color: "#7a1414", marginTop: 4 },
  btnPrimary: {
    background: C.primary, color: "#fff", border: "none", borderRadius: 8,
    padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    minHeight: 44,
  },
  empty: { padding: 32, textAlign: "center" as const, color: C.inkMid, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 },
  setupBox: { padding: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 },
  field: { display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 600, color: C.ink },
  input: { padding: "10px 12px", fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, minHeight: 44 },
  error: { padding: 10, marginBottom: 10, background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 8, color: C.danger, fontSize: 13 },
};

export default function RokhasTrackerPage() {
  const t = useT();
  const { lang } = useLang();
  const dateLocale = lang === "ar" ? "ar-MA" : lang === "en" ? "en-GB" : "fr-FR";
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [instance, setInstance] = useState<RokhasInstanceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getInstance(dossierId);
      setInstance(r.instance);
    } catch (e: any) {
      setError(e?.message || t("rokhas.tracker.error.load"));
    } finally {
      setLoading(false);
    }
  }, [dossierId, t]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-refresh deadlines chaque minute (countdown live)
  useEffect(() => {
    if (!instance) return;
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [instance, reload]);

  if (loading && !instance) {
    return (
      <div style={S.page}><div style={S.container}>
        <div style={S.empty}>{t("rokhas.tracker.loading")}</div>
      </div></div>
    );
  }

  if (error && !instance) {
    return (
      <div style={S.page}><div style={S.container}>
        <div style={S.error}>{error}</div>
      </div></div>
    );
  }

  // Pas d'instance → setup (dépôt initial)
  if (!instance) {
    return (
      <div style={S.page}><div style={S.container}>
        <h1 style={S.h1}>{t("rokhas.tracker.title.setup")}</h1>
        <p style={S.sub}>{t("rokhas.tracker.dossier.ref", { id: dossierId.slice(0, 12) })}</p>
        <SetupBlock dossierId={dossierId} onCreated={(inst) => setInstance(inst)} />
      </div></div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        <Link to={`/portal`} style={S.back}>{t("rokhas.tracker.back")}</Link>
        <h1 style={S.h1}>{t("rokhas.tracker.title.tracking")}</h1>
        <div style={S.sub}>
          {instance.refRokhasCommune
            ? <>{t("rokhas.tracker.ref.commune")} <strong>{instance.refRokhasCommune}</strong> · </>
            : null}
          {t("rokhas.tracker.category", { category: instance.projectCategory })} · {t("rokhas.tracker.progress", { pct: instance.progressPct })}
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${instance.progressPct}%` }} />
          </div>
        </div>

        <DecisionBlock instance={instance} dateLocale={dateLocale} />

        {/* Deadline principale (compte à rebours sticky) */}
        {instance.decisionDeadline && (
          <div style={{ marginBottom: 14 }}>
            <RokhasDeadlineCountdown
              label={t("rokhas.tracker.deadline.label")}
              deadline={instance.decisionDeadline.deadline}
              joursRestants={instance.decisionDeadline.joursRestants}
              severity={instance.decisionDeadline.severity}
              sticky
            />
          </div>
        )}

        {/* Timeline */}
        <div style={S.card}>
          <div style={S.cardTitle}>{t("rokhas.tracker.steps.title")}</div>
          <RokhasTimeline instance={instance} />
        </div>

        {/* Réserves */}
        {instance.reserves.length > 0 && (
          <div style={S.card}>
            <div style={S.cardTitle}>{t("rokhas.tracker.reserves.title")}</div>
            <ReservesTracker
              instance={instance}
              onChange={(next) => setInstance(next)}
            />
          </div>
        )}

        {/* Mode ajourné */}
        {instance.decision?.type === "AJOURNE" && (
          <div style={S.card}>
            <div style={S.cardTitle}>{t("rokhas.tracker.ajourne.title")}</div>
            <p style={{ fontSize: 14, color: C.inkMid, marginTop: 0 }}>
              {t("rokhas.tracker.ajourne.desc")}
            </p>
          </div>
        )}

        {/* Mode défavorable */}
        {instance.decision?.type === "DEFAVORABLE" && (
          <div style={S.card}>
            <div style={S.cardTitle}>{t("rokhas.tracker.defavorable.title")}</div>
            {(instance.decision.motifsRefus || []).map((m, i) => (
              <div key={i} style={S.motif}>
                <div style={S.motifTitle}>{m.titre || t("rokhas.tracker.motif.default", { n: i + 1 })}</div>
                {m.articleLoi && (
                  <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginTop: 4 }}>
                    {t("rokhas.tracker.motif.article", { article: m.articleLoi })}
                  </div>
                )}
                {m.description && <div style={S.motifDesc}>{m.description}</div>}
              </div>
            ))}
            <button
              style={S.btnPrimary}
              onClick={() => alert(t("rokhas.tracker.recours.alert"))}
            >
              {t("rokhas.tracker.recours.btn")}
            </button>
          </div>
        )}

        {/* Délivrance */}
        {instance.delivranceDate && (
          <div style={{ ...S.card, background: "#e7f5ec", borderColor: C.success }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <RokhasStatusBadge kind="DELIVRE" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.success }}>
              {t("rokhas.tracker.delivrance.label", { date: new Date(instance.delivranceDate).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })}
            </div>
            {instance.attestationPdfUrl && (
              <a href={instance.attestationPdfUrl} target="_blank" rel="noreferrer"
                 style={{ display: "inline-block", marginTop: 10, color: C.primary, fontWeight: 600 }}>
                {t("rokhas.tracker.delivrance.download")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionBlock({ instance, dateLocale }: { instance: RokhasInstanceView; dateLocale: string }) {
  const t = useT();
  if (!instance.decision) {
    return (
      <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
        <RokhasStatusBadge kind="EN_INSTRUCTION" />
        <div style={{ fontSize: 13, color: C.inkMid }}>
          {t("rokhas.tracker.decision.in_progress")}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
      <RokhasStatusBadge kind={instance.decision.type} />
      <div style={{ fontSize: 13, color: C.inkMid }}>
        {t("rokhas.tracker.decision.rendered", { date: new Date(instance.decision.date).toLocaleDateString(dateLocale) })}
      </div>
    </div>
  );
}

function SetupBlock({ dossierId, onCreated }: { dossierId: string; onCreated: (inst: RokhasInstanceView) => void }) {
  const t = useT();
  const [category, setCategory] = useState<ProjectCategory>(1);
  const [ref, setRef] = useState("");
  const [date, setDate] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await registerDepot(dossierId, {
        projectCategory: category,
        refRokhas: ref || null,
        date: date || null,
      });
      onCreated(r.instance);
    } catch (e: any) {
      setErr(e?.message || t("rokhas.tracker.error.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.setupBox}>
      <p style={{ fontSize: 14, color: C.inkMid, marginTop: 0 }}>
        {t("rokhas.tracker.setup.intro")}
      </p>
      {err && <div style={S.error}>{err}</div>}
      <div style={S.field}>
        <label style={S.label} htmlFor="cat">{t("rokhas.tracker.setup.category.label")}</label>
        <select
          id="cat" value={category} onChange={(e) => setCategory(Number(e.target.value) as ProjectCategory)}
          style={S.input}
        >
          <option value={1}>{t("rokhas.tracker.setup.category.opt1")}</option>
          <option value={2}>{t("rokhas.tracker.setup.category.opt2")}</option>
          <option value={3}>{t("rokhas.tracker.setup.category.opt3")}</option>
        </select>
      </div>
      <div style={S.field}>
        <label style={S.label} htmlFor="ref">{t("rokhas.tracker.setup.ref.label")}</label>
        <input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} style={S.input} placeholder={t("rokhas.tracker.setup.ref.placeholder")} />
      </div>
      <div style={S.field}>
        <label style={S.label} htmlFor="date">{t("rokhas.tracker.setup.date.label")}</label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} />
      </div>
      <button onClick={submit} disabled={busy} style={{ ...S.btnPrimary, opacity: busy ? 0.5 : 1 }}>
        {busy ? t("rokhas.tracker.setup.submit.busy") : t("rokhas.tracker.setup.submit")}
      </button>
    </div>
  );
}
