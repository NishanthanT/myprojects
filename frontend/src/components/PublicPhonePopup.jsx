import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Phone,Copy,Check,X} from 'lucide-react';
import {usePublicLanguage} from '../context/PublicLanguageContext.jsx';

export default function PublicPhonePopup({number,shopName,onClose}){
  const {t}=usePublicLanguage();
  const [copied,setCopied]=useState(false);
  const [copyError,setCopyError]=useState(false);
  const dialog=useRef(null),numberInput=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.querySelector('button')?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();onClose();}
      if(event.key==='Tab'){
        const controls=[...dialog.current.querySelectorAll('button,a[href],input')];
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',keydown);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previous?.focus();};
  },[onClose]);
  async function copy(){
    try{await navigator.clipboard.writeText(number);setCopied(true);setCopyError(false);}
    catch{setCopyError(true);numberInput.current?.focus();numberInput.current?.select();}
  }
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="public-phone-title" className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl text-center">
      <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"/>
      <button type="button" onClick={onClose} aria-label={t('Close')} className="absolute top-4 right-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5"/></button>
      <div className="mx-auto mt-2 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><Phone className="h-7 w-7"/></div>
      <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">{shopName}</p>
      <h2 id="public-phone-title" className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{t('Call Us')}</h2>
      <input ref={numberInput} readOnly value={number} aria-label={t('Phone number')} className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-3 text-center text-2xl font-bold tracking-wide text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"/>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('Choose Call to open your phone or calling app.')}</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><a href={`tel:${number.replace(/[^+\d]/g,'')}`} className="flex justify-center items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-3 text-sm font-bold text-white"><Phone className="h-4 w-4"/>{t('Call')}</a><button type="button" onClick={copy} className="flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">{copied?<Check className="h-4 w-4 text-emerald-500"/>:<Copy className="h-4 w-4"/>}{t(copied?'Copied':'Copy Number')}</button></div>
      <p role="status" className="mt-3 text-xs text-slate-500">{copyError?t('Select and copy the number above.'):copied?t('Number copied.'):''}</p>
      <button type="button" onClick={onClose} className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:text-amber-600">{t('Close')}</button>
    </section>
  </div>,document.body);
}
