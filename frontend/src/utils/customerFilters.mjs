export function filterCustomers(customers, { age = '', month = '', year = '' } = {}) {
  return customers.filter(customer => {
    if (age && !(Number(customer.pending_balance) > 0)) return false;
    if (age === 'unknown' && customer.credit_age_months != null) return false;
    if (age && age !== 'unknown' && (customer.credit_age_months == null || Number(customer.credit_age_months) < Number(age))) return false;
    const periods = (customer.purchase_months || '').split(',');
    if ((month || year) && !periods.some(period => (!month || period.slice(5, 7) === month) && (!year || period.slice(0, 4) === year))) return false;
    return true;
  });
}
