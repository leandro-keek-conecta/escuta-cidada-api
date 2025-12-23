# Stage 1 - Build
FROM node:20-bullseye AS builder
WORKDIR /app

# Instala dependências do sistema, incluindo OpenSSL 1.1
RUN apt-get update && apt-get install -y openssl libssl1.1 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm install -g npm-force-resolutions && npm install
RUN npx prisma generate
RUN npm run build

# Stage 2 - Runtime
FROM node:20-bullseye
WORKDIR /app

# Também instala libssl1.1 no runtime
RUN apt-get update && apt-get install -y openssl libssl1.1 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV NODE_PATH=./build

CMD ["node", "--experimental-specifier-resolution=node", "build/server.js"]
