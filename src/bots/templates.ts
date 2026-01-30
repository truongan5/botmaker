/**
 * Bot Templates
 *
 * Generate configuration files for OpenClaw bot workspaces.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface BotPersona {
  name: string;
  identity: string;
  description: string;
}

export interface ChannelConfig {
  type: 'telegram' | 'discord';
  token: string;
}

export interface BotWorkspaceConfig {
  botId: string;
  botName: string;
  aiProvider: string;
  model: string;
  channel: ChannelConfig;
  persona: BotPersona;
  port: number;
}

/**
 * Generate openclaw.json configuration.
 */
function generateOpenclawConfig(config: BotWorkspaceConfig): object {
  const channels: Record<string, object> = {};

  if (config.channel.type === 'telegram') {
    channels.telegram = {
      enabled: true,
      token_env: 'TELEGRAM_TOKEN',
    };
  } else if (config.channel.type === 'discord') {
    channels.discord = {
      enabled: true,
      token_env: 'DISCORD_TOKEN',
    };
  }

  return {
    name: config.botName,
    version: '1.0.0',
    ai: {
      provider: config.aiProvider,
      model: config.model,
      api_key_env: 'AI_API_KEY',
    },
    channels,
    server: {
      port: config.port,
      host: '0.0.0.0',
    },
    paths: {
      workspace: './workspace',
      sessions: './sessions',
    },
  };
}

/**
 * Generate SOUL.md - persona and boundaries.
 */
function generateSoulMd(persona: BotPersona): string {
  return `# Soul

## Core Identity
${persona.identity}

## Description
${persona.description}

## Boundaries
- Be helpful and constructive
- Stay in character as ${persona.name}
- Do not share harmful or dangerous information
- Respect user privacy
`;
}

/**
 * Generate IDENTITY.md - name and presentation.
 */
function generateIdentityMd(persona: BotPersona, botName: string): string {
  return `# Identity

## Name
${persona.name}

## Bot Name
${botName}

## Presentation
${persona.identity}

## Avatar
(No avatar configured)
`;
}

/**
 * Generate AGENTS.md - operating instructions.
 */
function generateAgentsMd(persona: BotPersona): string {
  return `# Agents

## Primary Agent
Name: ${persona.name}

### Instructions
${persona.description}

### Capabilities
- Respond to user messages
- Maintain conversation context
- Follow persona guidelines

### Limitations
- Cannot access external systems
- Cannot execute code
- Cannot access user data beyond conversation
`;
}

/**
 * Create a complete bot workspace directory structure.
 *
 * @param dataDir - Root data directory
 * @param config - Bot workspace configuration
 */
export function createBotWorkspace(dataDir: string, config: BotWorkspaceConfig): void {
  const botDir = join(dataDir, 'bots', config.botId);
  const configDir = join(botDir, 'config');
  const workspaceDir = join(botDir, 'workspace');
  const sessionsDir = join(botDir, 'sessions');

  // Create directories
  mkdirSync(configDir, { recursive: true });
  mkdirSync(workspaceDir, { recursive: true });
  mkdirSync(sessionsDir, { recursive: true });

  // Write openclaw.json
  const openclawConfig = generateOpenclawConfig(config);
  writeFileSync(
    join(configDir, 'openclaw.json'),
    JSON.stringify(openclawConfig, null, 2)
  );

  // Write workspace files
  writeFileSync(join(workspaceDir, 'SOUL.md'), generateSoulMd(config.persona));
  writeFileSync(join(workspaceDir, 'IDENTITY.md'), generateIdentityMd(config.persona, config.botName));
  writeFileSync(join(workspaceDir, 'AGENTS.md'), generateAgentsMd(config.persona));
}

/**
 * Get the path to a bot's workspace directory.
 *
 * @param dataDir - Root data directory
 * @param botId - Bot UUID
 * @returns Path to bot workspace
 */
export function getBotWorkspacePath(dataDir: string, botId: string): string {
  return join(dataDir, 'bots', botId);
}
