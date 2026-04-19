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
exports.P1DemoController = void 0;
const common_1 = require("@nestjs/common");
const p1_demo_service_1 = require("./p1-demo.service");
const tome_at_1 = require("../../tome-at");
let P1DemoController = class P1DemoController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    ping() {
        return this.svc.ping();
    }
};
exports.P1DemoController = P1DemoController;
__decorate([
    (0, common_1.Get)("ping"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], P1DemoController.prototype, "ping", null);
exports.P1DemoController = P1DemoController = __decorate([
    (0, tome_at_1.Tome)('tome4'),
    (0, common_1.Controller)("tome-4/demo"),
    __metadata("design:paramtypes", [p1_demo_service_1.P1DemoService])
], P1DemoController);
