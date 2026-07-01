import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

/**
 * SeoService — cockpit SEO/GEO interne (sans API payante).
 *  - Audit ON-PAGE automatisé de nos propres pages (title/meta/H1/canonical/
 *    hreflang/OG/JSON-LD/mots) → score + problèmes à corriger au fil de l'eau.
 *  - Registre de mots-clés cibles (plan) + veille concurrents (store JSON volume).
 *
 * Note : les positions Google réelles et les mots-clés des concurrents exigent
 * une API payante (GSC/SEMrush) ; ici on outille ce qu'on MAÎTRISE (nos pages,
 * notre plan, l'inspection publique des pages concurrentes).
 */
type Keyword = { id: string; keyword: string; locale: string; target?: string; url?: string; priority?: string; status?: string; note?: string; updatedAt: string };
type Competitor = { id: string; name: string; url: string; note?: string; title?: string; description?: string; h1?: string; keywords?: string; checkedAt?: string; updatedAt: string };

const DEFAULT_AUDIT_URLS = [
  "/",
  "/fr/porte-01-projet-personnel",
  "/fr/porte-02-projet-immobilier-equipements",
  "/fr/porte-03-realisation-cle-en-main",
  "/fr/porte-04-investisseur-foncier",
  "/fr/porte-05-rapports-expertises",
  "/fr/porte-06-entreprises-partenaires",
  "/en/door-01-personal-family-project",
  "/ar/bab-01-mashrou-shakhsi-wa-usari",
  "/architecte-kenitra",
  "/architecte-rabat",
  "/architecte-casablanca",
];

@Injectable()
export class SeoService {
  private readonly log = new Logger(SeoService.name);
  private readonly dir = join(process.env.UPLOADS_DIR || join(process.cwd(), "uploads"), "seo");
  private readonly base = (process.env.SEO_AUDIT_BASE || "https://citurbarea.com").replace(/\/$/, "");

