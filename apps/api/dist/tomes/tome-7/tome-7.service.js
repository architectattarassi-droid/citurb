"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome7Service = void 0;
const common_1 = require("@nestjs/common");
/**
 * Tome 7 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 7 live in the doctrine docs and are implemented incrementally.
 */
let Tome7Service = class Tome7Service {
    tome = "T7";
    async handle(ctx) {
        // No-op by default. Future implementation will apply Tome 7 rules.
        return ctx;
    }
};
exports.Tome7Service = Tome7Service;
exports.Tome7Service = Tome7Service = __decorate([
    (0, common_1.Injectable)()
], Tome7Service);
