import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, Calendar, Receipt, Printer, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AlertPopup from '../components/AlertPopup.jsx';
import { useShop } from '../context/ShopContext.jsx';

const SalesHistory = () => {
  const { shopInfo } = useShop();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchBill, setSearchBill] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Selected Sale Details Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetailsLoading, setSaleDetailsLoading] = useState(false);

  // Return Item States
  const [returnItem, setReturnItem] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // Alert State
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchSalesHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSales(data.sales);
      } else {
        triggerAlert('error', data.message || 'Failed to fetch sales history.');
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to retrieve sales history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  // Filter sales
  const filteredSales = sales.filter(s => {
    const matchesBill = s.bill_no.toLowerCase().includes(searchBill.toLowerCase()) ||
                        (s.customer_name && s.customer_name.toLowerCase().includes(searchBill.toLowerCase()));
    
    // Date checks
    let matchesDate = true;
    const saleDateObj = new Date(s.sale_date);
    saleDateObj.setHours(0,0,0,0);
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      if (saleDateObj < start) matchesDate = false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0,0,0,0);
      if (saleDateObj > end) matchesDate = false;
    }

    const matchesMethod = methodFilter ? s.payment_method === methodFilter : true;

    return matchesBill && matchesDate && matchesMethod;
  });

  const handleViewSaleDetails = async (id) => {
    setSaleDetailsLoading(true);
    try {
      const response = await fetch(`/api/sales/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedSale(data.sale);
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error retrieving details.');
    } finally {
      setSaleDetailsLoading(false);
    }
  };

  const handleInitiateReturn = (item) => {
    setReturnItem(item);
    const maxReturnable = parseFloat(item.quantity) - parseFloat(item.returned_quantity || 0);
    setReturnQty(maxReturnable.toString());
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnItem) return;

    const qty = parseFloat(returnQty);
    const maxReturnable = parseFloat(returnItem.quantity) - parseFloat(returnItem.returned_quantity || 0);

    if (isNaN(qty) || qty <= 0) {
      triggerAlert('error', 'Please enter a valid return quantity greater than 0.');
      return;
    }

    if (qty > maxReturnable) {
      triggerAlert('error', `Cannot return more than remaining purchased quantity (${maxReturnable}).`);
      return;
    }

    setReturnLoading(true);
    try {
      const response = await fetch('/api/sales/return-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          saleItemId: returnItem.id,
          quantityToReturn: qty
        })
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setReturnItem(null);
        if (selectedSale) {
          handleViewSaleDetails(selectedSale.id);
        }
        fetchSalesHistory();
      } else {
        triggerAlert('error', data.message || 'Failed to process return.');
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to process product return.');
    } finally {
      setReturnLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Sales & Invoice History</h1>
        <p className="text-xs text-slate-500 mt-1">Audit complete sales transactions, checkout credits, and print bills.</p>
      </div>

      {/* 2. Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        {/* Bill Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchBill}
            onChange={(e) => setSearchBill(e.target.value)}
            placeholder="Search by Bill No or customer..."
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Start Date */}
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
          />
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* End Date */}
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
          />
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Payment Method Filter */}
        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white appearance-none"
          >
            <option value="">All Payments</option>
            <option value="Cash">Cash Only</option>
            <option value="Card">Card Only</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Credit">Credit Sales</option>
          </select>
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* 3. Sales Table */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Bill Number</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4 text-right">Subtotal</th>
                <th className="px-6 py-4 text-right">Discount</th>
                <th className="px-6 py-4 text-right">Total Payable</th>
                <th className="px-6 py-4 text-center">Payment Method</th>
                <th className="px-6 py-4 text-center">Cashier</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">No transaction records match search parameters.</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold">{sale.bill_no}</td>
                    <td className="px-6 py-4">{new Date(sale.sale_date).toLocaleString()}</td>
                    <td className="px-6 py-4">{sale.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(sale.subtotal).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-500">- Rs. {parseFloat(sale.discount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-850 dark:text-white">Rs. {parseFloat(sale.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        sale.payment_method === 'Credit'
                          ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-450">{sale.cashier_name}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewSaleDetails(sale.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto"
                        title="View Receipt Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Details receipt print modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs no-print">
          <div className="fixed inset-0 bg-slate-950/45" onClick={() => setSelectedSale(null)} />
          <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Receipt className="h-4 w-4 text-amber-500" />
                <span>Invoice Receipt Details</span>
              </span>
              <button 
                onClick={() => setSelectedSale(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Print paper target content */}
            <div 
              id="thermal-receipt-preview" 
              className="bg-white p-4 border border-dashed border-slate-350 text-black font-sans leading-relaxed text-xs shadow-inner"
              style={{ fontFamily: 'monospace' }}
            >
              <div className="text-center font-bold">
                <h3 className="text-sm uppercase font-extrabold tracking-wide">{shopInfo.shopName}</h3>
                <p className="text-[10px] font-semibold mt-0.5">{shopInfo.shopTagline}</p>
                <p className="text-[9px] font-normal leading-normal">{shopInfo.shopAddress}<br />Phone: {shopInfo.shopPhone}</p>
              </div>
              
              <div className="border-t border-b border-dashed border-black py-2 my-2 text-[10px]">
                <div className="flex justify-between">
                  <span>Bill No: {selectedSale.bill_no}</span>
                  <span>Date: {new Date(selectedSale.sale_date).toLocaleString()}</span>
                </div>
                <div>Customer: {selectedSale.customer_name || 'Walk-in'}</div>
                <div>Cashier: {selectedSale.cashier_name}</div>
                <div>Method: {selectedSale.payment_method}</div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 text-[10px]">
                {selectedSale.items && selectedSale.items.map(item => (
                  <div key={item.id} className="flex justify-between items-start border-b border-dotted border-slate-200 pb-1.5 last:border-0 last:pb-0">
                    <div>
                      <div className="font-semibold text-slate-900">{item.product_name}</div>
                      <div className="text-[9px] text-slate-500">
                        {parseFloat(item.quantity)} {item.unit_type} x Rs. {parseFloat(item.unit_price).toFixed(2)}
                      </div>
                      {parseFloat(item.returned_quantity || 0) > 0 && (
                        <div className="text-rose-600 font-bold text-[9px] mt-0.5">
                          Returned: {parseFloat(item.returned_quantity)} {item.unit_type}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono">Rs. {parseFloat(item.total_price).toFixed(2)}</span>
                      {parseFloat(item.returned_quantity || 0) < parseFloat(item.quantity) && (
                        <button
                          onClick={() => handleInitiateReturn(item)}
                          className="no-print mt-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-[9px] text-rose-600 dark:text-rose-400 rounded font-bold transition-all"
                        >
                          Return / Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-black mt-3 pt-2 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {parseFloat(selectedSale.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>- Rs. {parseFloat(selectedSale.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-slate-400">
                  <span>TOTAL:</span>
                  <span>Rs. {parseFloat(selectedSale.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>Rs. {parseFloat(selectedSale.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedSale.payment_method === 'Credit' ? 'Balance Credit:' : 'Change:'}</span>
                  <span>Rs. {parseFloat(selectedSale.balance_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center font-semibold text-[10px] mt-6 border-t border-dashed border-black pt-2">
                Thank You! Visit Again.
              </div>
            </div>

            {/* Print Action Trigger */}
            <button
              onClick={handlePrintReceipt}
              className="w-full mt-4 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-1.5"
            >
              <Printer className="h-4.5 w-4.5" />
              <span>Print Invoice Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* Return Item Modal */}
      {returnItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs no-print">
          <div className="fixed inset-0 bg-slate-950/45" onClick={() => setReturnItem(null)} />
          <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
              <span className="font-bold text-xs text-rose-600 flex items-center gap-1">
                <span>Return & Refund Product</span>
              </span>
              <button 
                onClick={() => setReturnItem(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Product: <strong className="text-slate-700 dark:text-slate-200">{returnItem.product_name}</strong><br />
              Bill No: <strong className="text-slate-700 dark:text-slate-200">{selectedSale?.bill_no}</strong>
            </p>

            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Quantity to Return (Max: {parseFloat(returnItem.quantity) - parseFloat(returnItem.returned_quantity || 0)} {returnItem.unit_type})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={parseFloat(returnItem.quantity) - parseFloat(returnItem.returned_quantity || 0)}
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">
                    {returnItem.unit_type}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnItem(null)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnLoading}
                  className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 py-2.5 font-bold text-xs text-white shadow-lg disabled:opacity-50"
                >
                  {returnLoading ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerts */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default SalesHistory;
