/**
 * Archive ZIP minimale (méthode « stockée », sans compression) pour produire
 * un .docx sans dépendance. Date fixe (1980-01-01) : même contenu → mêmes octets.
 */

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface FichierZip { nom: string; contenu: Uint8Array | string }

export function creerZip(fichiers: FichierZip[]): Uint8Array {
  const enc = new TextEncoder();
  const parties: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let decalage = 0;
  for (const f of fichiers) {
    const nom = enc.encode(f.nom);
    const data = typeof f.contenu === "string" ? enc.encode(f.contenu) : f.contenu;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);          // version requise
    local.setUint16(6, 0x0800, true);      // noms en UTF-8
    local.setUint16(8, 0, true);           // méthode : stockée
    local.setUint16(10, 0, true);          // heure
    local.setUint16(12, 0x0021, true);     // date : 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nom.length, true);
    local.setUint16(28, 0, true);
    parties.push(new Uint8Array(local.buffer), nom, data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x0021, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, nom.length, true);
    c.setUint32(42, decalage, true);
    central.push(new Uint8Array(c.buffer), nom);
    decalage += 30 + nom.length + data.length;
  }
  const tailleCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, decalage, true);
  const tout = [...parties, ...central, new Uint8Array(fin.buffer)];
  const out = new Uint8Array(tout.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of tout) { out.set(p, i); i += p.length; }
  return out;
}

/** Lecture d'une archive stockée (tests et contrôle) : nom → octets. */
export function lireZip(octets: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const out = new Map<string, Uint8Array>();
  let i = 0;
  while (i + 30 <= octets.length && v.getUint32(i, true) === 0x04034b50) {
    const taille = v.getUint32(i + 18, true), lnom = v.getUint16(i + 26, true), lext = v.getUint16(i + 28, true);
    const nom = new TextDecoder().decode(octets.subarray(i + 30, i + 30 + lnom));
    const debut = i + 30 + lnom + lext;
    const data = octets.subarray(debut, debut + taille);
    if (crc32(data) !== v.getUint32(i + 14, true)) throw new Error(`CRC invalide : ${nom}`);
    out.set(nom, data);
    i = debut + taille;
  }
  return out;
}
