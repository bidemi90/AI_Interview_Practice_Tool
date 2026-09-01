import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/environment.js';

let server;

async function startServer() {
  await connectDatabase();
  server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

async function shutDown(signal) {
  console.log(`${signal} received. Shutting down.`);
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutDown('SIGINT'));
process.on('SIGTERM', () => void shutDown('SIGTERM'));

startServer().catch((error) => {
  console.error('Unable to start API:', error.message);
  process.exit(1);
});

