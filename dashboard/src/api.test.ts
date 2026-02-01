import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBots,
  fetchBot,
  createBot,
  deleteBot,
  startBot,
  stopBot,
  fetchContainerStats,
  fetchOrphans,
  runCleanup,
  checkHealth,
  fetchProxyKeys,
  addProxyKey,
  deleteProxyKey,
  fetchProxyHealth,
} from './api';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBots', () => {
    it('should fetch and return bots array', async () => {
      const bots = [
        { id: '1', name: 'Bot 1', hostname: 'bot-1' },
        { id: '2', name: 'Bot 2', hostname: 'bot-2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bots }),
      });

      const result = await fetchBots();

      expect(result).toEqual(bots);
      expect(mockFetch).toHaveBeenCalledWith('/api/bots');
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database error' }),
      });

      await expect(fetchBots()).rejects.toThrow('Database error');
    });

    it('should throw generic error on parse failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(fetchBots()).rejects.toThrow('HTTP error 500');
    });
  });

  describe('fetchBot', () => {
    it('should fetch a single bot by hostname', async () => {
      const bot = { id: '1', name: 'Bot 1', hostname: 'bot-1' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(bot),
      });

      const result = await fetchBot('bot-1');

      expect(result).toEqual(bot);
      expect(mockFetch).toHaveBeenCalledWith('/api/bots/bot-1');
    });
  });

  describe('createBot', () => {
    it('should create a bot and return it', async () => {
      const input = {
        name: 'New Bot',
        hostname: 'new-bot',
        emoji: '🤖',
        providers: [{ providerId: 'openai', apiKey: 'sk', model: 'gpt-4' }],
        primaryProvider: 'openai',
        channels: [{ channelType: 'telegram', token: 'tk' }],
        persona: { name: 'New Bot', soulMarkdown: 'test' },
        features: { commands: false, tts: false, sandbox: false, sessionScope: 'user' as const },
      };
      const createdBot = { id: '1', ...input };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdBot),
      });

      const result = await createBot(input);

      expect(result).toEqual(createdBot);
      expect(mockFetch).toHaveBeenCalledWith('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
    });
  });

  describe('deleteBot', () => {
    it('should delete a bot', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(deleteBot('bot-1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/bots/bot-1', {
        method: 'DELETE',
      });
    });
  });

  describe('startBot', () => {
    it('should start a bot', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(startBot('bot-1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/bots/bot-1/start', {
        method: 'POST',
      });
    });
  });

  describe('stopBot', () => {
    it('should stop a bot', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(stopBot('bot-1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/bots/bot-1/stop', {
        method: 'POST',
      });
    });
  });

  describe('fetchContainerStats', () => {
    it('should fetch container stats', async () => {
      const stats = [
        { hostname: 'bot-1', cpuPercent: 5.5, memoryUsage: 1024 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ stats }),
      });

      const result = await fetchContainerStats();

      expect(result).toEqual(stats);
      expect(mockFetch).toHaveBeenCalledWith('/api/stats');
    });
  });

  describe('fetchOrphans', () => {
    it('should fetch orphan report', async () => {
      const orphans = {
        orphanedContainers: ['container-1'],
        orphanedWorkspaces: ['workspace-1'],
        orphanedSecrets: [],
        total: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(orphans),
      });

      const result = await fetchOrphans();

      expect(result).toEqual(orphans);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/orphans');
    });
  });

  describe('runCleanup', () => {
    it('should run cleanup and return report', async () => {
      const report = {
        success: true,
        containersRemoved: 1,
        workspacesRemoved: 2,
        secretsRemoved: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(report),
      });

      const result = await runCleanup();

      expect(result).toEqual(report);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/cleanup', {
        method: 'POST',
      });
    });
  });

  describe('checkHealth', () => {
    it('should check health', async () => {
      const health = { status: 'ok', timestamp: '2024-01-01T00:00:00Z' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(health),
      });

      const result = await checkHealth();

      expect(result).toEqual(health);
      expect(mockFetch).toHaveBeenCalledWith('/health');
    });
  });

  describe('fetchProxyKeys', () => {
    it('should fetch proxy keys', async () => {
      const keys = [
        { id: '1', vendor: 'openai', label: 'Key 1', tag: null, created_at: 1234567890 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ keys }),
      });

      const result = await fetchProxyKeys();

      expect(result).toEqual(keys);
      expect(mockFetch).toHaveBeenCalledWith('/api/proxy/keys');
    });
  });

  describe('addProxyKey', () => {
    it('should add a proxy key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-key-id' }),
      });

      const result = await addProxyKey({
        vendor: 'openai',
        secret: 'sk-test',
        label: 'Test',
      });

      expect(result.id).toBe('new-key-id');
      expect(mockFetch).toHaveBeenCalledWith('/api/proxy/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: 'openai',
          secret: 'sk-test',
          label: 'Test',
        }),
      });
    });
  });

  describe('deleteProxyKey', () => {
    it('should delete a proxy key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await expect(deleteProxyKey('key-123')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/proxy/keys/key-123', {
        method: 'DELETE',
      });
    });
  });

  describe('fetchProxyHealth', () => {
    it('should fetch proxy health', async () => {
      const health = {
        status: 'ok',
        keyCount: 5,
        botCount: 3,
        configured: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(health),
      });

      const result = await fetchProxyHealth();

      expect(result).toEqual(health);
      expect(mockFetch).toHaveBeenCalledWith('/api/proxy/health');
    });
  });
});
