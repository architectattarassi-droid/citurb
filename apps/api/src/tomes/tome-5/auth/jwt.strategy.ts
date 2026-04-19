import { Injectable } from "@nestjs/common";
import { capsFor, entitlementsFor } from "./rbac";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
