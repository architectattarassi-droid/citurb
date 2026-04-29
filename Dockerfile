FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

ARG CACHE_BUST=20260430a

RUN apk add --no-cache openssl

RUN mkdir -p /data/citurbarea /data/uploads /data/outputs /app/uploads/dossiers

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/dist/ ./apps/api/dist/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/package-lock.json ./apps/api/package-lock.json
COPY apps/web/dist/ ./apps/web/dist/
COPY prisma/ ./prisma/

RUN npm ci --prefix apps/api --legacy-peer-deps --no-workspaces

RUN node ./apps/api/node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
RUN node ./apps/api/node_modules/prisma/build/index.js generate --schema prisma/dossiers/schema.prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
