import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, UserSquare2, X, Eye } from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import {PAGE_PERMISSIONS,DEFAULT_STAFF_PERMISSIONS,permissionsFor} from '../utils/permissions.mjs';
import AlertPopup from '../components/AlertPopup.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const Users = () => {
  const {user,refreshUser}=useAuth();
  const isAdmin=user?.role==='admin';
  const [viewingPermissions,setViewingPermissions]=useState(null);
  const [saving,setSaving]=useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const initialForm = { name: '', email: '', password: '', role: 'cashier', status: 'active', permissions:[...DEFAULT_STAFF_PERMISSIONS] };
  const [formData, setFormData] = useState(initialForm);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => setAlert({ show: true, type, message });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch { triggerAlert('error', 'Failed to fetch users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchVal.toLowerCase()) ||
    u.email.toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleOpenAdd = () => { setEditingId(null); setFormData(initialForm); setShowModal(true); };
  const handleOpenEdit = (u) => {
    setEditingId(u.id);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role, status: u.status,permissions:permissionsFor(u) });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(saving||!isAdmin)return;
    if (!formData.name || !formData.email || (!editingId && !formData.password)) {
      triggerAlert('warning', 'Please fill all mandatory fields.'); return;
    }
    try {
      const isEdit = editingId !== null;
      setSaving(true);
      const body = { ...formData };
      if (isEdit && !body.password) delete body.password;
      const res = await fetch(isEdit ? `/api/auth/users/${editingId}` : '/api/auth/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { triggerAlert('success', data.message); setShowModal(false); fetchUsers(); refreshUser(); }
      else triggerAlert('error', data.message);
    } catch { triggerAlert('error', 'Server error.'); }
    finally{setSaving(false);}
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/auth/users/${deleteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (data.success) { triggerAlert('success', data.message); setDeleteId(null); fetchUsers(); }
      else { triggerAlert('error', data.message); setDeleteId(null); }
    } catch { triggerAlert('error', 'Server error.'); setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Users & Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">Manage system user accounts, roles, and access privileges.</p>
        </div>
        {isAdmin&&<button onClick={handleOpenAdd} className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 flex items-center gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /><span>Add Staff User</span>
        </button>}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative max-w-md">
        <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
        <Search className="absolute left-7 top-6 h-4 w-4 text-slate-400" />
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center"><LoadingSpinner size="large" /></div>
      ) : (
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Role</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-slate-400">No users found.</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 font-bold text-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-450">{u.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${u.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${u.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button title="View Page Access" aria-label={`View permissions for ${u.name}`} onClick={()=>setViewingPermissions(u)} className="p-1.5 rounded-lg border border-amber-300 text-amber-600"><Eye className="h-4 w-4"/></button>
                      {isAdmin&&<>
                      <button onClick={() => handleOpenEdit(u)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{editingId ? 'Edit Staff User' : 'Add Staff User'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Staff member name' },
                { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'Login email' },
                { label: editingId ? 'New Password (leave blank to keep)' : 'Password *', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{field.label}</label>
                  <input type={field.type} value={formData[field.key]} placeholder={field.placeholder}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none dark:text-white appearance-none">
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none dark:text-white appearance-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Navbar Page Access</h4>{formData.role!=='admin'&&<div className="flex gap-3 text-xs font-bold text-amber-600"><button type="button" onClick={()=>setFormData({...formData,permissions:PAGE_PERMISSIONS.map(page=>page.key)})}>Select All</button><button type="button" onClick={()=>setFormData({...formData,permissions:[]})}>Clear</button></div>}</div>
                <p className="text-xs text-slate-500">{formData.role==='admin'?'Admins have full access to every page.':'Select pages this user can open. Existing admin-only changes require an admin. Users & Staff is read-only for staff.'}</p>
                <div className="grid sm:grid-cols-2 gap-2">{PAGE_PERMISSIONS.map(page=><label key={page.key} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-950 p-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" disabled={formData.role==='admin'} checked={formData.role==='admin'||formData.permissions.includes(page.key)} onChange={e=>setFormData(current=>({...current,permissions:e.target.checked?[...current.permissions,page.key]:current.permissions.filter(key=>key!==page.key)}))} className="accent-amber-500"/>{page.label}</label>)}</div>
                <p className="text-xs text-slate-500">{formData.role==='admin'?PAGE_PERMISSIONS.length:formData.permissions.length} of {PAGE_PERMISSIONS.length} pages selected</p>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-50">{saving?'Saving...':editingId ? 'Update User & Permissions' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={deleteId !== null} title="Delete Staff User?" message="Are you sure you want to delete this staff account? They will lose all access to the POS system." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      {viewingPermissions&&<div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="User page permissions" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 space-y-4"><div className="flex justify-between gap-3"><h3 className="font-bold dark:text-white">{viewingPermissions.name} - Page Access</h3><button onClick={()=>setViewingPermissions(null)} className="flex gap-1 items-center text-sm text-slate-500"><X className="h-4 w-4"/>Close</button></div><div className="grid sm:grid-cols-2 gap-2">{PAGE_PERMISSIONS.map(page=><p key={page.key} className={`rounded-xl p-2 text-xs ${permissionsFor(viewingPermissions).includes(page.key)?'bg-emerald-500/10 text-emerald-600':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{permissionsFor(viewingPermissions).includes(page.key)?'Allowed':'No access'}: {page.label}</p>)}</div>{isAdmin&&<button onClick={()=>{handleOpenEdit(viewingPermissions);setViewingPermissions(null);}} className="rounded-xl bg-amber-500 px-4 py-2 text-white font-bold text-sm">Edit Permissions</button>}</div></div>}
      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
    </div>
  );
};

export default Users;
