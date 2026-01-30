import type { Bot, CreateBotInput } from './types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function fetchBots(): Promise<Bot[]> {
  const response = await fetch(`${API_BASE}/bots`);
  const data = await handleResponse<{ bots: Bot[] }>(response);
  return data.bots;
}

export async function fetchBot(id: string): Promise<Bot> {
  const response = await fetch(`${API_BASE}/bots/${id}`);
  return handleResponse<Bot>(response);
}

export async function createBot(input: CreateBotInput): Promise<Bot> {
  const response = await fetch(`${API_BASE}/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Bot>(response);
}

export async function deleteBot(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/bots/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function startBot(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/bots/${id}/start`, {
    method: 'POST',
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function stopBot(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/bots/${id}/stop`, {
    method: 'POST',
  });
  await handleResponse<{ success: boolean }>(response);
}
