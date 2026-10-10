

FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

# Copy the API's own pnpm configuration and lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma7.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

# Copy NestJS source and configuration.
COPY . .

# Generate Prisma Client and compile the API.
RUN pnpm exec prisma generate --config prisma7.config.ts
RUN pnpm run build

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./prisma7.config.ts

EXPOSE 4000

CMD ["node", "dist/main.js"]
