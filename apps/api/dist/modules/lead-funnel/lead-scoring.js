"use strict";
/**
 * lead-scoring.ts
 *
 * Algorithme de scoring lead (0–100).
 *
 * Pondération doctrinale (cf. brief growth) :
 *   +20  budget > 500 000 MAD
 *   +15  email + tél valides
 *   +15  projet immédiat (< 6 mois)
 *   +10  ville top (Casablanca / Rabat / Marrakech / Tanger)
 *   +10  return visitor
 *   +10  remplit wizard P1-P5 jusqu'à étape 3+
 *   +20  répond à l'email J+1 sous 24h
 *
 * Le score est borné à [0, 100]. Le breakdown est conservé pour audit /
 * shadow view backoffice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidMaPhone = isValidMaPhone;
exports.isValidEmail = isValidEmail;
exports.computeLeadScore = computeLeadScore;
exports.rescoreLead = rescoreLead;
const VILLES_TOP = new Set([
    "casablanca",
    "casa",
    "rabat",
    "marrakech",
    "marrakesh",
    "tanger",
    "tangier",
]);
/** Validation tél marocain : +212 ou 0, puis 5/6/7 + 8 chiffres. */
function isValidMaPhone(t) {
    if (!t)
        return false;
    return /^(\+212|0)[567]\d{8}$/.test(t.replace(/[\s\-]/g, ""));
}
function isValidEmail(e) {
    if (!e)
        return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
function computeLeadScore(input) {
    const b = {
        budget: 0,
        contact: 0,
        urgency: 0,
        ville: 0,
        return: 0,
        wizard: 0,
        response: 0,
    };
    if ((input.budget ?? 0) > 500_000)
        b.budget = 20;
    if (isValidEmail(input.email) && isValidMaPhone(input.telephone)) {
        b.contact = 15;
    }
    if (typeof input.delaiMois === "number" && input.delaiMois < 6) {
        b.urgency = 15;
    }
    if (input.ville && VILLES_TOP.has(input.ville.trim().toLowerCase())) {
        b.ville = 10;
    }
    if (input.returnVisitor === true)
        b.return = 10;
    if (typeof input.wizardStep === "number" && input.wizardStep >= 3) {
        b.wizard = 10;
    }
    if (typeof input.respondedJ1WithinHours === "number" &&
        input.respondedJ1WithinHours < 24) {
        b.response = 20;
    }
    const score = Math.min(100, Math.max(0, Object.values(b).reduce((a, v) => a + v, 0)));
    return { score, breakdown: b };
}
/** Recalcule à partir d'un lead persisté. */
function rescoreLead(lead) {
    return computeLeadScore({
        budget: lead.budget,
        email: lead.email,
        telephone: lead.telephone,
        delaiMois: lead.delaiMois,
        ville: lead.ville,
        returnVisitor: lead.returnVisitor,
        wizardStep: lead.wizardStep,
        // respondedJ1WithinHours : déduit de events (EMAIL_REPLIED dans 24h après CREATED)
        respondedJ1WithinHours: detectJ1Response(lead),
    });
}
function detectJ1Response(lead) {
    const created = new Date(lead.createdAt).getTime();
    const reply = lead.events.find((e) => e.kind === "EMAIL_REPLIED");
    if (!reply)
        return undefined;
    const dt = new Date(reply.at).getTime() - created;
    return dt > 0 ? dt / (1000 * 60 * 60) : undefined;
}
