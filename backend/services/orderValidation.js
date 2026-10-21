export function validateOrderItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 500) throw new Error('Select between 1 and 500 products.');
  const seen = new Set();
  return items.map(item => {
    if (!item || typeof item.product_name !== 'string' || !item.product_name.trim() || item.product_name.length > 200 ||
        typeof item.product_code !== 'string' || !item.product_code.trim() || item.product_code.length > 100) throw new Error('Each product needs a valid name and code.');
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999999 || !/^\d+(\.\d{1,3})?$/.test(String(item.quantity))) throw new Error('Enter a positive quantity with at most three decimal places.');
    const productId = item.product_id == null || item.product_id === '' ? null : Number(item.product_id);
    if (productId !== null && (!Number.isSafeInteger(productId) || productId <= 0)) throw new Error('Invalid product.');
    const key = productId === null ? `code:${item.product_code.toLowerCase()}` : `id:${productId}`;
    if (seen.has(key)) throw new Error('Combine duplicate products into a single row.');
    seen.add(key);
    for (const [field, limit] of [['category_name',100],['vehicle_type_name',100],['vehicle_model_names',255],['brand',100],['unit_type',30]]) {
      if (item[field] != null && (typeof item[field] !== 'string' || item[field].length > limit)) throw new Error(`Invalid ${field.replaceAll('_', ' ')}.`);
    }
    for (const field of ['stock_at_order', 'buying_price']) {
      if (item[field] != null && (item[field] === '' || !Number.isFinite(Number(item[field])) || Math.abs(Number(item[field])) > 9999999 || (field === 'buying_price' && Number(item[field]) < 0))) throw new Error(`Invalid ${field.replaceAll('_', ' ')}.`);
    }
    return { ...item, product_id: productId, quantity };
  });
}
