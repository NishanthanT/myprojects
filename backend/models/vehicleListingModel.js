import { query } from '../config/db.js';

const attachImages = async (listings) => {
  if (listings.length === 0) return [];
  const ids = listings.map(l => l.id);
  const placeholders = ids.map(() => '?').join(',');
  const images = await query(
    `SELECT * FROM vehicle_listing_images WHERE listing_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    ids
  );
  return listings.map(l => ({ ...l, images: images.filter(img => img.listing_id === l.id).map(img => img.image_data) }));
};

export const VehicleListingModel = {
  getAll: async () => {
    const listings = await query('SELECT * FROM vehicle_listings ORDER BY id DESC');
    return await attachImages(listings);
  },

  getPublicAll: async () => {
    const listings = await query('SELECT * FROM vehicle_listings ORDER BY status ASC, id DESC');
    return await attachImages(listings);
  },

  getById: async (id) => {
    const rows = await query('SELECT * FROM vehicle_listings WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const [withImages] = await attachImages(rows);
    return withImages;
  },

  create: async ({ vehicle_name, model, vehicle_type, price, contact_phone, address, description, status, created_by }) => {
    const result = await query(
      `INSERT INTO vehicle_listings (vehicle_name, model, vehicle_type, price, contact_phone, address, description, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_name, model || null, vehicle_type || null, price ?? null,
        contact_phone || null, address || null, description || null,
        status || 'available', created_by || null
      ]
    );
    return await VehicleListingModel.getById(result.insertId);
  },

  update: async (id, { vehicle_name, model, vehicle_type, price, contact_phone, address, description, status }) => {
    await query(
      `UPDATE vehicle_listings SET
        vehicle_name = ?, model = ?, vehicle_type = ?, price = ?, contact_phone = ?, address = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        vehicle_name, model || null, vehicle_type || null, price ?? null,
        contact_phone || null, address || null, description || null,
        status || 'available', id
      ]
    );
    return await VehicleListingModel.getById(id);
  },

  delete: async (id) => {
    return await query('DELETE FROM vehicle_listings WHERE id = ?', [id]);
  },

  setImages: async (listing_id, images) => {
    await query('DELETE FROM vehicle_listing_images WHERE listing_id = ?', [listing_id]);
    if (images && images.length > 0) {
      const placeholders = images.map(() => '(?, ?, ?)').join(', ');
      const params = images.flatMap((img, idx) => [listing_id, img, idx]);
      await query(`INSERT INTO vehicle_listing_images (listing_id, image_data, sort_order) VALUES ${placeholders}`, params);
    }
  }
};
