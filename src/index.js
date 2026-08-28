import path from 'node:path';
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from 'discord.js';
import { commands } from './commands.js';
import { config } from './config.js';
import { BotController } from './controller.js';
import { JsonStore } from './storage.js';
import { createWebServer } from './web/server.js';

const store = new JsonStore(path.join(config.dataDir, 'bot-data.json'));
await store.init();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const controller = new BotController({ client, store, config });

async function registerGuildCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands.map((command) => command.toJSON()) }
  );
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  try {
    await registerGuildCommands();
    console.log(`Registered ${commands.length} guild commands for ${config.guildId}`);
  } catch (error) {
    console.error('Could not register guild commands:', error);
  }
  console.log(config.webEnabled
    ? `Web Builder v1.2.1 enabled. Login: ${config.publicBaseUrl}/auth/discord | Builder: ${config.publicBaseUrl}/builder`
    : 'Web Builder disabled: set DISCORD_CLIENT_SECRET and PUBLIC_BASE_URL to enable it.');
});

client.on(Events.InteractionCreate, (interaction) => {
  void controller.handle(interaction);
});

client.on(Events.Error, (error) => console.error('Discord client error:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));

const webServer = createWebServer({ client, store, config });
webServer.listen(config.port, '0.0.0.0', () => {
  console.log(`HTTP/Web Builder server listening on port ${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down...`);

  await new Promise((resolve) => webServer.close(resolve));
  client.destroy();
  process.exitCode = exitCode;
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException', 1);
});

await client.login(config.token);
