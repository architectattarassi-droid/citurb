import React, { createContext, useContext, useEffect, useMemo } from "react";
import { setToken } from "../../tomes/tome4/apiClient";

/**
 * AUTH PROVIDER — compte client de l'ancienne API (JWT), éteinte.
 *
 * L'API NestJS qui délivrait et vérifiait les jetons (/auth/login, /auth/me,
 * /auth/send-otp…) ne tourne plus : aucun visiteur ne peut être « connecté »
 * par ce biais. L'état est donc toujours « non connecté », les jetons hérités
 * sont purgés (ils donnaient l'illusion d'une session et déclenchaient des
 * appels vers des routes absentes), et les actions de connexion échouent avec
 * un message clair. Les écrans protégés redirigent vers /login, qui oriente
 * vers ce qui fonctionne (lien d'espace RDV, /creer-compte, accès fournisseur
 * par code, /cc/login pour l'équipe).
 *
 * Le compte client léger (lien/code + cookie signé, Pages Functions) est le
 * lot 3a de docs/architecture/plan-rebranchement.md ; l'API publique de ce
 * contexte (useAuth) reste identique pour ne pas toucher aux appelants.
 */

type AuthState = {
  isAuthed: boolean;
  userId?: string;
  email?: string;
  username?: string;
  role?: 'ADMIN' | 'CLIENT' | 'OWNER';
  token?: string | null;
  phone?: string;
  phoneVerifiedAt?: number | null;
  loading: boolean;
};

type AuthApi = AuthState & {
  /** identifier can be email OR username (normalized). */
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  startPhoneVerification: (phone: string) => Promise<void>;
  verifyPhoneOtp: (otp: string) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<AuthApi | null>(null);

const INDISPONIBLE = "La connexion par mot de passe n'est plus disponible. Utilisez le lien reçu, ou décrivez votre projet sur /creer-compte.";
const refuser = async (): Promise<void> => { throw new Error(INDISPONIBLE); };

const ETAT: AuthState = {
  isAuthed: false,
  loading: false,
  token: null,
  phoneVerifiedAt: null,
};

/** Retire les traces de l'ancienne session (jeton JWT, utilisateur mis en cache). */
function purgerSessionHeritee() {
  try {
    setToken(null);
    localStorage.removeItem("citurbarea_user");
    localStorage.removeItem("citurbarea_token");
  } catch { /* stockage indisponible */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { purgerSessionHeritee(); }, []);

  const api = useMemo<AuthApi>(() => ({
    ...ETAT,
    loginWithPassword: refuser,
    signup: refuser,
    startPhoneVerification: refuser,
    verifyPhoneOtp: refuser,
    logout: purgerSessionHeritee,
  }), []);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
