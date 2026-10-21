import React, { useEffect } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

const AlertPopup = ({ isOpen, type = 'success', message, onClose, duration = 3000 }) => {
  // Auto close timer
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const themes = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30',
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      text: 'text-emerald-800 dark:text-emerald-300',
      bar: 'bg-emerald-500'
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30',
      icon: <AlertOctagon className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      text: 'text-rose-800 dark:text-rose-300',
      bar: 'bg-rose-500'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30',
      icon: <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      text: 'text-amber-800 dark:text-amber-300',
      bar: 'bg-amber-500'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30',
      icon: <Info className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      text: 'text-indigo-800 dark:text-indigo-300',
      bar: 'bg-indigo-500'
    }
  };

  const activeTheme = themes[type] || themes.success;

  return (
    <div className="fixed bottom-6 right-6 z-[120] max-w-sm w-full animate-bounce-short">
      <div className={`relative flex items-start gap-3 rounded-2xl border p-4 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 ${activeTheme.bg}`}>
        {/* Progress Bar indicator */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden rounded-b-2xl bg-slate-100 dark:bg-slate-800">
            <div 
              className={`h-full animate-progress ${activeTheme.bar}`} 
              style={{ animationDuration: `${duration}ms` }} 
            />
          </div>
        )}

        <div className="shrink-0">{activeTheme.icon}</div>
        <div className="flex-1 pr-6 pb-1">
          <p className={`font-semibold text-sm leading-relaxed ${activeTheme.text}`}>{message}</p>
        </div>
        
        {/* Close trigger */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AlertPopup;
