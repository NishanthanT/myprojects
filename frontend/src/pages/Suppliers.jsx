import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Truck, Phone, MapPin, Building, X } from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import SupplierAccount from '../components/SupplierAccount.jsx';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [accountSupplier, setAccountSupplier] = useState(null);

  // Forms state
  const initialForm = { supplier_name: '', company_name: '', phone_numbers: [{ label: '', number: '' }], address: '' };
  const [formData, setFormData] = useState(initialForm);

  // Alerts
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.suppliers);
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to retrieve suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name.toLowerCase().includes(searchVal.toLowerCase()) ||
    s.company_name.toLowerCase().includes(searchVal.toLowerCase()) ||
    (s.phone_numbers || [{ label: '', number: s.phone }]).some(contact =>
      contact.number.includes(searchVal) || contact.label.toLowerCase().includes(searchVal.toLowerCase()))
  );

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (sup) => {
    setEditingId(sup.id);
    setFormData({
      supplier_name: sup.supplier_name,
      company_name: sup.company_name,
      phone_numbers: sup.phone_numbers?.length ? sup.phone_numbers.map(contact => ({ ...contact })) : [{ label: '', number: sup.phone }],
      address: sup.address || ''
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_name || !formData.company_name || !formData.phone_numbers.every(contact => contact.number.trim())) {
      triggerAlert('warning', 'Please fill in mandatory fields.');
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/suppliers/${editingId}` : '/api/suppliers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, phone: formData.phone_numbers[0].number })
      });

      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setShowModal(false);
        fetchSuppliers();
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to save supplier.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/suppliers/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setDeleteId(null);
        fetchSuppliers();
      } else {
        triggerAlert('error', data.message || 'Could not delete supplier profile.');
        setDeleteId(null);
      }
    } catch (error) {
      triggerAlert('error', 'Server error deleting supplier profile.');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Supplier Log</h1>
          <p className="text-xs text-slate-500 mt-1">Manage vendor suppliers records and tractor parts companies.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Register Supplier</span>
        </button>
      </div>

      {/* 2. Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative max-w-md">
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search by company or agent contact..."
          className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
        />
        <Search className="absolute left-7 top-6 h-4 w-4 text-slate-400" />
      </div>

      {/* 3. Suppliers Grid */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSuppliers.length === 0 ? (
            <p className="col-span-full text-center text-slate-400 py-12">No supplier records match your query.</p>
          ) : (
            filteredSuppliers.map((sup) => (
              <div 
                key={sup.id} 
                className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-500/35 transition-all duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-850 dark:text-white truncate">{sup.company_name}</h3>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold tracking-wider flex items-center gap-1 mt-1">
                      <Building className="h-3.5 w-3.5" />
                      <span>Agent: {sup.supplier_name}</span>
                    </span>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {(sup.phone_numbers || [{ label: '', number: sup.phone }]).map((contact, index) => (
                    <div key={index} className="flex gap-1.5 items-center">
                      <Phone className="h-4 w-4 shrink-0 text-slate-455" />
                      <span className="break-all">{contact.label && `${contact.label}: `}{contact.number}</span>
                    </div>
                  ))}
                  <div className="flex gap-1.5 items-start">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-455 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">{sup.address || 'No registered address.'}</p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                  <button onClick={() => setAccountSupplier(sup)} className="mr-auto rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600">View Account</button>
                  <button
                    onClick={() => handleOpenEditModal(sup)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400"
                    title="Edit Supplier"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(sup.id)}
                    className="p-1.5 rounded-lg border border-rose-200/50 dark:border-rose-900/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"
                    title="Delete Supplier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/35" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingId ? 'Edit Supplier details' : 'Register Supplier profile'}
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Chevron Lubricants, Lanka Spares etc."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Agent Name *</label>
                <input
                  type="text"
                  required
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Sales Representative Name"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Phone Numbers *</span>
                  <button type="button"
                    onClick={() => setFormData(current => ({ ...current, phone_numbers: [...current.phone_numbers, { label: '', number: '' }] }))}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20">
                    <Plus className="h-4 w-4" /> Add Phone No
                  </button>
                </div>
                {formData.phone_numbers.map((contact, index) => (
                  <div key={index} className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Phone {index + 1}</span>
                      {formData.phone_numbers.length > 1 && (
                        <button type="button" aria-label={`Remove phone ${index + 1}`}
                          onClick={() => setFormData(current => ({ ...current, phone_numbers: current.phone_numbers.filter((_, i) => i !== index) }))}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-500/10">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <label htmlFor={`supplier-phone-label-${index}`} className="block text-xs font-bold text-slate-500">Number Name</label>
                    <input id={`supplier-phone-label-${index}`} type="text" maxLength={100}
                      value={contact.label}
                      onChange={(e) => setFormData(current => ({ ...current, phone_numbers: current.phone_numbers.map((item, i) => i === index ? { ...item, label: e.target.value } : item) }))}
                      placeholder="e.g. Office, Sales Rep, WhatsApp"
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
                    <label htmlFor={`supplier-phone-number-${index}`} className="block text-xs font-bold text-slate-500">Phone Number *</label>
                    <input id={`supplier-phone-number-${index}`} type="tel" required maxLength={20}
                      value={contact.number}
                      onChange={(e) => setFormData(current => ({ ...current, phone_numbers: current.phone_numbers.map((item, i) => i === index ? { ...item, number: e.target.value } : item) }))}
                      placeholder="Contact phone number"
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Company office address details"
                  rows="3"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
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
                  {editingId ? 'Update Supplier details' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deletion Dialog */}
      {accountSupplier && <SupplierAccount key={accountSupplier.id} supplier={accountSupplier} onClose={() => setAccountSupplier(null)} />}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Supplier Profile?"
        message="Are you sure you want to delete this supplier profile? This will break relations with catalog items currently mapped to this company."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* Alert toast */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default Suppliers;
