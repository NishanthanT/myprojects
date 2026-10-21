import React,{useEffect,useRef} from 'react';
import {X,ChevronLeft,ChevronRight} from 'lucide-react';
import PublicOverlay from './PublicOverlay.jsx';
import {usePublicLanguage} from '../context/PublicLanguageContext.jsx';

export default function PublicPhotoViewer({images,index,onClose,onPrevious,onNext,alt}){
  const {t}=usePublicLanguage();
  const dialog=useRef(null),closeButton=useRef(null);
  const actions=useRef({onClose,onPrevious,onNext});
  actions.current={onClose,onPrevious,onNext};
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';closeButton.current?.focus();
    const keydown=event=>{
      // Handle here before a parent details dialog sees the same Escape.
      if(['Escape','ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();event.stopImmediatePropagation();
        if(event.key==='Escape')actions.current.onClose();
        if(images.length>1&&event.key==='ArrowLeft')actions.current.onPrevious();
        if(images.length>1&&event.key==='ArrowRight')actions.current.onNext();
      }
      if(event.key==='Tab'){
        const buttons=[...dialog.current.querySelectorAll('button')];
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',keydown,true);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown,true);if(previous?.isConnected)previous.focus();};
  },[images.length]);
  const control='inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-slate-800 text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400';
  return <PublicOverlay className="fixed inset-0 z-[200] bg-slate-950/95 text-white">
    <section ref={dialog} role="dialog" aria-modal="true" aria-label={t('View Photos')} className="h-[100dvh] w-full flex flex-col">
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold">{t('View Photos')} · {index+1} / {images.length}</span>
        <button ref={closeButton} type="button" onClick={onClose} aria-label={t('Close photo')} className={`${control} gap-2 px-4 text-sm font-bold`}><X className="h-5 w-5"/>{t('Close')}</button>
      </header>
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
        <img src={images[index]} alt={alt||t('View Photos')} className="max-h-full max-w-full object-contain rounded-xl"/>
      </div>
      {images.length>1&&<nav aria-label={t('View Photos')} className="shrink-0 flex items-center justify-center gap-5 pb-4 pt-2">
        <button type="button" onClick={onPrevious} aria-label={t('Previous photo')} className={control}><ChevronLeft className="h-5 w-5"/></button>
        <span className="text-sm tabular-nums">{index+1} / {images.length}</span>
        <button type="button" onClick={onNext} aria-label={t('Next photo')} className={control}><ChevronRight className="h-5 w-5"/></button>
      </nav>}
    </section>
  </PublicOverlay>;
}
