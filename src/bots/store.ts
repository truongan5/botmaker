/**
 * Bot Store
 *
 * CRUD operations for bots using SQLite database.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import type { Bot, BotStatus } from '../types/bot.js';

export interface CreateBotInput {
  name: string;
  ai_provider: string;
  model: string;
  channel_type: string;
}

export interface UpdateBotInput {
  name?: string;
  ai_provider?: string;
  model?: string;
  channel_type?: string;
  container_id?: string | null;
  status?: BotStatus;
}

/**
 * Create a new bot.
 *
 * @param input - Bot creation data
 * @returns The created bot
 */
export function createBot(input: CreateBotInput): Bot {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO bots (id, name, ai_provider, model, channel_type, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, input.name, input.ai_provider, input.model, input.channel_type, 'created', now, now);

  return {
    id,
    name: input.name,
    ai_provider: input.ai_provider,
    model: input.model,
    channel_type: input.channel_type,
    container_id: null,
    status: 'created',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get a bot by ID.
 *
 * @param id - Bot UUID
 * @returns The bot or null if not found
 */
export function getBot(id: string): Bot | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bots WHERE id = ?');
  const row = stmt.get(id) as Bot | undefined;
  return row ?? null;
}

/**
 * Get a bot by name.
 *
 * @param name - Bot name
 * @returns The bot or null if not found
 */
export function getBotByName(name: string): Bot | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bots WHERE name = ?');
  const row = stmt.get(name) as Bot | undefined;
  return row ?? null;
}

/**
 * List all bots.
 *
 * @returns Array of all bots
 */
export function listBots(): Bot[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM bots ORDER BY created_at DESC');
  return stmt.all() as Bot[];
}

/**
 * Update a bot.
 *
 * @param id - Bot UUID
 * @param input - Fields to update
 * @returns The updated bot or null if not found
 */
export function updateBot(id: string, input: UpdateBotInput): Bot | null {
  const db = getDb();
  const now = new Date().toISOString();

  // Build dynamic UPDATE query
  const updates: string[] = ['updated_at = ?'];
  const values: (string | null)[] = [now];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.ai_provider !== undefined) {
    updates.push('ai_provider = ?');
    values.push(input.ai_provider);
  }
  if (input.model !== undefined) {
    updates.push('model = ?');
    values.push(input.model);
  }
  if (input.channel_type !== undefined) {
    updates.push('channel_type = ?');
    values.push(input.channel_type);
  }
  if (input.container_id !== undefined) {
    updates.push('container_id = ?');
    values.push(input.container_id);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE bots SET ${updates.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) {
    return null;
  }

  return getBot(id);
}

/**
 * Delete a bot.
 *
 * @param id - Bot UUID
 * @returns true if deleted, false if not found
 */
export function deleteBot(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM bots WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Get the next available port for a bot container.
 * Finds the highest used port and returns the next one.
 *
 * @param startPort - Starting port number
 * @returns Next available port
 */
export function getNextBotPort(startPort: number): number {
  const db = getDb();

  // Count existing bots to determine next port
  const stmt = db.prepare('SELECT COUNT(*) as count FROM bots');
  const row = stmt.get() as { count: number };

  return startPort + row.count;
}
