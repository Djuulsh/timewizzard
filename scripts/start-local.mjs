process.env.TIMEWIZZARD_ENV_FILE = '.env.local';
process.env.NODE_ENV ||= 'development';
await import('../src/index.js');
