import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, CreditCard, DollarSign, Wallet, FileSpreadsheet, X } from 'lucide-react';

const BillingSummary = ({ 
  subtotal, 
  onCheckout, 
  customers, 
  selectedCustomer, 
  setSelectedCustomer, 
  onQuickAddCustomer,
  checkoutLoading
}) => {
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percent'
  const [discountVal, setDiscountVal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const custWrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (custWrapperRef.current && !custWrapperRef.current.contains(event.target)) {
        setShowCustList(false);
        setCustomerSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const discountAmount = discountType === 'fixed' 
    ? parseFloat(discountVal || 0) 
    : (parseFloat(subtotal) * parseFloat(discountVal || 0)) / 100;

  const total = Math.max(0, subtotal - discountAmount);
  
  // Calculate balance change or unpaid debt
  const isCredit = paymentMethod === 'Credit';
  const paid = parseFloat(paidAmount || 0);
  const balance = isCredit ? Math.max(0, total - paid) : Math.max(0, paid - total);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const cleanSearch = customerSearch.toLowerCase().replace(/\s+/g, '');
    const cleanName = c.name.toLowerCase();
    const cleanPhone = c.phone.replace(/\s+/g, '');
    return cleanName.includes(cleanSearch) || cleanPhone.includes(cleanSearch);
  });

  // Set default paid amount when total changes
  useEffect(() => {
    if (paymentMethod !== 'Credit' && paymentMethod !== 'Card') {
      setPaidAmount(total.toFixed(2));
    } else if (paymentMethod === 'Card') {
      setPaidAmount(total.toFixed(2));
    } else {
      setPaidAmount('0');
    }
  }, [total, paymentMethod]);

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (total <= 0 && subtotal > 0) {
      alert('Total amount must be greater than zero.');
      return;
    }
    if (isCredit && (!selectedCustomer || selectedCustomer.id === 1)) {
      alert('Credit/Pending payment requires selecting a registered Customer (not Walk-in).');
      return;
    }
    if (!isCredit && paid < total) {
      alert(`Paid amount must be at least Rs. ${total.toFixed(2)} for ${paymentMethod} payment.`);
      return;
    }

    onCheckout({
      customer_id: selectedCustomer?.id || 1,
      subtotal,
      discount: discountAmount,
      total_amount: total,
      paid_amount: paid,
      balance_amount: balance, // unpaid credit debt if credit method, or cashier change if cash
      payment_method: paymentMethod
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm p-6 overflow-y-auto">
      <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm mb-4">Checkout & Summary</h3>

      <form onSubmit={handleCheckoutSubmit} className="space-y-4">
        {/* 1. Customer Selection */}
        <div ref={custWrapperRef} className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Customer Link</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={showCustList ? customerSearch : (customerSearch || selectedCustomer?.name || '')}
                placeholder="Search phone or name..."
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustList(true);
                }}
                onFocus={() => setShowCustList(true)}
                className="w-full pl-9 pr-9 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              
              {/* Clear search/customer button */}
              {(customerSearch || (selectedCustomer && selectedCustomer.id !== 1)) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearch('');
                    const walkIn = customers.find(c => c.id === 1 || c.phone === '0000000000');
                    if (walkIn) setSelectedCustomer(walkIn);
                    setShowCustList(false);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={onQuickAddCustomer}
              className="px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 flex items-center justify-center"
              title="Quick register new customer"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showCustList && (
            <div className="absolute left-0 right-0 top-[65px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto p-1.5 space-y-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 py-3">No customers found.</p>
              ) : (
                filteredCustomers.map(cust => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setCustomerSearch('');
                      setShowCustList(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 font-semibold flex justify-between items-center"
                  >
                    <span>{cust.name} ({cust.phone})</span>
                    {parseFloat(cust.pending_balance) > 0 && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md">
                        Debt: Rs. {parseFloat(cust.pending_balance).toFixed(0)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Active customer card */}
          {selectedCustomer && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="block font-bold text-xs text-slate-800 dark:text-slate-200">{selectedCustomer.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Phone: {selectedCustomer.phone}</span>
              </div>
              {parseFloat(selectedCustomer.pending_balance) > 0 && (
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wide">Outstanding Credit</span>
                  <span className="font-bold text-xs font-mono text-rose-500">Rs. {parseFloat(selectedCustomer.pending_balance).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* 2. Discounts Configuration */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Discount Application</label>
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold py-2 px-3 focus:outline-none dark:text-white"
            >
              <option value="fixed">Rs. (Fixed)</option>
              <option value="percent">% (Percentage)</option>
            </select>
            
            <input
              type="number"
              min="0"
              value={discountVal}
              onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* 3. Payment Methods */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'Cash', label: 'Cash', icon: DollarSign },
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'Bank Transfer', label: 'Bank', icon: Wallet },
              { id: 'Credit', label: 'Credit', icon: FileSpreadsheet }
            ].map(method => {
              const Icon = method.icon;
              const active = paymentMethod === method.id;
              
              return (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all duration-150 ${
                    active 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-450'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* 4. Totals Breakdowns */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-450">
            <span>Subtotal</span>
            <span>Rs. {parseFloat(subtotal).toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-450">
            <span>Discount {discountType === 'percent' && `(${discountVal}%)`}</span>
            <span className="text-rose-500">- Rs. {discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Total Payable</span>
            <span className="font-bold text-sm font-mono text-slate-800 dark:text-white">Rs. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* 5. Payments Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Amount</label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              disabled={paymentMethod === 'Card'} // cards pay exact total
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-3 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isCredit ? 'Credit Debt' : 'Change Payout'}
            </label>
            <div className="w-full rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
              Rs. {balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          type="submit"
          disabled={subtotal <= 0 || checkoutLoading}
          className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-850 disabled:cursor-not-allowed py-3 font-bold text-sm text-white shadow-lg shadow-amber-500/20 transition-all text-center flex items-center justify-center gap-2"
        >
          {checkoutLoading ? 'Processing Checkout...' : `Finalize Order (Rs. ${total.toFixed(2)})`}
        </button>
      </form>
    </div>
  );
};

export default BillingSummary;
