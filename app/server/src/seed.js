import { getDb } from './db.js';
import { seedDatabase } from './seedData.js';
import { DEMO_CREDENTIALS } from './config.js';

const db = getDb();
const result = seedDatabase(db);

if (result.skipped) {
  console.log('Database already has users; seed skipped. Delete the SQLite file to reseed.');
} else {
  console.log(
    `Seeded ${result.users} user, ${result.plots} plots, ${result.seasons} seasons.`
  );
  console.log(`Demo login: ${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}`);
}
