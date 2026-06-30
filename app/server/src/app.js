import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config, DEMO_CREDENTIALS } from './config.js';
import { createSession, destroySession, requireAuth } from './auth.js';
import { isAllowed, buildKey, s3Storage } from './uploads.js';

// Build an Express app bound to a given database handle.
// Kept as a factory so tests can inject an in-memory database and a stub S3
// storage backend (so automated tests never need real AWS credentials).
export function createApp(db, { storage = s3Storage } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const auth = requireAuth(db);

  // Files are buffered in memory (small max size) and streamed to S3; nothing
  // is written to local disk. Size and type are enforced here, before upload.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxBytes, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!isAllowed(file.mimetype, file.originalname)) {
        const err = new Error('Unsupported file type.');
        err.code = 'UNSUPPORTED_TYPE';
        return cb(err);
      }
      cb(null, true);
    },
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, mode: config.isDev ? 'development' : 'production' });
  });

  // Expose demo credentials to the UI in dev mode only.
  app.get('/api/demo-credentials', (req, res) => {
    if (!config.isDev) return res.json({ available: false });
    res.json({ available: true, ...DEMO_CREDENTIALS });
  });

  // --- Login ---------------------------------------------------------------
  // LAB_VULNERABILITY (weak-auth):
  //   1. No rate limiting / lockout, so brute force is unbounded.
  //   2. Verbose failure messages distinguish "unknown email" from "wrong
  //      password", enabling account enumeration.
  //   3. Passwords are compared in plaintext (see db.js / seedData.js).
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: `No account found for ${email}.` });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password for this account.' });
    }
    const token = createSession(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  app.post('/api/logout', auth, (req, res) => {
    const header = req.get('authorization') || '';
    if (header.startsWith('Bearer ')) destroySession(header.slice(7));
    res.json({ ok: true });
  });

  app.get('/api/me', auth, (req, res) => {
    res.json({ user: req.user });
  });

  // --- Dashboard -----------------------------------------------------------
  app.get('/api/dashboard', auth, (req, res) => {
    const plotCount = db
      .prepare('SELECT COUNT(*) AS n FROM plots WHERE user_id = ?')
      .get(req.user.id).n;
    const activeSeasonCount = db
      .prepare(
        `SELECT COUNT(*) AS n FROM seasons s
         JOIN plots p ON p.id = s.plot_id
         WHERE p.user_id = ? AND s.status = 'active'`
      )
      .get(req.user.id).n;
    const recentPlots = db
      .prepare(
        `SELECT id, name, location, crop_type, status, updated_at
         FROM plots WHERE user_id = ?
         ORDER BY updated_at DESC LIMIT 5`
      )
      .all(req.user.id);
    res.json({ plotCount, activeSeasonCount, recentPlots });
  });

  // --- Plots ---------------------------------------------------------------
  // LAB_VULNERABILITY (sql-injection):
  //   The `search` parameter is concatenated directly into the SQL string
  //   instead of being passed as a bound parameter. A value such as
  //   `' OR '1'='1` alters the query's logic.
  app.get('/api/plots', auth, (req, res) => {
    const search = req.query.search || '';
    try {
      let rows;
      if (search) {
        const sql = `SELECT * FROM plots
                     WHERE user_id = ${req.user.id}
                       AND (name LIKE '%${search}%' OR location LIKE '%${search}%' OR crop_type LIKE '%${search}%')
                     ORDER BY updated_at DESC`;
        rows = db.prepare(sql).all();
      } else {
        rows = db
          .prepare('SELECT * FROM plots WHERE user_id = ? ORDER BY updated_at DESC')
          .all(req.user.id);
      }
      res.json({ plots: rows });
    } catch (err) {
      // LAB_VULNERABILITY: verbose error leaks the raw SQL / driver message.
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/plots', auth, (req, res) => {
    const { name, location, size_hectares, crop_type, status, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Plot name is required.' });
    const info = db
      .prepare(
        `INSERT INTO plots (user_id, name, location, size_hectares, crop_type, status, notes)
         VALUES (@user_id, @name, @location, @size_hectares, @crop_type, @status, @notes)`
      )
      .run({
        user_id: req.user.id,
        name,
        location: location || null,
        size_hectares: size_hectares != null && size_hectares !== '' ? Number(size_hectares) : null,
        crop_type: crop_type || null,
        status: status || 'active',
        // Notes are stored verbatim; rendering is where the stored-XSS lives.
        notes: notes || null,
      });
    const plot = db.prepare('SELECT * FROM plots WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ plot });
  });

  app.get('/api/plots/:id', auth, (req, res) => {
    const plot = db
      .prepare('SELECT * FROM plots WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found.' });
    const seasons = db
      .prepare('SELECT * FROM seasons WHERE plot_id = ? ORDER BY start_date DESC')
      .all(plot.id);
    res.json({ plot, seasons });
  });

  // --- Seasons -------------------------------------------------------------
  app.post('/api/plots/:id/seasons', auth, (req, res) => {
    const plot = db
      .prepare('SELECT id FROM plots WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found.' });

    const {
      season_name,
      crop_type,
      variety,
      start_date,
      expected_harvest_date,
      status,
      notes,
    } = req.body || {};
    if (!season_name) return res.status(400).json({ error: 'Season name is required.' });

    const info = db
      .prepare(
        `INSERT INTO seasons (plot_id, season_name, crop_type, variety, start_date, expected_harvest_date, status, notes)
         VALUES (@plot_id, @season_name, @crop_type, @variety, @start_date, @expected_harvest_date, @status, @notes)`
      )
      .run({
        plot_id: plot.id,
        season_name,
        crop_type: crop_type || null,
        variety: variety || null,
        start_date: start_date || null,
        expected_harvest_date: expected_harvest_date || null,
        status: status || 'active',
        notes: notes || null,
      });
    // Bump plot freshness so it surfaces on the dashboard.
    db.prepare("UPDATE plots SET updated_at = datetime('now') WHERE id = ?").run(plot.id);
    const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ season });
  });

  // --- Plot uploads (S3) ---------------------------------------------------
  // Not an intentional lab vulnerability: auth is required on every route,
  // owners can only touch their own plots, S3 keys are generated server-side,
  // file type/size are restricted, and only metadata is ever returned.
  const ownedPlotOr404 = (req, res) =>
    db.prepare('SELECT id FROM plots WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

  app.get('/api/plots/:id/uploads', auth, (req, res) => {
    const plot = ownedPlotOr404(req, res);
    if (!plot) return res.status(404).json({ error: 'Plot not found.' });
    const uploads = db
      .prepare(
        `SELECT id, plot_id, original_name, s3_bucket, s3_key, content_type, size_bytes, created_at
         FROM plot_uploads WHERE plot_id = ? ORDER BY created_at DESC, id DESC`
      )
      .all(plot.id);
    res.json({ uploads });
  });

  app.post(
    '/api/plots/:id/uploads',
    auth,
    // Verify ownership before accepting the upload body.
    (req, res, next) => {
      const plot = ownedPlotOr404(req, res);
      if (!plot) return res.status(404).json({ error: 'Plot not found.' });
      req.plot = plot;
      next();
    },
    (req, res) => {
      upload.single('file')(req, res, async (err) => {
        // Generic user-facing errors; details are logged server-side only.
        if (err) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File is too large.' });
          }
          if (err.code === 'UNSUPPORTED_TYPE') {
            return res.status(415).json({ error: 'File type not allowed.' });
          }
          console.error('[upload] parse error:', err.message);
          return res.status(400).json({ error: 'Upload failed.' });
        }
        if (!req.file) return res.status(400).json({ error: 'A file is required.' });

        const { originalname, mimetype, size, buffer } = req.file;
        const bucket = config.upload.bucket;
        const key = buildKey(req.user.id, req.plot.id, originalname);

        try {
          await storage.put({ bucket, key, body: buffer, contentType: mimetype });
        } catch (e) {
          // Do not leak AWS SDK internals or credentials to the client.
          console.error('[upload] S3 put failed:', e.message);
          return res.status(502).json({ error: 'Upload failed. Please try again.' });
        }

        // Persist metadata only after the object is safely in S3. If this step
        // fails the object is already stored, so attempt to remove it to avoid
        // an orphaned S3 object that the app can no longer list or delete.
        let row;
        try {
          const info = db
            .prepare(
              `INSERT INTO plot_uploads (plot_id, user_id, original_name, s3_bucket, s3_key, content_type, size_bytes)
               VALUES (@plot_id, @user_id, @original_name, @s3_bucket, @s3_key, @content_type, @size_bytes)`
            )
            .run({
              plot_id: req.plot.id,
              user_id: req.user.id,
              original_name: originalname,
              s3_bucket: bucket,
              s3_key: key,
              content_type: mimetype,
              size_bytes: size,
            });
          row = db.prepare('SELECT * FROM plot_uploads WHERE id = ?').get(info.lastInsertRowid);
        } catch (e) {
          console.error('[upload] metadata persistence failed:', e.message);
          try {
            await storage.remove({ bucket, key });
          } catch (cleanupErr) {
            console.error('[upload] orphaned object cleanup failed:', cleanupErr.message);
          }
          return res.status(500).json({ error: 'Upload failed. Please try again.' });
        }
        res.status(201).json({ upload: row });
      });
    }
  );

  app.delete('/api/plots/:id/uploads/:uploadId', auth, async (req, res) => {
    const plot = ownedPlotOr404(req, res);
    if (!plot) return res.status(404).json({ error: 'Plot not found.' });
    const row = db
      .prepare('SELECT * FROM plot_uploads WHERE id = ? AND plot_id = ? AND user_id = ?')
      .get(req.params.uploadId, plot.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Upload not found.' });

    try {
      await storage.remove({ bucket: row.s3_bucket, key: row.s3_key });
    } catch (e) {
      console.error('[upload] S3 delete failed:', e.message);
      return res.status(502).json({ error: 'Delete failed. Please try again.' });
    }
    db.prepare('DELETE FROM plot_uploads WHERE id = ?').run(row.id);
    res.json({ ok: true });
  });

  return app;
}
