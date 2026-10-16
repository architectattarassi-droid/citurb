/**
 * /materiaux/:slug — fiche publique d'un matériau : prix de référence HT/TTC
 * et fourchette, unités de vente, prix par ville, sources et fiabilité,
 * évolution, ouvrages du chiffrage qui l'utilisent, prix fournisseurs,
 * demande de prix et signalement. Le même contenu est servi aux moteurs par
 * functions/_lib/seoMateriaux.ts.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { CATEGORIES } from "../../domain/materiaux/types";
import { unitesVente } from "../../domain/materiaux/conversions";
import { SOURCE_SIGNALEMENT } from "../../domain/materiaux/demandePrix";
import {
  MATERIAUTHEQUE_MAJ, MATERIAUX_PUBLICS, enPhrase, SLUG_CATEGORIE, VILLES_COEF, coefMateriaux, materiauParSlug, prixReference, prixTTC, slugMateriau,
} from "../../domain/materiaux/reference";
import { indicesMateriau, sourcesCitees } from "../../domain/materiaux/sources";
import { usagesMateriau } from "../../domain/materiaux/usages";
import { captureLead, currentUtm, leadKey, telephoneEnvoyable } from "../lead-funnel/leadBridge";
import { ouvrirPanier, useMateriaux, usePrixPublics } from "./etat";
import { medianeProduits, texteLocal, useCodesModeres, useProduits, type CodeModere, type ProduitCatalogue } from "./catalogueProduits";
import PanierDemande from "./PanierDemande";
import { OngletEtude, OngletRealisation } from "./PhasesFiche";
import Variantes from "./Variantes";
import { ProposerPourProjet } from "./CarnetClient";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";
import EcrireMessage from "../messages/EcrireMessage";
import { VisuelMateriau } from "./IconeFamille";
import { imageReference } from "../../domain/materiaux/images";
import { moisLisible, texte, type T } from "./textes";
import { BadgeFiabilite, BlocPrix, fmtDH, prixAffiche, uniteCourte } from "./ui";

const carte = "rounded-2xl border border-slate-200 bg-white p-4";
const h2 = "text-lg font-bold text-[#0B1B3A]";

export default function MateriauPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const onglet = params.get("phase") === "etude" ? "etude" : params.get("phase") === "realisation" ? "realisation" : "prix";
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const r = materiauParSlug(slug);
  const prix = usePrixPublics(m.ville);
  const produitsParCode = useProduits();
  const codesModeres = useCodesModeres();
  const modere = !r ? codesModeres?.find((c) => c.slug === slug) : undefined;

  useEffect(() => {
    if (r) document.title = `Prix ${enPhrase(r.libelle)} au Maroc ${MATERIAUTHEQUE_MAJ.slice(0, 4)} | CITURBAREA`;
  }, [r, slug]);

  if (!r && modere) return <FicheModeree c={modere} produits={produitsParCode.get(modere.ref.code) || []} t={t} lang={lang} />;
  if (!r && codesModeres === null) return <main className="mx-auto max-w-3xl px-4 py-12" aria-busy="true" />;
  if (!r) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-slate-700">{t("introuvable")}</p>
        <Link to="/materiaux" className="mt-3 inline-flex min-h-[44px] items-center font-semibold text-[#0B1B3A] underline">{t("retourCatalogue")}</Link>
      </main>
    );
  }
  // Ancien lien par code (/materiaux/CIT-GO-008) → adresse canonique.
  if (slug !== slugMateriau(r.code)) return <Navigate to={`/materiaux/${slugMateriau(r.code)}`} replace />;

  const ref = prixReference(r.code)!;
  const manuel = prix?.manuels[r.code];
  const { coef } = coefMateriaux(m.ville);
  const p = prixAffiche(r.code, manuel, coef);
  const pBase = prixAffiche(r.code, manuel, 1);
  const marche = prix?.marche[r.code];
  const sources = sourcesCitees(r.code);
  const indices = indicesMateriau(r.code);
  const usages = usagesMateriau(r.code);
  // Même famille du catalogue (liants, granulats…) d'abord, puis même catégorie.
  const voisins = [...MATERIAUX_PUBLICS.filter((x) => x.famille === r.famille && x.code !== r.code),
    ...MATERIAUX_PUBLICS.filter((x) => x.categorie === r.categorie && x.famille !== r.famille)].slice(0, 8);
  const nbFournisseurs = prix?.fournisseursParCategorie?.[r.categorie];
  const produits = produitsParCode.get(r.code) || [];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <nav aria-label="fil" className="mb-3 text-sm text-slate-500">
        <Link to="/materiaux" className="underline">{t("fil")}</Link> ›{" "}
        <Link to={`/materiaux/famille/${SLUG_CATEGORIE[r.categorie]}`} className="underline">{CATEGORIES[r.categorie]}</Link>
      </nav>
      <div className="flex items-start gap-3">
        <VisuelMateriau code={r.code} categorie={r.categorie} taille={72} lang={lang} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-[#0B1B3A] sm:text-3xl">
            {lang === "fr" ? `Prix ${enPhrase(r.libelle)} au Maroc (${moisLisible(MATERIAUTHEQUE_MAJ, "fr")})` : r.libelle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{r.famille} · {r.code}</p>
          {imageReference(r.code) && <p className="text-[11px] text-slate-400">{t("credit", { licence: `${imageReference(r.code)!.licence}${imageReference(r.code)!.auteur ? ` — ${imageReference(r.code)!.auteur}` : ""}` })}</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className={`${carte} lg:col-span-2`} aria-labelledby="prix-titre">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="prix-titre" className={h2}>{t("prixRef")}{m.ville ? ` — ${m.ville}` : ""}</h2>
            <BadgeFiabilite f={p.fiabilite} t={t} />
          </div>
          <div className="mt-2"><BlocPrix r={r} prix={p} marche={marche} t={t} lang={lang} grand /></div>
          <p className="mt-2 text-xs text-slate-500">
            {manuel ? `${t("dateMaj", { date: manuel.datePrix })} · ${manuel.source}` : ref.date ? t("dateMaj", { date: moisLisible(ref.date, lang) }) : t("nonDate")}
            {" · "}{ref.regime.observe === "TTC_PRESUME" ? t("regimeTTC") : t("regimeNI")}
          </p>
          <label className="mt-3 block max-w-xs text-sm text-slate-700">{t("ville")}
            <select className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={m.ville} onChange={(e) => m.setVille(e.target.value)}>
              <option value="">{t("villeBase")}</option>
              {VILLES_COEF.map((v) => <option key={v.cle} value={v.nom}>{v.nom}</option>)}
            </select>
          </label>
        </section>

        <aside className={`${carte} flex flex-col gap-3`} aria-label={t("demander")}>
          <h2 className={h2}>{t("demander")}</h2>
          <p className="text-sm text-slate-600">{t("demanderAide")}</p>
          <button type="button" onClick={() => { m.ajouter({ code: r.code, quantite: 1, unite: r.ventes[0]?.code || r.uniteRef }); ouvrirPanier(); }}
            className="min-h-[48px] rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c]">{t("demander")}</button>
          <button type="button" onClick={() => m.ajouter({ code: r.code, quantite: 1, unite: r.ventes[0]?.code || r.uniteRef })}
            className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#0B1B3A]">
            {m.panier.some((l) => l.code === r.code) ? t("ajoute") : t("ajouter")}
          </button>
          <div className="text-sm">
            <h3 className="font-semibold text-[#0B1B3A]">{t("fournisseurs")}</h3>
            {marche?.mediane != null
              ? <p className="text-emerald-800">{t("medianeFournisseurs", { n: marche.nbFournisseurs })} : <strong>{fmtDH(marche.mediane, lang)}</strong> {t("ht")} / {uniteCourte(r.uniteRef)}</p>
              : marche?.nbFournisseurs ? <p className="text-slate-600">{t("offresEnCours", { n: marche.nbFournisseurs })}</p>
                : <p className="text-slate-700"><strong>{t("referencementTitre")}</strong><br />{t("referencementTexte")}</p>}
            {nbFournisseurs ? <p className="mt-1 text-xs text-slate-500">{t("fournisseursN", { n: nbFournisseurs })}</p> : null}
            <Link to="/cercles/inscription" className="mt-1 inline-block text-xs font-semibold text-[#0B1B3A] underline">{t("referencezVos")}</Link>
          </div>
          <div>
            <DemanderAppelVideo contexte="fournisseur" objetId={r.code} invites={[{ type: "admin" }]} sujet={r.libelle} langue={lang === "ar" ? "ar" : "fr"} variante="contour" className="w-full" /> <EcrireMessage contexte="fournisseur" objetId={r.code} invites={[{ type: "admin" }]} sujet={r.libelle} langue={lang === "ar" ? "ar" : "fr"} variante="contour" />
          </div>
          <div>
            {/* Client connecté : proposer ce matériau pour son dossier (à partir de l'APD, validation par l'architecte). */}
            <ProposerPourProjet code={r.code} lang={lang} dossierPrefere={params.get("dossier")} />
          </div>
        </aside>
      </div>

      <div role="tablist" aria-label={t("phase")} className="mt-5 flex gap-1 border-b border-slate-200">
        {(["prix", "etude", "realisation"] as const).map((o) => (
          <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setParams(o === "prix" ? {} : { phase: o }, { replace: true })}
            className={`min-h-[44px] px-4 text-sm font-semibold ${onglet === o ? "border-b-2 border-[#C9A227] text-[#0B1B3A]" : "text-slate-500"}`}>
            {t(o === "prix" ? "ongletPrix" : o === "etude" ? "ongletEtude" : "ongletRealisation")}
          </button>
        ))}
      </div>
      {onglet === "prix" && (<>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={carte} aria-labelledby="unites-titre">
          <h2 id="unites-titre" className={h2}>{t("unitesVente")}</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-start text-xs text-slate-500"><th className="p-1 text-start">{t("uniteVente")}</th><th className="p-1 text-start">{t("contient")}</th><th className="p-1 text-end">{t("prixUnite")}</th><th className="p-1 text-end">{t("prixUniteTTC")}</th></tr></thead>
              <tbody>
                {unitesVente(r).map((u) => {
                  const v = Math.round(p.ref * u.facteur * 100) / 100;
                  return (
                    <tr key={u.code} className="border-t border-slate-100">
                      <td className="p-1">{u.code === r.uniteRef ? `1 ${uniteCourte(r.uniteRef)}` : u.libelle}</td>
                      <td className="p-1 text-slate-600">{u.facteur.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {uniteCourte(r.uniteRef)}{u.approx ? ` (${t("approx")})` : ""}</td>
                      <td className="p-1 text-end font-semibold">{fmtDH(v, lang)}</td>
                      <td className="p-1 text-end text-slate-600">{fmtDH(prixTTC(v), lang)}</td>
                    </tr>
                  );
                })}
                {r.masseKg ? <tr className="border-t border-slate-100"><td className="p-1">1 ml</td><td className="p-1 text-slate-600">{r.masseKg} kg</td><td className="p-1 text-end font-semibold">{fmtDH(Math.round(p.ref * r.masseKg * 100) / 100, lang)}</td><td className="p-1 text-end text-slate-600">{fmtDH(prixTTC(p.ref * r.masseKg), lang)}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className={carte} aria-labelledby="villes-titre">
          <h2 id="villes-titre" className={h2}>{t("parVille")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("parVilleAide")}</p>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-xs text-slate-500"><th className="p-1 text-start">{t("ville")}</th><th className="p-1 text-end">{t("coef")}</th><th className="p-1 text-end">{t("prixUnite")} / {uniteCourte(r.uniteRef)}</th></tr></thead>
            <tbody>
              {VILLES_COEF.map((v) => {
                const c = coefMateriaux(v.nom).coef;
                return (
                  <tr key={v.cle} className={`border-t border-slate-100 ${m.ville === v.nom ? "bg-amber-50" : ""}`}>
                    <td className="p-1">{v.nom}</td>
                    <td className="p-1 text-end text-slate-600">{c.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td>
                    <td className="p-1 text-end font-semibold">{fmtDH(Math.round(pBase.ref * c * 100) / 100, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      {produits.length > 0 && (
        <section className={`${carte} mt-4`} aria-labelledby="variantes-titre">
          <h2 id="variantes-titre" className={h2}>{t("variantes")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("variantesAide")}</p>
          <Variantes produits={produits} r={r} t={t} lang={lang} />
        </section>
      )}

      <section className={`${carte} mt-4`} aria-labelledby="sources-titre">
        <h2 id="sources-titre" className={h2}>{t("sources")}</h2>
        <p className="mt-1 text-sm text-slate-600">{ref.origine === "chiffrage" ? t("sourceOrigineChiffrage", { c: ref.composant || "" }) : t("sourceOrigineCatalogue")}</p>
        <ul className="mt-2 space-y-2 p-0">
          {sources.map((s, i) => (
            <li key={i} className="list-none rounded-lg bg-slate-50 p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeFiabilite f={s.fiabilite} t={t} court />
                {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-[#0B1B3A] underline">{s.nom}</a> : <span className="font-semibold text-[#0B1B3A]">{s.nom}</span>}
                {s.date && <span className="text-xs text-slate-500">{s.date}</span>}
              </div>
              {s.releve && <p className="mt-0.5 text-xs text-slate-600">{s.releve ? `${t("sourceReleve")} : ${s.releve}` : ""}{s.region && !/^(inconnu|national)$/i.test(s.region) ? ` · ${s.region}` : ""}{s.taxes && s.taxes !== "inconnu" ? ` · ${s.taxes}` : ""}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">{t("fiabAide")}</p>
        <Signaler code={r.code} libelle={r.libelle} t={t} lang={lang} />
      </section>

      {indices.length > 0 && (
        <section className={`${carte} mt-4`} aria-labelledby="indices-titre">
          <h2 id="indices-titre" className={h2}>{t("indices")}</h2>
          <ul className="mt-2 space-y-1 p-0 text-sm">
            {indices.map((i) => (
              <li key={i.libelle + i.periode} className="list-none">
                <strong>{i.valeur}</strong> — {i.libelle} ({i.periode}) ·{" "}
                {i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{i.source}</a> : i.source}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${carte} mt-4`} aria-labelledby="usages-titre">
        <h2 id="usages-titre" className={h2}>{t("sertA")}</h2>
        {usages.length > 0 ? (
          <>
            <p className="mt-1 text-xs text-slate-500">{t("sertAAide")}</p>
            <ul className="mt-2 grid gap-1 p-0 text-sm sm:grid-cols-2">
              {usages.slice(0, 16).map((u) => <li key={u.code} className="list-none">• {u.libelle} <span className="text-xs text-slate-500">({u.lot}, {u.unite})</span></li>)}
            </ul>
          </>
        ) : <p className="mt-1 text-sm text-slate-600">{r.lots.length ? r.lots.map((l) => l.replace(/^LOT_\d+_/, "").replace(/_/g, " ").toLowerCase()).join(", ") : "—"}</p>}
        <Link to="/chiffrage" className="mt-3 flex min-h-[48px] items-center justify-center rounded-lg bg-[#0B1B3A] px-4 text-center text-sm font-bold text-white" style={{ textDecoration: "none" }}>{t("chiffrer")}</Link>
      </section>

      {voisins.length > 0 && (
        <section className="mt-6" aria-labelledby="voisins-titre">
          <h2 id="voisins-titre" className={h2}>{t("memeFamille")}</h2>
          <ul className="mt-2 grid gap-2 p-0 sm:grid-cols-2">
            {voisins.map((v) => {
              const pv = prixAffiche(v.code, prix?.manuels[v.code], coef);
              return (
                <li key={v.code} className="list-none">
                  <Link to={`/materiaux/${slugMateriau(v.code)}`} className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1B3A] hover:bg-slate-50" style={{ textDecoration: "none" }}>
                    <span>{v.libelle}</span><span className="shrink-0 font-semibold">{fmtDH(pv.ref, lang)} / {uniteCourte(v.uniteRef)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </>)}
      {onglet === "etude" && <OngletEtude r={r} t={t} lang={lang} />}
      {onglet === "realisation" && <OngletRealisation r={r} t={t} lang={lang} />}
      <PanierDemande />
    </main>
  );
}

/** Signalement d'un prix par un visiteur → lead (source MATERIAUX_SIGNALEMENT), vérifié par l'équipe. */
function Signaler({ code, libelle, t, lang }: { code: string; libelle: string; t: T; lang: "fr" | "ar" | "en" }) {
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ prix: "", source: "", nom: "", telephone: "", website: "" });
  const [etat, setEtat] = useState("");
  const champ = "mt-1 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base";
  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const tel = telephoneEnvoyable(f.telephone);
    if (f.nom.trim().length < 2) return setEtat(t("erreurNom"));
    if (!tel) return setEtat(t("erreurTel"));
    setEtat("envoi");
    const texteSignal = `Signalement de prix — ${libelle} (${code}) : ${f.prix.slice(0, 60)} DH. ${f.source.slice(0, 500)}`;
    const r = await captureLead(leadKey(`SIG-${code}`, tel), {
      nom: f.nom.trim(), telephone: tel, projetType: "P6", source: SOURCE_SIGNALEMENT, lang, pageContext: window.location.pathname.slice(0, 300), utm: currentUtm(),
      meta: { projetLibre: texteSignal, wizard: { signalementPrix: { code, libelle, prixSignale: f.prix.slice(0, 60), source: f.source.slice(0, 500), referenceHT: prixReference(code)?.ref ?? null } } },
      website: f.website,
    });
    setEtat(r.status === "invalid" ? t("erreurEnvoi") : "ok");
  }
  if (etat === "ok") return <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900">{t("merciSignal")}</p>;
  return (
    <div className="mt-3">
      {!ouvert ? (
        <button type="button" onClick={() => setOuvert(true)} className="min-h-[44px] text-sm font-semibold text-[#0B1B3A] underline">{t("signaler")}</button>
      ) : (
        <form onSubmit={envoyer} className="relative mt-2 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2" noValidate>
          <p className="text-sm text-slate-600 sm:col-span-2">{t("signalerAide")}</p>
          <input type="text" name="website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />
          <label className="text-sm">{t("votrePrix")}<input className={champ} inputMode="decimal" value={f.prix} onChange={(e) => setF({ ...f, prix: e.target.value })} required /></label>
          <label className="text-sm">{t("message")}<input className={champ} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></label>
          <label className="text-sm">{t("nom")}<input className={champ} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="name" required /></label>
          <label className="text-sm">{t("telephone")}<input className={champ} type="tel" dir="ltr" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} autoComplete="tel" required /></label>
          {etat && etat !== "envoi" && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{etat}</p>}
          <button type="submit" disabled={etat === "envoi"} className="min-h-[44px] rounded-lg bg-[#0B1B3A] px-4 text-sm font-bold text-white sm:col-span-2">{etat === "envoi" ? t("envoi") : t("envoyer")}</button>
        </form>
      )}
    </div>
  );
}

/** Fiche d'un code créé en modération : pas de prix de référence, seulement les produits et prix agrégés des fournisseurs. */
function FicheModeree({ c, produits, t, lang }: { c: CodeModere; produits: ProduitCatalogue[]; t: T; lang: "fr" | "ar" | "en" }) {
  const m = useMateriaux();
  const r = c.ref;
  const pf = medianeProduits(produits);
  const nom = texteLocal(c.libelle, lang);
  useEffect(() => { document.title = `Prix ${enPhrase(c.libelle.fr)} au Maroc | CITURBAREA`; }, [c]);
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
      <nav aria-label="fil" className="mb-3 text-sm text-slate-500">
        <Link to="/materiaux" className="underline">{t("fil")}</Link> ›{" "}
        <Link to={`/materiaux/famille/${SLUG_CATEGORIE[r.categorie]}`} className="underline">{CATEGORIES[r.categorie]}</Link>
      </nav>
      <h1 className="text-2xl font-bold leading-tight text-[#0B1B3A] sm:text-3xl">{nom}</h1>
      <p className="mt-1 text-sm text-slate-500">{r.famille} · {r.code}</p>
      <p className="mt-2"><span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{t("nouveau")}</span></p>
      <section className={`${carte} mt-4`}>
        {pf ? <p className="text-emerald-800"><strong className="text-3xl text-[#0B1B3A]">{fmtDH(pf.mediane, lang)}</strong> {t("ht")} / {uniteCourte(r.uniteRef)} · {t("medianeFournisseurs", { n: pf.nbFournisseurs })}</p>
          : <p className="text-xl font-bold text-slate-700">{t("prixSurDemande")}</p>}
        <p className="mt-2 text-xs text-slate-500">{t("nouveauAide")}</p>
        <button type="button" onClick={() => { m.ajouter({ code: r.code, quantite: 1, unite: r.uniteRef }); ouvrirPanier(); }}
          className="mt-3 min-h-[48px] w-full rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c] sm:w-auto">{t("demander")}</button>
        <p className="mt-2 text-xs text-slate-500">{t("demanderAide")}</p>
      </section>
      {produits.length > 0 && (
        <section className={`${carte} mt-4`}>
          <h2 className={h2}>{t("variantes")}</h2>
          <ul className="mt-2 grid gap-2 p-0 sm:grid-cols-2">
            {produits.map((x) => (
              <li key={x.id} className="list-none rounded-lg border border-slate-200 p-2 text-sm">
                <p className="font-semibold text-[#0B1B3A]">{[x.marque, x.modele].filter(Boolean).join(" · ") || texteLocal(x.designation, lang)}</p>
                <p className="text-slate-600">{texteLocal(x.designation, lang)}</p>
                {x.conditionnements?.length ? <p className="text-xs text-slate-500">{x.conditionnements.map((k) => texteLocal(k.libelle, lang)).join(" · ")}</p> : null}
                {x.caracteristiques?.slice(0, 4).map((k, i) => <p key={i} className="text-xs text-slate-500">{texteLocal(k.libelle, lang)} : {texteLocal(k.valeur, lang)}</p>)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <PanierDemande />
    </main>
  );
}
