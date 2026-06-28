
import React, { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../tome5/AuthProvider";
import { useT } from "../../../../i18n/i18n";
import { createDossier, type Qualification } from "./dossier.store";
import type { ProjectType } from "../../../../domain/p1/types";
import { readP1Draft, writeP1Draft } from "../../../../application/p1/startQualification";
import ClientCostBuilder, { type CostResult } from "./ClientCostBuilder";
import PermitTaxesPanel from "./PermitTaxesPanel";
import { createDossier as createCase } from "../../../../application/p1/createDossier";
import { selectPack } from "../../../../application/p1/selectPack";
import { canAccessPacksPage, canShowPacks, unlockPacks } from "../../../../application/p1/enterPacks";
import { recommendPack } from "../../../../application/p1/packRecommendationService";
import {
  apiFetch,
  quoteP1Packs,
  requestP1PacksEmailCode,
  verifyP1PacksEmailCode,
  requestP1PacksSmsCode,
  verifyP1PacksSmsCode,
} from "../../../tome4/apiClient";
import { quoteLocal } from "../../../../domain/p1/quote.engine";

/**
 * P1 Packs — Page 3 du tunnel (doctrine)
 * - Affiche les packs uniquement après qualification + création compte (V1 mock).
 * - La qualification est récupérée depuis localStorage ('P1_data') pour V1.
 * - Le header global reste celui d'AppShell (tome1).
 */

type P1Data = any;

export default function P1Packs() {
  const t = useT();
  const auth = useAuth();
  const [params] = useSearchParams();
  // Consentement implicite à l'action (« Recevoir le code ») — plus de cases à cocher.
  const [truthOk] = React.useState(true);
  const [termsOk] = React.useState(true);
  const [unlockMsg, setUnlockMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [codeRequested, setCodeRequested] = React.useState(false);
  const [unlockChannel, setUnlockChannel] = React.useState<"email" | "sms">("email");
  const [emailCode, setEmailCode] = React.useState("");
	const [emailForCode, setEmailForCode] = React.useState("");
  const [phoneForCode, setPhoneForCode] = React.useState("");
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = React.useState("");
  const packsRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => {
    // Storage-first: draft saved by application layer
    const uid = auth.userId || null;
    const d = readP1Draft(uid);

    // In V1, the user can qualify as "anon" then create an account (new userId).
    // Avoid losing the qualification draft by falling back to anon + legacy storage.
    const isEmpty = !d || Object.keys(d).length === 0;
    const anon = readP1Draft("anon");
    const legacy = (() => {
      try {
        return JSON.parse(localStorage.getItem("P1_data") || "null");
      } catch {
        return null;
      }
    })();

    return (isEmpty ? (Object.keys(anon || {}).length ? anon : (legacy || {})) : d) as any;
  }, [auth.userId]);

	// Ensure we have an email to send the confirmation code.
	React.useEffect(() => {
		if (emailForCode) return;
		const candidate = (auth.email || (data as any)?.email || "") as any;
		if (candidate) setEmailForCode(String(candidate));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth.email, (data as any)?.email]);
  const navigate = useNavigate();

  // Budget de construction défini par le client (standing global ou composition par lot).
  const [constructionBudget, setConstructionBudget] = React.useState<number | null>(
    Number((data as any)?.constructionBudgetMAD) > 0 ? Number((data as any)?.constructionBudgetMAD) : null
  );
  const applyConstructionBudget = (r: CostResult) => {
    setConstructionBudget(r.totalMAD);
    try {
      const uid = auth.userId || "anon";
      const cur = readP1Draft(auth.userId || null) as any;
      writeP1Draft(auth.userId || null, {
        ...cur,
        constructionBudgetMAD: r.totalMAD,
        constructionBudgetMeta: { type: r.type, mode: r.mode, standing: r.standing, surfaceM2: r.surfaceM2, finitions: r.finitions },
        budget: String(r.totalMAD),
      });
      void uid;
    } catch { /* persistance best-effort */ }
  };

  const formatMAD = (n: number | null | undefined) => {
    if (!Number.isFinite(Number(n))) return "—";
    return Math.round(Number(n)).toLocaleString("fr-FR");
  };

  const derived = useMemo(() => {
    const d: any = data || {};
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return null;
    };
    // Priorité à la surface plancher calculée en qualification (inclut sous-sol/CES/cour/étages),
    // sinon repli sur la surface de terrain saisie.
    const surfaceM2 = pick(d.surfacePlancher, d.surface, d.terrainArea, d.area);
    return { surfaceM2 };
  }, [data]);

  // V162D+ — Packs engine: selections drive quote (no engine disclosure)
  const [constructionLevel, setConstructionLevel] = React.useState<
    "ECONOMIQUE" | "STANDING" | "HAUT_STANDING" | "PREMIUM" | "BLACK"
  >("STANDING");
  const [pack, setPack] = React.useState<"ESSENTIEL" | "AVANCE" | "COMPLET">("AVANCE");
  const [betMode, setBetMode] = React.useState<"PLATFORM" | "EXTERNAL">("PLATFORM");
  const [addRemoteFollow, setAddRemoteFollow] = React.useState(false);
  const [mandateEntreprise, setMandateEntreprise] = React.useState(false);
  const [modEnabled, setModEnabled] = React.useState(false);
  const [decoEnabled, setDecoEnabled] = React.useState(false);
  const [quoteMap, setQuoteMap] = React.useState<Record<string, any> | null>(null);
  const [quoteErr, setQuoteErr] = React.useState<string | null>(null);

  // Derived access flags (must be declared BEFORE any hook uses them)
  const hasCaseParam = Boolean(params.get("case"));
  const isMember = hasCaseParam || (auth.isAuthed && canAccessPacksPage(auth.userId || null));
  const packsVisible = hasCaseParam || (auth.isAuthed && canShowPacks(auth.userId || null));

  // Villa-only : le sous-sol déclaré en qualification est DÉJÀ intégré à la surface plancher
  // (computeSP) — donc déjà reflété dans le devis. Dérivé du draft, plus de toggle (redondant).
  const isVilla = String((data as any)?.type || (data as any)?.projectType || "").toLowerCase().includes("villa");
  const hasBasement = (data as any)?.basement === "yes" || (data as any)?.hasBasement === true;

  useEffect(() => {
    if (!packsVisible) return;
    const surface = derived.surfaceM2;
    if (!surface) return;
    let cancelled = false;

    const mkInput = (p: "ESSENTIEL" | "AVANCE" | "COMPLET", rf: boolean) => ({
      surfaceM2: surface, constructionLevel, pack: p, addRemoteFollow: rf,
      betMode, mandateEntreprise, modEnabled, decoEnabled,
      hasBasement: isVilla ? hasBasement : false,
    });

    (async () => {
      setQuoteErr(null);
      let qE: any, qA: any, qC: any;
      try {
        [qE, qA, qC] = await Promise.all([
          quoteP1Packs(mkInput("ESSENTIEL", addRemoteFollow)),
          quoteP1Packs(mkInput("AVANCE", addRemoteFollow)),
          quoteP1Packs(mkInput("COMPLET", false)),
        ]);
      } catch {
        // Backend offline → fallback local engine (exact same formulas)
        try {
          qE = quoteLocal(mkInput("ESSENTIEL", addRemoteFollow));
          qA = quoteLocal(mkInput("AVANCE", addRemoteFollow));
          qC = quoteLocal(mkInput("COMPLET", false));
        } catch (e2: any) {
          if (!cancelled) { setQuoteMap(null); setQuoteErr(e2?.message || t("portes.p1.packs.sim.calc_error")); }
          return;
        }
      }
      if (!cancelled) {
        setQuoteMap({ ESSENTIEL: qE, AVANCE: qA, COMPLET: qC });
        const cur = pack === "ESSENTIEL" ? qE : pack === "AVANCE" ? qA : qC;
        if (!cur?.meta?.mandateEntrepriseAllowed && mandateEntreprise) setMandateEntreprise(false);
        if (pack === "COMPLET" && addRemoteFollow) setAddRemoteFollow(false);
      }
    })();
    return () => { cancelled = true; };
  }, [packsVisible, derived.surfaceM2, constructionLevel, pack, betMode, addRemoteFollow, mandateEntreprise, modEnabled, decoEnabled, hasBasement, isVilla]);

  // Packs page can be reached in 2 modes:
  // - Authenticated user flow (classic)
  // - Public flow when a `case` query param is present (OTP unlock)
  useEffect(() => {
    if (auth.loading) return;
    const caseId = params.get("case") || "";
    if (!auth.isAuthed && !caseId) {
      navigate(`/login?next=${encodeURIComponent('/p1/packs')}`, { replace: true });
      return;
    }
    if (auth.isAuthed && !canAccessPacksPage(auth.userId || null)) {
      navigate(`/verify-phone?next=${encodeURIComponent('/p1/packs')}`, { replace: true });
      return;
    }
  }, [auth.isAuthed, auth.loading, auth.userId, navigate, params]);

  const doUnlock = async () => {
		const caseId = params.get("case") || (auth.userId ? `${auth.userId}-${Date.now()}` : `anon-${Date.now()}`);
		setActiveCaseId(caseId);
		if (!auth.userId && !caseId) return;
    if (!truthOk || !termsOk) return;
		const email = (emailForCode || "").trim();
    const phone = (phoneForCode || "").trim();
    if (unlockChannel === "email") {
			if (!email || !email.includes("@")) {
				setUnlockMsg(t("portes.p1.packs.unlock.msg.email_invalid"));
				return;
			}
    } else {
      if (!phone || phone.length < 8) {
        setUnlockMsg(t("portes.p1.packs.unlock.msg.phone_invalid"));
        return;
      }
    }
    setBusy(true);
    setUnlockMsg(unlockChannel === "email" ? t("portes.p1.packs.unlock.msg.sending_email") : t("portes.p1.packs.unlock.msg.sending_sms"));
    setDevCode(null);
    try {
      const ts = Date.now();
      const q = (quoteMap as any)?.[pack] || null;
			const res: any = unlockChannel === "email" ? await requestP1PacksEmailCode({
				caseId,
				email,
        order: {
          door: "P1",
				requester: {
					displayName: ((data as any)?.firstname || (data as any)?.firstName || null) as any,
					email: email as any,
				},
          project: {
            type: (data as any)?.type || (data as any)?.projectType,
            city: (data as any)?.city || (data as any)?.commune || (data as any)?.province || null,
            surfaceM2: derived.surfaceM2,
            constructionLevel,
            hasBasement: isVilla ? hasBasement : false,
          },
          pricing: {
            pack,
            packLabel: pack === "ESSENTIEL" ? t("portes.p1.packs.card.essentiel.badge") : pack === "AVANCE" ? t("portes.p1.packs.card.avance.badge") : t("portes.p1.packs.card.complet.badge"),
            packMAD: q?.amounts?.packMAD ?? null,
            remoteFollowMAD: q?.amounts?.remoteFollowMAD ?? null,
            betMAD: q?.amounts?.betMAD ?? null,
            modMAD: q?.amounts?.modMAD ?? null,
            decoMAD: q?.amounts?.decoMAD ?? null,
            totalMAD: q?.amounts?.totalMAD ?? null,
            totalMADRounded: q?.amounts?.totalMADRounded ?? null,
            currency: "MAD",
          },
          services: {
            addRemoteFollow,
            betMode,
            mandateEntreprise,
            modEnabled,
            decoEnabled,
          },
          clientConfirmations: { truthOk: true, termsOk: true },
          ts,
        },
			}) : await requestP1PacksSmsCode({ caseId, phone });

			if (!res?.ok) {
				setUnlockMsg(res?.message || t("portes.p1.packs.unlock.msg.action_impossible"));
				return;
			}

      setCodeRequested(true);
      setUnlockMsg(
        unlockChannel === "email"
          ? t("portes.p1.packs.unlock.msg.sent_email", { min: Math.round(res.expiresInSec / 60) })
          : t("portes.p1.packs.unlock.msg.sent_sms", { min: Math.round(res.expiresInSec / 60) })
      );
			if (res.devCode) setDevCode(res.devCode);
    } catch (e: any) {
      setUnlockMsg(e?.message ? `${t("portes.p1.packs.unlock.msg.error_prefix")} ${e.message}` : t("portes.p1.packs.unlock.msg.send_error"));
    } finally {
      setBusy(false);
    }
  };

  const doVerifyCode = async () => {
		const caseId = activeCaseId || params.get("case") || "";
		if (!auth.userId && !caseId) return;
    const code = (emailCode || "").trim();
    if (code.length < 4) {
      setUnlockMsg(t("portes.p1.packs.unlock.msg.code_invalid"));
      return;
    }
    setBusy(true);
    setUnlockMsg(t("portes.p1.packs.unlock.msg.verifying"));
    try {
			const r: any = unlockChannel === "email"
				? await verifyP1PacksEmailCode(code, caseId)
				: await verifyP1PacksSmsCode(code, caseId);
			if (!r?.ok) {
				setUnlockMsg(r?.message || t("portes.p1.packs.unlock.msg.code_wrong"));
				return;
			}
			unlockPacks(auth.userId || `case:${caseId}`, Date.now());
      setUnlockMsg(t("portes.p1.packs.unlock.msg.validated"));
      setTimeout(() => packsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      setUnlockMsg(e?.message ? `${t("portes.p1.packs.unlock.msg.error_prefix")} ${e.message}` : t("portes.p1.packs.unlock.msg.code_wrong"));
    } finally {
      setBusy(false);
    }
  };

  const rec = useMemo(() => {
    const planMode = (data as any)?.planMode === "personnalise" ? "personnalise" : "type";
    // IMPORTANT: avoid mixing ?? with || (Vite/Babel disallows `x ?? y || z` without parentheses)
    // Also prefer nullish coalescing so that 0 remains a valid value.
    const surfaceRaw = (derived.surfaceM2 ?? (data as any)?.m2) ?? NaN;
    const floorsRaw = ((data as any)?.floors ?? (data as any)?.rLevel) ?? NaN;
    const budgetRaw = (data as any)?.budget ?? NaN;
    const surface = Number(surfaceRaw);
    const floors = Number(floorsRaw);
    const budget = Number(budgetRaw);
    return recommendPack({
      projectType: (data as any)?.projectType,
      planMode,
      surface: Number.isFinite(surface) ? surface : undefined,
      floors: Number.isFinite(floors) ? floors : undefined,
      budget: Number.isFinite(budget) ? budget : undefined,
    });
  }, [data, derived.surfaceM2]);

  const choose = (pack: "type" | "custom" | "premium") => {
    const userId = auth.userId || "anon";
    const projectType: ProjectType =
      data?.projectType === "villa" || data?.projectType === "immeuble" || data?.projectType === "renovation"
        ? (data.projectType as ProjectType)
        : "villa";

    const qual: Qualification = {
      projectType,
      city: String((data as any)?.city || (data as any)?.commune || (data as any)?.province || "—"),
      surface: String(derived.surfaceM2 ?? (data as any)?.surface ?? ""),
      budget: String((data as any)?.budget || ""),
      horizon: String((data as any)?.horizon || ""),
      hasLotissement: Boolean((data as any)?.hasLotissement),
      lotissementRef: String((data as any)?.lotissementRef || ""),
      zonageConnu: Boolean((data as any)?.zonageConnu),
      zonage: String((data as any)?.zonage || ""),
    };

    const offerTitle = pack === "type"
      ? t("portes.p1.packs.offer.type")
      : pack === "custom"
        ? t("portes.p1.packs.offer.custom")
        : t("portes.p1.packs.offer.premium");

    // Case (append-only)
    const caseId = params.get("case") || createCase(userId, data as any).caseId;
    selectPack(userId, caseId, pack);

    // Sprint S2 — persist pack selection to API (non-blocking, best-effort)
    const packApiMap: Record<string, string> = { type: "ESSENTIEL", custom: "AVANCE", premium: "COMPLET" };
    const packPriceMAD = (quoteMap as any)?.[packApiMap[pack]]?.amounts?.totalMADRounded ?? null;
    apiFetch('/p2/dossier/create', {
      method: 'POST',
      body: {
        title: offerTitle,
        caseId,
        packSelected: packApiMap[pack],
        packPriceMAD,
        projectType: projectType,
        constructionLevel,
        payload: qual,
      },
    }).then((resp: any) => {
      const dbId = resp?.dossier?.id;
      if (dbId && auth.userId) {
        localStorage.setItem(`citurbarea:p1:dossierId:${auth.userId}:v1`, dbId);
      }
    }).catch(() => { /* non-blocking */ });

    // Legacy dossier store (keeps P1Dossier functional until B7)
    createDossier(userId, qual, pack, offerTitle);
    navigate(`/p1/dossier?case=${encodeURIComponent(caseId)}`);
  };

  const displayName = (() => {
    const personType = String((data as any)?.personType || (data as any)?.person || "").toLowerCase();
    const company = String((data as any)?.companyName || (data as any)?.societe || (data as any)?.company || "").trim();
    // support multiple draft schemas (landing iterations)
    const fn = String(
      (data as any)?.firstname ||
      (data as any)?.firstName ||
      (data as any)?.demandeurFirstName ||
      (data as any)?.requesterFirstName ||
      ""
    ).trim();
    const ln = String(
      (data as any)?.lastname ||
      (data as any)?.lastName ||
      (data as any)?.demandeurLastName ||
      (data as any)?.requesterLastName ||
      ""
    ).trim();
    const full = String(
      (data as any)?.fullName ||
      (data as any)?.demandeurName ||
      (data as any)?.requesterName ||
      (data as any)?.name ||
      ""
    ).trim();
    if (personType.includes("morale") && company) return company;
    if (full && !fn && !ln) return full;
    if (!fn && !ln) return company || null;
    return `${fn} ${ln.toUpperCase()}`.trim();
  })();

  // Fallback identity for member messaging if user has no name yet.
  const displayNameSafe = displayName || auth.username || auth.email || null;


  const projectLabel = (() => {
    if (!data?.type) return t("portes.p1.packs.project.qualified");
    if (data.type === "villa") return t("portes.p1.packs.project.villa");
    if (data.type === "immeuble") return t("portes.p1.packs.project.immeuble", { level: data.rLevel ? `— ${data.rLevel}` : "" }).trim();
    if (data.type === "renovation") return t("portes.p1.packs.project.renovation");
    return t("portes.p1.packs.project.qualified");
  })();

  // Fiche projet imprimable — le client a déjà préparé sa fiche en qualification ;
  // il doit pouvoir la conserver et l'imprimer (document A4 autonome, brandé).
  const printFiche = () => {
    const d: any = data || {};
    const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]));
    const val = (...keys: string[]) => {
      for (const k of keys) {
        const v = d[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      }
      return "";
    };
    const yn = (v: any) => (v ? "Oui" : "Non");
    const budget =
      val("budgetLabel") ||
      (d.budgetMinMAD && d.budgetMaxMAD ? `${formatMAD(d.budgetMinMAD)} – ${formatMAD(d.budgetMaxMAD)} MAD` : "") ||
      (d.budget ? `${formatMAD(d.budget)} MAD` : "");

    const groups: Array<{ title: string; rows: Array<[string, string]> }> = [
      {
        title: "Demandeur",
        rows: [
          ["Nom complet", displayNameSafe || ""],
          ["Téléphone", val("phone")],
          ["Email", val("email") || emailForCode],
          ["Type de personne", val("personType")],
          ["Situation juridique", val("legalSituation")],
          ["Pièce d'identité", [val("physIdType"), val("physIdNumber")].filter(Boolean).join(" — ")],
          ["Société", val("companyName")],
          ["Forme juridique", val("companyForm")],
          ["ICE", val("companyICE")],
          ["RC", val("companyRC")],
        ],
      },
      {
        title: "Projet",
        rows: [
          ["Typologie", val("type", "projectType")],
          ["Mode", val("planMode")],
          ["Niveau de construction", constructionLevel],
          ["Surface plancher", derived.surfaceM2 ? `${formatMAD(derived.surfaceM2)} m²` : ""],
          ["Sous-sol", isVilla ? yn(hasBasement) : ""],
          ["Budget indicatif", budget],
          ["Délai souhaité", val("horizon", "delai", "echeance")],
        ],
      },
      {
        title: "Terrain",
        rows: [
          ["Région", val("region")],
          ["Province", val("province")],
          ["Commune / Ville", val("commune", "city")],
          ["Titre foncier", val("titreFoncier", "tf")],
          ["Lotissement", d.hasLotissement !== undefined ? yn(d.hasLotissement) : ""],
          ["Nom du lotissement", val("lotissementRef", "nomLotissement")],
          ["N° de lot", val("numeroLot", "lotNumber")],
        ],
      },
    ];

    const sections = groups
      .map((g) => {
        const rows = g.rows.filter(([, v]) => v && v.trim());
        if (!rows.length) return "";
        return `<section><h2>${esc(g.title)}</h2><table>${rows
          .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
          .join("")}</table></section>`;
      })
      .join("");

    const stamp = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fiche projet — CITURBAREA</title>
<style>
@page { margin: 16mm; }
* { box-sizing: border-box; }
body { font-family: Georgia, "Times New Roman", serif; color:#0B1B3A; margin:0; padding:28px; }
.hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #C9A227; padding-bottom:14px; margin-bottom:22px; }
.brand { font-size:22px; font-weight:700; letter-spacing:.04em; }
.brand small { display:block; font-size:10px; font-weight:400; color:#6b7280; letter-spacing:.18em; text-transform:uppercase; margin-top:4px; }
.meta { text-align:right; font-size:12px; color:#6b7280; }
h1 { font-size:18px; margin:0 0 18px; }
section { margin-bottom:16px; page-break-inside:avoid; }
h2 { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#C9A227; border-bottom:1px solid rgba(201,162,39,.3); padding-bottom:6px; margin:0 0 8px; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th { text-align:left; width:40%; font-weight:600; color:#475569; padding:5px 8px 5px 0; vertical-align:top; }
td { padding:5px 0; }
.foot { margin-top:26px; font-size:10.5px; color:#94a3b8; border-top:1px solid #e5e7eb; padding-top:10px; }
.bar { margin-top:18px; }
@media print { .noprint { display:none; } body { padding:0; } }
</style></head>
<body>
<div class="hd">
  <div class="brand">CITURBAREA<small>Architecture · Urbanisme · BTP</small></div>
  <div class="meta">Fiche projet<br>${esc(stamp)}</div>
</div>
<h1>Fiche projet — ${esc(displayNameSafe || "Client")}</h1>
${sections}
<div class="foot">Document récapitulatif établi par le client sur citurbarea.com. Informations déclaratives ; montants indicatifs, hors taxes, non contractuels.</div>
<div class="bar noprint"><button onclick="window.print()" style="padding:10px 18px;background:#C9A227;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Imprimer / Enregistrer en PDF</button></div>
</body></html>`;

    const w = window.open("", "_blank", "width=860,height=920");
    if (!w) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer votre fiche projet.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  return (
    <div style={{ padding: "28px 0 90px" }}>
      {/* Inline style for fidelity with HTML landing */}
      <style>{`
        :root{
          --royal:#0B1B3A;
          --gold:#C9A227;
          --line:rgba(201,162,39,0.35);
        }
        .p1-wrap{
          max-width:1440px; margin:0 auto; padding:0 24px;
        }
        .badge{
          display:inline-flex;
          padding:8px 12px;
          border-radius:999px;
          font-size:11px;
          font-weight:900;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:rgba(11,27,58,0.92);
          border:1px solid rgba(201,162,39,0.45);
          background:rgba(201,162,39,0.16);
          width:fit-content;
        }
        .title{
          font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
          font-size:44px; font-weight:900; letter-spacing:-0.4px; color:var(--royal);
        }
        .sub{
          max-width:760px;
          font-size:17px;
          color:rgba(11,18,32,0.72);
          line-height:1.7;
          margin-top:10px;
        }
        .grid3{ display:grid; gap:28px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media(max-width:900px){ .grid3{ grid-template-columns:1fr; } }
        .card{
          border-radius:20px;
          padding:30px;
          background:rgba(255,255,255,0.88);
          border:1px solid var(--line);
          box-shadow:0 18px 55px rgba(11,27,58,0.12);
          display:flex; flex-direction:column; height:100%;
          transition: all .25s ease;
        }
        .card:hover{ transform: translateY(-2px); border-color:rgba(201,162,39,0.40); }
        .featured{
          border:1px solid rgba(201,162,39,0.65);
          box-shadow:0 26px 90px rgba(201,162,39,0.18);
          background:
            radial-gradient(800px 260px at 20% 10%, rgba(201,162,39,0.16), transparent 60%),
            rgba(255,255,255,0.92);
          transform: scale(1.02);
        }
        @media(max-width:900px){ .featured{ transform:none; } }
        .lux{
          font-family: "Playfair Display", Inter, system-ui, sans-serif;
          font-weight:800;
          color:var(--royal);
        }
        .muted{ color:rgba(11,18,32,0.72); }
        .priceRow{ display:flex; align-items:baseline; gap:8px; margin:14px 0 6px; }
        .amt{ font-size:34px; font-weight:900; color:var(--royal); line-height:1; }
        .hint{ font-size:12px; color:rgba(11,18,32,0.55); font-weight:700; margin-bottom:12px; }
        .feat{ list-style:none; padding:0; margin:16px 0 0 0; }
        .feat li{ padding:9px 0; border-bottom:1px dashed rgba(11,27,58,0.10); font-size:13px; color:rgba(11,18,32,0.72); }
        .feat li:last-child{ border-bottom:none; }
        .btn{
          display:inline-flex; align-items:center; justify-content:center;
          padding:14px 22px; border-radius:12px;
          font-size:14px; font-weight:800;
          border:1px solid transparent;
          transition: all .2s ease;
          text-decoration:none;
          cursor:pointer;
          user-select:none;
          gap:10px;
          width:100%;
          margin-top:16px;
          min-height:52px;
          white-space:nowrap;
        }
        .btn-dark{
          background:var(--royal);
          color:#fff;
          border-color:rgba(11,27,58,0.35);
        }
        .btn-dark:hover{ filter:brightness(1.05); }
        .btn-gold{
          background:linear-gradient(135deg, var(--gold), #E6C75B);
          color:#1a1406;
          border-color: rgba(201,162,39,0.55);
          box-shadow:0 18px 34px rgba(201,162,39,0.25);
        }
        .btn-gold:hover{ filter:brightness(1.03); transform: translateY(-1px); }
        .topRow{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .link{ font-weight:800; color:var(--royal); text-decoration:none; }
        .divider{ height:1px; background:linear-gradient(90deg, transparent, rgba(201,162,39,0.55), transparent); margin:34px 0; }
      `}</style>

      <div className="p1-wrap">
        <div className="topRow">
          <div>
            <div className="badge">{t("portes.p1.packs.badge.members")}</div>
            <div style={{ marginTop: 14 }} className="title">
              {t("portes.p1.packs.title", { project: projectLabel })}
            </div>
            <div className="sub">
              {isMember ? (
                displayNameSafe
                  ? (() => {
                      const parts = t("portes.p1.packs.welcome.member", { name: "__NAME__" }).split("__NAME__");
                      return <>{parts[0]}<b>{displayNameSafe}</b>{parts[1]}</>;
                    })()
                  : <>{t("portes.p1.packs.welcome.member_anon")}</>
              ) : (
                <>{t("portes.p1.packs.welcome.guest")}</>
              )}
            </div>
          </div>
        </div>

        {/* Fiche qualification (compact) */}
        <div style={{ marginTop: 18 }} className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div className="lux" style={{ fontSize: 18 }}>{t("portes.p1.packs.qual.title")}</div>
            <button
              type="button"
              onClick={printFiche}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(201,162,39,0.5)", background: "rgba(201,162,39,0.10)", color: "var(--royal)", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              🖨️ Imprimer ma fiche projet
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <div><b>{t("portes.p1.packs.qual.requester")} :</b> {displayNameSafe || t("portes.p1.packs.qual.dash")}</div>
              <div><b>{t("portes.p1.packs.qual.person")} :</b> {String((data as any)?.personType || t("portes.p1.packs.qual.dash"))}</div>
              <div><b>{t("portes.p1.packs.qual.legal")} :</b> {String((data as any)?.legalSituation || t("portes.p1.packs.qual.dash"))}</div>
            </div>

            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <div><b>{t("portes.p1.packs.qual.project")} :</b> {(data as any)?.type || (data as any)?.projectType || t("portes.p1.packs.qual.dash")}</div>
              <div><b>{t("portes.p1.packs.qual.mode")} :</b> {(data as any)?.planMode || t("portes.p1.packs.qual.dash")}</div>
              <div><b>{t("portes.p1.packs.qual.city")} :</b> {(data as any)?.city || (data as any)?.commune || (data as any)?.province || t("portes.p1.packs.qual.dash")}</div>
              <div><b>{t("portes.p1.packs.qual.surface")} :</b> {derived.surfaceM2 ?? t("portes.p1.packs.qual.dash")} m²</div>
              <div><b>{t("portes.p1.packs.qual.level")} :</b> {constructionLevel}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.25)" }}>
            <div className="lux" style={{ fontSize: 14 }}>
              {t("portes.p1.packs.rec.prefix")} <b>{rec.recommended === "custom" ? t("portes.p1.packs.rec.custom") : rec.recommended === "premium" ? t("portes.p1.packs.rec.premium") : t("portes.p1.packs.rec.type")}</b>
            </div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "rgba(11,18,32,0.72)" }}>
              {rec.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>

        {/* Étape budget — le client définit son coût de construction
            (standing global OU composition par lot avec finitions en images)
            avant de passer aux plans type/personnalisé et aux honoraires. */}
        <ClientCostBuilder
          surfaceM2={derived.surfaceM2}
          projectTypeHint={String((data as any)?.type || (data as any)?.projectType || "")}
          onApply={applyConstructionBudget}
          appliedTotal={constructionBudget}
        />

        <PermitTaxesPanel surfaceM2={derived.surfaceM2} />

        <div className="divider" />

	        {!packsVisible && (<>
          <div className="card" style={{ marginTop: 18 }}>
            <div className="lux" style={{ fontSize: 18, marginBottom: 10 }}>{t("portes.p1.packs.unlock.title")}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              {t("portes.p1.packs.unlock.intro")}
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {/* Consentement implicite à l'action (les cases pré-cochées rendaient le client méfiant). */}
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                En recevant votre code de confirmation, vous certifiez l'exactitude des informations saisies et acceptez les conditions d'utilisation de la plateforme.
              </div>
	              <div style={{ display: "grid", gap: 6 }}>
	                <div className="muted" style={{ fontSize: 12 }}>{t("portes.p1.packs.unlock.channel")}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "rgba(11,18,32,0.78)", fontSize: 13 }}>
                      <input type="radio" checked={unlockChannel === "email"} onChange={() => setUnlockChannel("email")} />
                      {t("portes.p1.packs.unlock.email_label")}
                    </label>
                    {/* SMS désactivé (Twilio en instance) — validation par email uniquement. */}
                  </div>
	              </div>
	              {unlockChannel === "email" ? (
	                <div style={{ display: "grid", gap: 6 }}>
	                  <div className="muted" style={{ fontSize: 12 }}>{t("portes.p1.packs.unlock.email_field")}</div>
	                  <input
	                    value={emailForCode}
	                    onChange={(e) => setEmailForCode(e.target.value)}
	                    placeholder={t("portes.p1.packs.unlock.email_placeholder")}
	                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.18)", fontSize: 14 }}
	                  />
	                </div>
	              ) : (
	                <div style={{ display: "grid", gap: 6 }}>
	                  <div className="muted" style={{ fontSize: 12 }}>{t("portes.p1.packs.unlock.phone_field")}</div>
	                  <input
	                    value={phoneForCode}
	                    onChange={(e) => setPhoneForCode(e.target.value)}
	                    placeholder={t("portes.p1.packs.unlock.phone_placeholder")}
	                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.18)", fontSize: 14 }}
	                  />
	                </div>
	              )}
	              </div>
	            </div>

	          <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-dark"
                type="button"
                onClick={doUnlock}
                disabled={!truthOk || !termsOk}
                style={{ opacity: (!truthOk || !termsOk) ? 0.55 : 1.0 }}
              >
                {busy ? t("portes.p1.packs.unlock.cta_busy") : (unlockChannel === "email" ? t("portes.p1.packs.unlock.cta_email") : t("portes.p1.packs.unlock.cta_sms"))}
              </button>
              <Link className="link" to="/p1" style={{ alignSelf: "center" }}>{t("portes.p1.packs.unlock.edit_info")}</Link>
            </div>

            {codeRequested && (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                  {unlockChannel === "email" ? t("portes.p1.packs.unlock.code_prompt_email") : t("portes.p1.packs.unlock.code_prompt_sms")}
                  {devCode ? (
                    <>
                      <br />
                      <span style={{ fontWeight: 900 }}>{t("portes.p1.packs.unlock.code_dev")}</span> <span style={{ fontWeight: 900 }}>{devCode}</span>
                    </>
                  ) : null}
                </div>
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder={t("portes.p1.packs.unlock.code_placeholder")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(11,27,58,0.20)",
                    outline: "none",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                  }}
                />
                <button className="btn btn-gold" type="button" onClick={doVerifyCode} disabled={busy}>
                  {busy ? t("portes.p1.packs.unlock.cta_busy") : t("portes.p1.packs.unlock.verify_cta")}
                </button>
		          </div>
		        )}
            {unlockMsg && <div style={{ marginTop: 10, fontWeight: 800, color: "rgba(11,18,32,0.78)" }}>{unlockMsg}</div>}
	          </>
	        )}

        {packsVisible && (
          <>
            <div ref={packsRef} className="card" style={{ marginTop: 18 }}>
              <div className="lux" style={{ fontSize: 18, marginBottom: 10 }}>{t("portes.p1.packs.sim.title")}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                {t("portes.p1.packs.sim.intro")}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 800, color: "rgba(11,18,32,0.78)" }}>
                  {t("portes.p1.packs.sim.level")}
                  <select value={constructionLevel} onChange={(e) => setConstructionLevel(e.target.value as any)} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(11,18,32,0.16)" }}>
                    <option value="ECONOMIQUE">{t("portes.p1.packs.sim.level.economique")}</option>
                    <option value="STANDING">{t("portes.p1.packs.sim.level.standing")}</option>
                    <option value="HAUT_STANDING">{t("portes.p1.packs.sim.level.haut_standing")}</option>
                    <option value="PREMIUM">{t("portes.p1.packs.sim.level.premium")}</option>
                    <option value="BLACK">{t("portes.p1.packs.sim.level.black")}</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 800, color: "rgba(11,18,32,0.78)" }}>
                  {t("portes.p1.packs.sim.bet")}
                  <select value={betMode} onChange={(e) => setBetMode(e.target.value as any)} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(11,18,32,0.16)" }}>
                    <option value="PLATFORM">{t("portes.p1.packs.sim.bet.platform")}</option>
                    <option value="EXTERNAL">{t("portes.p1.packs.sim.bet.external")}</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {isVilla && hasBasement && (
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, padding: "10px 12px", borderRadius: 12, background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.22)" }}>
                    <b>Sous-sol déclaré</b> — déjà inclus dans la surface plancher ({formatMAD(derived.surfaceM2)} m²) et donc dans le calcul ci-dessous. Pour le modifier, revenez à la <Link className="link" to="/p1">qualification</Link>.
                  </div>
                )}

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 800, color: "rgba(11,18,32,0.78)", fontSize: 13 }}>
                  <input type="checkbox" checked={addRemoteFollow} onChange={(e) => setAddRemoteFollow(e.target.checked)} style={{ marginTop: 3 }} disabled={pack === "COMPLET"} />
                  {t("portes.p1.packs.sim.remote_follow")}
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 800, color: "rgba(11,18,32,0.78)", fontSize: 13 }}>
                  <input type="checkbox" checked={decoEnabled} onChange={(e) => setDecoEnabled(e.target.checked)} style={{ marginTop: 3 }} />
                  {t("portes.p1.packs.sim.deco")}
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 800, color: "rgba(11,18,32,0.78)", fontSize: 13 }}>
                  <input type="checkbox" checked={modEnabled} onChange={(e) => setModEnabled(e.target.checked)} style={{ marginTop: 3 }} />
                  {t("portes.p1.packs.sim.mod")}
                </label>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 800, color: "rgba(11,18,32,0.78)", fontSize: 13, opacity: ((quoteMap as any)?.[pack]?.meta?.mandateEntrepriseAllowed) ? 1 : 0.55 }}>
                  <input
                    type="checkbox"
                    checked={mandateEntreprise}
                    onChange={(e) => setMandateEntreprise(e.target.checked)}
                    style={{ marginTop: 3 }}
                    disabled={!((quoteMap as any)?.[pack]?.meta?.mandateEntrepriseAllowed)}
                  />
                  {t("portes.p1.packs.sim.mandate")}
                </label>
              </div>

              {quoteErr && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(180,0,0,0.22)", background: "rgba(180,0,0,0.06)", fontSize: 13 }}>
                  {quoteErr}
                </div>
              )}

              {!!(quoteMap as any)?.[pack]?.notes?.length && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(11,18,32,0.14)", background: "rgba(11,18,32,0.03)", fontSize: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("portes.p1.packs.sim.notes")}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(quoteMap as any)[pack].notes.slice(0, 4).map((n: string, i: number) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid3" style={{ marginTop: 18 }}>
              <div className={`card ${pack === "ESSENTIEL" ? "featured" : ""}`}>
                <div className="badge">{t("portes.p1.packs.card.essentiel.badge")}</div>
                <div className="lux" style={{ marginTop: 12, fontSize: 19 }}>{t("portes.p1.packs.card.essentiel.lux")}</div>
                <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                  {t("portes.p1.packs.card.essentiel.desc")}
                </div>
                <div className="priceRow">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.total")}</span>
                  <span className="amt">{formatMAD((quoteMap as any)?.ESSENTIEL?.amounts?.totalMADRounded)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.currency")}</span>
                </div>
                <button className="btn btn-dark" type="button" onClick={() => setPack("ESSENTIEL")}>{t("portes.p1.packs.card.compare")}</button>
              </div>

              <div className={`card ${pack === "AVANCE" ? "featured" : ""}`}>
                <div className="badge">{t("portes.p1.packs.card.avance.badge")}</div>
                <div className="lux" style={{ marginTop: 12, fontSize: 19 }}>{t("portes.p1.packs.card.avance.lux")}</div>
                <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                  {t("portes.p1.packs.card.avance.desc")}
                </div>
                <div className="priceRow">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.total")}</span>
                  <span className="amt">{formatMAD((quoteMap as any)?.AVANCE?.amounts?.totalMADRounded)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.currency")}</span>
                </div>
                <button className="btn btn-gold" type="button" onClick={() => setPack("AVANCE")}>{t("portes.p1.packs.card.compare")}</button>
              </div>

              <div className={`card ${pack === "COMPLET" ? "featured" : ""}`}>
                <div className="badge">{t("portes.p1.packs.card.complet.badge")}</div>
                <div className="lux" style={{ marginTop: 12, fontSize: 19 }}>{t("portes.p1.packs.card.complet.lux")}</div>
                <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
                  {t("portes.p1.packs.card.complet.desc")}
                </div>
                <div className="priceRow">
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.total")}</span>
                  <span className="amt">{formatMAD((quoteMap as any)?.COMPLET?.amounts?.totalMADRounded)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{t("portes.p1.packs.card.currency")}</span>
                </div>
                <button className="btn btn-dark" type="button" onClick={() => setPack("COMPLET")}>{t("portes.p1.packs.card.compare")}</button>
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="lux" style={{ fontSize: 16, marginBottom: 10 }}>{t("portes.p1.packs.detail.title")}</div>
              <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.7, color: "rgba(11,18,32,0.75)" }}>
                <div><b>{t("portes.p1.packs.detail.pack")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.packMAD)} {t("portes.p1.packs.card.currency")}</div>
                <div><b>{t("portes.p1.packs.detail.remote_follow")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.remoteFollowMAD)} {t("portes.p1.packs.card.currency")}</div>
                <div><b>{t("portes.p1.packs.detail.bet")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.betMAD)} {t("portes.p1.packs.card.currency")}</div>
                <div><b>{t("portes.p1.packs.detail.mod")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.modMAD)} {t("portes.p1.packs.card.currency")}</div>
                <div><b>{t("portes.p1.packs.detail.deco")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.decoMAD)} {t("portes.p1.packs.card.currency")}</div>
                <div style={{ paddingTop: 6, borderTop: "1px solid rgba(11,18,32,0.10)" }}>
                  <b>{t("portes.p1.packs.detail.total")}</b> {formatMAD((quoteMap as any)?.[pack]?.amounts?.totalMADRounded)} {t("portes.p1.packs.card.currency")}
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                {t("portes.p1.packs.detail.note")}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className={pack === "AVANCE" ? "btn btn-gold" : "btn btn-dark"}
                  type="button"
                  onClick={() => choose(pack === "ESSENTIEL" ? "type" : pack === "AVANCE" ? "custom" : "premium")}
                >
                  {t("portes.p1.packs.detail.continue")}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="divider" />

        <div className="lux" style={{ fontSize: 18, marginBottom: 12 }}>{t("portes.p1.packs.faq.title")}</div>

        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px", background: "rgba(255,255,255,0.78)" }}>
            <div style={{ fontWeight: 900, color: "var(--royal)", marginBottom: 8 }}>{t("portes.p1.packs.faq.q1")}</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(11,18,32,0.72)" }}>
              {t("portes.p1.packs.faq.a1")}
            </div>
          </div>

          <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: "14px 16px", background: "rgba(255,255,255,0.78)" }}>
            <div style={{ fontWeight: 900, color: "var(--royal)", marginBottom: 8 }}>{t("portes.p1.packs.faq.q2")}</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(11,18,32,0.72)" }}>
              {t("portes.p1.packs.faq.a2")}
            </div>
            <div style={{ fontSize: 12, color: "rgba(11,18,32,0.55)", marginTop: 10 }}>
              {t("portes.p1.packs.faq.fees")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
