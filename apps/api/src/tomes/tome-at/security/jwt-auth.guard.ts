import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Kernel-level guard.
 *
 * NOTE: This guard depends only on the presence of a registered "jwt" strategy.
 * The strategy itself can live in a later tome (e.g. tome-5/auth) without creating
 * forbidden import direction.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
