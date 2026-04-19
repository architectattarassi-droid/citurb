import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQ_CAPS_KEY } from "./caps.decorator";

/**
 * Minimal guard:
 * - relies on JwtAuthGuard having populated req.user
 * - checks that req.user.caps includes all required caps
 */
@Injectable()
export class CapsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const reqCaps =
      this.reflector.getAllAndOverride<string[]>(REQ_CAPS_KEY, [ctx.getHandler(), ctx.getClass()]) || [];

    if (reqCaps.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    const userCaps: string[] = Array.isArray(user?.caps) ? user.caps : [];
    return reqCaps.every((c) => userCaps.includes(c));
  }
}
