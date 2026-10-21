export const money = value => {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' ||
      !/^\d+(\.\d{1,2})?$/.test(String(value)) || Number(value) > 999999999.99) {
    throw new Error('Enter a valid amount with at most two decimal places.');
  }
  return Math.round(Number(value) * 100);
};
export function validateEntry(body) {
  if (!['purchase', 'payment'].includes(body.kind)) throw new Error('Invalid entry type.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || Number.isNaN(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0, 10) !== body.date) throw new Error('Enter a valid date.');
  let reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (body.kind === 'purchase' && (!reference || reference.length > 100)) throw new Error('Enter a bill number (maximum 100 characters).');
  if (typeof body.request_key !== 'string' || !/^[\w-]{8,80}$/.test(body.request_key)) throw new Error('Invalid save reference.');
  const bill_numbers = typeof body.bill_numbers === 'string' ? body.bill_numbers.trim() : '';
  if (bill_numbers.length > 100) throw new Error('Bill numbers can contain up to 100 characters.');
  if (body.kind === 'payment') reference = `payment-${body.request_key}`;
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > 1000) throw new Error('Note is too long.');
  const photos = body.photos || [];
  if (!Array.isArray(photos) || photos.length > 4 || photos.some(p => typeof p !== 'string' || p.length > 2700000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))) throw new Error('Use up to four JPG/PNG/WebP photos, each under 2 MB.');
  let cents = money(body.amount);
  if (cents <= 0) throw new Error('Amount must be greater than zero.');
  let items = [];
  if (body.kind === 'purchase' && Array.isArray(body.items) && body.items.length) {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 200) throw new Error('Add at least one purchased product (maximum 200).');
    items = body.items.map(item => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const quantity = Number(item.quantity);
      if (!name || name.length > 200 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 || !/^\d+(\.\d{1,3})?$/.test(String(item.quantity))) throw new Error('Each product needs a name and positive quantity (up to three decimals).');
      const unitCents = money(item.unit_price);
      return { name, quantity, unit_price: unitCents / 100, total: Math.round(quantity * unitCents) / 100 };
    });
    if (items.reduce((sum, item) => sum + Math.round(item.total * 100), 0) !== cents) throw new Error('Purchase total must match the product line totals.');
  }
  return { kind: body.kind, date: body.date, reference, bill_numbers, note, photos, items, amount: cents / 100, request_key: body.request_key };
}
export async function ensureSupplierAccount(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS supplier_account_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    kind ENUM('purchase','payment') NOT NULL,
    entry_date DATE NOT NULL,
    reference VARCHAR(100) NOT NULL,
    bill_numbers VARCHAR(100) NULL,
    amount DECIMAL(14,2) NOT NULL,
    items_json LONGTEXT NOT NULL,
    photos_json LONGTEXT NOT NULL,
    note TEXT NULL,
    request_key VARCHAR(80) NOT NULL UNIQUE,
    bill_import_id INT NULL UNIQUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX supplier_account_date (supplier_id, entry_date),
    UNIQUE KEY supplier_entry_reference (supplier_id,kind,reference),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB`);
  const [columns] = await pool.query("SHOW COLUMNS FROM supplier_account_entries LIKE 'bill_numbers'");
  if (!columns.length) {
    try { await pool.query('ALTER TABLE supplier_account_entries ADD COLUMN bill_numbers VARCHAR(100) NULL'); }
    catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
  }
}
