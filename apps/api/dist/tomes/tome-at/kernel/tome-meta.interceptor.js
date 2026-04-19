"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TomeMetaInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const raise_doctrine_1 = require("../../../modules/kernel/raise-doctrine");
const tome_decorators_1 = require("./tome.decorators");
/**
 * Tome @ — META gate.
 *
 * Any request hitting an HTTP handler that is not tagged with @Tome()
 * is considered a doctrine violation: the codebase drifted and created
 * an endpoint outside the Tome system.
 */
let TomeMetaInterceptor = class TomeMetaInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const handler = context.getHandler();
        const controller = context.getClass();
        const tome = this.reflector.get(tome_decorators_1.META_TOME, handler) ??
            this.reflector.get(tome_decorators_1.META_TOME, controller);
        // Rule is optional on purely informational endpoints, but Tome is mandatory.
        if (!tome) {
            // DEV fallback: allow local runs even if some endpoints are not yet tagged.
            // Production remains strict unless explicitly bypassed.
            const allowUntagged = process.env.CIT_ALLOW_UNTAGGED === '1' ||
                process.env.NODE_ENV !== 'production';
            if (!allowUntagged) {
                // Note: we throw synchronously; Nest will catch it in the global filter
                (0, raise_doctrine_1.raiseDoctrine)({
                    messagePublic: 'Action impossible.',
                    httpStatus: 500,
                    rule_id: 'T@-META-005',
                    error_code: 'ERR-T@-META-UNSCOPED_ENDPOINT',
                    public_code: 'CIT-500-0001',
                    category: 'DOCTRINE_BLOCK',
                    severity: 'CRITICAL',
                    sources: ['T@-META-005', 'T@-META-006'],
                });
            }
            // Default scope for untagged endpoints (DEV only).
            context.switchToHttp().getRequest().__tome = 'kernel';
        }
        // If a Rule is present, it MUST look like a stable RuleID (basic sanity).
        const rule = this.reflector.get(tome_decorators_1.META_RULE, handler);
        if (rule && !/^T\d|^T@/.test(rule)) {
            (0, raise_doctrine_1.raiseDoctrine)({
                messagePublic: 'Action impossible.',
                httpStatus: 500,
                rule_id: 'T@-META-001',
                error_code: 'ERR-T@-META-BAD_RULE_ID',
                public_code: 'CIT-500-0002',
                category: 'DOCTRINE_BLOCK',
                severity: 'CRITICAL',
                sources: ['T@-META-001'],
            });
        }
        return next.handle();
    }
};
exports.TomeMetaInterceptor = TomeMetaInterceptor;
exports.TomeMetaInterceptor = TomeMetaInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], TomeMetaInterceptor);
exports.default = TomeMetaInterceptor;
