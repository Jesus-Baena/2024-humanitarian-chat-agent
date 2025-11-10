# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

WORKDIR /app

# Build arguments
ARG NUXT_UI_PRO_LICENSE
ARG NUXT_PUBLIC_SITE_URL="http://localhost:3000"
ARG NUXT_PUBLIC_SUPABASE_URL="http://placeholder"
ARG NUXT_PUBLIC_SUPABASE_KEY="placeholder"
ARG NUXT_PUBLIC_FLOWISE_URL=""
ARG NUXT_PUBLIC_FLOWISE_API_KEY=""

# Set environment variables for build
ENV NUXT_UI_PRO_LICENSE=${NUXT_UI_PRO_LICENSE}
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}
ENV NUXT_PUBLIC_SUPABASE_URL=${NUXT_PUBLIC_SUPABASE_URL}
ENV NUXT_PUBLIC_SUPABASE_KEY=${NUXT_PUBLIC_SUPABASE_KEY}
ENV NUXT_PUBLIC_FLOWISE_URL=${NUXT_PUBLIC_FLOWISE_URL}
ENV NUXT_PUBLIC_FLOWISE_API_KEY=${NUXT_PUBLIC_FLOWISE_API_KEY}

# Validate critical build-time environment variables
RUN echo "🔍 Validating build arguments..." && \
    echo "NUXT_PUBLIC_FLOWISE_URL: ${NUXT_PUBLIC_FLOWISE_URL:-NOT SET}" && \
    echo "NUXT_PUBLIC_FLOWISE_API_KEY: ${NUXT_PUBLIC_FLOWISE_API_KEY:+SET (hidden)}${NUXT_PUBLIC_FLOWISE_API_KEY:-NOT SET}" && \
    if [ -z "$NUXT_PUBLIC_FLOWISE_URL" ]; then \
      echo "❌ ERROR: NUXT_PUBLIC_FLOWISE_URL is required but not set!" && \
      echo "This will cause 'No completion backend configured' error in production." && \
      echo "Set it as a GitHub Secret: https://github.com/Jesus-Baena/chat-humanitarian-agent/settings/secrets/actions" && \
      exit 1; \
    fi && \
    if [ -z "$NUXT_PUBLIC_FLOWISE_API_KEY" ]; then \
      echo "⚠️  WARNING: NUXT_PUBLIC_FLOWISE_API_KEY is not set - API calls may fail if Flowise requires authentication" ; \
    fi && \
    echo "✅ Build arguments validated successfully"

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy .npmrc if it exists
COPY .npmrc* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/.output /app/.output

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", ".output/server/index.mjs"]
