"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const tome_meta_interceptor_1 = require("./tomes/tome-at/kernel/tome-meta.interceptor");
const mutation_gate_guard_1 = require("./common/guards/mutation-gate.guard");
const kernel_1 = require("./modules/kernel");
async function bootstrap() {
    (0, kernel_1.validateEnvOrThrow)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const uploadsDir = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
    app.useStaticAssets(uploadsDir, { prefix: "/uploads" });
    const reflector = app.get(core_1.Reflector);
    app.enableCors({
        origin: [
            /^https:\/\/.*\.citurbarea\.com$/,
            /^https:\/\/.*\.up\.railway\.app$/,
            'http://localhost:5173',
            'http://localhost:4000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Firm-Slug', 'X-Requested-With'],
    });
    // GlobalExceptionFilter is now registered via APP_FILTER token in KernelModule
    // (so it can DI-inject IncidentsService for real Incident persistence).
    app.useGlobalInterceptors(new tome_meta_interceptor_1.TomeMetaInterceptor(reflector));
    app.useGlobalGuards(new mutation_gate_guard_1.MutationGateGuard());
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
