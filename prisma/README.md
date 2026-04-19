# Prisma Schemas — Architecture Guide

CITURBAREA uses **two separate Prisma schemas** for data sovereignty and architectural separation.

## Schema Overview

### 1. Main Schema (`prisma/schema.prisma`)

**Purpose**: System-level data and operational concerns

**Database**: `citurbarea` (via `DATABASE_URL`)

**Prisma Client**: `@prisma/client` (default)

**Models**:
- **Auth/RBAC**: `User`, `UserEntitlements`
- **Geography**: `GeoUnit` (regions, provinces, communes)
- **Projects**: `Project`, `StateHistory`
- **Operations**: `Incident`, `IncidentEvent`, `ProbativeLog`
- **Payments**: `Order`, `Entitlement`
- **Verification**: `OtpChallenge`
- **Work Management**: `WorkSituation`

**Usage**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const users = await prisma.user.findMany();
```

---

### 2. Dossiers Schema (`prisma/dossiers/schema.prisma`)

**Purpose**: User project data (documents, calculations, dossiers)

**Database**: `citurbarea_dossiers` (via `DOSSIERS_DATABASE_URL`)

**Prisma Client**: `@prisma/client-dossiers` (custom output)

**Models**:
- `Dossier` — Project files and metadata
- `Document` — Uploaded documents
- `DossierEvent` — Dossier lifecycle events
- `DossierArea` — Area calculations (declared/estimated/verified)

**Usage**:
```typescript
import { PrismaClient as PrismaClientDossiers } from '@prisma/client-dossiers';

const prismaDossiers = new PrismaClientDossiers();
const dossiers = await prismaDossiers.dossier.findMany();
```

---

## Why Two Schemas?

### Data Sovereignty

**Principle**: User project data should be separable from system data.

**Benefits**:
1. **Privacy**: User dossiers can be stored in a separate database/region
2. **Compliance**: Easier to comply with data residency requirements
3. **Backup**: Different backup schedules for system vs user data
4. **Scale**: Dossiers database can scale independently

---

## Development Setup (Quick)

Use the same PostgreSQL server with different databases:

```env
# apps/api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citurbarea?schema=public"
DOSSIERS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citurbarea_dossiers?schema=public"
```

**Setup**:
```sql
CREATE DATABASE citurbarea;
CREATE DATABASE citurbarea_dossiers;
CREATE EXTENSION postgis;  -- Run in both databases
```

---

## Working with Both Schemas

### Generating Clients

```bash
# Generate both Prisma clients
npm run prisma:generate:all
```

### Running Migrations

**Main schema**:
```bash
npx prisma migrate dev --schema prisma/schema.prisma
```

**Dossiers schema**:
```bash
npx prisma migrate dev --schema prisma/dossiers/schema.prisma
```

---

## Troubleshooting

### "Prisma Client not found"

```bash
npm run prisma:generate:all
```

### "Cannot connect to database"

```bash
# Test main database
psql "$DATABASE_URL" -c "SELECT 1;"

# Test dossiers database
psql "$DOSSIERS_DATABASE_URL" -c "SELECT 1;"
```

---

For full documentation, see: `docs/database/PRISMA_ARCHITECTURE.md`
