/**
 * Réalisations du cabinet affichées sur la page d'accueil (section « Réalisations »).
 *
 * RÈGLE : uniquement des projets RÉELS du cabinet, avec des photos réelles.
 * Rien d'inventé. Tant que la liste est vide, la section n'affiche pas de
 * galerie (elle montre à la place la vidéo de chantier de la chaîne YouTube).
 *
 * Comment ajouter une réalisation :
 *  1. Déposer les photos (JPEG ou WebP, côté long ≈ 1600 px, < 400 Ko chacune)
 *     dans `apps/web/public/realisations/<id>/`, par ex.
 *     `apps/web/public/realisations/villa-mehdia-2024/1.jpg`.
 *     La 1re image sert de vignette : la choisir en format paysage (4:3).
 *  2. Ajouter une entrée ci-dessous ; `src` commence par `/realisations/...`.
 *  3. `alt` décrit ce qu'on voit (accessibilité + SEO), ex. « Façade sur rue de
 *     la villa, enduit blanc et claustras bois ».
 *  4. `videoYoutubeId` (facultatif) : identifiant d'une vidéo RÉELLE de la chaîne
 *     @citiestalkmaroc consacrée à ce projet (la partie après `v=` dans l'URL).
 *
 * Exemple (à copier, ne pas laisser tel quel) :
 *   {
 *     id: "villa-mehdia-2024",
 *     titre: "Villa R+1 avec piscine",
 *     ville: "Mehdia",
 *     type: "Villa",
 *     annee: 2024,
 *     mission: "Conception, permis de construire et suivi de chantier",
 *     images: [
 *       { src: "/realisations/villa-mehdia-2024/1.jpg", alt: "Façade principale de la villa" },
 *       { src: "/realisations/villa-mehdia-2024/2.jpg", alt: "Séjour double hauteur" },
 *     ],
 *   },
 */

export type ImageRealisation = { src: string; alt: string };

export type Realisation = {
  /** Identifiant unique (sert aussi de nom de dossier des photos). */
  id: string;
  titre: string;
  ville: string;
  /** Villa, Immeuble, Rénovation, Équipement… */
  type: string;
  annee?: number;
  /** Mission du cabinet sur ce projet (facultatif). */
  mission?: string;
  /** Au moins une image ; la première sert de vignette. */
  images: ImageRealisation[];
  /** Vidéo YouTube réelle consacrée au projet (facultatif). */
  videoYoutubeId?: string;
};

export const REALISATIONS: Realisation[] = [];
