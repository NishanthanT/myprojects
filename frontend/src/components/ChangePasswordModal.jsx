import React, { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AlertPopup from './AlertPopup.jsx';

const FIELDS = [
  { key: 'current_password', label: 'Current Password', placeholder: 'Enter your current password' },
  { key: 'new_password', label: 'New Password', placeholder: 'At least 6 characters' },
  { key: 'confirm_password', label: 'Confirm New Password', placeholder: 'Re-type the new password' }
];

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const emptyForm = { current_password: '', new_password: '', confirm_password: '' };
  const [form, setForm] = useState(emptyForm);
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  const triggerAlert = (type, message) => setAlert({ show: true, type, message });

  const closeAndReset = () => {
    setForm(emptyForm);
    setShow({});
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      triggerAlert('warning', 'Please fill in all password fields.');
      return;
    }
    if (form.new_password.length < 6) {
      triggerAlert('warning', 'New password must be at least 6 characters long.');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      triggerAlert('warning', 'New password and confirm password do not match.');
      return;
    }
    if (form.current_password === form.new_password) {
      triggerAlert('warning', 'New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password
        })
      });
      const data = await res.json();

      if (data.success) {
        triggerAlert('success', data.message);
        setForm(emptyForm);
        setShow({});
        // Give the success toast a moment before the window closes
        setTimeout(() => onClose(), 1200);
      } else {
        triggerAlert('error', data.message || 'Could not change password.');
      }
    } catch {
      triggerAlert('error', 'Server error while changing password.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    // Keep the toast mounted so a success message can finish after the form closes
    return (
      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })} />
    );
  }

  const inputCls = 'w-full pl-3 pr-10 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none dark:text-white';

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={closeAndReset} />

        <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
          <button onClick={closeAndReset}
            className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Change Password</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Update your account sign-in password</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{f.label} *</label>
                <div className="relative">
                  <input
                    type={show[f.key] ? 'text' : 'password'}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    autoComplete={f.key === 'current_password' ? 'current-password' : 'new-password'}
                    className={inputCls}
                  />
                  <button type="button" onClick={() => setShow(s => ({ ...s, [f.key]: !s[f.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={show[f.key] ? 'Hide password' : 'Show password'}>
                    {show[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Use at least 6 characters. After changing it, use the new password the next time you sign in.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={closeAndReset}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all">
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })} />
    </>
  );
};

export default ChangePasswordModal;
