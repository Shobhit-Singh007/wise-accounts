FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

COPY src ./src/
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY package*.json ./

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
