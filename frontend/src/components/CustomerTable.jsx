import React, { useState } from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { filterCustomers } from '../utils/customerFilters.mjs';

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const input = 'w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 text-sm dark:text-white';
export default function CustomerTable({ customers, allCustomers, onView, onEdit, onDelete, canDelete }) {
  const [age, setAge] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const years = [...new Set(allCustomers.flatMap(c => (c.purchase_months || '').split(',').filter(Boolean).map(period => period.slice(0, 4))))].sort().reverse();
  const rows = filterCustomers(customers, { age, month, year });
  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs font-bold text-slate-500">Unpaid Credit Age<select value={age} onChange={e => setAge(e.target.value)} className={input}><option value="">Any Age</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}+ month{i ? 's' : ''} unpaid</option>)}<option value="unknown">Credit date unavailable</option></select></label>
        <label className="text-xs font-bold text-slate-500">Purchase Month<select value={month} onChange={e => setMonth(e.target.value)} className={input}><option value="">All Months</option>{['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, index) => <option key={name} value={String(index + 1).padStart(2,'0')}>{name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-500">Purchase Year<select value={year} onChange={e => setYear(e.target.value)} className={input}><option value="">All Years</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
      </div>
      <p className="text-xs text-slate-500">Credit age uses the oldest recorded unpaid credit bill. Direct customer balance edits are not allocated to bills; old balances without a bill date have an unavailable age.</p>
      <div className="flex flex-wrap justify-between gap-3 text-sm"><span className="text-slate-500" role="status">{rows.length} customers · Outstanding credit: {money(rows.reduce((sum,c) => sum + Math.round(Number(c.pending_balance) * 100),0) / 100)}</span><button onClick={() => { setAge(''); setMonth(''); setYear(''); }} className="text-amber-600 font-bold">Clear Date / Age Filters</button></div>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <table className="w-full min-w-[1100px] text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 uppercase"><tr>{['Customer','Phone / Address','Total Purchases','Bills','Credit Due','Credit Age','Last Purchase','SMS','Actions'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
        <tbody>{rows.map(c => <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
          <td className="p-4 font-bold dark:text-white">{c.name}</td><td className="p-4"><div>{c.phone}</div><div className="text-xs text-slate-500 max-w-52 break-words">{c.address || 'No address'}</div></td>
          <td className="p-4 whitespace-nowrap">{money(c.purchase_total)}</td><td className="p-4">{c.bill_count || 0}</td><td className={`p-4 whitespace-nowrap font-bold ${Number(c.pending_balance) > 0 ? 'text-rose-500' : ''}`}>{money(c.pending_balance)}</td>
          <td className="p-4">{Number(c.pending_balance) <= 0 ? 'No debt' : c.credit_age_months == null ? 'Date unavailable' : `${c.credit_age_months} months`}</td><td className="p-4 whitespace-nowrap">{c.last_purchase_date || 'No purchases'}</td><td className="p-4">{c.sms_enabled ? 'Active' : 'Disabled'}</td>
          <td className="p-4"><div className="flex gap-2"><button onClick={() => onView(c)} className="flex items-center gap-1 text-amber-600 font-bold"><Eye className="h-4 w-4" />View</button>{c.id !== 1 && c.phone !== '0000000000' && <><button onClick={() => onEdit(c)} aria-label={`Edit ${c.name}`} title="Edit Customer" className="p-2 rounded-lg border border-slate-200 dark:border-slate-700"><Edit3 className="h-4 w-4" /></button>{canDelete && <button onClick={() => onDelete(c.id)} aria-label={`Delete ${c.name}`} title="Delete Customer" className="p-2 rounded-lg border border-rose-300 text-rose-500"><Trash2 className="h-4 w-4" /></button>}</>}</div></td>
        </tr>)}{!rows.length && <tr><td colSpan={9} className="text-center p-10 text-slate-500">No customers match these filters.</td></tr>}</tbody>
      </table>
    </div><p className="text-xs text-slate-500">Purchase totals and credit due are lifetime totals. Month/year filters select customers who purchased during that period.</p>
  </div>;
}
