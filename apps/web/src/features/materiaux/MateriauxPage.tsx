/**
 * /materiaux et /materiaux/famille/:slug — matériauthèque publique : prix de
 * référence de tous les matériaux du catalogue (une seule source de vérité :
 * domain/materiaux/reference.ts), filtres, comparateur, demande de prix.
 * Aucune API requise : les prix fournisseurs (/api/prix/materiaux) s'ajoutent s'ils existent.
 */
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { CATEGORIES, type Categorie } from "../../domain/materiaux/types";
import {
  FAMILLES, MATERIAUTHEQUE_MAJ, MATERIAUX_PUBLICS, SLUG_CATEGORIE, VILLES_COEF, categorieParSlug, coefMateriaux, familleDe, gammeDe,
  prixReference, prixTTC, slugMateriau, type Famille, type Gamme,
} from "../../domain/materiaux/reference";
import { moisLisible, texte, type T } from "./textes";
import { useMateriaux, usePrixPublics } from "./etat";
import PanierDemande from "./PanierDemande";
import { BadgeFiabilite, BlocPrix, fmtDH, prixAffiche, uniteCourte } from "./ui";

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const champ = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0B1B3A]";

export default function MateriauxPage() {
  const { slug } = useParams();
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const categorieRoute = slug ? categorieParSlug(slug) : undefined;
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [famille, setFamille] = useState<Famille | "">("");
  const [categorie, setCategorie] = useState<Categorie | "">(categorieRoute || "");
  const [gamme, setGamme] = useState<Gamme | "">("");
  const [fiab, setFiab] = useState("");
  const [tri, setTri] = useState<"nom" | "prixAsc" | "fiab">("nom");
  const [comparer, setComparer] = useState(false);
  const prix = usePrixPublics(m.ville);
  const coef = coefMateriaux(m.ville).coef;

  useEffect(() => { setCategorie(categorieRoute || ""); setFamille(""); }, [categorieRoute]);
  useEffect(() => {
    if (!categorieRoute) return;
    document.title = `Prix ${CATEGORIES[categorieRoute].toLowerCase()} au Maroc ${MATERIAUTHEQUE_MAJ.slice(0, 4)} | CITURBAREA`;
  }, [categorieRoute]);

  const liste = useMemo(() => {
    const k = sansAccent(dq.trim());
    const l = MATERIAUX_PUBLICS.filter((r) => {
      if (famille && familleDe(r.categorie) !== famille) return false;
      if (categorie && r.categorie !== categorie) return false;
      if (gamme && gammeDe(r) !== gamme) return false;
      if (fiab && prixReference(r.code)!.fiabilite !== fiab) return false;
      if (k && !sansAccent(`${r.libelle} ${r.famille} ${CATEGORIES[r.categorie]} ${(r.motsCles || []).join(" ")} ${r.code}`).includes(k)) return false;
      return true;
    });
    const ordre = { A: 0, B: 1, C: 2 };
    return l.sort((a, b) =>
      tri === "prixAsc" ? prixReference(a.code)!.ref - prixReference(b.code)!.ref
        : tri === "fiab" ? ordre[prixReference(a.code)!.fiabilite] - ordre[prixReference(b.code)!.fiabilite] || a.libelle.localeCompare(b.libelle, "fr")
          : a.categorie.localeCompare(b.categorie) || a.famille.localeCompare(b.famille, "fr") || a.libelle.localeCompare(b.libelle, "fr"));
  }, [dq, famille, categorie, gamme, fiab, tri]);

  const titre = categorieRoute
    ? `${CATEGORIES[categorieRoute]} — ${t("titre", { mois: moisLisible(MATERIAUTHEQUE_MAJ, lang) }).split(" — ")[0]}`
    : t("titre", { mois: moisLisible(MATERIAUTHEQUE_MAJ, lang) });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <header className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]">
          {categorieRoute ? <Link to="/materiaux" className="text-[#9a7b14] underline">{t("kicker")}</Link> : t("kicker")}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-[#0B1B3A] sm:text-4xl">{titre}</h1>
        <p className="mt-2 text-base text-slate-600">{t("sousTitre", { n: MATERIAUX_PUBLICS.length })}</p>
        <p className="mt-2 text-xs text-slate-500">{t("tvaAide")}</p>
      </header>

      <section aria-label={t("trier")} className="sticky top-0 z-30 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <input type="search" className={`${champ} text-base`} placeholder={t("rechercher")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("rechercher")} />
        {!categorieRoute && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("famille")}>
            {(["", ...Object.keys(FAMILLES)] as (Famille | "")[]).map((f) => (
              <button key={f || "toutes"} type="button" onClick={() => { setFamille(f); setCategorie(""); }} aria-pressed={famille === f}
                className={`min-h-[36px] shrink-0 rounded-full border px-3 text-sm font-semibold ${famille === f ? "border-[#0B1B3A] bg-[#0B1B3A] text-white" : "border-slate-300 bg-white text-[#0B1B3A]"}`}>
                {f ? FAMILLES[f].libelle : t("toutes")}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {!categorieRoute && (
            <select className={champ} value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)} aria-label={t("categorie")}>
              <option value="">{t("categorie")} : {t("toutes")}</option>
              {(Object.keys(CATEGORIES) as Categorie[]).filter((c) => !famille || familleDe(c) === famille).map((c) => <option key={c} value={c}>{CATEGORIES[c]}</option>)}
            </select>
          )}
          <select className={champ} value={m.ville} onChange={(e) => m.setVille(e.target.value)} aria-label={t("ville")}>
            <option value="">{t("ville")} : {t("villeBase")}</option>
            {VILLES_COEF.map((v) => <option key={v.cle} value={v.nom}>{v.nom}</option>)}
          </select>
          <select className={champ} value={gamme} onChange={(e) => setGamme(e.target.value as Gamme)} aria-label={t("gamme")}>
            <option value="">{t("gamme")} : {t("toutes")}</option>
            {(["eco", "courante", "haut"] as Gamme[]).map((g) => <option key={g} value={g}>{t(`gamme_${g}` as Parameters<T>[0])}</option>)}
          </select>
          <select className={champ} value={fiab} onChange={(e) => setFiab(e.target.value)} aria-label={t("fiabilite")}>
            <option value="">{t("fiabilite")} : {t("toutes")}</option>
            {(["A", "B", "C"] as const).map((f) => <option key={f} value={f}>{t(`fiab_${f}`)}</option>)}
          </select>
          <select className={champ} value={tri} onChange={(e) => setTri(e.target.value as typeof tri)} aria-label={t("trier")}>
            {(["nom", "prixAsc", "fiab"] as const).map((x) => <option key={x} value={x}>{t("trier")} : {t(`tri_${x}`)}</option>)}
          </select>
        </div>
      </section>

      <p className="mb-3 text-sm text-slate-600" aria-live="polite">{t("resultats", { n: liste.length })}</p>
      {liste.length === 0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{t("aucun")}</p>}

      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {liste.map((r) => {
          const p = prixAffiche(r.code, prix?.manuels[r.code], coef);
          const dansCompare = m.compare.includes(r.code);
          const dansPanier = m.panier.some((l) => l.code === r.code);
          return (
            <li key={r.code} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{CATEGORIES[r.categorie]} · {r.famille}</p>
              <h2 className="mt-0.5 text-base font-bold leading-snug text-[#0B1B3A]">
                <Link to={`/materiaux/${slugMateriau(r.code)}`} className="text-[#0B1B3A] hover:underline">{r.libelle}</Link>
              </h2>
              <div className="mt-1"><BadgeFiabilite f={p.fiabilite} t={t} /></div>
              <div className="mt-2 flex-1"><BlocPrix r={r} prix={p} marche={prix?.marche[r.code]} t={t} lang={lang} /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { m.ajouter({ code: r.code, quantite: 1, unite: r.ventes[0]?.code || r.uniteRef }); }}
                  className="min-h-[44px] flex-1 rounded-lg bg-[#C9A227] px-3 text-sm font-bold text-[#0B1B3A] hover:bg-[#d6b23c]">
                  {dansPanier ? t("ajoute") : t("ajouter")}
                </button>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-[#0B1B3A]">
                  <input type="checkbox" checked={dansCompare} onChange={() => m.basculerCompare(r.code)} /> {t("comparer")}
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      {m.compare.length > 0 && (
        <div className="fixed bottom-20 z-40 flex gap-2" style={{ insetInlineStart: 16 }}>
          <button type="button" onClick={() => setComparer(true)} className="min-h-[44px] rounded-full border border-[#0B1B3A] bg-white px-4 text-sm font-bold text-[#0B1B3A] shadow">
            {t("comparerN", { n: m.compare.length })}
          </button>
        </div>
      )}
      {comparer && <Comparateur t={t} lang={lang} fermer={() => setComparer(false)} />}

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{t("commentTitre")}</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-slate-600">
            <li>{t("comment1")}</li><li>{t("comment2")}</li><li>{t("comment3")}</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">{t("fiabAide")}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <Link to="/chiffrage" className="flex min-h-[48px] items-center justify-center rounded-lg bg-[#0B1B3A] px-4 text-center text-sm font-bold text-white" style={{ textDecoration: "none" }}>{t("chiffrer")}</Link>
          <Link to="/cercles/inscription" className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 text-center text-sm font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>{t("fournisseurCta")}</Link>
          <nav aria-label={t("categorie")} className="text-sm">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 p-0">
              {(Object.keys(CATEGORIES) as Categorie[]).map((c) => <li key={c} className="list-none"><Link to={`/materiaux/famille/${SLUG_CATEGORIE[c]}`} className="text-[#0B1B3A] underline">{CATEGORIES[c]}</Link></li>)}
            </ul>
          </nav>
        </div>
      </section>
      <PanierDemande />
    </main>
  );
}

function Comparateur({ t, lang, fermer }: { t: T; lang: string; fermer: () => void }) {
  const m = useMateriaux();
  const prix = usePrixPublics(m.ville);
  const coef = coefMateriaux(m.ville).coef;
  const items = m.compare.map((c) => MATERIAUX_PUBLICS.find((r) => r.code === c)).filter(Boolean) as typeof MATERIAUX_PUBLICS;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [fermer]);
  const lignes: [string, (r: (typeof items)[number]) => React.ReactNode][] = [
    [t("prixRef"), (r) => { const p = prixAffiche(r.code, prix?.manuels[r.code], coef); return <>{fmtDH(p.ref, lang)} {t("ht")} / {uniteCourte(r.uniteRef)}<br /><span className="text-xs text-slate-500">{fmtDH(prixTTC(p.ref), lang)} {t("ttc")}</span></>; }],
    [t("fourchette"), (r) => { const p = prixAffiche(r.code, prix?.manuels[r.code], coef); return `${fmtDH(p.min, lang)} – ${fmtDH(p.max, lang)}`; }],
    [t("uniteVente"), (r) => r.ventes[0] ? `${r.ventes[0].libelle} : ${fmtDH(Math.round(prixAffiche(r.code, prix?.manuels[r.code], coef).ref * r.ventes[0].facteur * 100) / 100, lang)} ${t("ht")}` : uniteCourte(r.uniteRef)],
    [t("fiabilite"), (r) => <BadgeFiabilite f={prixReference(r.code)!.fiabilite} t={t} court />],
    [t("dateMaj", { date: "" }).trim(), (r) => moisLisible(prixReference(r.code)!.date, lang as "fr") || t("nonDate")],
    [t("fournisseurs"), (r) => { const x = prix?.marche[r.code]; return x?.mediane != null ? fmtDH(x.mediane, lang) : t("indicatif"); }],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={t("comparateur")} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{t("comparateur")}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => { m.viderCompare(); fermer(); }} className="min-h-[44px] px-3 text-sm text-slate-600 underline">{t("vider")}</button>
            <button type="button" onClick={fermer} className="min-h-[44px] rounded-lg bg-slate-100 px-3 text-sm font-semibold">{t("fermer")}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 p-2" />
                {items.map((r) => (
                  <th key={r.code} className="p-2 text-start align-top font-semibold text-[#0B1B3A]">
                    <Link to={`/materiaux/${slugMateriau(r.code)}`} onClick={fermer} className="underline">{r.libelle}</Link>
                    <button type="button" onClick={() => m.basculerCompare(r.code)} className="ms-2 text-xs font-normal text-slate-500 underline">{t("retirer")}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map(([l, f]) => (
                <tr key={l} className="border-t border-slate-200">
                  <th scope="row" className="p-2 text-start text-xs font-semibold text-slate-500">{l}</th>
                  {items.map((r) => <td key={r.code} className="p-2 align-top">{f(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
