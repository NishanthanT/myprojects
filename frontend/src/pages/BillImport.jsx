import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Upload, ScanLine, Save, Undo2, FileText, X } from 'lucide-react';
import { calculateBill, money } from '../utils/billImport.mjs';
import { parseBillText } from '../utils/billOcrParser.mjs';
import { readBillPhoto, rotateBillPhoto } from '../utils/localBillOcr.js';

const inputClass = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-semibold disabled:opacity-40';
const currency = value => Number(value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const blankBill = () => ({ number: '', date: today(), supplier_name: '', discount: 0, discount_type: 'amount', transport: 0, transport_mode: 'quantity', tax: 0, expected_total: '' });
const blankRow = () => ({ key: crypto.randomUUID(), product_id: '', product_name: '', product_code: '', barcode: '', brand: '', part_group: '',
  category_id: '', supplier_id: '', vehicle_type_id: '', vehicle_model_ids: [], unit_type: 'Piece', status: 'active', low_stock_limit: 5,
  quantity: 1, pieces_per_box: 1, free_units: 0, price: '', price_basis: 'unit', discount: 0, discount_type: 'amount', transport_share: 0,
  selling_price: '', markup: 25, images: [], notes: '' });
async function api(path, body) {
  const response = await fetch(`/api/${path}`, { method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Request failed.');
  return result;
}
function Field({ label, value, onChange, type = 'text', ...props }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}
    <input className={`${inputClass} mt-1`} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...(type === 'number' ? { min: 0, step: 'any' } : {})} {...props} />
  </label>;
}
function Select({ label, value, onChange, children, ...props }) {
  return <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}
    <select className={`${inputClass} mt-1`} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props}>{children}</select>
  </label>;
}
const options = list => list.map(([value, label]) => <option key={value} value={value}>{label}</option>);
const discountOptions = options([['amount', 'Rs. amount'], ['percent', '%']]);
function readPhoto(file, max = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > max) return reject(new Error(`Choose JPG, PNG or WebP under ${max / 1024 / 1024} MB.`));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.readAsDataURL(file);
  });
}

