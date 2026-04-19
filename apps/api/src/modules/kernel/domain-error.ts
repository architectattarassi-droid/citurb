import { HttpException } from "@nestjs/common";
import type { PublicErrorPayload } from "@citurbarea/contracts";

export type DoctrinePointer = {
  rule_id: string;
  error_code: string;
  category: string;
  severity: string;
  incident_id: string;
  public_code?: string;
  sources?: string[];
};

export class DomainError extends HttpException {
  public readonly doctrine: DoctrinePointer;
  public readonly publicPayload: PublicErrorPayload;

  constructor(messagePublic: string, status: number, doctrine: DoctrinePointer) {
    const payload: PublicErrorPayload = {
      error: messagePublic,
      incident_id: doctrine.incident_id,
      code: doctrine.public_code,
    };
    super(payload, status);
    this.doctrine = doctrine;
    this.publicPayload = payload;
  }
}
