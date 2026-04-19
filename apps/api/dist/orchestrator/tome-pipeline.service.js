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
exports.TomePipelineService = void 0;
const common_1 = require("@nestjs/common");
const tome_0_service_1 = require("../tomes/tome-0/tome-0.service");
const tome_1_service_1 = require("../tomes/tome-1/tome-1.service");
const tome_2_service_1 = require("../tomes/tome-2/tome-2.service");
const tome_3_service_1 = require("../tomes/tome-3/tome-3.service");
const tome_4_service_1 = require("../tomes/tome-4/tome-4.service");
const tome_6_service_1 = require("../tomes/tome-6/tome-6.service");
const tome_7_service_1 = require("../tomes/tome-7/tome-7.service");
const tome_8_service_1 = require("../tomes/tome-8/tome-8.service");
const tome_10_service_1 = require("../tomes/tome-10/tome-10.service");
let TomePipelineService = class TomePipelineService {
    tome0;
    tome1;
    tome2;
    tome3;
    tome4;
    tome6;
    tome7;
    tome8;
    tome10;
    constructor(tome0, tome1, tome2, tome3, tome4, tome6, tome7, tome8, tome10) {
        this.tome0 = tome0;
        this.tome1 = tome1;
        this.tome2 = tome2;
        this.tome3 = tome3;
        this.tome4 = tome4;
        this.tome6 = tome6;
        this.tome7 = tome7;
        this.tome8 = tome8;
        this.tome10 = tome10;
    }
    health() {
        // cheap check that DI is wired
        return {
            tome0: !!this.tome0,
            tome1: !!this.tome1,
            tome2: !!this.tome2,
            tome3: !!this.tome3,
            tome4: !!this.tome4,
            // Tome 5 is the auth layer. It is not a pipeline service in V1 P0.
            tome5: false,
            tome6: !!this.tome6,
            tome7: !!this.tome7,
            tome8: !!this.tome8,
            // Tome 9 is ops layer. It is not a pipeline service in V1 P0.
            tome9: false,
            tome10: !!this.tome10,
        };
    }
};
exports.TomePipelineService = TomePipelineService;
exports.TomePipelineService = TomePipelineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_0_service_1.Tome0Service,
        tome_1_service_1.Tome1Service,
        tome_2_service_1.Tome2Service,
        tome_3_service_1.Tome3Service,
        tome_4_service_1.Tome4Service,
        tome_6_service_1.Tome6Service,
        tome_7_service_1.Tome7Service,
        tome_8_service_1.Tome8Service,
        tome_10_service_1.Tome10FinancingService])
], TomePipelineService);
