import React, { useEffect } from "react";

import { listPublished } from "../../features/media/articles/store";
import { ArticleCard } from "../../features/media/components/ArticleCard";

// Landing keeps the validated HTML/CSS identity, but renders the Articles preview in React.
// Legacy inline JS media feed is removed to avoid runtime errors and to make content maintainable.

const STYLES = `
:root{
    --bg:#f7f6f2;
    --card:#ffffff;
    --muted:#475569;
    --text:#0f172a;
    --line:#e5e7eb;
    --blue:#1d4ed8;
    --blue2:#0b2d97;
    --soft:#f8fafc;
    --shadow:0 18px 40px rgba(15,23,42,.10);
    --r:18px;
    --r2:14px;
    --gold:#c9a227;
  }

  *{ box-sizing:border-box; }
  html{ scroll-behavior:smooth; }
  body{
    margin:0;
    font-family: Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    background:var(--bg);
    color:var(--text);
  }
  a{ text-decoration:none; color:inherit; }
  .container{ max-width:1300px; margin:0 auto; padding:0 20px; }

  header{
    background:var(--card);
    border-bottom:1px solid var(--line);
    position:sticky;
    top:0;
    z-index:100;
  }

  .ticker{
    background:linear-gradient(90deg, var(--blue), var(--blue2));
    color:#fff;
    border-bottom:1px solid rgba(255,255,255,.18);
    overflow:hidden;
    position:relative;
  }
  .ticker-inner{
    display:flex;
    gap:40px;
    white-space:nowrap;
    padding:8px 0;
    will-change:transform;
    animation:tickerMove 26s linear infinite;
  }
  .ticker:hover .ticker-inner{ animation-play-state:paused; }
  .ticker-item{
    display:flex; align-items:center; gap:10px;
    font-size:13px; font-weight:600;
    opacity:.98;
  }
  .dot{ width:8px;height:8px;border-radius:50%; background:#fff; opacity:.85; }
  @keyframes tickerMove{
    from{ transform:translateX(0); }
    to{ transform:translateX(-50%); }
  }

  .header-top,
  .header-bottom{
    display:flex;
    align-items:center;
    width:100%;
    gap:14px;
  }

  .header-top{ padding:10px 0; }

  /* Socials: vitrine => pas de sortie (anti-fuite) */
  .socials{ display:flex; align-items:center; gap:10px; flex:0 0 auto; }
  .socials button{
    width:34px;height:34px;border-radius:10px;
    display:flex;align-items:center;justify-content:center;
    border:1px solid var(--line);
    background:var(--soft);
    transition:.15s ease;
    cursor:pointer;
    font-weight:900;
    color:#0f172a;
  }
  .socials button:hover{ transform:translateY(-1px); box-shadow:0 10px 20px rgba(15,23,42,.08); }

  .chip{
    background:#e6ebf5;
    padding:7px 12px;
    border-radius:999px;
    font-size:13px;
    font-weight:700;
    color:var(--blue2);
    border:1px solid #d7def0;
    white-space:nowrap;
    cursor:pointer;
  }

  .search{
    margin-left:auto;
    display:flex;
    align-items:center;
    gap:10px;
    padding:8px 12px;
    border-radius:999px;
    border:1px solid #cbd5e1;
    background:#fff;
    min-width:280px;
    max-width:420px;
    width:100%;
  }
  .search input{ border:none; outline:none; width:100%; font-size:14px; }

  .header-bottom{ padding:12px 0; }
  .brand{ font-weight:900; letter-spacing:.8px; color:var(--blue); font-size:16px; }
  .nav{ display:flex; gap:12px; margin-left:auto; align-items:center; flex-wrap:nowrap; }

  .pill{
    background:var(--blue);
    color:#fff;
    padding:10px 14px;
    border-radius:999px;
    font-size:14px;
    font-weight:800;
    cursor:pointer;
    border:1px solid rgba(29,78,216,.35);
    transition:.15s ease;
    white-space:nowrap;
    user-select:none;
  }
  .pill:hover{ background:var(--blue2); }

  .pill.vip{ background:var(--gold); color:#0b1220; border:1px solid rgba(0,0,0,.15); }
  .pill.vvip{ background:#0b1220; color:#fff; border:1px solid rgba(0,0,0,.15); }

  .dropdown{ position:relative; }
  .dropdown-content{
    display:none;
    position:absolute;
    top:48px;
    right:0;
    background:#fff;
    border:1px solid var(--line);
    border-radius:14px;
    width:340px;
    box-shadow:var(--shadow);
    overflow:hidden;
    z-index:50;
  }
  .dropdown:hover .dropdown-content{ display:block; }
  .dropdown-content a{
    display:block;
    padding:14px 14px;
    border-bottom:1px solid #f1f5f9;
  }
  .dropdown-content a:last-child{ border-bottom:none; }
  .dropdown-content strong{ display:block; font-size:14px; }
  .dropdown-content small{ display:block; margin-top:3px; color:#64748b; line-height:1.35; }

  .hero{ padding:28px 0 16px; }
  .hero-grid{ display:grid; grid-template-columns:2fr 1fr; gap:26px; }

  .card{
    background:var(--card);
    border:1px solid var(--line);
    border-radius:var(--r);
    box-shadow:0 12px 30px rgba(15,23,42,.06);
  }
  .hero-box{ padding:26px; }
  h1{ font-size:30px; line-height:1.18; margin:0 0 10px; }
  .lead{ color:var(--muted); line-height:1.65; margin:0; }

  .categories{
    display:grid;
    grid-template-columns:repeat(2, 1fr);
    gap:16px;
    margin-top:18px;
  }
  .cat{
    background:var(--soft);
    border:1px solid #e7eefc;
    border-radius:14px;
    padding:16px;
    cursor:pointer;
    transition:.15s ease;
    position:relative;
    overflow:hidden;
  }
  .cat:hover{
    transform:translateY(-1px);
    box-shadow:0 14px 30px rgba(15,23,42,.08);
    border-color:#cfe0ff;
  }
  .cat h3{
    margin:0 0 8px;
    font-size:15px;
    color:var(--blue2);
    font-weight:900;
  }
  .cat p{ margin:0; color:#334155; line-height:1.55; font-size:13.8px; }
  .cat .deliver{
    margin-top:10px;
    padding-top:10px;
    border-top:1px dashed #c9d7f7;
    color:#0f172a;
    font-weight:800;
    font-size:13px;
  }

  .form{
    margin-top:18px;
    padding:16px;
    border:1px solid #e7eefc;
    background:#fbfcff;
    border-radius:14px;
  }
  .form h3{ margin:0 0 10px; font-size:15px; font-weight:900; color:var(--blue2); }
  .hint{ margin:0 0 14px; color:#475569; font-size:13.5px; line-height:1.5; }
  .form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .form input, .form select{
    padding:12px;
    border-radius:12px;
    border:1px solid #cbd5e1;
    background:#fff;
    font-size:14px;
    outline:none;
  }
  .form button{
    grid-column:span 2;
    background:linear-gradient(90deg,var(--blue),var(--blue2));
    color:#fff;
    padding:13px 14px;
    border-radius:12px;
    border:none;
    font-weight:900;
    cursor:pointer;
    transition:.15s ease;
  }
  .form button:hover{ filter:brightness(.95); }

  .panel{ display:flex; flex-direction:column; gap:14px; }
  .block{ padding:14px; }
  .block-title{
    font-weight:900;
    color:var(--blue2);
    margin:0 0 10px;
    font-size:14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
  }
  .block-title small{ color:#64748b; font-weight:700; }

  .mock-video{
    height:210px;
    border:none;
    border-radius:14px;
    background:linear-gradient(135deg,#0b1220,#0b2d97);
    display:flex;
    align-items:center;
    justify-content:center;
    color:#fff;
    font-weight:1000;
    letter-spacing:.4px;
  }

  .scroll-section{ margin:18px 0 0; }
  .scroll-card{ padding:16px; }
  .scroll-head{
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:12px;
    margin-bottom:10px;
  }
  .scroll-title{ font-size:16px; font-weight:1000; color:var(--blue2); }
  .scroll-sub{ color:#64748b; font-size:13px; font-weight:700; margin:0; }

  .scroller{
    display:flex;
    gap:14px;
    overflow:auto;
    scroll-snap-type:x mandatory;
    padding:6px 2px 10px;
    -webkit-overflow-scrolling:touch;
  }
  .scroller::-webkit-scrollbar{ height:8px; }
  .scroller::-webkit-scrollbar-thumb{ background:#cbd5e1; border-radius:999px; }

  .tile{
    scroll-snap-align:start;
    min-width:280px;
    max-width:280px;
    border:1px solid var(--line);
    border-radius:14px;
    background:#fff;
    overflow:hidden;
    cursor:pointer;
    transition:.15s ease;
    box-shadow:0 10px 18px rgba(15,23,42,.06);
  }
  .tile:hover{ transform:translateY(-2px); box-shadow:0 18px 32px rgba(15,23,42,.10); }
  .thumb{ height:150px; background:#e2e8f0; position:relative; overflow:hidden; }
  .thumb .ph{
    width:100%;height:100%;
    background:linear-gradient(135deg,#e2e8f0,#cbd5e1);
  }
  .badge{
    position:absolute;
    top:10px; left:10px;
    background:rgba(15,23,42,.88);
    color:#fff;
    font-size:12px;
    font-weight:900;
    padding:6px 10px;
    border-radius:999px;
  }
  .play{
    position:absolute;
    inset:auto 10px 10px auto;
    background:rgba(29,78,216,.92);
    color:#fff;
    font-weight:1000;
    padding:8px 10px;
    border-radius:12px;
    font-size:12px;
  }
  .tile-body{ padding:12px; }
  .tile-title{ font-weight:1000; margin:0 0 6px; color:#0f172a; }
  .tile-meta{ margin:0; color:#64748b; font-weight:700; font-size:13px; line-height:1.45; }

  /* ======= MEDIAS V2 FEED ======= */
  section#medias{ scroll-margin-top: 140px; } /* compens sticky header */
  .media-wrap{ margin-top:18px; }
  .media-head{
    padding:16px;
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:14px;
  }
  .media-head h2{
    margin:0;
    font-size:18px;
    font-weight:1000;
    color:var(--blue2);
  }
  .media-head p{
    margin:6px 0 0;
    color:#64748b;
    font-weight:700;
    font-size:13px;
    line-height:1.5;
  }
  .media-cta{
    display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;
  }

  .feed{
    padding:0 16px 16px;
    display:flex;
    flex-direction:column;
    gap:14px;
  }
  .post{
    background:#fff;
    border:1px solid var(--line);
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 10px 25px rgba(15,23,42,.06);
    display:flex;
    gap:0;
  }
  .post-media{
    width:40%;
    min-height:210px;
    background:#e2e8f0;
    position:relative;
    overflow:hidden;
  }
  .post-media img, .post-media video{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }
  .pm-badge{
    position:absolute;
    top:10px; left:10px;
    background:rgba(15,23,42,.88);
    color:#fff;
    padding:6px 10px;
    border-radius:999px;
    font-size:12px;
    font-weight:900;
  }
  .pm-tag{
    position:absolute;
    inset:auto 10px 10px auto;
    background:rgba(29,78,216,.92);
    color:#fff;
    padding:7px 10px;
    border-radius:12px;
    font-size:12px;
    font-weight:1000;
  }

  .post-body{
    width:60%;
    padding:12px 14px;
    display:flex;
    flex-direction:column;
  }
  .author-line{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    flex-wrap:wrap;
    color:#64748b;
    font-size:12.5px;
    font-weight:800;
  }
  .author-chip{
    background:#e6ebf5;
    border:1px solid #d7def0;
    color:#0b2d97;
    padding:5px 10px;
    border-radius:999px;
    font-weight:1000;
    cursor:pointer;
    white-space:nowrap;
  }
  .post-title{
    margin:8px 0 6px;
    font-size:17px;
    font-weight:1000;
    color:#0f172a;
  }
  .post-text{
    margin:0;
    color:#334155;
    line-height:1.6;
    font-size:14px;
  }

  .premium-wrap{
    margin-top:8px;
    position:relative;
    border:1px dashed #e5e7eb;
    border-radius:14px;
    padding:10px;
    background:#fbfcff;
  }
  .premium-blur{
    filter: blur(5px);
    user-select:none;
  }
  .paywall{
    position:absolute;
    inset:0;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:10px;
    background:rgba(255,255,255,.92);
    text-align:center;
    padding:12px;
  }
  .paywall strong{ font-weight:1000; }
  .paywall small{ color:#64748b; font-weight:800; line-height:1.4; }
  .pw-actions{ display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
  .pw-btn{
    border:none;
    border-radius:999px;
    padding:10px 14px;
    font-weight:1000;
    cursor:pointer;
  }
  .pw-btn.vip{ background:var(--gold); color:#0b1220; }
  .pw-btn.vvip{ background:#0b1220; color:#fff; }

  .post-actions{
    display:flex;
    gap:14px;
    flex-wrap:wrap;
    margin-top:auto;
    padding-top:10px;
    border-top:1px dashed var(--line);
    color:#475569;
    font-size:13px;
    font-weight:900;
  }
  .act{ cursor:pointer; user-select:none; }
  .act:hover{ color:#0b2d97; }

  .comments-preview{
    margin-top:8px;
    color:#475569;
    font-size:13px;
    line-height:1.5;
  }
  .comment{
    border-left:3px solid #dbeafe;
    padding-left:10px;
    margin-top:6px;
  }
  .comment b{ color:#0f172a; }

  .ad-slot{
    background:linear-gradient(90deg,#0b1220,#111827);
    color:#fff;
    border-radius:16px;
    padding:18px 14px;
    text-align:center;
    font-weight:1000;
    border:1px solid rgba(255,255,255,.10);
  }
  .ad-slot small{ display:block; margin-top:6px; opacity:.85; font-weight:800; }

  /* Modals (global) */
  .modal{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(15,23,42,.65);
    z-index:999;
    padding:18px;
    align-items:center;
    justify-content:center;
  }
  .modal.open{ display:flex; }
  .modal-card{
    width:min(980px, 96vw);
    background:#fff;
    border-radius:18px;
    overflow:hidden;
    box-shadow:0 30px 80px rgba(0,0,0,.25);
    display:flex;
    flex-direction:column;
  }
  .modal-head{
    padding:12px 14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    border-bottom:1px solid var(--line);
    font-weight:1000;
    color:var(--blue2);
  }
  .modal-close{
    background:#0f172a;
    color:#fff;
    border:none;
    border-radius:12px;
    padding:10px 12px;
    font-weight:1000;
    cursor:pointer;
  }
  .modal-body{
    padding:14px;
    background:#fff;
  }
  .modal-grid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:12px;
    margin-top:10px;
  }
  .modal-body input, .modal-body select, .modal-body textarea{
    width:100%;
    padding:12px;
    border-radius:12px;
    border:1px solid #cbd5e1;
    outline:none;
    font-size:14px;
    background:#fff;
  }
  .modal-body textarea{ min-height:110px; resize:vertical; }
  .modal-actions{
    margin-top:12px;
    display:flex;
    gap:10px;
    flex-wrap:wrap;
  }
  .mbtn{
    border:none;
    border-radius:12px;
    padding:12px 12px;
    font-weight:1000;
    cursor:pointer;
  }
  .mbtn.primary{ background:linear-gradient(90deg,var(--blue),var(--blue2)); color:#fff; }
  .mbtn.secondary{ background:#e6ebf5; color:#0b2d97; border:1px solid #d7def0; }


  /* ── Media V3 ── */
  .filter-btn{padding:6px 13px;border-radius:999px;border:1px solid #d7def0;background:#e6ebf5;color:#0b2d97;font-size:13px;font-weight:800;cursor:pointer;transition:.15s;}
  .filter-btn:hover,.filter-btn.active{background:var(--blue);color:#fff;border-color:var(--blue);}
  .post-vote{display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;font-weight:900;color:#475569;user-select:none;}
  .post-vote.liked,.post-vote:hover{color:var(--blue);}
  .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--blue2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0;}
  .vbadge{background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;padding:2px 7px;border-radius:999px;}
  .cb{display:none;margin-top:10px;padding:10px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;}
  .cb textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:13.5px;resize:vertical;outline:none;min-height:70px;box-sizing:border-box;font-family:inherit;}
  .cb button{margin-top:8px;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:900;cursor:pointer;font-size:13px;}
  .acontent h4{margin:12px 0 5px;font-size:14px;color:var(--blue2);font-weight:900;}
  .acontent p{margin:0 0 9px;color:#334155;line-height:1.65;font-size:13.5px;}
  .acontent hr{margin:12px 0;border:none;border-top:1px dashed #e5e7eb;}

  /* lang switcher */
  .lang-switcher{ display:flex; align-items:center; gap:3px; background:#f1f5f9; border-radius:99px; padding:3px; border:1px solid #e2e8f0; }
  .lang-btn{ background:none; border:none; border-radius:99px; padding:4px 10px; font-size:11px; font-weight:800; cursor:pointer; color:#64748b; transition:.15s; font-family:inherit; }
  .lang-btn.active,.lang-btn:hover{ background:#fff; color:#1e3a8a; box-shadow:0 1px 4px rgba(0,0,0,.08); }

  /* auth buttons */
  .btn-login{ padding:7px 16px; border-radius:99px; border:1.5px solid #1e3a8a; color:#1e3a8a; font-size:12px; font-weight:800; cursor:pointer; transition:.15s; white-space:nowrap; text-decoration:none; display:inline-block; }
  .btn-login:hover{ background:#eff6ff; }
  .btn-signup{ padding:7px 16px; border-radius:99px; border:none; background:#1e3a8a; color:#fff; font-size:12px; font-weight:800; cursor:pointer; transition:.15s; white-space:nowrap; text-decoration:none; display:inline-block; }
  .btn-signup:hover{ background:#1d4ed8; }

  footer{ margin-top:26px; background:#0f172a; color:#e5e7eb; padding:28px 0; }
  footer h3{ margin:0 0 10px; font-size:16px; }
  footer ul{ list-style:none; padding:0; margin:0; }
  footer li{ margin:6px 0; color:#cbd5e1; }

  @media (max-width:900px){
    .hero-grid{ grid-template-columns:1fr; }
    .categories{ grid-template-columns:1fr; }
    .search{ min-width:unset; max-width:unset; }
    .header-top{ flex-wrap:wrap; }
    .header-bottom{ flex-wrap:wrap; }
    .nav{ width:100%; margin-left:0; justify-content:flex-start; flex-wrap:wrap; }
    .post{ flex-direction:column; }
    .post-media,.post-body{ width:100%; }
    .modal-grid{ grid-template-columns:1fr; }
  }
`;
const PRE_HTML = `


<header>
  <div class="ticker" aria-label="Messages importants">
    <div class="container" style="overflow:hidden">
      <div class="ticker-inner" id="tickerInner">
        <div class="ticker-item"><span class="dot"></span>Message important : Opportunités vérifiées (pas de promesses “magiques”).</div>
        <div class="ticker-item"><span class="dot"></span>Rapports premium : urbanisme, estimation, banque, foncier (décision rapide).</div>
        <div class="ticker-item"><span class="dot"></span>Clé en main : contrôle qualité, budget, délais — avec méthode.</div>
        <div class="ticker-item"><span class="dot"></span>Nouveaux médias : analyses + études de marché (VIP/VVIP).</div>

        <div class="ticker-item"><span class="dot"></span>Message important : Opportunités vérifiées (pas de promesses “magiques”).</div>
        <div class="ticker-item"><span class="dot"></span>Rapports premium : urbanisme, estimation, banque, foncier (décision rapide).</div>
        <div class="ticker-item"><span class="dot"></span>Clé en main : contrôle qualité, budget, délais — avec méthode.</div>
        <div class="ticker-item"><span class="dot"></span>Nouveaux médias : analyses + études de marché (VIP/VVIP).</div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="header-top">
      <div class="socials" aria-label="Réseaux (désactivés vitrine)">
        <button type="button" onclick="window.open('https://web.facebook.com/yassineattarassi','_blank')">f</button>
        <button type="button" onclick="window.open('https://www.instagram.com/arc_bati_architecture','_blank')">ig</button>
        <button type="button" onclick="soon('LinkedIn — bientôt disponible')">in</button>
        <button type="button" onclick="soon('TikTok @arc_bati_architecture — bientôt')">tt</button>
      </div>

      <div class="chip" onclick="window.location.href='/p1'">Concevoir</div>
      <div class="chip" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20cl%C3%A9%20en%20main.','_blank')">Réaliser clé en main</div>
      <div class="chip" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20foncier.','_blank')">Investir foncier</div>

      <div class="search" title="Recherche">
        <span style="font-weight:900;color:#0f172a;opacity:.75">⌕</span>
        <input id="siteSearch" placeholder="Rechercher : villa, autorisation, terrain, rapport banque, prix…" />
      </div>
    </div>

    <div class="header-bottom">
      <div class="brand">CITURBAREA</div>

      <div class="nav">
        <a class="pill" href="https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20un%20diagnostic%20CITURBAREA." target="_blank" rel="noopener">💬 RDV WhatsApp</a>

        <div class="dropdown">
          <div class="pill">Choisir ma catégorie</div>
          <div class="dropdown-content" role="menu">
            <a href="/p1" onclick="window.location.href='/p1';return false;">
              <strong>Projet personnel / familial</strong>
              <small>Villa, maison, extension : conception + autorisation + dossier conforme.</small>
            </a>
            <a href="#" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20diagnostic%20immobilier.','_blank');return false;">
              <strong>Projet immobilier & équipements</strong>
              <small>Immeuble, commerce, école, clinique : études + autorisations + stratégie.</small>
            </a>
            <a href="#" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20cl%C3%A9%20en%20main.','_blank');return false;">
              <strong>Réalisation clé en main</strong>
              <small>Pilotage chantier : qualité, budget, délais, entreprises, contrôle.</small>
            </a>
            <a href="#" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20analyse%20fonci%C3%A8re.','_blank');return false;">
              <strong>Investisseur & foncier</strong>
              <small>Analyse foncière, valorisation, pré-commercialisation, opérations filtrées.</small>
            </a>
            <a href="#" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20rapport%20expertise.','_blank');return false;">
              <strong>Rapports & expertises</strong>
              <small>Rapports premium : prix, règles, risques, faisabilité, décision.</small>
            </a>
            <a href="#" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20rejoindre%20CITURBAREA.','_blank');return false;">
              <strong>Entreprise / partenaire</strong>
              <small>Rejoindre l’écosystème : dossiers qualifiés, exécution fiable.</small>
            </a>
          </div>
        </div>

        <!-- ✅ PATCH: Médias = scroll interne -->
        <a class="pill" href="#medias" onclick="scrollToId('medias');return false;">Médias</a>

        <!-- Vente abo (service) -->
        <div class="pill vip" onclick="openSubModal('vip')">VIP</div>
        <div class="pill vvip" onclick="openSubModal('vvip')">VVIP</div>

        <a class="pill" href="#" onclick="soon('Panier activé après tunnel de commande');return false;">Panier</a>

        <!-- LANG SWITCHER -->
        <div class="lang-switcher" id="langSwitcher">
          <button class="lang-btn active" onclick="setLang('fr')">FR</button>
          <button class="lang-btn" onclick="setLang('ar')">AR</button>
          <button class="lang-btn" onclick="setLang('en')">EN</button>
        </div>

        <!-- AUTH BUTTONS -->
        <a class="btn-login" href="/login">Se connecter</a>
        <a class="btn-signup" href="/login?signup=1">Créer un compte</a>
      </div>
    </div>
  </div>
</header>

<main class="container hero">

  <div class="hero-grid">
    <section class="card hero-box" aria-label="Présentation de la plateforme">
      <h1>CITURBAREA – Plateforme d’architecture, d’urbanisme & d’investissement</h1>
      <p class="lead">
        CITURBAREA vous aide à <b>concevoir</b>, <b>autoriser</b>, <b>réaliser</b> et <b>valoriser</b> un projet au Maroc,
        avec une logique simple : <b>un résultat clair, un dossier sérieux, une décision sécurisée</b>.
        La plateforme s’adresse à 6 grands profils (portes ci-dessous).
      </p>

      <div class="categories" aria-label="Catégories principales">
        <!-- P1: funnel interne (évite redirection WhatsApp) -->
        <article class="cat" onclick="window.location.href='/p1'">
          <h3>Projet personnel / familial</h3>
          <p>Plan sérieux + dossier conforme pour autorisation + réduction des blocages.</p>
          <div class="deliver">Résultat : plan + dossier autorisable + orientation chantier.</div>
        </article>

        <article class="cat" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20diagnostic%20immobilier.','_blank')">
          <h3>Projet immobilier & équipements</h3>
          <p>Faisabilité, conception, optimisation, règles, stratégie d’autorisation.</p>
          <div class="deliver">Résultat : dossier + scénarios + sécurisation réglementaire.</div>
        </article>

        <article class="cat" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20cl%C3%A9%20en%20main.','_blank')">
          <h3>Réalisation clé en main</h3>
          <p>Sélection entreprises, planning, contrôle qualité, suivi financier.</p>
          <div class="deliver">Résultat : chantier piloté + budget/délais maîtrisés.</div>
        </article>

        <article class="cat" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20analyse%20fonci%C3%A8re.','_blank')">
          <h3>Investisseur & foncier</h3>
          <p>Analyse foncière, potentiel réel, risques, stratégie de valorisation.</p>
          <div class="deliver">Résultat : étude + potentiel + stratégie d’exploitation/vente.</div>
        </article>

        <article class="cat" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20rapport%20expertise.','_blank')">
          <h3>Rapports & expertises</h3>
          <p>Estimation, conformité, risques : document exploitable (banque/décision).</p>
          <div class="deliver">Résultat : rapport premium exploitable.</div>
        </article>

        <article class="cat" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20rejoindre%20CITURBAREA.','_blank')">
          <h3>Entreprise / partenaire</h3>
          <p>Accès à dossiers qualifiés, collaboration structurée, méthode qualité.</p>
          <div class="deliver">Résultat : écosystème + dossiers + collaboration.</div>
        </article>
      </div>

      <div class="form" aria-label="Rejoindre notre écosystème">
        <h3>Être orienté automatiquement</h3>
        <p class="hint">Remplissez 4 champs : orientation vers la bonne porte (60 secondes).</p>

        <div class="form-grid">
          <input id="fName" placeholder="Nom & Prénom">
          <input id="fEmail" placeholder="Email">
          <select id="fProfile">
            <option value="">Vous êtes…</option>
            <option>Particulier / famille</option>
            <option>Porteur de projet (immobilier / commerce / équipement)</option>
            <option>Investisseur</option>
            <option>Propriétaire foncier</option>
            <option>Banque / notaire / bureau</option>
            <option>Entreprise / BET / fournisseur</option>
            <option>Architecte / urbaniste / professionnel</option>
          </select>
          <select id="fNeed">
            <option value="">Votre besoin principal…</option>
            <option>Conception & plan</option>
            <option>Autorisation & dossier réglementaire</option>
            <option>Réalisation clé en main / suivi</option>
            <option>Analyse foncière / investissement</option>
            <option>Rapport banque / expertise prix / urbanisme</option>
            <option>Partenariat / collaboration</option>
          </select>

          <button type="button" onclick="autoOrient()">Être orienté vers la bonne catégorie</button>
        </div>
      </div>
    </section>

    <aside class="panel" aria-label="Colonne droite">
      <div class="card block">
        <div class="block-title">
          <span>Découvrir la plateforme</span>
          <small>Parcours (vitrine)</small>
        </div>
        <div class="mock-video">VIDÉO D’ORIENTATION (upload interne)</div>
        <div style="margin-top:10px; display:flex; gap:10px;">
          <button class="mbtn secondary" type="button" onclick="soon('Démo vidéo sera disponible en lecture interne.')">Voir</button>
          <button class="mbtn primary" type="button" onclick="scrollToId('medias')">Aller aux Médias</button>
        </div>
      </div>

      <div class="card block">
        <div class="block-title">
          <span>Briefs & Dossiers (Premium)</span>
          <small>VIP/VVIP</small>
        </div>
        <div class="mock-video" style="background:linear-gradient(135deg,#111827,#0b3c5d)">
          BRIEFS — DOSSIERS — ÉTUDES
        </div>
        <div style="margin-top:10px; display:flex; gap:10px;">
          <button class="mbtn secondary" type="button" onclick="openSubModal('vip')">VIP</button>
          <button class="mbtn primary" type="button" onclick="openSubModal('vvip')">VVIP</button>
        </div>
      </div>
    </aside>
  </div>

  <!-- OPPORTUNITIES (conservé vitrine) -->
  <section class="card scroll-section" aria-label="Dernières opportunités d’investissement">
    <div class="scroll-card">
      <div class="scroll-head">
        <div>
          <div class="scroll-title">Dernières opportunités d’investissement</div>
          <p class="scroll-sub">Vitrine : les contenus finaux seront publiés dans l’environnement Médias.</p>
        </div>
      </div>

      <div class="scroller" id="oppScroller">
        <div class="tile" onclick="soon('Détail opportunité: visible dans Médias / VIP selon type.');">
          <div class="thumb">
            <div class="ph"></div>
            <span class="badge">Terrain</span>
            <span class="play">VIDÉO</span>
          </div>
          <div class="tile-body">
            <p class="tile-title">Terrain – potentiel R+4</p>
            <p class="tile-meta">Analyse + risques + stratégie (pré-étude).</p>
          </div>
        </div>

        <div class="tile" onclick="soon('Détail opportunité: visible dans Médias / VIP selon type.');">
          <div class="thumb">
            <div class="ph"></div>
            <span class="badge">Pré-commercialisation</span>
            <span class="play">VIDÉO</span>
          </div>
          <div class="tile-body">
            <p class="tile-title">Produit – scénario rentabilité</p>
            <p class="tile-meta">Dossier + vérification + plan de décision.</p>
          </div>
        </div>

        <div class="tile" onclick="soon('Bientôt.');">
          <div class="thumb">
            <div class="ph"></div>
            <span class="badge">Opération</span>
          </div>
          <div class="tile-body">
            <p class="tile-title">Opération urbaine</p>
            <p class="tile-meta">Faisabilité + optimisation + autorisation.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ✅ MEDIAS SECTION (V2) -->
  
`;
const POST_HTML = `


</main>

<footer>
  <div class="container">
    <h3>CITURBAREA — Plateforme</h3>
    <ul>
      <li>Architecture · Urbanisme · Investissement</li>
      <li>Portes : Familial · Immobilier · Clé en main · Invest · Rapports · Pro</li>
      <li>Médias premium : briefs, études, dossiers (VIP/VVIP)</li>
    </ul>
  </div>
</footer>

<!-- SOON BOX global -->
<div id="soonBox" style="
display:none;
position:fixed;
top:16px;
left:50%;
transform:translateX(-50%);
background:#0b3c5d;
color:#fff;
padding:12px 14px;
border-radius:12px;
z-index:9999;
box-shadow:0 10px 20px rgba(0,0,0,.15);
font-family:Arial,sans-serif;
font-size:14px;">
</div>

<!-- MODAL: abonnement -->
<div class="modal" id="subModal" onclick="modalBackdropClose(event,'subModal')">
  <div class="modal-card" role="dialog" aria-label="Abonnements">
    <div class="modal-head">
      <span id="subTitle">Abonnement</span>
      <button class="modal-close" onclick="closeModal('subModal')">Retour</button>
    </div>
    <div class="modal-body">
      <div style="font-weight:1000; color:#0f172a;">Tu n’achètes pas un blocage. Tu achètes :</div>
      <ul style="margin:10px 0 0; color:#475569; font-weight:800; line-height:1.6;">
        <li>Accès à des études / briefs / dossiers</li>
        <li>Exploration de profils “grades” avancée (sans contact direct)</li>
        <li>Demandes d’échange & RDV via plateforme</li>
      </ul>

      <div class="modal-actions">
        <button class="mbtn primary" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20m%27abonner.','_blank');closeModal('subModal')">Continuer</button>
        <button class="mbtn secondary" onclick="closeModal('subModal')">Plus tard</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: porte-first (demander échange) -->
<div class="modal" id="leadModal" onclick="modalBackdropClose(event,'leadModal')">
  <div class="modal-card" role="dialog" aria-label="Demander un échange">
    <div class="modal-head">
      <span>Demander un échange professionnel (via plateforme)</span>
      <button class="modal-close" onclick="closeModal('leadModal')">Retour</button>
    </div>
    <div class="modal-body">
      <div style="font-weight:1000; color:#0b2d97;">
        Pour garantir la qualité & protéger les parties, l’échange passe par la plateforme (porte-first).
      </div>

      <div class="modal-grid">
        <input id="lmEmail" placeholder="Email (obligatoire)">
        <select id="lmDoor">
          <option value="">Choisir une porte…</option>
          <option value="personal">P1 — Projet personnel / familial</option>
          <option value="immo">P2 — Immobilier & équipements</option>
          <option value="cle">P3 — Clé en main</option>
          <option value="invest">P4 — Investisseur & foncier</option>
          <option value="rapports">P5 — Rapports & expertises</option>
          <option value="pro">P6 — Pro / partenaires</option>
        </select>
      </div>

      <textarea id="lmMsg" placeholder="Votre demande (objectif, contexte, ville, budget, délai)"></textarea>

      <div class="modal-actions">
        <button class="mbtn primary" onclick="submitLead()">Envoyer via plateforme</button>
        <button class="mbtn secondary" onclick="closeModal('leadModal')">Annuler</button>
      </div>
    </div>
  </div>
</div>




<!-- MODAL: Soumettre article -->
<div class="modal" id="submitModal" onclick="modalBackdropClose(event,'submitModal')">
  <div class="modal-card" style="max-height:90vh;overflow-y:auto;">
    <div class="modal-head">
      <span>&#9998; Soumettre un article &agrave; CITURBAREA</span>
      <button class="modal-close" onclick="closeModal('submitModal')">Retour</button>
    </div>
    <div class="modal-body">
      <p style="color:#475569;font-size:13.5px;line-height:1.6;margin:0 0 14px;">
        Votre article sera examin&eacute; par l&rsquo;&eacute;quipe CITURBAREA avant publication.
        Les contributions de qualit&eacute; &mdash; analyse, retour terrain, expertise &mdash; sont les bienvenues.
      </p>
      <div class="modal-grid">
        <input id="smName" placeholder="Nom &amp; Pr&eacute;nom *">
        <input id="smEmail" placeholder="Email *">
        <input id="smProfil" placeholder="Votre profil (ex : Architecte, Promoteur, MRE&hellip;)">
        <select id="smLang">
          <option value="">Langue de l&rsquo;article&hellip;</option>
          <option value="fr">Fran&ccedil;ais</option>
          <option value="ar">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</option>
          <option value="fr+ar">Bilingue</option>
        </select>
        <select id="smDoor">
          <option value="">Th&egrave;me principal&hellip;</option>
          <option value="invest">Investissement &amp; Foncier</option>
          <option value="personal">Projet r&eacute;sidentiel</option>
          <option value="cle">Construction &amp; Chantier</option>
          <option value="rapports">Rapports &amp; Expertise</option>
          <option value="immo">Immobilier &amp; &Eacute;quipements</option>
          <option value="pro">Partenariat &amp; Pro</option>
        </select>
        <input id="smBadge" placeholder="Cat&eacute;gorie (ex : Analyse, Guide, Brief&hellip;)">
      </div>
      <input id="smTitle" placeholder="Titre de l&rsquo;article *" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;box-sizing:border-box;">
      <textarea id="smExcerpt" placeholder="R&eacute;sum&eacute; (2-3 phrases) *" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;min-height:80px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
      <textarea id="smContent" placeholder="Contenu complet de l&rsquo;article *" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;min-height:200px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
      <div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:12px;border:1px solid #e7eefc;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:700;color:#0f172a;">
          <input type="checkbox" id="smPremium" style="width:16px;height:16px;cursor:pointer;">
          Contenu Premium (VIP/VVIP uniquement &mdash; acc&egrave;s restreint)
        </label>
      </div>
      <div class="modal-actions" style="margin-top:14px;">
        <button class="mbtn primary" onclick="submitArticle()" style="flex:1;">Envoyer pour mod&eacute;ration</button>
        <button class="mbtn secondary" onclick="closeModal('submitModal')">Annuler</button>
      </div>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
        D&eacute;lai de mod&eacute;ration : 24 &agrave; 48h &middot; Publication sous r&eacute;serve de validation &eacute;ditoriale CITURBAREA
      </p>
    </div>
  </div>
</div>


`;

