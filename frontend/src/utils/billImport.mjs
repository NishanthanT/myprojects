// Shared by the review screen and server: never trust totals sent by a browser.
export const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const number = (value, label) => {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw new Error(`${label} is required.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 99999999) throw new Error(`${label} must be a valid non-negative number.`);
  return n;
};
function discount(base, value, type) {
  if (!['amount', 'percent'].includes(type)) throw new Error('Choose a valid discount type.');
  const n = number(value, 'Discount');
  if (type === 'percent' && n > 100) throw new Error('Discount cannot exceed 100%.');
  const result = money(type === 'percent' ? base * n / 100 : n);
  if (result > base) throw new Error('Discount cannot exceed the item/bill value.');
  return result;
}
// Allocate whole cents, preserving the exact bill total, including rounding remainders.
export function allocate(amount, weights) {
  const cents = Math.round(amount * 100), sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) {
    if (cents) throw new Error('Cannot allocate an amount over zero value/quantity.');
    return weights.map(() => 0);
  }
  const exact = weights.map(w => cents * w / sum), parts = exact.map(Math.floor);
  const order = exact.map((v, i) => ({ i, remainder: v - parts[i] })).sort((a, b) => b.remainder - a.remainder);
  const remaining = cents - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) parts[order[i].i]++;
  return parts.map(v => v / 100);
}
export function calculateBill(bill, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 200) throw new Error('Add between 1 and 200 product rows.');
  const lines = rows.map((r, i) => {
    const quantity = number(r.quantity, `Row ${i + 1}: quantity`);
    const pack = number(r.pieces_per_box, 'Units per box');
    const free = number(r.free_units, 'Free units');
    if (quantity <= 0 || pack < 1 || !Number.isInteger(pack)) throw new Error(`Row ${i + 1}: quantity must be positive and units per box a whole number.`);
    if (!['unit', 'box'].includes(r.price_basis)) throw new Error('Choose price per unit or box.');
    const paidUnits = quantity * pack, units = paidUnits + free;
    if (r.unit_type === 'Piece' && !Number.isInteger(units)) throw new Error(`Row ${i + 1}: pieces must be whole numbers.`);
    if (units > 9999999 || Math.abs(units * 1000 - Math.round(units * 1000)) > 0.00001) throw new Error('Stock quantity supports up to 3 decimal places.');
    const gross = money(number(r.price, 'Bill price') * (r.price_basis === 'box' ? quantity : paidUnits));
    const itemDiscount = discount(gross, r.discount, r.discount_type);
    return { units, gross, itemDiscount, net: money(gross - itemDiscount) };
  });
  const subtotal = money(lines.reduce((s, r) => s + r.net, 0));
  const billDiscount = discount(subtotal, bill.discount, bill.discount_type);
  const discounts = allocate(billDiscount, lines.map(r => r.net));
  const transport = money(number(bill.transport, 'Transport'));
  const tax = money(number(bill.tax, 'Tax / other cost'));
  if (!['quantity', 'value', 'manual'].includes(bill.transport_mode)) throw new Error('Choose a transport allocation method.');
  const netWeights = lines.map((r, i) => money(r.net - discounts[i]));
  const freight = bill.transport_mode === 'manual'
    ? rows.map(r => money(number(r.transport_share, 'Manual transport share')))
    : allocate(transport, bill.transport_mode === 'quantity' ? lines.map(r => r.units) : netWeights);
  if (money(freight.reduce((a, b) => a + b, 0)) !== transport) throw new Error('Manual transport shares must equal the transport total.');
  const taxes = allocate(tax, netWeights);
  const total = money(subtotal - billDiscount + transport + tax);
  return { subtotal, billDiscount, transport, tax, total, units: lines.reduce((s, r) => s + r.units, 0),
    lines: lines.map((r, i) => {
      const landed = money(r.net - discounts[i] + freight[i] + taxes[i]);
      return { ...r, billDiscount: discounts[i], transport: freight[i], tax: taxes[i], landed, unitCost: money(landed / r.units) };
    }) };
}
