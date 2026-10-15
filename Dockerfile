# Stage 1
ARG NODE_VERSION=24.14.0-alpine
FROM node:${NODE_VERSION} AS builder

LABEL org.opencontainers.image.source="https://github.com/benciks/exroute-web"

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npm run build

# Stage 2

FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production

WORKDIR /app

COPY --link --from=builder /app/dist ./dist

RUN --mount=type=cache,target=/root/.npm npm install serve@^14.2.6 --omit=dev

USER node

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist", "-l", "3000"]

