FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/package.json

RUN npm install --legacy-peer-deps

COPY apps/web/ ./apps/web/

RUN cd apps/web && npm run build

FROM nginx:1.27-alpine

ARG CACHE_BUST=20260523-layout-cc-sig-nationale
ENV PORT=8080

COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/

EXPOSE 8080
