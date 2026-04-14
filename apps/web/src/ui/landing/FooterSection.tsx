import React from "react";
import { Link } from "react-router-dom";

export function FooterSection() {
  return (
    <footer style={{ background:"var(--c-ink)",padding:"48px 24px 32px" }}>
      <div style={{ maxWidth:1200,margin:"0 auto" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40,marginBottom:48,flexWrap:"wrap" }}>
          <div>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:22,color:"#fff",marginBottom:8 }}>
              CITU<span style={{ color:"var(--c-gold)" }}>RBAREA</span>
            </div>
            <div style={{ fontSize:13,color:"rgba(255,255,255,.5)",lineHeight:1.7,maxWidth:260,marginBottom:20 }}>
              Plateforme d'architecture, urbanisme & investissement au Maroc.<br/>
              Par Yassine Attarassi — Arc Bati Architecture.
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <a href="https://wa.me/212700127892" target="_blank" rel="noopener" style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff" }}>💬</a>
              <a href="https://www.facebook.com/yassine.attarassi" target="_blank" rel="noopener" style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff" }}>f</a>
              <a href="https://www.instagram.com/arc_bati_architecture" target="_blank" rel="noopener" style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff" }}>📸</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:16 }}>Services</div>
            <ul style={{ listStyle:"none",display:"flex",flexDirection:"column",gap:10 }}>
              {["Projet personnel","Projet immobilier","Clé en main (MOD)","Investisseur","Rapports"].map(s => (
                <li key={s}><a href="#portes" style={{ fontSize:13,color:"rgba(255,255,255,.55)" }}>{s}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:16 }}>Plateforme</div>
            <ul style={{ listStyle:"none",display:"flex",flexDirection:"column",gap:10 }}>
              <li><Link to="/login" style={{ fontSize:13,color:"rgba(255,255,255,.55)" }}>Connexion</Link></li>
              <li><Link to="/login" style={{ fontSize:13,color:"rgba(255,255,255,.55)" }}>Créer un compte</Link></li>
              <li><span style={{ fontSize:13,color:"rgba(255,255,255,.3)" }}>VIP — Bientôt ⏳</span></li>
              <li><span style={{ fontSize:13,color:"rgba(255,255,255,.3)" }}>VVIP — Bientôt ⏳</span></li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgba(255,255,255,.35)",marginBottom:16 }}>Contact</div>
            <ul style={{ listStyle:"none",display:"flex",flexDirection:"column",gap:10 }}>
              <li><a href="https://wa.me/212700127892" target="_blank" rel="noopener" style={{ fontSize:13,color:"rgba(255,255,255,.55)" }}>+212 700 127 892</a></li>
              <li><a href="mailto:contact@citurbarea.com" style={{ fontSize:13,color:"rgba(255,255,255,.55)" }}>contact@citurbarea.com</a></li>
              <li><span style={{ fontSize:13,color:"rgba(255,255,255,.4)" }}>Kénitra — Maroc</span></li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:24,display:"flex",flexWrap:"wrap",justifyContent:"space-between",gap:12,fontSize:12 }}>
          <span style={{ color:"rgba(255,255,255,.35)" }}>© {new Date().getFullYear()} CITURBAREA — Arc Bati Architecture. Tous droits réservés.</span>
          <div style={{ display:"flex",gap:16 }}>
            {["Mentions légales","Confidentialité","CGU"].map(l => (
              <a key={l} href="/media" style={{ color:"rgba(255,255,255,.35)" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:768px){footer>div>div:first-child{grid-template-columns:1fr 1fr!important}}`}</style>
    </footer>
  );
}
