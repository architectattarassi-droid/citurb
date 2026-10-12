# QA du 12/10/2026 : parcours usager /chiffrage et audit du moteur

Deux agents ont été lancés en parallèle :
- un parcours navigateur, avec 10 profils : villa jumelée, isolée et en bande, maison, immeuble, immeuble mixte, terrain difficile, saisie libre, arabe, mobile ;
- un audit du moteur, sur une matrice de 9 240 cas, environ 2 500 cas parcelle, 60 CPS et 77 entrées corrompues.

Note du parcours avant corrections : 6/10.

## Corrigé le jour même

| Constat | Correction |
|:--|:--|
| Plantage : sol argileux + semelles forcées | Ratio du sol moyen et purge-substitution sous l'emprise ; le gadget ne plante plus sur un projet invalide |
| Faux « bloquants » du contrôle CPS : montant « 9 770,20 » pris pour l'art. 770, WC invités en collectif, annexe 3 | Expression limitée aux références du DOC, contrôle « sans objet » en collectif, annexe reconnue par son titre |
| TVA du CPS à 20 % sur tout en régime tâcheron | Même assiette que le chiffrage (fournitures seules), mention explicite |
| Tâcheron par défaut pour un immeuble | Tâcheron par défaut réservé à la villa et à la maison très économiques |
| Prix en clair dans le simulateur, floutés sur la page devis | Prix unitaires et montants des lignes floutés aussi dans le simulateur public (quantités visibles) |
| Contrôles « hors grille » montrés au client | Section des contrôles réservée au back-office |
| Vocabulaire des standings différent selon le type de projet | Libellés uniques : Très économique, Moyen standing, Standing, Haut standing, Luxe |
| Paramètres d'URL qui écrasent le projet au rechargement | URL nettoyée après lecture ; le brouillon fait foi |
| /calculateur : clés de traduction brutes, prix contradictoire avec /chiffrage | Redirection vers /chiffrage (un seul moteur) |
| Bouton « Connexion » qui recouvre les titres sur mobile | En-tête à hauteur minimale au lieu d'une hauteur fixe |
| « Étape suivante » qui laisse en bas de page | Défilement vers l'en-tête des étapes |
| Libellés : « ht » en minuscules, « semelles isolees », chemin interne et « K 1.38 » sur le devis, surface sans sous-sol dans le formulaire | Corrigés |
| Division par zéro (parcelle non résolue) | Garde sur le coût au m² hors sol |

## Restent ouverts

1. **Traductions EN/AR incomplètes** : standings, résultats, quantitatif, DQE et page devis sont restés en français.
2. **Immeubles et mixtes sous la grille** : −10 à −25 % en standing et luxe. En immeuble, le lot « menuiseries intérieures et cuisine » dépasse la structure, et aucun lot n'est propre au commerce du RDC. Ratios collectifs à recaler avec l'architecte.
3. **Parcelle** : la galerie du mixte (CES 0,7) s'applique à tous les étages. Un terrain très petit (30 m²) ou très grand (20 000 m²) passe sans alerte. En RDC seul, le forfait d'édicule de 24 m² est ajouté sans escalier. L'affichage « CES × terrain » est faux quand l'emprise est plafonnée. Ce sont les règles du moteur parcelleSP : à arbitrer par le maître d'ouvrage.
4. **Validation des entrées** : brouillon et fragment d'URL ne sont pas validés champ par champ (bornes de surface, sous-sol, chambres, pente) ; une validation complète reste à faire.
5. **Prix à vérifier par un métreur** : piscine (bassin 1 129 DH/m²), coefficient de Kénitra (0,93 alors que la ville est dans la base RSK), Laâyoune absente des coefficients régionaux.
6. **Précision** : en tâcheron, la fourchette utilise encore le facteur K de l'ancien modèle ; trois présentations différentes de la précision.
7. **Accessibilité** : boutons de l'en-tête sous 44 px, contraste du sur-titre, texte du DQE à 10,5 px, champs de quantité sans nom distinct.
8. Rapports bruts des agents : scratchpad de la session (audit-moteur/out2.md).
