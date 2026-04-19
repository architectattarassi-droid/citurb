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
exports.FirmResolverMiddleware = void 0;
const common_1 = require("@nestjs/common");
const firm_service_1 = require("./firm.service");
let FirmResolverMiddleware = class FirmResolverMiddleware {
    firmService;
    constructor(firmService) {
        this.firmService = firmService;
    }
    async use(req, res, next) {
        // Priority 1 : explicit header X-Firm-Slug (dev local / API gateway)
        const xFirmSlug = req.headers['x-firm-slug'];
        // Priority 2 : subdomain (ex: arcbati.citurbarea.com → arcbati)
        const host = req.headers.host || '';
        let slug = xFirmSlug || null;
        if (!slug) {
            const parts = host.split('.');
            if (parts.length >= 3) {
                const sub = parts[0];
                if (sub !== 'www' && sub !== 'citurbarea' && sub !== 'localhost') {
                    slug = sub;
                }
            }
        }
        if (slug) {
            try {
                const firm = await this.firmService.findBySlug(slug);
                if (firm) {
                    req.firmId = firm.id;
                    req.firmSlug = firm.slug;
                }
            }
            catch {
                // Non-bloquant : si la firm n'existe pas, on continue sans isolation
            }
        }
        next();
    }
};
exports.FirmResolverMiddleware = FirmResolverMiddleware;
exports.FirmResolverMiddleware = FirmResolverMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firm_service_1.FirmService])
], FirmResolverMiddleware);
