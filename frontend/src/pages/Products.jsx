import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, Search, Filter, AlertTriangle,
  Sparkles, Check, X, Truck, ChevronDown, Tag, Eye, ImagePlus, ZoomIn,
  ChevronLeft, ChevronRight, Copy, Layers
} from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Products = () => {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [vehicleTypes, setVehicleTypes]   = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ─────────────────────────────────────────────────
  const [searchVal, setSearchVal]               = useState('');
  const [selectedCatFilter, setSelectedCatFilter]   = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter]   = useState('');
  const [selectedModelFilter, setSelectedModelFilter] = useState('');

  // ── Product Form Modal ───────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId]         = useState(null);

  const initialForm = {
    product_name: '', product_code: '', barcode: '',
    category_id: '', brand: '', part_group: '', unit_type: 'Piece',
    buying_price: '', selling_price: '',
    stock_qty: '0', low_stock_limit: '5',
    supplier_id: '', image: '', status: 'active',
    vehicle_type_id: '',
    vehicle_model_ids: [],
    images: []
  };
  const [formData, setFormData] = useState(initialForm);
  const [photosLoading, setPhotosLoading] = useState(false);

  // multi-select model dropdown inside form
  const [modelSearchVal, setModelSearchVal]   = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef(null);

  // searchable category dropdown inside form
  const [catSearchVal, setCatSearchVal]       = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catDropdownRef = useRef(null);

  // ── Category Modal ───────────────────────────────────────────
  const [showCatModal, setShowCatModal]     = useState(false);
  const [newCatName, setNewCatName]         = useState('');
  const [editingCatId, setEditingCatId]     = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // ── Supplier Modal ───────────────────────────────────────────
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    supplier_name: '', company_name: '', phone: '', address: ''
  });

  // ── Vehicle Type Modal ───────────────────────────────────────
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [newTypeName, setNewTypeName]         = useState('');
  const [editingTypeId, setEditingTypeId]     = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');

  // ── Vehicle Model Modal ──────────────────────────────────────
  const [showVehicleModelModal, setShowVehicleModelModal] = useState(false);
  const [newModelName, setNewModelName]           = useState('');
  const [newModelTypeId, setNewModelTypeId]       = useState('');
  const [editingModelId, setEditingModelId]       = useState(null);
  const [editingModelName, setEditingModelName]   = useState('');
  const [editingModelTypeId, setEditingModelTypeId] = useState('');

  // ── Alert ────────────────────────────────────────────────────
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });
  const triggerAlert = (type, message) => setAlert({ show: true, type, message });

  // ── Confirm Dialog ───────────────────────────────────────────
  const [confirmState, setConfirmState] = useState({ show: false, title: '', message: '', onConfirm: null });
  const askConfirm = (title, message, onConfirm) => setConfirmState({ show: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmState({ show: false, title: '', message: '', onConfirm: null });

  // ── View Product Modal ───────────────────────────────────────
  const [viewProduct, setViewProduct] = useState(null);
  const [viewImages, setViewImages] = useState([]);
  const [viewImagesLoading, setViewImagesLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const closeViewProduct = () => {
    setViewProduct(null);
    setViewImages([]);
    setLightboxIndex(null);
  };

  const showPrevImage = () => setLightboxIndex(i => (i - 1 + viewImages.length) % viewImages.length);
  const showNextImage = () => setLightboxIndex(i => (i + 1) % viewImages.length);

  const handleViewProduct = async (p) => {
    setViewProduct(p);
    setViewImages([]);
    setViewImagesLoading(true);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setViewImages(data.product.images || []);
    } catch { /* silently ignore — photos are non-critical for the view */ }
    finally { setViewImagesLoading(false); }
  };

  // ── Click-outside for form dropdowns ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setShowModelDropdown(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch all data ───────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [prodRes, catRes, supRes, vtRes, vmRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/products/categories', { headers }),
        fetch('/api/suppliers', { headers }),
        fetch('/api/products/vehicle-types', { headers }),
        fetch('/api/products/vehicle-models', { headers })
      ]);
      const [prodData, catData, supData, vtData, vmData] = await Promise.all([
        prodRes.json(), catRes.json(), supRes.json(), vtRes.json(), vmRes.json()
      ]);
      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
      if (supData.success) setSuppliers(supData.suppliers);
      if (vtData.success) setVehicleTypes(vtData.types);
      if (vmData.success) setVehicleModels(vmData.models);
    } catch {
      triggerAlert('error', 'Failed to retrieve database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filtered products ────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchSearch =
      p.product_name.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchVal.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchVal)) ||
      (p.part_group && p.part_group.toLowerCase().includes(searchVal.toLowerCase()));

    const matchCat    = selectedCatFilter  ? p.category_id === parseInt(selectedCatFilter)     : true;
    const matchStatus = selectedStatusFilter ? p.status === selectedStatusFilter               : true;
    const matchType   = selectedTypeFilter  ? p.vehicle_type_id === parseInt(selectedTypeFilter) : true;
    const matchModel  = selectedModelFilter
      ? (p.vehicle_model_ids || '').split(',').includes(String(selectedModelFilter))
      : true;

    return matchSearch && matchCat && matchStatus && matchType && matchModel;
  });

  // ── Part groups ──────────────────────────────────────────────
  // The same physical part sold under different companies/brands shares one
  // part_group. Each brand stays its own product (own stock, own price) —
  // the group is what ties them together for staff and for billing.
  const partGroupCounts = products.reduce((acc, p) => {
    if (p.part_group) acc[p.part_group] = (acc[p.part_group] || 0) + 1;
    return acc;
  }, {});
  const knownPartGroups = Object.keys(partGroupCounts).sort();

  // ── Selected category name for the form's dropdown trigger ───
  const selectedCategoryName =
    categories.find(c => c.id === parseInt(formData.category_id))?.category_name || '';

  // ── Categories filtered by the form's dropdown search ────────
  const formFilteredCategories = categories.filter(c =>
    catSearchVal === '' || c.category_name.toLowerCase().includes(catSearchVal.toLowerCase())
  );

  // ── Models filtered by selected vehicle type in form ─────────
  const formFilteredModels = vehicleModels.filter(m =>
    (!formData.vehicle_type_id || m.vehicle_type_id === parseInt(formData.vehicle_type_id)) &&
    (modelSearchVal === '' || m.model_name.toLowerCase().includes(modelSearchVal.toLowerCase()))
  );

  // ── Models filtered by selected type in filter bar ───────────
  const filterBarModels = vehicleModels.filter(m =>
    !selectedTypeFilter || m.vehicle_type_id === parseInt(selectedTypeFilter)
  );

  // ── Open Add Modal ───────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setModelSearchVal('');
    setCatSearchVal('');
    setShowFormModal(true);
  };

  // ── Open Edit Modal ──────────────────────────────────────────
  const handleOpenEditModal = async (p) => {
    setEditingId(p.id);
    const modelIds = p.vehicle_model_ids
      ? p.vehicle_model_ids.split(',').map(Number).filter(Boolean)
      : [];
    setFormData({
      product_name:     p.product_name,
      product_code:     p.product_code,
      barcode:          p.barcode || '',
      category_id:      p.category_id || '',
      brand:            p.brand,
      part_group:       p.part_group || '',
      unit_type:        p.unit_type,
      buying_price:     String(p.buying_price),
      selling_price:    String(p.selling_price),
      stock_qty:        String(p.stock_qty),
      low_stock_limit:  String(p.low_stock_limit),
      supplier_id:      p.supplier_id || '',
      image:            p.image || '',
      status:           p.status,
      vehicle_type_id:  p.vehicle_type_id || '',
      vehicle_model_ids: modelIds,
      images: p.images || []
    });
    setModelSearchVal('');
    setCatSearchVal('');
    setShowFormModal(true);

    // Existing photos aren't in the list payload — fetch them for editing
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setFormData(prev => ({ ...prev, images: data.product.images || [] }));
    } catch { /* photos are optional — form still works without them */ }
    finally { setPhotosLoading(false); }
  };

  // ── Duplicate as another brand ───────────────────────────────
  // Same part from a different company: copy the fitment details, clear the
  // identity + stock fields so the new brand gets its own code, price and count.
  const handleDuplicateForBrand = (p) => {
    setEditingId(null);
    const modelIds = p.vehicle_model_ids
      ? p.vehicle_model_ids.split(',').map(Number).filter(Boolean)
      : [];
    setFormData({
      ...initialForm,
      product_name:      p.product_name,
      product_code:      '',
      barcode:           '',
      category_id:       p.category_id || '',
      brand:             '',
      part_group:        p.part_group || p.product_code,
      unit_type:         p.unit_type,
      buying_price:      '',
      selling_price:     '',
      stock_qty:         '0',
      low_stock_limit:   String(p.low_stock_limit),
      supplier_id:       '',
      status:            'active',
      vehicle_type_id:   p.vehicle_type_id || '',
      vehicle_model_ids: modelIds,
      images:            []
    });
    setModelSearchVal('');
    setCatSearchVal('');
    setShowFormModal(true);
    triggerAlert('info', 'Same part, new company — fill in the brand, item code and prices.');
  };

  // ── Photo upload (resize client-side to keep payload small) ──
  const resizeImageFile = (file, maxDim = 900, quality = 0.75) => new Promise((resolve, reject) => {
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

  // ── Auto-generate barcode ────────────────────────────────────
  const handleAutoGenerateBarcode = () => {
    let newBarcode = '';
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 100) {
      attempts++;
      const rnd = String(Math.floor(100000000 + Math.random() * 900000000));
      newBarcode = `200${rnd}`;
      if (!products.some(p => p.barcode === newBarcode)) unique = true;
    }
    if (unique) {
      setFormData(prev => ({ ...prev, barcode: newBarcode }));
      triggerAlert('success', `Generated barcode: ${newBarcode}`);
    } else {
      triggerAlert('error', 'Failed to generate unique barcode.');
    }
  };

  // ── Toggle model selection ───────────────────────────────────
  const toggleModelSelection = (modelId) => {
    setFormData(prev => {
      const ids = prev.vehicle_model_ids;
      return {
        ...prev,
        vehicle_model_ids: ids.includes(modelId)
          ? ids.filter(id => id !== modelId)
          : [...ids, modelId]
      };
    });
  };

  // ── Submit product form ──────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.product_code || !formData.brand || !formData.buying_price || !formData.selling_price) {
      triggerAlert('warning', 'Please fill in all mandatory fields.');
      return;
    }
    try {
      const isEdit = editingId !== null;
      const url    = isEdit ? `/api/products/${editingId}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          buying_price:    parseFloat(formData.buying_price),
          selling_price:   parseFloat(formData.selling_price),
          stock_qty:       parseFloat(formData.stock_qty),
          low_stock_limit: parseFloat(formData.low_stock_limit),
          category_id:     formData.category_id   ? parseInt(formData.category_id)   : null,
          supplier_id:     formData.supplier_id   ? parseInt(formData.supplier_id)   : null,
          vehicle_type_id: formData.vehicle_type_id ? parseInt(formData.vehicle_type_id) : null,
          vehicle_model_ids: formData.vehicle_model_ids
        })
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setShowFormModal(false);
        fetchData();
      } else {
        triggerAlert('error', data.message || 'Error occurred.');
      }
    } catch {
      triggerAlert('error', 'Server error. Failed to save product.');
    }
  };

  // ── Delete product ───────────────────────────────────────────
  const handleDelete = (id, name) => {
    askConfirm('Delete Product?', `Delete "${name}"? This cannot be undone.`, async () => {
      closeConfirm();
      try {
        const res  = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) { triggerAlert('success', data.message); fetchData(); }
        else               triggerAlert('error', data.message || 'Could not delete product.');
      } catch { triggerAlert('error', 'Server error deleting product.'); }
    });
  };

  // ── Category CRUD ────────────────────────────────────────────
  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const res  = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ category_name: newCatName })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewCatName('');
        const catRes  = await fetch('/api/products/categories', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories);
          setFormData(prev => ({ ...prev, category_id: data.category.id }));
        }
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error creating category.'); }
  };

  const handleUpdateCategory = async (e, id) => {
    e.preventDefault();
    if (!editingCatName) return;
    try {
      const res  = await fetch(`/api/products/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ category_name: editingCatName })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setCategories(categories.map(c => c.id === id ? data.category : c));
        setEditingCatId(null); setEditingCatName('');
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error updating category.'); }
  };

  const handleDeleteCategory = (id, name) => {
    askConfirm('Delete Category?', `Delete category "${name}"?`, async () => {
      closeConfirm();
      try {
        const res  = await fetch(`/api/products/categories/${id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) { triggerAlert('success', data.message); setCategories(categories.filter(c => c.id !== id)); }
        else               triggerAlert('error', data.message);
      } catch { triggerAlert('error', 'Server error deleting category.'); }
    });
  };

  // ── Supplier CRUD ────────────────────────────────────────────
  const handleAddSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!newSupplierData.supplier_name || !newSupplierData.company_name || !newSupplierData.phone) {
      triggerAlert('warning', 'Supplier Name, Company, and Phone are required.');
      return;
    }
    try {
      const res  = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(newSupplierData)
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewSupplierData({ supplier_name: '', company_name: '', phone: '', address: '' });
        setShowSupplierModal(false);
        const supRes  = await fetch('/api/suppliers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const supData = await supRes.json();
        if (supData.success) {
          setSuppliers(supData.suppliers);
          setFormData(prev => ({ ...prev, supplier_id: data.supplier.id }));
        }
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error creating supplier.'); }
  };

  // ── Vehicle Type CRUD ────────────────────────────────────────
  const handleAddVehicleType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      const res  = await fetch('/api/products/vehicle-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ type_name: newTypeName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewTypeName('');
        setVehicleTypes(prev => [...prev, data.type].sort((a, b) => a.type_name.localeCompare(b.type_name)));
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error creating vehicle type.'); }
  };

  const handleUpdateVehicleType = async (e, id) => {
    e.preventDefault();
    if (!editingTypeName.trim()) return;
    try {
      const res  = await fetch(`/api/products/vehicle-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ type_name: editingTypeName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setVehicleTypes(prev => prev.map(t => t.id === id ? data.type : t));
        setEditingTypeId(null); setEditingTypeName('');
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error updating vehicle type.'); }
  };

  const handleDeleteVehicleType = (id, name) => {
    askConfirm('Delete Vehicle Type?', `Delete vehicle type "${name}"? All linked models will also be deleted.`, async () => {
      closeConfirm();
      try {
        const res  = await fetch(`/api/products/vehicle-types/${id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert('success', data.message);
          setVehicleTypes(prev => prev.filter(t => t.id !== id));
          setVehicleModels(prev => prev.filter(m => m.vehicle_type_id !== id));
        } else { triggerAlert('error', data.message); }
      } catch { triggerAlert('error', 'Server error deleting vehicle type.'); }
    });
  };

  // ── Vehicle Model CRUD ───────────────────────────────────────
  const handleAddVehicleModel = async (e) => {
    e.preventDefault();
    if (!newModelName.trim() || !newModelTypeId) {
      triggerAlert('warning', 'Model name and vehicle type are required.');
      return;
    }
    try {
      const res  = await fetch('/api/products/vehicle-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ model_name: newModelName.trim(), vehicle_type_id: parseInt(newModelTypeId) })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewModelName('');
        const typeName = vehicleTypes.find(t => t.id === parseInt(newModelTypeId))?.type_name || '';
        setVehicleModels(prev => [...prev, { ...data.model, type_name: typeName }]);
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error creating vehicle model.'); }
  };

  const handleUpdateVehicleModel = async (e, id) => {
    e.preventDefault();
    if (!editingModelName.trim() || !editingModelTypeId) return;
    try {
      const res  = await fetch(`/api/products/vehicle-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ model_name: editingModelName.trim(), vehicle_type_id: parseInt(editingModelTypeId) })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', data.message);
        const typeName = vehicleTypes.find(t => t.id === parseInt(editingModelTypeId))?.type_name || '';
        setVehicleModels(prev => prev.map(m => m.id === id ? { ...data.model, type_name: typeName } : m));
        setEditingModelId(null); setEditingModelName(''); setEditingModelTypeId('');
      } else { triggerAlert('error', data.message); }
    } catch { triggerAlert('error', 'Server error updating vehicle model.'); }
  };

  const handleDeleteVehicleModel = (id, name) => {
    askConfirm('Delete Vehicle Model?', `Delete model "${name}"?`, async () => {
      closeConfirm();
      try {
        const res  = await fetch(`/api/products/vehicle-models/${id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert('success', data.message);
          setVehicleModels(prev => prev.filter(m => m.id !== id));
        } else { triggerAlert('error', data.message); }
      } catch { triggerAlert('error', 'Server error deleting vehicle model.'); }
    });
  };

  // ── Reusable CSS class ───────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white';
  const selectCls = `${inputCls} appearance-none`;
  const manageLiCls = 'flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800';

  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── 1. Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-sans">Products Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage tractor parts, brands, unit packages, buying prices, and alerts.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/barcode-print"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Barcode Printer</span>
          </Link>

          <button
            onClick={() => setShowCatModal(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Tag className="h-4 w-4 text-amber-500" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setShowVehicleTypeModal(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Truck className="h-4 w-4 text-sky-500" />
            <span>Vehicle Types</span>
          </button>

          <button
            onClick={() => setShowVehicleModelModal(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Filter className="h-4 w-4 text-violet-500" />
            <span>Vehicle Models</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filters ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search by code, barcode or name..."
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Category */}
        <div className="relative">
          <select value={selectedCatFilter} onChange={e => setSelectedCatFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
          </select>
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Vehicle Type filter */}
        <div className="relative">
          <select value={selectedTypeFilter}
            onChange={e => { setSelectedTypeFilter(e.target.value); setSelectedModelFilter(''); }}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none">
            <option value="">All Types</option>
            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
          </select>
          <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Vehicle Model filter */}
        <div className="relative">
          <select value={selectedModelFilter} onChange={e => setSelectedModelFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none">
            <option value="">All Models</option>
            {filterBarModels.map(m => <option key={m.id} value={m.id}>{m.model_name}</option>)}
          </select>
          <ChevronDown className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Status filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {['', 'active', 'inactive'].map(s => (
          <button key={s}
            onClick={() => setSelectedStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
              selectedStatusFilter === s
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-amber-400'
            }`}
          >
            {s === '' ? 'All Status' : s === 'active' ? '● Active' : '○ Inactive'}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-400 font-semibold">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── 3. Products Table ─────────────────────────────────── */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-4">Item Code</th>
                <th className="px-5 py-4">Product Name</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4 text-right">Buying</th>
                <th className="px-5 py-4 text-right">Selling</th>
                <th className="px-5 py-4 text-center">Stock</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400">No products match your filter parameters.</td></tr>
              ) : (
                filteredProducts.map(p => {
                  const isLowStock = parseFloat(p.stock_qty) <= parseFloat(p.low_stock_limit);
                  const modelNames = p.vehicle_model_names ? p.vehicle_model_names.split('||') : [];
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors ${isLowStock && p.status === 'active' ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-5 py-3.5 font-mono font-bold">{p.product_code}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-850 dark:text-white">{p.product_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Brand: {p.brand}{p.barcode && ` | ${p.barcode}`}</span>
                          {p.part_group && (
                            <button
                              type="button"
                              onClick={() => setSearchVal(p.part_group)}
                              className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                              title="Show every company for this part"
                            >
                              <Layers className="h-3 w-3" />
                              {p.part_group}
                              {partGroupCounts[p.part_group] > 1 && (
                                <span className="opacity-70">· {partGroupCounts[p.part_group]} brands</span>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{p.category_name || '—'}</td>
                      <td className="px-5 py-3.5">
                        {p.vehicle_type_name ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-full px-2 py-0.5 w-fit">
                              <Truck className="h-3 w-3" />
                              {p.vehicle_type_name}
                            </span>
                            {modelNames.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {modelNames.map((mn, i) => (
                                  <span key={i} className="text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-full px-1.5 py-0.5">
                                    {mn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono">Rs. {parseFloat(p.buying_price).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-mono">Rs. {parseFloat(p.selling_price).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-bold font-mono ${isLowStock ? 'text-rose-500 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                            {parseFloat(p.stock_qty)} {p.unit_type}
                          </span>
                          {isLowStock && p.status === 'active' && (
                            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 animate-bounce" title="Low stock!" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span className="capitalize">{p.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleViewProduct(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                            title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                            title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDuplicateForBrand(p)}
                            className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                            title="Same part, another company">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.product_name)}
                            className="p-1.5 rounded-lg border border-rose-200/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                            title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. Add/Edit Product Modal ─────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowFormModal(false)} />
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-850 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              {editingId ? 'Edit Product Details' : 'Add New Product Inventory'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Product Name *</label>
                  <input type="text" required value={formData.product_name}
                    onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Bearing 6205, Mobil Oil 1L etc." className={inputCls} />
                </div>

                {/* Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Product Code *</label>
                  <input type="text" required value={formData.product_code}
                    onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                    placeholder="BRG6205, OIL001" className={inputCls} />
                </div>

                {/* Barcode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Barcode (Optional)</span>
                    <button type="button" onClick={handleAutoGenerateBarcode}
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold">+ Auto-Generate</button>
                  </label>
                  <input type="text" value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or type barcode" className={inputCls} />
                </div>

                {/* Category */}
                <div className="space-y-1 relative" ref={catDropdownRef}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Category</span>
                    <button type="button" onClick={() => setShowCatModal(true)}
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold">+ Add New</button>
                  </label>

                  {/* Searchable picker — the category list keeps growing, so typing
                      beats scrolling once there are more than a handful. */}
                  <button
                    type="button"
                    onClick={() => { setShowCatDropdown(v => !v); setCatSearchVal(''); }}
                    className={`${inputCls} text-left flex items-center justify-between gap-2`}
                  >
                    <span className={selectedCategoryName ? 'truncate' : 'truncate text-slate-400'}>
                      {selectedCategoryName || 'Uncategorized'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>

                  {showCatDropdown && (
                    <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={catSearchVal}
                            onChange={e => setCatSearchVal(e.target.value)}
                            placeholder="Search categories..."
                            className="w-full pl-7 pr-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:text-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, category_id: '' }); setShowCatDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            formData.category_id === '' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          Uncategorized
                        </button>
                        {formFilteredCategories.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No category matches "{catSearchVal}".</p>
                        ) : (
                          formFilteredCategories.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setFormData({ ...formData, category_id: c.id }); setShowCatDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                parseInt(formData.category_id) === c.id
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{c.category_name}</span>
                              {parseInt(formData.category_id) === c.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Brand Name *</label>
                  <input type="text" required value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="SKF, TVS, Mobil" className={inputCls} />
                </div>

                {/* Part Group — links the same part across different companies */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    Part Group
                    <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal">(optional)</span>
                  </label>
                  <input type="text" list="part-group-options" value={formData.part_group}
                    onChange={e => setFormData({ ...formData, part_group: e.target.value })}
                    placeholder="OIL FILTER MF241" className={inputCls} />
                  <datalist id="part-group-options">
                    {knownPartGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Give the <span className="font-bold">same part group</span> to the same part from different companies.
                    Each brand keeps its own stock and price, and billing will show the alternatives side by side.
                  </p>
                </div>

                {/* Unit Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unit Type *</label>
                  <select value={formData.unit_type}
                    onChange={e => setFormData({ ...formData, unit_type: e.target.value })} className={selectCls}>
                    <option value="Piece">Piece (pc)</option>
                    <option value="Litre">Litre (L)</option>
                    <option value="Millilitre">Millilitre (ml)</option>
                    <option value="Kg">Kilogram (kg)</option>
                    <option value="Gram">Gram (g)</option>
                  </select>
                </div>

                {/* Buying Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Buying Price (Rs.) *</label>
                  <input type="number" step="0.01" min="0" required value={formData.buying_price}
                    onChange={e => setFormData({ ...formData, buying_price: e.target.value })}
                    placeholder="Cost price" className={`${inputCls} font-mono`} />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Selling Price (Rs.) *</label>
                  <input type="number" step="0.01" min="0" required value={formData.selling_price}
                    onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="Billing retail price" className={`${inputCls} font-mono`} />
                </div>

                {/* Stock Qty */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stock Quantity</label>
                  <input type="number" step={formData.unit_type === 'Piece' ? '1' : '0.001'} min="0"
                    value={formData.stock_qty}
                    onChange={e => setFormData({ ...formData, stock_qty: e.target.value })}
                    placeholder="Initial stock count" className={`${inputCls} font-mono`} />
                </div>

                {/* Low Stock Limit */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Low Stock Alert Limit</label>
                  <input type="number" step={formData.unit_type === 'Piece' ? '1' : '0.001'} min="0"
                    value={formData.low_stock_limit}
                    onChange={e => setFormData({ ...formData, low_stock_limit: e.target.value })}
                    placeholder="Alert threshold" className={`${inputCls} font-mono`} />
                </div>

                {/* Supplier */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Supplier</span>
                    <button type="button" onClick={() => setShowSupplierModal(true)}
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold">+ Add New</button>
                  </label>
                  <select value={formData.supplier_id}
                    onChange={e => setFormData({ ...formData, supplier_id: e.target.value })} className={selectCls}>
                    <option value="">No Supplier Attached</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name} ({s.supplier_name})</option>)}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Catalog Status</label>
                  <select value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })} className={selectCls}>
                    <option value="active">Active Listing</option>
                    <option value="inactive">Inactive / Hidden</option>
                  </select>
                </div>
              </div>

              {/* ── Vehicle Information Section ──────────────────── */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Vehicle Information</span>
                  <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vehicle Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                      <span>Vehicle Type</span>
                      <button type="button" onClick={() => setShowVehicleTypeModal(true)}
                        className="text-[10px] text-sky-500 hover:text-sky-600 font-bold">+ Manage Types</button>
                    </label>
                    <select value={formData.vehicle_type_id}
                      onChange={e => setFormData({ ...formData, vehicle_type_id: e.target.value, vehicle_model_ids: [] })}
                      className={selectCls}>
                      <option value="">Select Vehicle Type</option>
                      {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                    </select>
                  </div>

                  {/* Vehicle Models multi-select */}
                  <div className="space-y-1" ref={modelDropdownRef}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                      <span>Vehicle Models</span>
                      <button type="button" onClick={() => setShowVehicleModelModal(true)}
                        className="text-[10px] text-violet-500 hover:text-violet-600 font-bold">+ Manage Models</button>
                    </label>

                    {/* Dropdown trigger */}
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(v => !v)}
                      disabled={!formData.vehicle_type_id && vehicleModels.length === 0}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none text-left flex items-center justify-between dark:text-white disabled:opacity-50"
                    >
                      <span className="text-slate-400">
                        {formData.vehicle_model_ids.length === 0
                          ? (formData.vehicle_type_id ? 'Select models...' : 'Select vehicle type first')
                          : `${formData.vehicle_model_ids.length} model${formData.vehicle_model_ids.length > 1 ? 's' : ''} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>

                    {/* Dropdown list */}
                    {showModelDropdown && (
                      <div className="absolute z-20 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <input
                            type="text"
                            value={modelSearchVal}
                            onChange={e => setModelSearchVal(e.target.value)}
                            placeholder="Search models..."
                            className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {formFilteredModels.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">
                              {formData.vehicle_type_id ? 'No models for this type yet.' : 'Select a vehicle type first.'}
                            </p>
                          ) : (
                            formFilteredModels.map(m => (
                              <label key={m.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.vehicle_model_ids.includes(m.id)}
                                  onChange={() => toggleModelSelection(m.id)}
                                  className="accent-amber-500 h-3.5 w-3.5 rounded"
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.model_name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selected model tags */}
                    {formData.vehicle_model_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {formData.vehicle_model_ids.map(mid => {
                          const model = vehicleModels.find(m => m.id === mid);
                          if (!model) return null;
                          return (
                            <span key={mid}
                              className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {model.model_name}
                              <button type="button" onClick={() => toggleModelSelection(mid)}
                                className="hover:text-rose-500 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Product Photos ─────────────────────────────── */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
                  <span>Product Photos</span>
                  {photosLoading && <span className="text-[10px] text-slate-400 normal-case font-semibold">Loading photos...</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                      <img src={img} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeFormPhoto(idx)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-amber-500 hover:text-amber-500 cursor-pointer transition-colors">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[9px] font-bold">Add Photos</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosSelected} />
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button type="button" onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20">
                  {editingId ? 'Update Product' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Category Management Modal ─────────────────────── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setShowCatModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl z-10 flex flex-col max-h-[90vh]">
            <button onClick={() => setShowCatModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">Manage Categories</h4>

            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 max-h-60">
              {categories.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-4">No categories yet.</p>
              ) : (
                <ul className="space-y-1">
                  {categories.map(cat => (
                    <li key={cat.id} className={manageLiCls}>
                      {editingCatId === cat.id ? (
                        <form onSubmit={e => handleUpdateCategory(e, cat.id)} className="flex items-center gap-2 w-full">
                          <input type="text" required autoFocus value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-amber-500 dark:text-white" />
                          <button type="submit" className="p-1 rounded text-green-500 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setEditingCatId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                        </form>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cat.category_name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.category_name); }}
                              className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteCategory(cat.id, cat.category_name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <input type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="New category name..." className={inputCls} />
              <button type="submit" className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 font-bold text-xs text-white shadow-md">
                Add Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Supplier Quick Modal ───────────────────────────── */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setShowSupplierModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button onClick={() => setShowSupplierModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Register Supplier</h3>
            <form onSubmit={handleAddSupplierSubmit} className="space-y-4">
              {[
                { label: 'Company Name *', key: 'company_name', placeholder: 'Chevron Lubricants' },
                { label: 'Contact Agent *', key: 'supplier_name', placeholder: 'Sales Rep Name' },
                { label: 'Phone *', key: 'phone', placeholder: 'Contact phone' }
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{f.label}</label>
                  <input type="text" required value={newSupplierData[f.key]}
                    onChange={e => setNewSupplierData({ ...newSupplierData, [f.key]: e.target.value })}
                    placeholder={f.placeholder} className={inputCls} />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                <textarea value={newSupplierData.address}
                  onChange={e => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                  placeholder="Company office address" rows="2" className={inputCls} />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowSupplierModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg">
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. Vehicle Types Management Modal ────────────────── */}
      {showVehicleTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setShowVehicleTypeModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl z-10 flex flex-col max-h-[90vh]">
            <button onClick={() => setShowVehicleTypeModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-4 w-4 text-sky-500" />
              <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Manage Vehicle Types</h4>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">e.g. Tractor, Trailer, Van, Lorry...</p>

            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 max-h-60">
              {vehicleTypes.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-4">No vehicle types yet. Add one below.</p>
              ) : (
                <ul className="space-y-1">
                  {vehicleTypes.map(t => (
                    <li key={t.id} className={manageLiCls}>
                      {editingTypeId === t.id ? (
                        <form onSubmit={e => handleUpdateVehicleType(e, t.id)} className="flex items-center gap-2 w-full">
                          <input type="text" required autoFocus value={editingTypeName}
                            onChange={e => setEditingTypeName(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-sky-500 dark:text-white" />
                          <button type="submit" className="p-1 rounded text-green-500 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setEditingTypeId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.type_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingTypeId(t.id); setEditingTypeName(t.type_name); }}
                              className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteVehicleType(t.id, t.type_name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddVehicleType} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <input type="text" required value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                placeholder="New type name (e.g. Tractor)" className={inputCls} />
              <button type="submit" className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 py-2.5 font-bold text-xs text-white shadow-md">
                Add Vehicle Type
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. Vehicle Models Management Modal ───────────────── */}
      {showVehicleModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setShowVehicleModelModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl z-10 flex flex-col max-h-[90vh]">
            <button onClick={() => setShowVehicleModelModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Filter className="h-4 w-4 text-violet-500" />
              <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Manage Vehicle Models</h4>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">e.g. TAFE 45 DI, MF 241, Mahindra 575 DI...</p>

            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 max-h-64">
              {vehicleModels.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-4">No models yet. Add vehicle types first, then add models below.</p>
              ) : (
                <ul className="space-y-1">
                  {vehicleModels.map(m => (
                    <li key={m.id} className={manageLiCls}>
                      {editingModelId === m.id ? (
                        <form onSubmit={e => handleUpdateVehicleModel(e, m.id)} className="flex items-center gap-2 w-full flex-wrap">
                          <input type="text" required autoFocus value={editingModelName}
                            onChange={e => setEditingModelName(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-violet-500 dark:text-white" />
                          <select value={editingModelTypeId} onChange={e => setEditingModelTypeId(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white">
                            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                          </select>
                          <button type="submit" className="p-1 rounded text-green-500 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setEditingModelId(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.model_name}</span>
                            <span className="text-[10px] text-slate-400">{m.type_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditingModelId(m.id); setEditingModelName(m.model_name); setEditingModelTypeId(m.vehicle_type_id); }}
                              className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteVehicleModel(m.id, m.model_name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddVehicleModel} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Model Name *</label>
                  <input type="text" required value={newModelName} onChange={e => setNewModelName(e.target.value)}
                    placeholder="TAFE 45 DI, MF 241..." className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Type *</label>
                  <select value={newModelTypeId} onChange={e => setNewModelTypeId(e.target.value)}
                    required className={selectCls}>
                    <option value="">Select Type</option>
                    {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit"
                className="w-full rounded-xl bg-violet-500 hover:bg-violet-600 py-2.5 font-bold text-xs text-white shadow-md">
                Add Vehicle Model
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── View Product Modal ────────────────────────────────── */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeViewProduct} />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto">
            <button onClick={closeViewProduct}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>

            {/* Photos */}
            {viewImagesLoading ? (
              <p className="text-[10px] text-slate-400 font-semibold mb-3">Loading photos...</p>
            ) : viewImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {viewImages.map((img, idx) => (
                  <button key={idx} type="button" onClick={() => setLightboxIndex(idx)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                    <img src={img} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors">
                      <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-850 dark:text-white">{viewProduct.product_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-slate-400">{viewProduct.product_code}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  viewProduct.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${viewProduct.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="capitalize">{viewProduct.status}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Brand</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewProduct.brand || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Barcode</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewProduct.barcode || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewProduct.category_name || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Supplier</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{viewProduct.supplier_name || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Buying Price</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">Rs. {parseFloat(viewProduct.buying_price).toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Selling Price</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">Rs. {parseFloat(viewProduct.selling_price).toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stock Quantity</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{parseFloat(viewProduct.stock_qty)} {viewProduct.unit_type}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Low Stock Limit</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{parseFloat(viewProduct.low_stock_limit)} {viewProduct.unit_type}</span>
              </div>
              {viewProduct.vehicle_type_name && (
                <div className="col-span-2 space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vehicle Compatibility</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-full px-2 py-0.5">
                      <Truck className="h-3 w-3" />
                      {viewProduct.vehicle_type_name}
                    </span>
                    {(viewProduct.vehicle_model_names ? viewProduct.vehicle_model_names.split('||') : []).map((mn, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-full px-1.5 py-0.5">
                        {mn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeViewProduct}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150">
                Close
              </button>
              <button type="button" onClick={() => { handleOpenEditModal(viewProduct); closeViewProduct(); }}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all duration-150">
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/80" onClick={() => setLightboxIndex(null)} />
          <button onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white">
            <X className="h-6 w-6" />
          </button>

          {viewImages.length > 1 && (
            <>
              <button onClick={showPrevImage}
                className="absolute left-5 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={showNextImage}
                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img src={viewImages[lightboxIndex]} alt="Product photo enlarged" className="relative z-10 max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain" />

          {viewImages.length > 1 && (
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-xs font-bold text-white/80 bg-slate-950/60 rounded-full px-3 py-1">
              {lightboxIndex + 1} / {viewImages.length}
            </span>
          )}
        </div>
      )}

      {/* ── Alert Toast ───────────────────────────────────────── */}
      <AlertPopup
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />

      {/* ── Confirm Dialog ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default Products;
