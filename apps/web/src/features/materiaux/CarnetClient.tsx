/**
 * Espace client : bouton « Proposer pour mon projet » (fiche matériau) et carnet
 * des matériaux du dossier (/mon-espace). Le client propose à partir de l'APD ;
 * seul l'architecte valide. Routes : /api/client/moi, /api/client/dossiers/:id/materiaux
 * (session cli_session ; le client ne voit que ses dossiers).
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n/i18n";
import { LOTS } from "../../domain/chiffrage/lots";
import { proposableEnPhase, type LigneCarnet } from "../../domain/materiaux/carnet";
import { materiau } from "../../domain/materiaux/catalogue";
import { slugMateriau } from "../../domain/materiaux/reference";
import { rechercherMateriaux } from "../../domain/materiaux/recherche";
import { texte } from "./textes";

type DossierMoi = { id: string; titre: string | null; commune: string | null; phase: { code: string; titre: string } | null };

async function lireJson(url: string, init?: RequestInit): Promise<{ status: number; j: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: init?.body ? { "content-type": "application/json" } : undefined });
    return { status: r.status, j: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch { return { status: 0, j: {} }; }
}

/** Dossiers du client connecté (null : non connecté ou indisponible). */
function useMesDossiers(): DossierMoi[] | null | undefined {
  const [d, setD] = useState<DossierMoi[] | null | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    lireJson("/api/client/moi").then(({ status, j }) => {
      if (!vivant) return;
      setD(status === 200 && Array.isArray(j.dossiers) ? (j.dossiers as DossierMoi[]) : null);
    });
    return () => { vivant = false; };
  }, []);
  return d;
}

const champ = "mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base";

