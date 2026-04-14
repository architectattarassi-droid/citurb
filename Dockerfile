FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/
COPY prisma/ ./prisma/

RUN npm install --legacy-peer-deps

RUN npx prisma generate --schema prisma/schema.prisma

RUN npm --prefix apps/api run build

RUN npm --prefix apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p /data/citurbarea /data/uploads /data/outputs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
