import { Controller, Get } from "@nestjs/common";

import { P1_CATALOG_VERSION, P1_OFFERS, P1_UPSELLS } from "../../tome-2/doors/p1.catalog";
import { P1_PHASES, P1_TUNNEL_VERSION } from "../../tome-3/tunnels/p1.tunnel";
import { Tome } from '../../tome-at';

/**
 * Tome 4 — Wiring
 * Public read-only endpoints (no mutations)
 *
 * Doctrine: the front office may read catalogs/tunnels as configuration,
 * but can never infer entitlements or transitions. Actual allowed_actions must
 * come from state endpoint (Tome @/Tome 3).
 */
@Tome('tome4')
@Controller("public")
export class PublicController {
  @Get("catalog/p1")
  getP1Catalog() {
    return {
      version: P1_CATALOG_VERSION,
      offers: P1_OFFERS,
      upsells: P1_UPSELLS,
    };
  }

  @Get("tunnel/p1")
  getP1Tunnel() {
    return {
      version: P1_TUNNEL_VERSION,
      phases: P1_PHASES,
    };
  }
}
