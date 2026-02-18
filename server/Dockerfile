# ============================================
# electisSpace — Combined Build
# ============================================
# Multi-stage: builds frontend + server in one image.
# Build context must be the project root (context: .)
# ============================================

# Stage 1: Build frontend (React/Vite)
FROM node:20-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/
COPY index.html tsconfig*.json vite.config.ts ./

ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

# Stage 2: Build server (TypeScript)
FROM node:20-alpine AS server-builder

WORKDIR /app

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY server/prisma.config.ts ./prisma.config.ts
COPY server/tsconfig.json ./
COPY server/src ./src/

RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema, config, and generated client
COPY --from=server-builder /app/prisma ./prisma
COPY --from=server-builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=server-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built server
COPY --from=server-builder /app/dist ./dist

# Copy built frontend
COPY --from=frontend /app/dist ./public

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
