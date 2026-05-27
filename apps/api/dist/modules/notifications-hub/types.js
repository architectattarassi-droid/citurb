"use strict";
/**
 * notifications-hub/types.ts
 *
 * Types partagés du module Notifications Hub centralisé.
 *
 * Concepts :
 *  - HubEventType : type d'événement métier déclencheur (DOSSIER_CREE, PAIEMENT_RECU…)
 *  - HubChannel   : canal de livraison (EMAIL, SMS, WHATSAPP, PUSH, IN_APP)
 *  - HubLang      : langue cible (fr / ar / en)
 *
 * Le service unique `NotificationsHubService.dispatch(...)` résout les
 * préférences utilisateur, sélectionne les canaux actifs, rend les templates,
 * envoie sur chaque canal et stocke la copie IN_APP en base (Notification table).
 */
Object.defineProperty(exports, "__esModule", { value: true });
