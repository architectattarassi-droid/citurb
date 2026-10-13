# Contrat — messagerie de la plateforme (tout passe par CITURBAREA)

Règle du fondateur (CLAUDE.md) : clients, pros et fournisseurs n'échangent **jamais** leurs coordonnées. Ils s'écrivent dans des **fils** de la plateforme et s'appellent par **« Demander un appel vidéo »** (`contrat-appels-video.md`), qui s'intègre au fil.

## Où est le code

| Rôle | Fichier |
|---|---|
| Logique pure (fil, messages, masquage, débit, notifications, vues, lien de boîte signé) | `functions/_lib/messagerie.ts` |
| Stockage Neon + mémoire (tests) | `functions/_lib/messagerieDepot.ts` |
| Orchestration, routeur, appel depuis le fil, journal des appels | `functions/_lib/messagerieService.ts` |
| Contexte commun appels + messagerie | `functions/_lib/contexteNeon.ts` |
| Routes | `functions/api/messages/[[chemin]].ts` (visiteur, lien de fil, lien de boîte), `functions/api/cc/messages/[[chemin]].ts` (back-office), `functions/api/cercles/espace/messages/[[chemin]].ts` (pro) |
| Tables | `docs/sql/messagerie-neon.sql` (`Conversation`, `MessageConversation` ; blocages : `BlocageAppel` des appels) |
| Front | `apps/web/src/features/messages/` : `EcrireMessage` (bouton), `FilConversation`, `BoiteMessages`, `MessagesPage` (`/messages/:jeton`, `/messages/boite/:jeton`, versions `/ar/…`) ; back-office `/cc/messages` ; onglet « Messages » de l'espace pro |
| Tests | `apps/web/src/features/messages/messagerie.test.ts` |

## Brancher le bouton

Mêmes props que `<DemanderAppelVideo />` (même matrice « qui peut écrire à qui » : `autoriserCreation`) :

```tsx
<EcrireMessage porte="public" | "admin" | "pro" contexte="cercles" objetId={slug} invites={[{ type: "pro", slug }]} avecNom="Atlas Menuiserie" sujet="Porte d'entrée" />
```

Emplacements branchés : fiche pro (en-tête, produits, prestations), annuaire, pages fournisseurs / matériau / variantes de la matériauthèque, panier de demande de prix, espace pro (onglet Messages + « Écrire au cabinet »), `/cc/dossiers` (client du dossier), `/cc/rendez-vous` (client du RDV), `/cc/messages`.

Le chantier garde sa **discussion par jalon** (espace projet, membres) : pas de second fil.

### À brancher par les autres sessions

- **Espace dossier client** (lot 3a/3b) : ajouter le genre `client` dans `ActeurConnecte` et `cleDe` (`messagerieService.ts`), une route `<chemin du cookie client>/messages/[[chemin]].ts` sur le modèle de l'espace pro, puis `<BoiteMessages source={{ type: "client" }} />` et `<EcrireMessage porte="client" contexte="dossier" objetId={dossierId} invites={[{ type: "admin" }]} />`. En attendant, le client reçoit ses liens de fil et de **boîte** (`/messages/boite/<jeton signé>`, 180 jours) par e-mail.
- **Documents** (étape 2) : `MessageConversation.meta.documents = [{ id, nom }]` — le message ne porte qu'une **référence** à un document déposé.

## Règles garanties (testées)

1. **Aucune coordonnée** : moteur commun du site (`functions/_lib/coordonnees.ts` : numéros MA et internationaux y compris en chiffres arabes, e-mails y compris « (at) », liens, domaines, messageries et réseaux) complété par les pseudos `@…` ; masquage dans les messages, le sujet, le nom d'un visiteur et les motifs de signalement. Les vues d'un participant ne contiennent ni les coordonnées des autres, ni identifiant interne (`Fournisseur.id`), ni jeton, ni sel. Les e-mails partent de CITURBAREA, sans coordonnée de l'autre partie.
2. Un seul fil **ouvert** par groupe de personnes et par sujet. Sans session, un deuxième « premier message » ne révèle rien : le lien du fil existant est renvoyé à l'adresse du titulaire (409 `conversation_existante`).
3. Accès : participant par session ou par son lien personnel (HMAC, empreinte seule stockée) ; un tiers ne voit rien (404). Le back-office lit tout (modération) mais n'écrit que s'il est invité.
4. Lu / non lu par participant ; e-mail au plus une fois par quart d'heure et par fil tant que rien n'est lu.
5. Débit : 30 messages / 10 min, 300 / 24 h par auteur ; 5 nouveaux fils / 24 h (100 pour le cabinet). Filet par IP sur la porte publique, pot de miel.
6. Bloquer (depuis le fil) = plus de message **ni** de demande d'appel de ces personnes (table commune `BlocageAppel`) ; le cabinet n'est jamais bloquable. Signaler = fil `SIGNALEE` + e-mail au cabinet. Modération : retirer / rétablir un message (jamais supprimé), fermer / rouvrir un fil.
7. Appel depuis le fil : les invités sont les autres participants ; chaque étape (demande, acceptation, contre-proposition, refus, annulation, confirmation, fin ou expiration) est inscrite dans le fil avec date, durée prévue et participants.

## Mention à ajouter aux CGU / politique de confidentialité (proposition, à valider)

> **Messagerie et appels vidéo.** Les échanges entre utilisateurs (clients, professionnels, fournisseurs) passent exclusivement par CITURBAREA. Pour protéger chacun et prévenir la fraude et le contournement de la plateforme, les numéros de téléphone, adresses e-mail, liens et identifiants de messagerie saisis dans les messages sont automatiquement masqués. Les messages sont conservés pendant la durée de la relation et au plus **3 ans** après le dernier échange, puis supprimés ou anonymisés. L'équipe de modération de CITURBAREA (HSE DECO) peut consulter les conversations **uniquement** pour traiter un signalement, prévenir un abus ou respecter une obligation légale ; elle peut retirer un message ou fermer une conversation. Chaque utilisateur peut bloquer un interlocuteur ou signaler une conversation. Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition : contact via la page Contact de CITURBAREA. *(Durée de conservation et déclaration CNDP à confirmer par le responsable du traitement.)*
