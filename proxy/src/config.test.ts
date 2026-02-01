import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID, randomBytes } from 'crypto';

describe('Proxy Config', () => {
  const originalEnv = { ...process.env };
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `proxy-config-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });

    // Clear relevant env vars
    delete process.env.ADMIN_PORT;
    delete process.env.DATA_PORT;
    delete process.env.DB_PATH;
    delete process.env.MASTER_KEY;
    delete process.env.MASTER_KEY_FILE;
    delete process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN_FILE;

    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load config from env vars', async () => {
    const masterKey = randomBytes(32).toString('hex');
    process.env.MASTER_KEY = masterKey;
    process.env.ADMIN_TOKEN = 'test-admin-token';
    process.env.ADMIN_PORT = '9200';
    process.env.DATA_PORT = '9201';
    process.env.DB_PATH = '/data/proxy.db';

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.adminPort).toBe(9200);
    expect(config.dataPort).toBe(9201);
    expect(config.dbPath).toBe('/data/proxy.db');
    expect(config.masterKey.length).toBe(32);
    expect(config.adminToken).toBe('test-admin-token');
  });

  it('should use default ports', async () => {
    const masterKey = randomBytes(32).toString('hex');
    process.env.MASTER_KEY = masterKey;
    process.env.ADMIN_TOKEN = 'test-token';

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.adminPort).toBe(9100);
    expect(config.dataPort).toBe(9101);
    expect(config.dbPath).toBe('./proxy.db');
  });

  it('should read master key from file', async () => {
    const masterKey = randomBytes(32).toString('hex');
    const keyFile = join(testDir, 'master.key');
    writeFileSync(keyFile, masterKey);

    process.env.MASTER_KEY_FILE = keyFile;
    process.env.ADMIN_TOKEN = 'test-token';

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.masterKey.toString('hex')).toBe(masterKey);
  });

  it('should read admin token from file', async () => {
    const masterKey = randomBytes(32).toString('hex');
    const tokenFile = join(testDir, 'admin.token');
    writeFileSync(tokenFile, 'file-based-token\n');

    process.env.MASTER_KEY = masterKey;
    process.env.ADMIN_TOKEN_FILE = tokenFile;

    const { loadConfig } = await import('./config.js');
    const config = loadConfig();

    expect(config.adminToken).toBe('file-based-token');
  });

  it('should throw on missing master key', async () => {
    process.env.ADMIN_TOKEN = 'test-token';

    const { loadConfig } = await import('./config.js');

    expect(() => loadConfig()).toThrow('Missing required config: MASTER_KEY');
  });

  it('should throw on missing admin token', async () => {
    const masterKey = randomBytes(32).toString('hex');
    process.env.MASTER_KEY = masterKey;

    const { loadConfig } = await import('./config.js');

    expect(() => loadConfig()).toThrow('Missing required config: ADMIN_TOKEN');
  });

  it('should throw on invalid master key length', async () => {
    process.env.MASTER_KEY = 'too-short';
    process.env.ADMIN_TOKEN = 'test-token';

    const { loadConfig } = await import('./config.js');

    expect(() => loadConfig()).toThrow('MASTER_KEY must be 32 bytes (64 hex chars) for AES-256');
  });
});
