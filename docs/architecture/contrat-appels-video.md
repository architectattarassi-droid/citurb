# Contrat — appels vidéo sur demande (accord de toutes les parties)

Règle du fondateur : partout où deux parties travaillent ensemble, un bouton **« Demander un appel vidéo »**. Une demande ne déclenche **jamais** un appel : la salle n'existe et n'est joignable qu'une fois que **toutes** les personnes invitées **et** le demandeur ont accepté **le même créneau**.

## Où est le code

| Rôle | Fichier |
|---|---|
| Machine à états, consentement, fenêtre, débit, vues (pur, testé) | `functions/_lib/appels.ts` |
| Stockage Neon (+ dépôt mémoire pour les tests) | `functions/_lib/appelsDepot.ts` |
| Qui est qui (Fournisseur, Dossier, ProjetMembre, RendezVous) | `functions/_lib/appelsResolveur.ts` |
| Orchestration, lien personnel, notifications, routeur | `functions/_lib/appelsService.ts`, `functions/_lib/appelsNotif.ts` |
| Jeton JaaS (inchangé) | `functions/_lib/visio.ts` |
| Routes | `functions/api/appels/[[chemin]].ts` (public + lien), `functions/api/cc/appels/[[chemin]].ts` (back-office), `functions/api/cercles/espace/appels/[[chemin]].ts` (pro), `functions/api/projets/appels/[[chemin]].ts` (membre de projet) |
| Tables | `docs/sql/appels-video-neon.sql` (`DemandeAppel`, `BlocageAppel`) ; modèles dans `prisma/schema.prisma` |
| Front | `apps/web/src/features/appels/` : `DemanderAppelVideo` (bouton), `DetailAppel` (réponse + salle), `MesAppels` (liste), `AppelPage` (`/appel/:jeton`, `/ar/appel/:jeton`) ; back-office `/cc/appels` |
| Tests | `apps/web/src/features/appels/appels.test.ts` |

## Brancher le bouton

```tsx
import DemanderAppelVideo from "../appels/DemanderAppelVideo";

<DemanderAppelVideo
  porte="public" | "admin" | "pro" | "membre"   // qui demande (session utilisée)
  contexte="dossier" | "chantier" | "reunion" | "cercles" | "fournisseur" | "rdv"
  objetId="…"                                    // [A-Za-z0-9:_.-]{1,120}
  invites={[{ type: "pro", slug }]}              // personnes invitées
  candidats={[{ invite, nom }]}                  // facultatif : cases à cocher (réunions)
  avecNom="Atlas Menuiserie" sujet="Porte d'entrée" variante="or|navy|contour|lien" />
```

Qui peut inviter qui (vérifié côté serveur, `autoriserCreation`) :

| Demandeur (`porte`) | Contextes | Invités possibles |
|---|---|---|
| `public` (visiteur : nom + e-mail ou téléphone, consentement) | cercles, fournisseur, reunion | `{type:"admin"}` (cabinet), `{type:"pro", slug}` — 2 au plus |
| `pro` (cookie `frn_session`) | cercles, fournisseur, reunion | cabinet, autre pro par **slug** — jamais un client |
| `membre` (cookie `projet_session`) | chantier (`objetId` = `<projetId>[:<jalon>]`), reunion | cabinet, membres **de son projet** |
| `admin` (back-office) | tous | `{type:"client", dossierId}`, `{type:"pro", slug \| id}`, `{type:"membre", id}`, `{type:"rdv", id}` |

## Emplacements branchés

