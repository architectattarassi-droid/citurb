/**
 * Bridge JS ↔ Natif — CITURBAREA Mobile
 *
 * Expose `window.CIT_NATIVE` à la PWA (citurbarea.com) chargée dans la WebView
 * Capacitor. La PWA détecte ce global et l'utilise au lieu des Web APIs
 * standards pour bénéficier des capacités natives (vraie share sheet iOS,
 * haptics tactile, accès photo natif, push tokens, etc.).
 *
 * Détection plate-forme :
 *   - `Capacitor.isNativePlatform()` → true si iOS/Android natif
 *   - `Capacitor.getPlatform()` → 'ios' | 'android' | 'web'
 *
 * Côté PWA, voir : apps/web/src/lib/native-bridge.ts (fallback Web APIs).
 *
 * @module native-bridge
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Type strict du bridge exposé à la PWA via `window.CIT_NATIVE`.
 */
export interface CitNativeBridge {
  /** Métadonnées plate-forme (utile pour la PWA pour adapter l'UI) */
  readonly platform: 'ios' | 'android' | 'web';
  readonly isNative: boolean;
  readonly version: string;

  /** Partage natif (iOS share sheet / Android intent chooser) */
  share(title: string, url: string, text?: string): Promise<{ shared: boolean }>;

  /** Feedback tactile (vibration nuancée) */
  haptic(type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'): Promise<void>;

  /** Géolocalisation avec permission check */
  geo(): Promise<{ lat: number; lng: number; accuracy: number; timestamp: number } | null>;

  /** Capture photo native (caméra ou galerie) — retourne dataUrl base64 */
  camera(source?: 'camera' | 'photos'): Promise<{ dataUrl: string; format: string } | null>;

  /** Enregistre l'app pour recevoir push notifications + retourne le token APNS/FCM */
  requestPush(): Promise<{ granted: boolean; token: string | null }>;

  /** État du réseau (online + type connexion) */
  isOnline(): Promise<{ connected: boolean; connectionType: string }>;

  /** Vibration simple (durée ms) — fallback si haptic non supporté */
  vibrate(ms: number): Promise<void>;

  /** Infos device (modèle, OS, locale, etc.) */
  getDeviceInfo(): Promise<{
    model: string;
    platform: string;
    osVersion: string;
    manufacturer: string;
    isVirtual: boolean;
    appVersion: string;
  }>;

  /** Masque le splash (à appeler une fois la PWA prête) */
  hideSplash(): Promise<void>;

  /** Cache le clavier programmatiquement */
  hideKeyboard(): Promise<void>;
}

/**
 * Implémentation du bridge natif.
 */
const bridge: CitNativeBridge = {
  platform: Capacitor.getPlatform() as 'ios' | 'android' | 'web',
  isNative: Capacitor.isNativePlatform(),
  version: '1.0.0',

  /**
   * Partage natif via share sheet iOS / intent chooser Android.
   * @param title Titre du partage (souvent ignoré par Twitter/WhatsApp)
   * @param url URL à partager (la principale donnée utile)
   * @param text Texte d'accompagnement optionnel
   */
  async share(title: string, url: string, text?: string): Promise<{ shared: boolean }> {
    try {
      await Share.share({
        title,
        text: text ?? title,
        url,
        dialogTitle: 'Partager via',
      });
      return { shared: true };
    } catch (err) {
      // L'utilisateur a annulé ou une erreur s'est produite
      console.warn('[CIT_NATIVE] share cancelled/failed:', err);
      return { shared: false };
    }
  },

  /**
   * Feedback haptique nuancé selon le type d'événement.
   * - success : confirmation paiement, validation pack
   * - error : refus paiement, validation KO
   * - warning : alerte anti-désint, quota proche
   * - light/medium/heavy : interaction UI standard
   */
  async haptic(type): Promise<void> {
    try {
      switch (type) {
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (err) {
      console.warn('[CIT_NATIVE] haptic failed:', err);
    }
  },

  /**
   * Géolocalisation avec permission check préalable.
   * Précision : haute (GPS) — timeout 10s.
   * Utilisé pour : zones urbanisme, terrains P4, PV chantier géotagués.
   */
  async geo() {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions({ permissions: ['location'] });
        if (req.location !== 'granted') {
          console.warn('[CIT_NATIVE] geo permission denied');
          return null;
        }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
    } catch (err) {
      console.error('[CIT_NATIVE] geo error:', err);
      return null;
    }
  },

  /**
   * Capture photo via caméra ou sélection galerie.
   * Retourne dataUrl base64 (prêt pour <img src> ou upload multipart).
   * Qualité 80 = compromis taille/qualité pour photos chantier (~200-500KB).
   */
  async camera(source = 'camera') {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'photos' ? CameraSource.Photos : CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1920,
        height: 1920,
        preserveAspectRatio: true,
      });
      if (!photo.dataUrl) {
        return null;
      }
      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
      };
    } catch (err) {
      console.warn('[CIT_NATIVE] camera cancelled/failed:', err);
      return null;
    }
  },

  /**
   * Demande la permission push + retourne le token APNS (iOS) / FCM (Android).
   * Le token doit ensuite être POSTé à /api/notifications/register par la PWA.
   */
  async requestPush(): Promise<{ granted: boolean; token: string | null }> {
    return new Promise((resolve) => {
      (async () => {
        try {
          const perm = await PushNotifications.checkPermissions();
          let granted = perm.receive === 'granted';
          if (!granted) {
            const req = await PushNotifications.requestPermissions();
            granted = req.receive === 'granted';
          }
          if (!granted) {
            resolve({ granted: false, token: null });
            return;
          }

          // Écoute le token une seule fois
          const handle = await PushNotifications.addListener('registration', (token) => {
            void handle.remove();
            resolve({ granted: true, token: token.value });
          });

          const errorHandle = await PushNotifications.addListener('registrationError', (err) => {
            void errorHandle.remove();
            console.error('[CIT_NATIVE] push registration error:', err);
            resolve({ granted: true, token: null });
          });

          await PushNotifications.register();

          // Timeout de sécurité si le token ne vient jamais (15s)
          setTimeout(() => {
            void handle.remove();
            void errorHandle.remove();
            resolve({ granted: true, token: null });
          }, 15000);
        } catch (err) {
          console.error('[CIT_NATIVE] requestPush error:', err);
          resolve({ granted: false, token: null });
        }
      })();
    });
  },

  /**
   * État réseau temps réel.
   * connectionType : 'wifi' | 'cellular' | 'none' | 'unknown'
   */
  async isOnline(): Promise<{ connected: boolean; connectionType: string }> {
    try {
      const status = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType,
      };
    } catch (err) {
      console.error('[CIT_NATIVE] network error:', err);
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }
  },

  /**
   * Vibration simple — fallback pour cas non couverts par haptic.
   * Capacitor 6 : pas de plugin Vibration dédié — on remap sur Haptics.impact.
   */
  async vibrate(ms: number): Promise<void> {
    try {
      const style = ms < 50 ? ImpactStyle.Light : ms < 150 ? ImpactStyle.Medium : ImpactStyle.Heavy;
      await Haptics.impact({ style });
    } catch (err) {
      console.warn('[CIT_NATIVE] vibrate failed:', err);
    }
  },

  /**
   * Métadonnées device pour analytics + debug.
   */
  async getDeviceInfo() {
    try {
      const info = await Device.getInfo();
      const appInfo = await App.getInfo().catch(() => ({ version: '1.0.0' }));
      return {
        model: info.model,
        platform: info.platform,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        isVirtual: info.isVirtual,
        appVersion: appInfo.version,
      };
    } catch (err) {
      console.error('[CIT_NATIVE] device info error:', err);
      return {
        model: 'unknown',
        platform: Capacitor.getPlatform(),
        osVersion: 'unknown',
        manufacturer: 'unknown',
        isVirtual: false,
        appVersion: '1.0.0',
      };
    }
  },

  /**
   * Masque le splash — la PWA doit appeler ça quand son state principal
   * est ready (après load des entitlements et user session).
   */
  async hideSplash(): Promise<void> {
    try {
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (err) {
      console.warn('[CIT_NATIVE] hideSplash failed:', err);
    }
  },

  /**
   * Cache le clavier programmatiquement (utile après submit formulaire).
   */
  async hideKeyboard(): Promise<void> {
    try {
      await Keyboard.hide();
    } catch (err) {
      console.warn('[CIT_NATIVE] hideKeyboard failed:', err);
    }
  },
};

