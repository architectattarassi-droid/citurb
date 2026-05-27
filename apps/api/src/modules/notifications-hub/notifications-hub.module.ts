import { Global, Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { TwilioModule } from "../twilio/twilio.module";
import { NotificationsHubController } from "./notifications-hub.controller";
import { NotificationsHubService } from "./notifications-hub.service";
import { PreferencesService } from "./preferences.service";
import { TemplatesService } from "./templates.service";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { WhatsappChannel } from "./channels/whatsapp.channel";
import { PushChannel } from "./channels/push.channel";

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
@Global()
@Module({
  imports: [EmailModule, TwilioModule],
  controllers: [NotificationsHubController],
  providers: [
    NotificationsHubService,
    PreferencesService,
    TemplatesService,
    EmailChannel,
    SmsChannel,
    WhatsappChannel,
    PushChannel,
  ],
  exports: [NotificationsHubService, PreferencesService, TemplatesService],
})
export class NotificationsHubModule {}