export default function BillImport() {
  const [bill, setBill] = useState(blankBill);
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [catalog, setCatalog] = useState({ products: [], categories: [], suppliers: [], types: [], models: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [columnOrder, setColumnOrder] = useState('auto');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const ocrAbort = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(null);
  const [deleted, setDeleted] = useState([]);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState(null);
  const [matchSearch, setMatchSearch] = useState({});
  const locked = Boolean(busy || saved || loading);
  const calculation = useMemo(() => { try { return { value: calculateBill(bill, rows) }; } catch (e) { return { error: e.message }; } }, [bill, rows]);
  const totals = calculation.value;
  const mismatch = !totals || bill.expected_total === '' || Math.abs(Number(bill.expected_total) - totals.total) > 0.011;
  const dirty = () => { setConfirmed(false); setError(''); setNotice(''); };
  const changeBill = (key, value) => { dirty(); setBill(prev => ({ ...prev, [key]: value })); };
  const changeRow = (key, patch) => { dirty(); setRows(prev => prev.map(row => row.key === key ? { ...row, ...patch } : row)); };
  async function load() {
    const [p, c, s, t, m, past] = await Promise.all([
      api('products'), api('products/categories'), api('suppliers'), api('products/vehicle-types'), api('products/vehicle-models'), api('bill-imports')
    ]);
    setCatalog({ products: p.products, categories: c.categories, suppliers: s.suppliers, types: t.types || [], models: m.models || [] });
    setHistory(past.imports);
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => () => ocrAbort.current?.abort(), []);
  useEffect(() => {
    const beforeUnload = event => { if (!saved && (rows.length || source)) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [rows.length, source, saved]);
  async function matchedRow(row, productId) {
    const detail = (await api(`products/${productId}`)).product;
    const list = catalog.products.find(p => String(p.id) === String(productId));
    return { ...row, product_id: detail.id, product_name: detail.product_name, product_code: detail.product_code, barcode: detail.barcode || '',
      brand: detail.brand || '', part_group: detail.part_group || '', category_id: detail.category_id || '', supplier_id: detail.supplier_id || '',
      vehicle_type_id: detail.vehicle_type_id || '', vehicle_model_ids: String(list?.vehicle_model_ids || '').split(',').filter(Boolean).map(Number),
      unit_type: detail.unit_type, status: detail.status, low_stock_limit: detail.low_stock_limit,
      selling_price: detail.selling_price, old_cost: detail.buying_price, old_stock: detail.stock_qty,
      images: detail.images?.length ? detail.images : (detail.image ? [detail.image] : []) };
  }
  async function match(key, productId) {
    if (!productId) { changeRow(key, { product_id: '', old_cost: undefined, old_stock: undefined }); return; }
    setBusy('Loading product details'); setError('');
    try { changeRow(key, await matchedRow(rows.find(r => r.key === key), productId)); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function extract() {
    if (rows.length && !window.confirm('Replace current review rows with a fresh reading of this bill?')) return;
    const controller = new AbortController();
    ocrAbort.current = controller;
    setBusy('Preparing free photo reader'); setOcrProgress(0); dirty();
    try {
      const result = await readBillPhoto(source, { language: ocrLanguage, signal: controller.signal, onProgress: event => {
        if (event.status === 'recognizing text') { setBusy('Reading bill photo locally'); setOcrProgress(Math.round((event.progress || 0) * 100)); }
        if (event.status === 'checking orientation') { setBusy('Checking bill orientation'); setOcrProgress(0); }
      } });
      if (controller.signal.aborted) return;
      setOcrText(result.text); setOcrConfidence(result.confidence);
      if (result.rotation) setSource(result.orientedSource);
      ocrAbort.current = null;
      await applyText(result.text, false);
    } catch (e) {
      if (e.name === 'AbortError') setNotice('Photo reading cancelled. Existing review rows were kept.');
      else setError(`Could not read this photo: ${e.message}. Try a clearer photo, or type the bill text below.`);
    } finally { ocrAbort.current = null; setBusy(''); }
  }
  async function applyText(text = ocrText, ask = true) {
    if (ask && rows.length && !window.confirm('Replace review rows using this edited bill text?')) return;
    setBusy('Preparing review rows'); dirty();
    try {
      const extracted = parseBillText(text, columnOrder);
      const b = extracted.bill;
      const cleanBill = blankBill();
      for (const key of ['number', 'date', 'supplier_name', 'discount', 'discount_type', 'transport', 'tax', 'expected_total']) cleanBill[key] = ['string', 'number'].includes(typeof b[key]) ? b[key] : '';
      for (const key of ['number', 'date', 'supplier_name']) cleanBill[key] = String(cleanBill[key]);
      const headerLines = text.split(/\r?\n/).slice(0, 10).map(line => line.trim().toLowerCase());
      const supplierMatches = catalog.suppliers.filter(s => s.supplier_name.toLowerCase() === String(b.supplier_name).toLowerCase() || (!b.supplier_name && headerLines.includes(s.supplier_name.toLowerCase())));
      const supplier = supplierMatches.length === 1 ? supplierMatches[0] : null;
      if (supplier && !cleanBill.supplier_name) cleanBill.supplier_name = supplier.supplier_name;
      const next = [];
      for (const extractedRow of extracted.rows) {
        const row = blankRow();
        for (const key of ['product_name', 'product_code', 'barcode', 'brand', 'part_group', 'unit_type', 'quantity', 'pieces_per_box', 'free_units', 'price', 'price_basis', 'discount', 'discount_type', 'notes']) row[key] = ['string', 'number'].includes(typeof extractedRow[key]) ? extractedRow[key] : '';
        for (const key of ['product_name', 'product_code', 'barcode', 'brand', 'part_group', 'notes']) row[key] = String(row[key]);
        row.supplier_id = supplier?.id || '';
        row.category_id = catalog.categories.find(c => c.category_name.toLowerCase() === String(extractedRow.category_name).toLowerCase())?.id || '';
        row.vehicle_type_id = catalog.types.find(t => t.type_name.toLowerCase() === String(extractedRow.vehicle_type_name).toLowerCase())?.id || '';
        row.vehicle_model_ids = catalog.models.filter(m => String(m.vehicle_type_id) === String(row.vehicle_type_id) && Array.isArray(extractedRow.vehicle_model_names) && extractedRow.vehicle_model_names.includes(m.model_name)).map(m => m.id);
        const nameTokens = row.product_name.toLowerCase().split(/[\s|,]+/);
        const matches = catalog.products.filter(p => (row.barcode && p.barcode === row.barcode)
          || (row.product_code && p.product_code.toLowerCase() === row.product_code.toLowerCase())
          || (!row.product_code && (nameTokens.includes(p.product_code.toLowerCase()) || p.product_name.toLowerCase() === row.product_name.toLowerCase())));
        next.push(matches.length === 1 ? await matchedRow(row, matches[0].id) : row);
      }
      setBill(cleanBill); setRows(next); setDeleted([]);
      setWarnings(Array.isArray(extracted.warnings) ? extracted.warnings.map(String) : []);
      setNotice(next.length ? 'Reading complete. Check every row, pack size, discount and product match against the photo.' : 'Text was read, but no rows could be mapped safely. Edit the recognized text / column order below or add product rows manually.');
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function uploadSource(file) {
    if (!file) return;
    if ((source || rows.length) && !window.confirm('Start a new bill? Current unsaved review will be cleared.')) return;
    try {
      const data = await readPhoto(file);
      setSource(data); setSourceName(file.name); setRows([]); setBill(blankBill()); setSaved(null); setDeleted([]); setWarnings([]); setRequestKey(crypto.randomUUID()); dirty();
      setOcrText(''); setOcrConfidence(null);
    } catch (e) { setError(e.message); }
  }
  async function rotatePhoto(degrees) {
    setBusy('Rotating bill photo'); dirty();
    try { setSource(await rotateBillPhoto(source, degrees)); }
    catch { setError('Could not rotate this photo. Try uploading it again.'); }
    finally { setBusy(''); }
  }
  async function addImages(key, files) {
    setBusy('Loading photos');
    try {
      const row = rows.find(r => r.key === key);
      if (row.images.length + files.length > 8) throw new Error('Maximum 8 product photos per row.');
      const images = await Promise.all(Array.from(files).map(f => readPhoto(f, 1.4 * 1024 * 1024)));
      changeRow(key, { images: [...row.images, ...images] });
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  async function save() {
    if (!confirmed || !totals || mismatch) return;
    setBusy('Saving bill and stock'); setError('');
    try {
      const payload = { request_key: requestKey, source, bill, rows, confirmed };
      if (JSON.stringify(payload).length > 24000000) throw new Error('Combined photos are too large. Use smaller product photos.');
      const result = await api('bill-imports', payload);
      setSaved(result.id); setNotice(`Bill import #${result.id} saved. Stock updated${result.already_saved ? ' previously; no duplicate stock added' : ''}.`);
      try { await load(); } catch { setNotice(`Bill import #${result.id} saved. Refresh the page to reload history.`); }
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  function reset() {
    if (!saved && (rows.length || source) && !window.confirm('Discard this unsaved bill review?')) return;
    setSource(''); setSourceName(''); setRows([]); setBill(blankBill()); setSaved(null); setDeleted([]); setWarnings([]); setRequestKey(crypto.randomUUID()); dirty();
    setOcrText(''); setOcrConfidence(null);
  }
  const summary = totals && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[[`Stock units`, totals.units], ['After item discounts', `Rs. ${currency(totals.subtotal)}`], ['Bill discount', `Rs. ${currency(totals.billDiscount)}`], ['Final landed total', `Rs. ${currency(totals.total)}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3"><div className="text-xs text-slate-500">{label}</div><strong>{value}</strong></div>)}
  </div>;

  return <div className="space-y-6 text-slate-900 dark:text-slate-100 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Supplier Bill Import</h1><p className="text-sm text-slate-500">Photo → review & edit → confirm → add stock</p></div><button className={buttonClass} disabled={Boolean(busy)} onClick={reset}>New bill</button></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</div>}
    {notice && <div role="status" className="rounded-xl bg-emerald-50 text-emerald-800 p-4">{notice}</div>}
    {busy && <p role="status" className="font-semibold text-amber-600">{busy}…</p>}
    <p className="rounded-xl bg-emerald-50 text-emerald-900 p-4 text-sm">Free photo reader — no API key, subscription or per-bill charge. Reading happens on this device. Always review the extracted values before saving stock.</p>
    <div className="grid xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)] gap-5 items-start">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 xl:sticky xl:top-4">
        <h2 className="font-bold flex items-center gap-2"><FileText size={18} /> 1. Original bill photo</h2>
        <label className={`${buttonClass} cursor-pointer w-full`}><Upload size={16} /> Upload / take photo<input aria-label="Upload bill photo" disabled={locked} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { uploadSource(e.target.files[0]); e.target.value = ''; }} /></label>
        <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 8 MB. Clear printed bills work best. The photo stays on this device during reading; Confirm & Save stores it in your POS database.</p>
        <Select label="Bill language" value={ocrLanguage} disabled={locked} onChange={setOcrLanguage}>{options([['eng', 'English'], ['eng+tam', 'Tamil + English'], ['eng+sin', 'Sinhala + English']])}</Select>
        {source && <div className="flex gap-2"><button className={buttonClass} disabled={locked} onClick={() => rotatePhoto(-90)}>Rotate left ↶</button><button className={buttonClass} disabled={locked} onClick={() => rotatePhoto(90)}>Rotate right ↷</button></div>}
        {source ? <><a href={source} target="_blank" rel="noreferrer"><img src={source} alt="Original supplier bill — open to zoom" className="w-full max-h-[65vh] object-contain rounded-lg bg-white" /></a><p className="text-xs break-all">{sourceName} · Click photo to zoom</p></> : <div className="border-2 border-dashed rounded-xl py-16 text-center text-slate-400">Upload a clear, complete bill photo</div>}
        <button className={`${buttonClass} bg-amber-500 border-amber-500 text-white w-full`} disabled={locked || !source} onClick={extract}><ScanLine size={18} /> Read bill photo — free</button>
        {ocrAbort.current && <div className="space-y-2"><progress aria-label="Photo reading progress" className="w-full" max="100" value={ocrProgress} /><button className={buttonClass} onClick={() => ocrAbort.current?.abort()}>Cancel reading</button></div>}
      </section>
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <h2 className="font-bold">2. Bill details & costs</h2>
        <fieldset disabled={locked} className="grid sm:grid-cols-2 gap-3">
          <Field label="Supplier name *" value={bill.supplier_name} onChange={v => changeBill('supplier_name', v)} maxLength={150} />
          <Field label="Bill number *" value={bill.number} onChange={v => changeBill('number', v)} maxLength={100} />
          <Field label="Bill date *" type="date" value={bill.date} onChange={v => changeBill('date', v)} />
          <Field label="Grand total to reconcile (Rs.) *" type="number" value={bill.expected_total} onChange={v => changeBill('expected_total', v)} />
          <Field label="Additional bill discount" type="number" value={bill.discount} onChange={v => changeBill('discount', v)} />
          <Select label="Bill discount type" value={bill.discount_type} onChange={v => changeBill('discount_type', v)}>{discountOptions}</Select>
          <Field label="Total transport (Rs.)" type="number" value={bill.transport} onChange={v => changeBill('transport', v)} />
          <Select label="Split transport" value={bill.transport_mode} onChange={v => changeBill('transport_mode', v)}>{options([['quantity', 'Equally per stock unit'], ['value', 'By discounted product value'], ['manual', 'Manual amount per row']])}</Select>
          <Field label="Tax / other purchase cost (Rs.)" type="number" value={bill.tax} onChange={v => changeBill('tax', v)} />
        </fieldset>
        <p className="text-xs text-slate-500">Enter each charge once. Tax / other cost is split by value after discounts. Reconciliation total must include transport added separately from the supplier bill. Equal transport assumes comparable units; use manual allocation for mixed units.</p>
        {summary}
        {rows.length > 0 && <p className={`text-sm ${mismatch ? 'text-red-600' : 'text-emerald-600'}`}>{calculation.error || (mismatch ? 'Total mismatch — check the bill and all charges before saving.' : 'Totals match. Still check each product and quantity.')}</p>}
        {warnings.length > 0 && <ul className="list-disc pl-5 text-sm text-amber-700">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      </section>
    </div>
    <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4" open={Boolean(ocrText && !rows.length)}>
      <summary className="cursor-pointer font-semibold">Recognized bill text / fix table columns</summary>
      <div className="mt-4 space-y-3">
        {ocrConfidence !== null && <p className="text-xs text-slate-500">Text recognition score: {Math.round(ocrConfidence)} / 100. This is not a guarantee of correct prices or products.</p>}
        <p className="text-sm text-slate-500">Check for missed products. You can correct this text without paying or reading the photo again. For difficult layouts, put each product on one line and separate columns with |.</p>
        <Select label="Product column order" disabled={locked} value={columnOrder} onChange={setColumnOrder}>{options([
          ['auto', 'Detect from English table headings / simple rows'],
          ['name,quantity,price,total', 'Name | Quantity | Unit price | Amount'],
          ['code,name,quantity,price,total', 'Code | Name | Quantity | Unit price | Amount'],
          ['code,name,quantity,price,discount,total', 'Code | Name | Quantity | Unit price | Discount | Amount'],
          ['name,quantity,price,discount,total', 'Name | Quantity | Unit price | Discount | Amount'],
          ['name,price,quantity,total', 'Name | Unit price | Quantity | Amount'],
          ['name,quantity,price', 'Name | Quantity | Unit price']
        ])}</Select>
        <label className="block text-sm">Bill text<textarea className={`${inputClass} font-mono mt-1`} rows={12} maxLength={100000} value={ocrText} disabled={locked} onChange={e => setOcrText(e.target.value)} placeholder={'Supplier: ABC Traders\nInvoice No: INV001\nDate: 29/09/2026\nDescription | Qty | Rate | Amount\nBearing 6205 | 10 | 800 | 8000\nGrand Total: 8000'} /></label>
        <button className={buttonClass} disabled={locked || !ocrText.trim()} onClick={() => applyText()}>Apply text to review rows</button>
      </div>
    </details>
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">3. Review products ({rows.length})</h2><div className="flex gap-2">
        <button className={buttonClass} disabled={locked || !deleted.length} onClick={() => { dirty(); setRows(prev => [...prev, deleted[deleted.length - 1]]); setDeleted(prev => prev.slice(0, -1)); }}><Undo2 size={16} /> Undo delete</button>
        <button className={buttonClass} disabled={locked || rows.length >= 200} onClick={() => { dirty(); setRows(prev => [...prev, blankRow()]); }}><Plus size={16} /> Add row</button>
      </div></div>
      {!rows.length && <p className="p-8 text-center rounded-2xl border border-dashed text-slate-500">Read the bill photo or add a review row. Your existing manual Product Add page is unchanged.</p>}
      {rows.map((row, index) => {
        const calc = totals?.lines[index];
        const field = (label, key, type = 'text', props = {}) => <Field label={label} value={row[key]} type={type} onChange={v => changeRow(row.key, { [key]: v })} {...props} />;
        const select = (label, key, choices) => <Select label={label} value={row[key]} onChange={v => changeRow(row.key, { [key]: v })}>{choices}</Select>;
        const search = (matchSearch[row.key] || '').toLowerCase();
        const matching = catalog.products.filter(p => String(p.id) === String(row.product_id) || `${p.product_name} ${p.product_code} ${p.barcode || ''}`.toLowerCase().includes(search));
        return <article key={row.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 space-y-4 bg-white dark:bg-slate-900">
          <div className="flex justify-between items-start gap-3"><h3 className="font-bold">{index + 1}. {row.product_name || 'New product'} <span className="text-xs text-amber-600">{row.product_id ? 'Existing product · add stock' : 'Create new product'}</span></h3><button className={`${buttonClass} text-red-600`} disabled={locked} onClick={() => { dirty(); setDeleted(prev => [...prev, row]); setRows(prev => prev.filter(r => r.key !== row.key)); }} aria-label={`Delete row ${index + 1}`}><Trash2 size={16} /></button></div>
          <fieldset disabled={locked} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Search existing products to match" value={matchSearch[row.key] || ''} onChange={v => setMatchSearch(prev => ({ ...prev, [row.key]: v }))} placeholder="Name, part number or barcode" />
              <Select label="Product match — verify carefully" value={row.product_id} onChange={v => match(row.key, v)}><option value="">Create as new product</option>{matching.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>)}</Select>
            </div>
            {row.product_id && <p className="text-xs text-slate-500">Current stock: {row.old_stock} · Previous buying price: Rs. {currency(row.old_cost)}. Saving adds received units and updates this product's reviewed details and buying price to the new unit cost.</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {field('Product name *', 'product_name')}{field('Product / part code *', 'product_code')}{field('Barcode', 'barcode')}{field('Brand *', 'brand')}
              {select('Category', 'category_id', <><option value="">None</option>{catalog.categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}</>)}
              {select('Supplier', 'supplier_id', <><option value="">None</option>{catalog.suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</>)}
              {field('Part group', 'part_group')}
              {select('Stock / selling unit', 'unit_type', options(['Piece', 'Litre', 'Millilitre', 'Kg', 'Gram'].map(v => [v, v])))}
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500">BOX / UNIT COST — for 2 boxes of 10, enter quantity 2 and units per box 10. For loose units, use units per box 1.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {field('Paid quantity (boxes / loose units) *', 'quantity', 'number')}{field('Units per box *', 'pieces_per_box', 'number', { step: 1, min: 1 })}
                {field('Free individual units', 'free_units', 'number')}{select('Bill price is per', 'price_basis', options([['unit', 'Individual stock unit'], ['box', 'Box']]))}
                {field('Price before discount (Rs.) *', 'price', 'number')}{field('Whole-line discount', 'discount', 'number')}
                {select('Item discount type', 'discount_type', discountOptions)}
                {bill.transport_mode === 'manual' && field('This row transport total (Rs.)', 'transport_share', 'number')}
              </div>
              {calc && <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                <div>Stock to add<strong className="block">{calc.units} {row.unit_type}</strong></div>
                <div>Item + bill discount<strong className="block">Rs. {currency(calc.itemDiscount + calc.billDiscount)}</strong></div>
                <div>Transport share<strong className="block">Rs. {currency(calc.transport)}</strong></div>
                <div>Tax / other share<strong className="block">Rs. {currency(calc.tax)}</strong></div>
                <div className="text-emerald-600">Final buying cost / unit<strong className="block text-lg">Rs. {currency(calc.unitCost)}</strong></div>
              </div>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              {field('Selling price per stock unit (Rs.) *', 'selling_price', 'number')}{field('Suggested markup on cost (%)', 'markup', 'number')}
              <button className={buttonClass} type="button" disabled={!calc || !Number.isFinite(Number(row.markup)) || Number(row.markup) < 0} onClick={() => changeRow(row.key, { selling_price: money(calc.unitCost * (1 + Number(row.markup) / 100)) })}>Apply markup suggestion</button>
              <p className={`text-sm font-bold ${calc && Number(row.selling_price) < calc.unitCost ? 'text-red-600' : 'text-emerald-600'}`}>{calc && row.selling_price !== '' ? `Unit profit: Rs. ${currency(Number(row.selling_price) - calc.unitCost)}${Number(row.selling_price) < calc.unitCost ? ' — below cost!' : ''}` : 'Enter a selling price'}</p>
            </div>
            <details><summary className="cursor-pointer text-sm font-semibold">Vehicle details, stock alert, status & photos</summary>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                <Select label="Vehicle type" value={row.vehicle_type_id} onChange={v => changeRow(row.key, { vehicle_type_id: v, vehicle_model_ids: [] })}><option value="">None</option>{catalog.types.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}</Select>
                <label className="text-xs font-semibold">Vehicle models<select multiple aria-label="Vehicle models" className={`${inputClass} mt-1`} value={row.vehicle_model_ids.map(String)} onChange={e => changeRow(row.key, { vehicle_model_ids: Array.from(e.target.selectedOptions).map(o => Number(o.value)) })}>{catalog.models.filter(m => String(m.vehicle_type_id) === String(row.vehicle_type_id)).map(m => <option key={m.id} value={m.id}>{m.model_name}</option>)}</select></label>
                {field('Low-stock alert', 'low_stock_limit', 'number')}{select('Status', 'status', options([['active', 'Active'], ['inactive', 'Inactive']]))}
              </div>
              <div className="mt-4 space-y-3"><p className="text-xs text-slate-500">Matched products automatically use saved photos. For new products, upload actual photos. Online photo lookup is not configured.</p>
                <div className="flex flex-wrap gap-3">{row.images.map((src, i) => <div key={i} className="relative"><a href={src} target="_blank" rel="noreferrer"><img src={src} alt={`${row.product_name || 'Product'} ${i + 1}`} className="w-24 h-24 object-contain rounded border bg-white" /></a><button type="button" aria-label={`Remove photo ${i + 1}`} className="absolute right-0 top-0 rounded bg-red-600 text-white p-1" onClick={() => changeRow(row.key, { images: row.images.filter((_, n) => n !== i) })}><X size={14} /></button></div>)}</div>
                <label className={`${buttonClass} cursor-pointer`}><Upload size={16} /> Add product photos<input aria-label="Add product photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { addImages(row.key, e.target.files); e.target.value = ''; }} /></label><span className="text-xs text-slate-500 ml-2">Up to 8, each under 1.4 MB. Remove and upload to replace.</span>
              </div>
            </details>
            {row.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Check: {row.notes}</p>}
            {field('Review notes / uncertain values', 'notes')}
          </fieldset>
        </article>;
      })}
    </section>
    {rows.length > 0 && <section className="rounded-2xl border border-amber-300 p-5 space-y-4">
      <h2 className="font-bold">4. Confirm & save</h2>{summary}
      <p className="text-xs text-slate-500">Buying prices are rounded to 2 decimals; the exact allocated line costs are retained with this bill. A saved bill is read-only here to prevent adding stock twice.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" disabled={locked || mismatch} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I checked the photo, all product matches, unit/box quantities, discounts, transport, photos and selling prices. Update the reviewed products and add this stock.</label>
      <button className={`${buttonClass} bg-amber-500 text-white border-amber-500`} disabled={locked || !confirmed || mismatch || !source} onClick={save}><Save size={18} />{saved ? `Saved as #${saved}` : 'Confirm & Save Stock'}</button>
    </section>}
    <section className="space-y-3"><h2 className="font-bold">Recent saved bills</h2><div className="flex flex-wrap gap-2">{history.map(item => <button key={item.id} className={buttonClass} onClick={async () => { try { setView((await api(`bill-imports/${item.id}`)).bill); } catch (e) { setError(e.message); } }}>{item.bill_number} · {item.supplier_name} · Rs. {currency(item.total)}</button>)}{!history.length && <p className="text-sm text-slate-500">No saved bill imports yet.</p>}</div></section>
    {view && <div className="fixed inset-0 z-50 bg-black/60 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Saved bill"><div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"><div className="flex justify-between"><h2 className="font-bold">Saved bill #{view.id}: {view.bill_number}</h2><button aria-label="Close saved bill" onClick={() => setView(null)}><X /></button></div><img src={view.source_image} alt="Saved original bill" className="max-h-[60vh] w-full object-contain" /><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Product</th><th>Units added</th><th>Unit cost</th><th>Selling price</th></tr></thead><tbody>{view.review.rows.map((r, i) => <tr key={i}><td className="py-2">{r.product_code} · {r.product_name}</td><td>{r.calculation.units}</td><td>Rs. {currency(r.calculation.unitCost)}</td><td>Rs. {currency(r.selling_price)}</td></tr>)}</tbody></table></div><p>Total: Rs. {currency(view.total)} · Saved bills cannot be imported again.</p></div></div>}
  </div>;
}
