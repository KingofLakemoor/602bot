# Dockerfile for Controller App (/controller-app)
# Builds the React/Vite dashboard and runs the Express server on Port 3000
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/New_York
ENV PORT=3000
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# Copy app code
COPY . .

# Build Vite frontend assets
RUN npm run build || true

EXPOSE 3000

CMD ["node", "server.ts"]
