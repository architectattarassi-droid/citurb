/**
 * signupMode.ts
 *
 * Mode d'inscription publique, fixé au build par VITE_SIGNUP_MODE :
 *  - "lead" (défaut, phase récolte) : « Créer un compte » et les parcours qui
 *    y renvoient mènent au formulaire de capture (nom + téléphone), sans
 *    aucun code SMS ou email.
 *  - "full" : parcours complet ClientSignup avec double vérification OTP.
 *
 * ClientSignup, les routes OTP et signup-verification.service restent en
 * place : repasser à "full" suffit quand SMS/emails seront fiabilisés.
 */

export type SignupMode = "lead" | "full";

export const SIGNUP_MODE: SignupMode =
  (import.meta as any).env?.VITE_SIGNUP_MODE === "full" ? "full" : "lead";
