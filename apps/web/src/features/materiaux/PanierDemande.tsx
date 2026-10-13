/**
 * Panneau « Ma demande de prix » : panier multi-matériaux (quantités, unités
 * de vente, ville de livraison) → UN lead P6 (source MATERIAUX) dans /cc/leads.
 * Phase 2 (commande + paiement) derrière le drapeau ACHAT_EN_LIGNE.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { HONEYPOT_STYLE } from "../../lib/honeypot";
import { ACHAT_EN_LIGNE } from "../../config/fonctionnalites";
import { materiau } from "../../domain/materiaux/catalogue";
import { unitesVente } from "../../domain/materiaux/conversions";
import { SOURCE_DEMANDE, construireDemande, resumeDemande, wizardDemande } from "../../domain/materiaux/demandePrix";
import { VILLES_MA } from "../../domain/materiaux/regions";
import { captureLead, currentUtm, leadKey, telephoneEnvoyable } from "../lead-funnel/leadBridge";
import { EVT_PANIER, useMateriaux, usePrixPublics } from "./etat";
import { texte } from "./textes";
import { Bientot, fmtDH, uniteCourte } from "./ui";

const champ = "w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-base text-[#0B1B3A] focus:border-[#0B1B3A] focus:outline-none";

function empreinte(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export default function PanierDemande() {
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState({ nom: "", telephone: "", email: "", message: "", website: "" });
  const [ville, setVille] = useState(m.ville);
  const [etatEnvoi, setEtatEnvoi] = useState<"" | "envoi" | "ok" | "file" | string>("");
  const [envoye, setEnvoye] = useState<{ ville: string; aucunFournisseur: boolean } | null>(null);
  const prix = usePrixPublics(ville);

  useEffect(() => {
    const o = () => { setOuvert(true); setEnvoye(null); setEtatEnvoi(""); };
    window.addEventListener(EVT_PANIER, o);
    return () => window.removeEventListener(EVT_PANIER, o);
  }, []);
  useEffect(() => { if (!ville && m.ville) setVille(m.ville); }, [m.ville]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ouvert) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [ouvert]);

  const demande = useMemo(() => construireDemande(m.panier, ville), [m.panier, ville]);
  // Fournisseurs inscrits qui livrent la ville pour les catégories du panier (null : inconnu).
  const nbFournisseurs = useMemo(() => {
    if (!prix?.fournisseursParCategorie || !demande.lignes.length) return null;
    const cats = new Set(demande.lignes.map((l) => materiau(l.code)?.categorie).filter(Boolean) as string[]);
    return Math.max(0, ...[...cats].map((c) => prix.fournisseursParCategorie![c] || 0));
  }, [prix, demande]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (f.nom.trim().length < 2) return setEtatEnvoi(t("erreurNom"));
    const tel = telephoneEnvoyable(f.telephone);
    if (!tel) return setEtatEnvoi(t("erreurTel"));
    if (ville.trim().length < 2) return setEtatEnvoi(t("erreurVille"));
    setEtatEnvoi("envoi");
    m.setVille(ville.trim());
    const resume = resumeDemande(demande);
    const cle = leadKey(`MAT-${empreinte(JSON.stringify(demande.lignes.map((l) => [l.code, l.quantite, l.unite])) + ville)}`, tel);
    const r = await captureLead(cle, {
      nom: f.nom.trim(), telephone: tel, email: f.email.trim() || undefined, projetType: "P6", ville: ville.trim(),
      source: SOURCE_DEMANDE, lang, pageContext: window.location.pathname.slice(0, 300), utm: currentUtm(),
      meta: { projetLibre: f.message.trim() ? `${resume}\n${f.message.trim()}`.slice(0, 2000) : resume, wizard: wizardDemande(demande, nbFournisseurs) },
      website: f.website,
    });
    if (r.status === "invalid") return setEtatEnvoi(r.code === "phone_invalid" ? t("erreurTel") : t("erreurEnvoi"));
    setEnvoye({ ville: ville.trim(), aucunFournisseur: nbFournisseurs === 0 });
    setEtatEnvoi(r.status === "queued" ? "file" : "ok");
    m.vider();
  }

  const n = m.panier.length;
  return (
    <>
      {n > 0 && !ouvert && (
        <button type="button" onClick={() => setOuvert(true)}
          className="fixed bottom-24 z-40 min-h-[48px] sm:bottom-4 rounded-full bg-[#0B1B3A] px-5 text-sm font-bold text-white shadow-lg hover:bg-[#13285a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]"
          style={{ insetInlineEnd: 16 }}>
          {t("monPanier", { n })}
        </button>
      )}
      {ouvert && (
        <div className="fixed inset-0 flex justify-end bg-black/40" style={{ zIndex: 2000 }} onClick={() => setOuvert(false)} role="presentation">
          <aside role="dialog" aria-modal="true" aria-label={t("panierTitre")} onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#0B1B3A]">{t("panierTitre")}</h2>
              <button type="button" onClick={() => setOuvert(false)} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">{t("fermer")}</button>
            </div>

            {envoye ? (
              <div className="space-y-3">
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{etatEnvoi === "file" ? t("demandeFile") : t("demandeEnvoyee", { ville: envoye.ville })}</p>
                {envoye.aucunFournisseur && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t("aucunFournisseur", { ville: envoye.ville })}</p>}
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="text-slate-700">{t("vousFournisseur")}</p>
                  <Link to="/cercles/inscription" className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-[#0B1B3A] underline">{t("inscrire")}</Link>
                </div>
              </div>
            ) : n === 0 ? (
              <p className="text-sm text-slate-600">{t("panierVide")}</p>
            ) : (
              <form onSubmit={envoyer} className="relative space-y-3" noValidate>
                <ul className="list-none space-y-2 p-0">
                  {m.panier.map((l, i) => {
                    const r = materiau(l.code);
                    const d = demande.lignes.find((x) => x.code === l.code && x.unite === l.unite);
                    if (!r) return null;
                    return (
                      <li key={`${l.code}-${l.unite}`} className="list-none rounded-lg border border-slate-200 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-[#0B1B3A]">{r.libelle}</span>
                          <button type="button" onClick={() => m.retirerLigne(i)} className="min-h-[32px] shrink-0 px-2 text-xs text-slate-500 underline">{t("retirer")}</button>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <label className="text-xs text-slate-600">{t("quantite")}
                            <input className={champ} type="number" min="0" step="any" inputMode="decimal" value={l.quantite || ""} aria-label={`${t("quantite")} — ${r.libelle}`}
                              onChange={(e) => { const q = Number(e.target.value); if (Number.isFinite(q) && q >= 0) m.majLigne(i, { quantite: q }); }} />
                          </label>
                          <label className="text-xs text-slate-600">{t("unite")}
                            <select className={champ} value={l.unite} onChange={(e) => m.majLigne(i, { unite: e.target.value })}>
                              {unitesVente(r).map((u) => <option key={u.code} value={u.code}>{u.code === r.uniteRef ? uniteCourte(u.code) : u.libelle}</option>)}
                            </select>
                          </label>
                        </div>
                        {d?.estimationHT != null && <p className="mt-1 text-xs text-slate-500">≈ {fmtDH(d.estimationHT, lang)} {t("ht")}</p>}
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={m.vider} className="text-xs text-slate-500 underline">{t("vider")}</button>

                <label className="block text-sm font-medium text-slate-700">{t("villeLivraison")}
                  <input className={champ} list="materiaux-villes" value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" required />
                  <datalist id="materiaux-villes">{VILLES_MA.map((v) => <option key={v} value={v} />)}</datalist>
                </label>
                {demande.estimationHT != null && (
                  <p className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                    <strong>{t("estimation", { montant: fmtDH(demande.estimationHT, lang) })}</strong><br />
                    <span className="text-xs">{t("estimationAide")}</span>
                  </p>
                )}
                {nbFournisseurs === 0 && ville.trim().length > 1 && <p className="text-xs text-amber-800">{t("aucunFournisseur", { ville: ville.trim() })}</p>}

                <input type="text" name="website" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" style={HONEYPOT_STYLE} />
                <label className="block text-sm font-medium text-slate-700">{t("nom")}
                  <input className={champ} value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="name" required />
                </label>
                <label className="block text-sm font-medium text-slate-700">{t("telephone")}
                  <input className={champ} type="tel" inputMode="tel" dir="ltr" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} autoComplete="tel" required />
                </label>
                <label className="block text-sm font-medium text-slate-700">{t("email")}
                  <input className={champ} type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
                </label>
                <label className="block text-sm font-medium text-slate-700">{t("message")}
                  <textarea className={`${champ} min-h-[72px] py-2`} value={f.message} maxLength={1000} onChange={(e) => setF({ ...f, message: e.target.value })} />
                </label>
                <p className="text-xs text-slate-500">{t("demanderAide")}</p>
                {etatEnvoi && etatEnvoi !== "envoi" && etatEnvoi !== "ok" && etatEnvoi !== "file" && <p role="alert" className="text-sm text-red-700">{etatEnvoi}</p>}
                <button type="submit" disabled={etatEnvoi === "envoi"}
                  className="w-full min-h-[48px] rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A] hover:bg-[#d6b23c] disabled:opacity-60">
                  {etatEnvoi === "envoi" ? t("envoi") : t("envoyerDemande")}
                </button>
                {ACHAT_EN_LIGNE
                  ? <Link to="/materiaux/commande" className="flex min-h-[44px] items-center justify-center rounded-lg border border-[#0B1B3A] text-sm font-semibold text-[#0B1B3A]">{t("commander")}</Link>
                  : <Bientot t={t} />}
              </form>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
