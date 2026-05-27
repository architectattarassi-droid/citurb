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
exports.SmsChannel = void 0;
const common_1 = require("@nestjs/common");
const twilio_service_1 = require("../../twilio/twilio.service");
/**
 * SmsChannel — wrap `TwilioService` (Programmable Messaging).
 *
 * Le hub appelle `send(toE164, rendered)` ; on tronque à 160 caractères et
 * on retombe sur `bodyInAppDescription` si pas de `bodyText`.
 */
let SmsChannel = class SmsChannel {
    twilio;
    log = new common_1.Logger("HubSmsChannel");
    constructor(twilio) {
        this.twilio = twilio;
    }
    async send(toE164, rendered) {
        if (!toE164 || !toE164.startsWith("+")) {
            return { success: false, error: "Numéro E.164 requis (format +212…)" };
        }
        const body = (rendered.bodyText || rendered.bodyInAppDescription || rendered.bodyInAppTitle || "CITURBAREA").slice(0, 160);
        const r = await this.twilio.sendSms(toE164, body);
        if (!r.ok) {
            this.log.warn(`[HubSms] échec envoi à ${toE164}: ${r.error}`);
            return { success: false, error: r.error };
        }
        return { success: true, externalId: r.messageId };
    }
};
exports.SmsChannel = SmsChannel;
exports.SmsChannel = SmsChannel = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [twilio_service_1.TwilioService])
], SmsChannel);
