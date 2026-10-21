import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useShop } from '../context/ShopContext.jsx';
import CustomerBillEditor from './CustomerBillEditor.jsx';
const money = value => `Rs. ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = 'w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm dark:text-white';
export default function CustomerHistory({ customer, onClose, onChanged }) {
  const { shopInfo } = useShop();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [credit, setCredit] = useState(false);
  const [retry, setRetry] = useState(0);
  const [editingSale,setEditingSale]=useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`/api/customers/${customer.id}/history`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Could not load history.'); setData(result); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [customer.id, retry]);
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape' && !editingSale) onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose,editingSale]);
  const rows = (data?.sales || []).filter(sale => (!search.trim() || sale.bill_no.toLowerCase().includes(search.trim().toLowerCase())) && (!month || sale.date.slice(5,7) === month) && (!year || sale.date.slice(0,4) === year) && (!credit || (sale.payment_method === 'Credit' && Number(sale.balance_amount) > 0)));
  const years = [...new Set((data?.sales || []).map(sale => sale.date.slice(0,4)))].sort().reverse();
  function downloadPDF(sale = null) {
    try {
      const doc = new jsPDF();
      const customerData = data.customer;
      doc.setFontSize(16); doc.text(shopInfo.shopName || 'STN MOTORS', 14, 18);
      doc.setFontSize(10);
      const heading = sale ? `Invoice ${sale.bill_no}` : 'Customer Purchase Statement';
      doc.text(heading, 14, 27);
      const details = doc.splitTextToSize(`${customerData.name} | ${customerData.phone}\n${customerData.address || ''}`, 180);
      doc.text(details, 14, 35);
      let y = 39 + details.length * 5;
      if (sale) {
        doc.text(`${sale.date} | ${sale.payment_method} | Cashier: ${sale.cashier_name || '-'}`, 14, y); y += 8;
        doc.autoTable({ startY: y, head: [['Code','Product','Qty','Returned','Unit Price','Net Amount']],
          body: sale.items.map(item => [item.product_code || '-', item.product_name || 'Unavailable product', item.quantity, item.returned_quantity || 0,
            Number(item.unit_price).toFixed(2), (Number(item.total_price) - Number(item.returned_quantity || 0)*Number(item.unit_price)).toFixed(2)]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [30,41,59] } });
        y = doc.lastAutoTable.finalY + 10;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.text([`Subtotal: ${money(sale.subtotal)}`, `Discount: ${money(sale.discount)}`, `Bill Total: ${money(sale.total_amount)}`, `Paid at Sale: ${money(sale.paid_amount)}`, `${sale.payment_method === 'Credit' ? 'Recorded Bill Credit' : 'Change'}: ${money(sale.balance_amount)}`], 14, y);
      } else {
        const filters = `Filters: Bill ${search.trim() || 'All'} | Month ${month || 'All'} | Year ${year || 'All'} | ${credit ? 'Recorded unpaid credit only' : 'All bills'}`;
        const lines = doc.splitTextToSize(filters, 180); doc.text(lines, 14, y); y += lines.length * 5 + 5;
        doc.autoTable({ startY: y, head: [['Date','Bill No','Payment','Bill Total','Paid at Sale','Bill Credit']],
          body: rows.map(bill => [bill.date, bill.bill_no, bill.payment_method, Number(bill.total_amount).toFixed(2), Number(bill.paid_amount).toFixed(2), (bill.payment_method === 'Credit' ? Number(bill.balance_amount) : 0).toFixed(2)]),
          styles: { fontSize: 8 }, headStyles: { fillColor: [30,41,59] } });
        y = doc.lastAutoTable.finalY + 10;
        if (y > 250) { doc.addPage(); y = 20; }
        doc.text([`Selected Bills: ${rows.length}`, `Selected Purchases: ${money(rows.reduce((sum,bill) => sum + Math.round(Number(bill.total_amount)*100),0)/100)}`, `Current Customer Credit (all time): ${money(customerData.pending_balance)}`, 'Bill credit reflects recorded sales; direct balance edits are not allocated to bills.'], 14, y);
      }
      doc.save(`${sale ? sale.bill_no : `Customer_${customerData.id}_Statement`}.pdf`);
    } catch { setError('Could not download PDF. Please try again.'); }
  }
  return <div role="dialog" aria-modal="true" aria-label="Customer purchase history" className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto text-slate-800 dark:text-slate-200">
    <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 sm:px-8 flex justify-between items-center gap-3"><div><h2 className="font-bold text-xl">{customer.name}</h2><p className="text-sm text-slate-500">{customer.phone} · Full Purchase History</p></div><button autoFocus onClick={onClose} className="flex gap-2 items-center rounded-xl bg-amber-500 text-white px-4 py-2 font-bold"><X className="h-4 w-4" />Close</button></header>
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-5">
      {error && <div role="alert" className="text-rose-500">{error}<button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Retry</button></div>}
      {!data && !error && <p role="status">Loading customer history...</p>}
      {data && <>
        <p className="text-sm text-slate-500">{data.customer.address || 'No address registered'}</p>
        <div className="grid sm:grid-cols-4 gap-3">{[['Total Purchases',money(data.totals.purchases)],['Total Bills',data.totals.bill_count],['Paid at Sale',money(data.totals.paid_at_sale)],['Current Credit Due',money(data.customer.pending_balance)]].map(([label,value]) => <div key={label} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{value}</p></div>)}</div>
        <p className="text-xs text-slate-500">Totals reflect recorded sales after returns. Paid at Sale and bill credit are recorded bill values; direct balance edits are not dated payments. Current Credit Due is the customer balance.</p>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Search Bill No<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={input} /></label><label className="text-sm">Month<select value={month} onChange={e => setMonth(e.target.value)} className={input}><option value="">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((name,i) => <option key={name} value={String(i+1).padStart(2,'0')}>{name}</option>)}</select></label><label className="text-sm">Year<select value={year} onChange={e => setYear(e.target.value)} className={input}><option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label></div>
          <div className="flex flex-wrap justify-between gap-3"><label className="text-sm"><input type="checkbox" checked={credit} onChange={e => setCredit(e.target.checked)} className="accent-amber-500 mr-2" />Recorded unpaid credit bills only</label><button className="text-amber-600 font-bold text-sm" onClick={() => { setSearch(''); setMonth(''); setYear(''); setCredit(false); }}>Clear Filters</button></div>
          <p role="status" className="text-sm text-slate-500">Showing {rows.length} of {data.sales.length} bills · Filtered purchases: {money(rows.reduce((sum,sale) => sum + Math.round(Number(sale.total_amount)*100),0)/100)}</p>
          <button type="button" disabled={!rows.length} onClick={() => downloadPDF()} className="rounded-xl bg-amber-500 text-white px-4 py-2 text-sm font-bold disabled:opacity-50">Download Statement PDF</button>
        </div>
        {!rows.length && <p className="text-slate-500">No purchases match these filters.</p>}
        {rows.map(sale => <div key={sale.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><details><summary className="font-bold cursor-pointer">{sale.date} · {sale.bill_no} · {sale.payment_method} · {money(sale.total_amount)}</summary>
          <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-5 text-sm"><span>Subtotal: {money(sale.subtotal)}</span><span>Discount: {money(sale.discount)}</span><span>Paid at Sale: {money(sale.paid_amount)}</span><span>Recorded Bill Credit: {money(sale.balance_amount)}</span><span>Cashier: {sale.cashier_name || 'Unavailable'}</span></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-slate-500"><tr>{['Product','Code','Purchased Qty','Returned Qty','Unit Price','Net Line Amount'].map(label => <th key={label} className="py-2">{label}</th>)}</tr></thead><tbody>{sale.items.map(item => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3">{item.product_name || 'Unavailable product'}</td><td>{item.product_code || '-'}</td><td>{item.quantity} {item.unit_type}</td><td>{item.returned_quantity || 0}</td><td>{money(item.unit_price)}</td><td>{money(Number(item.total_price) - Number(item.returned_quantity || 0)*Number(item.unit_price))}</td></tr>)}</tbody></table></div>
          </div>
        </details><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingSale(sale)} className="rounded-xl border border-amber-500 text-amber-600 px-4 py-2 text-sm font-bold">Edit Bill</button><button type="button" onClick={() => downloadPDF(sale)} className="rounded-xl bg-amber-500 text-white px-4 py-2 text-sm font-bold">Download Bill PDF</button></div></div>)}
      </>}
      <button onClick={onClose} className="rounded-xl bg-amber-500 text-white px-4 py-2 font-bold">Close History</button>
      {editingSale && <CustomerBillEditor key={editingSale.id} sale={editingSale} onClose={()=>setEditingSale(null)} onSaved={()=>{setEditingSale(null);setRetry(value=>value+1);onChanged?.();}}/>}
    </div>
  </div>;
}
