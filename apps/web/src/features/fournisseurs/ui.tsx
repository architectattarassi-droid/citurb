/**
 * Habillage commun des pages Cercles pros (inscription, espace, annuaire,
 * fiche publique) : palette atelier (ivoire / navy / or) de
 * features/cercles/theme.ts, mise en page mobile d'abord, trilingue
 * (FR / AR / EN) avec des propriétés CSS logiques pour le sens RTL.
 */
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import LangSwitcher from "../../i18n/LangSwitcher";
import { CC_THEME as T, ensureFonts } from "../cercles/theme";
import { useTextes, type CleTexte } from "./textes";

export { T };

const CSS = `
.frn-page{min-height:100vh;background:${T.bg};color:${T.ink};font-family:${T.fontBody};}
.frn-page[dir=rtl]{font-family:"Noto Kufi Arabic","Segoe UI",Tahoma,${T.fontBody};}
.frn-entete{background:${T.navy};color:${T.inkOnDark};}
.frn-entete-in{max-width:1080px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.frn-entete a{color:${T.inkOnDark};text-decoration:none;}
.frn-marque{font-family:${T.fontDisplay};font-size:20px;font-weight:600;letter-spacing:.5px;}
.frn-nav{display:flex;gap:14px;font-size:14px;margin-inline-start:auto;flex-wrap:wrap;align-items:center;}
.frn-nav a{opacity:.85}.frn-nav a:hover{opacity:1;color:${T.orSoft};}
.frn-main{max-width:1080px;margin:0 auto;padding:24px 16px 64px;}
.frn-titre{font-family:${T.fontDisplay};font-size:clamp(26px,5vw,38px);font-weight:600;margin:8px 0 8px;color:${T.navy};line-height:1.2;}
.frn-chapo{color:${T.inkMid};font-size:16px;line-height:1.6;max-width:760px;margin:0 0 20px;}
.frn-carte{background:${T.bgRaised};border:1px solid ${T.border};border-radius:12px;padding:20px;box-shadow:${T.shadowSoft};}
.frn-grille2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.frn-grille3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.frn-cartes{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.frn-champ{display:flex;flex-direction:column;gap:6px;font-size:14px;min-width:0;}
.frn-champ>span{font-weight:600;color:${T.ink};}
.frn-champ small{color:${T.inkMuted};font-weight:400;}
.frn-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid ${T.border};border-radius:8px;font:inherit;font-size:15px;background:#fff;color:${T.ink};min-height:44px;}
.frn-input:focus{outline:2px solid ${T.orSoft};border-color:${T.or};}
.frn-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:8px;border:1px solid ${T.navy};background:${T.navy};color:#fff;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;}
.frn-btn:hover{background:${T.navyHover};}
.frn-btn:disabled{opacity:.55;cursor:default;}
.frn-btn-or{background:${T.or};border-color:${T.or};}.frn-btn-or:hover{background:${T.orHover};}
.frn-btn-ghost{background:transparent;color:${T.navy};}.frn-btn-ghost:hover{background:${T.bgSoft};}
.frn-btn-petit{min-height:34px;padding:6px 12px;font-size:13px;}
.frn-puces{display:flex;flex-wrap:wrap;gap:8px;}
.frn-puce{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid ${T.border};border-radius:999px;font-size:13px;background:#fff;cursor:pointer;user-select:none;min-height:34px;}
.frn-puce input{margin:0;}
.frn-puce-on{border-color:${T.or};background:${T.orSoft}55;}
.frn-etiquette{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;background:${T.bgSoft};color:${T.inkMid};}
.frn-alerte{padding:12px 14px;border-radius:8px;font-size:14px;line-height:1.55;}
.frn-ok{background:${T.successBg};color:${T.success};}
.frn-ko{background:${T.dangerBg};color:${T.danger};}
.frn-info{background:${T.infoBg};color:${T.info};}
.frn-warn{background:${T.warnBg};color:${T.warn};}
.frn-badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;}
.frn-onglets{display:flex;gap:4px;border-bottom:1px solid ${T.border};margin:18px 0;overflow-x:auto;}
.frn-onglet{padding:10px 14px;border:none;background:none;font:inherit;font-size:14px;color:${T.inkMid};cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;}
.frn-onglet-on{color:${T.navy};border-bottom-color:${T.or};font-weight:600;}
.frn-table{width:100%;border-collapse:collapse;font-size:14px;}
.frn-table th{text-align:start;font-weight:600;color:${T.inkMid};font-size:12px;letter-spacing:.3px;padding:8px;border-bottom:1px solid ${T.border};}
.frn-table td{padding:10px 8px;border-bottom:1px solid ${T.borderSoft};vertical-align:top;}
.frn-defil{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.frn-liste{margin:0;padding-inline-start:20px;line-height:1.7;font-size:14px;}
.frn-fieldset{border:1px solid ${T.borderSoft};border-radius:8px;padding:12px;margin:0;min-width:0;}
.frn-fieldset>legend{font-size:14px;font-weight:600;padding:0 4px;}
.frn-pied{border-top:1px solid ${T.border};color:${T.inkMuted};font-size:13px;}
.frn-pied-in{max-width:1080px;margin:0 auto;padding:20px 16px;display:flex;gap:16px;flex-wrap:wrap;}
.frn-pied a{color:${T.inkMid};}
.frn-barre{height:8px;border-radius:999px;background:${T.bgSoft};overflow:hidden;}
.frn-barre>i{display:block;height:100%;background:${T.or};}
@media (max-width:720px){
  .frn-grille2,.frn-grille3{grid-template-columns:1fr;}
  .frn-carte{padding:16px;}
  .frn-nav{margin-inline-start:0;width:100%;}
  .frn-cartes-mobile thead{display:none;}
  .frn-cartes-mobile tr{display:block;border:1px solid ${T.border};border-radius:10px;margin-bottom:10px;padding:6px 4px;background:#fff;}
  .frn-cartes-mobile td{display:flex;justify-content:space-between;gap:12px;border:none;padding:6px 8px;}
  .frn-cartes-mobile td::before{content:attr(data-l);color:${T.inkMuted};font-size:12px;}
}
`;

