/**
 * Libellés de l'espace projet. Un dictionnaire par langue : seul le français
 * est rédigé ; l'arabe et l'anglais se brancheront ici (même clés).
 */
import type { Role } from "../../domain/referentiel/types";
import type { StatutJalon } from "./api";

export type Langue = "fr";

const FR = {
  roles: {
    CLIENT: "Client", ARCHITECTE: "Architecte", BET_STRUCTURE: "BET structure", BET_FLUIDES: "BET fluides", GEOTECHNICIEN: "Géotechnicien",
    TOPOGRAPHE: "Topographe", BUREAU_CONTROLE: "Bureau de contrôle", LABORATOIRE: "Laboratoire", ENTREPRISE: "Entreprise", SOUS_TRAITANT: "Sous-traitant",
    COORDINATEUR_SPS: "Coordinateur SPS", ADMINISTRATION: "Administration", NOTAIRE: "Notaire", ADMIN_CITURBAREA: "CITURBAREA",
  } as Record<Role, string>,
  statuts: {
    A_FAIRE: "À faire", EN_COURS: "En cours", EN_ATTENTE_VALIDATION: "À valider", VALIDE: "Validé", BLOQUE: "Bloqué", SANS_OBJET: "Sans objet",
  } as Record<StatutJalon, string>,
  actionsStatut: {
    A_FAIRE: "Remettre à faire", EN_COURS: "Marquer en cours", EN_ATTENTE_VALIDATION: "Demander la validation", VALIDE: "Valider le jalon", BLOQUE: "Bloquer", SANS_OBJET: "Sans objet",
  } as Record<StatutJalon, string>,
  moments: { CONCEPTION: "Conception", EXECUTION: "Exécution", RECEPTION: "Réception" } as Record<string, string>,
  portees: { REGLEMENTAIRE: "Réglementaire (obligatoire)", NORME_OBLIGATOIRE: "Norme d'application obligatoire", NORME_VOLONTAIRE: "Norme d'application volontaire", REGLE_DE_L_ART: "Règle de l'art" } as Record<string, string>,
  criticites: { BLOQUANT: "Bloquant", MAJEUR: "Majeur", MINEUR: "Mineur" } as Record<string, string>,
  erreurs: {
    reseau: "Pas de connexion. Réessayez quand le réseau revient.",
    non_connecte: "Votre session a expiré : rouvrez le lien d'accès reçu par message.",
    interdit: "Votre rôle ne permet pas cette action.",
    point_arret_non_leve: "Un point d'arrêt prérequis n'est pas encore levé par l'architecte.",
    pv_point_arret_manquant: "Point d'arrêt : le PV de contrôle doit être rempli, signé par tous et non refusé (onglet Documents). Sinon, seul l'administrateur peut débloquer avec un motif.",
    motif_obligatoire: "Écrivez le motif du déblocage.",
    phase_en_attente_paiement: "Phase en attente de paiement : l'échéance du contrat n'est pas réglée. L'administration peut la débloquer avec un motif.",
    stockage_non_active: "Le dépôt de fichiers n'est pas encore activé (stockage Cloudflare R2).",
    type_refuse: "Type de fichier refusé : photos (JPEG, PNG, WebP, HEIC), vidéos (MP4, MOV, WebM, 3GP), PDF, Word, Excel.",
    trop_gros: "Fichier trop lourd (photos 15 Mo, vidéos 200 Mo, documents 30 Mo).",
    document_signe: "Ce document est signé : il n'est plus modifiable.",
    deja_signe: "Vous avez déjà signé ce document.",
    jalon_valide: "Ce jalon est validé : seul l'architecte peut le modifier.",
    visio_non_configuree: "La visio intégrée n'est pas encore activée.",
    conflit: "Quelqu'un a modifié cet élément en même temps : rechargez.",
    espace_projet_indisponible: "Espace projet momentanément indisponible.",
    session_non_configuree: "Espace projet pas encore activé (configuration serveur).",
    lien_invalide: "Ce lien d'accès n'est pas valide ou a été remplacé. Demandez un nouveau lien à l'architecte.",
  } as Record<string, string>,
};

export const T = FR;
export const role = (r: string) => (T.roles as Record<string, string>)[r] ?? r;
export const erreur = (code: string) => T.erreurs[code] ?? `Action impossible (${code}).`;

export const COULEUR_STATUT: Record<StatutJalon, string> = {
  A_FAIRE: "bg-slate-100 text-slate-700", EN_COURS: "bg-blue-100 text-blue-800", EN_ATTENTE_VALIDATION: "bg-amber-100 text-amber-900",
  VALIDE: "bg-emerald-100 text-emerald-800", BLOQUE: "bg-red-100 text-red-800", SANS_OBJET: "bg-slate-100 text-slate-400 line-through",
};

const FUSEAU = "Africa/Casablanca";
export const dateHeure = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const dateLongue = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
export const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
