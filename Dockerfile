# Multi-Stage Build for Production Optimized Backend

# Stage 1: Build & Dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (only production)
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/ ./
COPY frontend/ ../frontend/

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts and modules from builder stage
COPY --from=builder /app ./
COPY --from=builder /frontend ../frontend

# Environment Variables (Overriden by docker-compose)
ENV NODE_ENV=production
ENV PORT=5001
ENV DB_PATH=/app/data/quiz_app.db

# Create volume mount point for persistent DB
VOLUME ["/app/data"]

EXPOSE 5001

CMD ["npm", "start"]
