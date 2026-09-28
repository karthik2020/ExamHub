# Multi-stage Dockerfile for ExamHub Engine (Production Google Cloud Run)

# Stage 1: Build frontend and server bundles
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install all dependencies (including devDependencies required for vite and esbuild)
RUN npm install

# Copy application source files
COPY . .

# Run existing build script (vite build && esbuild server.ts ...)
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production-only dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled bundles and static assets from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root node user for container security
USER node

# Cloud Run defaults to container port 8080
EXPOSE 8080

# Use existing start script: node dist/server.cjs
CMD ["node", "dist/server.cjs"]
