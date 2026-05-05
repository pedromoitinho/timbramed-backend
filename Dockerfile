FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY src ./src
COPY assets ./assets

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
