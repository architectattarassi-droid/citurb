# Prisma
- Canonical schema lives in `prisma/schema.prisma`
- For doctrine: keep `ProbativeLog` append-only, `Incident` engine, and `Project/Order/Entitlement/StateHistory`

Use from `apps/api` scripts:
- `npm run prisma:generate`
- `npm run prisma:migrate`
