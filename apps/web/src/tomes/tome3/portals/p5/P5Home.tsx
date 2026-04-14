import React from "react";

export default function P5Home() {
  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:32 }}>
        <span className="badge-soon" style={{ marginBottom:16, display:"inline-flex" }}>Bientôt disponible</span>
        <h1 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,color:"var(--c-ink)",marginBottom:12,lineHeight:1.15 }}>
          Porte 5 — Rapports & expertises
        </h1>
        <p style={{ fontSize:15,color:"var(--c-muted)",lineHeight:1.7 }}>Estimation immobilière, rapport conformité, avis technique. Document exploitable banque.</p>
      </div>
      <div style={{ padding:28,background:"var(--c-soonSoft)",border:"1px solid rgba(124,58,237,.15)",borderRadius:16,marginBottom:24 }}>
        <div style={{ fontSize:16,fontWeight:700,color:"var(--c-soon)",marginBottom:8 }}>🚧 Module en cours de déploiement</div>
        <p style={{ fontSize:14,color:"var(--c-muted)",lineHeight:1.6,marginBottom:16 }}>
          Cette porte est en cours de finalisation. Elle sera disponible prochainement.
          En attendant, démarrez votre demande directement sur WhatsApp.
        </p>
        <a href="https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20la%20Porte%205%20%E2%80%94%20Rapports & expertises" target="_blank" rel="noopener"
          style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"11px 20px",background:"linear-gradient(135deg,#25d366,#1da851)",color:"#fff",borderRadius:10,fontSize:13,fontWeight:700,border:"none",cursor:"pointer" }}>
          💬 Démarrer sur WhatsApp
        </a>
      </div>
      <div style={{ padding:20,background:"var(--c-card)",border:"1px solid var(--c-line)",borderRadius:12,fontSize:13,color:"var(--c-muted)",lineHeight:1.6 }}>
        <strong style={{ color:"var(--c-ink)" }}>Ce qui sera disponible dans cette porte :</strong><br/><br/>
        Estimation immobilière, rapport conformité, avis technique. Document exploitable banque. Toute l'infrastructure de gestion de dossier, suivi et preuves opposables est en place — l'interface sera ouverte progressivement.
      </div>
    </div>
  );
}
