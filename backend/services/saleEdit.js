import { createHash } from 'node:crypto';

export function saleVersion(sale, items) {
  return createHash('sha256').update(JSON.stringify({
    customer: sale.customer_id, method: sale.payment_method,
    amounts: ['subtotal','discount','total_amount','paid_amount','balance_amount'].map(key => Number(sale[key])),
    items: [...items].sort((a,b) => a.id-b.id).map(item => [item.id,item.product_id,...['quantity','returned_quantity','unit_price','total_price','buying_price'].map(key => Number(item[key] || 0))])
  })).digest('hex');
}
const cents = value => {
  if (!['string','number'].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value)) || Number(value)>99999999.99) throw new Error('Enter valid amounts with at most two decimal places.');
  return Math.round(Number(value)*100);
};
export function prepareSaleEdit(body, oldItems) {
  if (!['Cash','Card','Bank Transfer','Credit'].includes(body.payment_method)) throw new Error('Select a valid payment method.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length>200) throw new Error('Add between 1 and 200 products.');
  const previous = new Map(oldItems.map(item => [Number(item.id),item]));
  const seen = new Set();
  let subtotal = 0;
  const items = body.items.map(row => {
    const id = row.id == null ? null : Number(row.id);
    if (id !== null && (!previous.has(id) || seen.has(id))) throw new Error('Invalid or repeated bill item.');
    seen.add(id);
    const old = previous.get(id);
    const productId = Number(row.product_id), quantity = Number(row.quantity);
    if (!Number.isSafeInteger(productId) || productId<=0 || !/^\d+(\.\d{1,3})?$/.test(String(row.quantity)) || !Number.isFinite(quantity) || quantity<=0 || quantity>9999999) throw new Error('Each product needs a positive quantity (up to three decimals).');
    if (old && Number(old.product_id)!==productId) throw new Error('Remove the old line before selecting another product.');
    const price = cents(row.unit_price), total = cents(row.total_price);
    if (total>Math.round(quantity*price)) throw new Error('Line amount cannot exceed quantity multiplied by unit price.');
    const returned = Number(old?.returned_quantity || 0);
    if (returned>0 && (quantity!==Number(old.quantity) || price!==Math.round(Number(old.unit_price)*100) || total!==Math.round(Number(old.total_price)*100))) throw new Error('Returned product lines must retain their original quantities and amounts.');
    subtotal += total - Math.round(returned*price);
    return { id, product_id:productId, quantity, unit_price:price/100, total_price:total/100, returned_quantity:returned };
  });
  if (oldItems.some(item => Number(item.returned_quantity)>0 && !seen.has(Number(item.id)))) throw new Error('Returned product lines cannot be removed.');
  const discount = cents(body.discount), paid = cents(body.paid_amount);
  if (subtotal<0 || subtotal>9999999999 || discount>subtotal) throw new Error('Discount cannot exceed the net subtotal.');
  const total = subtotal-discount;
  if (body.payment_method!=='Credit' && paid<total) throw new Error('Use Credit for a bill that is not fully paid.');
  if (body.payment_method==='Credit' && paid>total) throw new Error('Credit payment cannot exceed the bill total.');
  return { items, subtotal:subtotal/100, discount:discount/100, total_amount:total/100, paid_amount:paid/100,
    balance_amount:(body.payment_method==='Credit' ? total-paid : paid-total)/100, payment_method:body.payment_method };
}

export async function editSale(pool, id, body, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [sales] = await connection.execute('SELECT * FROM sales WHERE id=? FOR UPDATE',[id]);
    if (!sales.length) { const error = new Error('Bill not found.'); error.status=404; throw error; }
    const sale=sales[0];
    const [oldItems] = await connection.execute('SELECT * FROM sale_items WHERE sale_id=? ORDER BY id FOR UPDATE',[id]);
    if (body.version!==saleVersion(sale,oldItems)) { const error=new Error('This bill changed. Close the editor and reopen it before saving.'); error.status=409; throw error; }
    const edited=prepareSaleEdit(body,oldItems);
    const oldCredit=sale.payment_method==='Credit' ? Math.round(Number(sale.balance_amount)*100) : 0;
    const newCredit=edited.payment_method==='Credit' ? Math.round(edited.balance_amount*100) : 0;
    if (!sale.customer_id && newCredit>0) throw new Error('A customer is required for credit.');
    if (sale.customer_id) {
      const [customers]=await connection.execute('SELECT pending_balance FROM customers WHERE id=? FOR UPDATE',[sale.customer_id]);
      if (!customers.length) throw new Error('Customer no longer exists.');
      const balance=Math.round(Number(customers[0].pending_balance)*100)+newCredit-oldCredit;
      if (balance<0) throw new Error('Customer credit was already adjusted. Reconcile the customer balance before reducing this bill credit.');
      await connection.execute('UPDATE customers SET pending_balance=? WHERE id=?',[balance/100,sale.customer_id]);
    }
    const stockDeltas=new Map();
    for (const item of oldItems) stockDeltas.set(item.product_id,(stockDeltas.get(item.product_id)||0)+Number(item.quantity)-Number(item.returned_quantity||0));
    for (const item of edited.items) stockDeltas.set(item.product_id,(stockDeltas.get(item.product_id)||0)-item.quantity+item.returned_quantity);
    const products=new Map();
    for (const productId of [...stockDeltas.keys()].sort((a,b)=>a-b)) {
      const [rows]=await connection.execute('SELECT id,stock_qty,buying_price FROM products WHERE id=? FOR UPDATE',[productId]);
      if (!rows.length) throw new Error('A selected product no longer exists.');
      products.set(productId,rows[0]);
      const delta=Math.round(stockDeltas.get(productId)*1000)/1000;
      if (delta<0 && Number(rows[0].stock_qty)+delta < -0.0001) throw new Error('Not enough stock for the increased bill quantity.');
      if (delta!==0) {
        await connection.execute('UPDATE products SET stock_qty=stock_qty+? WHERE id=?',[delta,productId]);
        await connection.execute("INSERT INTO stock_history (product_id,type,quantity,note,created_by) VALUES (?,'adjustment',?,?,?)",[productId,delta,`Edited bill ${sale.bill_no}`,userId]);
      }
    }
    const retained=edited.items.filter(item=>item.id).map(item=>item.id);
    for (const item of oldItems) if (!retained.includes(item.id)) await connection.execute('DELETE FROM sale_items WHERE id=? AND sale_id=?',[item.id,id]);
    for (const item of edited.items) {
      if (item.id) await connection.execute('UPDATE sale_items SET quantity=?,unit_price=?,total_price=? WHERE id=? AND sale_id=?',[item.quantity,item.unit_price,item.total_price,item.id,id]);
      else await connection.execute('INSERT INTO sale_items (sale_id,product_id,quantity,unit_price,buying_price,total_price) VALUES (?,?,?,?,?,?)',[id,item.product_id,item.quantity,item.unit_price,products.get(item.product_id).buying_price,item.total_price]);
    }
    await connection.execute('UPDATE sales SET subtotal=?,discount=?,total_amount=?,paid_amount=?,balance_amount=?,payment_method=? WHERE id=?',
      [edited.subtotal,edited.discount,edited.total_amount,edited.paid_amount,edited.balance_amount,edited.payment_method,id]);
    await connection.commit();
    return { id, bill_no:sale.bill_no };
  } catch(error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
