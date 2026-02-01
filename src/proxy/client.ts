/**
 * Proxy Client
 *
 * Client for communicating with the keyring proxy admin API.
 */

import { getConfig } from '../config.js';

export interface ProxyConfig {
  adminUrl: string;
  adminToken: string;
}

export interface BotRegistration {
  token: string;
}

export interface ProxyHealthResponse {
  status: string;
  keyCount: number;
  botCount: number;
}

export interface ProxyKey {
  id: string;
  vendor: string;
  label: string | null;
  tag: string | null;
  created_at: number;
}

export interface AddKeyInput {
  vendor: string;
  secret: string;
  label?: string;
  tag?: string;
}

/**
 * Get proxy configuration from environment.
 * Returns null if proxy is not configured.
 */
export function getProxyConfig(): ProxyConfig | null {
  const config = getConfig();

  if (!config.proxyAdminUrl || !config.proxyAdminToken) {
    return null;
  }

  return {
    adminUrl: config.proxyAdminUrl,
    adminToken: config.proxyAdminToken,
  };
}

/**
 * Check if proxy is available and healthy.
 */
export async function isProxyHealthy(proxyConfig: ProxyConfig): Promise<boolean> {
  try {
    const response = await fetch(`${proxyConfig.adminUrl}/admin/health`, {
      headers: {
        Authorization: `Bearer ${proxyConfig.adminToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Register a bot with the proxy.
 * Returns the bot token to use for proxy authentication.
 */
export async function registerBotWithProxy(
  proxyConfig: ProxyConfig,
  botId: string,
  hostname: string,
  tags?: string[]
): Promise<BotRegistration> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/bots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
    body: JSON.stringify({ botId, hostname, tags }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to register bot with proxy: ${errorBody.error}`);
  }

  return response.json() as Promise<BotRegistration>;
}

/**
 * Revoke a bot's access to the proxy.
 */
export async function revokeBotFromProxy(
  proxyConfig: ProxyConfig,
  botId: string
): Promise<void> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/bots/${botId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to revoke bot from proxy: ${errorBody.error}`);
  }
}

/**
 * Get list of vendors that have keys configured in the proxy.
 */
export async function getAvailableVendors(
  proxyConfig: ProxyConfig
): Promise<string[]> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/keys`, {
    headers: {
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get available vendors from proxy');
  }

  const keys = await response.json() as ProxyKey[];
  const vendors = new Set(keys.map(k => k.vendor));
  return Array.from(vendors);
}

/**
 * List all API keys from the proxy (without secrets).
 */
export async function listProxyKeys(
  proxyConfig: ProxyConfig
): Promise<ProxyKey[]> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/keys`, {
    headers: {
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list proxy keys');
  }

  return response.json() as Promise<ProxyKey[]>;
}

/**
 * Add a new API key to the proxy.
 */
export async function addProxyKey(
  proxyConfig: ProxyConfig,
  input: AddKeyInput
): Promise<{ id: string }> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to add proxy key: ${errorBody.error}`);
  }

  return response.json() as Promise<{ id: string }>;
}

/**
 * Delete an API key from the proxy.
 */
export async function deleteProxyKey(
  proxyConfig: ProxyConfig,
  keyId: string
): Promise<void> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/keys/${keyId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to delete proxy key: ${errorBody.error}`);
  }
}

/**
 * Get proxy health status.
 */
export async function getProxyHealth(
  proxyConfig: ProxyConfig
): Promise<ProxyHealthResponse> {
  const response = await fetch(`${proxyConfig.adminUrl}/admin/health`, {
    headers: {
      Authorization: `Bearer ${proxyConfig.adminToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get proxy health');
  }

  return response.json() as Promise<ProxyHealthResponse>;
}
