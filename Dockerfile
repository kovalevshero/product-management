# Stage 1: Build stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runner stage
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm ci --only=production && \
    apk del python3 make g++

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/drizzle ./drizzle

EXPOSE 3000

CMD ["node", "dist/main"]
