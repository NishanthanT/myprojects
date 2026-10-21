import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Tag, Percent, Calendar, Check, X, ImagePlus, Video, Image as ImageIcon } from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Forms state
  const initialForm = {
    offer_name: '',
    offer_type: 'Percentage',
    discount_value: '',
    product_id: '',
    category_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
    description: '',
    video_url: '',
    images: []
  };
  const [formData, setFormData] = useState(initialForm);

  // Alerts
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      // Offers
      const offRes = await fetch('/api/offers', { headers });
      const offData = await offRes.json();
      if (offData.success) setOffers(offData.offers);

      // Products
      const prodRes = await fetch('/api/products', { headers });
      const prodData = await prodRes.json();
      if (prodData.success) setProducts(prodData.products);

      // Categories
      const catRes = await fetch('/api/products/categories', { headers });
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);

    } catch (error) {
      triggerAlert('error', 'Server error retrieving data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (off) => {
    // Format dates to YYYY-MM-DD for date inputs
    const start = new Date(off.start_date).toISOString().split('T')[0];
    const end = new Date(off.end_date).toISOString().split('T')[0];

    setEditingId(off.id);
    setFormData({
      offer_name: off.offer_name,
      offer_type: off.offer_type,
      discount_value: String(off.discount_value),
      product_id: off.product_id || '',
      category_id: off.category_id || '',
      start_date: start,
      end_date: end,
      status: off.status,
      description: off.description || '',
      video_url: off.video_url || '',
      images: off.images || []
    });
    setShowModal(true);
  };

  // ── Photo upload (resize client-side to keep payload small) ──
  const resizeImageFile = (file, maxDim = 1000, quality = 0.75) => new Promise((resolve, reject) => {
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

  const handlePhotosSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    try {
      const resized = await Promise.all(files.map(f => resizeImageFile(f)));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...resized] }));
    } catch {
      triggerAlert('error', 'Failed to process one or more photos.');
    }
  };

  const removeFormPhoto = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.offer_name || !formData.offer_type || !formData.discount_value || !formData.start_date || !formData.end_date) {
      triggerAlert('warning', 'Please fill in all mandatory fields.');
      return;
    }

    const startYear = parseInt(formData.start_date.split('-')[0], 10);
    const endYear = parseInt(formData.end_date.split('-')[0], 10);
    if (startYear < 2000 || startYear > 2099 || endYear < 2000 || endYear > 2099) {
      triggerAlert('warning', 'Please check the Start/End Date — the year looks incorrect (e.g. a typo like 20226).');
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      triggerAlert('warning', 'End Date cannot be before Start Date.');
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/offers/${editingId}` : '/api/offers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value),
          product_id: formData.product_id ? parseInt(formData.product_id) : null,
          category_id: formData.category_id ? parseInt(formData.category_id) : null
        })
      });

      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setShowModal(false);
        fetchData();
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error saving offer.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/offers/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setDeleteId(null);
        fetchData();
      } else {
        triggerAlert('error', data.message || 'Could not delete offer.');
        setDeleteId(null);
      }
    } catch (error) {
      triggerAlert('error', 'Server error deleting offer.');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Offer & Campaign Manager</h1>
          <p className="text-xs text-slate-500 mt-1">Configure retail discount campaigns, percentage deductions, and active dates.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create Discount Offer</span>
        </button>
      </div>

      {/* 2. Offers Grid */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {offers.length === 0 ? (
            <p className="col-span-full text-center text-slate-400 py-12">No active marketing offers registered.</p>
          ) : (
            offers.map((off) => {
              const isActive = off.status === 'active';

              // Whether this offer is actually visible on the public website right now
              const now = new Date();
              const start = new Date(off.start_date);
              const end = new Date(off.end_date);
              end.setHours(23, 59, 59, 999);
              let liveState = { label: 'Paused', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };
              if (isActive) {
                if (now < start) liveState = { label: `Scheduled — starts ${start.toLocaleDateString()}`, cls: 'bg-sky-100 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400' };
                else if (now > end) liveState = { label: `Expired ${end.toLocaleDateString()}`, cls: 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' };
                else liveState = { label: 'Live on Website', cls: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' };
              }

              return (
                <div 
                  key={off.id} 
                  className={`rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-500/35 transition-all duration-200 ${
                    isActive ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-850 dark:text-white truncate">{off.offer_name}</h3>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-1 block">
                        {off.offer_type === 'Percentage' ? `${parseFloat(off.discount_value)}% Off` : `Rs. ${parseFloat(off.discount_value)} Off`}
                      </span>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {off.offer_type === 'Percentage' ? <Percent className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                    </div>
                  </div>

                  {(off.images?.length > 0 || off.video_url) && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      {off.images?.length > 0 && (
                        <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {off.images.length} photo{off.images.length > 1 ? 's' : ''}</span>
                      )}
                      {off.video_url && (
                        <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>
                      )}
                    </div>
                  )}

                  {/* Range and scope details */}
                  <div className="space-y-2 text-xs font-semibold text-slate-650 dark:text-slate-400">
                    <div className="flex gap-1.5 items-center">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{new Date(off.start_date).toLocaleDateString()} to {new Date(off.end_date).toLocaleDateString()}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[10px] space-y-1">
                      <div>
                        <span className="text-slate-400">Scope Type:</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {off.product_id ? `Product: ${off.product_name}` : off.category_id ? `Category: ${off.category_name}` : 'All Catalog'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-400 uppercase tracking-wide">Website Visibility</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${liveState.cls}`}>
                          {liveState.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                    <button
                      onClick={() => handleOpenEditModal(off)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400"
                      title="Edit Campaign"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(off.id)}
                      className="p-1.5 rounded-lg border border-rose-200/50 dark:border-rose-900/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/35" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingId ? 'Edit Discount offer' : 'Create Campaign Offer'}
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={formData.offer_name}
                  onChange={(e) => setFormData({ ...formData, offer_name: e.target.value })}
                  placeholder="E.g. Seasonal Bearing 10% Discount"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Discount Type *</label>
                  <select
                    value={formData.offer_type}
                    onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none dark:text-white appearance-none"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (Rs.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Discount Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder="Val"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Product Scope Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Apply to Product</label>
                  <select
                    value={formData.product_id}
                    disabled={formData.category_id !== ''} // mutually exclusive
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 focus:outline-none dark:text-white disabled:opacity-50 appearance-none animate-fade"
                  >
                    <option value="">No Product Selected</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_code} - {p.product_name}</option>
                    ))}
                  </select>
                </div>

                {/* Category Scope Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Apply to Category</label>
                  <select
                    value={formData.category_id}
                    disabled={formData.product_id !== ''} // mutually exclusive
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 focus:outline-none dark:text-white disabled:opacity-50 appearance-none"
                  >
                    <option value="">No Category Selected</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Date *</label>
                  <input
                    type="date"
                    required
                    min="2000-01-01"
                    max="2099-12-31"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">End Date *</label>
                  <input
                    type="date"
                    required
                    min="2000-01-01"
                    max="2099-12-31"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* Marketing content for the public website */}
              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-500 uppercase">Description (shown on public website)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about this offer..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" /> Video Link (YouTube, Facebook, TikTok...)
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Photos (public website)</label>
                <div className="flex flex-wrap gap-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                      <img src={img} alt={`Offer photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeFormPhoto(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-amber-500 hover:text-amber-500 cursor-pointer transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[8px] font-bold">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosSelected} />
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Offer Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none dark:text-white appearance-none"
                >
                  <option value="active">Active campaign</option>
                  <option value="inactive">Paused campaign</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  {editingId ? 'Update Campaign Details' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion confirmations */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Campaign Offer?"
        message="Are you sure you want to delete this campaign campaign? This will cancel the automatic discount subtotals in the POS terminal checkout."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Toast popup */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default Offers;
