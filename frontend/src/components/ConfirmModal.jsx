import React from 'react';
import { AlertOctagon, X } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  title = 'Are you sure?', 
  message = 'This action cannot be undone. Do you wish to proceed?', 
  confirmText = 'Confirm Delete', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Dialog container */}
      <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all scale-100 z-10">
        
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-650"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning Icon Banner */}
        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-100 dark:border-rose-900/20">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
            <span className="text-xs text-rose-500 font-semibold tracking-wide uppercase">Danger Action</span>
          </div>
        </div>

        {/* Description message */}
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-450">{message}</p>
        </div>

        {/* Footer actions buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all duration-150"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
