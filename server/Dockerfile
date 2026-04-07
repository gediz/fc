FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server.ts ./
COPY db.ts ./
COPY logger.ts ./
COPY data/ ./data/
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY --from=builder /app/dist/ ./
EXPOSE 3100
CMD ["node", "server.js"]
