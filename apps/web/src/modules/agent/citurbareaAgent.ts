import type { Dossier, DossierPhase } from "../../tomes/tome3/portals/p1/dossier.store";

export type AgentClassification = "project" | "blocked" | "curiosity" | "other";

// ── Garde-fous doctrine (anti-capture) ───────────────────────────────────
// L'agent répond UNIQUEMENT si la demande aide à avancer un dossier.
// Il refuse explicitement les demandes "curieuses" sur le fonctionnement interne.

const PROJECT_KEYWORDS = [
  // dossier / tunnel
  "dossier", "pack", "paiement", "facture", "devis", "activation",
  "documents", "titre foncier", "cadastre", "contenances", "note de renseignements", "cin", "passeport", "contrat",
  // études
  "esquisse", "aps", "apd", "plans", "plan", "bim",
  // autorisation
  "autorisation", "permis", "commission", "rokhas", "guichet", "dépôt", "dérogation",
  // chantier
  "chantier", "fondations", "dalle", "toiture", "pv", "réception",
  // paramètres projet
  "villa", "immeuble", "r+", "terrain", "superficie", "façade", "lotissement", "tf",
  // blocages
  "bloqué", "blocage", "erreur", "ne marche pas", "bug", "impossible",
];

const CURIOSITY_KEYWORDS = [
  "comment fonctionne", "architecture", "doctrine", "système", "systeme",
  "backend", "frontend", "api", "base de données", "base de donnees",
  "code", "source", "repo", "git", "prisma", "nest", "react",
  "business model", "pricing", "secret", "ip", "propriété intellectuelle",
  "capturer", "scraper",
];

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function classifyUserMessage(text: string): AgentClassification {
  const t = norm(text);
  const hasProject = PROJECT_KEYWORDS.some(k => t.includes(norm(k)));
  const hasCurio = CURIOSITY_KEYWORDS.some(k => t.includes(norm(k)));

  if (hasProject) return "project";
  if (hasCurio) return "curiosity";
  return "other";
}

function phaseGuide(phase: DossierPhase): string {
  // Réponse courte + actionnable, orientée "déblocage".
  switch (phase) {
    case "E3_DOCUMENTS":
      return "Vous êtes en **E3 (documents)**. Objectif : charger les 3 pièces requises (titre foncier, plan cadastral, CIN/passeport). Une fois tout reçu, vous passez au paiement.";
    case "E6_PAYMENT":
      return "Vous êtes en **E6 (paiement)**. Objectif : confirmer le paiement pour activer le dossier. Sans paiement, rien ne démarre.";
    case "E7_ACTIVE":
      return "Vous êtes en **E7 (dossier actif)**. Objectif : lancer la production (Esquisse → APS → APD → Plans autorisables).";
    case "E8_PRODUCTION":
      return "Vous êtes en **E8 (production)**. Objectif : valider les sous-phases dans l'ordre (Esquisse → APS → APD → Autorisable).";
    case "E9_AUTORISATION":
      return "Vous êtes en **E9 (autorisation)**. Objectif : suivre le cycle (déposé → commission → favorable/defavorable → signé).";
    case "E10_CHANTIER":
      return "Vous êtes en **E10 (chantier)**. Objectif : valider les jalons probatoires (fondations, dalles, toiture, finitions).";
    case "E11_VALIDATION":
      return "Vous êtes en **E11 (validation)**. Objectif : clôturer après contrôles et réception.";
    default:
      return "Vous êtes en phase avancée. Dites-moi ce qui bloque et je vous donne l'action minimale à faire.";
  }
}

export function generateAgentResponse(dossier: Dossier, userText: string): { reply: string; classification: AgentClassification } {
  const c = classifyUserMessage(userText);

  if (c === "curiosity" || c === "other") {
    return {
      classification: c,
      reply:
        "Je peux répondre **uniquement** aux questions liées à votre dossier (documents, paiement, autorisation, plans, chantier) et aux blocages concrets.\n\n"
        + "Si vous voulez comprendre le système CITURBAREA en profondeur, utilisez la **FAQ** (et je reste silencieux ici).",
    };
  }

  // Réponses "déblocage" = phase + checklist immédiate
  const guide = phaseGuide(dossier.phase);

  // Checklists dynamiques simples
  const missingDocs = dossier.documents?.filter(d => d.required && !d.uploaded) || [];
  const missingDocsLine = missingDocs.length
    ? `Documents manquants : ${missingDocs.map(d => d.label).join(" · ")}.`
    : "Tous les documents requis sont déjà chargés.";

  const reply = [
    guide,
    "",
    `📌 **Prochain pas (minimal)** :`,
    dossier.phase === "E3_DOCUMENTS"
      ? `1) Chargez les pièces requises.\n2) Cliquez "Continuer vers le paiement".`
      : dossier.phase === "E6_PAYMENT"
        ? `1) Confirmez le paiement.\n2) Cliquez "Activer le dossier".`
        : dossier.phase === "E7_ACTIVE"
          ? `1) Cliquez "Démarrer la production".\n2) Validez Esquisse.`
          : `Décrivez le blocage exact sur cette phase (1 phrase).`,
    "",
    `🔎 ${missingDocsLine}`,
  ].join("\n");

  return { reply, classification: "project" };
}
