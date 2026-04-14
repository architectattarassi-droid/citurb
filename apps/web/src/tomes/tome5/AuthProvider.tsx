import React, { createContext, useContext, useMemo, useState } from "react";
import { login, setToken, getToken, apiFetch } from "../../tomes/tome4/apiClient";

/**
 * AUTH PROVIDER — JWT réel via API
 * Login: POST /auth/login → { access_token, user: { id, email, role } }
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

function normIdentifier(v: string) {
  return (v || "").trim().toLowerCase();
}

function phoneKey(uid: string) {
  return `citurbarea:auth:phone:${uid}:v1`;
}

function phoneVerifiedKey(uid: string) {
  return `citurbarea:auth:phone_verified_at:${uid}:v1`;
}

function otpKey(uid: string) {
  return `citurbarea:auth:phone_otp:${uid}:v1`;
}

function p1PhoneVerifiedKey(uid: string) {
  return `citurbarea:p1:phone_verified_at:${uid}:v1`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const savedToken = getToken();
    if (savedToken) {
      try {
        const savedUser = localStorage.getItem('citurbarea_user');
        if (savedUser) {
          const u = JSON.parse(savedUser);
          const phone = localStorage.getItem(phoneKey(u.userId)) || undefined;
          const phoneVerifiedAtRaw = localStorage.getItem(phoneVerifiedKey(u.userId));
          const phoneVerifiedAt = phoneVerifiedAtRaw ? Number(phoneVerifiedAtRaw) : null;
          return {
            isAuthed: true,
            userId: u.userId,
            email: u.email,
            role: u.role,
            token: savedToken,
            phone,
            phoneVerifiedAt: Number.isFinite(phoneVerifiedAt) ? phoneVerifiedAt : null,
            loading: false,
          };
        }
      } catch {}
    }
    return {
      isAuthed: false,
      loading: false,
      token: null,
      userId: undefined,
      email: undefined,
      username: undefined,
      role: undefined,
      phone: undefined,
      phoneVerifiedAt: null,
    };
  });

  const loginWithPassword = async (identifier: string, password: string) => {
    const resp = await login(identifier, password);
    setToken(resp.access_token);
    const u = { userId: resp.user.id, email: resp.user.email, role: resp.user.role as AuthState['role'] };
    localStorage.setItem('citurbarea_user', JSON.stringify(u));
    // Migrate anon draft to real user if present and real user has no draft yet
    const anonKey = `citurbarea:p1:draft:anon:v1`;
    const realKey = `citurbarea:p1:draft:${u.userId}:v1`;
    const anonDraft = localStorage.getItem(anonKey);
    if (anonDraft && !localStorage.getItem(realKey)) {
      localStorage.setItem(realKey, anonDraft);
    }
    setState({ isAuthed: true, ...u, token: resp.access_token, loading: false, phone: undefined, phoneVerifiedAt: null, username: undefined });
  };

  const signup = async (email: string, password: string, username: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const emailN = normIdentifier(email);
    const usernameN = normIdentifier(username);
    const pass = (password || "").trim();

    const users = JSON.parse(localStorage.getItem('citurbarea_users') || '[]');
    if (users.some((u: any) => normIdentifier(u?.email) === emailN)) {
      throw new Error('Cet email est déjà utilisé');
    }
    if (users.some((u: any) => normIdentifier(u?.username) === usernameN)) {
      throw new Error("Ce nom d'utilisateur est déjà utilisé");
    }

    const newUser = {
      userId: `client-${Date.now()}`,
      email: emailN,
      password: pass,
      username: usernameN,
      role: 'CLIENT' as const,
    };

    users.push(newUser);
    localStorage.setItem('citurbarea_users', JSON.stringify(users));
    await loginWithPassword(emailN, pass);
  };

  const startPhoneVerification = async (phone: string) => {
    if (!state.isAuthed) throw new Error('Vous devez être connecté');
    await apiFetch('/auth/send-otp', { method: 'POST', body: { phone } });
    setState(s => ({ ...s, phone }));
  };

  const verifyPhoneOtp = async (otp: string) => {
    if (!state.isAuthed || !state.phone) throw new Error('Numéro manquant');
    await apiFetch('/auth/verify-otp', { method: 'POST', body: { phone: state.phone, code: otp } });
    const ts = Date.now();
    localStorage.setItem(p1PhoneVerifiedKey(state.userId!), JSON.stringify(ts));
    setState(s => ({ ...s, phoneVerifiedAt: ts }));
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('citurbarea_user');
    localStorage.removeItem('citurbarea_token');
    setState({
      isAuthed: false,
      userId: undefined,
      email: undefined,
      username: undefined,
      role: undefined,
      token: null,
      loading: false,
      phone: undefined,
      phoneVerifiedAt: null,
    });
  };

  const api = useMemo<AuthApi>(
    () => ({ ...state, loginWithPassword, signup, startPhoneVerification, verifyPhoneOtp, logout }),
    [state]
  );

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
