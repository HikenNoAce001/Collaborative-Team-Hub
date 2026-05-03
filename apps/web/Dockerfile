FROM node:22-alpine

RUN npm install -g pnpm@9.12.1

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages ./packages

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

RUN pnpm --filter @team-hub/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@team-hub/web", "start"]
