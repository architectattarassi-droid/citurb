import { Body, Controller, Post, Req } from "@nestjs/common";
import { Tome } from "../../tome-at";
import { OtpService } from "../../../modules/otp/otp.service";

@Tome('tome4')
@Controller("p1/packs/email")
export class P1PacksEmailController {
  constructor(private readonly otp: OtpService) {}

  @Post("request")
  async request(@Req() _req: any, @Body() body: any) {
    // Public endpoint: used in the P1 tunnel before any JWT/account exists.
    // Bind the unlock flow to the CASE id.
    const caseId = String(body?.caseId || body?.order?.caseId || "").trim();
    const email = String(body?.email || body?.order?.requester?.email || "").trim();
    if (!caseId) return { ok: false, message: "CaseId manquant." };
    if (!email) return { ok: false, message: "Email manquant." };

    const contextKey = `case:${caseId}`;
    return this.otp.requestEmailOtp(contextKey, email, body?.order || {});
  }

  @Post("verify")
  async verify(@Req() _req: any, @Body() body: any) {
    const caseId = String(body?.caseId || "").trim();
    const code = String(body?.code || "").trim();
    if (!caseId) return { ok: false, message: "CaseId manquant." };
    if (!code) return { ok: false, message: "Code manquant." };
    const contextKey = `case:${caseId}`;
    return this.otp.verifyEmailOtp(contextKey, code);
  }
}
