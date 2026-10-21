import { createHash } from 'node:crypto';
import { calculateBill } from '../../frontend/src/utils/billImport.mjs';

export const imagePattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export function validateSource(source) {
  if (typeof source !== 'string' || source.length > 12000000 || !imagePattern.test(source)) throw new Error('Upload a JPG, PNG or WebP bill photo (maximum 8 MB).');
  return createHash('sha256').update(Buffer.from(source.split(',')[1], 'base64')).digest('hex');
}
export async function ensureBillTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS bill_imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_key VARCHAR(80) NOT NULL UNIQUE,
    source_hash CHAR(64) NOT NULL UNIQUE,
    invoice_key CHAR(64) NOT NULL UNIQUE,
    bill_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    bill_date DATE NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    source_image LONGTEXT NOT NULL,
    review_json LONGTEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
}
const text = (value, max, label, required = false) => {
  const s = typeof value === 'string' ? value.trim() : '';
  if ((required && !s) || s.length > max) throw new Error(`${label}: ${required ? 'required, ' : ''}maximum ${max} characters.`);
  return s;
};
const id = value => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid selected record.');
  return n;
};
export function validateImport(payload) {
  if (payload.confirmed !== true) throw new Error('Review and confirm this bill before saving.');
  const sourceHash = validateSource(payload.source);
  const bill = payload.bill || {}, rows = payload.rows;
  const totals = calculateBill(bill, rows);
  const billNumber = text(bill.number, 100, 'Bill number', true);
  const supplier = text(bill.supplier_name, 150, 'Supplier name', true);
  const requestKey = text(payload.request_key, 80, 'Import reference', true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bill.date) || Number.isNaN(Date.parse(bill.date)) || new Date(bill.date).toISOString().slice(0, 10) !== bill.date) throw new Error('Enter a valid bill date.');
  if (bill.expected_total === '' || bill.expected_total == null || !Number.isFinite(Number(bill.expected_total)) || Math.abs(Number(bill.expected_total) - totals.total) > 0.011) throw new Error('Bill total does not match. Correct prices, discounts, transport and tax before saving.');
  const seen = new Set();
  const cleanRows = rows.map((r, i) => {
    const productId = id(r.product_id);
    const code = text(r.product_code, 50, 'Product code', true);
    const key = productId ? `id:${productId}` : `code:${code.toLowerCase()}`;
    if (seen.has(key)) throw new Error('Combine duplicate product rows before saving.');
    seen.add(key);
    const selling = Number(r.selling_price), low = Number(r.low_stock_limit);
    if (r.selling_price === '' || !Number.isFinite(selling) || selling < 0 || selling > 99999999 || !Number.isFinite(low) || low < 0 || low > 9999999) throw new Error(`Row ${i + 1}: invalid selling price or low-stock limit.`);
    if (!['Piece', 'Litre', 'Millilitre', 'Kg', 'Gram'].includes(r.unit_type) || !['active', 'inactive'].includes(r.status)) throw new Error('Invalid product unit or status.');
    if (!Array.isArray(r.images) || r.images.length > 8 || r.images.some(v => typeof v !== 'string' || v.length > 2000000 || !imagePattern.test(v))) throw new Error('Use up to 8 JPG/PNG/WebP product photos, each under 1.5 MB.');
    if (!Array.isArray(r.vehicle_model_ids) || r.vehicle_model_ids.length > 100) throw new Error('Invalid vehicle models.');
    return { ...r, product_id: productId, product_code: code,
      product_name: text(r.product_name, 200, 'Product name', true), brand: text(r.brand, 100, 'Brand', true),
      barcode: text(r.barcode, 100, 'Barcode') || null, part_group: text(r.part_group, 100, 'Part group').toUpperCase() || null,
      category_id: id(r.category_id), supplier_id: id(r.supplier_id), vehicle_type_id: id(r.vehicle_type_id),
      vehicle_model_ids: [...new Set(r.vehicle_model_ids.map(id))], selling_price: selling, low_stock_limit: low,
      calculation: totals.lines[i] };
  });
  const invoiceKey = createHash('sha256').update(`${supplier.toLowerCase()}|${billNumber.toLowerCase()}|${bill.date}`).digest('hex');
  return { sourceHash, invoiceKey, requestKey, billNumber, supplier, totals, cleanRows };
}
export async function saveImport(pool, payload, userId) {
  const data = validateImport(payload);
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [previous] = await c.execute('SELECT id FROM bill_imports WHERE request_key = ?', [data.requestKey]);
    if (previous.length) { await c.rollback(); return { id: previous[0].id, already_saved: true }; }
    const [receipt] = await c.execute(`INSERT INTO bill_imports
      (request_key, source_hash, invoice_key, bill_number, supplier_name, bill_date, total, source_image, review_json, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.requestKey, data.sourceHash, data.invoiceKey, data.billNumber, data.supplier, payload.bill.date, data.totals.total,
      payload.source, JSON.stringify({ bill: payload.bill, rows: data.cleanRows, totals: data.totals }), userId]);
    for (const r of data.cleanRows) {
      let productId = r.product_id;
      if (productId) {
        const [existing] = await c.execute('SELECT id, unit_type FROM products WHERE id = ? FOR UPDATE', [productId]);
        if (!existing.length) throw new Error('A matched product was deleted. Select it again.');
        if (existing[0].unit_type !== r.unit_type) throw new Error('Existing product unit cannot change during stock import. Select its original unit.');
      }
      const [duplicates] = await c.execute('SELECT id FROM products WHERE (product_code = ? OR (? IS NOT NULL AND barcode = ?)) AND id <> ? LIMIT 1', [r.product_code, r.barcode, r.barcode, productId || 0]);
      if (duplicates.length) throw new Error(`Code/barcode already belongs to another product: ${r.product_code}. Match the existing product.`);
      for (const model of r.vehicle_model_ids) {
        const [valid] = await c.execute('SELECT id FROM vehicle_models WHERE id = ? AND vehicle_type_id = ?', [model, r.vehicle_type_id]);
        if (!valid.length) throw new Error('Vehicle model does not belong to the selected vehicle type.');
      }
      const values = [r.product_name, r.product_code, r.barcode, r.category_id, r.brand, r.part_group, r.unit_type,
        r.calculation.unitCost, r.selling_price, r.calculation.units, r.low_stock_limit, r.supplier_id, null, r.status, r.vehicle_type_id];
      if (productId) {
        await c.execute(`UPDATE products SET product_name=?, product_code=?, barcode=?, category_id=?, brand=?, part_group=?,
          unit_type=?, buying_price=?, selling_price=?, stock_qty=stock_qty+?, low_stock_limit=?, supplier_id=?, image=?, status=?, vehicle_type_id=? WHERE id=?`, [...values, productId]);
      } else {
        const [created] = await c.execute(`INSERT INTO products (product_name,product_code,barcode,category_id,brand,part_group,
          unit_type,buying_price,selling_price,stock_qty,low_stock_limit,supplier_id,image,status,vehicle_type_id)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, values);
        productId = created.insertId;
      }
      await c.execute('DELETE FROM product_vehicle_models WHERE product_id = ?', [productId]);
      for (const model of r.vehicle_model_ids) await c.execute('INSERT INTO product_vehicle_models (product_id, model_id) VALUES (?, ?)', [productId, model]);
      await c.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);
      for (let n = 0; n < r.images.length; n++) await c.execute('INSERT INTO product_images (product_id, image_data, sort_order) VALUES (?, ?, ?)', [productId, r.images[n], n]);
      await c.execute(`INSERT INTO stock_history (product_id, type, quantity, note, created_by) VALUES (?, 'addition', ?, ?, ?)`,
        [productId, r.calculation.units, `Bill import #${receipt.insertId}: ${data.billNumber}; unit cost Rs.${r.calculation.unitCost}`, userId]);
    }
    await c.commit();
    return { id: receipt.insertId, total: data.totals.total };
  } catch (error) { await c.rollback(); throw error; }
  finally { c.release(); }
}
