# Dockerfile for Discord Bot Suite (/discord-bots)
# Compatible with Raspberry Pi (ARM64/ARMv7) and x86_64
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/New_York

# Copy package manifests from monorepo
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# Copy bot code and shared utilities
COPY shared-utils ./shared-utils
COPY bots ./bots
COPY deploy-commands.js ./deploy-commands.js

USER node

CMD ["node", "bots/commissioner/index.js"]
