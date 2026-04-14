import React from "react";
import { Link } from "react-router-dom";

const WA = "https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20un%20diagnostic%20pour%20mon%20projet%20via%20CITURBAREA.";

export function CTASection() {
  return (
    <section style={{ maxWidth:1200,margin:"0 auto",padding:"72px 24px" }}>
      <div style={{ background:"var(--c-card)",border:"1.5px solid var(--c-line)",borderRadius:28,padding:"64px 40px",boxShadow:"var(--shadow-lg)",textAlign:"center",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"60%",height:3,background:"linear-gradient(90deg,transparent,var(--c-gold),transparent)" }} />
        <div style={{ fontFamily:"var(--font-display)",fontSize:"clamp(28px,3.5vw,44px)",fontWeight:800,letterSpacing:"-.025em",lineHeight:1.1,color:"var(--c-ink)",marginBottom:16 }}>
          Votre projet mérite{" "}
          <span style={{ color:"var(--c-blue)" }}>un diagnostic sérieux.</span>
        </div>
        <p style={{ fontSize:16,color:"var(--c-muted)",maxWidth:440,margin:"0 auto 36px",lineHeight:1.6 }}>
          30 minutes. Gratuit. Sans engagement.<br/>
          On vous dit exactement ce qu'on peut faire.
        </p>
        <div style={{ display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:14 }}>
          <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex",alignItems:"center",gap:10,background:"var(--c-blue)",color:"#fff",fontSize:15,fontWeight:700,padding:"14px 28px",borderRadius:14,border:"none",boxShadow:"0 4px 20px rgba(13,53,102,.22)" }}>
            📋 Démarrer le diagnostic
          </a>
          <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#25d366,#1da851)",color:"#fff",fontSize:14,fontWeight:700,padding:"13px 24px",borderRadius:14,border:"none",boxShadow:"0 4px 16px rgba(37,211,102,.3)" }}>
            💬 WhatsApp direct
          </a>
          <Link to="/login" style={{ display:"inline-flex",alignItems:"center",color:"var(--c-muted)",fontSize:14,fontWeight:500,padding:"13px 24px",borderRadius:14,border:"1.5px solid var(--c-line)",background:"transparent" }}>
            Accéder à la plateforme →
          </Link>
        </div>
      </div>
    </section>
  );
}
