/**
 * /cercles/pro/:slug (et /ar/cercles/pro/:slug) — fiche publique d'un pro
 * vérifié : société (gabarit du métier, sans champs privés), produits,
 * prestations, matériaux du référentiel proposés, références de chantiers.
 * Aucun prix nominatif ni coordonnée : contact via la plateforme (lead).
 * Contenus saisis affichés dans la langue du visiteur, repli sur l'autre.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { champsDuType, libelleMetier, type ReferenceChantier } from "../../domain/cercles/gabarits";
import { CATEGORIES_L3, REGIONS_L3, unite3 } from "../../domain/cercles/libelles";
import { DISPONIBILITES_L3, FAMILLES_PRODUIT, GAMMES, NATURES_SERVICE } from "../../domain/cercles/offres";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { apiFournisseurs, codeErreur, type FichePro, type Produit, type Service } from "./api";
import { useLangueForcee } from "./langue";
import { useTextes, type Textes } from "./textes";
import { Champ, PageFournisseurs, T, TexteSaisi } from "./ui";

type Objet = { type: "produit" | "service" | "fiche"; id: string; libelle: string } | null;

function valeurChamp(cle: string, v: unknown, metier: string, x: Textes): string {
  const c = champsDuType(metier).find((y) => y.cle === cle);
  if (!c || v == null || v === "") return "";
  if (c.type === "oui_non") return v === true ? x.t("oui") : x.t("non");
  if (c.type === "choix") return x.l3(c.options?.find(([k]) => k === v)?.[1]) || String(v);
  if (c.type === "multi") return (v as string[]).map((k) => x.l3(c.options?.find(([o]) => o === k)?.[1]) || k).join(" · ");
  if (c.type === "liste") return (v as string[]).join(" · ");
  if (c.type === "nombre") return x.nb(Number(v));
  return String(v);
}

export default function FicheProPage({ langue }: { langue?: "ar" }) {
  useLangueForcee(langue);
  const x = useTextes();
  const { slug = "" } = useParams();
  const [d, setD] = useState<FichePro | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [objet, setObjet] = useState<Objet>(null);
  const contact = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivant = true;
    apiFournisseurs.fichePro(slug).then((r) => vivant && setD(r)).catch((e) => vivant && setErreur(codeErreur(e) || "reseau"));
    return () => { vivant = false; };
  }, [slug]);
  useEffect(() => {
    if (d) document.title = `${x.bi(d.fournisseur.raisonSociale, d.fournisseur.raisonSocialeAr).texte} — ${x.l3(libelleMetier(d.fournisseur.metier))} | CITURBAREA`;
  }, [d, x.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (erreur) return <PageFournisseurs><div className="frn-alerte frn-info">{erreur === "not_found" ? x.t("fpIntrouvable") : x.erreur(erreur)}</div><p><Link to="/cercles/annuaire">{x.t("fpRetour")}</Link></p></PageFournisseurs>;
  if (!d) return <PageFournisseurs><p>{x.t("chargement")}</p></PageFournisseurs>;

  const f = d.fournisseur;
  const arabeExiste = !!(f.descriptionAr || f.raisonSocialeAr);
  const demander = (o: Objet) => { setObjet(o); contact.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const champs = Object.entries(f.fiche).filter(([k]) => k !== "references").map(([k, v]) => [k, valeurChamp(k, v, f.metier, x)] as const).filter(([, v]) => v);
  const refs = (f.fiche.references || []) as ReferenceChantier[];

  return (
    <PageFournisseurs>
      <p style={{ margin: "0 0 8px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to={x.lang === "ar" ? "/ar/cercles/annuaire" : "/cercles/annuaire"}>{x.t("fpRetour")}</Link>
        {arabeExiste && (langue === "ar"
          ? <Link to={`/cercles/pro/${f.slug}`} hrefLang="fr" onClick={() => x.setLang("fr")}>{x.t("fpEnFrancais")}</Link>
          : <Link to={`/ar/cercles/pro/${f.slug}`} hrefLang="ar">{x.t("fpEnArabe")}</Link>)}
      </p>
      <header style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        {f.logoUrl && <img src={f.logoUrl} alt="" width={72} height={72} style={{ borderRadius: 12, objectFit: "contain", background: "#fff", border: `1px solid ${T.borderSoft}` }} />}
        <div style={{ minWidth: 0 }}>
          <TexteSaisi as="h1" fr={f.raisonSociale} ar={f.raisonSocialeAr} style={{ margin: 0 }} />
          <div style={{ color: T.inkMid }}>{x.l3(libelleMetier(f.metier))} · {f.ville}{f.membreDepuis ? ` · ${x.t("fpMembreDepuis", { d: x.date(f.membreDepuis) })}` : ""}</div>
          <div className="frn-puces" style={{ marginTop: 6 }}>
            {f.verifie && <span className="frn-badge" style={{ background: T.successBg, color: T.success }}>✓ {x.t("anVerifie")}</span>}
            {f.documentsVerifies && <span className="frn-badge" style={{ background: T.infoBg, color: T.info }}>{x.t("anDocsVerifies")}</span>}
          </div>
        </div>
        <button className="frn-btn frn-btn-or" style={{ marginInlineStart: "auto" }} onClick={() => demander(null)}>{x.t("fpContacter")}</button>
      </header>
      <style>{`.frn-page h1{font-family:inherit;font-size:clamp(24px,4.5vw,34px);color:${T.navy};line-height:1.2}`}</style>

      <section className="frn-carte" style={{ marginTop: 18, display: "grid", gap: 10 }}>
        <TexteSaisi fr={f.description} ar={f.descriptionAr} style={{ margin: 0, lineHeight: 1.6 }} />
        <div style={{ fontSize: 14 }}><strong>{x.t("fpZones")} : </strong>{f.zonesLivraison.map((z) => x.l3(REGIONS_L3[z])).join(" · ") || "—"}</div>
        {!!f.categories.length && <div style={{ fontSize: 14 }}><strong>{x.t("categories")} : </strong>{f.categories.map((c) => x.l3(CATEGORIES_L3[c])).join(" · ")}</div>}
        {!!champs.length && (
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: "6px 14px", margin: 0, fontSize: 14 }}>
            {champs.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt style={{ color: T.inkMid }}>{x.l3(champsDuType(f.metier).find((c) => c.cle === k)?.libelle)}</dt>
                <dd style={{ margin: 0 }}>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
      </section>

      {!!d.produits.length && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ color: T.navy, fontSize: 20 }}>{x.t("fpProduits")}</h2>
          <div className="frn-cartes">{d.produits.map((p) => <CarteProduit key={p.id} p={p} onDemander={demander} />)}</div>
        </section>
      )}

      {!!d.services.length && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ color: T.navy, fontSize: 20 }}>{x.t("fpServices")}</h2>
          <div className="frn-cartes">{d.services.map((s) => <CarteService key={s.id} s={s} onDemander={demander} />)}</div>
        </section>
      )}

      {!!d.materiauxChiffres.length && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ color: T.navy, fontSize: 20 }}>{x.t("fpMateriauxChiffres")}</h2>
          <div className="frn-carte" style={{ padding: 0 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {d.materiauxChiffres.map((m) => (
                <li key={m.materiauCode} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${T.borderSoft}`, alignItems: "center", flexWrap: "wrap" }}>
                  <Link to={`/materiaux/${m.materiauCode}`} lang="fr">{m.libelle}</Link>
                  <small style={{ color: T.inkMuted }}>{m.uniteVenteLibelle}{m.marque ? ` · ${m.marque}` : ""} · {x.t(`dispo_${m.disponibilite}` as never)}</small>
                  <button className="frn-btn frn-btn-ghost frn-btn-petit" style={{ marginInlineStart: "auto" }} onClick={() => demander({ type: "fiche", id: m.materiauCode, libelle: m.libelle })}>{x.t("fpDemanderPrix")}</button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!!refs.length && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ color: T.navy, fontSize: 20 }}>{x.t("fpReferences")}</h2>
          <div className="frn-cartes">
            {refs.map((r, i) => (
              <article key={i} className="frn-carte" style={{ display: "grid", gap: 6 }}>
                {r.photos[0] && <img src={r.photos[0]} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8 }} />}
                <strong>{r.titre}</strong>
                <small style={{ color: T.inkMid }}>{[r.ville, r.annee].filter(Boolean).join(" · ")}</small>
                {r.description && <p style={{ margin: 0, fontSize: 14 }}>{r.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <div ref={contact} style={{ marginTop: 28 }}><Contact slug={f.slug} objet={objet} /></div>
    </PageFournisseurs>
  );
}

function CarteProduit({ p, onDemander }: { p: Produit; onDemander: (o: Objet) => void }) {
  const x = useTextes();
  const fam = FAMILLES_PRODUIT[p.famille];
  const car = Object.entries(p.caracteristiques).map(([k, v]) => {
    const c = fam?.champs.find((y) => y.cle === k);
    if (!c) return null;
    const val = c.type === "choix" ? x.l3(c.options?.find(([o]) => o === v)?.[1]) : c.type === "oui_non" ? (v ? x.t("oui") : x.t("non")) : `${v}${c.unite ? ` ${c.unite}` : ""}`;
    return [x.l3(c.libelle), val] as const;
  }).filter(Boolean) as (readonly [string, string])[];
  const nom = x.bi(p.designationFr, p.designationAr).texte;
  return (
    <article className="frn-carte" style={{ display: "grid", gap: 8, alignContent: "start" }}>
      {p.photos[0] && <img src={p.photos[0]} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8 }} />}
      <TexteSaisi as="strong" fr={p.designationFr} ar={p.designationAr} />
      <small style={{ color: T.inkMid }}>{[p.marque, p.modele].filter(Boolean).join(" · ")}{fam ? ` · ${x.l3(fam.libelle)}` : ""}{p.gamme ? ` · ${x.l3(GAMMES[p.gamme])}` : ""}</small>
      {!!car.length && <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13 }}>{car.slice(0, 6).map(([l, v]) => <li key={l}>{l} : {v}</li>)}</ul>}
      <small>{x.t("fpVenduPar", { u: p.uniteVente })}{p.facteur !== 1 ? ` (${x.nb(p.facteur, 3)} ${x.l3(unite3(p.uniteRef))})` : ""}{p.conditionnement ? ` · ${p.conditionnement}` : ""}</small>
      <small style={{ color: T.inkMid }}>{x.l3(DISPONIBILITES_L3[p.disponibilite])}{p.delaiJours != null ? ` · ${x.t("fpDelai", { n: p.delaiJours })}` : ""}</small>
      {p.ficheTechniqueUrl && <a href={p.ficheTechniqueUrl} target="_blank" rel="noreferrer noopener" style={{ fontSize: 13 }}>{x.t("fpFicheTechnique")}</a>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="frn-etiquette">{x.t("fpPrixSurDemande")}</span>
        <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => onDemander({ type: "produit", id: p.id, libelle: nom })}>{x.t("fpDemanderPrix")}</button>
      </div>
    </article>
  );
}

function CarteService({ s, onDemander }: { s: Service; onDemander: (o: Objet) => void }) {
  const x = useTextes();
  const nom = x.bi(s.designationFr, s.designationAr).texte;
  return (
    <article className="frn-carte" style={{ display: "grid", gap: 8, alignContent: "start" }}>
      <TexteSaisi as="strong" fr={s.designationFr} ar={s.designationAr} />
      <small style={{ color: T.inkMid }}>{x.l3(NATURES_SERVICE[s.nature])} · {x.l3(unite3(s.unite))}{s.delaiJours != null ? ` · ${x.t("fpDelai", { n: s.delaiJours })}` : ""}</small>
      <TexteSaisi fr={s.descriptionFr} ar={s.descriptionAr} style={{ margin: 0, fontSize: 14 }} />
      {s.conditions && <small>{s.conditions}</small>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="frn-etiquette">{x.t("fpPrixSurDemande")}</span>
        <button className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => onDemander({ type: "service", id: s.id, libelle: nom })}>{x.t("fpDemanderPrix")}</button>
      </div>
    </article>
  );
}

function Contact({ slug, objet }: { slug: string; objet: Objet }) {
  const x = useTextes();
  const [v, setV] = useState({ nom: "", telephone: "", email: "", ville: "", message: "", website: "" });
  const [etat, setEtat] = useState<"" | "envoi" | "ok">("");
  const [erreur, setErreur] = useState("");
  const [cle] = useState(() => `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
  const maj = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setEtat("envoi");
    try {
      await apiFournisseurs.contacter({ slug, ...v, lang: x.lang, objet, idempotencyKey: cle });
      setEtat("ok");
    } catch (err) { setErreur(x.erreur(codeErreur(err))); setEtat(""); }
  }
  if (etat === "ok") return <div className="frn-alerte frn-ok" role="status">{x.t("fpMerci")}</div>;
  return (
    <form className="frn-carte" onSubmit={envoyer} style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, color: T.navy, fontSize: 20 }}>{x.t("fpContacter")}</h2>
      <p style={{ margin: 0, color: T.inkMid, fontSize: 14 }}>{x.t("fpContactChapo")}</p>
      {objet && <div className="frn-alerte frn-info">{x.t("fpObjet", { x: objet.libelle })}</div>}
      <input type="text" name="website" value={v.website} onChange={maj("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />
      <div className="frn-grille2">
        <Champ label={x.t("fpNom")}><input className="frn-input" value={v.nom} onChange={maj("nom")} required maxLength={80} autoComplete="name" /></Champ>
        <Champ label={x.t("fpTel")}><input className="frn-input" type="tel" dir="ltr" value={v.telephone} onChange={maj("telephone")} required autoComplete="tel" inputMode="tel" /></Champ>
        <Champ label={x.t("fpEmail")}><input className="frn-input" type="email" dir="ltr" value={v.email} onChange={maj("email")} autoComplete="email" /></Champ>
        <Champ label={x.t("fpVille")}><input className="frn-input" value={v.ville} onChange={maj("ville")} maxLength={80} /></Champ>
      </div>
      <Champ label={x.t("fpMessage")}><textarea className="frn-input" rows={4} value={v.message} onChange={maj("message")} required maxLength={1500} /></Champ>
      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div><button className="frn-btn frn-btn-or" disabled={etat === "envoi"}>{etat === "envoi" ? x.t("envoi") : x.t("fpEnvoyer")}</button></div>
    </form>
  );
}
