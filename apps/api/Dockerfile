FROM node:22-alpine

RUN apk add --no-cache openssl
RUN npm install -g pnpm@9.12.1

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm --filter @team-hub/api db:generate

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter @team-hub/api db:migrate:deploy && pnpm --filter @team-hub/api start"]
