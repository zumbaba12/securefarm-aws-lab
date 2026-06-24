import { getDb } from './db.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { seedDatabase } from './seedData.js';

const db = getDb();

// Auto-seed an empty database so a clean checkout has demo data on first run.
const seed = seedDatabase(db);
if (!seed.skipped) {
  console.log(`Seeded demo data: ${seed.plots} plots, ${seed.seasons} seasons.`);
}

const app = createApp(db);
app.listen(config.port, config.host, () => {
  console.log(`SecureFarm API listening on http://${config.host}:${config.port}`);
  if (config.isDev) {
    console.log('Mode: development (demo credentials and verbose errors enabled).');
  }
});
