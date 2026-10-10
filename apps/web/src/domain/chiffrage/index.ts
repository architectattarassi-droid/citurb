/**
 * Chiffrage lot par lot (villa, maison R+1/R+2, immeuble R+N, mixte) :
 * référentiel sourcé → ouvrages à sous-détail → métré paramétrique → DQE.
 * Calcul 100 % local (aucun appel réseau) : utilisable dans le front public,
 * le back-office et le parcours P1.
 */
export * from "./referentiel";
export * from "./lots";
export * from "./ouvrages";
export * from "./prix";
export * from "./hypotheses";
export * from "./metre";
export * from "./dqe";
export * from "./coherence";
export * from "./correspondanceCIT";
export * from "./parcelle";
export const CHIFFRAGE_VERSION = "2026-10";
