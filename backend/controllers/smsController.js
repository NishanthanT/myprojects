import { SmsModel } from '../models/smsModel.js';
import { CustomerModel } from '../models/customerModel.js';

// In-memory toggle for SMS alerts (persists while backend is running, default true)
let smsConfig = {
  enabled: true,
  shopName: 'STN Motors',
  senderId: 'STNMOTORS'
};

export const getSmsSettings = (req, res) => {
  return res.json({ success: true, settings: smsConfig });
};

export const updateSmsSettings = (req, res) => {
  const { enabled, shopName } = req.body;
  if (enabled !== undefined) smsConfig.enabled = !!enabled;
  if (shopName) smsConfig.shopName = shopName;
  
  return res.json({ success: true, message: 'SMS settings updated successfully.', settings: smsConfig });
};

export const getSmsLogs = async (req, res) => {
  try {
    const logs = await SmsModel.getAll();
    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving SMS logs.' });
  }
};

export const triggerCustomerSms = async (req, res) => {
  const { customer_id, phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Phone and message content are required.' });
  }

  // If SMS is turned off, do not send
  if (!smsConfig.enabled) {
    return res.json({ success: false, message: 'SMS notifications are currently disabled in Settings.' });
  }

  try {
    // If a customer_id is provided, verify customer settings
    if (customer_id) {
      const customer = await CustomerModel.getById(customer_id);
      if (customer && !customer.sms_enabled) {
        return res.json({ success: false, message: 'SMS is disabled for this specific customer profile.' });
      }
    }

    // Mock API Gateway simulation
    console.log('\n--- [MOCK SMS OUTBOUND SENDER] ---');
    console.log(`To: ${phone}`);
    console.log(`From: ${smsConfig.senderId}`);
    console.log(`Message: ${message}`);
    console.log('------------------------------------\n');

    // Save to DB Logs
    const log = await SmsModel.createLog({
      customer_id,
      phone,
      message,
      status: 'sent'
    });

    return res.status(201).json({ success: true, message: 'SMS notification sent successfully.', log });
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Save to DB Logs as failed
    await SmsModel.createLog({
      customer_id,
      phone,
      message,
      status: 'failed'
    });

    return res.status(500).json({ success: false, message: 'Failed to send SMS.' });
  }
};
