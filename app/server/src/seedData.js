import { DEMO_CREDENTIALS } from './config.js';

// Fake, lab-only seed data. No real names, emails, or secrets.
export function seedDatabase(db) {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return { skipped: true };

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  );
  const farmerId = insertUser.run(
    'Demo Farmer',
    DEMO_CREDENTIALS.email,
    DEMO_CREDENTIALS.password
  ).lastInsertRowid;

  const insertPlot = db.prepare(
    `INSERT INTO plots (user_id, name, location, size_hectares, crop_type, status, notes)
     VALUES (@user_id, @name, @location, @size_hectares, @crop_type, @status, @notes)`
  );
  const insertSeason = db.prepare(
    `INSERT INTO seasons (plot_id, season_name, crop_type, variety, start_date, expected_harvest_date, status, notes)
     VALUES (@plot_id, @season_name, @crop_type, @variety, @start_date, @expected_harvest_date, @status, @notes)`
  );

  const plots = [
    {
      user_id: farmerId,
      name: 'North Field',
      location: 'Sector A, Ridge Road',
      size_hectares: 12.5,
      crop_type: 'Maize',
      status: 'active',
      notes: 'Loamy soil. Drip irrigation installed last season.',
    },
    {
      user_id: farmerId,
      name: 'River Paddock',
      location: 'Sector C, Lower Bend',
      size_hectares: 8.0,
      crop_type: 'Soybean',
      status: 'active',
      notes: 'Prone to flooding after heavy rain.',
    },
    {
      user_id: farmerId,
      name: 'Hilltop Block',
      location: 'Sector B, Upper Terrace',
      size_hectares: 4.25,
      crop_type: 'Wheat',
      status: 'fallow',
      notes: 'Resting this cycle to restore nitrogen.',
    },
  ];

  const plotIds = plots.map((p) => insertPlot.run(p).lastInsertRowid);

  const seasons = [
    {
      plot_id: plotIds[0],
      season_name: 'Season 2026-A',
      crop_type: 'Maize',
      variety: 'SC-627',
      start_date: '2026-03-01',
      expected_harvest_date: '2026-08-15',
      status: 'active',
      notes: 'Germination strong across most rows.',
    },
    {
      plot_id: plotIds[0],
      season_name: 'Season 2025-B',
      crop_type: 'Maize',
      variety: 'SC-627',
      start_date: '2025-03-05',
      expected_harvest_date: '2025-08-20',
      status: 'completed',
      notes: 'Yield 6.1 t/ha.',
    },
    {
      plot_id: plotIds[1],
      season_name: 'Season 2026-A',
      crop_type: 'Soybean',
      variety: 'Glycine TGx',
      start_date: '2026-04-10',
      expected_harvest_date: '2026-09-01',
      status: 'active',
      notes: 'Watch for waterlogging near the bend.',
    },
  ];

  for (const s of seasons) insertSeason.run(s);

  return { skipped: false, users: 1, plots: plots.length, seasons: seasons.length };
}
