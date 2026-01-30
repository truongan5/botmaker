# Phase 1: Foundation - Research

**Researched:** 2026-01-30
**Domain:** SQLite persistence, file-based secrets management
**Confidence:** HIGH

## Summary

Phase 1 establishes persistent storage (SQLite with better-sqlite3) and secure secrets infrastructure (file-based with Unix permissions). This is the foundation for bot metadata storage and credential isolation.

The approach mirrors the proven keeper-arb reference implementation: synchronous SQLite with WAL mode for performance, Docker-style secrets read from files under `/run/secrets/` or a local secrets directory with strict 0600/0700 permissions for security.

**Primary recommendation:** Use better-sqlite3 ^11.6.0 with WAL mode, prepared statements, and synchronous transaction API. Implement secrets as plain text files with 0600 permissions in per-bot directories with 0700 permissions.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.6.0 | SQLite database | Fastest Node.js SQLite lib, synchronous API, TypeScript support |
| @types/better-sqlite3 | ^7.6.12 | TypeScript types | DefinitelyTyped maintained |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | builtin | File permissions | Creating secrets dirs/files with mode |
| node:path | builtin | Path manipulation | Joining paths safely |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | node:sqlite (experimental) | Native but requires flag, not production ready as of Jan 2026 |
| better-sqlite3 | sqlite3 (async) | Callbacks, slower, more complex |
| File secrets | Environment vars | Env vars visible in process list, harder to isolate per-bot |
| File secrets | Vault/AWS Secrets Manager | Overkill for local/container deployment |

**Installation:**
```bash
npm install better-sqlite3 @types/better-sqlite3
# Already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── index.ts        # Database init, getDb()
│   ├── schema.ts       # Table definitions
│   └── migrations.ts   # Version migrations
├── secrets/
│   └── manager.ts      # Secrets CRUD operations
└── types/
    └── bot.ts          # Bot interface
```

### Pattern 1: Singleton Database with Lazy Init
**What:** Single database instance, initialized once on first access
**When to use:** Always for better-sqlite3 (synchronous, no connection pool needed)
**Example:**
```typescript
// Source: keeper-arb reference + better-sqlite3 docs
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

let db: Database.Database | null = null;

export function initDb(dataDir: string): Database.Database {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'botmaker.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createSchema(db);
  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized - call initDb first');
  }
  return db;
}
```

