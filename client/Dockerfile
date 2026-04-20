# ============================================
# electisSpace — Client (SPA + Nginx)
# ============================================
# Multi-stage: builds React SPA, serves with Nginx.
# Build context must be the project root (context: .)
# ============================================

# Stage 1: Build frontend (React/Vite)
FROM node:20-alpine AS frontend

WORKDIR /app

# Harden npm against transient CI network failures (ECONNRESET on the registry).
# Per-request retries + generous timeouts; wrapped in a shell retry so a full
# connection drop mid-install gets a second or third chance.
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=180000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000

COPY package*.json ./
RUN npm ci || (echo "npm ci retry 1/2" && sleep 15 && npm ci) || (echo "npm ci retry 2/2" && sleep 45 && npm ci)

COPY src/ ./src/
COPY public/ ./public/
COPY index.html tsconfig*.json vite.config.ts ./

ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA
COPY --from=frontend /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
