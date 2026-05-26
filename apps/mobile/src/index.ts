/**
 * Entry point CITURBAREA Mobile.
 *
 * Importe par side-effect le bridge natif qui s'auto-initialise au DOMContentLoaded.
 * Ce fichier est compilé via `tsc` → `dist/index.js` puis copié dans `www/` au sync.
 *
 * Note : la PWA distante (citurbarea.com) ne charge PAS ce JS — il n'est exécuté
 * que dans le contexte WebView Capacitor où le bundle est servi en local via
 * le scheme `capacitor://`. Mais comme on utilise `server.url`, ce bundle est
 * peu utilisé en pratique sauf en mode offline.
 *
 * Le bridge réel est exposé par les plugins Capacitor injectés au runtime par
 * la couche native (avant le premier paint web).
 */
import './native-bridge';

export { default as bridge } from './native-bridge';
export type { CitNativeBridge } from './native-bridge';