### Pattern 2: Prepared Statement Caching
**What:** Prepare SQL once, reuse for performance
**When to use:** Queries executed multiple times
**Example:**
```typescript
// Source: better-sqlite3 API docs
const insertBot = db.prepare(`
  INSERT INTO bots (name, ai_provider, model, channel_type, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const result = insertBot.run('mybot', 'openai', 'gpt-4', 'slack', 'created');
const botId = result.lastInsertRowid; // bigint
```

### Pattern 3: Secrets Directory Per Bot
**What:** Each bot gets isolated directory under secrets root
**When to use:** Always - prevents credential cross-contamination
**Example:**
```typescript
// Source: Node.js fs docs + Docker secrets pattern
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SECRETS_ROOT = process.env.SECRETS_DIR || './secrets';

export function createBotSecretsDir(botId: string): string {
  const botDir = join(SECRETS_ROOT, botId);
  mkdirSync(botDir, { mode: 0o700, recursive: true });
  return botDir;
}

export function writeSecret(botId: string, name: string, value: string): void {
  const filePath = join(SECRETS_ROOT, botId, name);
  writeFileSync(filePath, value, { mode: 0o600 });
}

export function deleteBotSecrets(botId: string): void {
  const botDir = join(SECRETS_ROOT, botId);
  if (existsSync(botDir)) {
    rmSync(botDir, { recursive: true, force: true });
  }
}
```

### Anti-Patterns to Avoid
- **String concatenation in SQL:** Always use prepared statements with `?` placeholders
- **Storing bigint as number:** SQLite ROWID can exceed JS number precision; use `BigInt` or store as TEXT
- **Hardcoding secrets in code:** Always read from files or environment
- **Creating files then chmod:** Use `mode` option on creation for atomic secure write
- **Global secrets file:** Each bot must have isolated directory

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migrations | Manual ALTER TABLE | Migration system with version tracking | Ordering, idempotency, rollback |
| Connection pooling | Custom pool | Nothing (better-sqlite3 is sync) | Sync API needs no pool |
| SQL injection prevention | String escaping | Prepared statements | Built-in, safer, faster |
| Atomic file write | write then chmod | writeFileSync with mode option | Race condition in two-step |

**Key insight:** better-sqlite3's synchronous API eliminates async complexity. Don't add connection pooling, promise wrappers, or async transaction management - they add overhead with no benefit.

## Common Pitfalls

### Pitfall 1: Missing WAL Mode
**What goes wrong:** Database locked during reads, concurrent access fails
**Why it happens:** SQLite default journal mode is DELETE (exclusive locking)
**How to avoid:** Always set `db.pragma('journal_mode = WAL')` immediately after opening
**Warning signs:** SQLITE_BUSY errors, slow dashboard while bot runs

### Pitfall 2: Forgetting Type Assertions
**What goes wrong:** TypeScript types all queries as `unknown`
**Why it happens:** better-sqlite3 cannot infer return types from SQL strings
**How to avoid:** Use explicit type assertion: `stmt.get() as Bot | undefined`
**Warning signs:** Excessive `any` casts, runtime type errors

### Pitfall 3: File Permissions on Existing Files
**What goes wrong:** writeFileSync mode option only works on NEW files
**Why it happens:** Mode sets permissions at creation time, not on overwrite
**How to avoid:** Use chmodSync after write if file may already exist, or delete first
**Warning signs:** Secrets files with wrong permissions after update

### Pitfall 4: Sync Operations Blocking Event Loop
**What goes wrong:** Dashboard unresponsive during large DB operations
**Why it happens:** better-sqlite3 is synchronous by design
**How to avoid:** Keep individual operations small, batch with transactions
**Warning signs:** API latency spikes during writes

### Pitfall 5: Secrets Directory Traversal
**What goes wrong:** Attacker reads arbitrary files via malicious bot ID
**Why it happens:** Bot ID used directly in path without validation
**How to avoid:** Validate bot ID is UUID only, use path.join (never concatenate)
**Warning signs:** Bot IDs containing `..` or `/`

## Code Examples

### Database Initialization
```typescript
// Source: keeper-arb/src/db.ts + better-sqlite3 docs
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function initDb(dataDir: string): Database.Database {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'botmaker.db');
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent access
  db.pragma('journal_mode = WAL');

  return db;
}
```

### Bots Table Schema
```typescript
// Source: Requirements INF-02, SEC-03
export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      ai_provider TEXT NOT NULL,
      model TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      container_id TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
    CREATE INDEX IF NOT EXISTS idx_bots_name ON bots(name);
  `);
}
```

