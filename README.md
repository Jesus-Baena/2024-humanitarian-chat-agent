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

## License

[Your License Here]
