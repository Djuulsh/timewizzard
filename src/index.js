import { createServer } from 'node:http';
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from 'discord.js';
import { commandJson } from './commands.js';
import { config } from './config.js';
import { VERSION } from './constants.js';
import { handleInteraction } from './interactions.js';
import { Storage } from './storage.js';

const storage = new Storage(config.dataDir);
await storage.init();

let botReady = false;
let botTag = null;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      version: VERSION,
      botReady,
      botTag,
      guildId: config.guildId
    }));
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Timewizzard Info Bot ${VERSION} is running.\nHealth: /health\n`);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Unknown route');
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`HTTP health server listening on 0.0.0.0:${config.port}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
  botReady = true;
  botTag = readyClient.user.tag;
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commandJson }
    );
    console.log(`Registered ${commandJson.length} guild commands for ${config.guildId}`);
  } catch (error) {
    console.error('Could not register guild commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handleInteraction(interaction, { client, storage, config });
});

client.on(Events.Error, (error) => console.error('Discord client error:', error));
client.on(Events.Warn, (warning) => console.warn('Discord warning:', warning));

await client.login(config.token);

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  botReady = false;
  client.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