- Fiche publique pro `/cercles/pro/:slug` : en-tête + chaque produit (`fournisseur`, `produit:<id>`) et prestation (`cercles`, `service:<id>`).
- Annuaire `/cercles/annuaire` : chaque carte.
- Espace pro `/cercles/espace` : onglet **Appels vidéo** (répondre, rejoindre, « appeler le cabinet »).
- Suivi de chantier (jalon d'un projet) : « Demander un appel vidéo » avec choix des participants ; l'ancienne salle permanente du jalon (`POST …/jalons/<code>/visio`) répond désormais **410 appel_sur_demande**.
- Panier « demande de prix » matériaux : appel avec le cabinet après envoi.
- Back-office : `/cc/appels` (toutes les demandes, réponse au nom du cabinet, coordonnées, WhatsApp, rejoindre), `/cc/dossiers` (ligne dépliée : appel avec le client du dossier), `/cc/rendez-vous` (appel de suivi avec le client du RDV).
- Rendez-vous `/rendez-vous` : déjà conforme — l'architecte publie ses créneaux (accord préalable), le client en choisit un (accord) ; la salle n'ouvre que de 15 min avant à 2 h après.

### À brancher par les autres sessions (points d'accroche prêts)

- **Espace dossier client** (session « Débrancher l'ancienne API », lot 3a/3b) : quand `functions/_lib/clientSession.ts` (`lireSessionClient`) existera, ajouter le genre d'acteur `client` dans `ActeurConnecte` (`appelsService.ts`) et une route `functions/api/<chemin du cookie client>/appels/[[chemin]].ts` sur le modèle de `functions/api/projets/appels`. Côté écran : `<DemanderAppelVideo porte="client" contexte="dossier" objetId={dossierId} invites={[{ type: "admin" }]} />` + `<MesAppels espace={{ type: "client" }} />`. En attendant, le client d'un dossier **reçoit** les demandes du cabinet et y répond par son lien personnel `/appel/<jeton>`.
- **Demandes de prix reçues par un pro** (RFQ côté fournisseur) : un type d'invité `lead` (coordonnées du lead, jamais montrées au pro) se branche dans `appelsResolveur.ts`.

## Règles garanties (testées)

1. Création → `EN_ATTENTE`, `salle = null`, aucun créneau retenu. Seule `appliquer()` fait évoluer une demande ; la salle (`<contexte>-` + 24 caractères aléatoires) n'est tirée **que** dans la transition vers `CONFIRMEE`.
2. `CONFIRMEE` ⇔ il existe un créneau futur accepté par **chaque** participant (le demandeur accepte ses propres créneaux ; « dès que possible » = il accepte tout créneau proposé par les invités dans les 72 h). Contre-proposition : le demandeur doit à son tour accepter.
3. Refus d'un invité → `REFUSEE` ; annulation par n'importe quel participant, même confirmée → `ANNULEE` ; plus de créneau atteignable → `EXPIREE` ; fin + 2 h → `TERMINEE` (calculé à la lecture, sans cron).
4. Jeton JaaS : participant seulement (cookie ou lien personnel), demande `CONFIRMEE`, fenêtre **[début − 10 min ; début + 2 h]**, 20 jetons au plus par participant. Le back-office ne rejoint que s'il est invité.
5. Lien personnel : 256 bits dérivés `HMAC(APPELS_SECRET, appel|demande|participant|sel)`, seule l'empreinte SHA-256 est stockée ; il n'ouvre que cette demande. Les liens « Accepter / Proposer / Refuser » des e-mails ouvrent la page avec l'action **présélectionnée** : rien ne change sans clic (les antivirus de messagerie ouvrent les liens).
6. Anti-harcèlement : 5 demandes / 24 h par demandeur (60 pour le cabinet), une seule demande en attente par paire, 3 par paire / 7 jours, 20 reçues / 24 h par destinataire ; « Ne plus recevoir de demandes de cette personne » (refus silencieux : `destinataire_indisponible`). Filet par IP sur la porte publique, pot de miel.
7. Anti-désintermédiation : e-mails, numéros, liens et messageries masqués dans le message ; une vue participant ne contient jamais les coordonnées des autres, ni jeton, sel ou nom de salle.

## Variables Cloudflare

| Variable | Rôle |
|---|---|
| `JAAS_APP_ID`, `JAAS_KEY_ID`, `JAAS_PRIVATE_KEY_PEM` | salle intégrée (voir `docs/guides/configurer-visio-jaas.md`) ; absentes → les demandes fonctionnent, la salle affiche « visio pas encore activée » |
| `APPELS_SECRET` (≥ 32 caractères) | liens personnels ; à défaut `ADMIN_SESSION_SECRET` ; aucun des deux → 503 `appels_non_configures` |
| `RESEND_API_KEY`, `LEAD_NOTIFY_FROM`, `LEAD_NOTIFY_TO` | e-mails (le cabinet reçoit sur `LEAD_NOTIFY_TO`) |
| `PUBLIC_WEB_URL` | domaine des liens (défaut `https://citurbarea.com`) |
| `APPELS_CRON_CLE` (facultatif, ≥ 24 caractères) | rappels par un cron externe : `POST /api/appels/rappels` avec l'en-tête `x-cle-cron`. Sans cron, les rappels partent quand le back-office ou un espace pro ouvre sa liste. |
