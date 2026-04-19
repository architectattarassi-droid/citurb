FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN mkdir -p /data/citurbarea /data/uploads /data/outputs

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/dist/ ./apps/api/dist/
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/dist/ ./apps/web/dist/
COPY prisma/ ./prisma/

RUN npm install --legacy-peer-deps

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
