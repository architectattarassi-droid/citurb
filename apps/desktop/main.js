const fs = require('fs');
const LOG = 'C:\\Users\\HP\\citurbarea-debug.log';
const log = (s) => { try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${s}\n`); } catch {} };

try { fs.writeFileSync(LOG, ''); } catch {}
log('main.js loaded, process.type=' + process.type);

const { app, BrowserWindow, Menu, shell, session } = require('electron');

let VARIANT = process.env.CIT_VARIANT || 'portal';
try {
  const pkgPath = require('path').join(__dirname, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.citVariant) VARIANT = pkg.citVariant;
  }
} catch (e) { log('pkg-read-fail ' + e.message); }
log('VARIANT=' + VARIANT);

// CIT_LOCAL=1 → pointe sur localhost (npm run dev:web). Pratique pour tester
// les refontes UI immédiatement sans attendre un déploiement Railway.
const LOCAL_MODE = process.env.CIT_LOCAL === '1' || process.env.CIT_LOCAL === 'true';
const PROD_BASE  = 'https://citurb-web-production.up.railway.app';
const LOCAL_BASE = process.env.CIT_LOCAL_URL || 'http://localhost:5173';
const BASE = LOCAL_MODE ? LOCAL_BASE : PROD_BASE;
log('LOCAL_MODE=' + LOCAL_MODE + ' BASE=' + BASE);

const CONFIG_PORTAL = {
  title: 'CITURBAREA — Portail' + (LOCAL_MODE ? ' (LOCAL)' : ''),
  accent: '#3b82f6',
  badge: 'PORTAIL' + (LOCAL_MODE ? ' · LOCAL' : ''),
  email: 'user@citurbarea.test',
  password: 'User123!',
  url: BASE + '/',
};
const CONFIG_BACK = {
  title: 'CITURBAREA — Command Center' + (LOCAL_MODE ? ' (LOCAL)' : ''),
  accent: '#0F2A4A',
  badge: 'COMMAND CENTER ADMIN' + (LOCAL_MODE ? ' · LOCAL' : ''),
  email: 'admin@citurbarea.test',
  password: 'Admin123!',
  url: BASE + '/cc/login',
};
const CONFIG_DOC = {
  title: 'CITURBAREA — Documentation' + (LOCAL_MODE ? ' (LOCAL)' : ''),
  accent: '#0d9488',
  badge: 'DOCUMENTATION' + (LOCAL_MODE ? ' · LOCAL' : ''),
  email: '',
  password: '',
  url: BASE + '/docs',
};
const CONFIG_ARCHIVE = {
  title: 'CITURBAREA — Archive' + (LOCAL_MODE ? ' (LOCAL)' : ''),
  accent: '#B08D57',
  badge: 'ARCHIVE · CONSULTATION DOSSIERS' + (LOCAL_MODE ? ' · LOCAL' : ''),
  email: 'admin@citurbarea.test',
  password: 'Admin123!',
  url: BASE + '/cc/archive',
};
const CONFIG =
  VARIANT === 'backoffice' ? CONFIG_BACK :
  VARIANT === 'doc'        ? CONFIG_DOC  :
  VARIANT === 'archive'    ? CONFIG_ARCHIVE :
  CONFIG_PORTAL;

const TARGET_URL = CONFIG.url;

function buildInjectionCode() {
  const json = JSON.stringify({ badge: CONFIG.badge, accent: CONFIG.accent, email: CONFIG.email, password: CONFIG.password });
  return `
    (function () {
      try {
        var C = ${json};

        // 1. Visual badge
        if (!document.getElementById('cit-badge-style')) {
          var s = document.createElement('style');
          s.id = 'cit-badge-style';
          s.textContent = 'body::before{content:"' + C.badge + '";position:fixed;top:0;left:0;right:0;background:' + C.accent + ';color:#fff;font:700 11px system-ui;letter-spacing:2px;text-align:center;padding:4px 0;z-index:9999999}body{padding-top:22px!important}';
          document.head.appendChild(s);
        }

        // 2. Auto-fill email + password on login form
        var setVal = function (el, v) {
          var p = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          p.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        var fill = function () {
          var pwInputs = document.querySelectorAll('input[type=password]');
          for (var k = 0; k < pwInputs.length; k++) {
            if (pwInputs[k].value !== C.password) setVal(pwInputs[k], C.password);
            var form = pwInputs[k].closest('form');
            if (form) {
              var textInputs = form.querySelectorAll('input:not([type=password]):not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button])');
              for (var i = 0; i < textInputs.length; i++) {
                if (textInputs[i].value !== C.email) setVal(textInputs[i], C.email);
              }
            }
          }
        };
        if (!window.__CIT_OBS__) {
          window.__CIT_OBS__ = new MutationObserver(function () { fill(); markPhoneVerified(); });
          window.__CIT_OBS__.observe(document.body, { childList: true, subtree: true });
        }
        setTimeout(fill, 300);

        // 3. Pre-mark phone as verified for test accounts (bypass Twilio)
        var markPhoneVerified = function () {
          try {
            var token = localStorage.getItem('citurbarea.token');
            if (!token) return null;
            var parts = token.split('.');
            if (parts.length !== 3) return null;
            var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            var userId = payload.sub || payload.userId;
            if (!userId) return null;
            var pvKey = 'citurbarea:p1:phone_verified_at:' + userId + ':v1';
            var truthKey = 'citurbarea:p1:truth_ok:' + userId + ':v1';
            var termsKey = 'citurbarea:p1:terms_ok:' + userId + ':v1';
            var emailKey = 'citurbarea:p1:email_sent_at:' + userId + ':v1';
            if (!localStorage.getItem(pvKey)) {
              localStorage.setItem(pvKey, JSON.stringify(Date.now()));
              localStorage.setItem(truthKey, JSON.stringify(true));
              localStorage.setItem(termsKey, JSON.stringify(true));
              localStorage.setItem(emailKey, JSON.stringify(Date.now()));
              console.log('[CIT-INJECT] all p1 unlocks set for', userId);
            }
            return userId;
          } catch (e) { console.error('[CIT-INJECT] phone-verify-mark fail', e); return null; }
        };
        markPhoneVerified();
        setInterval(markPhoneVerified, 1500);

        // 4. Patch landing page header when logged in: hide "Se connecter"/"Créer un compte", add "Mon espace"
        var patchLandingHeader = function () {
          try {
            var token = localStorage.getItem('citurbarea.token');
            if (!token) return;
            var seConnecter = document.querySelector('a.btn-login[href="/login"]');
            var creerCompte = document.querySelector('a.btn-signup[href="/login?signup=1"]');
            if (seConnecter && !seConnecter.dataset.citPatched) {
              seConnecter.dataset.citPatched = '1';
              seConnecter.textContent = 'Mon espace';
              seConnecter.setAttribute('href', '/portal');
            }
            if (creerCompte && !creerCompte.dataset.citPatched) {
              creerCompte.dataset.citPatched = '1';
              creerCompte.style.display = 'none';
            }
          } catch (e) {}
        };
        patchLandingHeader();
        setInterval(patchLandingHeader, 1000);
      } catch (e) { console.error('CIT-INJECT', e); }
    })();
  `;
}

app.whenReady().then(async () => {
  log('app ready');
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({ storages: ['shadercache', 'cachestorage'] });
    log('cache cleared');
  } catch (e) { log('cache-clear-fail ' + e.message); }
  const win = new BrowserWindow({
    width: 1280, height: 820,
    title: CONFIG.title,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);

  win.webContents.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle(CONFIG.title); });
  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL();
    log('did-finish-load: ' + url);
    win.webContents.executeJavaScript(buildInjectionCode()).catch((err) => log('inject-fail ' + err.message));
    if (process.env.CIT_AUTOTEST === '1' && !win.__autotestStarted) {
      win.__autotestStarted = true;
      (async () => {
        try {
          await new Promise(r => setTimeout(r, 800));
          await win.webContents.executeJavaScript(`localStorage.clear();`);
          log('AT: LS cleared');
          await win.webContents.loadURL(TARGET_URL);
          log('AT: navigated to ' + TARGET_URL);
          await new Promise(r => setTimeout(r, 3000));
          await win.webContents.executeJavaScript(`
            (function () {
              var f = document.querySelector('form');
              if (f) { f.requestSubmit ? f.requestSubmit() : f.submit(); }
            })();
          `);
          log('AT: submitted login');
          await new Promise(r => setTimeout(r, 4000));
          log('AT: after login URL = ' + win.webContents.getURL());

          // Wait longer for React to render
          await win.webContents.loadURL('https://citurb-web-production.up.railway.app/');
          await new Promise(r => setTimeout(r, 4000));
          log('AT-1: at home URL = ' + win.webContents.getURL());

          var ls = await win.webContents.executeJavaScript(`JSON.stringify({ tokenLen: (localStorage.getItem('citurbarea.token') || '').length, userObj: localStorage.getItem('citurbarea_user') })`);
          log('AT-2: localStorage = ' + ls);

          var links = await win.webContents.executeJavaScript(`
            JSON.stringify(Array.from(document.querySelectorAll('header a, header button, nav a, nav button')).map(function (a) { return { tag: a.tagName, text: (a.textContent || '').trim().slice(0, 40), href: a.getAttribute('href') || a.dataset.href || '' }; }).filter(function (x) { return x.text; }))
          `);
          log('AT-3: header links = ' + links);

          // Test calling /auth/me from inside Electron
          var bodyText = await win.webContents.executeJavaScript(`
            (function () {
              var txt = document.body.innerText || '';
              var idx = Math.max(txt.indexOf('Connecté'), txt.indexOf('Non connecté'));
              return idx >= 0 ? txt.substring(Math.max(0, idx - 30), idx + 80) : 'NO_CONNECT_INDICATOR';
            })();
          `);
          log('AT-3b: connect indicator = ' + bodyText);

          var meResp = await win.webContents.executeJavaScript(`
            (async function () {
              try {
                var token = localStorage.getItem('citurbarea.token');
                if (!token) return 'NO_TOKEN';
                var r = await fetch('https://citurb-production.up.railway.app/auth/me', { headers: { Authorization: 'Bearer ' + token } });
                var t = await r.text();
                return r.status + ' ' + t.slice(0, 200);
              } catch (e) { return 'ERR ' + e.message; }
            })();
          `);
          log('AT-4: /auth/me = ' + meResp);

          // Re-load home to apply patch
          await win.webContents.loadURL('https://citurb-web-production.up.railway.app/');
          await new Promise(r => setTimeout(r, 3500));
          var btn = await win.webContents.executeJavaScript(`
            (function () {
              var b = document.querySelector('a.btn-login');
              return b ? JSON.stringify({ text: b.textContent, href: b.getAttribute('href') }) : 'NO_BTN';
            })();
          `);
          log('AT-5: Mon espace btn = ' + btn);

          // Click Mon espace
          await win.webContents.executeJavaScript(`var b = document.querySelector('a.btn-login'); if (b) location.assign(b.getAttribute('href'));`);
          await new Promise(r => setTimeout(r, 3000));
          log('AT-6: after Mon espace click, URL = ' + win.webContents.getURL());

          // Test SHADOW VIEW navigation
          await win.webContents.loadURL('https://citurb-web-production.up.railway.app/cc/dossiers');
          await new Promise(r => setTimeout(r, 3000));
          log('AT-SHADOW: /cc/dossiers URL = ' + win.webContents.getURL());
          var dossierIds = await win.webContents.executeJavaScript(`
            JSON.stringify(Array.from(document.querySelectorAll('button[title*="shadow"]')).map(function (b) {
              var row = b.closest('tr'); return row ? row.querySelector('span[style*="monospace"]')?.textContent : null;
            }))
          `);
          log('AT-SHADOW: dossier ids button shadow found = ' + dossierIds);

          await win.webContents.loadURL('https://citurb-web-production.up.railway.app/cc/dossiers/cmolqfb5b0001swwk5haj2eze/shadow');
          await new Promise(r => setTimeout(r, 8000));
          log('AT-SHADOW: shadow page URL = ' + win.webContents.getURL());
          var bodyContent = await win.webContents.executeJavaScript(`(document.body.innerText || '').slice(0, 1500).replace(/\\n+/g, ' | ')`);
          log('AT-SHADOW: body = ' + bodyContent);
          var fetchTest = await win.webContents.executeJavaScript(`
            (async function () {
              var token = localStorage.getItem('citurbarea.token');
              if (!token) return 'NO_TOKEN';
              try {
                var r = await fetch('https://citurb-production.up.railway.app/p2/dossier/cmolqfb5b0001swwk5haj2eze/complet', { headers: { Authorization: 'Bearer ' + token } });
                var t = await r.text();
                return r.status + ' | ' + t.slice(0, 200);
              } catch (e) { return 'FETCH_ERR ' + e.message; }
            })();
          `);
          log('AT-SHADOW: direct fetch = ' + fetchTest);
        } catch (e) { log('AT-err ' + e.message); }
      })();
    }
  });
  win.webContents.on('did-frame-finish-load', (_e, isMainFrame) => {
    if (isMainFrame) win.webContents.executeJavaScript(buildInjectionCode()).catch(() => {});
  });
  win.webContents.on('did-navigate', (_e, url) => log('did-navigate: ' + url));
  win.webContents.on('did-navigate-in-page', (_e, url) => log('did-navigate-in-page: ' + url));
  win.webContents.on('console-message', (_e, lvl, msg) => { if (lvl >= 1 || /AT|CIT-INJECT|fetch|401|403/i.test(msg)) log('console[' + lvl + '] ' + msg); });
  require('electron').session.defaultSession.webRequest.onCompleted((d) => {
    if (d.url.includes('citurb-production') && (d.statusCode === 401 || d.statusCode === 403 || d.statusCode >= 500)) {
      log('NET ' + d.statusCode + ' ' + d.method + ' ' + d.url);
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('http')) shell.openExternal(url); return { action: 'deny' }; });

  win.loadURL(TARGET_URL);
});

app.on('window-all-closed', () => app.quit());
