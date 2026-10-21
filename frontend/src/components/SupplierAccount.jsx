import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const money = value => `Rs. ${Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const newForm = kind => ({ kind, date: today(), reference: '', amount: '', note: '', photos: [], items: [], request_key: crypto.randomUUID() });
const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-white';
const buttonClass = 'rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50';

export default function SupplierAccount({ supplier, onClose }) {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [originalSize, setOriginalSize] = useState(false);
  const photoRequest = useRef(0);
  function closeEntry() { photoRequest.current += 1; setPhotos(null); setZoomPhoto(null); }
  useEffect(() => {
    const handleEscape = event => {
      if (event.key !== 'Escape') return;
      if (zoomPhoto) { setZoomPhoto(null); setOriginalSize(false); }
      else if (photos) closeEntry();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [photos, zoomPhoto]);
  const [bills, setBills] = useState(null);
  const [billId, setBillId] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyYear, setHistoryYear] = useState('');
  const [historyKind, setHistoryKind] = useState('');
  const [showProducts, setShowProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productSort, setProductSort] = useState('name');
  const products = account?.products || [];
  const filteredProducts = products.filter(product => {
    const query = productSearch.trim().toLowerCase();
    return (!query || `${product.product_name} ${product.product_code || ''}`.toLowerCase().includes(query)) &&
      (!productStock || (productStock === 'in' ? Number(product.stock_qty) > 0 : Number(product.stock_qty) <= 0));
  }).sort((a, b) => {
    if (productSort === 'price-low') return Number(a.buying_price) - Number(b.buying_price);
    if (productSort === 'price-high') return Number(b.buying_price) - Number(a.buying_price);
    if (productSort === 'stock-low') return Number(a.stock_qty) - Number(b.stock_qty);
    if (productSort === 'stock-high') return Number(b.stock_qty) - Number(a.stock_qty);
    return a.product_name.localeCompare(b.product_name);
  });
  const entries = account?.entries || [];
  const historyYears = [...new Set(entries.map(entry => entry.date.slice(0, 4)))].sort().reverse();
  const filteredEntries = entries.filter(entry =>
    (!historySearch.trim() || (entry.reference || '').toLowerCase().includes(historySearch.trim().toLowerCase())) &&
    (!historyMonth || entry.date.slice(5, 7) === historyMonth) &&
    (!historyYear || entry.date.slice(0, 4) === historyYear) &&
    (!historyKind || entry.kind === historyKind)
  );
  const filteredPurchases = filteredEntries.filter(entry => entry.kind === 'purchase').reduce((sum, entry) => sum + Math.round(Number(entry.amount) * 100), 0) / 100;
  const filteredPayments = filteredEntries.filter(entry => entry.kind === 'payment').reduce((sum, entry) => sum + Math.round(Number(entry.amount) * 100), 0) / 100;
  const saving = useRef(false);
  const base = `/api/suppliers/${supplier.id}/account`;
  async function api(path = '', options = {}) {
    const response = await fetch(base + path, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Supplier account request failed.');
    return data;
  }
  async function load() { setAccount(await api()); }
  useEffect(() => { load().catch(e => setError(e.message)); }, [supplier.id]);
  async function upload(event) {
    const files = [...event.target.files];
    event.target.value = '';
    setError('');
    if (files.length + form.photos.length > 4 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2000000)) {
      setError('Choose up to four JPG/PNG/WebP photos, each under 2 MB.'); return;
    }
    setUploading(true);
    try {
      const images = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read photo.')); reader.readAsDataURL(file);
      })));
      setForm(current => ({ ...current, photos: [...current.photos, ...images] }));
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  }
  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await api('', { method: 'POST', body: JSON.stringify({ ...form, bill_numbers: form.kind === 'payment' ? form.reference : undefined }) });
      setForm(null); setNotice('Entry saved.'); await load();
    } catch (e) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  }
  async function linkBill() {
    if (!billId || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await api(`/imports/${billId}`, { method: 'POST' });
      setBills(null); setBillId(''); setNotice('Imported bill added to this supplier account.'); await load();
    } catch (e) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  }
  async function viewPhotos(entry) {
    const request = ++photoRequest.current;
    setPhotos({ entry, images: [], loading: true, error: '' });
    try {
      const data = await api(`/${entry.id}/photos`);
      if (request === photoRequest.current) setPhotos({ entry, images: data.photos, loading: false, error: '' });
    } catch (e) {
      if (request === photoRequest.current) setPhotos({ entry, images: [], loading: false, error: e.message });
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-6 flex items-center justify-center">
      <div role="dialog" aria-modal="true" aria-label={`${supplier.company_name} account`} className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-3xl bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200">
        <div className="flex justify-between items-start gap-3">
          <div><h2 className="text-xl font-bold">{supplier.company_name}</h2><p className="text-sm text-slate-500">Supplier purchases & payments · {supplier.supplier_name}</p></div>
          <button onClick={onClose} disabled={busy || uploading} aria-label="Close supplier account" className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-bold"><X className="h-4 w-4" />Close</button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-rose-500">{error}</p>}
        {notice && <p role="status" className="text-emerald-600">{notice}</p>}
        {!account ? <button onClick={() => load().catch(e => setError(e.message))} className={buttonClass}>Load account</button> : <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[["Total Purchases", account.totals.purchases], ["Paid / Deposits", account.totals.payments], ["Outstanding Debt", Math.max(0, account.totals.balance)], ["Advance Credit", Math.max(0, -account.totals.balance)]].map(([label, amount]) => (
              <div key={label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{money(amount)}</p></div>
            ))}
          </div>
          <p className="text-xs text-slate-500">Totals include recorded purchases and linked imported bills. Add older bills and payments to include them in the balance.</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || uploading} className={buttonClass} onClick={() => { setForm(newForm('purchase')); setBills(null); setNotice(''); }}>Add Purchase Bill</button>
            <button disabled={busy || uploading} className={buttonClass} onClick={() => { setForm(newForm('payment')); setBills(null); setNotice(''); }}>Add Deposit / Payment</button>
            <button disabled={busy || uploading} className={buttonClass} onClick={async () => { try { setBills((await api('/imports')).bills); setForm(null); } catch (e) { setError(e.message); } }}>Link Imported Bill</button>
          </div>
          {bills && <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm">Choose a bill belonging to {supplier.company_name}. Linking adds its full total and photo once.</p>
            <select aria-label="Imported bill" value={billId} onChange={e => setBillId(e.target.value)} className={inputClass}>
              <option value="">Select imported bill</option>
              {bills.map(b => <option key={b.id} value={b.id}>{b.supplier_name} · {b.bill_number} · {b.date} · {money(b.total)}</option>)}
            </select>
            {!bills.length && <p>No unlinked imported bills available.</p>}
            <button disabled={!billId || busy} onClick={linkBill} className={buttonClass}>Link Bill</button>
            <button disabled={busy} onClick={() => setBills(null)} className="ml-3 text-sm">Cancel</button>
          </div>}
          {form && <form onSubmit={save} className="rounded-2xl border border-amber-500/40 bg-white dark:bg-slate-950 p-4 space-y-4">
            <div className="flex justify-between gap-3"><h3 className="font-bold">{form.kind === 'purchase' ? 'New Purchase Bill' : 'New Deposit / Payment'}</h3><button type="button" disabled={busy || uploading} onClick={() => setForm(null)} className="flex items-center gap-1 text-sm font-bold"><X className="h-4 w-4" />Close</button></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">Date<input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} /></label>
              <label className="text-sm">{form.kind === 'purchase' ? 'Bill Number' : 'Bill Nos (Optional)'}<input required={form.kind === 'purchase'} placeholder={form.kind === 'payment' ? 'e.g. 1236, 1237' : ''} maxLength={100} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className={inputClass} /></label>
            </div>
            <label className="block text-sm">{form.kind === 'purchase' ? 'Bill Total Amount (Rs.)' : 'Amount Paid (Rs.)'}<input type="number" required min="0.01" max="999999999.99" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} /></label>
            <label className="block text-sm">Notes<textarea maxLength={1000} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className={inputClass} /></label>
            <label className="block text-sm">{form.kind === 'purchase' ? 'Bill Photos' : 'Deposit / Payment Receipt Photos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || busy} onChange={upload} className="block mt-2 text-xs" /><span className="text-xs text-slate-500">Up to 4 photos, 2 MB each.</span></label>
            <div className="flex flex-wrap gap-3">{form.photos.map((photo, i) => <div key={i}><img src={photo} alt={`Attachment ${i + 1}`} className="h-24 w-24 object-contain rounded-lg" /><button type="button" className="text-xs text-rose-500" onClick={() => setForm({ ...form, photos: form.photos.filter((_, n) => n !== i) })}>Remove photo</button></div>)}</div>
            <button disabled={busy || uploading} className={buttonClass}>{busy ? 'Saving…' : uploading ? 'Reading photos…' : 'Save Entry'}</button>
            <button type="button" disabled={busy || uploading} className="ml-4 text-sm" onClick={() => setForm(null)}>Cancel</button>
          </form>}
          <section className="space-y-3"><h3 className="font-bold">Purchase & Payment History</h3>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="text-sm">Search Bill No<input type="search" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Enter bill number..." className={inputClass} /></label>
                <label className="text-sm">Month<select value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} className={inputClass}>
                  <option value="">All Months</option>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
                </select></label>
                <label className="text-sm">Year<select value={historyYear} onChange={e => setHistoryYear(e.target.value)} className={inputClass}>
                  <option value="">All Years</option>
                  {historyYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select></label>
                <label className="text-sm">Entry Type<select value={historyKind} onChange={e => setHistoryKind(e.target.value)} className={inputClass}>
                  <option value="">All Entries</option><option value="purchase">Purchases</option><option value="payment">Deposits / Payments</option>
                </select></label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p role="status" className="text-xs text-slate-500">Showing {filteredEntries.length} of {entries.length} entries</p>
                <button type="button" onClick={() => { setHistorySearch(''); setHistoryMonth(''); setHistoryYear(''); setHistoryKind(''); }} className="text-sm font-semibold text-amber-600">Clear Filters</button>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p>Filtered Purchases: <strong>{money(filteredPurchases)}</strong></p>
                <p>Filtered Payments: <strong>{money(filteredPayments)}</strong></p>
              </div>
            </div>
            {!filteredEntries.length && <p className="text-sm text-slate-500">{entries.length ? 'No bills or payments match these filters.' : 'No bills or payments recorded yet.'}</p>}
            {filteredEntries.map(entry => <details key={entry.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-950">
              <summary className="cursor-pointer text-sm font-semibold">{entry.date} · {entry.kind === 'purchase' ? 'Purchase' : 'Payment / Deposit'} · {entry.reference} · {money(entry.amount)}</summary>
              <div className="mt-3 space-y-2">
                {entry.items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>{entry.items.map((item, i) => <tr key={i}><td className="py-2">{item.name}</td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div>}
                {entry.note && <p className="text-xs text-slate-500">{entry.note}</p>}
                <button onClick={() => viewPhotos(entry)} className="text-sm font-bold text-amber-600">View Bill / Receipt Photos</button>
              </div>
            </details>)}
          </section>
          <section className="space-y-3">
            <button type="button" aria-expanded={showProducts} aria-controls="supplier-linked-products" onClick={() => setShowProducts(value => !value)} className={buttonClass}>{showProducts ? 'Hide Products' : 'View Products'}</button>
            {showProducts && <div id="supplier-linked-products" className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Products Currently Linked to This Supplier</h3><button type="button" onClick={() => setShowProducts(false)} className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-bold"><X className="h-4 w-4" />Close</button></div>
            <p className="text-xs text-slate-500">Current stock is shown here. Purchased quantities appear in the bill history above.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm">Search Product / Code<input type="search" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Product name or code..." className={inputClass} /></label>
              <label className="text-sm">Stock<select value={productStock} onChange={e => setProductStock(e.target.value)} className={inputClass}><option value="">All Stock</option><option value="in">In Stock</option><option value="out">Out of Stock</option></select></label>
              <label className="text-sm">Sort By<select value={productSort} onChange={e => setProductSort(e.target.value)} className={inputClass}><option value="name">Product Name A–Z</option><option value="price-low">Buying Price: Low to High</option><option value="price-high">Buying Price: High to Low</option><option value="stock-low">Stock: Low to High</option><option value="stock-high">Stock: High to Low</option></select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-slate-500">Showing {filteredProducts.length} of {products.length} products</p><button type="button" onClick={() => { setProductSearch(''); setProductStock(''); setProductSort('name'); }} className="text-sm font-semibold text-amber-600">Clear Product Filters</button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Product</th><th>Code</th><th>Current Stock</th><th>Current Buying Price</th></tr></thead><tbody>{filteredProducts.map(p => <tr key={p.id} className="border-b border-slate-200 dark:border-slate-800"><td className="py-3">{p.product_name}</td><td>{p.product_code}</td><td>{p.stock_qty}</td><td>{money(p.buying_price)}</td></tr>)}</tbody></table></div>
            {!filteredProducts.length && <p className="text-sm text-slate-500">{products.length ? 'No products match these filters.' : 'No products linked yet.'}</p>}
            <button type="button" onClick={() => setShowProducts(false)} className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-bold"><X className="h-4 w-4" />Close Products</button>
            </div>}
          </section>
        </>}
        {photos && <div role="dialog" aria-modal="true" aria-label="Bill and payment details" className="fixed inset-0 z-[60] overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
          <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-8 py-4 flex justify-between items-center gap-4">
            <div><h2 className="text-lg font-bold">{photos.entry.kind === 'purchase' ? 'Purchase Bill' : 'Deposit / Payment'}</h2><p className="text-sm text-slate-500">{supplier.company_name}</p></div>
            <button type="button" autoFocus onClick={closeEntry} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-bold text-white"><X className="h-5 w-5" />Close</button>
          </div>
          <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="grid sm:grid-cols-3 gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <div><p className="text-sm text-slate-500">Date</p><p className="font-bold">{photos.entry.date}</p></div>
              <div><p className="text-sm text-slate-500">{photos.entry.kind === 'purchase' ? 'Bill Number' : 'Bill Nos'}</p><p className="font-bold break-words">{photos.entry.reference || 'Not specified'}</p></div>
              <div><p className="text-sm text-slate-500">{photos.entry.kind === 'purchase' ? 'Bill Total' : 'Amount Paid'}</p><p className="font-bold text-xl">{money(photos.entry.amount)}</p></div>
            </div>
            {photos.entry.note && <div><h3 className="font-bold mb-2">Notes</h3><p className="whitespace-pre-wrap break-words">{photos.entry.note}</p></div>}
            {photos.entry.items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>{photos.entry.items.map((item, i) => <tr key={i}><td className="py-2">{item.name}</td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div>}
            <div><h3 className="font-bold mb-3">{photos.entry.kind === 'purchase' ? 'Bill Photos' : 'Deposit / Payment Receipt Photos'}</h3>
              {photos.loading && <p role="status">Loading photos...</p>}
              {photos.error && <div role="alert" className="text-rose-500">{photos.error}<button type="button" onClick={() => viewPhotos(photos.entry)} className="ml-3 underline">Retry</button></div>}
              {!photos.loading && !photos.error && !photos.images.length && <p className="text-slate-500">No photos attached.</p>}
              <div className="grid sm:grid-cols-2 gap-4">{photos.images.map((photo, i) => <button key={i} type="button" onClick={() => { setZoomPhoto({ src: photo, index: i }); setOriginalSize(false); }} aria-label={`Enlarge photo ${i + 1}`} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 hover:border-amber-500 text-left">
                <img src={photo} alt={`Bill / receipt ${i + 1}`} className="h-64 sm:h-80 w-full object-contain rounded-xl cursor-zoom-in" /><span className="block mt-2 text-sm font-bold text-amber-600">Photo {i + 1} - Click to enlarge</span>
              </button>)}</div>
            </div>
            <button type="button" onClick={closeEntry} className={buttonClass}>Close View</button>
          </div>
        </div>}
        {zoomPhoto && <div role="dialog" aria-modal="true" aria-label="Enlarged receipt photo" className="fixed inset-0 z-[70] bg-slate-950 text-white flex flex-col">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-slate-900 border-b border-slate-700 px-4 py-3">
            <h3 className="font-bold">Photo {zoomPhoto.index + 1}</h3>
            <div className="flex gap-3"><button type="button" onClick={() => setOriginalSize(value => !value)} className="rounded-xl border border-slate-600 px-3 py-2 text-sm">{originalSize ? 'Fit to Screen' : 'Original Size'}</button><button type="button" autoFocus onClick={() => { setZoomPhoto(null); setOriginalSize(false); }} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-bold"><X className="h-5 w-5" />Close Photo</button></div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3">
            <img src={zoomPhoto.src} alt={`Enlarged bill / receipt ${zoomPhoto.index + 1}`} onClick={() => setOriginalSize(value => !value)} className={originalSize ? 'max-w-none cursor-zoom-out' : 'w-full h-full object-contain cursor-zoom-in'} />
          </div>
        </div>}
      </div>
    </div>
  );
}
