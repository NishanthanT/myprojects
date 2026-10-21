import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Filter } from 'lucide-react';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import CustomerTable from '../components/CustomerTable.jsx';
import CustomerHistory from '../components/CustomerHistory.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const Customers = () => {
  const { user } = useAuth();
  const [viewCustomer, setViewCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [filterCredit, setFilterCredit] = useState('all');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Forms state
  const initialForm = { name: '', phone: '', address: '', pending_balance: '0', sms_enabled: true };
  const [formData, setFormData] = useState(initialForm);

  // Alerts
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to retrieve customer database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchVal.toLowerCase()) || c.phone.includes(searchVal);
    const hasCredit = parseFloat(c.pending_balance) > 0;
    const matchesCredit = filterCredit === 'all' ? true : (filterCredit === 'credit' ? hasCredit : !hasCredit);
    return matchesSearch && matchesCredit;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingId(cust.id);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      address: cust.address || '',
      pending_balance: String(cust.pending_balance),
      sms_enabled: !!cust.sms_enabled
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      triggerAlert('warning', 'Please fill in Name and Phone details.');
      return;
    }

    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/customers/${editingId}` : '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          pending_balance: parseFloat(formData.pending_balance || 0),
          sms_enabled: !!formData.sms_enabled
        })
      });

      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setShowModal(false);
        fetchCustomers();
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to save customer.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/customers/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        setDeleteId(null);
        fetchCustomers();
      } else {
        triggerAlert('error', data.message || 'Could not delete profile.');
        setDeleteId(null);
      }
    } catch (error) {
      triggerAlert('error', 'Server error deleting customer profile.');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Customer Database</h1>
          <p className="text-xs text-slate-500 mt-1">Manage buyer profiles, pending credits, and text messaging configurations.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* 2. Search Box & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search by phone number or name..."
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
        <div className="relative w-full sm:w-56 shrink-0">
          <select
            value={filterCredit}
            onChange={(e) => setFilterCredit(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white appearance-none"
          >
            <option value="all">All Customers</option>
            <option value="credit">With Pending Credit</option>
            <option value="no-credit">No Credit Due</option>
          </select>
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {loading ? <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div> : <CustomerTable customers={filteredCustomers} allCustomers={customers} onView={setViewCustomer} onEdit={handleOpenEditModal} onDelete={setDeleteId} canDelete={user?.role === 'admin'} />}

      {/* 4. CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/35" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingId ? 'Edit Customer Profile' : 'Register Customer Profile'}
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07XXXXXXXX"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Credit Pending Balance (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pending_balance}
                  onChange={(e) => setFormData({ ...formData, pending_balance: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Home Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address details"
                  rows="2"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              {/* SMS Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">SMS Alerts Dispatch</span>
                  <span className="text-[10px] text-slate-400">Receive transactional texts updates</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sms_enabled}
                    onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
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
                  {editingId ? 'Update Customer Profile' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion confirmation */}
      {viewCustomer && <CustomerHistory key={viewCustomer.id} customer={viewCustomer} onClose={() => setViewCustomer(null)} onChanged={fetchCustomers} />}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Customer Profile?"
        message="Delete this customer profile? Existing sales bills will remain saved but will no longer be linked to this customer."
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

export default Customers;