export function PageFournisseurs({ children }: { children: React.ReactNode }) {
  const x = useTextes();
  useEffect(() => { ensureFonts(); }, []);
  return (
    <div className="frn-page" dir={x.lang === "ar" ? "rtl" : "ltr"} lang={x.lang}>
      <style>{CSS}</style>
      <header className="frn-entete">
        <div className="frn-entete-in">
          <Link to="/cercles" className="frn-marque">{x.t("marque")}</Link>
          <nav className="frn-nav" aria-label="Cercles">
            <Link to={x.lang === "ar" ? "/ar/cercles/annuaire" : "/cercles/annuaire"}>{x.t("navAnnuaire")}</Link>
            <Link to="/materiaux">{x.t("navMateriaux")}</Link>
            <Link to="/cercles/inscription">{x.t("navInscription")}</Link>
            <Link to="/cercles/espace">{x.t("navEspace")}</Link>
            <LangSwitcher variant="compact" />
          </nav>
        </div>
      </header>
      <main className="frn-main">{children}</main>
      <footer className="frn-pied">
        <div className="frn-pied-in">
          <span>{x.t("pied")}</span>
          <Link to="/">{x.t("accueil")}</Link>
        </div>
      </footer>
    </div>
  );
}

export function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="frn-champ">
      <span>{label}{aide ? <small> — {aide}</small> : null}</span>
      {children}
    </label>
  );
}

export function Puces<V extends string>({ options, valeurs, onChange }: { options: [V, string][]; valeurs: V[]; onChange: (v: V[]) => void }) {
  return (
    <div className="frn-puces">
      {options.map(([v, l]) => {
        const on = valeurs.includes(v);
        return (
          <label key={v} className={`frn-puce${on ? " frn-puce-on" : ""}`}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? valeurs.filter((x) => x !== v) : [...valeurs, v])} />
            {l}
          </label>
        );
      })}
    </div>
  );
}

const COULEURS_STATUT: Record<string, [string, string]> = {
  PENDING: [T.warnBg, T.warn],
  APPROVED: [T.successBg, T.success],
  REJECTED: [T.dangerBg, T.danger],
  SUSPENDED: [T.dangerBg, T.danger],
  ARCHIVED: [T.bgSoft, T.inkMid],
};
/** Statut d'un pro (st_…) ou d'une offre (of_…). */
export function BadgeStatut({ statut, offre = false }: { statut: string; offre?: boolean }) {
  const x = useTextes();
  const [bg, fg] = COULEURS_STATUT[statut] || [T.bgSoft, T.inkMid];
  const cle = `${offre ? "of" : "st"}_${statut}` as CleTexte;
  return <span className="frn-badge" style={{ background: bg, color: fg }}>{x.t(cle) || statut}</span>;
}

/** Bloc « contenu saisi » : pose lang/dir de la langue réellement affichée (repli FR ↔ AR). */
export function TexteSaisi({ fr, ar, as = "p", style }: { fr: string | null | undefined; ar: string | null | undefined; as?: "p" | "span" | "h1" | "h2" | "h3" | "strong"; style?: React.CSSProperties }) {
  const x = useTextes();
  const b = x.bi(fr, ar);
  if (!b.texte) return null;
  const E = as;
  return <E lang={b.langue} dir={b.langue === "ar" ? "rtl" : "ltr"} style={{ whiteSpace: as === "p" ? "pre-line" : undefined, ...style }}>{b.texte}</E>;
}
