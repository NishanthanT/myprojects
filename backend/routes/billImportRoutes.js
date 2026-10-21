import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { ensureBillTable, saveImport } from '../services/billImportService.js';

const router = express.Router();
router.use(verifyToken, isAdmin);
router.get('/status', (req, res) => res.json({ success: true, ocr_ready: true, ocr_provider: 'local-tesseract', paid_api_required: false }));
let ready;
const ensure = () => ready ||= ensureBillTable(pool).catch(error => { ready = null; throw error; });
// Old clients cannot accidentally send a bill to a paid provider.
router.post('/extract', (req, res) => res.status(410).json({ success: false, message: 'Bill reading is now free and runs in your browser. Refresh the page to use the local reader.' }));
router.get('/', async (req, res) => {
  try {
    await ensure();
    const [imports] = await pool.query('SELECT id, bill_number, supplier_name, bill_date, total, created_at FROM bill_imports ORDER BY id DESC LIMIT 50');
    res.json({ success: true, imports });
  } catch { res.status(500).json({ success: false, message: 'Unable to load bill import history.' }); }
});
router.get('/:id', async (req, res) => {
  try {
    await ensure();
    const [rows] = await pool.execute('SELECT * FROM bill_imports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Bill not found.' });
    res.json({ success: true, bill: { ...rows[0], review: JSON.parse(rows[0].review_json) } });
  } catch { res.status(500).json({ success: false, message: 'Unable to load saved bill.' }); }
});
router.post('/', async (req, res) => {
  try {
    await ensure();
    const result = await saveImport(pool, req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    // Concurrent retries can collide with the unique request key after the first request commits.
    if (error.code === 'ER_DUP_ENTRY') {
      try {
        const [previous] = await pool.execute('SELECT id FROM bill_imports WHERE request_key = ?', [String(req.body.request_key || '')]);
        if (previous.length) return res.json({ success: true, id: previous[0].id, already_saved: true });
      } catch { /* Report the duplicate without changing stock. */ }
      return res.status(409).json({ success: false, message: 'This bill photo, supplier invoice or product code already exists. Nothing was added.' });
    }
    res.status(400).json({ success: false, message: error.code ? 'Bill could not be saved. Check product codes, selections and database availability. Nothing was added.' : error.message });
  }
});
export default router;
