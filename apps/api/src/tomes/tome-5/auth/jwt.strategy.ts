import { Injectable } from "@nestjs/common";
import { capsFor, entitlementsFor } from "./rbac";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extract from Authorization: Bearer ... OR ?_t=<jwt> query (needed for
      // <iframe>/<img> downloads where browser can't set Authorization header).
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter("_t"),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "dev-secret-change-me",
    });
  }

  async validate(payload: any) {
    // payload: { sub, role, email }
    return {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      caps: capsFor(payload.role),
      entitlements: entitlementsFor(payload.role),
    };
  }
}
