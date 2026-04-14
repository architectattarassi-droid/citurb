import React from "react";
import { Link } from "react-router-dom";

const WA = "https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20un%20diagnostic%20pour%20mon%20projet%20via%20CITURBAREA.";

const TICKER = [
  "Conception & Plans","Permis de Construire","Suivi de Chantier",
  "Maîtrise d'Ouvrage Déléguée","MRE — Construction à Distance",
  "Analyse Foncière","Rapports d'Expertise","Promoteurs Immobiliers",
  "Kénitra · Rabat · Casablanca · Agadir",
];

export function HeroSection() {
  const items = [...TICKER, ...TICKER];
  return (
    <>
      {/* TICKER */}
      <div style={{ background:"var(--c-blue)", overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute",top:0,bottom:0,left:0,width:80,zIndex:2,background:"linear-gradient(90deg,var(--c-blue),transparent)" }} />
        <div style={{ position:"absolute",top:0,bottom:0,right:0,width:80,zIndex:2,background:"linear-gradient(-90deg,var(--c-blue),transparent)" }} />
        <div style={{ display:"flex",gap:0,whiteSpace:"nowrap",animation:"tickerMove 32s linear infinite",padding:"9px 0" }}>
          {items.map((t,i) => (
            <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"0 28px",fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"rgba(255,255,255,.8)" }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:"var(--c-gold)",flexShrink:0 }} />
              {t}
            </span>
          ))}
        </div>
        <style>{`@keyframes tickerMove{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </div>

      {/* HEADER */}
      <header style={{ background:"var(--c-card)",borderBottom:"1px solid var(--c-line)",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:64 }}>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:20,color:"var(--c-blue)",letterSpacing:"-.01em" }}>
            CITU<span style={{ color:"var(--c-gold)" }}>RBAREA</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:11,fontWeight:600,letterSpacing:".05em",color:"var(--c-muted)",textTransform:"uppercase",padding:"6px 14px",border:"1px solid var(--c-line)",borderRadius:99 }}>
              Yassine Attarassi · Arc Bati
            </span>
            <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex",alignItems:"center",gap:8,background:"#25d366",color:"#fff",fontSize:13,fontWeight:700,padding:"9px 18px",borderRadius:99,border:"none",boxShadow:"0 2px 12px rgba(37,211,102,.25)" }}>
              💬 RDV WhatsApp
            </a>
            <Link to="/login" style={{ display:"inline-flex",alignItems:"center",background:"var(--c-blue)",color:"#fff",fontSize:13,fontWeight:600,padding:"9px 18px",borderRadius:99 }}>
              Connexion
            </Link>
          </div>
        </div>
      </header>

      {/* HERO GRID */}
      <section style={{ maxWidth:1200,margin:"0 auto",padding:"72px 24px 64px",display:"grid",gridTemplateColumns:"1fr 420px",gap:56,alignItems:"start" }}>
        <div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--c-gold)",marginBottom:20 }}>
            <span style={{ width:24,height:2,background:"var(--c-gold)",borderRadius:1 }} />
            Architecture · Urbanisme · Investissement
          </div>
          <h1 style={{ fontFamily:"var(--font-display)",fontSize:"clamp(34px,4.5vw,56px)",fontWeight:800,lineHeight:1.07,letterSpacing:"-.03em",color:"var(--c-ink)",marginBottom:24 }}>
            Votre projet au Maroc,{" "}
            <span style={{ color:"var(--c-blue)",display:"block" }}>sécurisé de A à Z.</span>
          </h1>
          <p style={{ fontSize:16,lineHeight:1.75,color:"var(--c-muted)",maxWidth:500,marginBottom:36 }}>
            Permis bloqué, chantier qui dérape, terrain sans plan —{" "}
            <strong style={{ color:"var(--c-ink)",fontWeight:500 }}>nous traitons les projets complexes</strong>{" "}
            que les autres cabinets évitent. Diagnostic gratuit en 30 minutes.
          </p>
          <div style={{ display:"flex",flexWrap:"wrap",gap:12,marginBottom:48 }}>
            <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex",alignItems:"center",gap:10,background:"var(--c-blue)",color:"#fff",fontSize:15,fontWeight:700,padding:"14px 28px",borderRadius:14,boxShadow:"0 4px 20px rgba(13,53,102,.22)",border:"none" }}>
              📋 Démarrer mon diagnostic
            </a>
            <a href="#portes" style={{ display:"inline-flex",alignItems:"center",background:"transparent",color:"var(--c-ink)",fontSize:14,fontWeight:500,padding:"13px 24px",borderRadius:14,border:"1.5px solid var(--c-line)" }}>
              Voir les services →
            </a>
          </div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:20 }}>
            {[["🏛️","Cabinet agréé Maroc"],["📍","Kénitra & national"],["✈️","MRE — suivi à distance"],["🔒","Preuves opposables"]].map(([icon,label]) => (
              <div key={label as string} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--c-muted)" }}>
                <div style={{ width:30,height:30,borderRadius:8,background:"var(--c-card)",border:"1px solid var(--c-line)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>{icon}</div>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* CONTACT CARD */}
        <div style={{ background:"var(--c-card)",borderRadius:24,padding:32,boxShadow:"var(--shadow-lg)",border:"1px solid var(--c-line)",position:"sticky",top:84 }}>
          <div style={{ fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"var(--c-ink)",marginBottom:6 }}>
            Diagnostic gratuit — 30 min
          </div>
          <p style={{ fontSize:13,color:"var(--c-muted)",marginBottom:20,lineHeight:1.5 }}>
            Choisissez votre profil. On vous répond en moins de 2h.
          </p>
          <div style={{ fontSize:12,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",color:"var(--c-muted)",marginBottom:10 }}>Votre situation</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20 }}>
            {[["🏠","Maison R+1"],["🏢","Maison R+2/R+3"],["🏡","Villa"],["✈️","MRE / Distance"],["🏗️","Promoteur"],["📐","Terrain sans plan"]].map(([icon,label]) => (
              <button key={label as string}
                onClick={() => {
                  const msg = encodeURIComponent(`Salam Yassine,\n\nJe veux un diagnostic pour mon projet.\n\n📋 Profil : ${icon} ${label}\n\nMerci de me confirmer un créneau.`);
                  window.open(`https://wa.me/212700127892?text=${msg}`,"_blank");
                }}
                style={{ padding:"11px 8px",border:"1.5px solid var(--c-line)",borderRadius:10,background:"var(--c-card)",fontSize:12,fontWeight:600,color:"var(--c-ink)",cursor:"pointer",textAlign:"center",lineHeight:1.3 }}
                onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor="var(--c-blue)"; el.style.color="var(--c-blue)"; el.style.background="var(--c-blueSoft)"; }}
                onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.borderColor="var(--c-line)"; el.style.color="var(--c-ink)"; el.style.background="var(--c-card)"; }}
              >
                <span style={{ fontSize:18,display:"block",marginBottom:3 }}>{icon}</span>{label}
              </button>
            ))}
          </div>
          <a href={WA} target="_blank" rel="noopener" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:14,background:"linear-gradient(135deg,#25d366,#1da851)",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:700,boxShadow:"0 4px 20px rgba(37,211,102,.3)",marginBottom:12 }}>
            <span style={{ fontSize:18 }}>💬</span> Démarrer sur WhatsApp
          </a>
          <div style={{ textAlign:"center",fontSize:11,color:"var(--c-muted)",lineHeight:1.5 }}>
            Aucun paiement requis · Diagnostic 30 min gratuit<br/>
            Ou <Link to="/login" style={{ color:"var(--c-blue)",fontWeight:600 }}>accédez à votre espace plateforme</Link>
          </div>
        </div>
      </section>

      <style>{`@media(max-width:900px){section[style*="grid-template-columns"]{grid-template-columns:1fr !important}}`}</style>
    </>
  );
}
