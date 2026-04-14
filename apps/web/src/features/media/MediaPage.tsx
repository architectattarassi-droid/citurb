import React, { useEffect, useMemo, useState } from "react";
import type { Article, ArticleLang, ArticleCategory } from "./articles/types";
import {
  isModeratorEnabled, listByStatus, listPublished, removeArticle,
  setModeratorEnabled, setStatus, submitArticle,
} from "./articles/store";
import { seedMetaFromArticles } from "./articles/interactions";
import { ArticleCard } from "./components/ArticleCard";

type Filter = { lang: "all" | ArticleLang; category: "all" | ArticleCategory; q: string };

function stripHtml(html: string) { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function mkExcerpt(a: Article) {
  if (a.excerpt?.trim()) return a.excerpt.trim();
  const t = stripHtml(a.content || "");
  return t.length > 160 ? t.slice(0, 160) + "…" : t;
}
const CAT_LABELS: Record<ArticleCategory, string> = {
  terrain: "Terrain", urbanisme: "Urbanisme", autorisation: "Autorisation",
  chantier: "Chantier", budget: "Budget", investissement: "Investissement",
  juridique: "Juridique", autre: "Autre",
};
const CATS: ArticleCategory[] = ["terrain","investissement","urbanisme","autorisation","chantier","budget","juridique","autre"];

/* ─── Submit Modal ──────────────────────────────────────────────────────── */
function SubmitModal({ open, onClose, onSubmitted }: { open: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [title, setTitle]       = useState("");
  const [lang, setLang]         = useState<ArticleLang>("fr");
  const [category, setCat]      = useState<ArticleCategory>("terrain");
  const [tags, setTags]         = useState("");
  const [cover, setCover]       = useState("");
  const [content, setContent]   = useState("");
  const [authorName, setAuthor] = useState("Membre CITURBAREA");
  useEffect(() => { if (!open) { setTitle(""); setContent(""); setCover(""); } }, [open]);
  if (!open) return null;
  const ok = title.trim().length >= 6 && content.trim().length >= 80;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:80,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:640,borderRadius:16,background:"#fff",border:"1px solid #e2e8f0",boxShadow:"0 30px 80px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh" }}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center" }}>
          <span style={{ fontWeight:800,fontSize:16,color:"#0f172a" }}>✍️ Soumettre un article</span>
          <button onClick={onClose} style={{ marginLeft:"auto",padding:"6px 14px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontSize:13 }}>Fermer</button>
        </div>
        <div style={{ padding:20,overflowY:"auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {[
            { label:"Titre *", el: <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre (min 6 car.)" style={inp} /> },
            { label:"Auteur", el: <input value={authorName} onChange={e=>setAuthor(e.target.value)} style={inp} /> },
          ].map(({label,el},i) => (
            <label key={i} style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5 }}>{label}{el}</label>
          ))}
          <label style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5 }}>Langue
            <select value={lang} onChange={e=>setLang(e.target.value as ArticleLang)} style={inp}><option value="fr">Français</option><option value="ar">عربية</option><option value="en">English</option></select>
          </label>
          <label style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5 }}>Catégorie
            <select value={category} onChange={e=>setCat(e.target.value as ArticleCategory)} style={inp}>{CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}</select>
          </label>
          <label style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5,gridColumn:"1/-1" }}>Tags (virgules)
            <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="terrain, urbanisme…" style={inp} />
          </label>
          <label style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5,gridColumn:"1/-1" }}>Photo (URL)
            <input value={cover} onChange={e=>setCover(e.target.value)} placeholder="/media/articles/cover-1.jpg" style={inp} />
          </label>
          <label style={{ fontSize:13,fontWeight:600,color:"#475569",display:"flex",flexDirection:"column",gap:5,gridColumn:"1/-1" }}>Contenu HTML *
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="<p>Votre contenu…</p>" style={{ ...inp, height:160, resize:"none" }} />
          </label>
        </div>
        <div style={{ padding:"14px 20px",borderTop:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:12,color:"#94a3b8" }}>Modération avant publication.</span>
          <button disabled={!ok} onClick={()=>{ submitArticle({title:title.trim(),lang,category,tags:tags.split(",").map(t=>t.trim()).filter(Boolean),excerpt:"",content:content.trim(),cover:cover.trim()||undefined,authorName:authorName.trim()||undefined,updatedAt:new Date().toISOString()} as any); onSubmitted(); onClose(); alert("✅ Soumis à la modération."); }} style={{ marginLeft:"auto",padding:"9px 20px",borderRadius:10,border:"none",background:ok?"#1e3a8a":"#cbd5e1",color:"#fff",fontWeight:700,fontSize:13,cursor:ok?"pointer":"default" }}>
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Moderation ──────────────────────────────────────────────────────────── */
function ModerationPanel({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [pending, setPending] = useState<Article[]>([]);
  useEffect(() => { if (open) setPending(listByStatus("pending")); }, [open]);
  if (!open) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:800,borderRadius:16,background:"#fff",boxShadow:"0 30px 80px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh" }}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center" }}>
          <span style={{ fontWeight:800,fontSize:16 }}>🛡️ Modération ({pending.length})</span>
          <button onClick={onClose} style={{ marginLeft:"auto",padding:"6px 14px",borderRadius:8,border:"1px solid #e2e8f0",cursor:"pointer",fontSize:13 }}>Fermer</button>
        </div>
        <div style={{ padding:20,overflowY:"auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {pending.length === 0 ? <div style={{ color:"#94a3b8" }}>Aucun article en attente.</div> : pending.map(a => (
            <div key={a.id} style={{ borderRadius:12,border:"1px solid #e2e8f0",padding:16,background:"#f8fafc" }}>
              <div style={{ fontSize:12,color:"#94a3b8",marginBottom:4 }}>{a.lang.toUpperCase()} · {CAT_LABELS[a.category]} · {a.authorName}</div>
              <div style={{ fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:6 }}>{a.title}</div>
              <div style={{ fontSize:12,color:"#64748b" }}>{mkExcerpt(a)}</div>
              <div style={{ marginTop:12,display:"flex",gap:8 }}>
                <button onClick={()=>{setStatus(a.id,"published");onChanged();setPending(listByStatus("pending"));}} style={{ padding:"6px 14px",borderRadius:8,border:"none",background:"#15803d",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>Publier</button>
                <button onClick={()=>{setStatus(a.id,"rejected");onChanged();setPending(listByStatus("pending"));}} style={{ padding:"6px 14px",borderRadius:8,border:"none",background:"#b45309",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>Rejeter</button>
                <button onClick={()=>{removeArticle(a.id);onChanged();setPending(listByStatus("pending"));}} style={{ padding:"6px 14px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MediaPage ───────────────────────────────────────────────────────────── */
const inp: React.CSSProperties = { padding:"9px 12px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#fff",fontFamily:"inherit",width:"100%" };

export default function MediaPage() {
  const [filter, setFilter]           = useState<Filter>({ lang:"all", category:"all", q:"" });
  const [submitOpen, setSubmitOpen]   = useState(false);
  const [modOpen, setModOpen]         = useState(false);
  const [modEnabled, setModEnabled]   = useState(false);
  const [tick, setTick]               = useState(0);

  useEffect(() => {
    setModEnabled(isModeratorEnabled());
    try { seedMetaFromArticles(listPublished()); } catch {}
  }, []);

  const published = useMemo(() => {
    const list = listPublished();
    const q = filter.q.trim().toLowerCase();
    return list.filter(a => {
      if (filter.lang !== "all" && a.lang !== filter.lang) return false;
      if (filter.category !== "all" && a.category !== filter.category) return false;
      if (q) { const blob = `${a.title} ${a.excerpt} ${stripHtml(a.content)} ${(a.tags||[]).join(" ")}`.toLowerCase(); if (!blob.includes(q)) return false; }
      return true;
    });
  }, [filter, tick]);

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc" }}>

      {/* ── Header ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"16px 16px" }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:"#0f172a", letterSpacing:"-.025em" }}>
                Médias CITURBAREA
              </h1>
              <p style={{ margin:"4px 0 0", fontSize:13, color:"#94a3b8" }}>
                Journal premium — immobilier, urbanisme, construction
              </p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setSubmitOpen(true)} style={{ padding:"9px 18px",borderRadius:10,border:"none",background:"#0f172a",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer" }}>
                ✍️ Soumettre
              </button>
              {modEnabled
                ? <button onClick={()=>setModOpen(true)} style={{ padding:"9px 18px",borderRadius:10,border:"none",background:"#f59e0b",color:"#0f172a",fontWeight:800,fontSize:13,cursor:"pointer" }}>
                    🛡️ Modération {listByStatus("pending").length > 0 && `(${listByStatus("pending").length})`}
                  </button>
                : <button onClick={()=>{ setModeratorEnabled(true); setModEnabled(true); }} style={{ padding:"9px 18px",borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",color:"#64748b" }}>
                    Activer modérateur
                  </button>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtres sticky ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f1f5f9", padding:"10px 16px", position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
        <div style={{ maxWidth:680, margin:"0 auto", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {/* Langue pills */}
          <div style={{ display:"flex", gap:6 }}>
            {(["all","fr","ar","en"] as const).map(l => (
              <button key={l} onClick={()=>setFilter(f=>({...f,lang:l}))} style={{
                padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", border:"1.5px solid",
                borderColor: filter.lang===l ? "#1e3a8a" : "#e2e8f0",
                background: filter.lang===l ? "#1e3a8a" : "#fff",
                color: filter.lang===l ? "#fff" : "#64748b",
                transition:"all .12s",
              }}>{l==="all"?"Tous":l.toUpperCase()}</button>
            ))}
          </div>

          {/* Catégorie */}
          <select value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value as any}))} style={{ padding:"5px 12px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:12,fontWeight:600,background:"#fff",color:"#475569",outline:"none",cursor:"pointer" }}>
            <option value="all">Toutes catégories</option>
            {CATS.map(c=><option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>

          {/* Recherche */}
          <input
            value={filter.q} onChange={e=>setFilter(f=>({...f,q:e.target.value}))}
            placeholder="Rechercher…"
            style={{ flex:1, minWidth:180, padding:"5px 14px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, outline:"none", background:"#fff" }}
          />
        </div>
      </div>

      {/* ── Articles — 1 par ligne, max-width 800 ── */}
      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 16px 48px" }}>
        {published.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📰</div>
            <div style={{ color:"#94a3b8", fontWeight:500 }}>Aucun article ne correspond.</div>
            <button onClick={()=>setFilter({lang:"all",category:"all",q:""})} style={{ marginTop:16,padding:"8px 20px",borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",fontSize:13,cursor:"pointer",color:"#475569" }}>Réinitialiser</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize:12, color:"#94a3b8", fontWeight:600, marginBottom:16 }}>
              {published.length} article{published.length > 1 ? "s" : ""}
            </div>
            {published.map(a => <ArticleCard key={a.id} article={a} mode="media" />)}
          </>
        )}
      </div>

      <SubmitModal open={submitOpen} onClose={()=>setSubmitOpen(false)} onSubmitted={()=>setTick(t=>t+1)} />
      <ModerationPanel open={modOpen} onClose={()=>setModOpen(false)} onChanged={()=>setTick(t=>t+1)} />
    </div>
  );
}
