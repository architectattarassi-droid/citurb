import { Injectable, Logger } from "@nestjs/common";

/**
 * CrawlHealthService — vérifie la santé de crawlabilité SANS API payante.
 *
 * C'est le garde-fou anti-régression du "bug de rendu" : on fetch chaque URL
 * prioritaire CÔTÉ SERVEUR (sans exécuter de JS) et on vérifie que le HTML initial
 * contient bien le contenu SEO essentiel (pas seulement un shell SPA vide).
 *
 * Pour chaque URL :
 *  - statut HTTP 200
 *  - présence d'un <h1>
 *  - présence d'une meta description
 *  - présence d'au moins un <script type="application/ld+json">
 *  - ABSENCE de "nécessite JavaScript" / "requires JavaScript" (= shell non rendu)
 *  - temps de réponse (ms)
 *
 * URLs prioritaires : env REPORT_CRAWL_URLS (CSV de chemins ou URLs absolues),
 * résolues contre REPORT_CRAWL_BASE_URL / PUBLIC_WEB_URL. Doivent pointer vers des
 * pages SERVEUR-RENDUES (pages SEO statiques, pages prérendues) — pas le shell SPA.
 */

export type UrlCheck = {
  url: string;
  ok: boolean; // tous les checks critiques passent
  status: number;
  responseMs: number;
  hasH1: boolean;
  hasMetaDescription: boolean;
  hasJsonLd: boolean;
  noJsRequiredNotice: boolean; // true = PAS de message "nécessite JavaScript"
  failedChecks: string[];
  error?: string;
};

export type CrawlHealthReport = {
  configured: boolean;
  score: number; // /100
  total: number;
  passed: number;
  checks: UrlCheck[];
  failing: UrlCheck[];
};

const DEFAULT_PATHS = [
  "/",
  "/services/architecte-sale.html",
  "/services/permis-de-construire-kenitra.html",
];

@Injectable()
export class CrawlHealthService {
  private readonly log = new Logger("CrawlHealthService");

  private baseUrl(): string {
    return (
      process.env.REPORT_CRAWL_BASE_URL ||
      process.env.PUBLIC_WEB_URL ||
      "https://citurbarea.com"
    ).replace(/\/+$/, "");
  }

  /** Liste des URLs absolues à auditer. */
  private targetUrls(): string[] {
    const raw = (process.env.REPORT_CRAWL_URLS || "").trim();
    const items = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_PATHS;
    return items.map((it) =>
      /^https?:\/\//i.test(it) ? it : `${this.baseUrl()}${it.startsWith("/") ? "" : "/"}${it}`,
    );
  }

  /** Audite une URL unique (fetch serveur, sans JS). */
  async checkUrl(url: string, timeoutMs = 15000): Promise<UrlCheck> {
    const started = Date.now();
    const base: UrlCheck = {
      url,
      ok: false,
      status: 0,
      responseMs: 0,
      hasH1: false,
      hasMetaDescription: false,
      hasJsonLd: false,
      noJsRequiredNotice: false,
      failedChecks: [],
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          // UA explicite type bot SEO — on veut le HTML servi sans exécution JS.
          "User-Agent": "CITURBAREA-CrawlHealthBot/1.0 (+monitoring)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      base.status = res.status;
      const html = await res.text();
      base.responseMs = Date.now() - started;

      base.hasH1 = /<h1[\s>]/i.test(html);
      base.hasMetaDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
      base.hasJsonLd = /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html);
      base.noJsRequiredNotice = !/(n[ée]cessite\s+javascript|requires\s+javascript|enable\s+javascript|activer\s+javascript)/i.test(
        html,
      );

      const failed: string[] = [];
      if (res.status !== 200) failed.push(`HTTP ${res.status}`);
      if (!base.hasH1) failed.push("h1 absent");
      if (!base.hasMetaDescription) failed.push("meta description absente");
      if (!base.hasJsonLd) failed.push("JSON-LD absent");
      if (!base.noJsRequiredNotice) failed.push('mention "nécessite JavaScript"');
      base.failedChecks = failed;
      base.ok = failed.length === 0;
      return base;
    } catch (e: any) {
      base.responseMs = Date.now() - started;
      const err = e?.name === "AbortError" ? `timeout >${timeoutMs}ms` : e?.message || "fetch error";
      base.error = err;
      base.failedChecks = [err];
      return base;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Audite toutes les URLs prioritaires et calcule un score /100. */
  async run(): Promise<CrawlHealthReport> {
    const urls = this.targetUrls();
    if (!urls.length) {
      return { configured: false, score: 0, total: 0, passed: 0, checks: [], failing: [] };
    }
    this.log.log(`[Crawl] audit de ${urls.length} URL(s)`);
    // 5 checks par URL ; score = ratio de checks réussis sur l'ensemble.
    const CHECKS_PER_URL = 5;
    const checks = await Promise.all(urls.map((u) => this.checkUrl(u)));
    let passedChecks = 0;
    for (const c of checks) {
      passedChecks +=
        (c.status === 200 ? 1 : 0) +
        (c.hasH1 ? 1 : 0) +
        (c.hasMetaDescription ? 1 : 0) +
        (c.hasJsonLd ? 1 : 0) +
        (c.noJsRequiredNotice ? 1 : 0);
    }
    const totalChecks = checks.length * CHECKS_PER_URL;
    const score = totalChecks ? Math.round((passedChecks / totalChecks) * 100) : 0;
    const failing = checks.filter((c) => !c.ok);
    return {
      configured: true,
      score,
      total: checks.length,
      passed: checks.filter((c) => c.ok).length,
      checks,
      failing,
    };
  }
}
