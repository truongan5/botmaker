import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isProxyHealthy,
  registerBotWithProxy,
  revokeBotFromProxy,
  getAvailableVendors,
  listProxyKeys,
  addProxyKey,
  deleteProxyKey,
  getProxyHealth,
  type ProxyConfig,
} from './client.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Proxy Client', () => {
  const proxyConfig: ProxyConfig = {
    adminUrl: 'http://localhost:9100',
    adminToken: 'test-admin-token',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isProxyHealthy', () => {
    it('should return true when proxy is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const result = await isProxyHealthy(proxyConfig);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9100/admin/health',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-admin-token',
          },
        })
      );
    });

    it('should return false when proxy returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await isProxyHealthy(proxyConfig);
      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await isProxyHealthy(proxyConfig);
      expect(result).toBe(false);
    });
  });

  describe('registerBotWithProxy', () => {
    it('should register bot and return token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'bot-token-123' }),
      });

      const result = await registerBotWithProxy(
        proxyConfig,
        'bot-id-123',
        'test-bot',
        ['prod', 'premium']
      );

      expect(result.token).toBe('bot-token-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9100/admin/bots',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-admin-token',
          },
          body: JSON.stringify({
            botId: 'bot-id-123',
            hostname: 'test-bot',
            tags: ['prod', 'premium'],
          }),
        })
      );
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Bot already registered' }),
      });

      await expect(
        registerBotWithProxy(proxyConfig, 'bot-id', 'test-bot')
      ).rejects.toThrow('Failed to register bot with proxy: Bot already registered');
    });

    it('should handle missing error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(
        registerBotWithProxy(proxyConfig, 'bot-id', 'test-bot')
      ).rejects.toThrow('Failed to register bot with proxy: Unknown error');
    });
  });

  describe('revokeBotFromProxy', () => {
    it('should revoke bot successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await expect(
        revokeBotFromProxy(proxyConfig, 'bot-id-123')
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9100/admin/bots/bot-id-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-admin-token',
          },
        })
      );
    });

    it('should not throw on 404 (already deleted)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        revokeBotFromProxy(proxyConfig, 'bot-id-123')
      ).resolves.toBeUndefined();
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      await expect(
        revokeBotFromProxy(proxyConfig, 'bot-id-123')
      ).rejects.toThrow('Failed to revoke bot from proxy: Internal error');
    });
  });

  describe('getAvailableVendors', () => {
    it('should return unique vendor list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: '1', vendor: 'openai', label: 'Key 1' },
            { id: '2', vendor: 'openai', label: 'Key 2' },
            { id: '3', vendor: 'anthropic', label: 'Key 3' },
          ]),
      });

      const result = await getAvailableVendors(proxyConfig);

      expect(result).toHaveLength(2);
      expect(result).toContain('openai');
      expect(result).toContain('anthropic');
    });

    it('should return empty array when no keys', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await getAvailableVendors(proxyConfig);
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getAvailableVendors(proxyConfig)).rejects.toThrow(
        'Failed to get available vendors from proxy'
      );
    });
  });

  describe('listProxyKeys', () => {
    it('should return keys list', async () => {
      const keys = [
        { id: '1', vendor: 'openai', label: 'Key 1', tag: null, created_at: 1234567890 },
        { id: '2', vendor: 'anthropic', label: 'Key 2', tag: 'prod', created_at: 1234567891 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(keys),
      });

      const result = await listProxyKeys(proxyConfig);

      expect(result).toEqual(keys);
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(listProxyKeys(proxyConfig)).rejects.toThrow('Failed to list proxy keys');
    });
  });

  describe('addProxyKey', () => {
    it('should add key and return id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-key-id' }),
      });

      const result = await addProxyKey(proxyConfig, {
        vendor: 'openai',
        secret: 'sk-test-123',
        label: 'Test Key',
        tag: 'prod',
      });

      expect(result.id).toBe('new-key-id');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9100/admin/keys',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            vendor: 'openai',
            secret: 'sk-test-123',
            label: 'Test Key',
            tag: 'prod',
          }),
        })
      );
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Unknown vendor' }),
      });

      await expect(
        addProxyKey(proxyConfig, { vendor: 'unknown', secret: 'key' })
      ).rejects.toThrow('Failed to add proxy key: Unknown vendor');
    });
  });

  describe('deleteProxyKey', () => {
    it('should delete key successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await expect(
        deleteProxyKey(proxyConfig, 'key-123')
      ).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9100/admin/keys/key-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should not throw on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        deleteProxyKey(proxyConfig, 'key-123')
      ).resolves.toBeUndefined();
    });

    it('should throw on other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database error' }),
      });

      await expect(
        deleteProxyKey(proxyConfig, 'key-123')
      ).rejects.toThrow('Failed to delete proxy key: Database error');
    });
  });

  describe('getProxyHealth', () => {
    it('should return health response', async () => {
      const health = {
        status: 'ok',
        keyCount: 5,
        botCount: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(health),
      });

      const result = await getProxyHealth(proxyConfig);

      expect(result).toEqual(health);
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(getProxyHealth(proxyConfig)).rejects.toThrow(
        'Failed to get proxy health'
      );
    });
  });
});
