/**
 * CerclesLanding — landing publique de cercles.citurbarea.com
 *
 * Présente le portail Cercles aux visiteurs non connectés :
 * - mission (réseau pro BTP marocain)
 * - partenaires syndicaux/associatifs (SNASP, ANJAUM)
 * - cibles (architectes, BET, labos, topographes, entreprises…)
 * - principe des cercles (statut pro + critères créateur, privacy membres-only)
 * - CTA : Se connecter / S'inscrire / Découvrir
 */

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";

export default function CerclesLanding() {
  useEffect(() => { ensureFonts(); }, []);

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={S.brandSeal}>C</div>
            <div>
              <div style={S.brandName}>CITURBAREA · CERCLES</div>
              <div style={S.brandSub}>Le réseau des professionnels du BTP au Maroc</div>
            </div>
          </div>
          <nav style={S.nav}>
            <Link to="/login" style={S.navLink}>Se connecter</Link>
            <Link to="/inscription" style={S.navCta}>Créer un compte</Link>
          </nav>
        </div>
      </header>

      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.eyebrow}>Atelier · Réseau pro fermé</div>
          <h1 style={S.heroTitle}>
            Là où les professionnels du BTP <em style={S.heroEm}>se parlent vraiment</em>.
          </h1>
          <p style={S.heroLead}>
            Architectes, bureaux d'études, laboratoires, topographes, entreprises BTP,
            promoteurs, fournisseurs — Cercles est l'espace privé où chaque corps de
            métier discute, partage et organise des visios entre pairs, sans le bruit
            des réseaux grand public.
          </p>
          <div style={S.heroCtas}>
            <Link to="/inscription" style={S.btnPrimary}>Demander à rejoindre</Link>
            <Link to="/login" style={S.btnGhost}>Se connecter</Link>
          </div>
          <div style={S.heroNote}>
            Accès réservé aux professionnels qualifiés · Validation manuelle par l'équipe CITURBAREA
          </div>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionEyebrow}>Partenaires syndicaux & associatifs</div>
          <h2 style={S.sectionTitle}>Un portail co-construit avec la profession</h2>

          <div style={S.partnerGrid}>
            <article style={S.partnerCard}>
              <div style={S.partnerBadge}>SNASP</div>
              <h3 style={S.partnerName}>Syndicat National des Architectes du Secteur Privé</h3>
              <p style={S.partnerBody}>
                Le syndicat fédère les architectes installés en exercice libéral au Maroc.
                Il défend les conditions d'exercice de la profession, négocie les barèmes
                avec les pouvoirs publics et organise des actions collectives.
              </p>
              <div style={S.partnerFee}>
                <strong>Cotisation annuelle : 1 000 MAD</strong>
                <span style={S.partnerFeeNote}>
                  inclut l'accès annuel gratuit à CITURBAREA Cercles
                </span>
              </div>
              <Link to="/cercles/snasp-architectes-prive/rejoindre" style={S.partnerCta}>
                Adhérer au SNASP →
              </Link>
            </article>

            <article style={S.partnerCard}>
              <div style={{ ...S.partnerBadge, background: CC_THEME.info }}>ANJAUM</div>
              <h3 style={S.partnerName}>Association Nationale des Jeunes Architectes & Urbanistes du Maroc</h3>
              <p style={S.partnerBody}>
                ANJAUM accompagne les jeunes architectes et urbanistes en début de carrière :
                mentorat, accès aux concours, formation continue, mise en relation avec
                les agences et institutions publiques.
              </p>
              <div style={S.partnerFee}>
                <strong>Cotisation annuelle : 1 000 MAD</strong>
                <span style={S.partnerFeeNote}>
                  inclut l'accès annuel gratuit à CITURBAREA Cercles
                </span>
              </div>
              <Link to="/cercles/anjaum-jeunes-architectes/rejoindre" style={S.partnerCta}>
                Adhérer à l'ANJAUM →
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section style={{ ...S.section, background: CC_THEME.bgRaised }}>
        <div style={S.sectionInner}>
          <div style={S.sectionEyebrow}>Pour qui ?</div>
          <h2 style={S.sectionTitle}>Ouvert à tous les métiers de l'acte de bâtir</h2>
          <p style={S.sectionLead}>
            Chaque profil rejoint le ou les cercles qui correspondent à son statut, sa
            spécialité ou son territoire. Pas de mélange, pas de spam — chaque cercle
            réunit des pairs qui parlent le même langage.
          </p>

          <div style={S.metierGrid}>
            <MetierCard icon="📐" label="Architectes"          body="Libéraux, salariés, enseignants, étudiants en fin de cycle." />
            <MetierCard icon="📊" label="Bureaux d'études"     body="Structure, fluides, VRD, thermique, acoustique, économistes." />
            <MetierCard icon="🧪" label="Laboratoires"          body="Sols, matériaux, contrôle qualité, géotechnique." />
            <MetierCard icon="🛰" label="Topographes"           body="Géomètres-experts, opérateurs drone, lever 3D." />
            <MetierCard icon="🏗" label="Entreprises BTP"       body="Gros œuvre, second œuvre, TCE, entreprises générales." />
            <MetierCard icon="🏢" label="Promoteurs"            body="Immobilier résidentiel, tertiaire, lotisseurs, aménageurs." />
            <MetierCard icon="🧱" label="Fournisseurs"          body="Matériaux, équipements, négoce, industriels." />
            <MetierCard icon="🎓" label="Enseignants & étudiants" body="Écoles d'archi, IAV, EHTP, ENA, ISA Chefchaouni…" />
          </div>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionEyebrow}>Comment fonctionnent les cercles</div>
          <h2 style={S.sectionTitle}>Un cercle = une communauté maîtrisée par son créateur</h2>

          <div style={S.howGrid}>
            <HowCard
              n="01"
              title="Tout pro peut créer un cercle"
              body="Architecte, BET, laboratoire, syndicat, association, entreprise… N'importe quel professionnel inscrit peut ouvrir un cercle thématique, territorial, intra-métier ou inter-métiers."
            />
            <HowCard
              n="02"
              title="Le créateur fixe les critères d'admission"
              body="Statut professionnel requis, métier, ville, école d'origine, ancienneté, inscription à l'Ordre, agréments… Chaque créateur définit les règles d'entrée de son cercle."
            />
            <HowCard
              n="03"
              title="Discussions visibles uniquement aux membres"
              body="Tout ce qui se dit dans un cercle (posts, commentaires, visios, fichiers partagés) reste confidentiel : invisible pour les non-membres, jamais indexé par Google."
            />
            <HowCard
              n="04"
              title="Cercles intra-pro encouragés"
              body="Un cercle BET-structure entre confrères, un cercle topographes du Souss-Massa, un cercle d'anciens d'une promo : Cercles est conçu pour les communautés serrées et de confiance."
            />
          </div>

          <div style={S.privacyBanner}>
            <span style={S.privacyIcon}>🔒</span>
            <div>
              <strong style={S.privacyStrong}>Confidentialité par défaut.</strong>{" "}
              Trois niveaux de visibilité pour chaque cercle :
              <span style={S.visTag}>🌐 PUBLIC</span> visible par tous les inscrits,
              <span style={S.visTag}>👥 MEMBRES</span> rejoignable sur demande,
              <span style={S.visTag}>🔒 PRIVÉ</span> sur invitation uniquement.
              Dans tous les cas, le contenu des discussions n'est lisible que par les membres ACTIFS.
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...S.section, background: CC_THEME.bgDeep, color: CC_THEME.inkOnDark }}>
        <div style={{ ...S.sectionInner, textAlign: "center", maxWidth: 720 }}>
          <h2 style={{ ...S.sectionTitle, color: CC_THEME.inkOnDark, marginBottom: 14 }}>
            Prêt à rejoindre la conversation ?
          </h2>
          <p style={{ ...S.sectionLead, color: "#D4CFC2", maxWidth: 560, margin: "0 auto 28px" }}>
            Demandez votre accès en quelques minutes. Notre équipe valide manuellement
            chaque inscription pour garantir la qualité des cercles.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/inscription" style={S.btnPrimary}>Créer mon compte pro</Link>
            <Link to="/login" style={{ ...S.btnGhost, borderColor: "rgba(250,247,242,0.3)", color: CC_THEME.inkOnDark }}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>CITURBAREA · Cercles · Maroc · {new Date().getFullYear()}</div>
          <div style={S.footerLinks}>
            <a href="https://citurbarea.com" style={S.footerLink}>citurbarea.com</a>
            <Link to="/login" style={S.footerLink}>Se connecter</Link>
            <Link to="/inscription" style={S.footerLink}>S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetierCard({ icon, label, body }: { icon: string; label: string; body: string }) {
  return (
    <div style={S.metierCard}>
      <span style={S.metierIcon}>{icon}</span>
      <div style={S.metierLabel}>{label}</div>
      <div style={S.metierBody}>{body}</div>
    </div>
  );
}

function HowCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={S.howCard}>
      <div style={S.howNum}>{n}</div>
      <div style={S.howTitle}>{title}</div>
      <div style={S.howBody}>{body}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  // zoom 1.3 = +30% taille (accessibilité lecture) ; minHeight compensée
  root: { background: CC_THEME.bg, color: CC_THEME.ink, fontFamily: CC_THEME.fontBody, minHeight: "calc(100vh / 1.3)", zoom: 1.3 },

  header: { borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: 1180, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  brandSeal: { width: 42, height: 42, borderRadius: 8, background: CC_THEME.bgDeep, color: CC_THEME.or, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 24, fontWeight: 700 },
  brandName: { fontSize: 12.5, fontWeight: 700, letterSpacing: "0.20em", color: CC_THEME.ink },
  brandSub: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },
  nav: { display: "flex", alignItems: "center", gap: 14 },
  navLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, fontWeight: 500, padding: "8px 12px" },
  navCta: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "9px 18px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" },

  hero: { padding: "80px 32px 70px", background: `linear-gradient(180deg, ${CC_THEME.bg} 0%, ${CC_THEME.bgSoft} 100%)` },
  heroInner: { maxWidth: 880, margin: "0 auto", textAlign: "center" },
  eyebrow: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 600 },
  heroTitle: { margin: "14px auto 22px", fontFamily: CC_THEME.fontDisplay, fontSize: 54, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.02em", lineHeight: 1.08, maxWidth: 820 },
  heroEm: { fontStyle: "italic", color: CC_THEME.or, fontWeight: 500 },
  heroLead: { color: CC_THEME.inkMid, fontSize: 17, lineHeight: 1.6, maxWidth: 680, margin: "0 auto 32px" },
  heroCtas: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  heroNote: { marginTop: 22, fontSize: 12, color: CC_THEME.inkMuted, fontStyle: "italic" },

  btnPrimary: { background: CC_THEME.or, color: CC_THEME.bgDeep, padding: "13px 26px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", border: 0, display: "inline-block" },
  btnGhost: { background: "transparent", color: CC_THEME.navy, padding: "12px 26px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500, border: `1px solid ${CC_THEME.navy}`, display: "inline-block" },

  section: { padding: "76px 32px", background: CC_THEME.bg },
  sectionInner: { maxWidth: 1100, margin: "0 auto" },
  sectionEyebrow: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  sectionTitle: { margin: "10px 0 26px", fontFamily: CC_THEME.fontDisplay, fontSize: 36, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.015em", lineHeight: 1.15, maxWidth: 720 },
  sectionLead: { color: CC_THEME.inkMid, fontSize: 15.5, lineHeight: 1.65, maxWidth: 720, marginBottom: 36 },

  partnerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 22 },
  partnerCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: "30px 28px", display: "flex", flexDirection: "column", gap: 14 },
  partnerBadge: { display: "inline-block", padding: "5px 11px", borderRadius: 4, background: CC_THEME.or, color: CC_THEME.bgDeep, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", alignSelf: "flex-start" },
  partnerName: { fontFamily: CC_THEME.fontDisplay, fontSize: 20, fontWeight: 600, color: CC_THEME.navy, margin: 0, lineHeight: 1.25 },
  partnerBody: { color: CC_THEME.inkMid, fontSize: 14, lineHeight: 1.6, margin: 0 },
  partnerFee: { background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, padding: "12px 14px", borderRadius: 8, fontSize: 13, color: CC_THEME.ink, display: "flex", flexDirection: "column", gap: 4 },
  partnerFeeNote: { fontSize: 12, color: CC_THEME.or, fontStyle: "italic" },
  partnerCta: { color: CC_THEME.navy, textDecoration: "none", fontSize: 13.5, fontWeight: 600, marginTop: 4 },

  metierGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginTop: 8 },
  metierCard: { background: CC_THEME.bg, border: `1px solid ${CC_THEME.border}`, padding: "20px 18px", borderRadius: 10 },
  metierIcon: { fontSize: 26, display: "block", marginBottom: 10 },
  metierLabel: { fontFamily: CC_THEME.fontDisplay, fontSize: 16, fontWeight: 600, color: CC_THEME.navy, marginBottom: 6 },
  metierBody: { fontSize: 12.5, color: CC_THEME.inkMid, lineHeight: 1.55 },

  howGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 },
  howCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, padding: "24px 22px", borderRadius: 10 },
  howNum: { fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.or, marginBottom: 8, letterSpacing: "0.02em" },
  howTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 600, color: CC_THEME.navy, marginBottom: 8, lineHeight: 1.25 },
  howBody: { fontSize: 13.5, color: CC_THEME.inkMid, lineHeight: 1.6 },

  privacyBanner: { display: "flex", gap: 16, background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, borderLeft: `4px solid ${CC_THEME.or}`, padding: "18px 22px", borderRadius: 8, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.6, color: CC_THEME.ink },
  privacyIcon: { fontSize: 22, flexShrink: 0 },
  privacyStrong: { color: CC_THEME.navy },
  visTag: { display: "inline-block", padding: "2px 8px", borderRadius: 4, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, margin: "0 4px", fontSize: 12, fontWeight: 600, color: CC_THEME.navy },

  footer: { borderTop: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, padding: "24px 32px" },
  footerInner: { maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 },
  footerBrand: { fontSize: 12, color: CC_THEME.inkMuted, letterSpacing: "0.08em" },
  footerLinks: { display: "flex", gap: 18 },
  footerLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 12.5 },
};
