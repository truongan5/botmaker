# BotMaker

Web UI for creating and managing OpenClaw bots in isolated Docker containers.

## Quick Start

### Development

```bash
# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Start backend (with hot reload)
npm run dev

# Start dashboard (in another terminal)
cd dashboard && npm run dev
```

### Production

```bash
# Build everything
npm run build:all

# Start
npm start
```

### Docker

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7100 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `DATA_DIR` | ./data | Database and bot workspaces |
| `SECRETS_DIR` | ./secrets | Per-bot secret storage |
| `OPENCLAW_IMAGE` | openclaw:latest | Docker image for bots |
| `OPENCLAW_GIT_TAG` | main | Git tag for building image |
| `BOT_PORT_START` | 19000 | Starting port for bot containers |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/bots | List all bots |
| GET | /api/bots/:id | Get bot details |
| POST | /api/bots | Create bot |
| DELETE | /api/bots/:id | Delete bot |
| POST | /api/bots/:id/start | Start bot container |
| POST | /api/bots/:id/stop | Stop bot container |

## Testing

```bash
# Run E2E tests (requires running server)
./scripts/test-e2e.sh
```

## Architecture

```
botmaker/
├── src/                  # Backend (Fastify + TypeScript)
│   ├── bots/             # Bot store and templates
│   ├── db/               # SQLite database
│   ├── secrets/          # Per-bot secret management
│   └── services/         # Docker container management
├── dashboard/            # Frontend (React + Vite)
│   └── src/components/   # UI components
├── data/                 # Database and bot workspaces
├── secrets/              # Per-bot secret files
└── scripts/              # Test and utility scripts
```
