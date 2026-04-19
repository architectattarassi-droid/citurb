"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainError = void 0;
const common_1 = require("@nestjs/common");
class DomainError extends common_1.HttpException {
    doctrine;
    publicPayload;
    constructor(messagePublic, status, doctrine) {
        const payload = {
            error: messagePublic,
            incident_id: doctrine.incident_id,
            code: doctrine.public_code,
        };
        super(payload, status);
        this.doctrine = doctrine;
        this.publicPayload = payload;
    }
}
exports.DomainError = DomainError;