  private file(name: string) { return join(this.dir, name); }
  private async ensure() { if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true }); }
  private async read<T>(name: string, fallback: T): Promise<T> {
    try { return JSON.parse(await readFile(this.file(name), "utf-8")); } catch { return fallback; }
  }
  private async write(name: string, data: unknown) { await this.ensure(); await writeFile(this.file(name), JSON.stringify(data, null, 2), "utf-8"); }
  private id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

  // ── Config (URLs à auditer) ───────────────────────────────────────────────
  async getAuditUrls(): Promise<string[]> {
    const cfg = await this.read<{ urls?: string[] }>("config.json", {});
    return cfg.urls && cfg.urls.length ? cfg.urls : DEFAULT_AUDIT_URLS;
  }
  async setAuditUrls(urls: string[]) { await this.write("config.json", { urls }); return { ok: true, urls }; }

  // ── Parsing HTML (regex, sans dépendance) ─────────────────────────────────
  private meta(html: string, key: "name" | "property", val: string): string | null {
    // Capture le délimiteur (") et matche jusqu'au MÊME délimiteur → gère les
    // apostrophes françaises (d'expertise) dans un attribut entre guillemets.
    const re1 = new RegExp(`<meta[^>]+${key}=["']${val}["'][^>]*?\\scontent=(["'])([\\s\\S]*?)\\1`, "i");
    const re2 = new RegExp(`<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]*?\\s${key}=["']${val}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    return m ? m[2].trim() : null;
  }
  private auditHtml(url: string, html: string, status: number) {
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
    const desc = this.meta(html, "name", "description") || "";
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
    const ogTitle = !!this.meta(html, "property", "og:title");
    const ogImage = !!this.meta(html, "property", "og:image");
    const hreflang = (html.match(/hreflang=/gi) || []).length;
    const lang = html.match(/<html[^>]+lang=["']([^"']*)["']/i)?.[1] || "";
    const jsonld = /application\/ld\+json/i.test(html);
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;

    const issues: string[] = [];
    if (status >= 400) issues.push(`HTTP ${status}`);
    if (!title) issues.push("Titre manquant");
    else if (title.length < 30 || title.length > 65) issues.push(`Titre ${title.length} car. (idéal 30–65)`);
    if (!desc) issues.push("Meta description manquante");
    else if (desc.length < 70 || desc.length > 160) issues.push(`Meta desc. ${desc.length} car. (idéal 70–160)`);
    if (h1s === 0) issues.push("Aucun H1");
    else if (h1s > 1) issues.push(`${h1s} H1 (un seul recommandé)`);
    if (!canonical) issues.push("Canonical absente");
    if (!ogTitle || !ogImage) issues.push("Open Graph incomplet (partage social)");
    if (!hreflang) issues.push("hreflang absent (FR/AR/EN)");
    if (!lang) issues.push("Attribut <html lang> absent");
    if (!jsonld) issues.push("Données structurées (JSON-LD) absentes");
    if (words < 250) issues.push(`Contenu court (${words} mots)`);

    const checks = 10;
    const score = Math.max(0, Math.round(((checks - issues.length) / checks) * 100));
    return { url, status, title, titleLen: title.length, desc, descLen: desc.length, h1s, canonical, og: ogTitle && ogImage, hreflang, lang, jsonld, words, score, issues };
  }

  async audit() {
    const urls = await this.getAuditUrls();
    const pages = await Promise.all(urls.map(async (path) => {
      const full = `${this.base}${path.startsWith("/") ? path : `/${path}`}`;
      try {
        const res = await fetch(full, { headers: { "User-Agent": "CiturbareaSEO/1.0 (+audit)" }, redirect: "follow" });
        const html = await res.text();
        return this.auditHtml(path, html, res.status);
      } catch (e: any) {
        return { url: path, status: 0, title: "", desc: "", score: 0, issues: [`Injoignable: ${e?.message || "erreur"}`], words: 0 } as any;
      }
    }));
    const avg = pages.length ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) : 0;
    const totalIssues = pages.reduce((s, p) => s + (p.issues?.length || 0), 0);
    return { generatedAt: new Date().toISOString(), base: this.base, avgScore: avg, totalIssues, pages: pages.sort((a, b) => a.score - b.score) };
  }

  // ── Mots-clés (plan) ──────────────────────────────────────────────────────
  async listKeywords(): Promise<Keyword[]> { return this.read<Keyword[]>("keywords.json", []); }
  async upsertKeyword(k: Partial<Keyword>): Promise<Keyword[]> {
    const all = await this.listKeywords();
    if (k.id) {
      const i = all.findIndex((x) => x.id === k.id);
      if (i >= 0) all[i] = { ...all[i], ...k, updatedAt: new Date().toISOString() } as Keyword;
    } else {
      all.push({ id: this.id(), keyword: k.keyword || "", locale: k.locale || "fr", target: k.target, url: k.url, priority: k.priority || "MEDIUM", status: k.status || "TODO", note: k.note, updatedAt: new Date().toISOString() });
    }
    await this.write("keywords.json", all);
    return all;
  }
  async removeKeyword(id: string): Promise<Keyword[]> {
    const all = (await this.listKeywords()).filter((x) => x.id !== id);
    await this.write("keywords.json", all);
    return all;
  }

  // ── Concurrents ───────────────────────────────────────────────────────────
  async listCompetitors(): Promise<Competitor[]> { return this.read<Competitor[]>("competitors.json", []); }
  async upsertCompetitor(c: Partial<Competitor>): Promise<Competitor[]> {
    const all = await this.listCompetitors();
    if (c.id) {
      const i = all.findIndex((x) => x.id === c.id);
      if (i >= 0) all[i] = { ...all[i], ...c, updatedAt: new Date().toISOString() } as Competitor;
    } else {
      all.push({ id: this.id(), name: c.name || c.url || "Concurrent", url: c.url || "", note: c.note, updatedAt: new Date().toISOString() });
    }
    await this.write("competitors.json", all);
    return all;
  }
  async removeCompetitor(id: string): Promise<Competitor[]> {
    const all = (await this.listCompetitors()).filter((x) => x.id !== id);
    await this.write("competitors.json", all);
    return all;
  }
  // ── Google Search Console (compte de service, sans redirection OAuth) ──────
  private gscConfigured() { return !!(process.env.GSC_SA_JSON && process.env.GSC_SITE_URL); }

  private async gscToken(): Promise<string> {
    const sa = JSON.parse(process.env.GSC_SA_JSON as string);
    const now = Math.floor(Date.now() / 1000);
    const b64u = (o: any) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
    const header = b64u({ alg: "RS256", typ: "JWT" });
    const claim = b64u({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    const sig = signer.sign((sa.private_key as string).replace(/\\n/g, "\n")).toString("base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${claim}.${sig}`,
    });
    const j: any = await res.json();
    if (!j.access_token) throw new Error(j.error_description || j.error || "auth GSC échouée");
    return j.access_token;
  }

  /** Parse un export CSV Search Console (requête/page, clics, impressions, CTR, position). */
  private parseGscCsv(text: string) {
    const num = (s: any) => Number(String(s ?? "").replace(/[%\s"]/g, "").replace(",", ".")) || 0;
    const rows: any[] = [];
    for (const line of (text || "").split(/\r?\n/)) {
      if (!line.trim()) continue;
      // split CSV en gérant les guillemets basiques
      const parts = line.match(/("[^"]*"|[^,]+)/g)?.map((p) => p.replace(/^"|"$/g, "").trim()) || [];
      if (parts.length < 2) continue;
      const r = { key: parts[0], clicks: num(parts[1]), impressions: num(parts[2]), ctr: num(parts[3]), position: num(parts[4]) };
      if (!r.key || (r.clicks === 0 && r.impressions === 0 && r.position === 0)) continue; // header / vide
      rows.push(r);
    }
    return rows.slice(0, 200);
  }

  /** Import gratuit : l'utilisateur colle l'export CSV de Search Console (sans API/Cloud). */
  async importGsc(queriesCsv: string, pagesCsv: string) {
    const queries = this.parseGscCsv(queriesCsv);
    const pages = this.parseGscCsv(pagesCsv);
    const totals = queries.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
    const avgPosition = queries.length ? Math.round((queries.reduce((s, r) => s + r.position, 0) / queries.length) * 10) / 10 : 0;
    const data = { importedAt: new Date().toISOString(), totals: { ...totals, avgPosition }, queries, pages };
    await this.write("gsc-manual.json", data);
    return { ok: true, ...data };
  }

  /** Requêtes / pages Google Search Console : API si configurée, sinon import CSV. */
  async gsc(days = 28) {
    const siteUrl = process.env.GSC_SITE_URL || null;
    if (!this.gscConfigured()) {
      const manual = await this.read<any>("gsc-manual.json", null);
      if (manual) return { configured: false, source: "import", siteUrl, ...manual };
      return { configured: false, source: "none", siteUrl };
    }
    try {
      const token = await this.gscToken();
      const site = process.env.GSC_SITE_URL as string;
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const startDate = fmt(new Date(Date.now() - days * 86400000));
      const endDate = fmt(new Date());
      const query = async (dim: string) => {
        const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate, endDate, dimensions: [dim], rowLimit: 100 }),
        });
        const j: any = await res.json();
        if (j.error) throw new Error(j.error.message || "erreur API GSC");
        return (j.rows || []).map((r: any) => ({ key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, position: Math.round(r.position * 10) / 10 }));
      };
      const [queries, pages] = await Promise.all([query("query"), query("page")]);
      const totals = queries.reduce((a: any, r: any) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
      const avgPos = queries.length ? Math.round((queries.reduce((s: number, r: any) => s + r.position, 0) / queries.length) * 10) / 10 : 0;
      return { configured: true, source: "api", siteUrl: site, days, totals: { ...totals, avgPosition: avgPos }, queries, pages };
    } catch (e: any) {
      return { configured: true, error: e?.message || "Erreur GSC", siteUrl };
    }
  }

  /** Inspecte publiquement une page concurrente (title/meta/H1/keywords déclarés). */
  async inspectCompetitor(id: string): Promise<Competitor[]> {
    const all = await this.listCompetitors();
    const c = all.find((x) => x.id === id);
    if (!c || !c.url) return all;
    try {
      const res = await fetch(c.url, { headers: { "User-Agent": "Mozilla/5.0 CiturbareaSEO/1.0" }, redirect: "follow" });
      const html = await res.text();
      c.title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
      c.description = this.meta(html, "name", "description") || "";
      c.h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
      c.keywords = this.meta(html, "name", "keywords") || "";
      c.checkedAt = new Date().toISOString();
    } catch (e: any) {
      c.title = `⚠️ Injoignable (${e?.message || "erreur"})`;
      c.checkedAt = new Date().toISOString();
    }
    await this.write("competitors.json", all);
    return all;
  }
}
