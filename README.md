# Humanitarian Chat Application

A Nuxt 4 application for humanitarian assistance with AI-powered chat functionality.

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

```bash
docker build -t chat-app .
```

## Environment Variables

See `.env.example` for required configuration.

### Critical Environment Variables

For production deployments, ensure these client-side variables are set:

- `NUXT_PUBLIC_FLOWISE_URL` - Flowise API endpoint
- `NUXT_PUBLIC_FLOWISE_API_KEY` - Flowise API key
- `NUXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase publishable key

**Note**: `NUXT_PUBLIC_*` variables must be set both at **build time** (GitHub Actions) and **runtime** (Docker service) for the application to work correctly.

## Production Deployment

### Quick Deploy

On the Docker Swarm manager:

```bash
./deploy.sh
```

### Emergency Fix

If chat completions fail with "No completion backend configured":

```bash
./emergency-deploy.sh
```

### Full Documentation

See [Production Deployment Guide](docs/guides/production-deployment.md) for:
- Complete deployment procedures
- GitHub Actions setup
- Environment variable configuration
- Troubleshooting steps

## License

[Your License Here]
