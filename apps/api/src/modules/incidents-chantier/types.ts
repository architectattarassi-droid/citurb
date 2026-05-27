/**
 * incidents-chantier/types.ts — Types partagés du module Incidents Chantier (Tome 3).
 *
 * Le module gère :
 *  - Déclaration et timeline des incidents terrain (accident, vol, météo, etc.)
 *  - Bouton SOS (alerte multi-canal : SMS Twilio + WhatsApp + email + push)
 *  - Replan automatique des tâches météo-sensibles via OpenMeteo
 */

export type IncidentChantierType =
  | "ACCIDENT_TRAVAIL"
  | "VOL_CHANTIER"
  | "EFFONDREMENT"
  | "INCENDIE"
  | "INTRUSION"
  | "METEO_DOMMAGE"
  | "LITIGE_VOISINAGE"
  | "NON_CONFORMITE"
  | "AUTRE";

export type IncidentSeverite = "INFO" | "WARN" | "CRITICAL";

export type IncidentStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "SOS_TRIGGERED"
  | "RESOLVED"
  | "ARCHIVED";

export type IncidentGeoloc = {
  lat: number;
  lng: number;
  altitudeM?: number | null;
  accuracyM?: number | null;
  capturedAt?: string | null;
};

export type IncidentPhoto = {
  url: string;
  takenAt?: string | null;
  geoloc?: IncidentGeoloc | null;
};

export type IncidentActionType =
  | "DECLARED"
  | "PHOTO_ADDED"
  | "SOS_TRIGGERED"
  | "FAMILY_NOTIFIED"
  | "LAWYER_NOTIFIED"
  | "OPS_NOTIFIED"
  | "INSURANCE_CONTACTED"
  | "CNSS_DECLARED"
  | "POLICE_REPORT_FILED"
  | "EXPERTISE_REQUESTED"
  | "REPAIR_STARTED"
  | "CHANTIER_SUSPENDED"
  | "CHANTIER_RESUMED"
  | "STATUS_CHANGED"
  | "NOTE"
  | "RESOLVED";

export type IncidentAction = {
  id: string;
  ts: string;          // ISO date
  type: IncidentActionType;
  actorId?: string | null;
  actorRole?: string | null;
  payload?: Record<string, any>;
};

export type IncidentDeclaration = {
  type: IncidentChantierType;
  description: string;
  severite?: IncidentSeverite;
  photos?: IncidentPhoto[];
  geoloc?: IncidentGeoloc | null;
  dateConstatation?: string;
  blessesNb?: number;
  montantDommageEstimeMad?: number;
};

export type IncidentChantier = {
  id: string;
  dossierId: string;
  numero: string;                 // INC-YYYYMMDD-NNN
  type: IncidentChantierType;
  description: string;
  severite: IncidentSeverite;
  status: IncidentStatus;
  photos: IncidentPhoto[];
  geoloc: IncidentGeoloc | null;
  dateConstatation: string;
  dateResolution?: string | null;
  blessesNb?: number | null;
  montantDommageEstimeMad?: number | null;
  montantIndemniseMad?: number | null;
  leconApprise?: string | null;
  actions: IncidentAction[];
  sosTriggered: boolean;
  sosTriggeredAt?: string | null;
  notifiedParties?: NotifiedParty[];
  partiesEmergency?: string[];   // codes emergency-contacts notifiés
  reporterId?: string | null;
  reporterRole?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotifiedParty = {
  channel: "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  toMasked: string;        // masqué pour audit (e.g. +212 6** ** ** 76)
  ok: boolean;
  ts: string;
  ref?: string;            // messageId Twilio / Resend
};

// ── Weather replan ────────────────────────────────────────────────

export type WeatherDailyForecast = {
  date: string;             // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
  precipProbabilityPct: number;
  windKmh: number;
  weatherCode: number;      // WMO weather code
  cherguiRisk: boolean;     // tempMax >= 40°C
  rainRisk: boolean;        // precipProbabilityPct >= 60 || precipMm >= 5
};

export type WeatherSensitiveTask =
  | "BETONNAGE"
  | "ETANCHEITE"
  | "PEINTURE_EXTERIEURE"
  | "TOITURE"
  | "VRD"
  | "MAÇONNERIE_EXT";

export type WeatherAlert = {
  date: string;
  type: "CHERGUI" | "PLUIE" | "VENT_FORT" | "GEL";
  affectedTasks: WeatherSensitiveTask[];
  suggestion: string;
  replanToDate?: string;
};

export type WeatherReplanSuggestion = {
  generatedAt: string;
  forecast: WeatherDailyForecast[];
  alerts: WeatherAlert[];
};

// ── Emergency contacts ────────────────────────────────────────────

export type EmergencyContact = {
  code: string;
  label: string;
  tel: string;
  email: string | null;
  type: "MEDICAL" | "RESCUE" | "SECURITY" | "ADMINISTRATIVE" | "PLATFORM";
  priority: number;
  available24_7: boolean;
  trigger: string[];
  legalDeadlineHours?: number;
};

export type IncidentTypeDef = {
  code: IncidentChantierType;
  label: string;
  labelAr: string;
  icon: string;
  color: string;
  severityDefault: IncidentSeverite;
  procedure: string[];
  legalText: string;
  autoNotify: string[];
  autoSuspendChantier: boolean;
};
