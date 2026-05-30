/**
 * CerclesLanding — landing publique de cercles.citurbarea.com
 *
 * Présente le portail Cercles aux visiteurs non connectés :
 * - mission (réseau pro BTP marocain)
 * - partenaires syndicaux/associatifs (SNASP, ANJAUM)
 * - cibles (architectes, BET, labos, topographes, entreprises…)
 * - principe des cercles (statut pro + critères créateur, privacy membres-only)
 * - CTA : Se connecter / S'inscrire / Découvrir
 *
 * i18n : namespace "cercles.landing.*" — voir locales/{fr,ar,en}/cercles.json
 * Responsive : containers larges (1280 / 1400) via classes globales
 * .cit-container-wide / .cit-container-xl déjà importées dans main.tsx.
 */

import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { useT } from "../../i18n/i18n";

export default function CerclesLanding() {
  useEffect(() => { ensureFonts(); }, []);
  const t = useT();
  // Détecte si l'utilisateur est déjà connecté (token présent) → CTAs adaptés
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("citurbarea.token");

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div className="cit-container-wide" style={S.headerInner}>
          <div style={S.brand}>
            <div style={S.brandSeal}>C</div>
            <div>
              <div style={S.brandName}>{t("cercles.landing.brand_name")}</div>
              <div style={S.brandSub}>{t("cercles.landing.brand_sub")}</div>
            </div>
          </div>
          <nav style={S.nav}>
            {isLoggedIn ? (
              <Link to="/cercles" style={S.navCta}>{t("cercles.landing.nav_my_feed")}</Link>
            ) : (
              <>
                <Link to="/login" style={S.navLink}>{t("cercles.landing.nav_login")}</Link>
                <Link to="/inscription" style={S.navCta}>{t("cercles.landing.nav_signup")}</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section style={S.hero}>
        <div className="cit-container-wide" style={S.heroInner}>
          <div style={S.eyebrow}>{t("cercles.landing.hero_eyebrow")}</div>
          <h1 style={S.heroTitle}>
            {t("cercles.landing.hero_title_pre")} <em style={S.heroEm}>{t("cercles.landing.hero_title_em")}</em>{t("cercles.landing.hero_title_post")}
          </h1>
          <p style={S.heroLead}>
            {t("cercles.landing.hero_lead")}
          </p>
          <div style={S.heroCtas}>
            {isLoggedIn ? (
              <Link to="/cercles" style={S.btnPrimary}>{t("cercles.landing.hero_cta_my_feed")}</Link>
            ) : (
              <>
                <Link to="/inscription" style={S.btnPrimary}>{t("cercles.landing.hero_cta_join")}</Link>
                <Link to="/login" style={S.btnGhost}>{t("cercles.landing.hero_cta_login")}</Link>
              </>
            )}
          </div>
          <div style={S.heroNote}>
            {t("cercles.landing.hero_note")}
          </div>
        </div>
      </section>

      <section style={S.section}>
        <div className="cit-container-wide" style={S.sectionInner}>
          <div style={S.sectionEyebrow}>{t("cercles.landing.partners_eyebrow")}</div>
          <h2 style={S.sectionTitle}>{t("cercles.landing.partners_title")}</h2>

          <div style={S.partnerGrid}>
            <article style={S.partnerCard}>
              <div style={S.partnerBadge}>SNASP</div>
              <h3 style={S.partnerName}>{t("cercles.landing.partners_snasp_name")}</h3>
              <p style={S.partnerBody}>
                {t("cercles.landing.partners_snasp_body")}
              </p>
              <div style={S.partnerFee}>
                <strong>{t("cercles.landing.partners_fee_strong")}</strong>
                <span style={S.partnerFeeNote}>
                  {t("cercles.landing.partners_fee_note")}
                </span>
              </div>
              <Link to="/cercles/snasp-architectes-prive/rejoindre" style={S.partnerCta}>
                {t("cercles.landing.partners_cta_snasp")}
              </Link>
            </article>

            <article style={S.partnerCard}>
              <div style={{ ...S.partnerBadge, background: CC_THEME.info }}>ANJAUM</div>
              <h3 style={S.partnerName}>{t("cercles.landing.partners_anjaum_name")}</h3>
              <p style={S.partnerBody}>
                {t("cercles.landing.partners_anjaum_body")}
              </p>
              <div style={S.partnerFee}>
                <strong>{t("cercles.landing.partners_fee_strong")}</strong>
                <span style={S.partnerFeeNote}>
                  {t("cercles.landing.partners_fee_note")}
                </span>
              </div>
              <Link to="/cercles/anjaum-jeunes-architectes/rejoindre" style={S.partnerCta}>
                {t("cercles.landing.partners_cta_anjaum")}
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section style={{ ...S.section, background: CC_THEME.bgRaised }}>
        <div className="cit-container-wide" style={S.sectionInner}>
          <div style={S.sectionEyebrow}>{t("cercles.landing.metiers_eyebrow")}</div>
          <h2 style={S.sectionTitle}>{t("cercles.landing.metiers_title")}</h2>
          <p style={S.sectionLead}>
            {t("cercles.landing.metiers_lead")}
          </p>

          <div style={S.metierGrid}>
            <MetierCard icon="📐" label={t("cercles.landing.metier_archi_label")}  body={t("cercles.landing.metier_archi_body")} />
            <MetierCard icon="📊" label={t("cercles.landing.metier_bet_label")}    body={t("cercles.landing.metier_bet_body")} />
            <MetierCard icon="🧪" label={t("cercles.landing.metier_labo_label")}   body={t("cercles.landing.metier_labo_body")} />
            <MetierCard icon="🛰" label={t("cercles.landing.metier_topo_label")}   body={t("cercles.landing.metier_topo_body")} />
            <MetierCard icon="🏗" label={t("cercles.landing.metier_btp_label")}    body={t("cercles.landing.metier_btp_body")} />
            <MetierCard icon="🏢" label={t("cercles.landing.metier_promo_label")}  body={t("cercles.landing.metier_promo_body")} />
            <MetierCard icon="🧱" label={t("cercles.landing.metier_fourn_label")}  body={t("cercles.landing.metier_fourn_body")} />
            <MetierCard icon="🎓" label={t("cercles.landing.metier_edu_label")}    body={t("cercles.landing.metier_edu_body")} />
          </div>
        </div>
      </section>

      <section style={S.section}>
        <div className="cit-container-wide" style={S.sectionInner}>
          <div style={S.sectionEyebrow}>{t("cercles.landing.how_eyebrow")}</div>
          <h2 style={S.sectionTitle}>{t("cercles.landing.how_title")}</h2>

          <div style={S.howGrid}>
            <HowCard n="01" title={t("cercles.landing.how_01_title")} body={t("cercles.landing.how_01_body")} />
            <HowCard n="02" title={t("cercles.landing.how_02_title")} body={t("cercles.landing.how_02_body")} />
            <HowCard n="03" title={t("cercles.landing.how_03_title")} body={t("cercles.landing.how_03_body")} />
            <HowCard n="04" title={t("cercles.landing.how_04_title")} body={t("cercles.landing.how_04_body")} />
          </div>

          <div style={S.privacyBanner}>
            <span style={S.privacyIcon}>🔒</span>
            <div>
              <strong style={S.privacyStrong}>{t("cercles.landing.privacy_strong")}</strong>{" "}
              {t("cercles.landing.privacy_intro")}
              <span style={S.visTag}>{t("cercles.landing.privacy_vis_public")}</span> {t("cercles.landing.privacy_vis_public_desc")}
              <span style={S.visTag}>{t("cercles.landing.privacy_vis_members")}</span> {t("cercles.landing.privacy_vis_members_desc")}
              <span style={S.visTag}>{t("cercles.landing.privacy_vis_private")}</span> {t("cercles.landing.privacy_vis_private_desc")}
              {" "}{t("cercles.landing.privacy_outro")}
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...S.section, background: CC_THEME.bgDeep, color: CC_THEME.inkOnDark }}>
        <div style={{ ...S.sectionInner, textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ ...S.sectionTitle, color: CC_THEME.inkOnDark, marginBottom: 14 }}>
            {t("cercles.landing.cta_title")}
          </h2>
          <p style={{ ...S.sectionLead, color: "#D4CFC2", maxWidth: 560, margin: "0 auto 28px" }}>
            {t("cercles.landing.cta_lead")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {isLoggedIn ? (
              <Link to="/cercles" style={S.btnPrimary}>{t("cercles.landing.hero_cta_my_feed")}</Link>
            ) : (
              <>
                <Link to="/inscription" style={S.btnPrimary}>{t("cercles.landing.cta_create")}</Link>
                <Link to="/login" style={{ ...S.btnGhost, borderColor: "rgba(250,247,242,0.3)", color: CC_THEME.inkOnDark }}>
                  {t("cercles.landing.cta_have_account")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer style={S.footer}>
        <div className="cit-container-wide" style={S.footerInner}>
          <div style={S.footerBrand}>{t("cercles.landing.footer_brand", { year: new Date().getFullYear() })}</div>
          <div style={S.footerLinks}>
            <a href="https://citurbarea.com" style={S.footerLink}>{t("cercles.landing.footer_site")}</a>
            <Link to="/login" style={S.footerLink}>{t("cercles.landing.footer_login")}</Link>
            <Link to="/inscription" style={S.footerLink}>{t("cercles.landing.footer_signup")}</Link>
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
  // .cit-container-wide gère maxWidth 1280 + padding horizontal ; on garde flex inner
  headerInner: { padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  brandSeal: { width: 42, height: 42, borderRadius: 8, background: CC_THEME.bgDeep, color: CC_THEME.or, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 24, fontWeight: 700 },
  brandName: { fontSize: 12.5, fontWeight: 700, letterSpacing: "0.20em", color: CC_THEME.ink },
  brandSub: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },
  nav: { display: "flex", alignItems: "center", gap: 14 },
  navLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, fontWeight: 500, padding: "8px 12px" },
  navCta: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "9px 18px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" },

  hero: { padding: "80px 0 70px", background: `linear-gradient(180deg, ${CC_THEME.bg} 0%, ${CC_THEME.bgSoft} 100%)` },
  // .cit-container-wide (1280) ; on retire l'ancien maxWidth 880 trop étroit
  heroInner: { textAlign: "center" },
  eyebrow: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 600 },
  // heroTitle conserve une limite de lisibilité interne (≤ 980) pour ne pas exploser sur 1280
  heroTitle: { margin: "14px auto 22px", fontFamily: CC_THEME.fontDisplay, fontSize: 54, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.02em", lineHeight: 1.08, maxWidth: 980 },
  heroEm: { fontStyle: "italic", color: CC_THEME.or, fontWeight: 500 },
  heroLead: { color: CC_THEME.inkMid, fontSize: 17, lineHeight: 1.6, maxWidth: 760, margin: "0 auto 32px" },
  heroCtas: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  heroNote: { marginTop: 22, fontSize: 12, color: CC_THEME.inkMuted, fontStyle: "italic" },

  btnPrimary: { background: CC_THEME.or, color: CC_THEME.bgDeep, padding: "13px 26px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", border: 0, display: "inline-block" },
  btnGhost: { background: "transparent", color: CC_THEME.navy, padding: "12px 26px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500, border: `1px solid ${CC_THEME.navy}`, display: "inline-block" },

  // .cit-container-wide gère maxWidth ; on retire l'ancien 1100
  section: { padding: "76px 0", background: CC_THEME.bg },
  sectionInner: {},
  sectionEyebrow: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  sectionTitle: { margin: "10px 0 26px", fontFamily: CC_THEME.fontDisplay, fontSize: 36, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.015em", lineHeight: 1.15, maxWidth: 820 },
  sectionLead: { color: CC_THEME.inkMid, fontSize: 15.5, lineHeight: 1.65, maxWidth: 820, marginBottom: 36 },

  // Grilles responsive auto-fit → 2-3 colonnes desktop, 1 mobile
  partnerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 22 },
  partnerCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: "30px 28px", display: "flex", flexDirection: "column", gap: 14 },
  partnerBadge: { display: "inline-block", padding: "5px 11px", borderRadius: 4, background: CC_THEME.or, color: CC_THEME.bgDeep, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", alignSelf: "flex-start" },
  partnerName: { fontFamily: CC_THEME.fontDisplay, fontSize: 20, fontWeight: 600, color: CC_THEME.navy, margin: 0, lineHeight: 1.25 },
  partnerBody: { color: CC_THEME.inkMid, fontSize: 14, lineHeight: 1.6, margin: 0 },
  partnerFee: { background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, padding: "12px 14px", borderRadius: 8, fontSize: 13, color: CC_THEME.ink, display: "flex", flexDirection: "column", gap: 4 },
  partnerFeeNote: { fontSize: 12, color: CC_THEME.or, fontStyle: "italic" },
  partnerCta: { color: CC_THEME.navy, textDecoration: "none", fontSize: 13.5, fontWeight: 600, marginTop: 4 },

  // metier : minmax(280px,1fr) → 4 col @1280, 3 @1024, 2 @768, 1 @360
  metierGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginTop: 8 },
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

  footer: { borderTop: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, padding: "24px 0" },
  footerInner: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 },
  footerBrand: { fontSize: 12, color: CC_THEME.inkMuted, letterSpacing: "0.08em" },
  footerLinks: { display: "flex", gap: 18 },
  footerLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 12.5 },
};
