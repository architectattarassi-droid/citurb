# Formulaire complet ou en paliers ? (12/10/2026)

Agent « marketer services et e-commerce, 20 ans d'expérience ». Analyse faite en lisant le code, sans rien modifier.

**Réponse : découper.** Le formulaire détaillé n'est pas trop lourd en soi, il est mal placé. Il demande le CIN, le numéro de titre foncier, la région, la province et la commune avant toute valeur rendue, et il redemande ce que le simulateur connaît déjà.

## Inventaire [FAIT]

| Parcours | Champs | Réellement exigés | Capture du lead |
|:--|:--|:--|:--|
| Simulateur /chiffrage | ~40 réglages, tous préremplis | 0 | aucune |
| CTA du simulateur | nom, téléphone, e-mail, projet (prérempli) | nom + téléphone | à l'envoi, avec le résumé du chiffrage |
| /creer-compte | 6 | nom + téléphone | à l'envoi |
| P1 landing | 25 à 30, dont ~20 marqués `*` (CIN/passeport, n° de titre foncier, lot…) | **nom + téléphone seulement** | au clic « Analyser » |
| P1 packs | formulaire de capture + 3e estimateur (ClientCostBuilder) | nom + téléphone | dédoublonné sur 24 h |
| P2 promoteur | identité complète en étape 1 (8 à 12 champs exigés : RC, ICE, région…) | 8 à 12 | **seulement à la fin**, abandon en cours de route = lead perdu |
| P3 / P4 | projet → devis → identité en dernier | surface, nom, téléphone, commune | à la fin (bonne séquence) |

**Autres constats :**
- **Doublons entre simulateur et formulaires :** type, type de villa, R+, sous-sol, terrain, façades, ville, budget. Le budget est même calculé par le simulateur mais redemandé en tranches dans P1.
- **Trois moteurs de coût coexistent :** /chiffrage, ClientCostBuilder (P1 packs) et l'ancien calculateur, ce dernier désormais redirigé.
- **CIN, numéro de titre foncier, ICE et RC n'arrivent même pas dans la table des leads :** ils sont filtrés par `sanitizeWizard`.
- **Score des leads**, en production (`functions/api/lead-funnel/capture.ts`) comme dans l'API :
  - les 15 points « contact » exigent un numéro marocain et un e-mail : un MRE n'y a jamais droit ;
  - un lead venu du simulateur ne transmet ni délai ni statut du terrain ;
  - Kénitra n'est pas dans les villes prioritaires.
- **Événements déjà émis :** `wizard_start`, `wizard_step {champ}`, `intake_submit`.

## Entonnoir en paliers [RECO]

| Palier | Champs | Moment | Canal | Ce que reçoit le client |
|:--|:--|:--|:--|:--|
| 0. Simulateur | aucun champ personnel | arrivée | web | total, lots, standings, verdict de l'aide à la décision |
| 1. Recevoir le devis | prénom, téléphone avec liste d'indicatifs (+212, FR/ES/BE/IT/NL), case WhatsApp cochée ; e-mail facultatif replié | clic « Recevoir mon devis détaillé sur WhatsApp » | web puis WhatsApp | PDF débloqué et message de l'architecte |
| 2. Qualification express (facultative) | terrain (titre / en cours / je cherche) ; démarrage (< 6 mois / 6-12 / > 12 / je me renseigne) ; au Maroc ou à l'étranger (pays déduit de l'indicatif) | page de remerciement, ou 1re question WhatsApp | web ou WhatsApp | rappel au bon créneau et 3 leviers budget |
| 3. Fiche projet complète | commune (liste HCP), statut du titre, maître d'ouvrage, situation juridique, contraintes du lot, programme | pendant l'appel (rempli par l'architecte) ou avant le RDV | appel / WhatsApp, puis back-office | note de faisabilité, RDV ou visite |
| 4. Pièces | CIN/passeport, n° et certificat de propriété, note de renseignements, plans de situation et de lotissement, ICE/RC | acceptation de l'offre, contrat | espace dossier / WhatsApp | contrat, échéancier, démarrage |

Règle : chaque palier demande moins que ce qu'il vient de donner, et rien n'est demandé deux fois.

## Champ par champ [RECO]

- **Retirer des formulaires publics (P1, P2 étape 1), pour le palier 4 :** CIN ou passeport, n° de titre foncier, ICE, RC, forme juridique, raison sociale, représentant, nom et n° du lot.
- **Fusionner :**
  - nom et prénom en un seul champ ;
  - région, province et commune en une liste de communes avec recherche (`AdminLocationSelect` existe dans P2).
- **Déduire :**
  - type, R+, sous-sol, terrain et ville, à partir du simulateur ;
  - budget = budgetTTC, à confirmer par le client ;
  - façades selon le type de villa ;
  - pays selon l'indicatif téléphonique.
- **Rendre facultatifs** (retirer les `*`) : e-mail, situation juridique, statut du titre, lotissement, galerie, recul, usage du RDC.
- **Garder** : téléphone, statut du terrain, délai, commune, ordre de grandeur du budget.
- **Unifier les estimateurs** : un seul moteur de coût, ClientCostBuilder remplacé par /chiffrage.
- **P2 :** capturer le lead dès l'identité (nom, téléphone, nature) et déplacer le reste après le devis.
- **Score :**
  - accepter les téléphones internationaux et donner les 15 points à « téléphone + WhatsApp » ;
  - ajouter des points pour « terrain détenu » ;
  - ajouter Kénitra aux villes prioritaires.

## MRE et WhatsApp [RECO]

- Liste d'indicatifs avec drapeaux.
- « Meilleur moment pour vous appeler (votre heure) ».
- Textes AR et darija prêts avant toute campagne.
- Palier 2 par messages WhatsApp à réponse rapide plutôt que par un formulaire.

## Mesure et tests

- **Événements à ajouter :** palier_1_vu, palier_1_envoye, palier_2_repondu, rdv_pris, offre_envoyee, signe.
- **Vue dans le back-office :** abandon par champ.
- **Seuils :**
  - déplacer un champ qui concentre plus de 10 % des abandons de son écran ;
  - si moins de 40 % des leads répondent au palier 2, basculer ce palier sur WhatsApp.
- **Juger sur le taux de RDV qualifié par visiteur**, pas sur le seul taux de lead.
- **Tests A/B, un à la fois :**
  1. CTA WhatsApp avec prénom et téléphone seulement ;
  2. palier 2 en 3 clics ;
  3. P1 réduite aux paliers 1-2 et préremplie ;
  4. P2 avec capture immédiate ;
  5. palier 2 sur le web ou par WhatsApp.

## Sources

- **HubSpot :** types de champs et conversion ; profilage progressif.
- **Abandons de formulaire :** Zuko, via Reform.
- **Formulaires en plusieurs étapes :** Venture Harbour, cas de conversion (déclarés par l'entreprise) ; Formstack 2021, cité de seconde main.
- **Nombre de champs :** Baymard, champs moyens d'un tunnel de paiement.
- **« Pied dans la porte » :** Freedman et Fraser, 1966.
