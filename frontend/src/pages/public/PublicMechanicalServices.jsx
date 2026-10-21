import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Wrench,MapPin,Phone,Search} from 'lucide-react';
import Reveal from '../../components/Reveal.jsx';
import PublicPhonePopup from '../../components/PublicPhonePopup.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';

const field='w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500';
export default function PublicMechanicalServices(){
  const {t}=usePublicLanguage();
  const [data,setData]=useState({types:[],mechanics:[]});
  const [loading,setLoading]=useState(true),[error,setError]=useState(false);
  const [type,setType]=useState(''),[address,setAddress]=useState(''),[search,setSearch]=useState('');
  const [page,setPage]=useState(1),[contact,setContact]=useState(null);
  const load=useCallback(async()=>{
    setLoading(true);setError(false);
    try{
      const response=await fetch('/api/public/mechanical-services',{cache:'no-store'});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error('Failed');
      setData({types:result.types,mechanics:result.mechanics});
    }catch{setError(true);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const addresses=useMemo(()=>[...new Set(data.mechanics.map(m=>m.address))].sort((a,b)=>a.localeCompare(b)),[data.mechanics]);
  const filtered=useMemo(()=>data.mechanics.filter(m=>(!type||String(m.type_id)===type)&&(!address||m.address===address)&&[m.mechanic_name,m.type_name,m.address,m.phone].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[data.mechanics,type,address,search]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/12)),currentPage=Math.min(page,pageCount);
  const visible=filtered.slice((currentPage-1)*12,currentPage*12);
  function clear(){setType('');setAddress('');setSearch('');setPage(1);}
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <Reveal><div className="public-page-intro mb-7"><span className="public-eyebrow"><Wrench className="h-4 w-4"/>{t('Tractor Repair Services')}</span><h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t('Mechanical Service')}</h1><p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('Find mechanics by service type or address and contact them directly.')}</p></div></Reveal>
    <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Search mechanics')}<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={t('Search name, phone or address...')} className={`${field} pl-9`}/></div></label>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Mechanical Type')}<select value={type} onChange={e=>{setType(e.target.value);setPage(1);}} className={`${field} mt-1`}><option value="">{t('All Mechanical Types')}</option>{data.types.map(item=><option key={item.id} value={item.id}>{item.type_name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Address')}<select value={address} onChange={e=>{setAddress(e.target.value);setPage(1);}} className={`${field} mt-1`}><option value="">{t('All Addresses')}</option>{addresses.map(value=><option key={value}>{value}</option>)}</select></label>
      </div><div className="flex justify-between gap-3 items-center"><p role="status" className="text-xs text-slate-500">{!loading&&t('{count} mechanics found',{count:filtered.length})}</p><button type="button" onClick={clear} className="text-xs font-bold text-amber-600">{t('Clear Filters')}</button></div>
    </div>
    {loading?<p className="text-center py-16 text-slate-500">{t('Loading mechanics...')}</p>:error?<div role="alert" className="text-center py-12"><p className="text-rose-600">{t('Could not load mechanical services. Please retry.')}</p><button type="button" onClick={load} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 font-bold text-white">{t('Retry')}</button></div>:!filtered.length?<p className="text-center py-16 text-slate-500">{t(data.mechanics.length?'No mechanics match your filters.':'Mechanic details will be available soon.')}</p>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {visible.map((item,index)=><Reveal key={item.id} delay={(index%3)*60} className="h-full min-w-0"><article className="public-catalog-card h-full flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6"><div className="flex gap-3 items-start"><div className="shrink-0 rounded-2xl bg-amber-500/10 p-3 text-amber-600"><Wrench className="h-6 w-6"/></div><div className="min-w-0"><h2 className="font-bold text-lg text-slate-900 dark:text-white break-words">{item.mechanic_name}</h2><p className="mt-2 inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 break-words">{item.type_name}</p></div></div><p className="mt-5 flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><MapPin className="h-4 w-4 mt-0.5 shrink-0"/><span className="break-words min-w-0">{item.address}</span></p><p className="mt-3 flex gap-2 text-sm text-slate-600 dark:text-slate-300"><Phone className="h-4 w-4 shrink-0"/><span className="break-all">{item.phone}</span></p><div className="mt-auto pt-5"><button type="button" onClick={()=>setContact(item)} className="public-details-button w-full rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-bold"><Phone className="h-4 w-4"/>{t('Contact Mechanic')}</button></div></article></Reveal>)}
    </div>}
    {!loading&&!error&&pageCount>1&&<nav aria-label={t('Pagination')} className="mt-8 flex justify-center items-center gap-4 text-sm"><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 disabled:opacity-30">{t('Previous')}</button><span>{t('Page {page} of {count}',{page:currentPage,count:pageCount})}</span><button disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 disabled:opacity-30">{t('Next')}</button></nav>}
    {contact&&<PublicPhonePopup number={contact.phone} shopName={contact.mechanic_name} onClose={()=>setContact(null)}/>}
  </div>;
}
