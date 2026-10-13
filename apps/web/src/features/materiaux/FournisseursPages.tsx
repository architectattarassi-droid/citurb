/**
 * /materiaux/fournisseurs et /materiaux/fournisseurs/:slug — navigation
 * « Par fournisseur » : fournisseurs approuvés (ville, zones, badges, nombre
 * de produits), puis produits d'un fournisseur groupés par famille avec leurs
 * photos. Aucune coordonnée : contact et demande de prix via la plateforme.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLang, type Lang } from "../../i18n/i18n";
import { materiau } from "../../domain/materiaux/catalogue";
import { nomRegion } from "../../domain/materiaux/regions";
import { VILLES_COEF, slugMateriau } from "../../domain/materiaux/reference";
import { CATEGORIES, type Categorie } from "../../domain/materiaux/types";
import { texteLocal, useProduits } from "./catalogueProduits";
import { useMateriaux } from "./etat";
import { useFournisseur, useFournisseurs, type FournisseurResume, type ProduitFournisseur } from "./fournisseursCatalogue";
import IconeFamille from "./IconeFamille";
import PanierDemande from "./PanierDemande";
import { texte, type T } from "./textes";
import Visionneuse from "./Visionneuse";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";

const carte = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

function Badges({ f, t }: { f: FournisseurResume; t: T }) {
  return (
    <span className="flex flex-wrap gap-1">
      {f.verifie && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">✓ {t("badgeVerifie")}</span>}
      {f.documentsVerifies && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{t("badgeDocuments")}</span>}
    </span>
  );
}

const zones = (f: FournisseurResume, t: T) =>
  f.zonesLivraison.includes("national") ? t("national") : f.zonesLivraison.map(nomRegion).join(", ") || f.ville || "—";

export function FournisseursPage() {
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const l = useFournisseurs(m.ville);
  useEffect(() => { document.title = `${t("fournisseursTitre")} | CITURBAREA`; }, [t]);
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]"><Link to="/materiaux" className="text-[#9a7b14] underline">{t("kicker")}</Link></p>
      <h1 className="mt-1 text-2xl font-bold text-[#0B1B3A] sm:text-3xl">{t("fournisseursTitre")}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">{t("fournisseursSous")}</p>
      <label className="mt-4 block max-w-xs text-sm text-slate-700">{t("ville")}
        <select className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={m.ville} onChange={(e) => m.setVille(e.target.value)}>
          <option value="">{t("toutes")}</option>
          {VILLES_COEF.map((v) => <option key={v.cle} value={v.nom}>{v.nom}</option>)}
        </select>
      </label>
      {l === null ? <p className="mt-6 text-slate-500" aria-busy="true">{t("chargement")}</p>
        : l.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-slate-700">
            <p>{t("fournisseursVide")}</p>
            <Link to="/cercles/inscription" className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-[#0B1B3A] underline">{t("inscrire")}</Link>
          </div>
        ) : (
          <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {l.map((f) => (
              <li key={f.slug} className={carte}>
                <div className="flex items-start gap-3">
                  {f.logoUrl ? <img src={f.logoUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded object-contain" /> : <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-lg font-bold text-[#0B1B3A]">{texteLocal(f.nom, lang).charAt(0)}</span>}
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[#0B1B3A]"><Link to={`/materiaux/fournisseurs/${f.slug}`} className="text-[#0B1B3A] hover:underline">{texteLocal(f.nom, lang)}</Link></h2>
                    <p className="text-sm text-slate-600">{f.ville || "—"}{f.metier ? ` · ${texteLocal(f.metier, lang)}` : ""}</p>
                  </div>
                </div>
                <div className="mt-2"><Badges f={f} t={t} /></div>
                <p className="mt-2 text-xs text-slate-600">{t("livre", { zones: zones(f, t) })}</p>
                <p className="mt-1 text-xs text-slate-500">{f.categories.filter((c) => c in CATEGORIES).map((c) => CATEGORIES[c as Categorie]).join(" · ")}</p>
                <Link to={`/materiaux/fournisseurs/${f.slug}`} className="mt-3 flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-[#0B1B3A]" style={{ textDecoration: "none" }}>
                  {t("voirProduits")} · {t("nbProduitsN", { n: f.nbProduits })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      <PanierDemande />
    </main>
  );
}

function CarteProduit({ p, t, lang, slugFournisseur }: { p: ProduitFournisseur; t: T; lang: Lang; slugFournisseur: string }) {
  const [vue, setVue] = useState<number | null>(null);
  const m = useMateriaux();
  const produits = useProduits();
  const ref = p.materiauCode ? materiau(p.materiauCode) : undefined;
  // Autres fournisseurs de la même variante (catalogue public : même code, marque et modèle).
  const autres = (p.materiauCode ? produits.get(p.materiauCode) || [] : [])
    .filter((x) => (x.marque || "") === (p.marque || "") && (x.modele || "") === (p.modele || ""))
    .flatMap((x) => x.fournisseurs || []).filter((f, i, a) => f.slug !== slugFournisseur && a.findIndex((y) => y.slug === f.slug) === i);
  const nom = texteLocal(p.designation, lang);
  return (
    <li className={`${carte} list-none`}>
      {p.images.length > 0 ? (
        <button type="button" onClick={() => setVue(0)} className="block w-full overflow-hidden rounded-lg" aria-label={`${nom} — ${t("photosN", { n: p.images.length })}`}>
          <img src={p.images[0].vignette || p.images[0].url} alt={nom} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </button>
      ) : ref ? <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-slate-100 text-[#0B1B3A]"><IconeFamille categorie={ref.categorie} taille={56} /></span> : null}
      {p.images.length > 1 && (
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {p.images.slice(1, 6).map((im, k) => (
            <button key={im.url} type="button" onClick={() => setVue(k + 1)} className="h-12 w-12 shrink-0 overflow-hidden rounded" aria-label={`${k + 2}`}>
              <img src={im.vignette || im.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <h3 className="mt-2 font-bold text-[#0B1B3A]">{[p.marque, p.modele].filter(Boolean).join(" · ") || nom}</h3>
      {(p.marque || p.modele) && <p className="text-sm text-slate-700">{nom}</p>}
      {p.conditionnement && <p className="text-xs text-slate-500">{p.conditionnement}</p>}
      {p.description && <p className="mt-1 line-clamp-3 text-xs text-slate-600">{texteLocal(p.description, lang)}</p>}
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {ref && <Link to={`/materiaux/${slugMateriau(ref.code)}`} className="text-[#0B1B3A] underline">{t("voirFicheMateriau")}</Link>}
        {p.ficheTechniqueUrl && <a href={p.ficheTechniqueUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[#0B1B3A] underline">{t("ficheTechnique")}</a>}
      </div>
      {autres.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">{t("autresFournisseurs")} : {autres.map((f, i) => (
          <React.Fragment key={f.slug}>{i > 0 && ", "}<Link to={`/materiaux/fournisseurs/${f.slug}`} className="underline">{texteLocal(f.nom, lang)}</Link></React.Fragment>
        ))}</p>
      )}
      <div className="mt-2">
        <DemanderAppelVideo contexte="fournisseur" objetId={`produit:${p.id}`} invites={[{ type: "pro", slug: slugFournisseur }]} sujet={nom} langue={lang === "ar" ? "ar" : "fr"} variante="lien" />
      </div>
      {ref && (
        <button type="button" onClick={() => m.ajouter({ code: ref.code, quantite: 1, unite: ref.ventes[0]?.code || ref.uniteRef })}
          className="mt-3 min-h-[44px] w-full rounded-lg bg-[#C9A227] px-3 text-sm font-bold text-[#0B1B3A]">{m.panier.some((l) => l.code === ref.code) ? t("ajoute") : t("ajouter")}</button>
      )}
      {vue !== null && <Visionneuse images={p.images} depart={vue} titre={nom} lang={lang} fermer={() => setVue(null)} />}
    </li>
  );
}

export function FournisseurPage() {
  const { slug = "" } = useParams();
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const d = useFournisseur(slug);
  useEffect(() => { if (d) document.title = `${texteLocal(d.fournisseur.nom, lang)} — ${t("fournisseursTitre")} | CITURBAREA`; }, [d, lang, t]);
  if (d === undefined) return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-500" aria-busy="true">{t("chargement")}</main>;
  if (d === null) return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-slate-700">{t("fournisseurIntrouvable")}</p>
      <Link to="/materiaux/fournisseurs" className="mt-3 inline-flex min-h-[44px] items-center font-semibold text-[#0B1B3A] underline">{t("retourFournisseurs")}</Link>
    </main>
  );
  // Familles fournies par le catalogue (libellés FR/AR).
  const { fournisseur: f, produits, groupes } = d;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <nav className="mb-3 text-sm text-slate-500"><Link to="/materiaux" className="underline">{t("fil")}</Link> › <Link to="/materiaux/fournisseurs" className="underline">{t("parFournisseur")}</Link></nav>
      <div className="flex flex-wrap items-start gap-3">
        {f.logoUrl && <img src={f.logoUrl} alt="" className="h-16 w-16 rounded object-contain" />}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#0B1B3A] sm:text-3xl">{texteLocal(f.nom, lang)}</h1>
          <p className="text-sm text-slate-600">{f.ville || "—"}{f.metier ? ` · ${texteLocal(f.metier, lang)}` : ""} · {t("livre", { zones: zones(f, t) })}</p>
          <div className="mt-1"><Badges f={f} t={t} /></div>
        </div>
        {/* Tout passe par CITURBAREA : aucune coordonnée ; demande de prix ou appel vidéo sur accord de chacun. */}
        <div className="ms-auto">
          <DemanderAppelVideo contexte="fournisseur" objetId={f.slug} invites={[{ type: "pro", slug: f.slug }]} avecNom={texteLocal(f.nom, lang)} langue={lang === "ar" ? "ar" : "fr"} variante="navy" />
        </div>
      </div>
      {produits.length === 0 ? <p className="mt-6 text-slate-600">{t("aucunProduit")}</p> : groupes.map(({ famille: cle, libelle, produits: l }) => (
        <section key={cle} className="mt-6">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{texteLocal(libelle, lang)} <span className="text-sm font-normal text-slate-500">({l.length})</span></h2>
          <ul className="mt-2 grid gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {l.map((p) => <CarteProduit key={p.id} p={p} t={t} lang={lang} slugFournisseur={f.slug} />)}
          </ul>
        </section>
      ))}
      <PanierDemande />
    </main>
  );
}
