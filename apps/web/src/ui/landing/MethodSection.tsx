import React from "react";

const STEPS = [
  { k:"01", icon:"📥", title:"Entrée structurée", desc:"Vous décrivez votre projet. La plateforme collecte sans interpréter — zéro jugement prématuré.", live:true },
  { k:"02", icon:"⚙️", title:"Décision backend", desc:"Le moteur applique les règles, qualifie votre dossier, et détermine le bon tunnel.", live:true },
  { k:"03", icon:"📊", title:"Affichage lisible", desc:"Complexité, périmètre, pack recommandé — restitués clairement. Le front affiche, le moteur décide.", live:true },
  { k:"04", icon:"🔐", title:"Traçabilité totale", desc:"Chaque action est horodatée, hashée, et attachée à des règles opposables. Preuves permanentes.", live:true },
];

export function MethodSection() {
  return (
    <section style={{ background:"var(--c-blue)",padding:"72px 24px" }}>
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center",flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:16 }}>Pourquoi CITURBAREA</div>
            <h2 style={{ fontFamily:"var(--font-display)",fontSize:"clamp(24px,3vw,38px)",fontWeight:800,color:"#fff",lineHeight:1.12,letterSpacing:"-.025em",marginBottom:20 }}>
              Un système,<br/>pas un cabinet<br/>comme les autres.
            </h2>
            <p style={{ fontSize:15,color:"rgba(255,255,255,.7)",lineHeight:1.7,marginBottom:28 }}>
              Chaque projet est cadré, documenté et suivi avec des preuves opposables. Pas de promesse floue — des livrables précis, des responsabilités claires.
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {[["35K+","Abonnés suivent nos conseils"],["6","Domaines d'intervention"],["10+","Villes couvertes"],["30min","Diagnostic gratuit"]].map(([num,label]) => (
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
                <div style={{ fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"#fff",marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.6 }}>{s.desc}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <style>{`@media(max-width:768px){section[style*="background:var(--c-blue)"] > div > div{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
