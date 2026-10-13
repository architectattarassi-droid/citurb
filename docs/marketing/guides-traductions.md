# Guides : table des versions par langue

Chaque guide a un `groupe` (le slug de sa version française). Toutes les versions d'un même groupe sont reliées entre elles : liens hreflang pour Google et sélecteur de langue sur la page. Les adresses en anglais et en arabe ci-dessous sont **fixées d'avance**, pour que les liens internes puissent être écrits avant même que les pages existent.

Source du français :
- les 6 premiers guides sont dans `apps/web/scripts/build-seo.mjs` (tableau `GUIDES`) ;
- les autres sont dans `apps/web/seo/guides/<slug>.json`.

| groupe (slug FR) | EN | AR |
|---|---|---|
| prix-construction-villa-maroc | villa-construction-cost-morocco | thaman-bina-villa-maghrib |
| permis-de-construire-maroc | building-permit-morocco | rukhsat-al-bina-maghrib *(existe)* |
| honoraires-architecte-maroc | architect-fees-morocco | ajr-al-muhandis-al-miamari-maghrib |
| etapes-construction-maison-maroc | steps-to-build-a-house-in-morocco | marahil-bina-manzil-maghrib |
| bureau-etudes-techniques-bet-maroc | engineering-consultancy-bet-morocco | maktab-addirasat-attaqniya-maghrib |
| choisir-entreprise-construction-maroc | choosing-a-construction-company-morocco | ikhtiyar-muqawalat-al-bina-maghrib |
| autorisation-travaux-reparation-maroc | renovation-repair-permit-morocco | rukhsat-al-islah-maghrib |
| exemple-devis-construction-maison-maroc | house-construction-quote-example-morocco | namudhaj-taqdir-bina-manzil-maghrib |
| infractions-urbanisme-sanctions-maroc | planning-violations-penalties-morocco | mukhalafat-at-taamir-maghrib |
| lotissement-morcellement-maroc | land-subdivision-morocco | tajzia-wa-taqsim-al-aradi-maghrib |
| note-renseignements-urbanistiques-maroc | zoning-information-certificate-morocco | mudhakkirat-al-maalumat-at-taamiriya |
| permis-construire-zone-rurale-maroc | building-permit-rural-morocco | rukhsat-bina-alam-qarawi *(existe)* |
| permis-habiter-certificat-conformite-maroc | occupancy-permit-morocco | rukhsat-as-sukna-maghrib |
| plan-amenagement-kenitra | kenitra-zoning-plan | tasmim-at-tahyia-al-qunaytira |
| plan-maison-100m2-maroc | 100m2-house-plan-morocco | tasmim-manzil-100-metr-maghrib |
| prix-construction-maison-maroc-m2 | house-construction-cost-per-m2-morocco | taklifat-bina-manzil-maghrib *(existe)* |
| prix-gros-oeuvre-maroc | structural-work-cost-morocco | thaman-al-ashghal-al-kubra-maghrib |
| procedure-autorisation-construire-maroc | building-permit-procedure-morocco | maskat-rukhsat-al-bina-maghrib |
| rokhas-autorisation-urbanisme-en-ligne | rokhas-online-building-permit-morocco | rokhas-rukhsat-al-bina-online |
| taxes-frais-permis-construire-maroc | building-permit-fees-taxes-morocco | rusum-rukhsat-al-bina-maghrib |
| textes-reglementation-urbanisme-maroc | morocco-planning-building-regulations | nusus-at-taamir-maghrib |

## Règles de traduction

- **Adaptation, pas traduction mot à mot.** Le `title`, le `h1` et la `desc` reprennent les mots que les lecteurs tapent dans leur langue (anglais : expatriés et investisseurs ; arabe : Marocains arabophones). Le corps reste fidèle au français.
- **Aucun fait nouveau, aucun chiffre modifié.** Les montants, les délais et les articles de loi sont identiques à la version française. Un « à vérifier » reste un « à vérifier ».
- **Les noms officiels restent en français entre parenthèses** dans les versions anglaise et arabe, par exemple « occupancy permit (permis d'habiter) ».
- **Les liens internes vers d'autres guides** pointent vers la version de même langue, d'après la table ci-dessus. `/chiffrage`, `/rendez-vous` et `/architecte-kenitra` restent identiques.
- **Les sources sont identiques.**
- **Champs à renseigner :** `lang` (`en` ou `ar`), `groupe` (le slug FR), `majLe` et la même `categorie` que la version française.
