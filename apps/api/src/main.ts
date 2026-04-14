import { NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./modules/kernel/global-exception.filter";
import { TomeMetaInterceptor } from "./tomes/tome-at/kernel/tome-meta.interceptor";
import { MutationGateGuard } from "./common/guards/mutation-gate.guard";
import { validateEnvOrThrow } from "./modules/kernel";

async function bootstrap() {
  // Fail-fast in production when critical providers are missing.
  validateEnvOrThrow();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Serve uploaded files: GET /uploads/dossiers/{storedName}
  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });
  // Serve built React frontend from apps/web/dist (production mode)
  const distPath = join(process.cwd(), "..", "web", "dist");
  app.useStaticAssets(distPath, { prefix: "/" });
  // SPA fallback — toutes les routes non-API renvoient index.html
  const { existsSync } = await import("fs");
  if (existsSync(distPath)) {
    (app as any).getHttpAdapter().getInstance().get(/^(?!\/api|\/p2|\/auth|\/firms|\/uploads).*$/, (_req: any, res: any) => {
      res.sendFile(join(distPath, "index.html"));
    });
  }
  const reflector = app.get(Reflector);

  // ── DEV CORS (localhost only) ───────────────────────────────────────────
  // Front-office runs on 5173, OPS back-office on 5174.
  // We keep it permissive for any localhost:<port> to simplify iterations.
  app.enableCors({
    origin: [
      'https://citurbarea.com',
      'https://www.citurbarea.com',
      'https://api.citurbarea.com',
      'http://localhost:5173',
      'http://localhost:4000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Filtres globaux ──────────────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Intercepteurs globaux ────────────────────────────────────────────────
  app.useGlobalInterceptors(new TomeMetaInterceptor(reflector));

  // ── Guards globaux ───────────────────────────────────────────────────────
  // Doctrine T@-META-005 : toute mutation POST/PUT/PATCH/DELETE doit passer
  // par /tomes/tome-at/orchestrator. Les exceptions sont listées dans le guard.
  app.useGlobalGuards(new MutationGateGuard());

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  // Bind to 0.0.0.0 so Windows exposes the port reliably on localhost
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
