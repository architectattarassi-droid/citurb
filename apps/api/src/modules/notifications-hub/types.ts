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

export type HubLang = "fr" | "ar" | "en";

export type HubChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";

/**
 * Événements métier supportés.
 * Étendre cette union → ajouter un template dans `templates.service.ts`
 * (sinon fallback générique).
 */
export type HubEventType =
  // ── Lead / onboarding
  | "LEAD_CONTACT_RECU"
  | "DOSSIER_CREE"
  | "PROFIL_VALIDE"
  // ── Permis (P1/P2)
  | "PERMIS_DEPOSE"
  | "PERMIS_COMMISSION_PROGRAMMEE"
  | "PERMIS_DECISION_FAVORABLE"
  | "PERMIS_DECISION_RESERVES"
  | "PERMIS_DECISION_REFUS"
  // ── Chantier (P3 / suivi)
  | "CHANTIER_DEMARRAGE"
  | "PV_CHANTIER_SIGNE"
  | "RETARD_DETECTE"
  | "BLOCAGE_DECLARE"
  // ── Cadence PV obligatoire (1 PV / 15 jours, doctrine T2-R-PV-CADENCE-001)
  | "PV_CADENCE_RAPPEL"
  | "CHANTIER_BLOQUE_PV"
  | "CHANTIER_DEBLOQUE_PV"
  // ── Réception / livraison
  | "RECEPTION_PROVISOIRE_PROGRAMMEE"
  | "LIVRAISON_PRETE"
  | "GARANTIE_EXPIRE_J30"
  // ── Paiements (Tome 1)
  | "PAIEMENT_RECU"
  | "PACK_VALIDE"
  | "FACTURE_DISPONIBLE"
  // ── Interactions / cercles
  | "MENTION_INTERACTION"
  | "INVITATION_CERCLE"
  | "MESSAGE_RECU"
  // ── Sécurité / compte
  | "OTP_CONNEXION"
  | "MOT_DE_PASSE_CHANGE"
  // ── Générique (fallback)
  | "INFO_GENERIQUE";

export type HubDispatchInput = {
  eventType: HubEventType;
  userId: string;
  payload?: Record<string, any>;
  /** Force la langue (sinon : préférence user OU fr) */
  lang?: HubLang;
  /** Niveau d'urgence — utilisé côté front (son/vibration push) */
  urgency?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  /** Forcer un sous-ensemble de canaux (par défaut : tous ceux actifs en prefs) */
  channels?: HubChannel[];
};

export type HubDispatchResult = {
  ok: boolean;
  eventType: HubEventType;
  userId: string;
  delivered: Array<{ channel: HubChannel; success: boolean; externalId?: string; error?: string }>;
  notifId?: string; // id de la copie IN_APP stockée
};

export type RenderedTemplate = {
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  bodyWhatsapp?: string;
  bodyPushTitle?: string;
  bodyPushBody?: string;
  bodyInAppTitle?: string;
  bodyInAppDescription?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  icon?: string;
};

/** Préférence canal-par-événement. Défaut absent = activé. */
export type ChannelPreference = {
  eventType: HubEventType;
  channel: HubChannel;
  enabled: boolean;
};

/** Web Push subscription envoyée par le client (PushSubscription.toJSON()) */
export type WebPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};
