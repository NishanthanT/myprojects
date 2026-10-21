import React, { useState, useEffect } from 'react';
import { History, Eye, Receipt, Printer, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AlertPopup from '../components/AlertPopup.jsx';
import { useShop } from '../context/ShopContext.jsx';

const TodaySales = () => {
  const { shopInfo } = useShop();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Sale Details Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetailsLoading, setSaleDetailsLoading] = useState(false);

  // Alert State
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchTodaySales = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/today', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSales(data.sales);
      } else {
        triggerAlert('error', data.message || 'Failed to fetch sales.');
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to retrieve sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySales();
  }, []);

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

  const handlePrintReceipt = () => {
    window.print();
  };

  // Aggregates
  const totalBills = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* 1. Top Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Today's Transactions</h1>
          <p className="text-xs text-slate-500 mt-1">Review checkout bills created today.</p>
        </div>
      </div>

      {/* 2. Aggregate Card Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Total Billing Sales</span>
            <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-white mt-1">Rs. {totalRevenue.toFixed(2)}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sum of all transaction totals today</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm font-bold text-lg">
            Rs.
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Bills Completed</span>
            <h3 className="text-2xl font-bold font-mono text-slate-800 dark:text-white mt-1">{totalBills}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Quantity of checks checkout</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm">
            <History className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Sales Table */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Bill Number</th>
                <th className="px-6 py-4">Date/Time</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Invoice Total</th>
                <th className="px-6 py-4 text-center">Payment Method</th>
                <th className="px-6 py-4 text-center">Cashier</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">No transactions have been completed today.</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold">{sale.bill_no}</td>
                    <td className="px-6 py-4">{new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4">{sale.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold">Rs. {parseFloat(sale.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                        title="View Receipt"
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

      {/* 4. Details Modal & Thermal Print Layout */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs no-print">
          <div className="fixed inset-0 bg-slate-950/45" onClick={() => setSelectedSale(null)} />
          <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Receipt className="h-4 w-4 text-amber-500" />
                <span>Invoice Receipt details</span>
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
              <div className="space-y-1.5 text-[10px]">
                {selectedSale.items && selectedSale.items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <div>{item.product_name}</div>
                      <div className="text-[9px] text-slate-500">
                        {parseFloat(item.quantity)} {item.unit_type} x Rs. {parseFloat(item.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <span className="font-mono">Rs. {parseFloat(item.total_price).toFixed(2)}</span>
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

      {/* Toast Alert */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default TodaySales;
