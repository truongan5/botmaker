import { getConfig } from '../config.js';

const REQUEST_TIMEOUT_MS = 30000;

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => { clearTimeout(timeoutId); });
}

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

function authHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

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

export async function isProxyHealthy(proxyConfig: ProxyConfig): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/health`, {
      headers: authHeaders(proxyConfig.adminToken),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function registerBotWithProxy(
  proxyConfig: ProxyConfig,
  botId: string,
  hostname: string,
  tags?: string[]
): Promise<BotRegistration> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(proxyConfig.adminToken) },
    body: JSON.stringify({ botId, hostname, tags }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to register bot with proxy: ${errorBody.error}`);
  }

  return response.json() as Promise<BotRegistration>;
}

export async function revokeBotFromProxy(
  proxyConfig: ProxyConfig,
  botId: string
): Promise<void> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/bots/${botId}`, {
    method: 'DELETE',
    headers: authHeaders(proxyConfig.adminToken),
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to revoke bot from proxy: ${errorBody.error}`);
  }
}

export async function getAvailableVendors(
  proxyConfig: ProxyConfig
): Promise<string[]> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/keys`, {
    headers: authHeaders(proxyConfig.adminToken),
  });

  if (!response.ok) {
    throw new Error('Failed to get available vendors from proxy');
  }

  const keys = await response.json() as ProxyKey[];
  return [...new Set(keys.map(k => k.vendor))];
}

export async function listProxyKeys(
  proxyConfig: ProxyConfig
): Promise<ProxyKey[]> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/keys`, {
    headers: authHeaders(proxyConfig.adminToken),
  });

  if (!response.ok) {
    throw new Error('Failed to list proxy keys');
  }

  return response.json() as Promise<ProxyKey[]>;
}

export async function addProxyKey(
  proxyConfig: ProxyConfig,
  input: AddKeyInput
): Promise<{ id: string }> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(proxyConfig.adminToken) },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to add proxy key: ${errorBody.error}`);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function deleteProxyKey(
  proxyConfig: ProxyConfig,
  keyId: string
): Promise<void> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/keys/${keyId}`, {
    method: 'DELETE',
    headers: authHeaders(proxyConfig.adminToken),
  });

  if (!response.ok && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
    throw new Error(`Failed to delete proxy key: ${errorBody.error}`);
  }
}

export async function getProxyHealth(
  proxyConfig: ProxyConfig
): Promise<ProxyHealthResponse> {
  const response = await fetchWithTimeout(`${proxyConfig.adminUrl}/admin/health`, {
    headers: authHeaders(proxyConfig.adminToken),
  });

  if (!response.ok) {
    throw new Error('Failed to get proxy health');
  }

  return response.json() as Promise<ProxyHealthResponse>;
}
