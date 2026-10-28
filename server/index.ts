import { createApp } from './app';
import { loadConfig } from './config';
import { connect } from './db';

// Entry point: npm start (or npm run server for development).
const config = loadConfig();
const { client, db } = await connect(config.mongoUri, config.dbName);
const server = createApp(db, config).listen(config.port, () => {
  console.log(`الخادم يعمل على http://localhost:${config.port}`);
});

const stop = (): void => {
  server.close(() => void client.close().finally(() => process.exit(0)));
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
