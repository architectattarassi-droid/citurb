# Parcours client CITURBAREA — du premier contact à la fin des garanties

Version analysée : commit `427f641` (branche `feat/backoffice-leads-local`, entièrement contenue dans `main`, qui a deux commits de plus, jusqu'à `1433cd8`), le 15-16/10/2026.
Site public : https://citurbarea.com — back-office : https://admin.citurbarea.com

**Comment ce document a été vérifié.**
- Le code : le routeur du site (`apps/web/src/tomes/tome1/router/routes.tsx`), le back-office (`apps/web/src/command-center/CommandCenterApp.tsx` et la fiche `FicheDossier.tsx`), l'espace client (`features/espace-client/`, `features/mon-dossier/`), l'espace projet (`features/projet/`), les Functions (`functions/`), les contrats `docs/architecture/*.md` et le référentiel `docs/gestion-projet/`.
- La production, en lecture seule : un simple chargement de chaque page et de chaque route citée (code HTTP). Aucun formulaire n'a été envoyé, aucune donnée créée, aucune connexion ouverte.
- On a aussi vérifié que la version en ligne contient bien les derniers écrans : le code du back-office servi par la production contient « Parcours A → Z », « Plans & vues », « Documents à vérifier », « Échéances », « En attente de paiement », « Tentatives de contact direct » et « Bureau de contrôle ».
- Les écrans réservés (back-office, espace client, espace projet) ne s'ouvrent pas sans connexion. Le site renvoie bien la page (200), et les données répondent « non connecté » (401) comme prévu. Leur contenu est donc décrit d'après le code et porte la mention **« vérifié dans le code »**.
- Base de données Neon : au 15/10, les 40 tables sont présentes et aucune colonne ne manque (requête de contrôle). Les tables des appels vidéo et de la messagerie sont en place : leurs routes répondent « lien invalide », et non plus « indisponible ».

**Légende des statuts.**
- ✅ fonctionne de bout en bout.
- 🟡 fonctionne, mais en partie seulement, ou dépend d'un réglage encore absent (la raison est donnée).
- 💤 en sommeil : la page affiche « bientôt disponible ».
- ❌ n'existe pas encore.

**Règle permanente : aucune coordonnée échangée.** Le client, les professionnels et les fournisseurs ne voient jamais le téléphone, l'e-mail, l'adresse ou les réseaux les uns des autres. Seules les coordonnées de CITURBAREA / HSE DECO (`apps/web/src/config/contact.ts`) sont publiques. On se parle par la messagerie de la plateforme ou par une demande d'appel vidéo acceptée par tous. Les numéros, e-mails et liens tapés dans un message, un nom de fichier ou un compte rendu sont masqués automatiquement et comptés comme « tentative de contact direct ». Au bout de 3 tentatives en 7 jours, l'écriture est suspendue jusqu'à ce que l'admin la rétablisse.

---

## 1. Résumé en 10 lignes

1. **De bout en bout, en production :** découverte, estimation, demande par les portes ou le formulaire court, rendez-vous visio, puis dossier dans le back-office.
2. **Le client a maintenant un espace sans mot de passe.** L'admin lui envoie un lien `/mon-dossier/<jeton>`, ou le client clique sur « Recevoir mon lien ». Ce lien ouvre `/mon-espace`.
3. **Dans `/mon-espace`, le client trouve :** la frise des 15 phases (en français et en arabe), « Ce que nous attendons de vous », les messages, les appels vidéo, les documents, les devis, les factures et les paiements par phase, l'acceptation du devis en ligne, ainsi que les plans et les vues publiés.
4. **L'admin pilote tout depuis la fiche `/cc/dossiers/:id`.** Elle couvre les phases P00 à P14, le profil du projet, le bureau de contrôle au-delà de 5 MDH, le visa de l'ordre régional, les devis, les factures, les encaissements, les avoirs, les documents par phase, les plans et la vue client.
5. **Une phase démarre après le paiement de son échéance.** Sinon, elle reste « En attente de paiement », sauf si l'admin la débloque en écrivant un motif.
6. **Le dossier d'exécution (DEXE) avance en parallèle de l'instruction du permis.** Une révision du permis ouvre automatiquement sa mise à jour.
7. **Le chantier se suit dans l'espace projet `/projet/<jeton>`.** On y trouve les jalons, 21 PV de contrôle numériques et les points d'arrêt, que seul l'admin peut débloquer, avec un motif.
8. **Ce qui reste partiel :**
   - pas de R2, donc des fichiers limités (images 1,5 Mo, PDF 2 Mo, vidéos par lien YouTube ou Vimeo) et pas de photos de jalon ;
   - les identifiants légaux de HSE DECO manquent sur les factures ;
   - l'archive Google Drive et `JAAS_WEBHOOK_SECRET` ne sont pas configurés ;
   - **les notifications : aucun e-mail n'arrive au fondateur, et le client ne reçoit rien après un formulaire (voir section 3).**
9. **Ce qui n'existe pas encore :**
   - le paiement en ligne ;
   - le planning Gantt, les réserves structurées et le suivi financier des travaux (lots GP6 à GP8) ;
   - la proposition de matériaux par le client ;
   - les avis clients ;
   - la page `/realisations` ;
   - la mention « messagerie et appels » dans les conditions d'utilisation.
10. **La matériauthèque, l'annuaire et les terrains sont vides.** Aucune fiche de fournisseur ni aucune annonce n'est encore validée. Les demandes de prix aux professionnels n'ont donc encore personne à qui s'adresser.

---

## 2. Le parcours, étape par étape (sections A à J)

Les liens « client » pointent vers https://citurbarea.com, et les liens « admin » vers https://admin.citurbarea.com. Une adresse avec `<jeton>` est un lien personnel envoyé au client. Si on l'ouvre sans jeton valide, la page affiche « lien invalide ». Le code entre parenthèses est le code HTTP relevé le 15/10.

### A. Découverte

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| A1 | Accueil [citurbarea.com](https://citurbarea.com/) : les 6 portes, l'estimation, le rendez-vous, et WhatsApp vers le numéro de CITURBAREA (200). | Rien. Le bandeau de chiffres du back-office compte les leads. La page « Visites » est en sommeil. | Aucun | Clic sur une porte, sur l'estimation ou sur le rendez-vous | ✅ |
| A2 | Guides : [/guide](https://citurbarea.com/guide), [permis de construire](https://citurbarea.com/guide/permis-de-construire-maroc), [permis d'habiter](https://citurbarea.com/guide/permis-habiter-certificat-conformite-maroc). Pages villes : [/architecte-kenitra](https://citurbarea.com/architecte-kenitra), [/architecte-rabat](https://citurbarea.com/architecte-rabat). [Services](https://citurbarea.com/services). Toutes en 200. | Rien | Aucun | Bouton d'appel à l'action de la page | ✅ |
| A3 | Portes en trois langues : [FR](https://citurbarea.com/fr/porte-01-projet-personnel), [EN](https://citurbarea.com/en/door-01-personal-family-project), [AR](https://citurbarea.com/ar/bab-01-mashrou-shakhsi-wa-usari). Accueils [/ar](https://citurbarea.com/ar) et [/en](https://citurbarea.com/en) (200). | Rien | Aucun | Bouton vers la porte | ✅ |
| A4 | Diaspora : [/mre](https://citurbarea.com/mre) et [/cercles/diaspora](https://citurbarea.com/cercles/diaspora) (200). Les impasses du 14/10 ont été corrigées. | Rien | Aucun | Rendez-vous ou porte | ✅ |
| A5 | Pages légales : [mentions légales](https://citurbarea.com/mentions-legales) et [confidentialité](https://citurbarea.com/confidentialite). [/cgu](https://citurbarea.com/cgu) redirige (301) vers les mentions légales, partie « conditions ». | Rien | Aucun | — | 🟡 La mention « messagerie et appels vidéo : coordonnées masquées, conservation, loi 09-08 », proposée dans `contrat-messagerie.md`, n'est publiée nulle part. |
| A6 | [/realisations](https://citurbarea.com/realisations) | — | — | — | ❌ 404 : pas de page des réalisations. |

### B. Estimation et première demande

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| B1 | [/chiffrage](https://citurbarea.com/chiffrage) : estimation du coût de construction par lot, avec les prix de référence du catalogue 2026-10.1. [/chiffrage/devis](https://citurbarea.com/chiffrage/devis) : devis estimatif imprimable. [/calculateur](https://citurbarea.com/calculateur) mène au même outil. | Il met à jour les prix de référence dans [/cc/materiaux](https://admin.citurbarea.com/cc/materiaux). | Aucun | Le client passe par une porte ou demande un rendez-vous. | ✅ |
| B2 | [/simulateur](https://citurbarea.com/simulateur) : simulateur d'honoraires (200). | Il dispose du même outil dans [/cc/simulateur](https://admin.citurbarea.com/cc/simulateur). | Aucun | Idem | ✅ |
| B3 | [/materiaux](https://citurbarea.com/materiaux) : familles de matériaux, prix de référence, « Écrire un message » et « Demander un appel vidéo ». [/materiaux/planning](https://citurbarea.com/materiaux/planning) : planning d'achat. [/materiaux/fournisseurs](https://citurbarea.com/materiaux/fournisseurs) : liste des fournisseurs. | Il valide les fiches des fournisseurs dans [/cc/fournisseurs](https://admin.citurbarea.com/cc/fournisseurs). | Aucun | Demande de prix | 🟡 Les prix de référence s'affichent, mais 0 fournisseur et 0 produit sont publiés : l'API catalogue renvoie `total: 0`. |
| B4 | [/materiaux/commande](https://citurbarea.com/materiaux/commande) : panier de demande de prix, puis « Envoyer ma demande ». | Il reçoit un lead P6 dans [/cc/leads](https://admin.citurbarea.com/cc/leads), puis peut ouvrir un appel avec le client. | Aucun | Le lead est traité. | ✅ pour la demande de prix · 💤 pour la commande en ligne (désactivée volontairement) |
| B5 | Les portes : [/p1](https://citurbarea.com/p1), puis [/p1/packs](https://citurbarea.com/p1/packs), puis la confirmation [/p1/dossier](https://citurbarea.com/p1/dossier). Puis [/p2](https://citurbarea.com/p2), [/p3](https://citurbarea.com/p3), [/p4](https://citurbarea.com/p4) et [/p5](https://citurbarea.com/p5), toutes en 200. [/p6](https://citurbarea.com/p6) redirige vers les Cercles. L'écran de succès propose le rendez-vous et WhatsApp. | Il voit le lead dans [/cc/leads](https://admin.citurbarea.com/cc/leads) et le dossier créé automatiquement (compte client et dossier) dans [/cc/dossiers](https://admin.citurbarea.com/cc/dossiers). | P5 : la note de renseignements n'est plus déposée dans la porte. Le client la déposera dans son espace (étape C). | L'admin qualifie le lead et propose un rendez-vous. | ✅ |
| B6 | [/creer-compte](https://citurbarea.com/creer-compte) : formulaire court, sans mot de passe (200). | Il voit le lead dans [/cc/leads](https://admin.citurbarea.com/cc/leads). | Aucun | Qualification | ✅ |
| B7 | Terrains : [/p4/terrains/deposer](https://citurbarea.com/p4/terrains/deposer) pour déposer une annonce, [/p4/terrains](https://citurbarea.com/p4/terrains) pour les consulter. | Il valide les annonces dans [/cc/terrains](https://admin.citurbarea.com/cc/terrains). | Description du terrain | Validation par l'admin | 🟡 Le dépôt fonctionne, mais 0 annonce est publiée (`/api/terrains` renvoie `[]`). |
| B8 | Fiches pro et annuaire : [/cercles/annuaire](https://citurbarea.com/cercles/annuaire). Boutons « Écrire un message » et « Demander un appel vidéo ». | Il suit tout dans [/cc/messages](https://admin.citurbarea.com/cc/messages) et [/cc/appels](https://admin.citurbarea.com/cc/appels). | Aucun | Réponse du professionnel par la plateforme | 🟡 Les tables sont en place, mais l'annuaire est vide (0 fiche publiée). |

### C. Rendez-vous, ouverture du dossier et espace client

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| C1 | [/rendez-vous](https://citurbarea.com/rendez-vous) : le client choisit un créneau de 30 minutes parmi des créneaux réels (`/api/rdv/creneaux` répond 200). Le rendez-vous est confirmé automatiquement. | Il voit le rendez-vous dans [/cc/rendez-vous](https://admin.citurbarea.com/cc/rendez-vous), ainsi que le lead et le dossier qui y sont reliés. C'est là qu'il règle les créneaux. | Aucun | Le rendez-vous a lieu. | ✅ |
| C2 | `/rdv/<jeton>` : son espace de rendez-vous. Il peut y annuler ou déplacer le rendez-vous, compléter son dossier, déposer des documents (dépôt commun, contexte « rdv ») et rejoindre la visio JaaS, ouverte de 15 minutes avant jusqu'à 2 heures après le début. | Il rejoint la visio depuis [/cc/rendez-vous](https://admin.citurbarea.com/cc/rendez-vous) et modère les documents dans [/cc/documents](https://admin.citurbarea.com/cc/documents). | Note de renseignements, titre foncier ou plans existants, si le client les a | Fin du rendez-vous et qualification | ✅ (JaaS est configuré ; écran vérifié dans le code) |
| C3 | — | Qualification dans [/cc/leads](https://admin.citurbarea.com/cc/leads) : étape du lead, notes, formulaires abandonnés, bouton « + Nouveau dossier ». | — | Décision d'ouvrir ou de compléter le dossier | ✅ |
| C4 | — | [/cc/dossiers/nouveau](https://admin.citurbarea.com/cc/dossiers/nouveau) : il crée le dossier d'un client existant d'ARC-BATI ou d'un autre cabinet, à n'importe quelle phase. Les étapes antérieures sont marquées « faites hors plateforme » et les missions déjà réglées sont enregistrées. Les doublons (compte, lead, dossier) sont signalés. Le lien d'invitation est créé sans aucune coordonnée. | Ce qui existe déjà : permis, plans, contrat, selon la phase | Le dossier est créé et le lien est envoyé au client. | ✅ (vérifié dans le code) |
| C5 | `/mon-dossier/<jeton>` (et sa version arabe `/ar/mon-dossier/<jeton>`) : le client voit son dossier sur mobile, en français ou en arabe. Le lien est valable 90 jours et ouvre la session client. | Dans la fiche [/cc/dossiers/:id](https://admin.citurbarea.com/cc/dossiers), le bouton « Lien d'accès du client » permet de copier le lien en français ou en arabe, ou de l'envoyer par WhatsApp avec un message prérempli. | — | Le client ouvre le lien. | ✅ (200 ; l'API répond `lien_invalide` sans jeton valide) |
| C6 | [/mon-espace](https://citurbarea.com/mon-espace) (ou [/portal](https://citurbarea.com/portal)) et [/login](https://citurbarea.com/login) : sans session, le client voit le bouton « Recevoir mon lien ». La réponse est la même, que le compte existe ou non. | Si l'e-mail ne part pas, la demande est inscrite au journal du dossier et c'est l'équipe qui renvoie le lien. | — | Le client reçoit le lien. | 🟡 L'e-mail dépend de Resend, et aucun e-mail n'arrive aujourd'hui (voir section 3). |
| C7 | `/mon-espace`, connecté : ses dossiers, la frise des 15 phases (FR/AR, avec les durées types), « Ce que nous attendons de vous » (les documents à fournir), « Devis et factures », « Plans et vues de mon projet », les documents par phase, les messages et les appels. | Il voit exactement la même chose dans la vue client [/cc/dossiers/:id/shadow](https://admin.citurbarea.com/cc/dossiers), ou par le bouton « Vue client » de la fiche. | Pièces listées dans « Ce que nous attendons de vous » | — | ✅ (vérifié dans le code) |
| C8 | Dans `/mon-espace` : « Écrire un message » et « Demander un appel vidéo » au cabinet. Le client ne peut inviter que le cabinet, et seulement sur ses propres dossiers. | Il répond dans [/cc/messages](https://admin.citurbarea.com/cc/messages) et [/cc/appels](https://admin.citurbarea.com/cc/appels), ou depuis l'onglet « Échanges » de la fiche. | — | — | ✅ (vérifié dans le code) |

### D. Phase P00 — programme, devis, acceptation, facture et paiement

Tout se passe dans la fiche [/cc/dossiers/:id](https://admin.citurbarea.com/cc/dossiers), qui compte huit onglets : Parcours A → Z, Documents par phase, Plans & vues, Échanges, Journal, Devis, Factures et Données. L'onglet **Parcours A → Z** regroupe les étapes par phase, de P00 à P14 (titres en français et en arabe). Il commence par 6 étapes commerciales : lead, rendez-vous, qualification, devis, contrat et paiement. Chaque étape peut être faite, faite hors plateforme, en cours, à faire, sans objet ou débloquée. L'admin peut aussi rouvrir une étape, en faire la phase actuelle, forcer le statut, ajouter une note OPS et **Débloquer** le dossier avec un motif obligatoire. Rien n'est bloquant pour l'admin, et tout est inscrit au **Journal**.

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| D1 | La frise montre « Idée, programme et choix de l'architecte ». | Dans l'onglet Parcours, panneau **Profil du projet**, il saisit le type, le budget en MDH, le nombre d'étages (R+n), les sous-sols, la surface et les équipements. Le **bureau de contrôle** devient obligatoire au-delà de 5 MDH (recommandé en dessous). La TRC et la décennale deviennent obligatoires au-delà de 3 étages ou de 800 m². L'**ordre régional compétent** est déduit de la commune. | Besoin exprimé, programme signé | Profil enregistré | ✅ (vérifié dans le code) |
| D2 | Dans « Devis et factures », le client voit le devis émis, le consulte et le télécharge en PDF. | Onglet **Devis** : il prépare un brouillon avec aperçu en direct (métré par niveau, prestations, exclusions), puis l'émet. Le devis reçoit un numéro `DEV-AAAA-NNNN` et est figé avec une empreinte. Il peut ensuite être révisé (`-R2`) ou refusé. Le PDF et le DOCX sont générés dans le navigateur. | — | Devis émis | ✅ |
| D3 | Le client clique sur « Accepter » en ligne. L'acceptation est horodatée et liée à l'empreinte du devis. | Ou bien l'admin enregistre l'acceptation avec le **scan signé** (obligatoire), le pack choisi et les prestations commandées. | Devis signé (scan), ou acceptation en ligne | Devis au statut ACCEPTÉ | ✅ |
| D4 | Le client voit les paiements par phase et la prochaine échéance. | Onglet **Factures** : l'**échéancier par phase** est proposé selon les modalités (paiement total d'avance, 50/50, par tranches, par visite). L'admin peut le modifier, et chaque modification est journalisée. | — | Échéance exigible | ✅ |
| D5 | Le client voit la facture et la télécharge. | Il émet une facture `FAC-AAAA-NNNN` par échéance. **L'émetteur est CITURBAREA / HSE DECO**, avec une TVA de 20 % par défaut et le montant en lettres. Le cabinet n'y figure que comme « architecte du projet », sans coordonnées. Les factures sont numérotées sans trou et ne peuvent plus être modifiées. Une correction se fait par **avoir** `AVO-AAAA-NNNN`. | — | Facture émise | 🟡 L'ICE, l'IF, le RC, la patente et le siège de HSE DECO sont vides : la facture affiche « à compléter ». |
| D6 | Le client paie par virement, chèque, espèces ou effet, hors ligne. | Il enregistre l'**encaissement** : référence et justificatif dans le dépôt commun, montant plafonné au reste à payer. La facture passe à « partiellement réglée », puis à « réglée ». | Justificatif de paiement | Échéance payée | ✅ |
| D7 | [/payment/start](https://citurbarea.com/payment/start) | — | — | — | 💤 Pas de paiement en ligne (choix assumé : paiement manuel). |
| D8 | La frise affiche le statut de paiement de chaque phase et sa date de démarrage. | **Les phases sont déclenchées par le paiement.** Une phase dont l'échéance n'est pas payée reste « En attente de paiement ». Le serveur refuse de la mettre en cours, d'y avancer la phase du dossier ou de démarrer ses jalons (erreur 409). Le bouton de déblocage, dans l'en-tête de la phase, exige un motif d'au moins 10 caractères, inscrit au journal. | — | Paiement reçu, ou déblocage motivé | ✅ (vérifié dans le code) |
| D9 | — | Le contrat d'architecte (jalon P00) est attendu comme pièce dans « Documents par phase ». | Contrat d'architecte signé | Pièce déposée et validée | 🟡 Aucun générateur de contrat (l'ancien service NestJS est éteint). Le devis accepté sert de base contractuelle. |

### E. Phases P01 à P03 — foncier, faisabilité, esquisse, APS et APD

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| E1 | Dans « Ce que nous attendons de vous » et dans les documents par phase, chaque pièce absente est marquée « Document manquant ». Le client dépose ses pièces depuis `/mon-espace`. | Onglet **Documents par phase** : il voit les pièces attendues phase par phase et lot par lot, les normes de chaque lot et les pièces conditionnelles selon le profil. Il valide ou refuse chaque pièce. Une pièce déposée par le client attend sa décision dans [/cc/documents](https://admin.citurbarea.com/cc/documents) (« Documents à vérifier »). | P01 : situation foncière, note de renseignements urbanistiques, levé topographique, étude géotechnique, note de faisabilité | Faisabilité validée par le client (point d'arrêt) | ✅ (vérifié dans le code) |
| E2 | « Plans et vues de mon projet » : une galerie par phase (Esquisse, APS, APD, EXE), par catégorie (situation et masse, plans d'étage, coupes, façades, vues 3D, détails, vidéos, notices) et par niveau. Une visionneuse permet de zoomer et d'ouvrir les PDF dans la page. Le client ne voit que ce qui est **publié**. | Onglet **Plans & vues** : il dépose un fichier dans une case. Le fichier reste « Non publié » (brouillon) jusqu'à ce qu'il clique sur « Publier ». Un nouvel envoi dans la même case crée une nouvelle version. Les vidéos s'ajoutent par un lien YouTube ou Vimeo, puis se publient. | P02 : esquisse, APS ; P03 : APD, notices | APS, puis APD, validés par écrit par le client (points d'arrêt) | 🟡 Sans R2 : images limitées à 1,5 Mo et PDF à 2 Mo, ce qui est souvent trop petit pour un jeu de plans. Pas de fichier vidéo. |
| E3 | Le client donne son accord sur l'APS ou l'APD par message, ou en signant un document. | Il marque l'étape « faite » dans le Parcours, avec une note. | APS ou APD signé | Étape marquée faite | 🟡 Il n'y a pas de bouton « Je valide l'APS » dans `/mon-espace`. La validation en ligne par rôle n'existe que dans l'espace projet. |
| E4 | — | P03 : il note les bureaux d'études et le bureau de contrôle mandatés. Les pièces du bureau de contrôle n'apparaissent que si le budget dépasse 5 MDH. | Conventions avec les bureaux d'études et le bureau de contrôle | APD validé | ✅ (vérifié dans le code) |
| E5 | À partir de l'APD, le client devrait pouvoir proposer un matériau de la matériauthèque, l'architecte gardant la validation (décision du 15/10). | — | — | — | ❌ Aucun écran ni aucune route. |

### F. Phases P04 et P05 — autorisation de construire et dossier d'exécution en parallèle

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| F1 | La frise affiche « Autorisation de construire » ; les pièces à fournir sont listées. | Il suit la constitution du dossier, le dépôt sur Rokhas et le récépissé sous forme de pièces. Il n'y a pas de connexion à Rokhas : l'ancien écran `/dossier/:id/rokhas` est en sommeil. | Dossier d'autorisation, récépissé de dépôt Rokhas | Dépôt fait (étape 30) | ✅ (suivi documentaire) |
| F2 | — | L'étape « Visa de l'ordre régional compétent » (ancien « visa CNOA ») indique le conseil régional déduit de la commune : Kénitra, Rabat, Agadir avec son antenne de Dakhla… | Dossier visé par l'ordre régional | Visa obtenu | 🟡 La liste commune → ordre est incomplète : plusieurs entrées sont marquées « à vérifier ». |
| F3 | La frise affiche le DEXE « en cours en parallèle » dès le dépôt. | Le dossier d'exécution (étape 40) ne dépend que du dépôt, pas du permis. L'attribution du marché (54) et l'ouverture du chantier (80) dépendent, elles, du permis (34). | P05 : structure, lots techniques, détails, synthèse | — | ✅ (vérifié dans le code) |
| F4 | La frise affiche le permis délivré. | Il saisit les dates du permis et la date limite de démarrage dans le panneau des dates. Le bandeau d'alertes de [/cc/dossiers](https://admin.citurbarea.com/cc/dossiers) signale les autorisations expirées ou à J−90. | Arrêté de permis, plans visés « ne varietur », quittance de la taxe | Permis délivré (point d'arrêt) | ✅ |
| F5 | — | **Mise à jour du DEXE après une révision du permis.** Elle s'ouvre seule quand une nouvelle version d'une pièce P04 est déposée, ou par l'action « révision du permis ». Les écarts sont journalisés et les pièces P05 déjà déposées portent le badge « à reprendre ». L'admin clôture ensuite la mise à jour (étape `GP_MAJ_DEXE`). | Permis modificatif, pièces P05 reprises | Mise à jour clôturée | ✅ (vérifié dans le code) |
| F6 | — | L'ancien écran `/permis-construire/:id` | — | — | 💤 Remplacé par la fiche. |

### G. Phases P06 et P07 — consultation, marchés et ouverture du chantier

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| G1 | — | Métré et DQE avec [/cc/simulateur](https://admin.citurbarea.com/cc/simulateur) et le chiffrage. Le générateur de CPS ([/cps](https://citurbarea.com/cps)) est en sommeil. | Métré, DQE, DCE, CPS | Dossier de consultation prêt (point d'arrêt) | 💤 pour le CPS en ligne · le métré se fait localement |
| G2 | — | Il consulte les entreprises par la messagerie et les appels vidéo, sans échange de coordonnées. | Offres et tableau comparatif | Offres analysées | 🟡 L'annuaire des professionnels est vide : la consultation passe encore par l'équipe, hors annuaire. |
| G3 | La frise affiche les dates du marché. | Il saisit les dates des assurances et des cautions. Elles alimentent les **échéances**. | Marché signé, TRC et décennale (obligatoires au-delà de 3 étages ou de 800 m²), cautions | Marché signé, assurances et cautions en place (points d'arrêt) | ✅ |
| G4 | Le client reçoit un lien `/projet/<jeton>` qui ouvre [/projet](https://citurbarea.com/projet) : les jalons du chantier, la checklist, les documents, la discussion par jalon. | Dans [/cc/projets](https://admin.citurbarea.com/cc/projets), il crée l'espace projet relié au dossier, puis invite le client et les intervenants, désignés par leur rôle et leur raison sociale. La phase du dossier et celle de l'espace projet sont synchronisées. | — | Espace projet ouvert | 🟡 Il faut un deuxième lien, différent de `/mon-dossier`. `/mon-espace` ne renvoie pas vers l'espace projet. |
| G5 | Dans l'espace projet : l'ordre de service, la déclaration d'ouverture, l'installation, la réunion de démarrage et l'implantation. | Il valide les jalons et les PV. | Ordre de service, déclaration d'ouverture, PV d'implantation | Implantation réceptionnée (point d'arrêt) | ✅ (vérifié dans le code) |

### H. Phases P08 à P10 — fondations, gros œuvre et second œuvre

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| H1 | Dans l'espace projet, chaque jalon a ses onglets : Checklist, Exigences (normes), Documents (PV types), Discussion et Photos. Un badge rouge signale les **points d'arrêt**. | Il suit l'avancement dans [/cc/projets](https://admin.citurbarea.com/cc/projets). | **PV de chantier numériques** : 21 checklists (142 points de contrôle). Chacune contient la visite, les critères et tolérances, la norme, la mesure relevée, les réserves et la décision. | Le PV est signé par tous les rôles et n'est pas refusé. | ✅ (vérifié dans le code) |
| H2 | Message « PV de contrôle exigés avant de continuer » : PV non rempli, à signer, refusé ou signé. | **Seul l'admin peut débloquer un point d'arrêt**, avec un motif écrit, inscrit au journal du projet et du dossier, et visible des intervenants. Exemple : PV signé sur papier, scan déposé ensuite. | — | Déblocage motivé | ✅ (vérifié dans le code) |
| H3 | Onglet Photos du jalon (photos prises au téléphone). | — | Photos de chantier | — | 🟡 Les photos de jalon ont besoin de R2 : sans R2, l'envoi répond « stockage non activé ». Les pièces du dossier, elles, passent par le dépôt commun. |
| H4 | « Demander un appel vidéo » depuis un jalon, en choisissant les participants parmi les membres du projet. | Il reçoit les demandes dans [/cc/appels](https://admin.citurbarea.com/cc/appels). | — | — | ✅ |
| H5 | La frise affiche les paiements des phases de chantier (honoraires). | L'admin facture et encaisse dans l'onglet Factures, comme à l'étape D. | — | Phase payée ou débloquée | ✅ |
| H6 | — | Suivi de l'argent des travaux (budget prévu, engagé et payé, situations des entreprises, retenue de garantie), planning Gantt, réserves structurées. | Situations, attachements | — | ❌ Ce sont les lots GP6 à GP8, pas encore faits. |
| H7 | Anciens écrans : `/chantier/:id/pv`, `/pv-chantier/*`, livraisons, incidents, calendrier (200, « bientôt disponible »). | — | — | — | 💤 Remplacés par l'espace projet. |
| H8 | [/materiaux/planning](https://citurbarea.com/materiaux/planning) : planning d'achat des matériaux par phase. | — | — | — | 🟡 Outil public, non relié au projet du client. |

### I. Phases P11 et P12 — réception, conformité et permis d'habiter

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| I1 | Dans l'espace projet : opérations préalables à la réception, réception provisoire, levée des réserves (PV à signer en ligne). | Il valide les PV ; il saisit la date de réception provisoire, qui fait partir les garanties. | PV des opérations préalables, PV de réception provisoire, PV de levée des réserves | Réception provisoire prononcée (point d'arrêt) | ✅ (vérifié dans le code) — les réserves restent un tableau dans le PV (lot GP7 à faire) |
| I2 | La frise affiche « Conformité, permis d'habiter ». Le guide [permis d'habiter](https://citurbarea.com/guide/permis-habiter-certificat-conformite-maroc) est disponible. | Il suit l'achèvement, la conformité et le permis d'habiter sous forme de pièces et de jalons. | Déclaration d'achèvement, attestation de conformité, permis d'habiter ou certificat de conformité | Permis d'habiter délivré (point d'arrêt) | ✅ |
| I3 | — | Raccordements définitifs (eau, électricité). L'ordre par rapport au permis d'habiter est un réglage ouvert dans [/cc/dashboard](https://admin.citurbarea.com/cc/dashboard). | Abonnements définitifs | — | 🟡 Question encore ouverte : chez Redal et chez la société régionale, les raccordements viennent-ils avant ou après le permis d'habiter ? |
| I4 | L'ancien écran `/dossier/:id/reception` | — | — | — | 💤 |

### J. Phases P13 et P14 — année de garantie, réception définitive et décennale

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur pour passer à l'étape suivante | Statut |
|---|---|---|---|---|---|
| J1 | La frise affiche « Année de garantie ». | Menu **Échéances**, [/cc/dashboard](https://admin.citurbarea.com/cc/dashboard) : permis à démarrer, autorisations, assurances, cautions et garanties. Des rappels partent par e-mail à l'admin à **J−90, J−30 et J−7**. | Suivi des désordres de l'année de garantie | Réception définitive à la date prévue | 🟡 Les rappels ne partent que lorsqu'on ouvre le tableau de bord (une fois par jour) : la tâche du matin (`TACHES_SECRET`) n'est pas configurée, et les e-mails n'arrivent pas (voir section 3). |
| J2 | Dans l'espace projet : la réception définitive, la restitution de la retenue et la libération des cautions. | Il valide les PV. | PV de réception définitive, décompte définitif, mainlevée des cautions | Garanties libérées (point d'arrêt) | ✅ (vérifié dans le code) |
| J3 | P14, vie de l'ouvrage : le dossier d'entretien et l'archive. | Il archive le dossier et envoie les rappels d'entretien. | Dossier des ouvrages exécutés, dossier d'entretien | Fin des dix ans | 🟡 Le délai de déclaration d'un désordre grave (art. 770 du DOC : 30 jours ou non) est à trancher par un juriste. Les rappels d'entretien ne sont pas automatisés. |
| J4 | Archive des documents dans Google Drive | — | — | — | 🟡 Le code est prêt, mais les variables Google ne sont pas créées : il n'y a donc pas d'archive. |
| J5 | Avis du client | — | — | — | ❌ Le bouton « Laisser un avis Google » est masqué (`AVIS_GOOGLE_URL` est vide). |

### Services communs à toutes les étapes

| n° | Ce que voit le client | Ce que fait l'admin | Documents attendus | Déclencheur | Statut |
|---|---|---|---|---|---|
| K1 | **Messagerie** : fils de discussion `/messages/<jeton>` et boîte `/messages/boite/<jeton>` (aussi en arabe), et depuis `/mon-espace`. Un avertissement s'affiche avant l'envoi si le texte contient une coordonnée. | Menu **Messages**, [/cc/messages](https://admin.citurbarea.com/cc/messages) : filtre « Tentatives de contact direct », compteur rouge dans le menu, bouton « Lever la suspension », retrait d'un message, fermeture d'un fil. | — | — | ✅ (tables en place) |
| K2 | **Appels vidéo JaaS** : `/appel/<jeton>`. L'appel n'existe que si **toutes** les parties ont accepté le même créneau. La salle est ouverte de 10 minutes avant jusqu'à 2 heures après le début. | [/cc/appels](https://admin.citurbarea.com/cc/appels) : il répond au nom du cabinet et rejoint l'appel s'il est invité. | — | Accord de tous | ✅ (JaaS configuré) |
| K3 | **Trace de l'appel** : chacun donne ou retire son consentement à l'enregistrement (loi 09-08). Le bandeau et le bouton d'enregistrement n'apparaissent que si tout le monde a accepté. Un compte rendu est proposé, puis validé ou contesté par l'autre partie. | Il consulte le journal et la durée de l'appel. | Compte rendu | — | 🟡 Sans `JAAS_WEBHOOK_SECRET`, on n'a ni la durée réelle ni les arrivées et départs (seule l'entrée en salle est notée). L'enregistrement vidéo demande une option JaaS payante et R2 pour être conservé. |
| K4 | **Dépôt de documents commun** : le client voit les documents de son contexte (dossier, rendez-vous, projet, fil de discussion, appel). Les fichiers sont servis par des liens signés valables 15 minutes. | Un document du cabinet peut être déposé en **brouillon**, puis publié. Un document déposé par un client ou un professionnel est « à modérer » et attend dans [/cc/documents](https://admin.citurbarea.com/cc/documents). La suppression est seulement logique, et chaque nouvel envoi crée une version. | — | Décision de l'admin (visible ou refusé) | 🟡 Sans R2 : images 1,5 Mo, PDF 2 Mo, 400 Mo au total, vidéos uniquement par lien YouTube ou Vimeo. |
| K5 | **Outils pro des Cercles** ([/cercles/espace](https://citurbarea.com/cercles/espace)) : matériauthèque pro, et plus tard chiffrage, CPS, budgétisation, facturation. Ils sont réservés aux membres Premium ou à ceux qui ont l'accord de l'admin. Les autres voient « Réservé… — demander l'accès ». | Dans [/cc/fournisseurs](https://admin.citurbarea.com/cc/fournisseurs), il active une bascule par outil (avec une date d'expiration possible) et choisit la formule GRATUIT, PRO ou PREMIUM. | — | Accord de l'admin | 🟡 Un seul outil est en service (la matériauthèque pro). L'offre Premium est un brouillon non publié. |

---

## 3. Notifications et suivi de la demande — état réel

> Ces points sont **en cours de traitement par une session dédiée** : « Notifications e-mail + WhatsApp et lien de suivi client ».

| Sujet | Ce qui existe | Ce qui se passe vraiment | Statut |
|---|---|---|---|
| Alertes e-mail au cabinet | Le code les prévoit pour le formulaire court (capture), les portes (intake), les rendez-vous, les messages, les appels et les rappels d'échéances. L'envoi passe par Resend (`RESEND_API_KEY`, `LEAD_NOTIFY_FROM`, `LEAD_NOTIFY_TO`). | **Le fondateur n'en reçoit aucune.** La configuration est probablement absente, ou le domaine d'envoi n'est pas vérifié chez Resend. Aujourd'hui, il faut donc ouvrir [/cc/leads](https://admin.citurbarea.com/cc/leads), [/cc/rendez-vous](https://admin.citurbarea.com/cc/rendez-vous) et [/cc/messages](https://admin.citurbarea.com/cc/messages) pour voir les nouveautés. | ❌ |
| Accusé de réception au client après un formulaire | Rien. | Après une porte ou `/creer-compte`, **le client ne reçoit rien** : il voit seulement l'écran de confirmation, qui lui propose le rendez-vous et WhatsApp. | ❌ |
| Confirmation du rendez-vous | Le rendez-vous est **confirmé automatiquement**, sans validation par l'équipe. Un e-mail de confirmation est prévu, avec le fichier agenda (.ics) et le lien `/rdv/<jeton>`. | C'est le seul envoi prévu vers le client. Il dépend de la même configuration Resend. L'écran de confirmation affiche aussi le lien de l'espace rendez-vous. | 🟡 |
| WhatsApp | Les boutons ouvrent WhatsApp vers le numéro de CITURBAREA. Depuis la fiche, l'admin peut envoyer le lien d'accès avec un message prérempli, mais c'est lui qui clique sur « envoyer ». | **Aucun envoi WhatsApp automatique n'existe.** | ❌ |
| Lien de suivi pour le client | `/rdv/<jeton>` après un rendez-vous ; `/mon-dossier/<jeton>` quand l'admin l'envoie ; « Recevoir mon lien » sur [/mon-espace](https://citurbarea.com/mon-espace). | Après un simple formulaire, le client n'a aucun lien de suivi tant que l'équipe ne lui a rien envoyé. | 🟡 |

---

## 4. Visite guidée de test (environ 30 clics)

À faire sur https://admin.citurbarea.com (l'équipe) et dans une **fenêtre privée** sur https://citurbarea.com (le client). Toutes les saisies sont fictives : client « TEST client exemple », projet « TEST villa R+1 », sans aucune coordonnée réelle.

> **Attention avant de commencer : les numéros de devis et de factures sont réels.** Ils se suivent sans trou et une facture ne se supprime pas. Une facture TEST consomme donc un vrai numéro `FAC-2026-…` et devra être annulée par un avoir. Le mieux est de faire cette visite avant la première vraie facture, ou de s'arrêter au devis (clic 9).

**Création du dossier**

1. Ouvrir [/cc/login](https://admin.citurbarea.com/cc/login) et se connecter. On arrive sur les Leads.
2. Menu **Dossiers** ([/cc/dossiers](https://admin.citurbarea.com/cc/dossiers)), puis « + Nouveau dossier ». On arrive sur [/cc/dossiers/nouveau](https://admin.citurbarea.com/cc/dossiers/nouveau).
3. Remplir : cabinet ARC-BATI, client « TEST client exemple », projet « TEST villa R+1 », commune Kénitra, phase actuelle « Idée, programme ». Enregistrer. On doit voir l'avertissement de doublons (s'il y en a), puis la fiche du dossier s'ouvre.
4. Dans la fiche, onglet **Parcours A → Z**, vérifier les 6 étapes commerciales, puis les blocs de P00 à P14 avec leurs titres en arabe.

**Profil du projet**

5. Dans le panneau **Profil du projet**, saisir : villa, budget 2,5 MDH, R+1, 1 sous-sol. Enregistrer. Le bureau de contrôle doit apparaître comme « recommandé ».
6. Passer le budget à 6 MDH. Le bureau de contrôle doit devenir « obligatoire », et ses pièces apparaître dans l'onglet Documents par phase. Remettre 2,5 MDH.
7. Vérifier le visa : l'ordre régional affiché doit être celui de Kénitra.

**Devis et acceptation**

8. Onglet **Devis** : « Nouveau devis », choisir un pack. L'aperçu se met à jour en direct.
9. Cliquer sur « Émettre ». On doit voir le numéro `DEV-2026-NNNN`. Télécharger le PDF et vérifier l'en-tête : CITURBAREA / HSE DECO, et « Architecte du projet », sans aucune coordonnée du cabinet.
10. En haut de la fiche, cliquer sur « Lien d'accès du client », puis « Copier ».
11. Dans la fenêtre privée, coller le lien `/mon-dossier/<jeton>`. Le dossier s'ouvre, en français, avec la frise des phases et « Ce que nous attendons de vous ».
12. Aller sur [/mon-espace](https://citurbarea.com/mon-espace), rubrique « Devis et factures ». Ouvrir le devis et cliquer sur « Accepter ». On doit voir la date et l'heure de l'acceptation.

**Facture, encaissement et démarrage de phase**

13. Côté admin, onglet **Factures** : l'échéancier par phase est proposé. Le valider.
14. Émettre la facture de la première échéance. On doit voir le numéro `FAC-2026-NNNN` et la mention « à compléter » pour les identifiants de HSE DECO.
15. Côté client, la facture apparaît avec le statut « émise ».
16. Côté admin, cliquer sur « Encaisser » : virement, référence « TEST », justificatif PDF de moins de 2 Mo. La facture passe à « réglée » et la phase à « payée ».
17. Dans l'onglet Parcours, la phase suivante, si elle n'est pas payée, affiche « En attente de paiement ». Essayer « En faire la phase actuelle » : c'est refusé. Cliquer sur « Débloquer » et écrire le motif « TEST déblocage » : c'est accepté, et le motif apparaît au Journal.

**Plans et documents**

18. Onglet **Plans & vues**, phase Esquisse, catégorie « plan d'étage », niveau RDC : déposer un PNG de moins de 1,5 Mo. Le fichier porte le badge « Non publié ».
19. Cliquer sur **Vue client** : le plan n'y est pas encore.
20. Cliquer sur « Publier », puis rouvrir la vue client (ou [/cc/dossiers/:id/shadow](https://admin.citurbarea.com/cc/dossiers)). Le plan apparaît.
21. Ajouter un lien de vidéo YouTube et le publier. Côté client, rubrique « Plans et vues de mon projet », le plan et la vidéo sont visibles.
22. Côté client, rubrique Documents : déposer un petit PDF. Il porte le statut « à modérer ».
23. Côté admin, menu **Documents à vérifier** ([/cc/documents](https://admin.citurbarea.com/cc/documents)) : rendre le PDF visible. Dans l'onglet Documents par phase, la pièce n'est plus « Document manquant ».

**Échanges**

24. Côté client, écrire un message qui contient « 06 00 00 00 00 ». Un avertissement s'affiche, puis le numéro est masqué dans le message envoyé.
25. Côté admin, menu **Messages** ([/cc/messages](https://admin.citurbarea.com/cc/messages)) : le fil porte le badge « Tentatives de contact direct », et le compteur du menu est rouge.
26. Côté client, cliquer sur « Demander un appel vidéo » et proposer un créneau. Côté admin, dans [/cc/appels](https://admin.citurbarea.com/cc/appels), accepter ce créneau. La demande devient « confirmée ». Dix minutes avant, « Rejoindre » ouvre la salle JaaS. Dans la salle, chacun peut accepter l'enregistrement ; puis proposer un compte rendu, et l'autre partie le valide.

**Chantier et échéances**

27. Dans [/cc/projets](https://admin.citurbarea.com/cc/projets), créer un projet relié au dossier TEST, puis inviter « TEST client exemple » comme maître d'ouvrage. Ouvrir le lien `/projet/<jeton>` dans la fenêtre privée.
28. Ouvrir un jalon avec point d'arrêt (exemple : le ferraillage des fondations). On doit voir le badge rouge et « PV de contrôle exigés ». Remplir le PV sans le signer, puis essayer de valider le jalon : c'est refusé.
29. Côté admin, débloquer ce point d'arrêt avec un motif. Le motif apparaît au journal du projet et au Journal du dossier.
30. Dans la fiche, panneau des dates : mettre la date limite de démarrage du permis à aujourd'hui + 25 jours. Menu **Échéances** ([/cc/dashboard](https://admin.citurbarea.com/cc/dashboard)) : l'échéance apparaît avec le rappel J−30. L'e-mail ne partira pas tant que Resend n'est pas configuré (section 3).
31. Ménage : émettre un avoir sur la facture TEST, supprimer les documents TEST (la suppression est logique), puis noter « TEST » dans la note OPS du dossier.

---

## 5. Ce qui reste à faire ou à configurer

**Réglages Cloudflare et comptes, à faire par le fondateur.**

| Réglage | Effet tant qu'il manque |
|---|---|
| **Notifications e-mail** : clé Resend, domaine vérifié, `LEAD_NOTIFY_FROM` et `LEAD_NOTIFY_TO` | Aucune alerte n'arrive au cabinet, aucune confirmation n'arrive au client, aucun rappel d'échéance ne part. Une session dédiée s'en occupe. |
| **R2** (liaison `FICHIERS`, demande un moyen de paiement chez Cloudflare) | Images limitées à 1,5 Mo, PDF à 2 Mo, 400 Mo au total. Pas de fichier vidéo, pas de photos de jalon, pas d'enregistrement d'appel conservé. |
| **Identifiants légaux de HSE DECO** : ICE, IF, RC, patente, siège (dans `apps/web/src/domain/honoraires/emetteur.ts`) | Les factures affichent « à compléter ». Elles ne sont pas conformes tant que ce n'est pas rempli. |
| **`JAAS_WEBHOOK_SECRET`** (et le webhook déclaré dans la console JaaS) | Ni durée réelle, ni arrivées et départs, ni fin de salle dans la trace des appels. |
| **Enregistrement vidéo** : option payante chez JaaS, et R2 | Le consentement fonctionne, mais rien n'est conservé (lien 8x8 valable 24 h envoyé au cabinet). |
| **Google Drive** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_DOSSIER_ID` (guide : `docs/guides/configurer-google-drive.md`) | Pas d'archive de référence des documents. |
| **`TACHES_SECRET`** et une tâche planifiée chaque matin | Les rappels J−90 / J−30 / J−7 ne partent qu'à l'ouverture de [/cc/dashboard](https://admin.citurbarea.com/cc/dashboard). |
| **`AVIS_GOOGLE_URL`** | Aucun avis client collecté. |

**Questions ouvertes, à trancher par le fondateur.**

1. **Raccordements définitifs** : chez Redal et chez la société régionale de Rabat-Salé-Kénitra, viennent-ils avant ou après le permis d'habiter ? (réglage dans [/cc/dashboard](https://admin.citurbarea.com/cc/dashboard))
2. **Article 770 du DOC** : le délai de 30 jours pour déclarer un désordre grave s'applique-t-il ? Avis d'un juriste à demander.
3. **Visibilité du budget** : le client voit-il le budget et les situations dès le premier jour, ou seulement après la signature du marché ?
4. **Ordres régionaux** : il reste à compléter la liste commune → conseil régional, en dehors de Kénitra, Rabat et Agadir.
5. **Conditions d'utilisation** : valider puis publier la mention « messagerie et appels vidéo », proposée dans `contrat-messagerie.md` (durée de conservation, déclaration CNDP).
6. **Prestations hors honoraires** (BET, laboratoire, géomètre) : aujourd'hui, elles sont exclues par défaut de l'acceptation du devis.

**À construire, dans l'ordre de la feuille de route.**

- GP6, planning Gantt et chemin critique ; GP7, réserves structurées ; GP8, suivi financier du chantier (budget prévu, engagé et payé, situations, retenue de garantie).
- GP9 à GP13 : journal de chantier, tableau de bord multi-projets, historique des estimations, parcours rénovation et lotissement.
- **GP14, maquette numérique IFC (BIM) en phase d'exécution**, prévue quand les lots GP2 à GP8 seront en place.
- Proposition de matériaux par le client à partir de l'APD, l'architecte gardant la validation.
- Un seul accès client : relier `/mon-espace` à l'espace projet, pour éviter deux liens différents.
- Validation de l'APS et de l'APD en un clic dans `/mon-espace`.
- Générateur de contrat d'architecte, et générateur de CPS (actuellement en sommeil).
- Publication des premiers fournisseurs, professionnels et terrains (validation dans [/cc/fournisseurs](https://admin.citurbarea.com/cc/fournisseurs) et [/cc/terrains](https://admin.citurbarea.com/cc/terrains)).
- Page [/realisations](https://citurbarea.com/realisations), aujourd'hui en 404.
- Paiement en ligne : volontairement en sommeil, le paiement reste manuel.
