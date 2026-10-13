# Matériaux par phase — choisir en étude, acheter en réalisation

Code : `apps/web/src/domain/materiaux/phases.ts` (rattachements, délais, stockage), `planning.ts` (planning d'achat), `etude.ts` (poids dans les ouvrages, exigences) ; tests `phases.test.ts`.

## Identifiants réutilisés

- Phases : codes de `packages/contracts/src/phases.catalog.ts` (`10_ESQUISSE`, `12_APS`, `14_APD`, `40_DOSSIER_EXECUTION`, `48_METRE_QUANTITATIF`, `50_DCE`, `54_ATTRIBUTION_MARCHE` ; `82_INSTALLATION_CHANTIER` … `86_PLANCHER` ; lots `LOT_*` de second œuvre). Un test vérifie que chaque code existe.
- Chiffrage : lots (`lots.ts`), ouvrages (`ouvrages.ts`), lignes du DQE (`chiffrer()`, étiquettes `sous_sol` / `soutenement`), correspondance composant → code CIT (`correspondanceCIT.ts`).
- Référentiel des jalons (`domain/referentiel/data`) : un test recoupe chaque lot du chiffrage avec les phases de ses jalons ; les exigences (conception, exécution, réception) et normes citées s'affichent sur la fiche.

## Règles

- **Phase de réalisation** = phase de l'ouvrage du chiffrage qui consomme le matériau (`phaseOuvrage`), avec des exceptions par matériau quand un même ouvrage s'achète en deux temps : gaines, fils, boîtes et coffret aux **réseaux encastrés** ; prises, interrupteurs, luminaires et protections aux **équipements**.
- Matériau qu'aucun ouvrage du chiffrage n'utilise : phase déduite du lot CPS du catalogue, sinon de la catégorie → affiché « **à valider par l'architecte** ».
- **Phases d'étude** par catégorie : gros œuvre (APS → exécution → métré → DCE → consultation), étanchéité / isolation / VRD (APD → exécution → …), second œuvre et équipements (APS → APD → …), avec ce qu'il faut décider à chaque étape.
- **Délais d'approvisionnement** : hypothèses CITURBAREA par famille du catalogue (béton prêt à l'emploi 2 j, aciers 7 j, menuiseries alu 35 j, ascenseur 120 j…), toujours affichés comme hypothèses. À remplacer par les délais déclarés des fournisseurs Cercles quand ils existeront (fiche produit : délai).
- **Calendrier indicatif** : villa R+1 de référence (début et durée de chaque phase en semaines), gros œuvre allongé de 3 semaines par niveau au-delà de R+1, décalage de 4 semaines avec sous-sol. Hypothèse, à remplacer par le planning de l'entreprise.

## Planning d'achat (`/materiaux/planning#p=…`)

Depuis le devis estimatif (`/chiffrage/devis`, lien « Planning d'achat des matériaux de mon projet »), même fragment d'URL, jamais transmis au serveur. Pour chaque phase :
- les matériaux, leurs quantités avec pertes (les mêmes que le quantitatif du moteur, vérifié par test), converties en unités de vente (sacs, tonnes, barres…) ;
- la date limite de commande (début de phase − délai, si une date de démarrage est saisie) ;
- le budget fournitures HT au prix de référence de la ville ;
- le bouton « Demander les prix pour cette phase », qui remplit le panier de demande de prix existant.

Le planning affiche le budget des **fournitures** au prix public des matériaux. Le devis, lui, masque ses montants (main-d'œuvre, frais, marge) jusqu'à l'inscription. **Point à arbitrer** : faut-il masquer aussi les budgets du planning avant l'inscription ?
