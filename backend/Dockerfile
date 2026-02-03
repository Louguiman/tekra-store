# Backend Dockerfile
FROM node:18-alpine AS base

# Install curl for health checks and other utilities
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install --include=dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# Install dependencies only when needed for production
FROM base AS deps
RUN npm install --only=production

# Build stage
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Production image
FROM base AS production
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

USER nestjs

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/main"]