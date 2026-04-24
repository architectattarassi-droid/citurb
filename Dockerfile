FROM node:20-alpine AS runner
WORKDIR /app

# Increment CACHE_BUST to force full rebuild when dist files change
ARG CACHE_BUST=20260425a

RUN apk add --no-cache openssl

RUN mkdir -p /data/citurbarea /data/uploads /data/outputs /app/uploads/dossiers

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/dist/ ./apps/web/dist/
COPY apps/api/dist/ ./apps/api/dist/
COPY prisma/ ./prisma/

RUN npm install --legacy-peer-deps

RUN node ./node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
RUN node ./node_modules/prisma/build/index.js generate --schema prisma/dossiers/schema.prisma

ENV NODE_ENV=production

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
