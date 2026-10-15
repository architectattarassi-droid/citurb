/**
 * Pièces graphiques ESQ / APS / APD / EXE : cases, noms canoniques (versions du dépôt commun),
 * liens vidéo YouTube / Vimeo en attendant R2, actions de la fiche dossier.
 */
import { describe, expect, it } from "vitest";
import { ajouterVideo, lienVideo, niveauxDuProjet, nomCanonique, trierNiveaux, videosDe } from "../../../../../packages/contracts/src/gestion/plans";
import { appliquerAction, lireAction } from "../../../../../functions/_lib/ficheDossier";

describe("pièces graphiques", () => {
  it("niveaux du projet dans l'ordre (sous-sols, RDC, étages, terrasse)", () => {
    expect(niveauxDuProjet(2, 2)).toEqual(["SS2", "SS1", "RDC", "R+1", "R+2", "Terrasse"]);
    expect(trierNiveaux(["R+1", "Terrasse", "SS1", "RDC"])).toEqual(["SS1", "RDC", "R+1", "Terrasse"]);
  });
  it("même case = même nom (le dépôt commun numérote les versions)", () => {
    expect(nomCanonique("APS", "plan-niveau", "R+1", "pdf")).toBe("APS-plan-niveau-r-1.pdf");
    expect(nomCanonique("APS", "facade", "Nord-Est", "png", "Façade principale")).toBe("APS-facade-nord-est-facade-principale.png");
  });
  it("liens vidéo : YouTube et Vimeo seulement, lecteur intégré sans pistage", () => {
    expect(lienVideo("https://youtu.be/dQw4w9WgXcQ")?.integration).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(lienVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")?.fournisseur).toBe("youtube");
    expect(lienVideo("https://vimeo.com/123456789/abcdef1234")?.integration).toBe("https://player.vimeo.com/video/123456789?h=abcdef1234");
    expect(lienVideo("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(lienVideo("https://exemple.com/video.mp4")).toBeNull();
    expect(lienVideo("https://wa.me/212600000000")).toBeNull();
  });
  it("versions des liens vidéo : même phase et même titre → v2", () => {
    const a = ajouterVideo([], { phase: "APS", titre: "Survol 3D", url: "https://youtu.be/dQw4w9WgXcQ" }, "admin", "2026-10-15", "vid_aaaaaa");
    if (!a.ok) throw new Error(a.erreur);
    const b = ajouterVideo(a.liste, { phase: "APS", titre: "survol 3d", url: "https://vimeo.com/123456789" }, "admin", "2026-10-16", "vid_bbbbbb");
    expect(b.ok && b.video.version).toBe(2);
    expect(ajouterVideo([], { phase: "XX", titre: "t", url: "https://youtu.be/dQw4w9WgXcQ" }, "a", "d", "vid_c")).toEqual({ ok: false, erreur: "phase_invalide" });
  });
  it("fiche dossier : ajout puis publication d'un lien vidéo, journalisés", async () => {
    let payload: Record<string, unknown> = {};
    const requetes: string[] = [];
    const sql = (async (s: TemplateStringsArray, ...v: unknown[]) => {
      const q = s.join("?");
      requetes.push(q);
      if (q.startsWith('SELECT "status", "phase", "payload"')) return [{ status: "APPROVED", phase: "12_APS", payload }];
      if (q.includes("to_regclass")) return [{ d: true, u: true, c: true, e: true, j: true, col: true }];
      if (q.startsWith('UPDATE "Dossier" SET "payload"')) { payload = JSON.parse(String(v[0])); return []; }
      return [];
    }) as never;
    const a = lireAction({ action: "video_ajouter", phase: "APS", titre: "Survol", url: "https://youtu.be/dQw4w9WgXcQ" });
    if ("erreur" in a) throw new Error(a.erreur);
    expect((await appliquerAction(sql, "dos_1", a, "admin@test")).status).toBe(200);
    const v = videosDe(payload);
    expect(v).toHaveLength(1);
    expect(v[0].publie).toBe(false);
    const p = lireAction({ action: "video_publier", id: v[0].id, publie: true });
    if ("erreur" in p) throw new Error(p.erreur);
    await appliquerAction(sql, "dos_1", p, "admin@test");
    expect(videosDe(payload)[0].publie).toBe(true);
    expect(requetes.filter((q) => q.includes('INSERT INTO "DossierEvenement"')).length).toBe(2);
    const mauvais = lireAction({ action: "video_ajouter", phase: "APS", titre: "x", url: "https://exemple.com/v.mp4" });
    if ("erreur" in mauvais) throw new Error();
    expect((await appliquerAction(sql, "dos_1", mauvais, "admin@test")).json).toMatchObject({ error: "lien_video_invalide" });
  });
});
