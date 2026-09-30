# Multi-stage Dockerfile for ExamHub Engine (Production Google Cloud Run)

# Stage 1: Build frontend and server bundles
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install all dependencies required for the build
RUN npm install

# Copy application source files
COPY . .

# Run existing package.json build script (vite build && esbuild server.ts ...)
RUN npm run build

# Remove development-only tooling from the successful builder installation
RUN rm -rf node_modules/tsx node_modules/typescript node_modules/esbuild node_modules/@types

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Deterministic runtime dependencies copied directly from builder (no unconstrained second npm install)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Non-root user for security
USER node

# Cloud Run defaults to container port 8080
EXPOSE 8080

# Production start command
CMD ["node", "dist/server.cjs"]
