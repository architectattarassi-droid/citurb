"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsHubModule = void 0;
const common_1 = require("@nestjs/common");
const email_module_1 = require("../email/email.module");
const twilio_module_1 = require("../twilio/twilio.module");
const notifications_hub_controller_1 = require("./notifications-hub.controller");
const notifications_hub_service_1 = require("./notifications-hub.service");
const preferences_service_1 = require("./preferences.service");
const templates_service_1 = require("./templates.service");
const email_channel_1 = require("./channels/email.channel");
const sms_channel_1 = require("./channels/sms.channel");
const whatsapp_channel_1 = require("./channels/whatsapp.channel");
const push_channel_1 = require("./channels/push.channel");
/**
 * NotificationsHubModule — Tome 0 (infra cross-tomes).
 *
 * @Global() : tout autre module peut injecter `NotificationsHubService`
 * sans avoir à importer ce module — il suffit qu'il soit dans `AppModule.imports`.
 *
 * Coexiste avec les modules existants `client-notify` / `owner-notify` /
 * `email` / `twilio` : ce hub les complète sans les remplacer ; les modules
 * legacy continuent à fonctionner.
 */
let NotificationsHubModule = class NotificationsHubModule {
};
exports.NotificationsHubModule = NotificationsHubModule;
exports.NotificationsHubModule = NotificationsHubModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [email_module_1.EmailModule, twilio_module_1.TwilioModule],
        controllers: [notifications_hub_controller_1.NotificationsHubController],
        providers: [
            notifications_hub_service_1.NotificationsHubService,
            preferences_service_1.PreferencesService,
            templates_service_1.TemplatesService,
            email_channel_1.EmailChannel,
            sms_channel_1.SmsChannel,
            whatsapp_channel_1.WhatsappChannel,
            push_channel_1.PushChannel,
        ],
        exports: [notifications_hub_service_1.NotificationsHubService, preferences_service_1.PreferencesService, templates_service_1.TemplatesService],
    })
], NotificationsHubModule);
