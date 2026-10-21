import PublicPhotoViewer from '../../components/PublicPhotoViewer.jsx';
import PublicOverlay from '../../components/PublicOverlay.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Phone, MapPin, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';

const DEFAULT_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f1f5f9"/>
  <path d="M20 130 h30 l15 -25 h60 l20 25 h35 v20 h-160 z" fill="none" stroke="#cbd5e1" stroke-width="4"/>
  <circle cx="65" cy="150" r="12" fill="none" stroke="#cbd5e1" stroke-width="4"/>
  <circle cx="145" cy="150" r="12" fill="none" stroke="#cbd5e1" stroke-width="4"/>
</svg>`);

const PublicVehicles = () => {
  const {t}=usePublicLanguage();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // { images, index }
  const [search,setSearch]=useState('');
  const [type,setType]=useState('');
  const [status,setStatus]=useState('');
  const [sort,setSort]=useState('newest');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(12);
  const [details,setDetails]=useState(null);
  const resultsRef=useRef(null);
  const types=[...new Set(listings.map(v=>v.vehicle_type).filter(Boolean))].sort();
  const filtered=useMemo(()=>listings.filter(v=>{
    const text=[v.vehicle_name,v.model,v.vehicle_type,v.address,v.description].filter(Boolean).join(' ').toLowerCase();
    return (!search.trim()||text.includes(search.trim().toLowerCase()))&&(!type||v.vehicle_type===type)&&(!status||v.status===status);
  }).sort((a,b)=>{
    if(sort==='price-low'||sort==='price-high'){
      if(a.price==null)return b.price==null?Number(b.id)-Number(a.id):1;
      if(b.price==null)return -1;
      return sort==='price-low'?Number(a.price)-Number(b.price):Number(b.price)-Number(a.price);
    }
    return Number(b.id)-Number(a.id);
  }),[listings,search,type,status,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const field='w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500';
  const changePage=next=>{setPage(next);resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  useEffect(()=>{
    if(!details&&!lightbox)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const keydown=event=>{
      if(event.key==='Escape'){if(lightbox)setLightbox(null);else setDetails(null);}
      if(lightbox&&event.key==='ArrowLeft')setLightbox(lb=>({...lb,index:(lb.index-1+lb.images.length)%lb.images.length}));
      if(lightbox&&event.key==='ArrowRight')setLightbox(lb=>({...lb,index:(lb.index+1)%lb.images.length}));
    };
    document.addEventListener('keydown',keydown);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);};
  },[details,lightbox]);

  useEffect(() => {
    fetch('/api/public/vehicle-listings').then(r => r.json()).then(d => { if (d.success) setListings(d.listings); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openLightbox = (images, index) => setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const showPrev = () => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length }));
  const showNext = () => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.images.length }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Reveal>
        <div className="public-page-intro text-center mb-7">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t('Vehicles for Sale')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('Tractors and vehicles available from our yard')}</p>
        </div>
      </Reveal>

      <div ref={resultsRef} className="scroll-mt-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="relative"><span className="sr-only">{t('Search vehicles...')}</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={t('Search vehicles...')} className={`${field} pl-9`}/></label>
          <select aria-label={t('All Vehicles')} value={type} onChange={e=>{setType(e.target.value);setPage(1);}} className={field}><option value="">{t('All Vehicles')}</option>{types.map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label={t('Availability')} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className={field}><option value="">{t('All Listings')}</option><option value="available">{t('Available')}</option><option value="sold">{t('SOLD OUT')}</option></select>
          <select aria-label={t('Sort By')} value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} className={field}><option value="newest">{t('Newest First')}</option><option value="price-low">{t('Price: Low to High')}</option><option value="price-high">{t('Price: High to Low')}</option></select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-slate-500">{t('Showing {start}–{end} of {count}',{start:filtered.length?(currentPage-1)*pageSize+1:0,end:Math.min(currentPage*pageSize,filtered.length),count:filtered.length})}</p><div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs text-slate-500">{t('Per Page')}<select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1.5">{[12,24,48].map(value=><option key={value}>{value}</option>)}</select></label><button type="button" onClick={()=>{setSearch('');setType('');setStatus('');setSort('newest');setPage(1);}} className="text-xs font-bold text-amber-600">{t('Clear Filters')}</button></div></div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">{t('Loading vehicles...')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">{t(listings.length?'No vehicles match your filters.':'No vehicles listed right now — check back soon!')}</div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {visible.map((v, i) => {
            const isSold = v.status === 'sold';
            const images = v.images?.length > 0 ? v.images : [DEFAULT_IMAGE];
            return (
              <Reveal key={v.id} delay={(i % 4) * 40} className="h-full min-w-0">
                <TiltCard maxTilt={2} className="public-catalog-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                  <button type="button"
                    onClick={() => v.images?.length > 0 && openLightbox(v.images, 0)}
                    aria-label={`${t('View Photos')}: ${v.vehicle_name}`}
                    className={`relative w-full h-40 sm:h-44 shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-950 ${v.images?.length > 0 ? 'cursor-zoom-in' : 'cursor-default'}`}>
                    <img loading="lazy" decoding="async" src={images[0]} alt={v.vehicle_name} className={`absolute inset-0 w-full h-full p-2 object-contain ${isSold ? 'grayscale opacity-70' : ''}`} />
                    {isSold && (
                      <span className="absolute top-2 right-2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 shadow-lg">{t('SOLD OUT')}</span>
                    )}
                    {v.images?.length > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 text-white text-[9px] font-bold px-1.5 py-0.5">+{t('{count} more',{count:v.images.length-1})}</span>
                    )}
                  </button>

                  <div className="p-3 sm:p-4 flex-1 flex flex-col min-w-0">
                    <button type="button" onClick={()=>setDetails(v)} className="text-left"><h3 className="font-display font-bold text-sm leading-relaxed line-clamp-2 break-words text-slate-900 dark:text-white">{v.vehicle_name}</h3></button>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {v.model && <span className="text-[10px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5">{v.model}</span>}
                      {v.vehicle_type && <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-full px-2 py-0.5">{v.vehicle_type}</span>}
                    </div>
                    {v.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2 break-words">{v.description}</p>
                    )}
                    <div className="mt-auto pt-4 space-y-1.5">
                      {v.price != null && (
                        <p className="text-amber-600 dark:text-amber-400 font-bold text-lg">Rs. {parseFloat(v.price).toFixed(2)}</p>
                      )}
                      {v.address && (
                        <p className="text-xs text-slate-400 flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span className="line-clamp-1 break-all">{v.address}</span></p>
                      )}
                      {v.contact_phone && !isSold && (
                        <a href={`tel:${v.contact_phone}`}
                          className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 transition-colors">
                          <Phone className="h-3.5 w-3.5" /> {v.contact_phone}
                        </a>
                      )}
                    </div>
                    <button type="button" onClick={()=>setDetails(v)} className="mt-3 w-full rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10">{t('View Details')}</button>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      )}

      {filtered.length>0&&<nav aria-label={t('Pagination')} className="mt-8 flex flex-wrap justify-center items-center gap-4"><button disabled={currentPage===1} onClick={()=>changePage(currentPage-1)} className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-30"><ChevronLeft className="h-4 w-4"/>{t('Previous')}</button><span className="text-sm text-slate-500">{t('Page {page} of {count}',{page:currentPage,count:pageCount})}</span><button disabled={currentPage===pageCount} onClick={()=>changePage(currentPage+1)} className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-30">{t('Next')}<ChevronRight className="h-4 w-4"/></button></nav>}

      {details&&<PublicOverlay role="dialog" aria-modal="true" aria-label={t('Vehicle Details')} className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onClick={event=>{if(event.target===event.currentTarget)setDetails(null);}}><section className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"><header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center gap-3"><h2 className="font-bold">{t('Vehicle Details')}</h2><button autoFocus onClick={()=>setDetails(null)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold"><X className="h-4 w-4"/>{t('Close')}</button></header><div className="p-4 sm:p-6 space-y-4"><button type="button" onClick={()=>details.images?.length&&openLightbox(details.images,0)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden"><img src={details.images?.[0]||DEFAULT_IMAGE} alt={details.vehicle_name} className="w-full h-56 sm:h-72 object-contain"/></button>{details.images?.length>1&&<div className="flex gap-2 overflow-x-auto">{details.images.map((image,index)=><button key={index} aria-label={`${t('View Photos')} ${index+1}`} onClick={()=>openLightbox(details.images,index)} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-1"><img loading="lazy" src={image} alt={`${details.vehicle_name} ${index+1}`} className="h-16 w-20 object-contain"/></button>)}</div>}<h3 className="font-bold text-xl break-words">{details.vehicle_name}</h3><p className="text-sm text-slate-500">{[details.vehicle_type,details.model].filter(Boolean).join(' · ')}</p><p className="text-sm font-bold text-amber-600">{t(details.status==='sold'?'SOLD OUT':'Available')}</p>{details.price!=null&&<p className="text-xl font-bold text-amber-600">Rs. {Number(details.price).toFixed(2)}</p>}{details.description&&<p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{details.description}</p>}{details.address&&<p className="flex gap-2 text-sm break-words"><MapPin className="h-4 w-4 shrink-0"/>{details.address}</p>}{details.contact_phone&&details.status!=='sold'&&<a href={`tel:${details.contact_phone}`} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-4 py-2 font-bold text-sm"><Phone className="h-4 w-4"/>{details.contact_phone}</a>}</div></section></PublicOverlay>}

      {/* Photo Lightbox */}
      {lightbox && <PublicPhotoViewer images={lightbox.images} index={lightbox.index} onClose={closeLightbox} onPrevious={showPrev} onNext={showNext}/>}
    </div>
  );
};

export default PublicVehicles;
