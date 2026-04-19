"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome4Service = void 0;
const common_1 = require("@nestjs/common");
/**
 * Tome 4 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 4 live in the doctrine docs and are implemented incrementally.
 */
let Tome4Service = class Tome4Service {
    tome = "T4";
    async handle(ctx) {
        // No-op by default. Future implementation will apply Tome 4 rules.
        return ctx;
    }
};
exports.Tome4Service = Tome4Service;
exports.Tome4Service = Tome4Service = __decorate([
    (0, common_1.Injectable)()
], Tome4Service);
