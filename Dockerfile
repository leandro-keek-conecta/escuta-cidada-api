# ---------- BUILD ----------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Gera prisma AQUI (correto)
RUN npx prisma generate

RUN npm run build

# ---------- PRODUCTION ----------
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NODE_PATH=./build

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# 🔥 ESSENCIAL: copiar o client já gerado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

CMD ["node", "--experimental-specifier-resolution=node", "build/server.js"]
