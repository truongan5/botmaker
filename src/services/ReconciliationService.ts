/**
 * Reconciliation Service
 *
 * Synchronizes database state with Docker containers and filesystem on startup.
 * Detects orphaned resources and provides cleanup capabilities.
 */

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DockerService } from './DockerService.js';
import { listBots, updateBot } from '../bots/store.js';
import { deleteBotWorkspace } from '../bots/templates.js';
import { deleteBotSecrets, getSecretsRoot } from '../secrets/manager.js';
import type { Bot } from '../types/bot.js';

/** UUID regex for identifying valid bot directories */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReconciliationReport {
  botsChecked: number;
  statusUpdated: number;
  orphanedContainers: string[];
  orphanedWorkspaces: string[];
  orphanedSecrets: string[];
}

export interface CleanupReport {
  containersRemoved: number;
  workspacesRemoved: number;
  secretsRemoved: number;
}

export class ReconciliationService {
  private docker: DockerService;
  private dataDir: string;
  private logger: { info: (msg: string | object, ...args: unknown[]) => void; warn: (msg: string | object, ...args: unknown[]) => void };

  constructor(
    docker: DockerService,
    dataDir: string,
    logger: { info: (msg: string | object, ...args: unknown[]) => void; warn: (msg: string | object, ...args: unknown[]) => void }
  ) {
    this.docker = docker;
    this.dataDir = dataDir;
    this.logger = logger;
  }

  /**
   * Perform reconciliation on startup.
   * Syncs DB status with actual container state and detects orphans.
   */
  async reconcileOnStartup(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      botsChecked: 0,
      statusUpdated: 0,
      orphanedContainers: [],
      orphanedWorkspaces: [],
      orphanedSecrets: [],
    };

    // Get all bots from DB
    const bots = listBots();
    const botIds = new Set(bots.map(b => b.id));
    report.botsChecked = bots.length;

    // Get all managed containers from Docker
    const containers = await this.docker.listManagedContainers();
    const containerBotIds = new Set(containers.map(c => c.botId));

    // Sync DB status with container state
    for (const bot of bots) {
      const updated = await this.syncBotStatus(bot, containerBotIds.has(bot.id));
      if (updated) report.statusUpdated++;
    }

    // Detect orphaned containers (in Docker but not in DB)
    for (const container of containers) {
      if (container.botId && !botIds.has(container.botId)) {
        report.orphanedContainers.push(container.botId);
        this.logger.warn({ botId: container.botId }, 'Orphaned container detected');
      }
    }

    // Detect orphaned workspace directories
    const botsDir = join(this.dataDir, 'bots');
    if (existsSync(botsDir)) {
      const workspaceDirs = this.listUuidDirectories(botsDir);
      for (const dir of workspaceDirs) {
        if (!botIds.has(dir)) {
          report.orphanedWorkspaces.push(dir);
          this.logger.warn({ botId: dir }, 'Orphaned workspace directory detected');
        }
      }
    }

    // Detect orphaned secrets directories
    const secretsRoot = getSecretsRoot();
    if (existsSync(secretsRoot)) {
      const secretDirs = this.listUuidDirectories(secretsRoot);
      for (const dir of secretDirs) {
        if (!botIds.has(dir)) {
          report.orphanedSecrets.push(dir);
          this.logger.warn({ botId: dir }, 'Orphaned secrets directory detected');
        }
      }
    }

    return report;
  }

  /**
   * Clean up orphaned resources.
   * Removes containers, workspace directories, and secrets not associated with any bot.
   */
  async cleanupOrphans(): Promise<CleanupReport> {
    const reconciliation = await this.reconcileOnStartup();
    const report: CleanupReport = {
      containersRemoved: 0,
      workspacesRemoved: 0,
      secretsRemoved: 0,
    };

    // Remove orphaned containers
    for (const botId of reconciliation.orphanedContainers) {
      try {
        await this.docker.removeContainer(botId);
        report.containersRemoved++;
        this.logger.info({ botId }, 'Removed orphaned container');
      } catch (err) {
        this.logger.warn({ botId, error: err }, 'Failed to remove orphaned container');
      }
    }

    // Remove orphaned workspaces
    for (const botId of reconciliation.orphanedWorkspaces) {
      try {
        deleteBotWorkspace(this.dataDir, botId);
        report.workspacesRemoved++;
        this.logger.info({ botId }, 'Removed orphaned workspace');
      } catch (err) {
        this.logger.warn({ botId, error: err }, 'Failed to remove orphaned workspace');
      }
    }

    // Remove orphaned secrets
    for (const botId of reconciliation.orphanedSecrets) {
      try {
        deleteBotSecrets(botId);
        report.secretsRemoved++;
        this.logger.info({ botId }, 'Removed orphaned secrets');
      } catch (err) {
        this.logger.warn({ botId, error: err }, 'Failed to remove orphaned secrets');
      }
    }

    return report;
  }

  /**
   * Sync a bot's status in DB with actual container state.
   * Returns true if status was updated.
   */
  private async syncBotStatus(bot: Bot, hasContainer: boolean): Promise<boolean> {
    if (!hasContainer) {
      // No container exists
      if (bot.status === 'running') {
        updateBot(bot.id, { status: 'stopped', container_id: null });
        this.logger.info({ botId: bot.id }, 'Bot marked stopped (no container)');
        return true;
      }
      if (bot.container_id) {
        updateBot(bot.id, { container_id: null });
        return true;
      }
      return false;
    }

    // Container exists - check its actual state
    const containerStatus = await this.docker.getContainerStatus(bot.id);
    if (!containerStatus) {
      // Container disappeared between list and inspect
      if (bot.status === 'running') {
        updateBot(bot.id, { status: 'stopped', container_id: null });
        return true;
      }
      return false;
    }

    // Sync status based on container state
    if (containerStatus.running && bot.status !== 'running') {
      updateBot(bot.id, { status: 'running' });
      this.logger.info({ botId: bot.id }, 'Bot marked running');
      return true;
    }

    if (!containerStatus.running && bot.status === 'running') {
      // Container stopped or exited
      const newStatus = containerStatus.exitCode !== 0 ? 'error' : 'stopped';
      updateBot(bot.id, { status: newStatus });
      this.logger.info({ botId: bot.id, status: newStatus }, 'Bot status synced from container');
      return true;
    }

    return false;
  }

  /**
   * List UUID-named directories in a path.
   */
  private listUuidDirectories(path: string): string[] {
    try {
      const entries = readdirSync(path, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && UUID_REGEX.test(e.name))
        .map(e => e.name);
    } catch {
      return [];
    }
  }
}

export default ReconciliationService;
