# ==========================================
# Estágio 1: Dependências
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Estágio 2: Build da Aplicação Next.js
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ==========================================
# Estágio 3: Runner de Produção (OpenShift Ready)
# Suporta execução de sandboxes Node/TS, Python e Java
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instala runtimes necessários para avaliação técnica (Python 3 e OpenJDK)
RUN apk add --no-cache \
    python3 \
    openjdk21-jre-headless \
    openjdk21-jdk \
    libc6-compat

# Cria usuário não-root (UID 1001) compatível com SCC do OpenShift (GID 0)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G root

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
RUN mkdir -p ./public
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/infrastructure/database/schema.sql ./src/infrastructure/database/schema.sql

# Configura permissões para o grupo 0 (OpenShift executa com UID arbitrário pertencente ao GID 0)
RUN chown -R 1001:0 /app && \
    chmod -R g=u /app && \
    chmod 777 /tmp

USER 1001

EXPOSE 3000

CMD ["npm", "start"]
