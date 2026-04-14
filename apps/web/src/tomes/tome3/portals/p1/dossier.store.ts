/**
 * P1 Dossier Store — état local persisté (localStorage)
 * Doctrine: frontend = affichage d'état, jamais de logique métier.
 * En production, l'état canonical vient du backend (Tome 3 state machine).
 * Ici : prototype fonctionnel avec persistance locale.
 */

import type { ProjectType } from "../../../../domain/p1/types";

export type DossierPhase =
  | "E1_LANDING"
  | "E2_QUALIFICATION"
  | "E2B_URBANISME"
  | "E3_DOCUMENTS"
  | "E4_PACK"
  | "E5_DISCLAIMER"
  | "E6_PAYMENT"
  | "E7_ACTIVE"
  | "E8_PRODUCTION"
  | "E9_AUTORISATION"
  | "E10_CHANTIER"
  | "E11_VALIDATION"
  | "E12_CLOTURE"
  | "EC_GEL";

export type PhaseStatus = "locked" | "pending" | "active" | "done" | "blocked";

export type ProductionSubPhase = "E8_1_ESQUISSE" | "E8_2_APS" | "E8_3_APD" | "E8_4_AUTO";
export type ChantierJalon = "FONDATIONS" | "DALLE_RDC" | "DALLE_ETG" | "TOITURE" | "FINITIONS";

export type Document = {
  id: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  fileName?: string;
  uploadedAt?: string;
  note?: string;
};

export type LogEntry = {
  id: string;
  date: string;
  phase: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
};

export type ChatMessage = {
  id: string;
  date: string;
  role: "user" | "agent";
  message: string;
  // pour audit et anti-capture : pourquoi l'agent a répondu / refusé
  classification: "project" | "blocked" | "curiosity" | "other";
};

export type Qualification = {
  projectType: ProjectType | "";
  city: string;
  surface: string;
  budget: string;
  horizon: string;
  hasLotissement: boolean;
  lotissementRef: string;
  zonageConnu: boolean;
  zonage: string;
};

export type Dossier = {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  phase: DossierPhase;
  qualification: Qualification;
  offerId: string;
  offerTitle: string;
  disclaimerAcceptedAt?: string;
  documents: Document[];
  productionSubPhase?: ProductionSubPhase;
  autorisationCycle: number; // C1, C2, C3
  autorisationStatus?: "deposited" | "commission" | "favorable" | "defavorable" | "signed";
  chantierJalons: Record<ChantierJalon, { done: boolean; date?: string; note?: string }>;
  logs: LogEntry[];
  chat: ChatMessage[];
  ecReason?: string;
};

const STORAGE_KEY = "citurbarea_p1_dossier_v1";

const DEFAULT_DOCUMENTS: Document[] = [
  { id: "doc_titre",     label: "Titre foncier / Attestation de propriété", required: true,  uploaded: false },
  { id: "doc_cadastre",  label: "Plan cadastral",                           required: true,  uploaded: false },
  { id: "doc_contenances", label: "Fiche des contenances / Note de renseignements", required: true, uploaded: false },
  { id: "doc_cin",       label: "CIN / Passeport (copie)",                  required: true,  uploaded: false },
  { id: "doc_contrat",   label: "Contrat architecte (template auto-généré)",  required: true,  uploaded: false },
  { id: "doc_autoex",    label: "Autorisations existantes (si rénovation)", required: false, uploaded: false },
  { id: "doc_lotis",     label: "Cahier des charges lotissement",            required: false, uploaded: false },
];

const DEFAULT_JALONS: Dossier["chantierJalons"] = {
  FONDATIONS: { done: false },
  DALLE_RDC:  { done: false },
  DALLE_ETG:  { done: false },
  TOITURE:    { done: false },
  FINITIONS:  { done: false },
};

function genId(): string {
  return `P1-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function logEntry(phase: string, message: string, type: LogEntry["type"] = "info"): LogEntry {
  return { id: genId(), date: new Date().toISOString(), phase, message, type };
}

// ── Read ──────────────────────────────────────────────────────────────────
export function loadDossier(userId: string): Dossier | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Dossier;
  } catch { return null; }
}

// ── Write ─────────────────────────────────────────────────────────────────
export function saveDossier(dossier: Dossier): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY}_${dossier.userId}`,
      JSON.stringify({ ...dossier, updatedAt: new Date().toISOString() })
    );
  } catch {}
}

