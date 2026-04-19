"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaDossiersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaDossiersService = void 0;
const common_1 = require("@nestjs/common");
const client_dossiers_1 = require("@prisma/client-dossiers");
let PrismaDossiersService = PrismaDossiersService_1 = class PrismaDossiersService extends client_dossiers_1.PrismaClient {
    logger = new common_1.Logger(PrismaDossiersService_1.name);
    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log("PrismaDossiers connected to database.");
        }
        catch (err) {
            this.logger.warn(`PrismaDossiers could not connect (DOSSIERS_DATABASE_URL absent ou DB inaccessible). ` +
                `L'API démarre en mode dégradé — endpoints DB retourneront 503. ` +
                `Erreur : ${err?.message ?? err}`);
        }
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
        }
        catch {
            // ignore
        }
    }
};
exports.PrismaDossiersService = PrismaDossiersService;
exports.PrismaDossiersService = PrismaDossiersService = PrismaDossiersService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaDossiersService);