### Prepared Statement Usage
```typescript
// Source: better-sqlite3 API docs
interface Bot {
  id: string;
  name: string;
  ai_provider: string;
  model: string;
  channel_type: string;
  container_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const stmts = {
  getById: db.prepare('SELECT * FROM bots WHERE id = ?'),
  getByName: db.prepare('SELECT * FROM bots WHERE name = ?'),
  getAll: db.prepare('SELECT * FROM bots ORDER BY created_at DESC'),
  insert: db.prepare(`
    INSERT INTO bots (id, name, ai_provider, model, channel_type, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  updateStatus: db.prepare(`
    UPDATE bots SET status = ?, updated_at = datetime('now') WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM bots WHERE id = ?'),
};

// Usage
function getBot(id: string): Bot | undefined {
  return stmts.getById.get(id) as Bot | undefined;
}

function createBot(bot: Omit<Bot, 'container_id' | 'created_at' | 'updated_at'>): Bot {
  stmts.insert.run(bot.id, bot.name, bot.ai_provider, bot.model, bot.channel_type, bot.status);
  return getBot(bot.id)!;
}
```

### Secrets Manager
```typescript
// Source: Node.js fs docs, keeper-arb pattern
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SECRETS_ROOT = process.env.SECRETS_DIR || './secrets';

// Validate bot ID is safe for filesystem
function validateBotId(botId: string): void {
  // UUID format: 8-4-4-4-12 hex chars
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(botId)) {
    throw new Error(`Invalid bot ID format: ${botId}`);
  }
}

export function createBotSecretsDir(botId: string): string {
  validateBotId(botId);
  const botDir = join(SECRETS_ROOT, botId);
  mkdirSync(botDir, { mode: 0o700, recursive: true });
  return botDir;
}

export function writeSecret(botId: string, name: string, value: string): void {
  validateBotId(botId);
  const dir = join(SECRETS_ROOT, botId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { mode: 0o700, recursive: true });
  }
  const filePath = join(dir, name);
  writeFileSync(filePath, value, { mode: 0o600 });
}

export function readSecret(botId: string, name: string): string | undefined {
  validateBotId(botId);
  const filePath = join(SECRETS_ROOT, botId, name);
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw err;
  }
}

export function deleteBotSecrets(botId: string): void {
  validateBotId(botId);
  const botDir = join(SECRETS_ROOT, botId);
  if (existsSync(botDir)) {
    rmSync(botDir, { recursive: true, force: true });
  }
}
```

### Required Secrets Per Bot
```typescript
// Source: Requirements - bot needs AI provider key and channel credentials
export const REQUIRED_SECRETS = {
  // AI provider authentication
  AI_API_KEY: 'ai_api_key',

  // Channel credentials (varies by type)
  CHANNEL_TOKEN: 'channel_token',      // Slack bot token, Discord token, etc.
  CHANNEL_CONFIG: 'channel_config',    // JSON: webhook URLs, channel IDs, etc.
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sqlite3 (async callbacks) | better-sqlite3 (sync) | ~2020 | 2-10x faster, simpler code |
| Environment variables for secrets | File-based secrets | Docker secrets ~2017 | Isolation, rotation, no process list leak |
| DELETE journal mode | WAL mode | Always preferred | Concurrent readers, better crash recovery |

**Deprecated/outdated:**
- node-sqlite3: Async callbacks, slower, more complex error handling
- Storing secrets in SQLite: Database file may be backed up/shared, exposing secrets

## Open Questions

1. **Migration versioning strategy**
   - What we know: keeper-arb uses inline column checks for migrations
   - What's unclear: Whether to use formal migration table for botmaker
   - Recommendation: Use migration version table for better tracking since botmaker will evolve more than keeper-arb

2. **Secrets rotation**
   - What we know: Phase 1 only needs create/read/delete
   - What's unclear: How rotation will work in later phases
   - Recommendation: Defer to future phase; current API supports it

## Sources

### Primary (HIGH confidence)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - API docs, pragma usage
- [better-sqlite3 API Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) - Prepared statements, transactions
- [Node.js fs documentation](https://nodejs.org/api/fs.html) - File permissions, mkdir/writeFile with mode
- keeper-arb/src/db.ts - Reference implementation (same stack)
- keeper-arb/src/config.ts - Secrets reading pattern

### Secondary (MEDIUM confidence)
- [Better-sqlite3 npm guide](https://generalistprogrammer.com/tutorials/better-sqlite3-npm-package-guide) - Best practices
- [Node.js secrets best practices](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/security/secretmanagement.md) - File permissions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - better-sqlite3 is proven in keeper-arb reference
- Architecture: HIGH - patterns from keeper-arb + official docs
- Pitfalls: HIGH - documented in better-sqlite3 issues and Node.js fs docs

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (60 days - stable domain)
