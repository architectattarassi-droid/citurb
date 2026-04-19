import React from "react";
import { useNavigate } from "react-router-dom";

const WA = "https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20un%20diagnostic%20pour%20mon%20projet%20via%20CITURBAREA.";

const DOORS = [
  { id:"p1", num:"01", icon:"🏠", color:"#0d3566", title:"Projet personnel & familial", desc:"Maison R+1 à R+3, villa individuelle, terrain nu. Conception, autorisation, orientation chantier.", result:"Plan + dossier autorisable + permis", live:true },
  { id:"p2", num:"02", icon:"🏢", color:"#c48b1f", title:"Projet immobilier & équipements", desc:"Immeuble, commerce, clinique, école. Faisabilité, scénarios réglementaires, conception optimisée.", result:"Dossier + scénarios + sécurisation", live:true },
  { id:"p3", num:"03", icon:"🏗️", color:"#0f5c30", title:"Réalisation clé en main (MOD)", desc:"Pilotage chantier, sélection entreprises, contrôle qualité, suivi budget et délais.", result:"Chantier piloté + budget maîtrisé", live:true },
  { id:"p4", num:"04", icon:"📊", color:"#5c0f5c", title:"Investisseur & foncier", desc:"Analyse foncière, potentiel réglementaire, scénarios de valorisation, risques identifiés.", result:"Étude + potentiel + stratégie", live:true },
  { id:"p5", num:"05", icon:"📋", color:"#0f5c5c", title:"Rapports & expertises", desc:"Estimation immobilière, rapport conformité, avis technique. Document exploitable banque / décision.", result:"Rapport premium opposable", live:true },
  { id:"p6", num:"06", icon:"🤝", color:"#5c1a1a", title:"Entreprise & partenaire", desc:"Accès à des dossiers qualifiés, collaboration structurée, méthode qualité imposée.", result:"Écosystème + dossiers qualifiés", live:true },
];

export function DoorsSection() {
  const navigate = useNavigate();
  return (
    <section id="portes" style={{ maxWidth:1200,margin:"0 auto",padding:"72px 24px" }}>
      <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:24,marginBottom:48,flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--c-gold)",marginBottom:12 }}>Ce que nous faisons</div>
          <h2 style={{ fontFamily:"var(--font-display)",fontSize:"clamp(26px,3vw,38px)",fontWeight:800,letterSpacing:"-.025em",color:"var(--c-ink)",lineHeight:1.15,marginBottom:12 }}>
            6 domaines d'intervention
          </h2>
          <p style={{ fontSize:15,color:"var(--c-muted)",maxWidth:480,lineHeight:1.7 }}>
            Chaque projet est orienté vers le bon périmètre d'action. Nous ne prenons que ce que nous pouvons livrer.
          </p>
        </div>
        <a href={WA} target="_blank" rel="noopener" style={{ display:"inline-flex",alignItems:"center",gap:8,background:"var(--c-blue)",color:"#fff",fontSize:13,fontWeight:600,padding:"10px 20px",borderRadius:99,border:"none",whiteSpace:"nowrap" }}>
          💬 Parler de mon projet
        </a>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20 }}>
        {DOORS.map(d => (
          <article key={d.id} style={{
            background:"var(--c-card)",
            border:"1.5px solid var(--c-line)",
            borderRadius:20, padding:28,
            position:"relative", overflow:"hidden",
            transition:".25s ease", cursor:"pointer",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor="transparent";
            el.style.boxShadow="var(--shadow-md)";
            el.style.transform="translateY(-4px)";
            const bar = el.querySelector(".door-bar") as HTMLElement;
            if(bar) bar.style.transform="scaleX(1)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor="var(--c-line)";
            el.style.boxShadow="none";
            el.style.transform="translateY(0)";
            const bar = el.querySelector(".door-bar") as HTMLElement;
            if(bar) bar.style.transform="scaleX(0)";
          }}
          onClick={() => {
            if (d.live) {
              // navigation SPA (évite reload + comportement inattendu)
              navigate(`/${d.id}`);
            } else {
              const msg = encodeURIComponent(`Salam Yassine,\n\nJe suis intéressé par votre service :\n📌 ${d.title}\n\nMerci de me contacter.`);
              window.open(`https://wa.me/212700127892?text=${msg}`,"_blank");
            }
          }}
          >
            <div className="door-bar" style={{ position:"absolute",top:0,left:0,right:0,height:3,background:d.color,transform:"scaleX(0)",transformOrigin:"left",transition:".3s ease" }} />
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
              <span style={{ fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--c-muted)" }}>Porte {d.num}</span>
              {d.live
                ? <span className="badge-live">Disponible</span>
                : <span className="badge-soon">Bientôt</span>
              }
            </div>
            <div style={{ fontSize:28,marginBottom:12 }}>{d.icon}</div>
            <div style={{ fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:8,color:"var(--c-ink)" }}>{d.title}</div>
            <p style={{ fontSize:13,color:"var(--c-muted)",lineHeight:1.6,marginBottom:16 }}>{d.desc}</p>
            <div style={{ fontSize:12,fontWeight:600,color:d.color,padding:"8px 12px",background:`${d.color}12`,borderRadius:8,lineHeight:1.4 }}>
              → {d.result}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
