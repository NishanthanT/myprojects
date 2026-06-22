import { OfferModel } from '../models/offerModel.js';
import { CustomerModel } from '../models/customerModel.js';
import { SmsModel } from '../models/smsModel.js';

export const getOffers = async (req, res) => {
  try {
    const offers = await OfferModel.getAll();
    return res.json({ success: true, offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error listing offers.' });
  }
};

export const getOfferById = async (req, res) => {
  const { id } = req.params;
  try {
    const offer = await OfferModel.getById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }
    return res.json({ success: true, offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving offer.' });
  }
};

export const createOffer = async (req, res) => {
  const { offer_name, offer_type, discount_value, start_date, end_date } = req.body;
  if (!offer_name || !offer_type || discount_value === undefined || !start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'Offer Name, Type, Discount Value, and validity Dates are required.' });
  }

  try {
    const offer = await OfferModel.create(req.body);

    // After offer creation, dispatch SMS to customers who opted in
    try {
      const customers = await CustomerModel.getAll();
      const optedInCustomers = customers.filter(c => c.sms_enabled === 1 || c.sms_enabled === true);
      
      const message = `Special Offer at STN Motors: ${offer_name}! Get ${discount_value}% off. Valid from ${start_date} to ${end_date}. Visit us!`;
      
      for (const customer of optedInCustomers) {
        // Only send if it's not the default 0000000000 walk-in customer
        if (customer.phone && customer.phone !== '0000000000') {
          console.log('\n--- [MOCK SMS OUTBOUND SENDER] ---');
          console.log(`To: ${customer.phone} (${customer.name})`);
          console.log(`From: STNMOTORS`);
          console.log(`Message: ${message}`);
          console.log('------------------------------------\n');
          
          await SmsModel.createLog({
            customer_id: customer.id,
            phone: customer.phone,
            message: message,
            status: 'sent'
          });
        }
      }
    } catch (smsError) {
      console.error('Error dispatching offer SMS:', smsError);
      // We don't fail the offer creation if SMS fails
    }

    return res.status(201).json({ success: true, message: 'Discount offer added and SMS dispatched successfully.', offer });
  } catch (error) {
    console.error('Error creating offer:', error);
    return res.status(500).json({ success: false, message: 'Server error creating offer.' });
  }
};

export const updateOffer = async (req, res) => {
  const { id } = req.params;
  const { offer_name, offer_type, discount_value, start_date, end_date, status } = req.body;
  
  if (!offer_name || !offer_type || discount_value === undefined || !start_date || !end_date || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const offer = await OfferModel.update(id, req.body);
    return res.json({ success: true, message: 'Discount offer updated successfully.', offer });
  } catch (error) {
    console.error('Error updating offer:', error);
    return res.status(500).json({ success: false, message: 'Server error updating offer.' });
  }
};

export const deleteOffer = async (req, res) => {
  const { id } = req.params;
  try {
    await OfferModel.delete(id);
    return res.json({ success: true, message: 'Discount offer deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting offer.' });
  }
};
