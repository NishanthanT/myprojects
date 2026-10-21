import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, ChevronDown, Truck, Trash2, Eye, Download, Edit3,
  FileText, FileSpreadsheet, ArrowLeft, ShoppingBag, X, Zap, PackageMinus
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useShop } from '../context/ShopContext.jsx';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const COLUMN_DEFS = [
  { key: 'photo', label: 'Product Photo (View / PDF)', default: false },
  { key: 'category_name', label: 'Category', default: true },
  { key: 'vehicle_type_name', label: 'Vehicle Type', default: true },
  { key: 'vehicle_model_names', label: 'Model', default: true },
  { key: 'brand', label: 'Brand', default: false },
  { key: 'stock', label: 'Current Stock', default: true },
  { key: 'buying_price', label: 'Price', default: false }
];

const stockOf = (item) => item.stock_qty ?? item.stock_at_order ?? '';
const priceOf = (item) => item.buying_price != null && item.buying_price !== '' ? `Rs. ${parseFloat(item.buying_price).toFixed(2)}` : '—';
const formatModels = (names) => (names || '').split('||').filter(Boolean).join(', ');

const Orders = () => {
  const { shopInfo } = useShop();

  const [viewMode, setViewMode] = useState('history'); // 'history' | 'browse' | 'selected' | 'view-order'
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });
  const triggerAlert = (type, message) => setAlert({ show: true, type, message });
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null });
  const askConfirm = (title, message, onConfirm) => setConfirmState({ show: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmState({ show: false, title: '', message: '', onConfirm: null });

  // ── Order history ─────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch { triggerAlert('error', 'Failed to load order history.'); }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Catalog data for the builder ────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const fetchCatalog = async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const [prodRes, catRes, vtRes, vmRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/products/categories', { headers }),
        fetch('/api/products/vehicle-types', { headers }),
        fetch('/api/products/vehicle-models', { headers })
      ]);
      const [prodData, catData, vtData, vmData] = await Promise.all([
        prodRes.json(), catRes.json(), vtRes.json(), vmRes.json()
      ]);
      if (prodData.success) setProducts(prodData.products.filter(p => p.status === 'active'));
      if (catData.success) setCategories(catData.categories);
      if (vtData.success) setVehicleTypes(vtData.types);
      if (vmData.success) setVehicleModels(vmData.models);
      setCatalogLoaded(true);
    } catch { triggerAlert('error', 'Failed to load product catalog.'); }
  };

  const handleStartNewOrder = () => {
    if (editingOrderId !== null) setSelectedProducts({});
    setEditingOrderId(null);
    if (!catalogLoaded) fetchCatalog();
    setViewMode('browse');
  };

  // ── Browse / filter state ────────────────────────────────────
  const [searchVal, setSearchVal] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedModelFilter, setSelectedModelFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'lowstock' | 'fastmoving' | 'customqty'
  const [customQty, setCustomQty] = useState('');

  const [fastMoving, setFastMoving] = useState([]);
  const [fastMovingLoading, setFastMovingLoading] = useState(false);
  const [fastMovingLoaded, setFastMovingLoaded] = useState(false);

  const handleQuickFilter = async (filter) => {
    setQuickFilter(filter);
    if (filter === 'fastmoving' && !fastMovingLoaded) {
      setFastMovingLoading(true);
      try {
        const res = await fetch('/api/orders/fast-moving?period=month', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const data = await res.json();
        if (data.success) { setFastMoving(data.products); setFastMovingLoaded(true); }
      } catch { triggerAlert('error', 'Failed to load fast-moving items.'); }
      finally { setFastMovingLoading(false); }
    }
  };

  const filterBarModels = vehicleModels.filter(m =>
    !selectedTypeFilter || m.vehicle_type_id === parseInt(selectedTypeFilter)
  );

  const browseProducts = useMemo(() => {
    let base = products;
    if (quickFilter === 'lowstock') {
      base = products.filter(p => parseFloat(p.stock_qty) <= parseFloat(p.low_stock_limit));
    } else if (quickFilter === 'customqty') {
      base = customQty !== '' ? products.filter(p => parseFloat(p.stock_qty) <= parseFloat(customQty)) : [];
    } else if (quickFilter === 'fastmoving') {
      const ids = fastMoving.map(f => f.id);
      base = ids.map(id => products.find(p => p.id === id)).filter(Boolean);
    }

    return base.filter(p => {
      const matchSearch =
        p.product_name.toLowerCase().includes(searchVal.toLowerCase()) ||
        p.product_code.toLowerCase().includes(searchVal.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchVal));
      const matchCat = selectedCatFilter ? p.category_id === parseInt(selectedCatFilter) : true;
      const matchType = selectedTypeFilter ? p.vehicle_type_id === parseInt(selectedTypeFilter) : true;
      const matchModel = selectedModelFilter
        ? (p.vehicle_model_ids || '').split(',').includes(String(selectedModelFilter))
        : true;
      return matchSearch && matchCat && matchType && matchModel;
    });
  }, [products, quickFilter, customQty, fastMoving, searchVal, selectedCatFilter, selectedTypeFilter, selectedModelFilter]);

  // ── Selection state (keyed by product id — prevents duplicates) ─
  const [selectedProducts, setSelectedProducts] = useState({});
  const selectedCount = Object.keys(selectedProducts).length;
  const selectedList = useMemo(() => Object.values(selectedProducts), [selectedProducts]);

  const toggleSelect = (p) => {
    setSelectedProducts(prev => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        next[p.id] = {
          product_id: p.id,
          product_name: p.product_name,
          product_code: p.product_code,
          category_name: p.category_name || '',
          vehicle_type_name: p.vehicle_type_name || '',
          vehicle_model_names: formatModels(p.vehicle_model_names),
          brand: p.brand || '',
          unit_type: p.unit_type,
          stock_qty: p.stock_qty,
          buying_price: p.buying_price,
          quantity: 1
        };
      }
      return next;
    });
  };

  const updateSelectedQty = (id, qty) => {
    setSelectedProducts(prev => ({ ...prev, [id]: { ...prev[id], quantity: qty } }));
  };

  const removeSelected = (id) => {
    setSelectedProducts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // ── Export column selection ──────────────────────────────────
  const [selectedColumns, setSelectedColumns] = useState(() => {
    const init = {};
    COLUMN_DEFS.forEach(c => { init[c.key] = c.default; });
    return init;
  });
  const toggleColumn = (key) => setSelectedColumns(prev => ({ ...prev, [key]: !prev[key] }));
  const [productPhotos, setProductPhotos] = useState({});
  const photoRequests = React.useRef(new Map());
  const loadProductPhotos = async (items) => {
    const result = {};
    for (let offset = 0; offset < items.length; offset += 6) {
      await Promise.all(items.slice(offset, offset + 6).map(async item => {
        if (!item.product_id) return;
        const id = item.product_id;
        if (!photoRequests.current.has(id)) {
          photoRequests.current.set(id, (async () => {
            const response = await fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            if (response.status === 404) return '';
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error('Could not load product photos.');
            return data.product.images?.[0] || data.product.image || '';
          })().catch(error => { photoRequests.current.delete(id); throw error; }));
        }
        result[id] = await photoRequests.current.get(id);
      }));
    }
    setProductPhotos(previous => ({ ...previous, ...result }));
    return result;
  };
  useEffect(() => {
    if (!selectedColumns.photo) return;
    const items = viewMode === 'view-order' ? viewingOrder?.items || [] : selectedList;
    loadProductPhotos(items).catch(() => triggerAlert('error', 'Could not load product photos. Toggle Product Photo to retry.'));
  }, [selectedColumns.photo, selectedList, viewingOrder, viewMode]);
  const photoCell = item => <td className="px-5 py-3.5">{productPhotos[item.product_id]
    ? <img src={productPhotos[item.product_id]} alt={item.product_name} className="h-16 w-20 object-contain rounded-lg bg-white" />
    : <span className="text-xs text-slate-400">{item.product_id && !Object.hasOwn(productPhotos, item.product_id) ? 'Loading...' : 'No photo'}</span>}</td>;

  // ── Save order ────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const handleSaveOrder = async () => {
    if (saving) return;
    if (selectedList.length === 0) {
      triggerAlert('warning', 'Select at least one product before saving the order.');
      return;
    }
    if (selectedList.some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !/^\d+(\.\d{1,3})?$/.test(String(item.quantity)))) {
      triggerAlert('warning', 'Enter a positive quantity with at most three decimal places for every product.');
      return;
    }
    setSaving(true);
    try {
      const items = selectedList.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        category_name: item.category_name,
        vehicle_type_name: item.vehicle_type_name,
        vehicle_model_names: item.vehicle_model_names,
        brand: item.brand,
        unit_type: item.unit_type,
        stock_at_order: item.stock_qty ?? item.stock_at_order,
        buying_price: item.buying_price,
        quantity: Number(item.quantity)
      }));
      const res = await fetch(editingOrderId !== null ? `/api/orders/${editingOrderId}` : '/api/orders', {
        method: editingOrderId !== null ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setSelectedProducts({});
        setEditingOrderId(null);
        setViewMode('history');
        fetchOrders();
      } else {
        triggerAlert('error', data.message || 'Could not save order.');
      }
    } catch { triggerAlert('error', 'Server error saving order.'); }
    finally { setSaving(false); }
  };

  const handleDeleteOrder = (id) => {
    askConfirm('Delete Order?', 'This order record will be permanently removed. This cannot be undone.', async () => {
      closeConfirm();
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) { triggerAlert('success', data.message); fetchOrders(); }
        else triggerAlert('error', data.message);
      } catch { triggerAlert('error', 'Server error deleting order.'); }
    });
  };

  const [viewingOrderLoading, setViewingOrderLoading] = useState(false);

  const handleViewOrder = async (order, edit = false) => {
    setViewMode('view-order');
    setViewingOrder(null);
    setViewingOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) {
        if (edit) {
          setEditingOrderId(data.order.id);
          setSelectedProducts(Object.fromEntries(data.order.items.map(item => {
            const key = item.product_id || `saved-${item.id}`;
            return [key, { ...item, selection_key: key, stock_qty: item.stock_at_order }];
          })));
          if (!catalogLoaded) fetchCatalog();
          setViewMode('selected');
        } else setViewingOrder(data.order);
      }
      else { triggerAlert('error', data.message || 'Could not load order.'); setViewMode('history'); }
    } catch { triggerAlert('error', 'Server error loading order.'); setViewMode('history'); }
    finally { setViewingOrderLoading(false); }
  };

  // ── Export helpers (shared by in-progress selection & saved orders) ─
  const buildExportTable = (items, includePhotos = true) => {
    const cols = COLUMN_DEFS.filter(c => selectedColumns[c.key] && (includePhotos || c.key !== 'photo'));
    const header = ['No.', 'Code', 'Product Name', ...cols.map(c => c.label), 'Unit', 'Order Qty'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.product_code,
      item.product_name,
      ...cols.map(c => c.key === 'photo' ? '' : c.key === 'stock' ? stockOf(item) : c.key === 'buying_price' ? priceOf(item) : (item[c.key] || '—')),
      item.unit_type || '',
      item.quantity
    ]);
    return { header, rows };
  };

  const exportPDF = async (items, filenamePrefix = 'Order') => {
    if (items.length === 0) { triggerAlert('warning', 'No products to export.'); return; }
    try {
      const images = selectedColumns.photo ? await loadProductPhotos(items) : {};
      const printablePhotos = await Promise.all(items.map(async item => {
        const source = images[item.product_id];
        if (!source) return null;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = source; });
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        return { source: canvas.toDataURL('image/jpeg', 0.85), ratio: canvas.width / canvas.height };
      }));
      const { header, rows } = buildExportTable(items);
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(245, 158, 11);
      doc.text(shopInfo.shopName || 'STN MOTORS', 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(shopInfo.shopAddress || '', 14, 24);
      doc.text(`Phone: ${shopInfo.shopPhone || ''}`, 14, 29);

      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text('PURCHASE / RESTOCK ORDER', 14, 40);

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 46);

      doc.setDrawColor(220);
      doc.line(14, 50, 196, 50);

      doc.autoTable({
        startY: 54,
        head: [header],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, font: 'helvetica' },
        columnStyles: selectedColumns.photo ? { 3: { cellWidth: 24 } } : {},
        didParseCell: data => {
          if (selectedColumns.photo && data.section === 'body') data.cell.styles.minCellHeight = 22;
          if (selectedColumns.photo && data.section === 'head' && data.column.index === 3) data.cell.text = ['Photo'];
        },
        didDrawCell: data => {
          if (!selectedColumns.photo || data.section !== 'body' || data.column.index !== 3) return;
          const photo = printablePhotos[data.row.index];
          if (!photo) { doc.text('No photo', data.cell.x + 2, data.cell.y + 8); return; }
          const width = Math.min(20, 18 * photo.ratio), height = width / photo.ratio;
          doc.addImage(photo.source, 'JPEG', data.cell.x + (data.cell.width - width) / 2, data.cell.y + (data.cell.height - height) / 2, width, height);
        }
      });

      doc.save(`${filenamePrefix}_${new Date().toISOString().split('T')[0]}.pdf`);
      triggerAlert('success', 'PDF downloaded successfully.');
    } catch {
      triggerAlert('error', 'Error compiling PDF output.');
    }
  };

  const exportExcel = (items, filenamePrefix = 'Order') => {
    if (items.length === 0) { triggerAlert('warning', 'No products to export.'); return; }
    try {
      const { header, rows } = buildExportTable(items, false);
      const sheetData = [
        [shopInfo.shopName || 'STN MOTORS'],
        [shopInfo.shopAddress || ''],
        [`Phone: ${shopInfo.shopPhone || ''}`],
        [],
        ['PURCHASE / RESTOCK ORDER', '', `Date: ${new Date().toLocaleDateString()}`],
        [],
        header,
        ...rows
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Order');
      XLSX.writeFile(wb, `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      triggerAlert('success', 'Excel file downloaded successfully.');
    } catch {
      triggerAlert('error', 'Error compiling Excel output.');
    }
  };

  // ── Shared styles ─────────────────────────────────────────────
  const inputCls = 'w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white';
  const selectCls = `${inputCls} appearance-none`;

  const quickFilterBtn = (key, label, Icon) => (
    <button onClick={() => handleQuickFilter(key)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
        quickFilter === key
          ? 'bg-amber-500 text-white border-amber-500'
          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-amber-400'
      }`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  // ═══════════════════════════════════════════════════════════════
  // History view
  // ═══════════════════════════════════════════════════════════════
  if (viewMode === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Restock Orders</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Build and track purchase order lists for your suppliers.</p>
          </div>
          <button onClick={handleStartNewOrder}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20">
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>

        {loadingOrders ? (
          <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No orders yet. Create your first restock order.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4">No.</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Created By</th>
                  <th className="px-5 py-4 text-center">Items</th>
                  <th className="px-5 py-4 text-center">Total Qty</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {orders.map((o, idx) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                    <td className="px-5 py-3.5 font-mono">{idx + 1}</td>
                    <td className="px-5 py-3.5">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">{o.created_by_name}</td>
                    <td className="px-5 py-3.5 text-center">{o.item_count}</td>
                    <td className="px-5 py-3.5 text-center font-mono">{parseFloat(o.total_quantity)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleViewOrder(o)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                          title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteOrder(o.id)}
                          className="p-1.5 rounded-lg border border-rose-200/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                          title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleViewOrder(o, true)} title="Edit Order" aria-label={`Edit order ${o.id}`}
                          className="p-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-600 hover:bg-amber-500/10"><Edit3 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
        <ConfirmModal isOpen={confirmState.show} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={closeConfirm} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // View a saved order (read-only)
  // ═══════════════════════════════════════════════════════════════
  if (viewMode === 'view-order' && viewingOrderLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center"><LoadingSpinner size="large" /></div>
    );
  }

  if (viewMode === 'view-order' && viewingOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setViewMode('history'); setViewingOrder(null); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Order #{viewingOrder.id}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(viewingOrder.created_at).toLocaleDateString()} · by {viewingOrder.created_by_name}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={selectedColumns.photo} onChange={() => toggleColumn('photo')} className="accent-amber-500" />Product Photo</label>
            <button onClick={() => handleViewOrder(viewingOrder, true)} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white"><Edit3 className="h-4 w-4" />Edit Order</button>
            <button onClick={() => exportPDF(viewingOrder.items, `Order_${viewingOrder.id}`)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={() => exportExcel(viewingOrder.items, `Order_${viewingOrder.id}`)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Product Name</th>
                {selectedColumns.photo && <th className="px-5 py-4">Photo</th>}
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Vehicle Type</th>
                <th className="px-5 py-4">Model</th>
                <th className="px-5 py-4 text-center">Stock at Order</th>
                <th className="px-5 py-4 text-right">Price</th>
                <th className="px-5 py-4 text-center">Order Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {viewingOrder.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-5 py-3.5 font-mono">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-mono">{item.product_code}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-white">{item.product_name}</td>
                  {selectedColumns.photo && photoCell(item)}
                  <td className="px-5 py-3.5">{item.category_name || '—'}</td>
                  <td className="px-5 py-3.5">{item.vehicle_type_name || '—'}</td>
                  <td className="px-5 py-3.5">{item.vehicle_model_names || '—'}</td>
                  <td className="px-5 py-3.5 text-center font-mono">{item.stock_at_order ?? '—'} {item.unit_type}</td>
                  <td className="px-5 py-3.5 text-right font-mono">{priceOf(item)}</td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-amber-600">{parseFloat(item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Selected products panel
  // ═══════════════════════════════════════════════════════════════
  if (viewMode === 'selected') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('browse')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{editingOrderId !== null ? `Edit Order #${editingOrderId}` : 'Selected Products'} ({selectedCount})</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set quantities, pick export columns, then save or download.</p>
            </div>
          </div>
          <button onClick={() => setViewMode('browse')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add More Products
          </button>
        </div>

        {/* Column selector */}
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Export Columns:</span>
          {COLUMN_DEFS.map(c => (
            <label key={c.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
              <input type="checkbox" checked={selectedColumns[c.key]} onChange={() => toggleColumn(c.key)}
                className="accent-amber-500 h-3.5 w-3.5 rounded" />
              {c.label}
            </label>
          ))}
        </div>

        {selectedCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <PackageMinus className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No products selected yet.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4">No.</th>
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Product Name</th>
                  {selectedColumns.photo && <th className="px-5 py-4">Photo</th>}
                  {selectedColumns.category_name && <th className="px-5 py-4">Category</th>}
                  {selectedColumns.vehicle_type_name && <th className="px-5 py-4">Vehicle Type</th>}
                  {selectedColumns.vehicle_model_names && <th className="px-5 py-4">Model</th>}
                  {selectedColumns.brand && <th className="px-5 py-4">Brand</th>}
                  {selectedColumns.stock && <th className="px-5 py-4 text-center">Current Stock</th>}
                  {selectedColumns.buying_price && <th className="px-5 py-4 text-right">Price</th>}
                  <th className="px-5 py-4 text-center">Order Qty</th>
                  <th className="px-5 py-4 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                {selectedList.map((item, idx) => (
                  <tr key={item.selection_key || item.product_id}>
                    <td className="px-5 py-3.5 font-mono">{idx + 1}</td>
                    <td className="px-5 py-3.5 font-mono">{item.product_code}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-white">{item.product_name}</td>
                    {selectedColumns.photo && photoCell(item)}
                    {selectedColumns.category_name && <td className="px-5 py-3.5">{item.category_name || '—'}</td>}
                    {selectedColumns.vehicle_type_name && <td className="px-5 py-3.5">{item.vehicle_type_name || '—'}</td>}
                    {selectedColumns.vehicle_model_names && <td className="px-5 py-3.5">{item.vehicle_model_names || '—'}</td>}
                    {selectedColumns.brand && <td className="px-5 py-3.5">{item.brand || '—'}</td>}
                    {selectedColumns.stock && <td className="px-5 py-3.5 text-center font-mono">{parseFloat(item.stock_qty)} {item.unit_type}</td>}
                    {selectedColumns.buying_price && <td className="px-5 py-3.5 text-right font-mono">{priceOf(item)}</td>}
                    <td className="px-5 py-3.5 text-center">
                      <input type="number" min="0.001" step="0.001" disabled={saving} value={item.quantity}
                        onChange={e => updateSelectedQty(item.selection_key || item.product_id, e.target.value)}
                        className="w-20 text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 px-2 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button disabled={saving} onClick={() => removeSelected(item.selection_key || item.product_id)}
                        className="p-1.5 rounded-lg border border-rose-200/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          {editingOrderId !== null && <button disabled={saving} onClick={() => { setSelectedProducts({}); setEditingOrderId(null); setViewMode('history'); }} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">Cancel Edit</button>}
          <button onClick={() => exportPDF(selectedList)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <FileText className="h-4 w-4" /> Download PDF
          </button>
          <button onClick={() => exportExcel(selectedList)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <FileSpreadsheet className="h-4 w-4" /> Download Excel
          </button>
          <button onClick={handleSaveOrder} disabled={saving || selectedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20">
            {saving ? 'Saving...' : editingOrderId !== null ? 'Update Order' : 'Save Order'}
          </button>
        </div>

        <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Browse / select products (default of the builder flow)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (editingOrderId !== null) { setSelectedProducts({}); setEditingOrderId(null); } setViewMode('history'); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{editingOrderId !== null ? `Edit Order #${editingOrderId} - Add Products` : 'Build New Order'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Search, filter, and tick the parts you need to restock.</p>
          </div>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        {quickFilterBtn('all', 'All Products', ShoppingBag)}
        {quickFilterBtn('lowstock', 'Low Stock', PackageMinus)}
        {quickFilterBtn('fastmoving', 'Fast Moving', Zap)}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
          quickFilter === 'customqty'
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
        }`}>
          <button onClick={() => handleQuickFilter('customqty')} className="flex items-center gap-1.5">
            Stock ≤
          </button>
          <input type="number" min="0" value={customQty}
            onChange={e => { setCustomQty(e.target.value); setQuickFilter('customqty'); }}
            placeholder="e.g. 10"
            className={`w-16 text-center rounded-lg border px-1.5 py-1 text-xs font-bold focus:outline-none ${
              quickFilter === 'customqty'
                ? 'border-white/40 bg-white/10 text-white placeholder:text-white/60'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:text-white'
            }`} />
        </div>
        {fastMovingLoading && <span className="text-[10px] text-slate-400 font-semibold">Loading fast-moving items...</span>}
      </div>

      {/* Search + category/type/model filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Search by code, barcode or name..." className={inputCls} />
        </div>
        <div className="relative">
          <select value={selectedCatFilter} onChange={e => setSelectedCatFilter(e.target.value)} className={selectCls}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
          </select>
          <ChevronDown className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <div className="relative">
          <select value={selectedTypeFilter} onChange={e => { setSelectedTypeFilter(e.target.value); setSelectedModelFilter(''); }} className={selectCls}>
            <option value="">All Types</option>
            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
          <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <div className="relative">
          <select value={selectedModelFilter} onChange={e => setSelectedModelFilter(e.target.value)} className={selectCls}>
            <option value="">All Models</option>
            {filterBarModels.map(m => <option key={m.id} value={m.id}>{m.model_name}</option>)}
          </select>
          <ChevronDown className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Product list */}
      {!catalogLoaded ? (
        <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-4 text-center">Select</th>
                <th className="px-5 py-4">Item Code</th>
                <th className="px-5 py-4">Product Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4 text-center">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {browseProducts.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400">
                  {quickFilter === 'customqty' && customQty === ''
                    ? 'Enter a stock quantity to filter by.'
                    : 'No products match your filter.'}
                </td></tr>
              ) : (
                browseProducts.map(p => {
                  const isLowStock = parseFloat(p.stock_qty) <= parseFloat(p.low_stock_limit);
                  const checked = !!selectedProducts[p.id];
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/10 ${checked ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-5 py-3.5 text-center">
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(p)}
                          className="accent-amber-500 h-4 w-4 rounded cursor-pointer" />
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold">{p.product_code}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-850 dark:text-white">{p.product_name}</span>
                      </td>
                      <td className="px-5 py-3.5">{p.category_name || '—'}</td>
                      <td className="px-5 py-3.5">{p.vehicle_type_name || '—'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`font-bold font-mono ${isLowStock ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {parseFloat(p.stock_qty)} {p.unit_type}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating "Selected Products" button */}
      {selectedCount > 0 && (
        <button onClick={() => setViewMode('selected')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-amber-500/30">
          <ShoppingBag className="h-4 w-4" /> Selected Products ({selectedCount})
        </button>
      )}

      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
    </div>
  );
};

export default Orders;
