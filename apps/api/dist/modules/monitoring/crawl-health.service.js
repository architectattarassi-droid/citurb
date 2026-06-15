"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlHealthService = void 0;
const common_1 = require("@nestjs/common");
const DEFAULT_PATHS = [
    "/",
    "/services/architecte-sale.html",
    "/services/permis-de-construire-kenitra.html",
];
let CrawlHealthService = class CrawlHealthService {
    log = new common_1.Logger("CrawlHealthService");
    baseUrl() {
        return (process.env.REPORT_CRAWL_BASE_URL ||
            process.env.PUBLIC_WEB_URL ||
            "https://citurbarea.com").replace(/\/+$/, "");
    }
    /** Liste des URLs absolues à auditer. */
    targetUrls() {
        const raw = (process.env.REPORT_CRAWL_URLS || "").trim();
        const items = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_PATHS;
        return items.map((it) => /^https?:\/\//i.test(it) ? it : `${this.baseUrl()}${it.startsWith("/") ? "" : "/"}${it}`);
    }
    /** Audite une URL unique (fetch serveur, sans JS). */
    async checkUrl(url, timeoutMs = 15000) {
        const started = Date.now();
        const base = {
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
            base.noJsRequiredNotice = !/(n[ée]cessite\s+javascript|requires\s+javascript|enable\s+javascript|activer\s+javascript)/i.test(html);
            const failed = [];
            if (res.status !== 200)
                failed.push(`HTTP ${res.status}`);
            if (!base.hasH1)
                failed.push("h1 absent");
            if (!base.hasMetaDescription)
                failed.push("meta description absente");
            if (!base.hasJsonLd)
                failed.push("JSON-LD absent");
            if (!base.noJsRequiredNotice)
                failed.push('mention "nécessite JavaScript"');
            base.failedChecks = failed;
            base.ok = failed.length === 0;
            return base;
        }
        catch (e) {
            base.responseMs = Date.now() - started;
            const err = e?.name === "AbortError" ? `timeout >${timeoutMs}ms` : e?.message || "fetch error";
            base.error = err;
            base.failedChecks = [err];
            return base;
        }
        finally {
            clearTimeout(timer);
        }
    }
    /** Audite toutes les URLs prioritaires et calcule un score /100. */
    async run() {
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
};
exports.CrawlHealthService = CrawlHealthService;
exports.CrawlHealthService = CrawlHealthService = __decorate([
    (0, common_1.Injectable)()
], CrawlHealthService);
