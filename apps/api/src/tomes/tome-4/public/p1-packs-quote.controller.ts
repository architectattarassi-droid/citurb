import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { P1PacksQuoteService } from "./p1-packs-quote.service";

@Tome('tome4')
@Controller("p1/packs")
@UseGuards(JwtAuthGuard)
export class P1PacksQuoteController {
  constructor(private readonly svc: P1PacksQuoteService) {}

  /**
   * Quote pack/service amounts (no engine disclosure)
   */
  @Post("quote")
  async quote(@Body() body: any) {
    const input = body?.input || body;
    return this.svc.quote({
      surfaceM2: Number(input?.surfaceM2 ?? 0),
      hasBasement: Boolean(input?.hasBasement),
      constructionLevel: String(input?.constructionLevel || "STANDING"),
      pack: String(input?.pack || "AVANCE"),
      addRemoteFollow: Boolean(input?.addRemoteFollow),
      betMode: String(input?.betMode || "PLATFORM"),
      modEnabled: Boolean(input?.modEnabled),
      decoEnabled: Boolean(input?.decoEnabled),
      mandateEntreprise: Boolean(input?.mandateEntreprise),
      blackBudgetMAD: input?.blackBudgetMAD != null ? Number(input.blackBudgetMAD) : null,
    } as any);
  }
}
