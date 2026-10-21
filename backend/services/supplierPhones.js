export function normalizeSupplierPhones(body) {
  const phones = body.phone_numbers === undefined
    ? [{ label: '', number: body.phone }]
    : body.phone_numbers;
  if (!Array.isArray(phones) || phones.length === 0) {
    throw new Error('Please add at least one phone number.');
  }
  const normalized = phones.map(contact => {
    if (!contact || typeof contact.number !== 'string' ||
        (contact.label !== undefined && typeof contact.label !== 'string')) {
      throw new Error('Each phone entry must contain a valid name and number.');
    }
    const number = contact.number.trim();
    const label = (contact.label || '').trim();
    if (!number || number.length > 20 || label.length > 100) {
      throw new Error('Phone numbers are required (maximum 20 characters); names can contain up to 100 characters.');
    }
    return { label, number };
  });
  return { ...body, phone: normalized[0].number, phone_numbers: normalized };
}
