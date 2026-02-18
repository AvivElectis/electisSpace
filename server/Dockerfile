# ============================================
# electisSpace — Server (API Only)
# ============================================
# Multi-stage: builds Express API.
# Build context must be the project root (context: .)
# ============================================

# Stage 1: Build server (TypeScript)
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

# Stage 2: Production runtime
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
