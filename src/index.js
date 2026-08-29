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
import { installDestinationSupport } from './destinationSupport.js';
import { installV13Support } from './v13Support.js';
import { installV158Support } from './v158Support.js';
import { installNativeV13Support } from './nativeV13Support.js';
import { installNativeV14Support } from './nativeV14Support.js';
import { JsonStore } from './storage.js';
import { createWebServer } from './web/serverV15.js';

installDestinationSupport(BotController);
installV13Support(BotController);
installNativeV13Support(BotController);
installNativeV14Support(BotController);
installV158Support(BotController);

const VERSION = '1.5.12';
const store = new JsonStore(path.join(config.dataDir, 'store.json'));
await store.init();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const controller = new BotController({ client, store, config });

const statusCommand = {
  name: 'status',
  description: 'Vis bot- og Web Builder-status',
  type: 1,
  default_member_permissions: '32'
};

async function registerGuildCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const body = [...commands.map((command) => command.toJSON()), statusCommand];
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body }
  );
  return body.length;
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  try {
    const commandCount = await registerGuildCommands();
    console.log(`Registered ${commandCount} guild commands for ${config.guildId}`);
  } catch (error) {
    console.error('Could not register guild commands:', error);
  }

  console.log(config.webEnabled
    ? `Web Builder v${VERSION} enabled. Login: ${config.publicBaseUrl}/auth/discord | Builder: ${config.publicBaseUrl}/builder`
    : 'Web Builder disabled: set DISCORD_CLIENT_SECRET and PUBLIC_BASE_URL to enable it.');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'status') {
    await interaction.reply({
      content: [
        '**Timewizzard Info Bot**',
        `Version: ${VERSION}`,
        `Bot: ${client.user?.tag ?? 'starter...'}`,
        `Guild: ${config.guildId}`,
        `Web Builder: ${config.webEnabled ? '✅ enabled' : '❌ disabled'}`,
        config.webEnabled ? `Builder: ${config.publicBaseUrl}/builder` : null,
        `Storage: ${path.join(config.dataDir, 'store.json')}`
      ].filter(Boolean).join('\n'),
      ephemeral: true
    });
    return;
  }

  await controller.handle(interaction);
});

client.on(Events.Error, (error) => console.error('Discord client error:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));

const webServer = createWebServer({ client, store, config });
webServer.listen(config.port, '0.0.0.0', () => {
  console.log(`HTTP/Web Builder server listening on 0.0.0.0:${config.port}`);
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
