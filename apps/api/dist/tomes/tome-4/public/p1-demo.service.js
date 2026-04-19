"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1DemoService = void 0;
const common_1 = require("@nestjs/common");
let P1DemoService = class P1DemoService {
    // Phase A (P0): stub service to keep module wiring stable.
    // Real demo/preview logic comes later (after engine boots).
    ping() {
        return { ok: true, note: "p1-demo stub" };
    }
};
exports.P1DemoService = P1DemoService;
exports.P1DemoService = P1DemoService = __decorate([
    (0, common_1.Injectable)()
], P1DemoService);
