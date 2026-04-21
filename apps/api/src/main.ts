import { NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./modules/kernel/global-exception.filter";
import { TomeMetaInterceptor } from "./tomes/tome-at/kernel/tome-meta.interceptor";
import { MutationGateGuard } from "./common/guards/mutation-gate.guard";
import { validateEnvOrThrow } from "./modules/kernel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

const DIST_DIR = join(__dirname, '..', '..', 'web', 'dist');
const API_PREFIXES = ['/p2', '/auth', '/health', '/firms', '/api', '/uploads'];

async function bootstrap() {
  validateEnvOrThrow();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Uploaded files
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  const reflector = app.get(Reflector);

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

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TomeMetaInterceptor(reflector));
  app.useGlobalGuards(new MutationGateGuard());

  const http = app.getHttpAdapter().getInstance();

  // Serve static assets (JS/CSS/images) — falls through if file not found
  http.use(express.static(DIST_DIR, { index: false }));

  // SPA fallback — runs AFTER NestJS routes; API prefixes pass to NestJS
  http.get('*', (req: any, res: any, next: any) => {
    if (API_PREFIXES.some((p) => req.path.startsWith(p))) return next();
    res.sendFile(join(DIST_DIR, 'index.html'));
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