function ensureGlobal(name: string, fn: (...args: any[]) => any) {
  // @ts-expect-error attach to window
  if (!window[name]) window[name] = fn;
}

export default function LandingV4() {
  useEffect(() => {
    // Minimal global helpers used by onclick="..." in the injected HTML.
    ensureGlobal("openModal", (id: string) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "flex";
    });
    ensureGlobal("closeModal", (id: string) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    ensureGlobal("openSubModal", (tier?: string) => {
      const el = document.getElementById("subModal");
      if (el) el.style.display = "flex";
      const input = document.getElementById("sub_plan") as HTMLInputElement | null;
      if (input && tier) input.value = tier;
    });

    // Dead buttons / anchors safety
    ensureGlobal("soon", () => {
      alert("Bientôt disponible. Cette section est en cours de finalisation.");
    });
    ensureGlobal("scrollToId", (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    ensureGlobal("modalBackdropClose", (evt: any, id: string) => {
      if (!evt || evt.target?.id !== id) return;
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    ensureGlobal("submitLead", () => {
      const name = (document.getElementById("lead_name") as HTMLInputElement | null)?.value?.trim() || "";
      const email = (document.getElementById("lead_email") as HTMLInputElement | null)?.value?.trim() || "";
      const phone = (document.getElementById("lead_phone") as HTMLInputElement | null)?.value?.trim() || "";
      const profile = (document.getElementById("lead_profile") as HTMLSelectElement | null)?.value || "";
      if (!name || !email || !phone || !profile) {
        alert("Merci de remplir Nom, Email, Téléphone et Profil.");
        return;
      }
      // Storage-first: save locally, no SaaS
      try {
        localStorage.setItem("citurbarea:lead", JSON.stringify({ name, email, phone, profile, ts: Date.now() }));
      } catch {}
      alert("✅ Merci. Nous vous recontactons rapidement.");
      const el = document.getElementById("leadModal");
      if (el) el.style.display = "none";
    });
    ensureGlobal("submitArticle", () => {
      const q = (document.getElementById("searchInput") as HTMLInputElement | null)?.value?.trim() || "";
      if (!q) {
        alert("Tapez une question ou un mot-clé.");
        return;
      }
      alert("Recherche en cours d'intégration (v1). Votre requête a été enregistrée.");
      try {
        localStorage.setItem("citurbarea:media:query", JSON.stringify({ q, ts: Date.now() }));
      } catch {}
    });


    ensureGlobal("autoOrient", (targetId?: string) => {
      const el = document.getElementById(targetId || "categories");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Lang switcher
    const I18N: Record<string, Record<string, string>> = {
      fr: {
        login: "Se connecter", signup: "Créer un compte",
        media_title: "Nos médias — Journal premium",
        media_sub: "Articles vérifiés — immobilier, urbanisme, construction. Accès public + VIP/VVIP.",
        goto_media: "Aller aux médias", see_all: "Voir tous les articles",
      },
      ar: {
        login: "تسجيل دخول", signup: "إنشاء حساب",
        media_title: "مقالاتنا — المجلة المتخصصة",
        media_sub: "مقالات محققة في العقار والتعمير والبناء. وصول مجاني + VIP/VVIP.",
        goto_media: "ذهاب للمقالات", see_all: "عرض جميع المقالات",
      },
      en: {
        login: "Sign in", signup: "Create account",
        media_title: "Our Media — Premium Journal",
        media_sub: "Verified content on Moroccan real estate, urban planning & construction.",
        goto_media: "Go to Media", see_all: "See all articles",
      },
    };

    function setLang(lang: string) {
      document.querySelectorAll(".lang-btn").forEach((el: any) => {
        el.classList.toggle("active", el.textContent.trim().toLowerCase() === lang);
      });
      document.body.dir = lang === "ar" ? "rtl" : "ltr";
      const t = (I18N as any)[lang] || I18N.fr;
      const byId = (id: string) => document.getElementById(id);
      const ql = (sel: string) => document.querySelector(sel) as HTMLElement | null;
      if (ql(".btn-login")) ql(".btn-login")!.textContent = t.login;
      if (ql(".btn-signup")) ql(".btn-signup")!.textContent = t.signup;
      if (byId("media-title-txt")) byId("media-title-txt")!.textContent = t.media_title;
      if (byId("media-sub-txt")) byId("media-sub-txt")!.textContent = t.media_sub;
      if (byId("goto-media-btn")) byId("goto-media-btn")!.textContent = t.goto_media;
      if (byId("see-all-btn")) byId("see-all-btn")!.textContent = t.see_all;
    }
    (window as any).setLang = setLang;

    // Search redirects to /media (frontend-only).
    ensureGlobal("runSearch", () => {
      const input = document.getElementById("searchInput") as HTMLInputElement | null;
      const q = input?.value?.trim() || "";
      const url = q ? `/media?q=${encodeURIComponent(q)}` : "/media";
      window.location.href = url;
    });
  }, []);

  const articles = listPublished().slice(0, 6);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div dangerouslySetInnerHTML={{ __html: PRE_HTML }} />

      <section id="medias" style={{ scrollMarginTop: 140, padding: "32px 0 48px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <h2 id="media-title-txt" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "var(--blue2)" }}>
                Nos médias — Journal premium
              </h2>
              <p id="media-sub-txt" style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                Articles validés par l’équipe CITURBAREA. Accès public + contenus premium (VIP/VVIP).
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {["Tous", "FR", "AR", "Investissement", "Chantier", "Rapports", "Premium"].map((c, i) => (
                  <span key={c} style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", background: i === 0 ? "var(--blue)" : "#e6ebf5", color: i === 0 ? "#fff" : "var(--blue2)", border: i === 0 ? "1px solid var(--blue)" : "1px solid #d7def0" }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
              <button style={{ padding: "9px 16px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }} id="goto-media-btn" onClick={() => (window.location.href = "/media")}>
                Aller aux médias
              </button>
            </div>
          </div>
          {/* Article grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {articles.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14, gridColumn: "1/-1" }}>Aucun article publié pour le moment.</div>
            ) : (
              articles.map((a) => <ArticleCard key={a.id} article={a} mode="landing" />)
            )}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid #d7def0", background: "#e6ebf5", color: "var(--blue2)", fontWeight: 700, fontSize: 13, cursor: "pointer" }} id="see-all-btn" onClick={() => (window.location.href = "/media")}>
              Voir tous les articles
            </button>
          </div>
        </div>
      </section>

      <div dangerouslySetInnerHTML={{ __html: POST_HTML }} />
    </div>
  );
}
