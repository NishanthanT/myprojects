// Conservative local invoice parser. OCR is text recognition, not invoice understanding.
// Keep ambiguous values blank; never silently infer prices from a line total.
const numeric = /^[-+]?\d[\d,]*(?:\.\d+)?%?$/;
const amount = value => {
  const s = String(value ?? '').trim().replace(/^(?:LKR|Rs\.?|රු\.?|ரூ\.?)\s*/i, '').replace(/,/g, '');
  return /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : '';
};
const aliases = [
  ['serial', /\bs\.?\s*n\b|\b(?:sno|serial)\b/ig],
  ['code', /\b(?:product\s*code|item\s*code|part\s*(?:no\.?|number)|sku|code)\b/ig],
  ['ean', /\b(?:ean|barcode)\b/ig],
  ['name', /\b(?:description|product\s*name|item\s*name|particulars|item|product)\b/ig],
  ['quantity', /\b(?:quantity|qty)\b/ig],
  ['price', /\b(?:unit\s*price|unit\s*cost|rate|price)\b/ig],
  ['unit', /\bunit\b/ig],
  ['bin', /\bbin\s*(?:loc|location)?\b/ig],
  ['discount', /\b(?:discount|disc|dis)\.?\s*%?/ig],
  ['total', /\b(?:line\s*total|amount|total)\b/ig]
];
function header(line) {
  const matches = aliases.flatMap(([key, regex]) => [...line.matchAll(regex)].map(m => ({ key, start: m.index, end: m.index + m[0].length })));
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const selected = [];
  for (const match of matches) if (!selected.some(s => match.start < s.end && match.end > s.start) && !selected.some(s => s.key === match.key)) selected.push(match);
  const keys = selected.map(m => m.key);
  keys.discountPercent = /\b(?:discount|disc|dis)\.?\s*%/i.test(line);
  return keys.includes('quantity') && keys.includes('price') && keys.includes('name') ? keys : null;
}
const initialRow = line => ({ product_name: '', product_code: '', barcode: '', brand: '', part_group: '', unit_type: 'Piece',
  quantity: '', pieces_per_box: 1, free_units: 0, price: '', price_basis: 'unit', discount: 0, discount_type: 'amount', notes: `OCR source: ${line}` });
