FROM node:20-slim AS build
WORKDIR /app

# NEXT_PUBLIC_* được nhúng vào code lúc build (đây là key public, không phải secret)
ARG NEXT_PUBLIC_SUPABASE_URL=https://slhutfdbkqbitwcopxkq.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_rLna6trDZm_j_a62OUEnZQ_3yetb6yZ
ARG NEXT_PUBLIC_APP_URL=https://worker-management.fly.dev
ARG NEXT_PUBLIC_SITE_URL=https://worker-management.fly.dev
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
