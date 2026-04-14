# Domain P1 - Architecture

## Structure

```
domain/p1/
├── types.ts                        # Types TypeScript unifiés
├── store.ts                        # Zustand store (source of truth)
├── catalog.service.ts              # Catégories dynamiques
├── pack-recommendation.service.ts  # Recommandation packs
├── validation.service.ts           # Validation business rules
└── README.md                       # Cette documentation
```

## Flow P1

### 1. Landing (`/p1`)
- Visuel immuable
- Sélection type projet (villa/immeuble/renovation)
- Sélection mode plan (type/perso)

### 2. Qualification (in-place)
- Catégories dynamiques selon type + mode
- Validation stricte (regex email/phone)
- Contact + Détails projet

### 3. Analyse (in-place)
- Récapitulatif projet
- Pack recommandé calculé
- Prix automatique

### 4. Création dossier
- OTP Mock (console logging)
- Email confirmation mock
- Génération caseId

### 5. Packs (`/p1/packs?case=ID`)
- Recap projet (collapsible)
- Pack recommandé (gold border)
- Tous les packs (toggle)
- Prix calculés

### 6. Dossier (`/p1/dossier?case=ID`)
- Timeline 13 étapes
- Documents upload
- Paiement pending
- Chatbot + WhatsApp

## Types principaux

### ProjectType
```typescript
type ProjectType = 'villa' | 'immeuble' | 'renovation';
```

### PlanMode
```typescript
type PlanMode = 'type' | 'perso';
```

### P1Case
```typescript
interface P1Case {
  id: string;
  projectType: ProjectType;
  planMode: PlanMode;
  contactData: ContactData;
  projectDetails: ProjectDetails;
  selectedPack: string | null;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'pending_otp' | 'pending_email' | 'active' | 'completed';
}
```

## Store (Zustand)

### État
- `projectType`: Type projet sélectionné
- `planMode`: Mode plan sélectionné
- `contactData`: Données contact
- `projectDetails`: Détails projet
- `caseId`: ID du dossier créé
- `selectedPack`: Pack sélectionné

### Actions
- `setProjectType(type)`: Définir type projet
- `setPlanMode(mode)`: Définir mode plan
- `setContactData(data)`: Définir contact
- `setProjectDetails(data)`: Définir détails
- `createCase()`: Créer dossier (retourne caseId)
- `selectPack(packId)`: Sélectionner pack
- `reset()`: Réinitialiser état

### Persistance
Utilise `zustand/persist` avec clé `STORAGE_KEYS.P1_DRAFT`

## Services

### catalog.service.ts
Retourne catégories dynamiques selon `projectType` + `planMode`

```typescript
const categories = getCategories('villa', 'type');
// → [{id, label, fields}]
```

### pack-recommendation.service.ts
Calcul pack recommandé + prix selon profil

```typescript
const pack = getRecommendedPack(caseData);
const price = calculatePrice(pack, caseData);
```

### validation.service.ts
Validation stricte avec regex

```typescript
const errors = validateContactData(data);
const errors = validateProjectDetails('villa', data);
```

## Utilisation

```typescript
import { useP1Store } from './domain/p1/store';
import { getCategories } from './domain/p1/catalog.service';
import { validateContactData } from './domain/p1/validation.service';

// Dans composant
const { projectType, setProjectType } = useP1Store();

// Catégories dynamiques
const categories = getCategories(projectType, planMode);

// Validation
const errors = validateContactData(formData);
```