function parseRow(line, columns) {
  const result = initialRow(line);
  const cells = line.split(/\s*\|\s*|\t+|\s{2,}/).map(s => s.trim());
  let fields = null;
  if (columns && cells.length === columns.length) fields = Object.fromEntries(columns.map((key, i) => [key, cells[i]]));
  // Supplier layout: S.N Code [EAN] Qty Unit Item Name [Bin] Rate Dis.% Amount.
  // Anchor on the explicit quantity + unit, not on the position of the name.
  if (!fields && columns?.includes('unit') && columns.indexOf('quantity') < columns.indexOf('name')) {
    const supplierRow = line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+(Pcs\.?|Nos\.?|Pieces?|Kg|Grams?|Litres?|Liters?|Ltr|Boxes?|Packs?)\s+(.+)$/i);
    if (supplierRow) {
      const prefix = supplierRow[1].trim().split(/\s+/);
      if (columns.includes('serial') && /^\d+$/.test(prefix[0])) prefix.shift();
      const tail = supplierRow[4].trim().split(/\s+/);
      const count = columns.includes('discount') ? 3 : 2;
      const values = tail.slice(-count);
      if (values.every(v => numeric.test(v)) && tail.length > count) {
        fields = { code: prefix.shift() || '', ean: prefix.join(''), quantity: supplierRow[2], unit: supplierRow[3], name: tail.slice(0, -count).join(' '), price: values[0], total: values[count - 1] };
        if (count === 3) fields.discount = values[1];
      }
    }
  }
  if (!fields) {
    // Read explicitly numeric columns from the right; leave numeric model numbers in the name.
    const cleaned = line.replace(/\b(?:LKR|Rs\.?)\s*/gi, '').replace(/\b(?:pcs|pieces|nos)\b/gi, '').replace(/\|/g, ' ').trim();
    const tokens = cleaned.split(/\s+/);
    const numericColumns = columns?.filter(key => ['quantity', 'price', 'discount', 'total'].includes(key)) || ['quantity', 'price', 'total'];
    const tail = tokens.slice(-numericColumns.length);
    if (tokens.length > tail.length && tail.length >= 2 && tail.every(v => numeric.test(v))) {
      fields = Object.fromEntries(numericColumns.map((key, i) => [key, tail[i]]));
      let prefix = tokens.slice(0, -tail.length);
      if (columns?.includes('code') && prefix.length > 1) fields.code = prefix.shift();
      fields.name = prefix.join(' ');
    }
  }
  if (!fields?.name || !/\p{L}/u.test(fields.name)) return null;
  result.product_name = fields.name;
  result.brand = fields.name.match(/\s[-–]\s*([A-Z][A-Z0-9&.-]{1,20})$/)?.[1] || '';
  result.product_code = fields.code || '';
  result.barcode = (fields.ean || '').replace(/\s+/g, '');
  result.quantity = amount(fields.quantity);
  result.price = amount(fields.price);
  if (fields.discount !== undefined) {
    result.discount_type = columns?.discountPercent || String(fields.discount).includes('%') ? 'percent' : 'amount';
    result.discount = amount(String(fields.discount).replace('%', ''));
  }
  const total = fields.total === undefined ? '' : amount(fields.total);
  if (result.quantity !== '' && result.price !== '' && total !== '') {
    const gross = result.quantity * result.price;
    const deduction = result.discount_type === 'percent' ? gross * result.discount / 100 : Number(result.discount);
    if (result.discount === '' || Math.abs(gross - deduction - total) > 0.05) {
      result.notes += ' | Quantity × price minus discount does not match the printed amount. Verify all numbers.';
      result.price = ''; // Never substitute a total for a unit price.
    }
  } else result.notes += ' | No complete line-total check; verify quantity, unit price and discount.';
  const stockUnit = String(fields.unit || '').toLowerCase().replace(/\./g, '');
  const units = { pcs: 'Piece', nos: 'Piece', piece: 'Piece', pieces: 'Piece', kg: 'Kg', gram: 'Gram', grams: 'Gram', litre: 'Litre', litres: 'Litre', liter: 'Litre', liters: 'Litre', ltr: 'Litre' };
  if (units[stockUnit]) result.unit_type = units[stockUnit];
  if (/^(?:box|boxes|carton|pack)s?$/i.test(stockUnit) || (!stockUnit && /\b(?:box|boxes|carton|pack)\b/i.test(line.replace(/\b(?:w\s*\/\s*o|without)\s+box\b/ig, '')))) {
    result.pieces_per_box = '';
    result.price_basis = 'box';
    result.notes += ' | Box/pack detected: enter units per box and confirm price basis.';
  }
  if (/\bfree\b/i.test(line)) {
    result.free_units = '';
    result.notes += ' | Free units detected: enter the individual free-unit quantity.';
  }
  return result;
}
export function parseBillText(text, columnOrder = 'auto') {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('Bill text must be under 100,000 characters.');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('No readable text found. Use a clearer photo or type the bill text.');
  const bill = { number: '', date: '', supplier_name: '', discount: 0, discount_type: 'amount', transport: 0, tax: 0, expected_total: '' };
  const rows = [], unparsed = [];
  const warnings = ['Free OCR can misread names, quantities and numbers. Check every row against the original bill; missing fields need manual entry.'];
  let columns = columnOrder === 'auto' ? null : columnOrder.split(',');
  if (columns && (!columns.includes('name') || !columns.includes('quantity') || !columns.includes('price') || columns.some(c => !['serial', 'ean', 'unit', 'bin', 'name', 'code', 'quantity', 'price', 'discount', 'total'].includes(c)))) throw new Error('Unsupported column order.');
  let inTable = false;
  for (const line of lines) {
    const detected = header(line);
    if (detected) { if (columnOrder === 'auto') columns = detected; inTable = true; continue; }
    const invoice = line.match(/\b(?:invoice|bill|s\.?\s*o\.?)\s*(?:no\.?|number|#)\s*[:#-]?\s*([\w/-]+)/i);
    if (invoice) { bill.number = invoice[1]; continue; }
    const date = line.match(/\b(?:date\s*[:.-]?\s*)?(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/) || line.match(/\bdate\s*[:.-]?\s*(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/i);
    if (date) {
      const [y, m, d] = date[1].length === 4 ? [date[1], date[2], date[3]] : [date[3], date[2], date[1]];
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      if (!Number.isNaN(Date.parse(iso)) && new Date(iso).toISOString().slice(0, 10) === iso) bill.date = iso;
      continue;
    }
    const supplier = line.match(/^(?:supplier|vendor)\s*[:=-]\s*(.+)/i);
    if (supplier) { bill.supplier_name = supplier[1]; continue; }
    if (!inTable && !bill.supplier_name && /\b(?:pvt|ltd|traders|enterprises)\b/i.test(line) && !/^(?:customer|buyer|contact)/i.test(line)) { bill.supplier_name = line; continue; }
    const charge = line.match(/^(grand\s*total|net\s*(?:total|amount)|total\s*(?:due|payable|amount)?|(?:bill\s*)?discount|transport|freight|delivery|tax|vat|other\s*charges)\s*[:=.-]?\s*(?:LKR|Rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(%)?\s*$/i);
    if (charge) {
      const label = charge[1].toLowerCase(), value = amount(charge[2]);
      if (label.includes('discount')) { bill.discount = value; bill.discount_type = charge[3] ? 'percent' : 'amount'; }
      else if (/transport|freight|delivery/.test(label)) bill.transport += value;
      else if (/tax|vat|other/.test(label)) {
        if (charge[3]) { bill.tax = ''; warnings.push(`Enter the actual tax amount in rupees: ${line}`); }
        else if (bill.tax !== '') bill.tax += value;
      } else bill.expected_total = value;
      inTable = false;
      continue;
    }
    if (/^(?:sub\s*total|tel|phone|fax|email|address|date|customer|buyer|page|thank|bank|account|balance|paid|payment|cash|change)\b/i.test(line)) continue;
    const parsed = parseRow(line, columns);
    if (parsed) { rows.push(parsed); inTable = true; }
    else if (inTable) unparsed.push(line);
  }
  if (!columns) warnings.push('Table headings were not identified. Only simple name / quantity / unit price / amount rows were recognized. Use column order or edit the text with | separators.');
  if (unparsed.length) warnings.push(`${unparsed.length} line(s) could not be mapped. Check the recognized text for missed products or continuation lines.`);
  if (!rows.length) warnings.push('No product rows could be safely mapped. Select the column order, separate cells with |, then apply the text; or add rows manually.');
  if (rows.length > 200) throw new Error('More than 200 rows found. Import a smaller bill.');
  return { bill, rows, warnings, unparsed };
}
