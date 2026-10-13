/**
 * Marques et variantes d'un matériau (produits fournisseurs approuvés) :
 * vignette → galerie (visionneuse), caractéristiques FR/AR, prix agrégé
 * (≥ 3 fournisseurs), fournisseurs qui proposent la variante (fiches
 * publiques, jamais de coordonnées).
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "../../i18n/i18n";
import type { MaterialRef } from "../../domain/materiaux/types";
import { texteLocal, type ProduitCatalogue } from "./catalogueProduits";
import type { T } from "./textes";
import { fmtDH, uniteCourte } from "./ui";
import Visionneuse from "./Visionneuse";
import DemanderAppelVideo from "../appels/DemanderAppelVideo";
import EcrireMessage from "../messages/EcrireMessage";

export default function Variantes({ produits, r, t, lang }: { produits: ProduitCatalogue[]; r: MaterialRef; t: T; lang: Lang }) {
  const [vue, setVue] = useState<{ p: ProduitCatalogue; i: number } | null>(null);
  return (
    <>
      <ul className="mt-2 grid gap-2 p-0 sm:grid-cols-2">
        {produits.map((x) => {
          const images = x.images || [];
          const nom = [x.marque, x.modele].filter(Boolean).join(" · ") || texteLocal(x.designation, lang);
          return (
            <li key={x.id} className="flex list-none gap-3 rounded-lg border border-slate-200 p-2">
              {images.length > 0 && (
                <button type="button" onClick={() => setVue({ p: x, i: 0 })} className="relative h-20 w-20 shrink-0 overflow-hidden rounded" aria-label={`${nom} — ${t("photosN", { n: images.length })}`}>
                  <img src={images[0].vignette || images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {images.length > 1 && <span className="absolute bottom-0 end-0 rounded-ss bg-black/60 px-1 text-[10px] text-white">{images.length}</span>}
                </button>
              )}
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-[#0B1B3A]">{nom}</p>
                <p className="text-slate-600">{texteLocal(x.designation, lang)}</p>
                {x.conditionnements?.length ? <p className="text-xs text-slate-500">{x.conditionnements.map((c) => texteLocal(c.libelle, lang)).join(" · ")}</p> : null}
                {x.caracteristiques?.slice(0, 4).map((c, i) => <p key={i} className="text-xs text-slate-500">{texteLocal(c.libelle, lang)} : {texteLocal(c.valeur, lang)}</p>)}
                {x.prix ? <p className="mt-0.5 text-emerald-800">{t("medianeFournisseurs", { n: x.prix.nbFournisseurs })} : <strong>{fmtDH(x.prix.mediane, lang)}</strong> {t("ht")} / {uniteCourte(r.uniteRef)}</p>
                  : x.nbFournisseurs ? <p className="text-xs text-slate-500">{t("proposeParN", { n: x.nbFournisseurs })}</p> : null}
                {x.fournisseurs?.length ? (
                  <p className="mt-0.5 text-xs text-slate-600">{t("autresFournisseurs")} : {x.fournisseurs.map((f, i) => (
                    <React.Fragment key={f.slug}>{i > 0 && ", "}<Link to={`/materiaux/fournisseurs/${f.slug}`} className="underline">{texteLocal(f.nom, lang)}</Link>{f.documentsVerifies ? " ✓" : ""}</React.Fragment>
                  ))}</p>
                ) : null}
                {x.ficheTechniqueUrl && <a href={x.ficheTechniqueUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-xs underline">{t("ficheTechnique")}</a>}
                {/* Appel vidéo avec le cabinet, qui relaie auprès des fournisseurs (aucune coordonnée échangée). */}
                <DemanderAppelVideo contexte="fournisseur" objetId={`produit:${x.id}`} invites={[{ type: "admin" }]} sujet={nom} langue={lang === "ar" ? "ar" : "fr"} variante="lien" /> <EcrireMessage contexte="fournisseur" objetId={`produit:${x.id}`} invites={[{ type: "admin" }]} sujet={nom} langue={lang === "ar" ? "ar" : "fr"} variante="lien" />
              </div>
            </li>
          );
        })}
      </ul>
      {vue && <Visionneuse images={vue.p.images || []} depart={vue.i} titre={[vue.p.marque, vue.p.modele].filter(Boolean).join(" · ") || texteLocal(vue.p.designation, lang)} lang={lang} fermer={() => setVue(null)} />}
    </>
  );
}
