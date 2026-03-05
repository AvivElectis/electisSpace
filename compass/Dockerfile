# ============================================
# electisCompass — Client (SPA + Nginx)
# ============================================
# Multi-stage: builds Compass React SPA, serves with Nginx.
# Build context must be the project root (context: .)
# ============================================

# Stage 1: Build Compass frontend (React/Vite)
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy shared code (cross-app types)
COPY shared/ ./shared/

# Copy Compass source
COPY compass/src/ ./compass/src/
COPY compass/index.html ./compass/
COPY compass/vite.config.ts ./compass/
COPY compass/tsconfig.json ./compass/

ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build:compass

# Stage 2: Serve with Nginx
FROM nginx:alpine

RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY compass/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA
COPY --from=frontend /app/compass/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
