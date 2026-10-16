# SQL à coller dans Neon — une seule fois, tout ensemble

Le fondateur colle **un seul fichier** : `docs/sql/TOUT-NEON.sql`, dans
console.neon.tech → projet citurbarea → branche production → SQL Editor → Run.

Tous les fichiers sont rejouables (`IF NOT EXISTS`, contraintes dans un bloc
`DO … EXCEPTION`) : coller `TOUT-NEON.sql` plusieurs fois n'efface ni ne
modifie aucune donnée. On peut donc le recoller à chaque fois que la liste
s'allonge.

Régénérer le fichier après avoir ajouté une ligne :

```bash
node scripts/sql-neon.mjs
```

## Ordre d'exécution (une ligne par fichier, dépendances d'abord)

Chaque session ajoute **sa ligne** ici (chemin entre accents graves), à la
bonne place si son SQL dépend d'une table d'un autre fichier, puis relance
le script. Aucune table de production n'est créée par un agent.

1. `docs/sql/dossiers-neon.sql` — User, Dossier
2. `docs/sql/rendezvous-neon.sql` — RendezVous, Parametre
3. `docs/sql/terrains-neon.sql` — TerrainAnnonce
4. `docs/sql/espace-projet-neon.sql` — Projet et tables Projet*
5. `docs/prix/sql/cercles-fournisseurs.sql` — Fournisseur, DemandePrix…
6. `docs/prix/sql/cercles-fiches-catalogue.sql` — fiches société, produit, service
7. `docs/prix/sql/cercles-images.sql` — images des fiches (après 5 et 6)
8. `docs/prix/sql/cercles-acces-pro.sql` — outils pro accordés par l'admin (après 5)
9. `docs/prix/sql/prix-reference-manuel.sql` — prix de référence saisis à la main
10. `docs/prix/sql/achat-en-ligne.sql` — Commande (après 5)
11. `docs/sql/appels-video-neon.sql` — DemandeAppel, BlocageAppel
12. `docs/sql/messagerie-neon.sql` — Conversation, MessageConversation (après 11)
13. `docs/sql/devis-facturation-neon.sql` — Cabinet, colonnes projet du Dossier, DossierEtape, DossierEvenement, SequenceDocument, Devis, EcheancePaiement, Facture, Encaissement, DeblocagePaiement (après 1)
14. `docs/sql/gestion-projet-neon.sql` — DocumentDepose (dépôt commun), DossierPiece (documents par phase), puis colonnes GP3/GP4 (après 1, 4 et 13)
15. `docs/sql/documents-neon.sql` — dépôt de documents commun : colonnes ajoutées à DocumentDepose (support Neon/R2, versions, métadonnées, modération, envoi en morceaux, archive Drive) (après 14)
16. `docs/sql/materiaux-referentiel-amorcage.sql` — les 280 codes du catalogue recopiés dans MateriauReferentiel (généré par scripts/sql-referentiel-materiaux.mjs ; après 6)
17. `docs/sql/carnet-materiaux-neon.sql` — DossierMateriau : carnet des matériaux du projet, propositions client et décisions de l'architecte (après 13)
