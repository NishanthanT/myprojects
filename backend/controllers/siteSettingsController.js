import { SiteSettingsModel } from '../models/siteSettingsModel.js';
import {validatePublicNavigation} from '../../frontend/src/utils/publicNavigation.mjs';

export const updatePublicNavigation=async(req,res)=>{
  let config;
  try{config=JSON.stringify(validatePublicNavigation(req.body.nav_config));}
  catch(error){return res.status(400).json({success:false,message:error.message});}
  try{await SiteSettingsModel.updateNavigation(config);res.json({success:true,nav_config:config,message:'Public navbar updated.'});}
  catch(error){res.status(500).json({success:false,message:'Could not save public navbar.'});}
};

export const getSiteSettings = async (req, res) => {
  try {
    const settings = await SiteSettingsModel.get();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching site settings.' });
  }
};

export const updateSiteSettings = async (req, res) => {
  if(req.body.nav_config!=null){try{req.body.nav_config=JSON.stringify(validatePublicNavigation(req.body.nav_config));}catch(error){return res.status(400).json({success:false,message:error.message});}}
  try {
    const settings = await SiteSettingsModel.update(req.body);
    return res.json({ success: true, message: 'Website settings updated successfully.', settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating site settings.' });
  }
};
