import React, { useEffect, useMemo, useState } from "react";

import { listPublished } from "../../features/media/articles/store";
import type { Article } from "../../features/media/articles/types";
import { ArticleCard } from "../../features/media/components/ArticleCard";
import { cerclesApi } from "../../features/cercles/api";
import { cerclePostToArticle } from "./cerclePostToArticle";
import { useT, useLang } from "../../i18n/i18n";
import { BottomNav } from "../../components/bottom-nav/BottomNav";
import {
  captureLead,
  currentUtm,
  leadKey,
  sanitizeWizard,
  telephoneEnvoyable,
  type CaptureBody,
} from "../../features/lead-funnel/leadBridge";
import { lienTel, lienWhatsApp } from "../../config/contact";

// Landing keeps the validated HTML/CSS identity, but renders the Articles preview in React.
// Legacy inline JS media feed is removed to avoid runtime errors and to make content maintainable.

type T = (key: string, vars?: Record<string, string | number>) => string;

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
  .nav{ display:flex; gap:12px; margin-left:auto; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
  /* Auth buttons : toujours visibles, même si la nav wrap */
  .btn-login, .btn-signup { order: 100; }
  .lang-switcher { order: 99; }
  /* Sur fenêtres étroites (<1400px) : cacher les items secondaires pour garder Connexion + langues visibles */
  @media (max-width: 1400px) {
    .pill.vip, .pill.vvip { display:none; }
  }
  @media (max-width: 1200px) {
    .nav .pill { font-size: 11px; padding: 5px 10px; }
  }

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
    width:100%;
    max-width:100%;
    min-width:0;
  }
  .form h3{ margin:0 0 10px; font-size:15px; font-weight:900; color:var(--blue2); overflow-wrap:anywhere; }
  .hint{ margin:0 0 14px; color:#475569; font-size:13.5px; line-height:1.5; }
  .form-grid{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; margin:0; }
  .form-grid > *{ min-width:0; }
  .form .span2{ grid-column:1 / -1; }
  .form input, .form select{
    width:100%;
    max-width:100%;
    min-width:0;
    min-height:46px;
    padding:12px;
    border-radius:12px;
    border:1px solid #cbd5e1;
    background:#fff;
    font-size:16px;
    outline:none;
    text-overflow:ellipsis;
  }
  .form input:focus, .form select:focus{ border-color:var(--blue); box-shadow:0 0 0 3px rgba(29,78,216,.15); }
  .form button{
    grid-column:1 / -1;
    font-size:16px;
    min-height:48px;
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

  .hero-grid > *{ min-width:0; }
  [hidden]{ display:none !important; }

  /* Accès direct (hero) : WhatsApp / appel / rappel */
  .quick-contact{ display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }
  .qc-btn{
    flex:1 1 140px;
    min-height:46px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:11px 14px;
    border-radius:12px;
    border:1px solid transparent;
    font-size:15px;
    font-weight:900;
    cursor:pointer;
    text-align:center;
    font-family:inherit;
  }
  .qc-wa{ background:#16a34a; color:#fff; }
  .qc-wa:hover{ background:#15803d; }
  .qc-call{ background:#fff; color:var(--blue2); border-color:#cbd5e1; }
  .qc-call:hover{ background:#f1f5f9; }
  .qc-cb{ background:linear-gradient(90deg,var(--blue),var(--blue2)); color:#fff; }
  .qc-cb:hover{ filter:brightness(.95); }

  /* Formulaires de lead : erreurs, confirmation, mention légale, pot de miel */
  .form-err{ margin:0; color:#be123c; font-size:14px; font-weight:700; }
  .form-legal{ margin:0; color:#64748b; font-size:11.5px; line-height:1.45; text-align:center; }
  .hp-field{ position:absolute !important; left:-10000px !important; width:1px !important; height:1px !important; min-height:0 !important; padding:0 !important; opacity:0 !important; }
  .lead-done{
    padding:16px;
    border-radius:14px;
    border:1px solid #a7f3d0;
    background:#ecfdf5;
    color:#064e3b;
    display:flex;
    flex-direction:column;
    gap:10px;
  }
  .lead-done strong{ font-size:16px; line-height:1.4; }
  .lead-done p{ margin:0; font-size:13px; line-height:1.5; }
  .lead-done .qc-row{ display:flex; flex-wrap:wrap; gap:10px; }
  .cat.cat-suggested{ outline:3px solid var(--blue); outline-offset:2px; background:#eef4ff; }

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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap:12px;
    margin-top:10px;
  }
  .modal-body input, .modal-body select, .modal-body textarea{
    width:100%;
    padding:12px;
    border-radius:12px;
    border:1px solid #cbd5e1;
    outline:none;
    font-size:16px;
    background:#fff;
    font-family:inherit;
  }
  .modal-body textarea{ min-height:110px; resize:vertical; }
  .modal-card.lead-card{ width:min(560px, 100%); max-height:92vh; overflow-y:auto; }
  #lmForm{ display:flex; flex-direction:column; gap:12px; margin-top:12px; }
  #lmForm .modal-grid{ margin-top:0; }
  #lmForm .modal-actions{ margin-top:0; }
  #lmForm .mbtn{ font-size:16px; min-height:46px; }
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
    .modal-grid{ grid-template-columns:minmax(0, 1fr); }
  }

  @media(max-width:768px){
    .hero-grid { grid-template-columns: 1fr; gap: 16px; }
    .form-grid { grid-template-columns: minmax(0, 1fr); }
    .modal { padding: 10px; }
    /* Header surchargé sur mobile : on ne garde que les pills essentiels
     * (lang-switcher + 2 boutons auth) ; les pills secondaires (WhatsApp,
     * Choose my category, Media, Cart, etc.) sont masqués pour éviter
     * débordement et empilement. */
    .nav .pill:not(.btn-login):not(.btn-signup) { display: none; }
    .nav .lang-switcher { display: flex; }
    .nav { gap: 6px; }
    .header-top, .header-bottom { padding: 8px 0; }
    .search { display: none; }
  }
  @media(max-width:480px){
    h1 { font-size: 24px; line-height: 1.2; overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
    .hero-box { padding: 18px; }
    .container { padding: 0 12px; }
    /* Titres en general */
    h2, h3 { overflow-wrap: anywhere; word-break: break-word; }
    .cat h3 { font-size: 14px; }
  }
`;

// HTML-attribute escape for placeholders / aria-labels (defense against single quotes).
function attr(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Inner-text escape (the strings come from JSON we control; this is just defense in depth).
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPreHtml(t: T, lang: string): string {
  const waHref = lienWhatsApp(t("landing.contact.wa_message"));
  return `


<header>
  <div class="ticker" aria-label="${attr(t("landing.ticker.aria"))}">
    <div class="container" style="overflow:hidden">
      <div class="ticker-inner" id="tickerInner">
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.1"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.2"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.3"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.4"))}</div>

        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.1"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.2"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.3"))}</div>
        <div class="ticker-item"><span class="dot"></span>${esc(t("landing.ticker.4"))}</div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="header-top">
      <div class="socials" aria-label="${attr(t("landing.socials.aria"))}">
        <button type="button" onclick="window.open('https://web.facebook.com/yassineattarassi','_blank')">f</button>
        <button type="button" onclick="window.open('https://www.instagram.com/arc_bati_architecture','_blank')">ig</button>
      </div>

      <div class="chip" onclick="window.location.href='/p1'">${esc(t("landing.chip.design"))}</div>
      <div class="chip" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20cl%C3%A9%20en%20main.','_blank')">${esc(t("landing.chip.turnkey"))}</div>
      <div class="chip" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20foncier.','_blank')">${esc(t("landing.chip.invest"))}</div>

      <div class="search" title="${attr(t("landing.search.title"))}">
        <span style="font-weight:900;color:#0f172a;opacity:.75">⌕</span>
        <input id="siteSearch" placeholder="${attr(t("landing.search.placeholder"))}" />
      </div>
    </div>

    <div class="header-bottom">
      <div class="brand">CITURBAREA</div>

      <div class="nav">
        <a class="pill" href="https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20un%20diagnostic%20CITURBAREA." target="_blank" rel="noopener">${esc(t("landing.nav.whatsapp_rdv"))}</a>

        <div class="dropdown">
          <div class="pill">${esc(t("landing.nav.choose_category"))}</div>
          <div class="dropdown-content" role="menu">
            <a href="/p1" onclick="window.location.href='/p1';return false;">
              <strong>${esc(t("landing.dropdown.p1.title"))}</strong>
              <small>${esc(t("landing.dropdown.p1.desc"))}</small>
            </a>
            <a href="/p2" onclick="window.location.href='/p2';return false;">
              <strong>${esc(t("landing.dropdown.p2.title"))}</strong>
              <small>${esc(t("landing.dropdown.p2.desc"))}</small>
            </a>
            <a href="/p3" onclick="window.location.href='/p3';return false;">
              <strong>${esc(t("landing.dropdown.p3.title"))}</strong>
              <small>${esc(t("landing.dropdown.p3.desc"))}</small>
            </a>
            <a href="/p4" onclick="window.location.href='/p4';return false;">
              <strong>${esc(t("landing.dropdown.p4.title"))}</strong>
              <small>${esc(t("landing.dropdown.p4.desc"))}</small>
            </a>
            <a href="/p5" onclick="window.location.href='/p5';return false;">
              <strong>${esc(t("landing.dropdown.p5.title"))}</strong>
              <small>${esc(t("landing.dropdown.p5.desc"))}</small>
            </a>
            <a href="/p6" onclick="window.location.href='/p6';return false;">
              <strong>${esc(t("landing.dropdown.p6.title"))}</strong>
              <small>${esc(t("landing.dropdown.p6.desc"))}</small>
            </a>
          </div>
        </div>

        <!-- ✅ PATCH: Médias = scroll interne -->
        <a class="pill" href="#medias" onclick="scrollToId('medias');return false;">${esc(t("landing.nav.media"))}</a>

        <!-- Vente abo (service) -->
        <div class="pill vip" onclick="openSubModal('vip')">VIP</div>
        <div class="pill vvip" onclick="openSubModal('vvip')">VVIP</div>

        <!-- LANG SWITCHER -->
        <div class="lang-switcher" id="langSwitcher">
          <button class="lang-btn${lang === "fr" ? " active" : ""}" onclick="setLang('fr')">FR</button>
          <button class="lang-btn${lang === "ar" ? " active" : ""}" onclick="setLang('ar')">AR</button>
          <button class="lang-btn${lang === "en" ? " active" : ""}" onclick="setLang('en')">EN</button>
        </div>

        <!-- AUTH BUTTONS -->
        <a class="btn-login" href="/login">${esc(t("landing.nav.login"))}</a>
        <a class="btn-signup" href="/creer-compte">${esc(t("landing.nav.signup"))}</a>
      </div>
    </div>
  </div>
</header>

<main class="container hero">

  <div class="hero-grid">
    <section class="card hero-box" aria-label="${attr(t("landing.hero.aria"))}">
      <h1>${esc(t("landing.hero.h1"))}</h1>
      <p class="lead">
        ${t("landing.hero.lead")}
      </p>

      <!-- Accès direct : visible dès le hero, y compris en mobile -->
      <div class="quick-contact" aria-label="${attr(t("landing.contact.aria"))}">
        <a class="qc-btn qc-wa" href="${attr(waHref)}" target="_blank" rel="noopener">${esc(t("landing.contact.whatsapp"))}</a>
        <a class="qc-btn qc-call" href="${attr(lienTel)}">${esc(t("landing.contact.call"))}</a>
        <button type="button" class="qc-btn qc-cb" onclick="openLeadModal()">${esc(t("landing.contact.callback"))}</button>
      </div>

      <div class="categories" id="categories" aria-label="${attr(t("landing.categories.aria"))}">
        <!-- P1: funnel interne (évite redirection WhatsApp) -->
        <article class="cat" id="cat-P1" onclick="window.location.href='/p1'">
          <h3>${esc(t("landing.cat.p1.title"))}</h3>
          <p>${esc(t("landing.cat.p1.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p1.deliver"))}</div>
        </article>

        <article class="cat" id="cat-P2" onclick="window.location.href='/p2'">
          <h3>${esc(t("landing.cat.p2.title"))}</h3>
          <p>${esc(t("landing.cat.p2.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p2.deliver"))}</div>
        </article>

        <article class="cat" id="cat-P3" onclick="window.location.href='/p3'">
          <h3>${esc(t("landing.cat.p3.title"))}</h3>
          <p>${esc(t("landing.cat.p3.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p3.deliver"))}</div>
        </article>

        <article class="cat" id="cat-P4" onclick="window.location.href='/p4'">
          <h3>${esc(t("landing.cat.p4.title"))}</h3>
          <p>${esc(t("landing.cat.p4.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p4.deliver"))}</div>
        </article>

        <article class="cat" id="cat-P5" onclick="window.location.href='/p5'">
          <h3>${esc(t("landing.cat.p5.title"))}</h3>
          <p>${esc(t("landing.cat.p5.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p5.deliver"))}</div>
        </article>

        <article class="cat" id="cat-P6" onclick="window.location.href='/p6'">
          <h3>${esc(t("landing.cat.p6.title"))}</h3>
          <p>${esc(t("landing.cat.p6.desc"))}</p>
          <div class="deliver">${esc(t("landing.cat.p6.deliver"))}</div>
        </article>
      </div>

      <div class="form" aria-label="${attr(t("landing.form.aria"))}">
        <h3>${esc(t("landing.form.title"))}</h3>
        <p class="hint">${esc(t("landing.form.hint_phone"))}</p>

        <form class="form-grid" id="fForm" onsubmit="autoOrient(event)" novalidate>
          <input id="fName" name="name" autocomplete="name" aria-label="${attr(t("landing.form.name_placeholder"))}" placeholder="${attr(t("landing.form.name_placeholder"))}">
          <input id="fPhone" name="tel" type="tel" inputmode="tel" autocomplete="tel" aria-label="${attr(t("landing.form.phone_placeholder"))}" placeholder="${attr(t("landing.form.phone_placeholder"))}">
          <input id="fEmail" name="email" type="email" inputmode="email" autocomplete="email" aria-label="${attr(t("landing.form.email_optional"))}" placeholder="${attr(t("landing.form.email_optional"))}" class="span2">
          <select id="fProfile" aria-label="${attr(t("landing.form.profile_placeholder"))}">
            <option value="">${esc(t("landing.form.profile_placeholder"))}</option>
            <option value="particulier">${esc(t("landing.form.profile.particulier"))}</option>
            <option value="porteur">${esc(t("landing.form.profile.porteur"))}</option>
            <option value="invest">${esc(t("landing.form.profile.invest"))}</option>
            <option value="foncier">${esc(t("landing.form.profile.foncier"))}</option>
            <option value="banque">${esc(t("landing.form.profile.banque"))}</option>
            <option value="entreprise">${esc(t("landing.form.profile.entreprise"))}</option>
            <option value="archi">${esc(t("landing.form.profile.archi"))}</option>
          </select>
          <select id="fNeed" aria-label="${attr(t("landing.form.need_placeholder"))}">
            <option value="">${esc(t("landing.form.need_placeholder"))}</option>
            <option value="design">${esc(t("landing.form.need.design"))}</option>
            <option value="autorisation">${esc(t("landing.form.need.autorisation"))}</option>
            <option value="realisation">${esc(t("landing.form.need.realisation"))}</option>
            <option value="foncier">${esc(t("landing.form.need.foncier"))}</option>
            <option value="report">${esc(t("landing.form.need.report"))}</option>
            <option value="partenariat">${esc(t("landing.form.need.partenariat"))}</option>
          </select>
          <input id="fWebsite" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">

          <p id="fErr" class="form-err span2" role="alert" hidden></p>
          <button type="submit" id="fSend">${esc(t("landing.form.submit"))}</button>
          <p class="form-legal span2">${esc(t("lead.legal"))}</p>
        </form>

        <div id="fDone" class="lead-done" tabindex="-1" role="status" aria-live="polite" hidden>
          <strong>${esc(t("landing.lead.done_title"))}</strong>
          <p id="fQueued" hidden>${esc(t("lead.success.queued"))}</p>
          <div class="qc-row">
            <a id="fNext" class="qc-btn qc-cb" href="#categories" hidden></a>
            <a class="qc-btn qc-wa" href="${attr(waHref)}" target="_blank" rel="noopener">${esc(t("landing.contact.whatsapp"))}</a>
          </div>
        </div>
      </div>
    </section>

    <aside class="panel" aria-label="${attr(t("landing.aside.aria"))}">
      <!-- Bloc « Découvrir » (vidéo d'orientation) et vignettes d'opportunités retirés :
           pas encore de contenu réel à montrer. -->
      <div class="card block">
        <div class="block-title">
          <span>${esc(t("landing.aside.briefs.title"))}</span>
          <small>${esc(t("landing.aside.briefs.sub"))}</small>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="mbtn secondary" type="button" onclick="openSubModal('vip')">${esc(t("landing.aside.briefs.vip"))}</button>
          <button class="mbtn primary" type="button" onclick="openSubModal('vvip')">${esc(t("landing.aside.briefs.vvip"))}</button>
        </div>
      </div>
    </aside>
  </div>

  <!-- ✅ MEDIAS SECTION (V2) -->

`;
}

function buildPostHtml(t: T): string {
  const waHref = lienWhatsApp(t("landing.contact.wa_message"));
  return `


</main>

<footer>
  <div class="container">
    <h3>${esc(t("landing.footer.title"))}</h3>
    <ul>
      <li>${esc(t("landing.footer.li1"))}</li>
      <li>${esc(t("landing.footer.li2"))}</li>
      <li>${esc(t("landing.footer.li3"))}</li>
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
  <div class="modal-card" role="dialog" aria-label="${attr(t("landing.sub_modal.aria"))}">
    <div class="modal-head">
      <span id="subTitle">${esc(t("landing.sub_modal.title"))}</span>
      <button class="modal-close" onclick="closeModal('subModal')">${esc(t("landing.sub_modal.back"))}</button>
    </div>
    <div class="modal-body">
      <div style="font-weight:1000; color:#0f172a;">${esc(t("landing.sub_modal.intro"))}</div>
      <ul style="margin:10px 0 0; color:#475569; font-weight:800; line-height:1.6;">
        <li>${esc(t("landing.sub_modal.li1"))}</li>
        <li>${esc(t("landing.sub_modal.li2"))}</li>
        <li>${esc(t("landing.sub_modal.li3"))}</li>
      </ul>

      <div class="modal-actions">
        <button class="mbtn primary" onclick="window.open('https://wa.me/212700127892?text=Salam%20Yassine%2C%20je%20veux%20m%27abonner.','_blank');closeModal('subModal')">${esc(t("landing.sub_modal.continue"))}</button>
        <button class="mbtn secondary" onclick="closeModal('subModal')">${esc(t("landing.sub_modal.later"))}</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: être rappelé (ouverte par le bouton « Être rappelé » du hero) -->
<div class="modal" id="leadModal" onclick="modalBackdropClose(event,'leadModal')">
  <div class="modal-card lead-card" role="dialog" aria-modal="true" aria-labelledby="lmTitle">
    <div class="modal-head">
      <span id="lmTitle">${esc(t("landing.lead_modal.callback_title"))}</span>
      <button type="button" class="modal-close" onclick="closeModal('leadModal')">${esc(t("landing.sub_modal.back"))}</button>
    </div>
    <div class="modal-body">
      <div style="font-weight:800; color:#334155; line-height:1.5;">
        ${esc(t("landing.lead_modal.callback_intro"))}
      </div>

      <form id="lmForm" onsubmit="submitLead(event)" novalidate>
        <div class="modal-grid">
          <input id="lmName" name="name" autocomplete="name" aria-label="${attr(t("landing.form.name_placeholder"))}" placeholder="${attr(t("landing.form.name_placeholder"))}">
          <input id="lmPhone" name="tel" type="tel" inputmode="tel" autocomplete="tel" aria-label="${attr(t("landing.form.phone_placeholder"))}" placeholder="${attr(t("landing.form.phone_placeholder"))}">
          <input id="lmEmail" name="email" type="email" inputmode="email" autocomplete="email" aria-label="${attr(t("landing.form.email_optional"))}" placeholder="${attr(t("landing.form.email_optional"))}">
          <select id="lmDoor" aria-label="${attr(t("landing.lead_modal.door_placeholder"))}">
            <option value="">${esc(t("landing.lead_modal.door_placeholder"))}</option>
            <option value="P1">${esc(t("landing.lead_modal.door.p1"))}</option>
            <option value="P2">${esc(t("landing.lead_modal.door.p2"))}</option>
            <option value="P3">${esc(t("landing.lead_modal.door.p3"))}</option>
            <option value="P4">${esc(t("landing.lead_modal.door.p4"))}</option>
            <option value="P5">${esc(t("landing.lead_modal.door.p5"))}</option>
            <option value="P6">${esc(t("landing.lead_modal.door.p6"))}</option>
          </select>
        </div>

        <textarea id="lmMsg" name="message" aria-label="${attr(t("landing.lead_modal.message"))}" placeholder="${attr(t("landing.lead_modal.message"))}"></textarea>
        <input id="lmWebsite" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">

        <p id="lmErr" class="form-err" role="alert" hidden></p>
        <div class="modal-actions">
          <button type="submit" id="lmSend" class="mbtn primary" style="flex:1;">${esc(t("lead.btn.send"))}</button>
          <button type="button" class="mbtn secondary" onclick="closeModal('leadModal')">${esc(t("landing.lead_modal.cancel"))}</button>
        </div>
        <p class="form-legal">${esc(t("lead.legal"))}</p>
      </form>

      <div id="lmDone" class="lead-done" tabindex="-1" role="status" aria-live="polite" hidden>
        <strong>${esc(t("landing.lead.done_title"))}</strong>
        <p id="lmQueued" hidden>${esc(t("lead.success.queued"))}</p>
        <div class="qc-row">
          <a class="qc-btn qc-wa" href="${attr(waHref)}" target="_blank" rel="noopener">${esc(t("landing.contact.whatsapp"))}</a>
        </div>
      </div>
    </div>
  </div>
</div>




<!-- MODAL: Soumettre article -->
<div class="modal" id="submitModal" onclick="modalBackdropClose(event,'submitModal')">
  <div class="modal-card" style="max-height:90vh;overflow-y:auto;">
    <div class="modal-head">
      <span>${esc(t("landing.submit_modal.title"))}</span>
      <button class="modal-close" onclick="closeModal('submitModal')">${esc(t("landing.submit_modal.back"))}</button>
    </div>
    <div class="modal-body">
      <p style="color:#475569;font-size:13.5px;line-height:1.6;margin:0 0 14px;">
        ${esc(t("landing.submit_modal.intro"))}
      </p>
      <div class="modal-grid">
        <input id="smName" placeholder="${attr(t("landing.submit_modal.name"))}">
        <input id="smEmail" placeholder="${attr(t("landing.submit_modal.email"))}">
        <input id="smProfil" placeholder="${attr(t("landing.submit_modal.profil"))}">
        <select id="smLang">
          <option value="">${esc(t("landing.submit_modal.lang_placeholder"))}</option>
          <option value="fr">${esc(t("landing.submit_modal.lang.fr"))}</option>
          <option value="ar">${esc(t("landing.submit_modal.lang.ar"))}</option>
          <option value="fr+ar">${esc(t("landing.submit_modal.lang.bi"))}</option>
        </select>
        <select id="smDoor">
          <option value="">${esc(t("landing.submit_modal.theme_placeholder"))}</option>
          <option value="invest">${esc(t("landing.submit_modal.theme.invest"))}</option>
          <option value="personal">${esc(t("landing.submit_modal.theme.personal"))}</option>
          <option value="cle">${esc(t("landing.submit_modal.theme.cle"))}</option>
          <option value="rapports">${esc(t("landing.submit_modal.theme.rapports"))}</option>
          <option value="immo">${esc(t("landing.submit_modal.theme.immo"))}</option>
          <option value="pro">${esc(t("landing.submit_modal.theme.pro"))}</option>
        </select>
        <input id="smBadge" placeholder="${attr(t("landing.submit_modal.badge"))}">
      </div>
      <input id="smTitle" placeholder="${attr(t("landing.submit_modal.title_placeholder"))}" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;box-sizing:border-box;">
      <textarea id="smExcerpt" placeholder="${attr(t("landing.submit_modal.excerpt"))}" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;min-height:80px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
      <textarea id="smContent" placeholder="${attr(t("landing.submit_modal.content"))}" style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #cbd5e1;font-size:14px;outline:none;min-height:200px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
      <div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:12px;border:1px solid #e7eefc;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:700;color:#0f172a;">
          <input type="checkbox" id="smPremium" style="width:16px;height:16px;cursor:pointer;">
          ${esc(t("landing.submit_modal.premium"))}
        </label>
      </div>
      <div class="modal-actions" style="margin-top:14px;">
        <button class="mbtn primary" onclick="submitArticle()" style="flex:1;">${esc(t("landing.submit_modal.send"))}</button>
        <button class="mbtn secondary" onclick="closeModal('submitModal')">${esc(t("landing.submit_modal.cancel"))}</button>
      </div>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
        ${esc(t("landing.submit_modal.footer"))}
      </p>
    </div>
  </div>
</div>


`;
}

// ── Leads de l'accueil ────────────────────────────────────────────────

/** Valeur d'un champ du HTML injecté. */
function champ(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return el?.value?.trim() || "";
}

/** Libellé (texte visible) de l'option choisie d'un select. */
function libelleChoisi(id: string): string {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  if (!el || !el.value) return "";
  return el.selectedOptions?.[0]?.text?.trim() || "";
}

type PorteAccueil = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

const PORTE_PAR_BESOIN: Record<string, PorteAccueil> = {
  design: "P1",
  autorisation: "P2",
  realisation: "P3",
  foncier: "P4",
  report: "P5",
  partenariat: "P6",
};
const PORTE_PAR_PROFIL: Record<string, PorteAccueil> = {
  particulier: "P1",
  porteur: "P2",
  invest: "P4",
  foncier: "P4",
  banque: "P5",
  entreprise: "P6",
  archi: "P6",
};

/** Porte conseillée d'après le besoin (prioritaire) et le profil. */
function porteConseillee(profil: string, besoin: string): PorteAccueil | undefined {
  // Conception / autorisation : un particulier relève de P1, un porteur de projet de P2.
  if ((besoin === "design" || besoin === "autorisation") && (profil === "particulier" || profil === "porteur")) {
    return PORTE_PAR_PROFIL[profil];
  }
  return PORTE_PAR_BESOIN[besoin] || PORTE_PAR_PROFIL[profil];
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valide puis envoie un lead de l'accueil (source WEB_HOME). Affiche l'erreur
 * ou la confirmation dans les éléments `ids`. Vrai si le lead est parti ou
 * attend dans la file de reprise.
 */
async function envoyerLeadAccueil(p: {
  ids: { form: string; send: string; err: string; done: string; queued: string };
  nom: string;
  telephone: string;
  email: string;
  website: string;
  porte?: string;
  projetLibre?: string;
  wizard: Record<string, unknown>;
  lang: "fr" | "ar" | "en";
  t: T;
}): Promise<boolean> {
  const errEl = document.getElementById(p.ids.err);
  const sendEl = document.getElementById(p.ids.send) as HTMLButtonElement | null;
  const erreur = (msg: string, focusId?: string) => {
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = !msg;
    }
    if (focusId) (document.getElementById(focusId) as HTMLElement | null)?.focus();
  };
  const prefixe = p.ids.form === "fForm" ? "f" : "lm";

  if (p.nom.length < 2) {
    erreur(p.t("lead.err.nom"), `${prefixe}Name`);
    return false;
  }
  const telephone = telephoneEnvoyable(p.telephone);
  if (!telephone) {
    erreur(p.t("landing.lead.err_phone"), `${prefixe}Phone`);
    return false;
  }
  if (p.email && !RE_EMAIL.test(p.email)) {
    erreur(p.t("landing.lead.err_email"), `${prefixe}Email`);
    return false;
  }
  erreur("");
  if (sendEl?.disabled) return false; // envoi déjà en cours

  const libelle = sendEl?.textContent || "";
  if (sendEl) {
    sendEl.disabled = true;
    sendEl.textContent = p.t("lead.btn.sending");
  }
  try {
    const wizard = sanitizeWizard(p.wizard);
    const body: CaptureBody = {
      nom: p.nom,
      telephone,
      email: p.email || undefined,
      projetType: p.porte,
      source: "WEB_HOME",
      lang: p.lang,
      pageContext: "/",
      utm: currentUtm(),
      meta: { projetLibre: p.projetLibre, wizard },
      website: p.website || undefined,
    };
    const out = await captureLead(leadKey(p.porte, telephone), body);
    if (out.status === "invalid") {
      erreur(
        out.code === "phone_invalid"
          ? p.t("landing.lead.err_phone")
          : out.code === "nom_invalid"
            ? p.t("lead.err.nom")
            : p.t("lead.err.generic"),
      );
      return false;
    }
    const form = document.getElementById(p.ids.form);
    const done = document.getElementById(p.ids.done);
    const queued = document.getElementById(p.ids.queued);
    if (form) form.hidden = true;
    if (queued) queued.hidden = out.status !== "queued";
    if (done) {
      done.hidden = false;
      done.focus?.();
    }
    return true;
  } catch {
    erreur(p.t("lead.err.generic"));
    return false;
  } finally {
    if (sendEl) {
      sendEl.disabled = false;
      sendEl.textContent = libelle;
    }
  }
}

function ensureGlobal(name: string, fn: (...args: any[]) => any) {
  // @ts-expect-error attach to window
  if (!window[name]) window[name] = fn;
}

export default function LandingV4() {
  const t = useT();
  const { lang, setLang } = useLang();

  // PRE_HTML & POST_HTML dépendent de la langue active → recalcul à chaque
  // changement (Provider i18n) pour rafraîchir le contenu injecté en HTML.
  const preHtml = useMemo(() => buildPreHtml(t, lang), [t, lang]);
  const postHtml = useMemo(() => buildPostHtml(t), [t]);

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
    ensureGlobal("soon", (msg?: string) => {
      alert(msg || t("landing.alert.soon"));
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


    // ── Leads de l'accueil : envoi réel via leadBridge (file de reprise si
    // l'API ne répond pas). Les valeurs saisies ne sont jamais réinjectées
    // en HTML : messages et libellés passent par textContent.
    const leadGlobals: Record<string, (...args: any[]) => any> = {
      openLeadModal: () => {
        const el = document.getElementById("leadModal");
        if (el) el.style.display = "flex";
        const first = document.getElementById("lmName") as HTMLInputElement | null;
        if (first && !(document.getElementById("lmForm") as HTMLElement | null)?.hidden) first.focus();
      },

      // Modale « Être rappelé »
      submitLead: async (evt?: Event) => {
        evt?.preventDefault?.();
        const door = champ("lmDoor");
        await envoyerLeadAccueil({
          ids: { form: "lmForm", send: "lmSend", err: "lmErr", done: "lmDone", queued: "lmQueued" },
          nom: champ("lmName"),
          telephone: champ("lmPhone"),
          email: champ("lmEmail"),
          website: champ("lmWebsite"),
          porte: /^P[1-6]$/.test(door) ? door : undefined,
          projetLibre: champ("lmMsg") || undefined,
          wizard: { formulaire: "rappel_accueil" },
          lang,
          t,
        });
      },

      // Formulaire « Être orienté automatiquement » : lead d'abord, puis orientation.
      autoOrient: async (evt?: Event) => {
        evt?.preventDefault?.();
        const profil = champ("fProfile");
        const besoin = champ("fNeed");
        const porte = porteConseillee(profil, besoin);
        const ok = await envoyerLeadAccueil({
          ids: { form: "fForm", send: "fSend", err: "fErr", done: "fDone", queued: "fQueued" },
          nom: champ("fName"),
          telephone: champ("fPhone"),
          email: champ("fEmail"),
          website: champ("fWebsite"),
          porte,
          wizard: {
            formulaire: "orientation_accueil",
            profil: libelleChoisi("fProfile") || undefined,
            profilCode: profil || undefined,
            besoin: libelleChoisi("fNeed") || undefined,
            besoinCode: besoin || undefined,
            porteConseillee: porte,
          },
          lang,
          t,
        });
        if (!ok) return;

        // Orientation : mise en avant de la porte conseillée, puis défilement.
        document.querySelectorAll(".cat.cat-suggested").forEach((n) => n.classList.remove("cat-suggested"));
        const next = document.getElementById("fNext") as HTMLAnchorElement | null;
        const card = porte ? document.getElementById(`cat-${porte}`) : null;
        if (porte && card) {
          card.classList.add("cat-suggested");
          if (next) {
            next.href = `/${porte.toLowerCase()}`;
            next.textContent = t("landing.form.next", { porte: t(`landing.cat.${porte.toLowerCase()}.title`) });
            next.hidden = false;
          }
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          document.getElementById("categories")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    };
    const w = window as any;
    for (const [name, fn] of Object.entries(leadGlobals)) w[name] = fn;

    // Lang switcher : délègue au Provider i18n (useT/useLang). Le DOM est
    // re-rendu via useMemo(buildPreHtml) — plus de patch DOM ciblé nécessaire.
    (window as any).setLang = (l: string) => {
      if (l === "fr" || l === "ar" || l === "en") setLang(l);
    };

    // Search redirects to /media (frontend-only).
    ensureGlobal("runSearch", () => {
      const input = document.getElementById("searchInput") as HTMLInputElement | null;
      const q = input?.value?.trim() || "";
      const url = q ? `/media?q=${encodeURIComponent(q)}` : "/media";
      window.location.href = url;
    });

    return () => {
      for (const [name, fn] of Object.entries(leadGlobals)) {
        if (w[name] === fn) delete w[name];
      }
    };
  }, [setLang, t, lang]);

  // Publications PUBLIQUES Cercles → mêmes cartes que le journal (ArticleCard).
  const [cercleArticles, setCercleArticles] = useState<Article[]>([]);
  useEffect(() => {
    let alive = true;
    cerclesApi
      .publicFeed(1)
      .then((r) => {
        if (!alive) return;
        const mapped = (r.data || []).map(cerclePostToArticle);
        setCercleArticles(mapped);
      })
      .catch(() => {
        if (alive) setCercleArticles([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Fusion journal + communauté, triée du plus récent au plus ancien.
  const articles = useMemo(() => {
    const merged = [...listPublished(), ...cercleArticles];
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return merged.slice(0, 9);
  }, [cercleArticles]);

  const mediaFilters: Array<{ key: string; label: string }> = [
    { key: "all", label: t("landing.medias.filter.all") },
    { key: "fr", label: t("landing.medias.filter.fr") },
    { key: "ar", label: t("landing.medias.filter.ar") },
    { key: "invest", label: t("landing.medias.filter.invest") },
    { key: "chantier", label: t("landing.medias.filter.chantier") },
    { key: "rapports", label: t("landing.medias.filter.rapports") },
    { key: "premium", label: t("landing.medias.filter.premium") },
  ];

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div dangerouslySetInnerHTML={{ __html: preHtml }} />

      <section id="medias" style={{ scrollMarginTop: 140, padding: "32px 0 48px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <h2 id="media-title-txt" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "var(--blue2)" }}>
                {t("landing.medias.title")}
              </h2>
              <p id="media-sub-txt" style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                {t("landing.medias.sub")}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {mediaFilters.map((f, i) => (
                  <span key={f.key} style={{ padding: "6px 13px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", background: i === 0 ? "var(--blue)" : "#e6ebf5", color: i === 0 ? "#fff" : "var(--blue2)", border: i === 0 ? "1px solid var(--blue)" : "1px solid #d7def0" }}>{f.label}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
              <button style={{ padding: "9px 16px", borderRadius: 12, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }} id="goto-media-btn" onClick={() => (window.location.href = "/media")}>
                {t("landing.medias.goto")}
              </button>
            </div>
          </div>
          {/* Article grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {articles.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14, gridColumn: "1/-1" }}>{t("landing.medias.empty")}</div>
            ) : (
              articles.map((a) => <ArticleCard key={a.id} article={a} mode="landing" />)
            )}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid #d7def0", background: "#e6ebf5", color: "var(--blue2)", fontWeight: 700, fontSize: 13, cursor: "pointer" }} id="see-all-btn" onClick={() => (window.location.href = "/media")}>
              {t("landing.medias.see_all")}
            </button>
          </div>
        </div>
      </section>

      <div dangerouslySetInnerHTML={{ __html: postHtml }} />
      <BottomNav />
    </div>
  );
}
