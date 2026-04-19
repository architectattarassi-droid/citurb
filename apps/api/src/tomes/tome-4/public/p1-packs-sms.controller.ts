import { Body, Controller, Post } from "@nestjs/common";
import { OtpService } from "../../../modules/otp/otp.service";

@Controller("p1/packs/sms")
export class P1PacksSmsController {
  constructor(private readonly otp: OtpService) {}

  private keyFrom(caseId?: string) {
    const c = (caseId || "").trim();
    return c ? `case:${c}` : "";
  }

  @Post("request")
  async request(@Body() body: any) {
    const key = this.keyFrom(body?.caseId);
    const phone = (body?.phone || "").trim();
    return this.otp.requestSmsOtp(key, phone, { caseId: body?.caseId });
  }

  @Post("verify")
  async verify(@Body() body: any) {
    const key = this.keyFrom(body?.caseId);
    const code = (body?.code || "").trim();
    return this.otp.verifySmsOtp(key, code);
  }
}
