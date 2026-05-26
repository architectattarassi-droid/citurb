import React from "react";
import { useT } from "../../i18n/i18n";

const STEPS = [
  { k:"01", icon:"📥", titleKey:"landing.method.step1.title", descKey:"landing.method.step1.desc", live:true },
  { k:"02", icon:"⚙️", titleKey:"landing.method.step2.title", descKey:"landing.method.step2.desc", live:true },
  { k:"03", icon:"📊", titleKey:"landing.method.step3.title", descKey:"landing.method.step3.desc", live:true },
  { k:"04", icon:"🔐", titleKey:"landing.method.step4.title", descKey:"landing.method.step4.desc", live:true },
];

export function MethodSection() {
  const t = useT();
  return (
    <section style={{ background:"var(--c-blue)",padding:"72px 24px" }}>
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center",flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:16 }}>{t("landing.method.kicker")}</div>
            <h2 style={{ fontFamily:"var(--font-display)",fontSize:"clamp(24px,3vw,38px)",fontWeight:800,color:"#fff",lineHeight:1.12,letterSpacing:"-.025em",marginBottom:20 }}>
              {t("landing.method.title")}
            </h2>
            <p style={{ fontSize:15,color:"rgba(255,255,255,.7)",lineHeight:1.7,marginBottom:28 }}>
              {t("landing.method.sub")}
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {[["35K+",t("landing.method.stat.subs")],["6",t("landing.method.stat.areas")],["10+",t("landing.method.stat.cities")],["30min",t("landing.method.stat.diag")]].map(([num,label]) => (
                <div key={label as string} style={{ background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:20,textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--font-display)",fontSize:36,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:6 }}>
                    {(num as string).replace(/[0-9]+/g,m=>`${m}`)
                      .split(/(K\+|\+|min)/g)
                      .map((part,i) => /K\+|\+|min/.test(part)
                        ? <span key={i} style={{ color:"var(--c-gold)" }}>{part}</span>
                        : part
                      )}
                  </div>
                  <div style={{ fontSize:12,color:"rgba(255,255,255,.55)",lineHeight:1.4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <ol style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,listStyle:"none" }}>
            {STEPS.map(s => (
              <li key={s.k} style={{ background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:22 }}>
                <div style={{ fontSize:24,marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--c-gold)",marginBottom:6 }}>{s.k}</div>
                <div style={{ fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"#fff",marginBottom:8 }}>{t(s.titleKey)}</div>
                <div style={{ fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.6 }}>{t(s.descKey)}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <style>{`@media(max-width:768px){section[style*="background:var(--c-blue)"] > div > div{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
