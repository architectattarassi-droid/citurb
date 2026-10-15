/**
 * BROUILLON — offre « Cercles Premium » (non publiée : aucune route ne
 * l'affiche ; à brancher sur /cercles/premium dans tome1/router/routes.tsx
 * quand le fondateur aura validé le texte et fixé le prix). Aucun paiement en
 * ligne : la formule est activée par l'admin dans /cc/fournisseurs.
 * Avantages = outils réservés (domain/cercles/accesPro.ts).
 */
import React from "react";
import { Link } from "react-router-dom";
import { LISTE_OUTILS, OUTILS_PRO } from "../../domain/cercles/accesPro";
import { useTextes } from "./textes";
import { PageFournisseurs, T } from "./ui";

const TEXTE = {
  fr: {
    titre: "Cercles Premium — les outils des pros du BTP",
    chapo: "Pour les entreprises, artisans, bureaux d'études et fournisseurs qui veulent chiffrer, budgéter et facturer avec les mêmes outils que CITURBAREA.",
    inclus: "Inclus dans Premium",
    base: "Toujours gratuit pour tous les membres",
    baseListe: ["Fiche société, produits et prestations", "Annuaire et fiche publique vérifiée", "Messagerie et appels vidéo par la plateforme", "Demandes de prix des maîtres d'ouvrage"],
    prix: "Prix : à définir",
    activation: "Activation par l'équipe CITURBAREA après échange — aucun paiement en ligne pour l'instant.",
    cta: "Demander Premium depuis mon espace",
  },
  ar: {
    titre: "دوائر بريميوم — أدوات مهنيي البناء",
    chapo: "للمقاولات والحرفيين ومكاتب الدراسات والموردين الذين يريدون التقدير وإعداد الميزانية والفوترة بنفس أدوات سيتوربارية.",
    inclus: "ضمن بريميوم",
    base: "مجاني دائماً لجميع الأعضاء",
    baseListe: ["بطاقة الشركة والمنتجات والخدمات", "الدليل والبطاقة العمومية الموثقة", "المراسلة ومكالمات الفيديو عبر المنصة", "طلبات الأسعار من أصحاب المشاريع"],
    prix: "السعر: سيُحدد لاحقاً",
    activation: "يفعّله فريق سيتوربارية بعد التواصل — لا أداء عبر الإنترنت حالياً.",
    cta: "طلب بريميوم من فضائي",
  },
};

export default function OffrePremiumPage() {
  const x = useTextes();
  const t = x.lang === "ar" ? TEXTE.ar : TEXTE.fr;
  return (
    <PageFournisseurs>
      <div className="frn-alerte frn-warn" style={{ marginBottom: 12 }}>Brouillon — page non publiée.</div>
      <h1 className="frn-titre">{t.titre}</h1>
      <p className="frn-chapo">{t.chapo}</p>
      <div className="frn-grille2">
        <section className="frn-carte">
          <h2 style={{ marginTop: 0, color: T.navy, fontSize: 18 }}>{t.inclus}</h2>
          <ul className="frn-liste">{LISTE_OUTILS.map((o) => <li key={o}>{x.l3(OUTILS_PRO[o].libelle)}</li>)}</ul>
        </section>
        <section className="frn-carte">
          <h2 style={{ marginTop: 0, color: T.navy, fontSize: 18 }}>{t.base}</h2>
          <ul className="frn-liste">{t.baseListe.map((b) => <li key={b}>{b}</li>)}</ul>
        </section>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>{t.prix}</p>
      <p style={{ color: T.inkMid }}>{t.activation}</p>
      <Link className="frn-btn frn-btn-or" to="/cercles/espace">{t.cta}</Link>
    </PageFournisseurs>
  );
}
