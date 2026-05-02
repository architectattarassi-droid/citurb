import { NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./modules/kernel/global-exception.filter";
import { TomeMetaInterceptor } from "./tomes/tome-at/kernel/tome-meta.interceptor";
import { MutationGateGuard } from "./common/guards/mutation-gate.guard";
import { validateEnvOrThrow } from "./modules/kernel";

async function bootstrap() {
  validateEnvOrThrow();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
  app.useStaticAssets(uploadsDir, { prefix: "/uploads" });

  const reflector = app.get(Reflector);

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

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TomeMetaInterceptor(reflector));
  app.useGlobalGuards(new MutationGateGuard());

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
