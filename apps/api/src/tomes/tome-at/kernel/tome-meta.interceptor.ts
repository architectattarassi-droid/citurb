import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { raiseDoctrine } from '../../../modules/kernel/raise-doctrine';
import { META_RULE, META_TOME } from './tome.decorators';

/**
 * Tome @ — META gate.
 *
 * Any request hitting an HTTP handler that is not tagged with @Tome()
 * is considered a doctrine violation: the codebase drifted and created
 * an endpoint outside the Tome system.
 */
@Injectable()
export class TomeMetaInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const tome =
      this.reflector.get<string>(META_TOME, handler) ??
      this.reflector.get<string>(META_TOME, controller);

    // Rule is optional on purely informational endpoints, but Tome is mandatory.
    if (!tome) {
      // DEV fallback: allow local runs even if some endpoints are not yet tagged.
      // Production remains strict unless explicitly bypassed.
      const allowUntagged =
        process.env.CIT_ALLOW_UNTAGGED === '1' ||
        process.env.NODE_ENV !== 'production';

      if (!allowUntagged) {
        // Note: we throw synchronously; Nest will catch it in the global filter
        raiseDoctrine({
          messagePublic: 'Action impossible.',
          httpStatus: 500,
          rule_id: 'T@-META-005' as any,
          error_code: 'ERR-T@-META-UNSCOPED_ENDPOINT',
          public_code: 'CIT-500-0001',
          category: 'DOCTRINE_BLOCK',
          severity: 'CRITICAL',
          sources: ['T@-META-005', 'T@-META-006'],
        });
      }

      // Default scope for untagged endpoints (DEV only).
      (context.switchToHttp().getRequest() as any).__tome = 'kernel';
    }

    // If a Rule is present, it MUST look like a stable RuleID (basic sanity).
    const rule = this.reflector.get<string>(META_RULE, handler);
    if (rule && !/^T\d|^T@/.test(rule)) {
      raiseDoctrine({
        messagePublic: 'Action impossible.',
        httpStatus: 500,
        rule_id: 'T@-META-001' as any,
        error_code: 'ERR-T@-META-BAD_RULE_ID',
        public_code: 'CIT-500-0002',
        category: 'DOCTRINE_BLOCK',
        severity: 'CRITICAL',
        sources: ['T@-META-001'],
      });
    }

    return next.handle();
  }
}

export default TomeMetaInterceptor;
