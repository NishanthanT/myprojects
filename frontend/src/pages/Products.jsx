import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, Search, Filter, AlertTriangle, Sparkles, Image, Check, X } from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchVal, setSearchVal] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Modal forms states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    supplier_name: '',
    company_name: '',
    phone: '',
    address: ''
  });

  // Delete modal state
  const [deleteId, setDeleteId] = useState(null);

  // Alert system state
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  // Add/Edit Product form state
  const initialForm = {
    product_name: '',
    product_code: '',
    barcode: '',
    category_id: '',
    brand: '',
    unit_type: 'Piece',
    buying_price: '',
    selling_price: '',
    stock_qty: '0',
    low_stock_limit: '5',
    supplier_id: '',
    image: '',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialForm);

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      // Products
      const prodRes = await fetch('/api/products', { headers });
      const prodData = await prodRes.json();
      if (prodData.success) setProducts(prodData.products);

      // Categories
      const catRes = await fetch('/api/products/categories', { headers });
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);

      // Suppliers
      const supRes = await fetch('/api/suppliers', { headers });
      const supData = await supRes.json();
      if (supData.success) setSuppliers(supData.suppliers);

    } catch (error) {
      triggerAlert('error', 'Failed to retrieve database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.product_name.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchVal.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchVal));

    const matchesCategory = selectedCatFilter ? p.category_id === parseInt(selectedCatFilter) : true;
    const matchesStatus = selectedStatusFilter ? p.status === selectedStatusFilter : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingId(product.id);
    setFormData({
      product_name: product.product_name,
      product_code: product.product_code,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand: product.brand,
      unit_type: product.unit_type,
      buying_price: String(product.buying_price),
      selling_price: String(product.selling_price),
      stock_qty: String(product.stock_qty),
      low_stock_limit: String(product.low_stock_limit),
      supplier_id: product.supplier_id || '',
      image: product.image || '',
      status: product.status
    });
    setShowFormModal(true);
  };

  const handleAutoGenerateBarcode = () => {
    let newBarcode = '';
    let unique = false;
    let attempts = 0;

    while (!unique && attempts < 100) {
      attempts++;
      const randomPart = String(Math.floor(100000000 + Math.random() * 900000000));
      newBarcode = `200${randomPart}`;
      
      const duplicate = products.some(p => p.barcode === newBarcode);
      if (!duplicate) {
        unique = true;
      }
    }

    if (unique) {
      setFormData(prev => ({ ...prev, barcode: newBarcode }));
      triggerAlert('success', `Generated barcode: ${newBarcode}`);
    } else {
      triggerAlert('error', 'Failed to generate a unique barcode. Please try again.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.product_code || !formData.brand || !formData.buying_price || !formData.selling_price) {
      triggerAlert('warning', 'Please fill in all mandatory fields.');
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/products/${editingId}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          buying_price: parseFloat(formData.buying_price),
          selling_price: parseFloat(formData.selling_price),
          stock_qty: parseFloat(formData.stock_qty),
          low_stock_limit: parseFloat(formData.low_stock_limit),
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null
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
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to save product.');
    }
  };

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const response = await fetch('/api/products/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ category_name: newCatName })
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewCatName('');
        setShowCatModal(false);
        
        // Re-fetch categories
        const catRes = await fetch('/api/products/categories', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories);
          // Auto select newly created category
          setFormData(prev => ({ ...prev, category_id: data.category.id }));
        }
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server connection error creating category.');
    }
  };

  const handleAddSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!newSupplierData.supplier_name || !newSupplierData.company_name || !newSupplierData.phone) {
      triggerAlert('warning', 'Supplier Name, Company, and Phone are required.');
      return;
    }

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSupplierData)
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setNewSupplierData({ supplier_name: '', company_name: '', phone: '', address: '' });
        setShowSupplierModal(false);
        
        // Re-fetch suppliers
        const supRes = await fetch('/api/suppliers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const supData = await supRes.json();
        if (supData.success) {
          setSuppliers(supData.suppliers);
          // Auto select newly created supplier
          setFormData(prev => ({ ...prev, supplier_id: data.supplier.id }));
        }
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server connection error creating supplier.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/products/${deleteId}`, {
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
        triggerAlert('error', data.message || 'Could not delete product.');
        setDeleteId(null);
      }
    } catch (error) {
      triggerAlert('error', 'Server error deleting product.');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-sans">Products Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage tractor parts, brands, unit packages, buying prices, and alerts.</p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/barcode-print"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="h-4.5 w-4.5 text-amber-500" />
            <span>Barcode Printer</span>
          </Link>

          <button
            onClick={() => setShowCatModal(true)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="h-4.5 w-4.5 text-amber-500" />
            <span>Add Category</span>
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search by code, barcode or name..."
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={selectedCatFilter}
            onChange={(e) => setSelectedCatFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </select>
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* 3. Products Table */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Item Code</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4 text-right">Buying Price</th>
                <th className="px-6 py-4 text-right">Selling Price</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">No products match your filter parameters.</td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = parseFloat(p.stock_qty) <= parseFloat(p.low_stock_limit);
                  
                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors duration-150 ${
                        isLowStock && p.status === 'active' ? 'bg-rose-500/5 dark:bg-rose-950/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold">{p.product_code}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-850 dark:text-white">{p.product_name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Brand: {p.brand} {p.barcode && `| Barcode: ${p.barcode}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{p.category_name || 'Uncategorized'}</td>
                      <td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-500">{p.supplier_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(p.buying_price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono">Rs. {parseFloat(p.selling_price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`font-bold font-mono ${isLowStock ? 'text-rose-500 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                            {parseFloat(p.stock_qty)} {p.unit_type}
                          </span>
                          {isLowStock && p.status === 'active' && (
                            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 animate-bounce" title="Low stock warning" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === 'active' 
                            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span className="capitalize">{p.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                            title="Edit Product"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="p-1.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                            title="Delete Product"
                          >
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

      {/* 4. Add/Edit Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowFormModal(false)} />
          
          <div className="relative w-full max-w-2xl transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
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
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Bearing 6205, Mobil Oil 1L etc."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Product Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    placeholder="BRG6205, OIL001"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Barcode (Optional)</span>
                    <button 
                      type="button" 
                      onClick={handleAutoGenerateBarcode} 
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold font-sans"
                    >
                      + Auto-Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan barcode scanner or type..."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Category with quick add button */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Category</span>
                    <button 
                      type="button" 
                      onClick={() => setShowCatModal(true)} 
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold"
                    >
                      + Add New
                    </button>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="SKF, TVS, Mobil"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Unit Type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unit Type *</label>
                  <select
                    value={formData.unit_type}
                    onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
                  >
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
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    placeholder="Cost price"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    placeholder="Billing retail price"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Stock Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Stock Quantity</label>
                  <input
                    type="number"
                    step={formData.unit_type === 'Piece' ? '1' : '0.001'}
                    min="0"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    placeholder="Initial stock count"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Low Stock Limit */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Low Stock Alert Limit</label>
                  <input
                    type="number"
                    step={formData.unit_type === 'Piece' ? '1' : '0.001'}
                    min="0"
                    value={formData.low_stock_limit}
                    onChange={(e) => setFormData({ ...formData, low_stock_limit: e.target.value })}
                    placeholder="Alert threshold"
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                  />
                </div>

                {/* Supplier Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                    <span>Supplier</span>
                    <button 
                      type="button" 
                      onClick={() => setShowSupplierModal(true)} 
                      className="text-[10px] text-amber-500 hover:text-amber-600 font-bold"
                    >
                      + Add New
                    </button>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
                  >
                    <option value="">No Supplier Attached</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.company_name} ({sup.supplier_name})</option>
                    ))}
                  </select>
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Catalog Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
                  >
                    <option value="active">Active Listing</option>
                    <option value="inactive">Inactive / Hidden</option>
                  </select>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20"
                >
                  {editingId ? 'Update Product Details' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Category Quick Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/20" onClick={() => setShowCatModal(false)} />
          <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl z-10">
            <button 
              onClick={() => setShowCatModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">Register Category</h4>
            
            <form onSubmit={handleAddCategorySubmit} className="space-y-3">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Bearing, Engine Oil, Grease..."
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 font-bold text-xs text-white shadow-md"
              >
                Register Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Supplier Quick Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/35" onClick={() => setShowSupplierModal(false)} />
          <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button 
              onClick={() => setShowSupplierModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              Register Supplier profile
            </h3>
            
            <form onSubmit={handleAddSupplierSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierData.company_name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, company_name: e.target.value })}
                  placeholder="Chevron Lubricants, Lanka Spares etc."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Agent Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierData.supplier_name}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, supplier_name: e.target.value })}
                  placeholder="Sales Representative Name"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newSupplierData.phone}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                  placeholder="Contact agent phone"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier Address</label>
                <textarea
                  value={newSupplierData.address}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                  placeholder="Company office address details"
                  rows="3"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion confirmations modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Product Inventory?"
        message="Are you sure you want to delete this product listing from the catalog? This will prevent barcode lookups and checkout scans."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Notification Toast */}
      <AlertPopup
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default Products;
