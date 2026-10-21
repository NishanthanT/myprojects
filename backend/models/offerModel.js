import { query } from '../config/db.js';

const attachImages = async (offers) => {
  if (offers.length === 0) return [];
  const ids = offers.map(o => o.id);
  const placeholders = ids.map(() => '?').join(',');
  const images = await query(
    `SELECT * FROM offer_images WHERE offer_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    ids
  );
  return offers.map(o => ({ ...o, images: images.filter(img => img.offer_id === o.id).map(img => img.image_data) }));
};

export const OfferModel = {
  getAll: async () => {
    const sql = `
      SELECT o.*, p.product_name, c.category_name
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON o.category_id = c.id
      ORDER BY o.id DESC
    `;
    const offers = await query(sql);
    return await attachImages(offers);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM offers WHERE id = ?';
    const rows = await query(sql, [id]);
    if (!rows[0]) return null;
    const [withImages] = await attachImages(rows);
    return withImages;
  },

  create: async (offerData) => {
    const { offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status, description, video_url } = offerData;
    const sql = `
      INSERT INTO offers (
        offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status, description, video_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      offer_name,
      offer_type,
      discount_value,
      product_id || null,
      category_id || null,
      start_date,
      end_date,
      status || 'active',
      description || null,
      video_url || null
    ]);
    return { id: result.insertId, ...offerData };
  },

  update: async (id, offerData) => {
    const { offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status, description, video_url } = offerData;
    const sql = `
      UPDATE offers SET
        offer_name = ?, offer_type = ?, discount_value = ?, product_id = ?, category_id = ?,
        start_date = ?, end_date = ?, status = ?, description = ?, video_url = ?
      WHERE id = ?
    `;
    await query(sql, [
      offer_name,
      offer_type,
      discount_value,
      product_id || null,
      category_id || null,
      start_date,
      end_date,
      status,
      description || null,
      video_url || null,
      id
    ]);
    return { id, ...offerData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM offers WHERE id = ?';
    return await query(sql, [id]);
  },

  getActiveOffers: async () => {
    const sql = `
      SELECT * FROM offers
      WHERE status = 'active' AND CURDATE() BETWEEN start_date AND end_date
      ORDER BY id DESC
    `;
    const offers = await query(sql);
    return await attachImages(offers);
  },

  // ─── Offer Images ────────────────────────────────────────────
  setOfferImages: async (offer_id, images) => {
    await query('DELETE FROM offer_images WHERE offer_id = ?', [offer_id]);
    if (images && images.length > 0) {
      const placeholders = images.map(() => '(?, ?, ?)').join(', ');
      const params = images.flatMap((img, idx) => [offer_id, img, idx]);
      await query(`INSERT INTO offer_images (offer_id, image_data, sort_order) VALUES ${placeholders}`, params);
    }
  }
};
