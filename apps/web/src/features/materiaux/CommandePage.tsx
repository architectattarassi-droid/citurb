/**
 * /materiaux/commande — achat en ligne (PHASE 2). Drapeau ACHAT_EN_LIGNE
 * désactivé : écran « bientôt disponible » avec le récapitulatif du panier et
 * le renvoi vers la demande de prix gratuite. Activé, l'écran présente les
 * étapes prévues (docs/achat-en-ligne.md) sans encaisser : le tunnel de
 * paiement reste à brancher sur le prestataire retenu (CMI ou EP agréé).
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../../i18n/i18n";
import { ACHAT_EN_LIGNE } from "../../config/fonctionnalites";
import { construireDemande } from "../../domain/materiaux/demandePrix";
import { ouvrirPanier, useMateriaux } from "./etat";
import PanierDemande from "./PanierDemande";
import { texte } from "./textes";
import { Bientot, fmtDH } from "./ui";

const ETAPES = [
  "Panier confirmé par le fournisseur (prix, stock, frais et délai de livraison)",
  "Paiement sécurisé en ligne (CMI ou établissement de paiement agréé), versé au fournisseur après livraison",
  "Préparation et livraison sur chantier, suivi en temps réel",
  "Réception signée : le fournisseur est payé ; la commission de CITURBAREA est à sa charge, jamais à celle du client",
];

export default function CommandePage() {
  const { lang } = useLang();
  const t = useMemo(() => texte(lang), [lang]);
  const m = useMateriaux();
  const d = construireDemande(m.panier, m.ville);
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7b14]"><Link to="/materiaux" className="text-[#9a7b14] underline">{t("kicker")}</Link></p>
      <h1 className="mt-1 text-2xl font-bold text-[#0B1B3A]">{t("commander")}</h1>
      <div className="mt-4"><Bientot t={t} /></div>
      {ACHAT_EN_LIGNE && (
        <ol className="mt-4 list-decimal space-y-1 ps-5 text-sm text-slate-700">{ETAPES.map((e) => <li key={e}>{e}</li>)}</ol>
      )}
      {d.lignes.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <ul className="space-y-1 p-0 text-sm">
            {d.lignes.map((l) => <li key={`${l.code}-${l.unite}`} className="flex list-none justify-between gap-2"><span>{l.libelle} × {l.quantite} {l.uniteLibelle}</span>{l.estimationHT != null && <span>≈ {fmtDH(l.estimationHT, lang)}</span>}</li>)}
          </ul>
          {d.estimationHT != null && <p className="mt-2 text-sm font-semibold">{t("estimation", { montant: fmtDH(d.estimationHT, lang) })}</p>}
        </section>
      )}
      <button type="button" onClick={ouvrirPanier} className="mt-6 w-full min-h-[48px] rounded-lg bg-[#C9A227] px-4 text-base font-bold text-[#0B1B3A]">{t("envoyerDemande")}</button>
      <PanierDemande />
    </main>
  );
}
