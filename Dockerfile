FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Add dummy Clerk key for build time to avoid prerender errors
ENV NEXT_PUBLIC_API_URL=https://app.producoesrg.com.br/api/v2/tables/mkalwfayxj4n8yx/records?where=AND(status,eq,ATIVO)
ENV NEXT_PUBLIC_API_TOKEN=k-OqMk2ZujIQRVfqapwCWSYBZ6w5JBcrUoI34mXn
ENV NEXT_PUBLIC_API_URL_BACKEND="http://localhost:3333"
ENV NEXT_PUBLIC_SUPABASE_URL="https://qiclatzqkndxalcvxuze.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpY2xhdHpxa25keGFsY3Z4dXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTAzODE3MiwiZXhwIjoyMDY2NjE0MTcyfQ._n1g2IuogxTEhMXP2Ji0YW5AUahScLTTbwzYK-jwgPY"
 
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dXAtc3RvcmstNjYuY2xlcmsuYWNjb3VudHMuZGV2JA
ENV CLERK_SECRET_KEY=sk_test_r7sfdbDfy6KmcuZjznMg6H97Mp7XMzGLA7RHvCJ5iW

ENV NEXT_PUBLIC_SUPABASE_API_URL="https://qiclatzqkndxalcvxuze.supabase.co"

ENV NEXT_PUBLIC_SUPABASE_BUCKET="galeria"

ENV NEXT_PUBLIC_SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpY2xhdHpxa25keGFsY3Z4dXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzgxNzIsImV4cCI6MjA2NjYxNDE3Mn0.GEIGI9h2WxOAdBpBCSdTlGeKu1zoWXmELoXmDH8MNrY"


ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/eventos
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/eventos

# RUN yarn build

# If using npm comment out above and use below instead
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 80

ENV PORT=80
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]