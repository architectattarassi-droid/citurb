import React from "react";

const MEDIA_ITEMS = [
  { type:"article", premium:false, tag:"ARTICLE", badge:"Analyse", title:"Terrain stratégique : potentiel réel & risques cachés", excerpt:"Règles applicables, marge de manœuvre, points de blocage fréquents, et scénarios de valorisation.", meta:"Urbanisme · ✅ Vérifié" },
  { type:"video",   premium:true,  tag:"VIDÉO",   badge:"Étude",   title:"Marché immobilier : où investir sans illusion",          excerpt:"Demande réelle, capacité bancaire, segmentation produit, erreurs fréquentes, logique de décision.", meta:"Investissement · ⭐ Premium" },
  { type:"article", premium:false, tag:"ARTICLE", badge:"Brief",   title:"Autorisation : 7 erreurs qui font perdre 60 jours",      excerpt:"Checklist : documents, séquences, objections typiques, et comment éviter le ping-pong administratif.", meta:"Autorisation · ✅ Vérifié" },
];

export function MediaSection() {
  return (
    <section style={{ maxWidth:1200,margin:"0 auto",padding:"72px 24px" }}>
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:24,marginBottom:48,flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--c-gold)",marginBottom:12 }}>Journal premium</div>
          <h2 style={{ fontFamily:"var(--font-display)",fontSize:"clamp(24px,3vw,36px)",fontWeight:800,letterSpacing:"-.025em",color:"var(--c-ink)",lineHeight:1.15,marginBottom:12 }}>
            Médias & Analyses
          </h2>
          <p style={{ fontSize:15,color:"var(--c-muted)",maxWidth:480,lineHeight:1.7 }}>
            Contenus éditoriaux vérifiés — immobilier, urbanisme, investissement, construction.
          </p>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <span className="badge-soon">VIP — Bientôt</span>
          <span className="badge-soon">VVIP — Bientôt</span>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20 }}>
        {MEDIA_ITEMS.map((m,i) => (
          <article key={i} style={{ background:"var(--c-card)",border:"1.5px solid var(--c-line)",borderRadius:20,padding:24,display:"flex",flexDirection:"column",gap:12 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ padding:"4px 10px",border:"1px solid var(--c-line)",borderRadius:99,fontSize:11,fontWeight:700,color:"var(--c-muted)" }}>{m.tag}</span>
                <span style={{ fontSize:12,color:"var(--c-muted)" }}>{m.badge}</span>
              </div>
              {m.premium
                ? <span style={{ padding:"4px 10px",background:"var(--c-blue)",color:"#fff",borderRadius:99,fontSize:11,fontWeight:700 }}>Premium</span>
                : <span style={{ padding:"4px 10px",border:"1px solid var(--c-line)",borderRadius:99,fontSize:11,fontWeight:600,color:"var(--c-muted)" }}>Libre</span>
              }
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"var(--c-ink)",marginBottom:8,lineHeight:1.35 }}>{m.title}</div>
              <p style={{ fontSize:13,color:"var(--c-muted)",lineHeight:1.6 }}>{m.excerpt}</p>
            </div>
            <div style={{ marginTop:"auto",paddingTop:12,borderTop:"1px solid var(--c-line)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span style={{ fontSize:12,color:"var(--c-muted)" }}>{m.meta}</span>
              {m.premium
                ? <span className="badge-soon" style={{ fontSize:10 }}>Accès VIP</span>
                : <button style={{ fontSize:12,fontWeight:600,color:"var(--c-blue)",background:"none",border:"none",cursor:"pointer",padding:0 }}>Lire →</button>
              }
            </div>
          </article>
        ))}
      </div>

      {/* More coming */}
      <div style={{ marginTop:32,padding:24,background:"var(--c-blueSoft)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)",fontSize:15,fontWeight:700,color:"var(--c-blue)",marginBottom:4 }}>Journal complet — Bientôt disponible</div>
          <div style={{ fontSize:13,color:"var(--c-muted)" }}>Briefs d'analyse, études de marché, dossiers techniques — accès VIP & VVIP en cours de déploiement.</div>
        </div>
        <span className="badge-soon">En cours</span>
      </div>
    </section>
  );
}
