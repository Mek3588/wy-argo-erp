# Multi-stage build for Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production runtime stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Ensure persistent data directory exists
RUN mkdir -p /app/data

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]

