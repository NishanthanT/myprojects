import PublicPhotoViewer from '../../components/PublicPhotoViewer.jsx';
import PublicOverlay from '../../components/PublicOverlay.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Truck, Package, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';

// Inline SVG placeholder — no external asset needed, works even for products with no photos yet.
const DEFAULT_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f1f5f9"/>
  <path d="M60 130 L60 80 L100 55 L140 80 L140 130 L100 155 Z" fill="none" stroke="#cbd5e1" stroke-width="4"/>
  <path d="M60 80 L100 105 L140 80 M100 105 L100 155" fill="none" stroke="#cbd5e1" stroke-width="4"/>
</svg>`);

const PublicProducts = () => {
  const {t}=usePublicLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchVal, setSearchVal] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort,setSort]=useState('name');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(12);
  const [details,setDetails]=useState(null);
  const resultsRef=useRef(null);

  const [lightbox, setLightbox] = useState(null); // { images, index }
  const openLightbox = (images, index) => setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const showPrev = () => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length }));
  const showNext = () => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.images.length }));

  useEffect(() => {
    Promise.all([
      fetch('/api/public/products').then(r => r.json()),
      fetch('/api/public/filters').then(r => r.json())
    ]).then(([prodData, filterData]) => {
      if (prodData.success) setProducts(prodData.products);
      if (filterData.success) { setCategories(filterData.categories); setVehicleTypes(filterData.vehicleTypes); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = [p.product_name,p.product_code,p.brand,p.vehicle_model_names].filter(Boolean).join(' ').toLowerCase().includes(searchVal.trim().toLowerCase());
    const matchCat = catFilter ? Number(p.category_id) === Number(catFilter) : true;
    const matchType = typeFilter ? Number(p.vehicle_type_id) === Number(typeFilter) : true;
    return matchSearch && matchCat && matchType;
  }).sort((a,b)=>{
    if(sort==='name')return (a.product_name||'').localeCompare(b.product_name||'');
    if(a.selling_price==null)return b.selling_price==null?0:1;
    if(b.selling_price==null)return -1;
    return sort==='price-low'?Number(a.selling_price)-Number(b.selling_price):Number(b.selling_price)-Number(a.selling_price);
  }), [products, searchVal, catFilter, typeFilter,sort]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  useEffect(()=>setPage(1),[searchVal,catFilter,typeFilter,sort,pageSize]);
  useEffect(()=>{
    if(!lightbox&&!details)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const onKey=event=>{if(event.key==='Escape'){if(lightbox)setLightbox(null);else setDetails(null);}};
    document.addEventListener('keydown',onKey);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',onKey);};
  },[lightbox,details]);
  const changePage=next=>{setPage(next);resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Reveal>
        <div className="public-page-intro mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
          <span className="public-eyebrow"><Package className="h-3.5 w-3.5"/>{t('Genuine Parts · Honest Service')}</span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t('Our Products')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('Browse genuine tractor parts, oils, and accessories')}</p>
          </div>
          {!loading&&<span className="public-count-pill"><Package className="h-4 w-4"/>{t('{count} products found',{count:filtered.length})}</span>}
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div ref={resultsRef} className="scroll-mt-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
                placeholder={t('Search by name or code...')}
                aria-label={t('Search by name or code...')}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none dark:text-white transition-shadow" />
            </div>
            <div className="relative">
              <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select aria-label={t('All Categories')} value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none dark:text-white appearance-none cursor-pointer">
                <option value="">{t('All Categories')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select aria-label={t('All Vehicles')} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none dark:text-white appearance-none cursor-pointer">
                <option value="">{t('All Vehicles')}</option>
                {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <select aria-label={t('Sort By')} value={sort} onChange={e=>setSort(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm dark:text-white focus:ring-2 focus:ring-amber-500"><option value="name">{t('Name: A to Z')}</option><option value="price-low">{t('Price: Low to High')}</option><option value="price-high">{t('Price: High to Low')}</option></select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"><span role="status">{t('Showing {start}–{end} of {count}',{start:filtered.length?(currentPage-1)*pageSize+1:0,end:Math.min(currentPage*pageSize,filtered.length),count:filtered.length})}</span><div className="flex items-center gap-4"><label className="flex items-center gap-2">{t('Per Page')}<select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1.5">{[12,24,48].map(n=><option key={n}>{n}</option>)}</select></label><button type="button" onClick={()=>{setSearchVal('');setCatFilter('');setTypeFilter('');setSort('name');setPage(1);}} className="font-bold text-amber-600">{t('Clear Filters')}</button></div></div>
        </div>
      </Reveal>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">{t('Loading products...')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">{t('No products found.')}</div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {visible.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 40} className="h-full min-w-0">
              <TiltCard maxTilt={2} className="public-catalog-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden hover:border-amber-400 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                <button type="button"
                  onClick={() => p.images?.length > 0 && openLightbox(p.images, 0)}
                  aria-label={`${t('View Photos')}: ${p.product_name}`}
                  className={`group relative w-full h-40 sm:h-44 shrink-0 bg-slate-50 dark:bg-slate-950 overflow-hidden ${p.images?.length > 0 ? 'cursor-zoom-in' : 'cursor-default'}`}>
                  <img loading="lazy" decoding="async" src={p.images?.[0] || DEFAULT_IMAGE} alt={p.product_name} className="absolute inset-0 w-full h-full p-2 object-contain transition-transform duration-500 group-hover:scale-105" />
                  {p.images?.length > 0 && (
                    <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/10 transition-colors duration-300" />
                  )}
                  {p.images?.length > 1 && (
                    <span className="absolute bottom-1.5 right-1.5 rounded-full bg-slate-950/70 text-white text-[9px] font-bold px-1.5 py-0.5">
                      +{p.images.length - 1}
                    </span>
                  )}
                </button>

                <div className="p-3 sm:p-4 flex-1 flex flex-col min-w-0">
                  <button type="button" onClick={()=>setDetails(p)} className="text-left"><h3 className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed line-clamp-2 break-words">{p.product_name}</h3></button>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 tracking-wide">{p.product_code}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-14 overflow-hidden">
                    {p.category_name && (
                      <span className="text-[10px] font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-full px-2 py-0.5">{p.category_name}</span>
                    )}
                    {p.vehicle_type_name && (
                      <span className="text-[10px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5">{p.vehicle_type_name}</span>
                    )}
                    {(p.vehicle_model_names || '').split('||').filter(Boolean).map((mn, mi) => (
                      <span key={mi} className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5">{mn}</span>
                    ))}
                  </div>

                  <div className="mt-auto pt-3 flex flex-wrap gap-2 items-center justify-between">
                    {p.selling_price != null ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">Rs. {parseFloat(p.selling_price).toFixed(2)}</span>
                    ) : <span className="text-xs text-slate-400">{t('Call for price')}</span>}
                    {p.brand && <span className="text-[10px] text-slate-400 font-semibold">{p.brand}</span>}
                  </div>
                  <button type="button" onClick={()=>setDetails(p)} className="public-details-button mt-3 w-full rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10">{t('View Details')}<ChevronRight className="h-3.5 w-3.5"/></button>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      )}

      {filtered.length>0&&<nav aria-label={t('Pagination')} className="mt-8 flex flex-wrap justify-center items-center gap-4"><button disabled={currentPage===1} onClick={()=>changePage(currentPage-1)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-30">{t('Previous')}</button><span className="text-sm text-slate-500">{t('Page {page} of {count}',{page:currentPage,count:pageCount})}</span><button disabled={currentPage===pageCount} onClick={()=>changePage(currentPage+1)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-30">{t('Next')}</button></nav>}
      {details&&<PublicOverlay role="dialog" aria-modal="true" aria-label={details.product_name} className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)setDetails(null);}}><section className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"><header className="sticky top-0 z-10 flex justify-between items-center gap-3 bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700"><h2 className="font-bold">{t('View Details')}</h2><button autoFocus onClick={()=>setDetails(null)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold"><X className="h-4 w-4"/>{t('Close')}</button></header><div className="p-5 space-y-4"><button type="button" onClick={()=>details.images?.length&&openLightbox(details.images,0)} className="w-full rounded-xl bg-slate-50 dark:bg-slate-950"><img src={details.images?.[0]||DEFAULT_IMAGE} alt={details.product_name} className="h-56 sm:h-72 w-full object-contain"/></button>{details.images?.length>1&&<div className="flex gap-2 overflow-x-auto">{details.images.map((image,index)=><button key={index} aria-label={`${t('View Photos')} ${index+1}`} onClick={()=>openLightbox(details.images,index)} className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-1"><img loading="lazy" src={image} alt={`${details.product_name} ${index+1}`} className="h-16 w-20 object-contain"/></button>)}</div>}<h3 className="text-xl font-bold break-words">{details.product_name}</h3><p className="text-sm font-mono break-all">{details.product_code}</p><p className="text-sm leading-relaxed break-words">{[details.category_name,details.vehicle_type_name,...(details.vehicle_model_names||'').split('||'),details.brand].filter(Boolean).join(' · ')}</p><p className="text-lg font-bold text-amber-600">{details.selling_price!=null?`Rs. ${Number(details.selling_price).toFixed(2)}`:t('Call for price')}</p></div></section></PublicOverlay>}

      {/* Photo Lightbox */}
      {lightbox && <PublicPhotoViewer images={lightbox.images} index={lightbox.index} onClose={closeLightbox} onPrevious={showPrev} onNext={showNext}/>}
    </div>
  );
};

export default PublicProducts;
