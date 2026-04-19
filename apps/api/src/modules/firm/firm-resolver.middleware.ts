import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FirmService } from './firm.service';

@Injectable()
export class FirmResolverMiddleware implements NestMiddleware {
  constructor(private readonly firmService: FirmService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Priority 1 : explicit header X-Firm-Slug (dev local / API gateway)
    const xFirmSlug = req.headers['x-firm-slug'] as string | undefined;

    // Priority 2 : subdomain (ex: arcbati.citurbarea.com → arcbati)
    const host = req.headers.host || '';
    let slug: string | null = xFirmSlug || null;

    if (!slug) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'citurbarea' && sub !== 'localhost') {
          slug = sub;
        }
      }
    }

    if (slug) {
      try {
        const firm = await this.firmService.findBySlug(slug);
        if (firm) {
          (req as any).firmId = firm.id;
          (req as any).firmSlug = firm.slug;
        }
      } catch {
        // Non-bloquant : si la firm n'existe pas, on continue sans isolation
      }
    }

    next();
  }
}
