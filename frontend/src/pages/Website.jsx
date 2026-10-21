import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, Save, Search, ChevronDown, Truck, ExternalLink, Eye, EyeOff, ImagePlus, Trash2,
  Plus, Edit3, X, Phone
} from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import PublicNavEditor from '../components/PublicNavEditor.jsx';
import MechanicalServicesAdmin from '../components/MechanicalServicesAdmin.jsx';
import {useAuth} from '../context/AuthContext.jsx';

const VISIBLE_FIELD_DEFS = [
  { key: 'price', label: 'Selling Price' },
  { key: 'stock', label: 'Stock Quantity' }
];

const Website = () => {
  const {user}=useAuth();
  const [tab, setTab] = useState('info'); // 'info' | 'publish' | 'vehicles'
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });
  const triggerAlert = (type, message) => setAlert({ show: true, type, message });

  // ── Site Info ────────────────────────────────────────────────
  const [settings, setSettings] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/site-settings', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch { triggerAlert('error', 'Failed to load website settings.'); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const visibleFieldsList = useMemo(() =>
    (settings?.visible_fields || '').split(',').map(f => f.trim()).filter(Boolean),
    [settings?.visible_fields]
  );

  const toggleVisibleField = (key) => {
    setSettings(prev => {
      const list = (prev.visible_fields || '').split(',').map(f => f.trim()).filter(Boolean);
      const next = list.includes(key) ? list.filter(f => f !== key) : [...list, key];
      return { ...prev, visible_fields: next.join(',') };
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerAlert('error', 'Logo file must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        setSettings(prev => ({ ...prev, logo: canvas.toDataURL('image/png') }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => setSettings(prev => ({ ...prev, logo: null }));

  // ── Public navbar menu config ────────────────────────────────
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await fetch('/api/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        localStorage.setItem('stn-public-settings-updated',String(Date.now()));
        window.dispatchEvent(new Event('stn-public-settings-updated'));
        triggerAlert('success', data.message);
      }
      else triggerAlert('error', data.message);
    } catch { triggerAlert('error', 'Server error saving settings.'); }
    finally { setSavingInfo(false); }
  };

  // ── Publish Products ────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState({});
  const [applying, setApplying] = useState(false);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const [prodRes, catRes, vtRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/products/categories', { headers }),
        fetch('/api/products/vehicle-types', { headers })
      ]);
      const [prodData, catData, vtData] = await Promise.all([prodRes.json(), catRes.json(), vtRes.json()]);
      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
      if (vtData.success) setVehicleTypes(vtData.types);
    } catch { triggerAlert('error', 'Failed to load products.'); }
    finally { setLoadingProducts(false); }
  };

  useEffect(() => { if (tab === 'publish' && products.length === 0) fetchProducts(); }, [tab]);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = p.product_name.toLowerCase().includes(searchVal.toLowerCase()) || p.product_code.toLowerCase().includes(searchVal.toLowerCase());
    const matchCat = catFilter ? p.category_id === parseInt(catFilter) : true;
    const matchType = typeFilter ? p.vehicle_type_id === parseInt(typeFilter) : true;
    return matchSearch && matchCat && matchType;
  }), [products, searchVal, catFilter, typeFilter]);

  const selectedCount = Object.keys(selectedIds).length;

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = { ...prev };
    if (next[id]) delete next[id]; else next[id] = true;
    return next;
  });

  const selectAllFiltered = () => {
    const next = {};
    filteredProducts.forEach(p => { next[p.id] = true; });
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds({});

  const applyPublishStatus = async (isPublic) => {
    const ids = Object.keys(selectedIds).map(Number);
    if (ids.length === 0) {
      triggerAlert('warning', 'Select at least one product first.');
      return;
    }
    setApplying(true);
    try {
      const res = await fetch('/api/products/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ product_ids: ids, is_public: isPublic })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setSelectedIds({});
        fetchProducts();
      } else triggerAlert('error', data.message);
    } catch { triggerAlert('error', 'Server error updating publish status.'); }
    finally { setApplying(false); }
  };

  // ── Vehicles for Sale ────────────────────────────────────────
  const [vehicleListings, setVehicleListings] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [deleteVehicleId, setDeleteVehicleId] = useState(null);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const initialVehicleForm = {
    vehicle_name: '', model: '', vehicle_type: '', price: '',
    contact_phone: '', address: '', description: '', status: 'available', images: []
  };
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);

  const fetchVehicleListings = async () => {
    setLoadingVehicles(true);
    try {
      const res = await fetch('/api/vehicle-listings', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) setVehicleListings(data.listings);
    } catch { triggerAlert('error', 'Failed to load vehicle listings.'); }
    finally { setLoadingVehicles(false); }
  };

  useEffect(() => { if (tab === 'vehicles' && vehicleListings.length === 0) fetchVehicleListings(); }, [tab]);

  const handleOpenAddVehicle = () => {
    setEditingVehicleId(null);
    setVehicleForm(initialVehicleForm);
    setShowVehicleModal(true);
  };

  const handleOpenEditVehicle = (v) => {
    setEditingVehicleId(v.id);
    setVehicleForm({
      vehicle_name: v.vehicle_name,
      model: v.model || '',
      vehicle_type: v.vehicle_type || '',
      price: v.price != null ? String(v.price) : '',
      contact_phone: v.contact_phone || '',
      address: v.address || '',
      description: v.description || '',
      status: v.status,
      images: v.images || []
    });
    setShowVehicleModal(true);
  };

  const resizeVehicleImage = (file, maxDim = 1000, quality = 0.75) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const handleVehiclePhotosSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const resized = await Promise.all(files.map(f => resizeVehicleImage(f)));
      setVehicleForm(prev => ({ ...prev, images: [...prev.images, ...resized] }));
    } catch { triggerAlert('error', 'Failed to process one or more photos.'); }
  };

  const removeVehiclePhoto = (idx) => {
    setVehicleForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleVehicleFormSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleForm.vehicle_name.trim()) {
      triggerAlert('warning', 'Vehicle name is required.');
      return;
    }
    setSavingVehicle(true);
    try {
      const isEdit = editingVehicleId !== null;
      const url = isEdit ? `/api/vehicle-listings/${editingVehicleId}` : '/api/vehicle-listings';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...vehicleForm, price: vehicleForm.price ? parseFloat(vehicleForm.price) : null })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setShowVehicleModal(false);
        fetchVehicleListings();
      } else triggerAlert('error', data.message);
    } catch { triggerAlert('error', 'Server error saving vehicle listing.'); }
    finally { setSavingVehicle(false); }
  };

  const handleDeleteVehicleConfirm = async () => {
    if (!deleteVehicleId) return;
    try {
      const res = await fetch(`/api/vehicle-listings/${deleteVehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) { triggerAlert('success', data.message); fetchVehicleListings(); }
      else triggerAlert('error', data.message);
    } catch { triggerAlert('error', 'Server error deleting vehicle listing.'); }
    finally { setDeleteVehicleId(null); }
  };

  const inputCls = 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" /> Website
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your public marketing website — shop info, and which products are visible.</p>
        </div>
        <a href="/shop" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ExternalLink className="h-4 w-4" /> View Public Site
        </a>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {[{ id: 'info', label: 'Site Info' }, { id: 'publish', label: 'Publish Products' }, { id: 'vehicles', label: 'Vehicles for Sale' }, {id:'mechanical',label:'Mechanical Service'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === t.id ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Site Info Tab ──────────────────────────────────────── */}
      {tab === 'mechanical' && <MechanicalServicesAdmin/>}
      {tab === 'info' && (
        !settings ? (
          <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
            <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Shop Details</h3>

              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  {settings.logo && (
                    <button type="button" onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Public Website Logo</label>
                  <p className="text-[10px] text-slate-400">Shown on the public website's navbar and footer. Max 2MB.</p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-amber-500/20">
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>{settings.logo ? 'Change Logo' : 'Upload Logo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Shop Name</label>
                  <input type="text" value={settings.shop_name || ''} onChange={e => setSettings({ ...settings, shop_name: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tagline</label>
                  <input type="text" value={settings.shop_tagline || ''} onChange={e => setSettings({ ...settings, shop_tagline: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                  <input type="text" value={settings.shop_address || ''} onChange={e => setSettings({ ...settings, shop_address: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">About Text (shown on About page)</label>
                  <textarea rows={4} value={settings.about_text || ''} onChange={e => setSettings({ ...settings, about_text: e.target.value })} className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Contact & Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <input type="text" value={settings.shop_phone || ''} onChange={e => setSettings({ ...settings, shop_phone: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp Number</label>
                  <input type="text" value={settings.whatsapp_number || ''} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="94771234567" className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Google Maps Link</label>
                  <input type="url" value={settings.google_maps_url || ''} onChange={e => setSettings({ ...settings, google_maps_url: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Facebook Page</label>
                  <input type="url" value={settings.facebook_url || ''} onChange={e => setSettings({ ...settings, facebook_url: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Instagram</label>
                  <input type="url" value={settings.instagram_url || ''} onChange={e => setSettings({ ...settings, instagram_url: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">TikTok</label>
                  <input type="url" value={settings.tiktok_url || ''} onChange={e => setSettings({ ...settings, tiktok_url: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"><h3 className="text-sm font-bold text-slate-800 dark:text-white">Tamil Website Content (Optional)</h3><p className="text-xs text-slate-500">Visitors selecting தமிழ் see these translations. Leave blank to keep the original content.</p><label className="block text-xs text-slate-500">Tamil Tagline<input lang="ta" maxLength={150} value={settings.shop_tagline_ta||''} onChange={e=>setSettings({...settings,shop_tagline_ta:e.target.value})} className={inputCls}/></label><label className="block text-xs text-slate-500">Tamil Address<input lang="ta" maxLength={255} value={settings.shop_address_ta||''} onChange={e=>setSettings({...settings,shop_address_ta:e.target.value})} className={inputCls}/></label><label className="block text-xs text-slate-500">Tamil About Text<textarea lang="ta" rows={4} value={settings.about_text_ta||''} onChange={e=>setSettings({...settings,about_text_ta:e.target.value})} className={inputCls}/></label></section>
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"><h3 className="text-sm font-bold text-slate-800 dark:text-white">Sinhala Website Content (Optional)</h3><p className="text-xs text-slate-500">Visitors selecting සිංහල see these translations. Leave blank to keep the original content.</p><label className="block text-xs text-slate-500">Sinhala Tagline<input lang="si" maxLength={150} value={settings.shop_sigline_si||''} onChange={e=>setSettings({...settings,shop_sigline_si:e.target.value})} className={inputCls}/></label><label className="block text-xs text-slate-500">Sinhala Address<input lang="si" maxLength={255} value={settings.shop_address_si||''} onChange={e=>setSettings({...settings,shop_address_si:e.target.value})} className={inputCls}/></label><label className="block text-xs text-slate-500">Sinhala About Text<textarea lang="si" rows={4} value={settings.about_text_si||''} onChange={e=>setSettings({...settings,about_text_si:e.target.value})} className={inputCls}/></label></section>
            <PublicNavEditor value={settings.nav_config} onChange={nav_config => setSettings(previous => ({ ...previous, nav_config }))} />

            <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Public Product Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose which extra details show on the public product catalog. Category, brand, and vehicle compatibility are always shown.</p>
              <div className="flex flex-wrap gap-4 pt-1">
                {VISIBLE_FIELD_DEFS.map(f => (
                  <label key={f.key} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={visibleFieldsList.includes(f.key)} onChange={() => toggleVisibleField(f.key)}
                      className="accent-amber-500 h-4 w-4 rounded" />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={savingInfo||user?.role!=='admin'}
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20">
                <Save className="h-4 w-4" /> {savingInfo ? 'Saving...' : 'Save Website Settings'}
              </button>
            </div>
          </form>
        )
      )}

      {/* ── Publish Products Tab ───────────────────────────────── */}
      {tab === 'publish' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
                placeholder="Search by code or name..." className={`${inputCls} pl-9`} />
            </div>
            <div className="relative">
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={`${inputCls} appearance-none pl-9`}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${inputCls} appearance-none pl-9`}>
                <option value="">All Types</option>
                {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
              <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={selectAllFiltered} className="text-xs font-bold text-amber-500 hover:text-amber-600">Select All Filtered ({filteredProducts.length})</button>
              {selectedCount > 0 && <button onClick={clearSelection} className="text-xs font-bold text-slate-400 hover:text-slate-600">Clear Selection</button>}
              <span className="text-xs text-slate-400 font-semibold">{selectedCount} selected</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => applyPublishStatus(true)} disabled={applying}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-4 py-2 text-xs font-bold text-white">
                <Eye className="h-3.5 w-3.5" /> Publish Selected
              </button>
              <button onClick={() => applyPublishStatus(false)} disabled={applying}
                className="flex items-center gap-1.5 rounded-xl bg-slate-500 hover:bg-slate-600 disabled:opacity-60 px-4 py-2 text-xs font-bold text-white">
                <EyeOff className="h-3.5 w-3.5" /> Unpublish Selected
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
          ) : (
            <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-4 text-center">Select</th>
                    <th className="px-5 py-4">Item Code</th>
                    <th className="px-5 py-4">Product Name</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4 text-center">Website Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-12 text-slate-400">No products match your filter.</td></tr>
                  ) : (
                    filteredProducts.map(p => {
                      const checked = !!selectedIds[p.id];
                      const isPublic = p.is_public === 1 || p.is_public === true;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/10 ${checked ? 'bg-amber-500/5' : ''}`}>
                          <td className="px-5 py-3.5 text-center">
                            <input type="checkbox" checked={checked} onChange={() => toggleSelect(p.id)} className="accent-amber-500 h-4 w-4 rounded cursor-pointer" />
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold">{p.product_code}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-white">{p.product_name}</td>
                          <td className="px-5 py-3.5">{p.category_name || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isPublic ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {isPublic ? 'Public' : 'Hidden'}
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
        </div>
      )}

      {/* ── Vehicles for Sale Tab ──────────────────────────────── */}
      {tab === 'vehicles' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={handleOpenAddVehicle}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20">
              <Plus className="h-4 w-4" /> Add Vehicle Listing
            </button>
          </div>

          {loadingVehicles ? (
            <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
          ) : vehicleListings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
              <Truck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No vehicle listings yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {vehicleListings.map(v => {
                const isSold = v.status === 'sold';
                return (
                  <div key={v.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                    {v.images?.length > 0 && (
                      <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-950">
                        <img src={v.images[0]} alt={v.vehicle_name} className="w-full h-full object-cover" />
                        {isSold && (
                          <span className="absolute top-2 right-2 rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-1">SOLD OUT</span>
                        )}
                        {v.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 text-white text-[9px] font-bold px-1.5 py-0.5">+{v.images.length - 1} more</span>
                        )}
                      </div>
                    )}
                    <div className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{v.vehicle_name}</h3>
                        {!v.images?.length && isSold && (
                          <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-1 shrink-0">SOLD OUT</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {v.model && <span className="font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5">{v.model}</span>}
                        {v.vehicle_type && <span className="font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-full px-2 py-0.5">{v.vehicle_type}</span>}
                      </div>
                      {v.price != null && <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">Rs. {parseFloat(v.price).toFixed(2)}</p>}
                      {v.contact_phone && <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {v.contact_phone}</p>}
                      <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                        <button onClick={() => handleOpenEditVehicle(v)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteVehicleId(v.id)}
                          className="p-1.5 rounded-lg border border-rose-200/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Listing Form Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowVehicleModal(false)} />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowVehicleModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingVehicleId ? 'Edit Vehicle Listing' : 'Add Vehicle Listing'}
            </h3>

            <form onSubmit={handleVehicleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Vehicle Name *</label>
                <input type="text" required value={vehicleForm.vehicle_name}
                  onChange={e => setVehicleForm({ ...vehicleForm, vehicle_name: e.target.value })}
                  placeholder="Massey Ferguson 241" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Model</label>
                  <input type="text" value={vehicleForm.model}
                    onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                  <input type="text" value={vehicleForm.vehicle_type}
                    onChange={e => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                    placeholder="Tractor" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Price (Rs.)</label>
                  <input type="number" min="0" step="0.01" value={vehicleForm.price}
                    onChange={e => setVehicleForm({ ...vehicleForm, price: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Contact Phone</label>
                  <input type="text" value={vehicleForm.contact_phone}
                    onChange={e => setVehicleForm({ ...vehicleForm, contact_phone: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Address / Location</label>
                <input type="text" value={vehicleForm.address}
                  onChange={e => setVehicleForm({ ...vehicleForm, address: e.target.value })} className={inputCls} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea rows={3} value={vehicleForm.description}
                  onChange={e => setVehicleForm({ ...vehicleForm, description: e.target.value })} className={`${inputCls} resize-none`} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <select value={vehicleForm.status} onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                  className={`${inputCls} appearance-none`}>
                  <option value="available">Available</option>
                  <option value="sold">Sold Out</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Photos</label>
                <div className="flex flex-wrap gap-3">
                  {vehicleForm.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                      <img src={img} alt={`Vehicle photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeVehiclePhoto(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-amber-500 hover:text-amber-500 cursor-pointer transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[8px] font-bold">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleVehiclePhotosSelected} />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowVehicleModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400">
                  Cancel
                </button>
                <button type="submit" disabled={savingVehicle}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-5 py-2.5 text-xs font-bold text-white shadow-lg">
                  {savingVehicle ? 'Saving...' : editingVehicleId ? 'Update Listing' : 'Add Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteVehicleId !== null}
        title="Delete Vehicle Listing?"
        message="This vehicle listing will be permanently removed from your website. This cannot be undone."
        onConfirm={handleDeleteVehicleConfirm}
        onCancel={() => setDeleteVehicleId(null)}
      />

      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
    </div>
  );
};

export default Website;
