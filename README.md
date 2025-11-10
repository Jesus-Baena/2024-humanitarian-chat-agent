# Humanitarian Chat Application

A Nuxt 4 application for humanitarian assistance with AI-powered chat functionality.

## 🚨 FIRST TIME SETUP - REQUIRED

**Before deploying to production, you MUST configure GitHub Secrets.**

See **[SECRETS_SETUP.md](SECRETS_SETUP.md)** for complete instructions.

**Skipping this will cause: `"No completion backend configured"` error in production.**

## Tech Stack

- **Framework**: Nuxt 4.0.3
- **UI**: Nuxt UI 3 + Nuxt UI Pro
- **Database**: Supabase
- **AI**: Flowise integration
- **Deployment**: Docker + Docker Swarm

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run development server**:
   ```bash
   pnpm dev
   ```

## Docker Build

**For local development (without Flowise):**
```bash
docker build --build-arg SKIP_FLOWISE_VALIDATION=true -t chat-app .
```

**For production (requires all secrets):**
```bash
docker build \
  --build-arg NUXT_PUBLIC_FLOWISE_URL="<your-flowise-url>" \
  --build-arg NUXT_PUBLIC_FLOWISE_API_KEY="<your-api-key>" \
  -t chat-app .
```

**Note:** Production builds via GitHub Actions automatically include all required secrets.

## Environment Variables

See `.env.example` for required configuration.

### Critical Environment Variables

**⚠️ PRODUCTION DEPLOYMENT REQUIRES GITHUB SECRETS**

For the application to work in production, you MUST configure GitHub Secrets. 
See **[SECRETS_SETUP.md](SECRETS_SETUP.md)** for step-by-step instructions.

Required secrets:
- `NUXT_PUBLIC_FLOWISE_URL` - Flowise API endpoint (**CRITICAL** - build fails if missing)
- `NUXT_PUBLIC_FLOWISE_API_KEY` - Flowise API key
- `NUXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NUXT_PUBLIC_SUPABASE_KEY` - Supabase publishable key

**Why?** `NUXT_PUBLIC_*` variables are baked into the JavaScript bundle at BUILD time in GitHub Actions, 
not at runtime. Docker Swarm secrets/env vars alone are NOT sufficient.

## Production Deployment

### Prerequisites

**⚠️ BEFORE FIRST DEPLOYMENT:** Configure GitHub Secrets (see [SECRETS_SETUP.md](SECRETS_SETUP.md))

### Quick Deploy

On the Docker Swarm manager:

```bash
./deploy.sh
```

### Troubleshooting

**"No completion backend configured" error?**

1. **Check GitHub Secrets:** See [SECRETS_SETUP.md](SECRETS_SETUP.md)
2. **Verify build logs:** Check GitHub Actions for "Verify build arguments" step
3. **Emergency fix:** Run `./emergency-deploy.sh` (but fix GitHub Secrets after!)

### Full Documentation

See [Production Deployment Guide](docs/guides/production-deployment.md) for:
- Complete deployment procedures
- GitHub Actions setup
- Environment variable configuration
- Advanced troubleshooting

## License

[Your License Here]