export function ProposerPourProjet({ code, lang, dossierPrefere }: { code: string; lang: Lang; dossierPrefere?: string | null }) {
  const t = useMemo(() => texte(lang), [lang]);
  const dossiers = useMesDossiers();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ dossier: dossierPrefere || "", lot: "", emplacement: "", quantite: "", note: "" });
  const [etat, setEtat] = useState("");
  const r = materiau(code);
  // Lots du matériau d'abord (ouvrages du chiffrage), puis les autres.
  const lots = useMemo(() => {
    const siens = rechercherMateriaux({ texte: code, limite: 1 }).resultats[0]?.lots || [];
    return [...LOTS.filter((l) => siens.includes(l.code)), ...LOTS.filter((l) => !siens.includes(l.code))];
  }, [code]);
  useEffect(() => { if (!f.dossier && dossiers?.length) setF((x) => ({ ...x, dossier: dossierPrefere && dossiers.some((d) => d.id === dossierPrefere) ? dossierPrefere : dossiers[0].id })); }, [dossiers]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r || dossiers === undefined) return null;
  if (dossiers === null || !dossiers.length)
    return (
      <p className="text-xs text-slate-600">{t("proposerConnexion")} <Link to="/mon-espace" className="font-semibold text-[#0B1B3A] underline">{t("seConnecter")}</Link></p>
    );
  const choisi = dossiers.find((d) => d.id === f.dossier) || dossiers[0];
  const permis = proposableEnPhase(choisi.phase?.code);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    const { status, j } = await lireJson(`/api/client/dossiers/${encodeURIComponent(choisi.id)}/materiaux`, {
      method: "POST", body: JSON.stringify({ code, lot: f.lot || lots[0]?.code || null, emplacement: f.emplacement, quantite: f.quantite || null, note: f.note }),
    });
    setEtat(status === 201 ? "ok" : j.error === "avant_apd" ? t("proposerAvantApd") : t("proposerErreur"));
  }

  return (
    <div className="rounded-xl border border-[#0B1B3A]/20 bg-slate-50 p-3">
      {!ouvert ? (
        <>
          <button type="button" onClick={() => setOuvert(true)} disabled={!permis && dossiers.length === 1}
            className="min-h-[44px] w-full rounded-lg border border-[#0B1B3A] bg-white px-4 text-sm font-bold text-[#0B1B3A] disabled:opacity-50">{t("proposerProjet")}</button>
          {!permis && dossiers.length === 1 && <p className="mt-1 text-xs text-slate-600">{t("proposerAvantApd")}</p>}
        </>
      ) : etat === "ok" ? (
        <p className="text-sm text-emerald-800">{t("proposerOk")}</p>
      ) : (
        <form onSubmit={envoyer} className="grid gap-2">
          <p className="text-xs text-slate-600">{t("proposerAide")}</p>
          <label className="text-sm">{t("proposerDossier")}
            <select className={champ} value={choisi.id} onChange={(e) => setF({ ...f, dossier: e.target.value })}>
              {dossiers.map((d) => <option key={d.id} value={d.id}>{d.titre || d.commune || d.id}{d.phase ? ` — ${d.phase.titre}` : ""}</option>)}
            </select>
          </label>
          {!permis ? <p className="text-sm font-semibold text-amber-800">{t("proposerAvantApd")}</p> : (
            <>
              <label className="text-sm">{t("proposerLot")}
                <select className={champ} value={f.lot || lots[0]?.code} onChange={(e) => setF({ ...f, lot: e.target.value })}>
                  {lots.map((l) => <option key={l.code} value={l.code}>{l.libelle}</option>)}
                </select>
              </label>
              <label className="text-sm">{t("proposerEmplacement")}<input className={champ} value={f.emplacement} maxLength={120} onChange={(e) => setF({ ...f, emplacement: e.target.value })} /></label>
              <label className="text-sm">{t("quantiteIndicative")} ({r.uniteRef})<input className={champ} type="number" min="0" step="any" inputMode="decimal" value={f.quantite} onChange={(e) => setF({ ...f, quantite: e.target.value })} /></label>
              <label className="text-sm">{t("proposerNote")}<textarea className={`${champ} min-h-[64px] py-2`} maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
              {etat && etat !== "envoi" && <p role="alert" className="text-sm text-red-700">{etat}</p>}
              <button type="submit" disabled={etat === "envoi"} className="min-h-[44px] rounded-lg bg-[#0B1B3A] px-4 text-sm font-bold text-white">{t("proposerEnvoyer")}</button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

/** Carnet des matériaux d'un dossier, vu par son client (statut, motif, variante). */
export default function CarnetClient({ dossierId, lang }: { dossierId: string; lang: Lang }) {
  const t = useMemo(() => texte(lang), [lang]);
  const [l, setL] = useState<LigneCarnet[] | null | "bientot">(null);
  useEffect(() => {
    let vivant = true;
    lireJson(`/api/client/dossiers/${encodeURIComponent(dossierId)}/materiaux`).then(({ status, j }) => {
      if (vivant) setL(status === 200 && Array.isArray(j.lignes) ? (j.lignes as LigneCarnet[]) : "bientot");
    });
    return () => { vivant = false; };
  }, [dossierId]);
  return (
    <div>
      <p className="text-sm text-slate-600">{t("carnetAide")}</p>
      {l === null ? null : l === "bientot" ? <p className="mt-2 text-sm text-slate-500">{t("carnetBientot")}</p> : l.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t("carnetVide")}</p> : (
        <ul className="mt-2 space-y-2 p-0">
          {l.map((x) => (
            <li key={x.id} className="list-none rounded-lg border border-slate-200 bg-white p-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <Link to={`/materiaux/${slugMateriau(x.code)}`} className="font-semibold text-[#0B1B3A] underline">{x.nom}</Link>
                <span className={x.statut === "VALIDE" ? "text-emerald-700" : x.statut === "REFUSE" ? "text-red-700" : "text-amber-800"}>{t(`statut_${x.statut}` as Parameters<typeof t>[0])}</span>
              </div>
              <p className="text-xs text-slate-500">{[x.emplacement, x.quantite != null ? `${x.quantite} ${x.unite || ""}` : null].filter(Boolean).join(" · ")}</p>
              {x.motif && <p className="text-xs text-slate-700">{t("motif")} : {x.motif}</p>}
              {x.varianteCode && materiau(x.varianteCode) && <p className="text-xs">{t("variante")} : <Link to={`/materiaux/${slugMateriau(x.varianteCode)}`} className="underline">{materiau(x.varianteCode)!.libelle}</Link></p>}
            </li>
          ))}
        </ul>
      )}
      <Link to={`/materiaux?dossier=${encodeURIComponent(dossierId)}`} className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#0B1B3A] underline">{t("carnetProposer")}</Link>
    </div>
  );
}
