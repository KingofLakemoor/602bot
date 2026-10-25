# Dockerfile for Club 602 & QNW Discord Bots Monorepo
# Compatible with Raspberry Pi (ARM64/ARMv7) and x86_64 architectures

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Install standard build essentials for native node dependencies if needed
RUN apk add --no-cache python3 make g++ tzdata

# Set timezone for cron schedules (default: America/New_York)
ENV TZ=America/New_York

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev || npm install --production

# Copy application source code
COPY shared-utils ./shared-utils
COPY bots ./bots
COPY deploy-commands.js ./deploy-commands.js

# Non-root user for security
USER node

# Default command will be overridden by docker-compose service definition
CMD ["node", "bots/commissioner/index.js"]
