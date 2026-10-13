/**
 * Visio intégrée à CITURBAREA — Jitsi as a Service (JaaS, 8x8.vc).
 *
 * Module générique : une « salle » appartient à un contexte (rendez-vous
 * aujourd'hui ; suivi de chantier et réunions prestataires demain). Son nom
 * n'est pas devinable (`<contexte>-` + 24 caractères aléatoires, stocké avec
 * l'objet métier) et chaque jeton JaaS n'ouvre QUE cette salle.
 *
 * Le jeton (JWT RS256) est signé ici avec WebCrypto, sans bibliothèque.
 * Variables Cloudflare Pages (Settings → Variables and secrets) :
 *   JAAS_APP_ID           ex. vpaas-magic-cookie-0123abcd…
 *   JAAS_KEY_ID           identifiant de la clé API (ou « appId/keyId » complet)
 *   JAAS_PRIVATE_KEY_PEM  clé privée RSA (secret ; retours à la ligne en \n acceptés)
 * Une seule absente → visio intégrée inactive (le front propose le lien de secours).
 */

export interface VisioEnv { JAAS_APP_ID?: string; JAAS_KEY_ID?: string; JAAS_PRIVATE_KEY_PEM?: string }

export const CONTEXTES = ["rdv", "chantier", "reunion"] as const;
export type Contexte = (typeof CONTEXTES)[number];
export const DOMAINE_JAAS = "8x8.vc";
export const DUREE_JETON_S = 2 * 3600;

export type ConfigVisio = { domain: string; roomName: string; jwt: string; appId: string; expire: string };
export type Utilisateur = { id: string; nom: string; email?: string | null };

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Nom de salle non devinable : « rdv-k3j9… » (24 caractères aléatoires). */
export function nouvelleSalle(contexte: Contexte): string {
  const o = crypto.getRandomValues(new Uint8Array(24));
  return `${contexte}-${Array.from(o, (b) => ALPHABET[b % 36]).join("")}`;
}

export const salleValide = (contexte: Contexte, salle: string) => new RegExp(`^${contexte}-[a-z0-9]{24}$`).test(salle);

export function visioConfiguree(env: VisioEnv): boolean {
  return !!(env.JAAS_APP_ID?.trim() && env.JAAS_KEY_ID?.trim() && env.JAAS_PRIVATE_KEY_PEM?.trim());
}

// ── Clé privée ──────────────────────────────────────────────────────────

const derLongueur = (n: number) => (n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : n < 0x10000 ? [0x82, n >> 8, n & 0xff] : [0x83, n >> 16, (n >> 8) & 0xff, n & 0xff]);

/** Enveloppe une clé PKCS#1 (« BEGIN RSA PRIVATE KEY ») en PKCS#8, seul format importable par WebCrypto. */
function pkcs1VersPkcs8(pkcs1: Uint8Array): Uint8Array {
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octets = [0x04, ...derLongueur(pkcs1.length)];
  const corps = [0x02, 0x01, 0x00, ...algo, ...octets];
  const total = corps.length + pkcs1.length;
  const out = new Uint8Array([0x30, ...derLongueur(total), ...corps, ...pkcs1]);
  return out;
}

async function importerCle(pem: string): Promise<CryptoKey> {
  const texte = pem.replace(/\\n/g, "\n").trim();
  const pkcs1 = /BEGIN RSA PRIVATE KEY/.test(texte);
  const b64 = texte.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  let der: Uint8Array = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (pkcs1) der = pkcs1VersPkcs8(der);
  return crypto.subtle.importKey("pkcs8", der as BufferSource, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

const b64url = (o: Uint8Array) => btoa(Array.from(o, (b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));

/** Jeton JaaS signé (RS256) pour UNE salle. */
export async function signerJetonJaas(env: VisioEnv, salle: string, u: Utilisateur, moderateur: boolean, maintenant = Date.now()): Promise<string> {
  const appId = env.JAAS_APP_ID!.trim();
  const cle = env.JAAS_KEY_ID!.trim();
  const kid = cle.includes("/") ? cle : `${appId}/${cle}`;
  const s = Math.floor(maintenant / 1000);
  const entete = { alg: "RS256", kid, typ: "JWT" };
  const charge = {
    aud: "jitsi", iss: "chat", sub: appId, room: salle,
    nbf: s - 10, iat: s, exp: s + DUREE_JETON_S,
    context: {
      features: { livestreaming: false, recording: false, transcription: false, "outbound-call": false },
      user: { "hidden-from-recorder": false, moderator: moderateur, name: u.nom, id: u.id, avatar: "", email: u.email || "" },
    },
  };
  const signe = `${b64urlJson(entete)}.${b64urlJson(charge)}`;
  const k = await importerCle(env.JAAS_PRIVATE_KEY_PEM!);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", k, new TextEncoder().encode(signe)));
  return `${signe}.${b64url(sig)}`;
}

/**
 * Accès à une salle : configuration à passer à SalleVisio (front).
 * `moderateur` : l'architecte (back-office) ; le client ne l'est jamais.
 */
export async function acces(env: VisioEnv, contexte: Contexte, salle: string, utilisateur: Utilisateur, moderateur: boolean, maintenant = Date.now()): Promise<{ ok: true; config: ConfigVisio } | { ok: false; error: string }> {
  if (!visioConfiguree(env)) return { ok: false, error: "visio_non_configuree" };
  if (!salleValide(contexte, salle)) return { ok: false, error: "salle_invalide" };
  try {
    const jwt = await signerJetonJaas(env, salle, utilisateur, moderateur, maintenant);
    const appId = env.JAAS_APP_ID!.trim();
    return { ok: true, config: { domain: DOMAINE_JAAS, roomName: `${appId}/${salle}`, jwt, appId, expire: new Date(maintenant + DUREE_JETON_S * 1000).toISOString() } };
  } catch {
    console.error("[visio] signature JaaS impossible (clé privée illisible ?)");
    return { ok: false, error: "visio_indisponible" };
  }
}
