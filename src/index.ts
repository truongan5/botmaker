/**
 * BotMaker Entry Point
 *
 * Web UI for creating and managing OpenClaw bots.
 */

import { buildServer } from './server.js';
import { getConfig } from './config.js';
import { closeDb } from './db/index.js';

async function main(): Promise<void> {
  const config = getConfig();

  console.log('Starting BotMaker...');
  console.log(`  Port: ${config.port}`);
  console.log(`  Data directory: ${config.dataDir}`);
  console.log(`  Secrets directory: ${config.secretsDir}`);
  console.log(`  OpenClaw image: ${config.openclawImage}`);

  const server = await buildServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await server.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`\nBotMaker running at http://${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
