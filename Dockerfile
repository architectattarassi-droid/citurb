FROM node:20-alpine AS runner
WORKDIR /app

ARG CACHE_BUST=20260522-sig-1505communes

RUN apk add --no-cache openssl

RUN mkdir -p /data/citurbarea /data/uploads /data/outputs /app/uploads/dossiers

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/dist/ ./apps/api/dist/
COPY apps/api/data/ ./apps/api/data/
# Scripts ops (seed-admin, reset-admin-password, bootstrap-founder) — lancés
# ponctuellement via Railway shell. ts-node + bcryptjs sont dispos au runtime
# (devDeps inclus, npm install sans --production).
COPY apps/api/scripts/ ./apps/api/scripts/
COPY prisma/ ./prisma/

RUN npm install --legacy-peer-deps

RUN node ./node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
RUN node ./node_modules/prisma/build/index.js generate --schema prisma/dossiers/schema.prisma

ENV NODE_ENV=production

EXPOSE 4000
# Au démarrage : applique le schéma Prisma au cas où des nouvelles tables ont
# été ajoutées (idempotent, additif), puis lance l'API.
# `db push` ne touche pas les tables existantes ni leurs données.
CMD ["sh", "-c", "node ./node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --skip-generate --accept-data-loss=false || echo 'prisma push skipped'; node apps/api/dist/main.js"]
