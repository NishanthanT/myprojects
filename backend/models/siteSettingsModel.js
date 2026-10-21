import { query } from '../config/db.js';
let ready;
const ensureNavigation=()=>ready||=(async()=>{
  const columns=await query("SHOW COLUMNS FROM site_settings LIKE 'nav_config'");
  if(!columns.length){try{await query('ALTER TABLE site_settings ADD COLUMN nav_config TEXT NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  const translations=await query("SHOW COLUMNS FROM site_settings WHERE Field IN ('shop_tagline_ta','shop_address_ta','about_text_ta','shop_tagline_si','shop_address_si','about_text_si')");
  for(const [name,type] of [['shop_tagline_ta','VARCHAR(150)'],['shop_address_ta','VARCHAR(255)'],['about_text_ta','TEXT'],['shop_tagline_si','VARCHAR(150)'],['shop_address_si','VARCHAR(255)'],['about_text_si','TEXT']]){
    if(!translations.some(column=>column.Field===name)){try{await query(`ALTER TABLE site_settings ADD COLUMN ${name} ${type} CHARACTER SET utf8mb4 NULL`);}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  }
  const navColumns=await query("SHOW FULL COLUMNS FROM site_settings LIKE 'nav_config'");
  if(navColumns[0]?.Collation&&!navColumns[0].Collation.startsWith('utf8'))await query('ALTER TABLE site_settings MODIFY nav_config TEXT CHARACTER SET utf8mb4 NULL');
})().catch(error=>{ready=null;throw error;});

export const SiteSettingsModel = {
  get: async () => {
    await ensureNavigation();
    const rows = await query('SELECT * FROM site_settings WHERE id = 1');
    return rows[0];
  },

  update: async (data) => {
    await ensureNavigation();
    data={...(await SiteSettingsModel.get()),...data};
    const {
      shop_name, shop_tagline, shop_address, shop_phone, whatsapp_number,
      email, facebook_url, instagram_url, tiktok_url, google_maps_url,
      about_text, visible_fields, logo, nav_config, shop_tagline_ta,shop_address_ta,about_text_ta,shop_tagline_si,shop_address_si,about_text_si
    } = data;

    await query(
      `UPDATE site_settings SET
        shop_name = ?, shop_tagline = ?, shop_address = ?, shop_phone = ?, whatsapp_number = ?,
        email = ?, facebook_url = ?, instagram_url = ?, tiktok_url = ?, google_maps_url = ?,
        about_text = ?, visible_fields = ?, logo = ?, nav_config = ?, shop_tagline_ta = ?,shop_address_ta = ?,about_text_ta = ?,shop_tagline_si = ?,shop_address_si = ?,about_text_si = ?
      WHERE id = 1`,
      [
        shop_name || null, shop_tagline || null, shop_address || null, shop_phone || null, whatsapp_number || null,
        email || null, facebook_url || null, instagram_url || null, tiktok_url || null, google_maps_url || null,
        about_text || null, visible_fields || '', logo || null, nav_config || null,shop_tagline_ta||null,shop_address_ta||null,about_text_ta||null,shop_tagline_si||null,shop_address_si||null,about_text_si||null
      ]
    );
    return await SiteSettingsModel.get();
  },
  updateNavigation:async(config)=>{
    await ensureNavigation();
    await query('UPDATE site_settings SET nav_config=? WHERE id=1',[config]);
    return config;
  }
};
