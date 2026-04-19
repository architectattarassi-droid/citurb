import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { HDR_TOME_CHAIN, TOME_CHAIN_V1, RULES } from "@citurbarea/contracts";
import { raiseDoctrine } from "../../modules/kernel/raise-doctrine";

/**
 * TomeChainGuard
 * Enforces that any *mutation* call carries the canonical tome-chain header.
 * This is a contract guard to prevent accidental drift of clients/frontends.
 * Security still relies on Auth/Door/Permission/Entitlement/State guards.
 */
@Injectable()
export class TomeChainGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();

    const header = (req.headers?.[HDR_TOME_CHAIN] ?? req.headers?.[HDR_TOME_CHAIN.toLowerCase()]) as
      | string
      | undefined;

    if (!header || header !== TOME_CHAIN_V1) {
      raiseDoctrine({
        messagePublic: "Action impossible (contrat client invalide).",
        httpStatus: 409,
        rule_id: RULES.CONTRACT_TOME_CHAIN_REQUIRED,
        error_code: "ERR-T@-CONTRACT-001-TOME_CHAIN_REQUIRED",
        category: "DOCTRINE_BLOCK",
        severity: "WARN",
        sources: [RULES.CONTRACT_TOME_CHAIN_REQUIRED],
        public_code: "CIT-409-0001",
      });
    }
    return true;
  }
}
