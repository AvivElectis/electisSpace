# ============================================
# electisSpace Frontend - Production Build
# ============================================
# Multi-stage build: compiles the React app,
# then serves it via the nginx container in
# docker-compose.prod.yml.
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production with /app/ base path
ENV VITE_BASE_PATH=/app/
RUN npm run build

# Stage 2: Lightweight output image
# Only holds the built static files — nginx container
# copies them via a named volume or COPY --from
FROM alpine:3.20 AS production

COPY --from=builder /app/dist /dist

# This image is not meant to run — it's a build artifact.
# The dist/ folder is consumed by the nginx service in docker-compose.
CMD ["echo", "Static files available at /dist"]
