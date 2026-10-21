import express from 'express';
import pool from '../config/db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { ensureSupplierAccount, validateEntry } from '../services/supplierAccount.js';
import { ensureBillTable } from '../services/billImportService.js';

const router = express.Router({ mergeParams: true });
router.use(verifyToken, isAdmin);
router.use(async (req, res, next) => {
  try {
    if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid supplier.' });
    await ensureSupplierAccount(pool);
    const [rows] = await pool.execute('SELECT id FROM suppliers WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    next();
  } catch (error) { next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    const [entries] = await pool.execute(`SELECT id, kind, DATE_FORMAT(entry_date,'%Y-%m-%d') AS date,
      CASE WHEN kind='payment' THEN COALESCE(bill_numbers, reference) ELSE reference END AS reference,
      amount, items_json, note, bill_import_id, created_at FROM supplier_account_entries
      WHERE supplier_id=? ORDER BY entry_date DESC,id DESC`, [req.params.id]);
    const [products] = await pool.execute('SELECT id,product_name,product_code,stock_qty,buying_price FROM products WHERE supplier_id=? ORDER BY product_name', [req.params.id]);
    const purchases = entries.filter(e => e.kind === 'purchase').reduce((s, e) => s + Math.round(Number(e.amount) * 100), 0);
    const payments = entries.filter(e => e.kind === 'payment').reduce((s, e) => s + Math.round(Number(e.amount) * 100), 0);
    res.json({ success: true, entries: entries.map(e => ({ ...e, items: JSON.parse(e.items_json), items_json: undefined })), products,
      totals: { purchases: purchases / 100, payments: payments / 100, balance: (purchases - payments) / 100 } });
  } catch (error) { next(error); }
});
router.get('/imports', async (req, res, next) => {
  try {
    await ensureBillTable(pool);
    const [bills] = await pool.query(`SELECT id,bill_number,supplier_name,DATE_FORMAT(bill_date,'%Y-%m-%d') AS date,total FROM bill_imports
      WHERE id NOT IN (SELECT bill_import_id FROM supplier_account_entries WHERE bill_import_id IS NOT NULL) ORDER BY id DESC LIMIT 100`);
    res.json({ success: true, bills });
  } catch (error) { next(error); }
});
router.get('/:entryId/photos', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT photos_json FROM supplier_account_entries WHERE id=? AND supplier_id=?', [req.params.entryId, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Entry not found.' });
    res.json({ success: true, photos: JSON.parse(rows[0].photos_json) });
  } catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  let entry;
  try { entry = validateEntry(req.body); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  try {
    await pool.execute(`INSERT INTO supplier_account_entries
      (supplier_id,kind,entry_date,reference,amount,items_json,photos_json,note,request_key,created_by,bill_numbers)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [req.params.id, entry.kind, entry.date, entry.reference, entry.amount,
      JSON.stringify(entry.items), JSON.stringify(entry.photos), entry.note, entry.request_key, req.user.id, entry.bill_numbers]);
    res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'This entry or reference was already saved. Refresh the account before adding another.' });
    next(error);
  }
});
router.post('/imports/:billId', async (req, res, next) => {
  try {
    await ensureBillTable(pool);
    const [rows] = await pool.execute('SELECT * FROM bill_imports WHERE id=?', [req.params.billId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Bill not found.' });
    const bill = rows[0], review = JSON.parse(bill.review_json);
    const items = review.rows.map(r => ({ name: r.product_name, quantity: r.calculation.units, unit_price: r.calculation.unitCost, total: r.calculation.units * r.calculation.unitCost }));
    await pool.execute(`INSERT INTO supplier_account_entries
      (supplier_id,kind,entry_date,reference,amount,items_json,photos_json,note,request_key,bill_import_id,created_by)
      VALUES (?,'purchase',?,?,?,?,?,?,?,?,?)`, [req.params.id, bill.bill_date, bill.bill_number, bill.total,
      JSON.stringify(items), JSON.stringify([bill.source_image]), 'Linked imported bill; total includes bill discounts, tax and transport.',
      `import-${bill.id}`, bill.id, req.user.id]);
    res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'This bill is already linked to a supplier account.' });
    next(error);
  }
});
router.use((error, req, res, next) => {
  console.error('Supplier account error:', error);
  res.status(500).json({ success: false, message: 'Could not load or save the supplier account.' });
});
export default router;
