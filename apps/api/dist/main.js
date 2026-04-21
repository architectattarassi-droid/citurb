"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./modules/kernel/global-exception.filter");
const tome_meta_interceptor_1 = require("./tomes/tome-at/kernel/tome-meta.interceptor");
const mutation_gate_guard_1 = require("./common/guards/mutation-gate.guard");
const kernel_1 = require("./modules/kernel");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
const DIST_DIR = (0, path_1.join)(__dirname, '..', '..', 'web', 'dist');
const API_PREFIXES = ['/p2', '/auth', '/health', '/firms', '/api', '/uploads'];
async function bootstrap() {
    (0, kernel_1.validateEnvOrThrow)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Uploaded files
    app.useStaticAssets((0, path_1.join)(process.cwd(), "uploads"), { prefix: "/uploads" });
    const reflector = app.get(core_1.Reflector);
    app.enableCors({
        origin: [
            'https://citurbarea.com',
            'https://www.citurbarea.com',
            'https://api.citurbarea.com',
            'https://citurb-production.up.railway.app',
            'http://localhost:5173',
            'http://localhost:4000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalInterceptors(new tome_meta_interceptor_1.TomeMetaInterceptor(reflector));
    app.useGlobalGuards(new mutation_gate_guard_1.MutationGateGuard());
    const http = app.getHttpAdapter().getInstance();
    // Serve static assets (JS/CSS/images) — falls through if file not found
    http.use(express.static(DIST_DIR, { index: false }));
    // SPA fallback — runs AFTER NestJS routes; API prefixes pass to NestJS
    http.get('*', (req, res, next) => {
        if (API_PREFIXES.some((p) => req.path.startsWith(p)))
            return next();
        res.sendFile((0, path_1.join)(DIST_DIR, 'index.html'));
    });
    const port = process.env.PORT ? Number(process.env.PORT) : 4000;
    await app.listen(port, '0.0.0.0');
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
}
bootstrap().catch(err => {
    // eslint-disable-next-line no-console
    console.error('[FATAL] Bootstrap failed:', err);
    process.exit(1);
});
