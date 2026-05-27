# Livraisons Matériaux — INTEGRATION

Module **Livraisons Matériaux** (Tome 5) orchestre :
`commande → fournisseur confirme → livraison chantier → réception (photo + signature) → paiement jalon`.

## Backend (`apps/api/src/modules/livraisons-materiaux/`)

- `livraisons-materiaux.module.ts` — `LivraisonsMateriauxModule` (importe `KernelModule` pour `ProbativeLogService`).
- `livraisons-materiaux.controller.ts` — `@Controller("api/livraisons")` + `@Tome("tome5")` + `JwtAuthGuard`.
- `livraisons-materiaux.service.ts` — toute la logique : CRUD JSON, transitions de statut, anomalies, jalon paiement, ProbativeLog.
- `types.ts` — `Commande`, `LigneCommande`, `CommandeAnomalie`, `ReceptionInput`, `AnomalieInput`, `isoWeekKey()`.

### Stockage MVP

Aucune migration Prisma : les commandes sont stockées en JSON dans `Dossier.payload.livraisons` (array de `Commande`).
Migration future possible vers une table `MaterialDeliveryOrder`.

### Endpoints

| Verbe | Route | Rule |
|-------|-------|------|
| POST | `/api/livraisons/commande` | `T5-LIV-COMMANDE-001` |
| GET | `/api/livraisons/dossier/:dossierId` | `T5-LIV-LIST-001` |
| GET | `/api/livraisons/dossier/:dossierId/calendar?week=YYYY-WW` | `T5-LIV-CALENDAR-007` |
| GET | `/api/livraisons/commande/:id?dossierId=...` | `T5-LIV-DETAIL-001` |
| GET | `/api/livraisons/commande/:id/audit?dossierId=...` | `T5-LIV-AUDIT-008` |
| POST | `/api/livraisons/commande/:id/confirm-supplier` | `T5-LIV-CONFIRM-002` |
| POST | `/api/livraisons/commande/:id/reject-supplier` | `T5-LIV-REJECT-003` |
| POST | `/api/livraisons/commande/:id/livraison-prete` | `T5-LIV-EN-ROUTE-004` |
| POST | `/api/livraisons/commande/:id/reception` | `T5-LIV-RECEPTION-005` |
| POST | `/api/livraisons/commande/:id/anomalie` | `T5-LIV-ANOMALIE-006` |

### Doctrine RuleIDs (à ajouter `docs/rules/registry.yml`)

- `T5-LIV-COMMANDE-001` — création commande (owner chef chantier)
- `T5-LIV-CONFIRM-002` — confirmation fournisseur
- `T5-LIV-REJECT-003` — refus fournisseur
- `T5-LIV-EN-ROUTE-004` — fournisseur marque livraison en route
- `T5-LIV-RECEPTION-005` — réception physique sur chantier (photo + signature obligatoires) + ProbativeLog
- `T5-LIV-ANOMALIE-006` — anomalie déclarée
- `T5-LIV-CALENDAR-007` — vue calendrier hebdo
- `T5-LIV-AUDIT-008` — trail complet

### ProbativeLog (chaîne SHA-256)

Toutes les transitions critiques sont append-only :
- `COMMANDE_CREATED`
- `SUPPLIER_CONFIRMED`
- `SUPPLIER_REJECTED`
- `SUPPLIER_LIVRAISON_PRETE`
- **`RECEPTION_CHANTIER`** (avec photos count, signature présente, anomalies count)
- `ANOMALIE_DECLAREE`

### Branchements

1. `apps/api/src/app.module.ts` — `LivraisonsMateriauxModule` ajouté dans `imports[]`.
2. `apps/api/src/common/guards/mutation-gate.guard.ts` — `/api/livraisons` ajouté à l'allow-list.
3. Aucune migration Prisma requise.

## Frontend (`apps/web/src/features/livraisons-materiaux/`)

- `LivraisonsPage.tsx` — page principale (route `/chantier/:dossierId/livraisons`) avec tabs En attente / Confirmées / Cette semaine / Reçues / Anomalies + FAB sticky + pull-to-refresh.
- `CommandeForm.tsx` — création commande (autocomplete via `/api/materials/catalog/search`).
- `CommandeCard.tsx` — carte récap + actions contextuelles selon rôle.
- `ReceptionLivraisonModal.tsx` — **MOBILE-FIRST** : caméra directe (`capture="environment"`), qty par ligne, OK / Anomalie, signature canvas, bouton sticky bottom.
- `LivraisonsCalendar.tsx` — vue semaine (7 colonnes desktop, 1 colonne mobile) cliquable.
- `livraisons-materiaux.api.ts` — client REST + helpers UI (`STATUS_COLOR`, `ANOMALIE_LABEL`, `fmtMad`, `isoWeekKey`).

### Branchements

1. `apps/web/src/tomes/tome1/router/routes.tsx` — route `/chantier/:dossierId/livraisons` mountée sous `PublicLayout` + `AdminHostBlock`.
2. `apps/web/src/i18n/i18n.tsx` — clés `liv.*` ajoutées (fr/ar/en).

## Flow utilisateur

1. **Chef chantier** ouvre `/chantier/:dossierId/livraisons`, FAB "Nouvelle commande" → `CommandeForm` ajoute lignes depuis catalog (prix moyen pré-rempli).
2. **Fournisseur** voit la commande dans son onglet "En attente" → bouton "Confirmer" ou "Refuser".
3. **Fournisseur** marque "Livraison prête" → statut `EN_ROUTE`.
4. **Chef chantier** sur chantier ouvre la commande → "Réceptionner" → modale plein écran :
   - Photos caméra (camion + matériaux)
   - Pour chaque ligne : qté reçue + OK ou Anomalie (avec type + description + photo)
   - Signature canvas
   - Valider → ProbativeLog + statut `RECEIVED` (ou `DISPUTED` si anomalies)
5. Si `RECEIVED` sans anomalies, `paiementJalon` créé automatiquement (J+30).

## Mobile-first

- Tap targets ≥ 44px (cible mobile Apple HIG / Material).
- `capture="environment"` sur tous les inputs photo (back-camera direct).
- Bouton "Valider réception" en sticky bottom dans la modale réception.
- Pull-to-refresh natif (touch listeners) sur la liste.
- FAB sticky bottom-right.

## Tests à effectuer

```bash
npm run dev

# Backend
curl http://localhost:4000/api/livraisons/dossier/$DOSSIER_ID \
  -H "Authorization: Bearer $TOKEN"

# UI
# http://localhost:5173/chantier/$DOSSIER_ID/livraisons
# - Tester création commande (autocomplete)
# - Tester confirm/reject côté fournisseur (avec compte user matching supplierUserId)
# - Tester réception sur mobile (caméra réelle)
```

## Roadmap

- [ ] Modèle Prisma `MaterialDeliveryOrder` + migration
- [ ] Upload photos S3 (au lieu de base64)
- [ ] Push notif Twilio SMS "Livraison arrive dans 30 min"
- [ ] Mode hors-ligne (Service Worker + IndexedDB queue + sync au reconnect)
- [ ] Intégration tarifs contractuels P6 : si tarif signé existe pour ce fournisseur, prix unitaire = tarif contractuel (override prix moyen catalog)
- [ ] Workflow paiement escrow auto sur réception OK