/**
 * Déclaration globale pour TypeScript côté PWA.
 */
declare global {
  interface Window {
    CIT_NATIVE?: CitNativeBridge;
  }
}

/**
 * Initialisation du bridge — appelé une seule fois au boot de la WebView.
 *
 * Side effects :
 *   - Configure la status bar (style DARK, navy bg)
 *   - Listen back button Android (envoie 'cit:back' dans la PWA)
 *   - Listen app state (active/inactive)
 *   - Expose window.CIT_NATIVE
 */
function initBridge(): void {
  if (!Capacitor.isNativePlatform()) {
    // Mode dev navigateur — pas de bridge natif, on n'expose rien
    console.info('[CIT_NATIVE] running in web mode — bridge disabled');
    return;
  }

  // 1. Status bar config (à faire AVANT hideSplash)
  void (async () => {
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#0A2540' });
      }
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('[CIT_NATIVE] status bar init failed:', err);
    }
  })();

  // 2. Back button Android — délègue à la PWA via custom event
  void App.addListener('backButton', ({ canGoBack }) => {
    const handled = window.dispatchEvent(
      new CustomEvent('cit:back', { detail: { canGoBack }, cancelable: true }),
    );
    if (!handled && !canGoBack) {
      void App.exitApp();
    }
  });

  // 3. App lifecycle — utile pour pause/reprise LiveKit, refresh tokens
  void App.addListener('appStateChange', (state) => {
    window.dispatchEvent(new CustomEvent('cit:appstate', { detail: state }));
  });

  // 4. Deep links (citurbarea://dossier/abc → /dossier/abc)
  void App.addListener('appUrlOpen', (event) => {
    window.dispatchEvent(new CustomEvent('cit:deeplink', { detail: event }));
  });

  // 5. Push notification reçue (foreground)
  void PushNotifications.addListener('pushNotificationReceived', (notif) => {
    window.dispatchEvent(new CustomEvent('cit:push', { detail: notif }));
  }).catch(() => {
    // Push pas encore registered — silencieux
  });

  // 6. Push notification action (user tap)
  void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    window.dispatchEvent(new CustomEvent('cit:push:action', { detail: action }));
  }).catch(() => undefined);

  // 7. Expose le bridge à la PWA
  window.CIT_NATIVE = bridge;
  console.info('[CIT_NATIVE] bridge ready on', bridge.platform);

  // 8. Auto-hide splash après 3s si la PWA ne l'a pas fait elle-même
  setTimeout(() => {
    void bridge.hideSplash();
  }, 3000);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBridge);
} else {
  initBridge();
}

export { bridge as default, initBridge };