// ── Create ────────────────────────────────────────────────────────────────
export function createDossier(userId: string, qual: Qualification, offerId: string, offerTitle: string): Dossier {
  const d: Dossier = {
    id: genId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    phase: "E3_DOCUMENTS",
    qualification: qual,
    offerId,
    offerTitle,
    documents: [
      ...DEFAULT_DOCUMENTS.map(doc => ({
        ...doc,
        // Auto-require autorisation existante si rénovation
        required: doc.id === "doc_autoex" ? qual.projectType === "renovation" : doc.required,
        // Auto-require lotissement si déclaré
        ...(doc.id === "doc_lotis" && qual.hasLotissement ? { required: true } : {}),
      })),
    ],
    autorisationCycle: 1,
    chantierJalons: DEFAULT_JALONS,
    logs: [
      logEntry("E2", `Dossier créé — ${offerTitle} — ${qual.city}`, "success"),
      logEntry("E5", "Conditions acceptées et enregistrées", "success"),
    ],
    chat: [],
  };
  saveDossier(d);
  return d;
}

export function appendChat(dossier: Dossier, role: ChatMessage["role"], message: string, classification: ChatMessage["classification"]): Dossier {
  const entry: ChatMessage = {
    id: genId(),
    date: new Date().toISOString(),
    role,
    message,
    classification,
  };
  const d = {
    ...dossier,
    chat: [...(dossier.chat || []), entry],
  };
  saveDossier(d);
  return d;
}

// ── Transitions ───────────────────────────────────────────────────────────
export function advanceTo(dossier: Dossier, phase: DossierPhase, message?: string): Dossier {
  const d = {
    ...dossier,
    phase,
    logs: [
      ...dossier.logs,
      logEntry(phase, message ?? `Passage à la phase ${phase}`, "info"),
    ],
  };
  saveDossier(d);
  return d;
}

export function markDocumentUploaded(dossier: Dossier, docId: string, fileName: string): Dossier {
  const d = {
    ...dossier,
    documents: dossier.documents.map(doc =>
      doc.id === docId ? { ...doc, uploaded: true, fileName, uploadedAt: new Date().toISOString() } : doc
    ),
    logs: [...dossier.logs, logEntry("E3", `Document reçu : ${fileName}`, "success")],
  };
  saveDossier(d);
  return d;
}

export function areRequiredDocsUploaded(dossier: Dossier): boolean {
  return dossier.documents.filter(d => d.required).every(d => d.uploaded);
}

export function markJalon(dossier: Dossier, jalon: ChantierJalon, note?: string): Dossier {
  const d = {
    ...dossier,
    chantierJalons: {
      ...dossier.chantierJalons,
      [jalon]: { done: true, date: new Date().toISOString(), note },
    },
    logs: [...dossier.logs, logEntry("E10", `Jalon validé : ${jalon}`, "success")],
  };
  saveDossier(d);
  return d;
}

export function setProductionPhase(dossier: Dossier, sub: ProductionSubPhase): Dossier {
  const d = {
    ...dossier,
    phase: "E8_PRODUCTION" as DossierPhase,
    productionSubPhase: sub,
    logs: [...dossier.logs, logEntry("E8", `Sous-phase production : ${sub}`, "info")],
  };
  saveDossier(d);
  return d;
}

export function setAutorisationStatus(dossier: Dossier, status: Dossier["autorisationStatus"], note?: string): Dossier {
  const d = {
    ...dossier,
    phase: "E9_AUTORISATION" as DossierPhase,
    autorisationStatus: status,
    autorisationCycle: status === "defavorable" ? dossier.autorisationCycle + 1 : dossier.autorisationCycle,
    logs: [...dossier.logs, logEntry("E9", note ?? `Autorisation : ${status}`, status === "favorable" || status === "signed" ? "success" : "warning")],
  };
  saveDossier(d);
  return d;
}

export function deleteDossier(userId: string): void {
  localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
}

// S12 — sync apiStatus depuis DB vers store local
export function updateDossierApiStatus(
  userId: string,
  dossierId: string,
  apiStatus: string,
): void {
  try {
    const key = `${STORAGE_KEY}_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const store = JSON.parse(raw);
    store.apiStatus = apiStatus;
    store.apiDossierId = dossierId;
    store.apiStatusUpdatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(store));
  } catch {}
}
