/**
 * Helper bridge natif côté PWA — CITURBAREA Web
 *
 * Détecte la présence de `window.CIT_NATIVE` (injecté par l'app Capacitor)
 * et l'utilise quand disponible. Sinon, fallback transparent vers Web APIs
 * (navigator.share, navigator.vibrate, navigator.geolocation, etc.).
 *
 * Usage :
 *   import { native } from '@/lib/native-bridge';
 *   await native().haptic('success');
 *   await native().share('Mon dossier', 'https://citurbarea.com/d/abc');
 *
 * La méthode `native()` retourne TOUJOURS un objet aux mêmes signatures —
 * pas besoin de check `if (window.CIT_NATIVE)` dans le code applicatif.
 *
 * @module lib/native-bridge
 */

/**
 * Interface unifiée bridge natif / Web APIs.
 */
export interface NativeBridge {
  readonly platform: 'ios' | 'android' | 'web';
  readonly isNative: boolean;
  share(title: string, url: string, text?: string): Promise<{ shared: boolean }>;
  haptic(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): Promise<void>;
  geo(): Promise<{ lat: number; lng: number; accuracy: number; timestamp: number } | null>;
  camera(source?: 'camera' | 'photos'): Promise<{ dataUrl: string; format: string } | null>;
  requestPush(): Promise<{ granted: boolean; token: string | null }>;
  isOnline(): Promise<{ connected: boolean; connectionType: string }>;
  vibrate(ms: number): Promise<void>;
  getDeviceInfo(): Promise<{
    model: string;
    platform: string;
    osVersion: string;
    manufacturer: string;
    isVirtual: boolean;
    appVersion: string;
  }>;
  hideSplash(): Promise<void>;
  hideKeyboard(): Promise<void>;
}

/**
 * Type du bridge injecté par l'app Capacitor — déclaré ici pour TypeScript.
 */
declare global {
  interface Window {
    CIT_NATIVE?: NativeBridge;
  }
}

/**
 * Fallback Web — utilise les Web APIs standards quand l'app n'est pas native.
 */
const webFallback: NativeBridge = {
  platform: 'web',
  isNative: false,

  async share(title, url, text) {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url, text });
        return { shared: true };
      } catch {
        return { shared: false };
      }
    }
    // Fallback ultime : copie URL dans le presse-papier
    try {
      await navigator.clipboard?.writeText(url);
      return { shared: true };
    } catch {
      return { shared: false };
    }
  },

  async haptic(type) {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    const patterns: Record<string, number | number[]> = {
      success: [10, 30, 10],
      error: [50, 50, 50],
      warning: [30, 20, 30],
      light: 10,
      medium: 30,
      heavy: 60,
    };
    navigator.vibrate(patterns[type] ?? 10);
  },

  async geo() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  },

  async camera(source = 'camera') {
    // Fallback web : <input type="file" accept="image/*" capture="environment">
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        input.setAttribute('capture', 'environment');
      }
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const format = file.type.split('/')[1] ?? 'jpeg';
          resolve({ dataUrl, format });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  async requestPush() {
    // Web Push API — nécessite service worker + VAPID
    if (typeof Notification === 'undefined') {
      return { granted: false, token: null };
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { granted: false, token: null };
    // On ne génère pas de token VAPID ici — la PWA doit le faire via son SW
    return { granted: true, token: null };
  },

  async isOnline() {
    const connected = typeof navigator !== 'undefined' ? navigator.onLine : true;
    // Heuristique connectionType via Network Information API (Chrome only)
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    const connectionType = conn?.effectiveType ?? 'unknown';
    return { connected, connectionType };
  },

  async vibrate(ms) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  },

  async getDeviceInfo() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return {
      model: 'web',
      platform: 'web',
      osVersion: ua,
      manufacturer: 'unknown',
      isVirtual: false,
      appVersion: '1.0.0',
    };
  },

  async hideSplash() {
    // No-op côté web — la PWA gère son propre loader
  },

  async hideKeyboard() {
    // Web : blur l'élément focusé
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
  },
};

/**
 * Retourne le bridge actif — natif si disponible, sinon fallback web.
 *
 * Idempotent et safe à appeler à chaque interaction (pas de cache nécessaire,
 * `window.CIT_NATIVE` est stable après init).
 */
export function native(): NativeBridge {
  if (typeof window !== 'undefined' && window.CIT_NATIVE) {
    return window.CIT_NATIVE;
  }
  return webFallback;
}

/**
 * True si l'app tourne dans le wrapper natif Capacitor.
 * Utile pour adapter l'UI (ex: cacher prompt "Installer l'app" si déjà natif).
 */
export function isNative(): boolean {
  return native().isNative;
}

/**
 * Plate-forme courante — 'ios' | 'android' | 'web'.
 */
export function platform(): 'ios' | 'android' | 'web' {
  return native().platform;
}

/**
 * Helper : écoute le bouton back natif Android.
 * @param handler Callback — return true si l'événement a été traité (sinon comportement par défaut)
 * @returns Fonction de cleanup
 */
export function onNativeBack(handler: (canGoBack: boolean) => boolean | void): () => void {
  const listener = (e: Event) => {
    const ev = e as CustomEvent<{ canGoBack: boolean }>;
    const handled = handler(ev.detail.canGoBack);
    if (handled) {
      e.preventDefault();
    }
  };
  window.addEventListener('cit:back', listener);
  return () => window.removeEventListener('cit:back', listener);
}

/**
 * Helper : écoute les deep links (citurbarea://...).
 */
export function onDeepLink(handler: (url: string) => void): () => void {
  const listener = (e: Event) => {
    const ev = e as CustomEvent<{ url: string }>;
    handler(ev.detail.url);
  };
  window.addEventListener('cit:deeplink', listener);
  return () => window.removeEventListener('cit:deeplink', listener);
}

/**
 * Helper : écoute les push notifications reçues en foreground.
 */
export function onPushReceived(
  handler: (notif: { title?: string; body?: string; data?: Record<string, unknown> }) => void,
): () => void {
  const listener = (e: Event) => {
    const ev = e as CustomEvent<{ title?: string; body?: string; data?: Record<string, unknown> }>;
    handler(ev.detail);
  };
  window.addEventListener('cit:push', listener);
  return () => window.removeEventListener('cit:push', listener);
}
