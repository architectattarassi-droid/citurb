/**
 * Configuration Capacitor 6 — CITURBAREA Mobile
 *
 * Wrapping natif iOS + Android de citurbarea.com.
 *
 * Stratégie : server.url pointe sur la PWA hébergée Railway (citurbarea.com).
 * L'app native ne contient PAS de bundle JS embarqué — elle charge directement
 * la PWA distante. Avantages :
 *   - Cycle de release JS découplé du store review (1-7 jours → instantané)
 *   - Une seule codebase web/mobile (DRY)
 *   - PWA fallback navigateur si l'app native crash
 *
 * Inconvénients & mitigations :
 *   - Apple/Google peuvent rejeter une app "uniquement WebView" → ajouter
 *     suffisamment de features natives (push, camera, geo, biometric, share,
 *     haptics) pour dépasser le seuil "valeur native".
 *   - Mode offline limité → fallback HTML statique embarqué (offline.html).
 *
 * @see https://capacitorjs.com/docs/config
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  /** Identifiant unique de l'app — doit matcher Apple Developer + Google Play Console */
  appId: 'com.citurbarea.app',

  /** Nom affiché sur le springboard iOS / launcher Android */
  appName: 'CITURBAREA',

  /** Dossier web-build embarqué (fallback offline si server.url inaccessible) */
  webDir: 'www',

  /** Permet de bypass HTTPS strict si l'app charge un domaine custom */
  bundledWebRuntime: false,

  /**
   * Configuration serveur — l'app charge la PWA distante.
   * En dev, on peut override avec server.url=http://192.168.x.x:5173 via env.
   */
  server: {
    url: 'https://citurbarea.com',
    /** Domaines autorisés pour navigation interne (sinon ouverts dans Safari/Chrome) */
    allowNavigation: [
      'citurbarea.com',
      '*.citurbarea.com',
      '*.livekit.cloud',
      'meet.jit.si',
      '*.jit.si',
      'js.stripe.com',
      'checkout.stripe.com',
    ],
    /** Scheme custom (iOS only) — 'capacitor' par défaut, 'https' force HTTPS-like */
    iosScheme: 'https',
    androidScheme: 'https',
    /** Empêche cleartext HTTP en prod (sauf si dev livereload) */
    cleartext: false,
  },

  /**
   * Configuration native par plate-forme.
   */
  ios: {
    /** Force WKWebView (déjà default Capacitor 6) */
    contentInset: 'automatic',
    /** Désactive pull-to-refresh natif WebView (conflit avec UI custom) */
    scrollEnabled: true,
    /** Permet l'inline media playback (vidéos LiveKit/Jitsi sans fullscreen forcé) */
    allowsLinkPreview: false,
    /** Limite UA pour éviter détection bot côté backend */
    overrideUserAgent: undefined,
    appendUserAgent: 'CITURBAREA-iOS/1.0',
    /** Background color pendant load (matche splash navy) */
    backgroundColor: '#0A2540',
  },

  android: {
    /** Permet WebView debug via chrome://inspect en debug build */
    webContentsDebuggingEnabled: true,
    /** Empêche apps tierces d'injecter dans la WebView */
    allowMixedContent: false,
    /** Limite UA */
    appendUserAgent: 'CITURBAREA-Android/1.0',
    /** Background color WebView */
    backgroundColor: '#0A2540',
    /** Compatibilité WebView ancien — désactivé pour security */
    captureInput: true,
  },

  /**
   * Configuration des plugins natifs.
   */
  plugins: {
    /**
     * Splash screen — affiché pendant le boot natif + premier paint web.
     * Navy CITURBAREA #0A2540 + logo centré + fadeIn 500ms.
     */
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      launchFadeOutDuration: 500,
      backgroundColor: '#0A2540',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#D4AF37',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: false,
    },

    /**
     * Status bar — texte clair sur fond navy.
     * Overlay false = la WebView ne passe pas SOUS la status bar (évite notch overlap).
     */
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A2540',
      overlaysWebView: false,
    },

    /**
     * Push notifications — APNS (iOS) + FCM (Android).
     * Token récupéré dans native-bridge.ts et envoyé à /api/notifications/register.
     */
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    /**
     * Keyboard — auto-resize WebView quand keyboard apparaît.
     * Important pour les formulaires de dossiers P1..P6.
     */
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },

    /**
     * Camera — qualité optimisée pour photos chantier géolocalisées.
     */
    Camera: {
      // Pas de config statique — gérée à l'appel via CameraOptions
    },

    /**
     * Geolocation — permission demandée au runtime via bridge.
     */
    Geolocation: {
      // Pas de config statique
    },
  },

  /**
   * Cordova compatibility shim (vide — on n'utilise pas de plugins Cordova legacy).
   */
  cordova: {},
};

export default config;
