import React,{useCallback,useEffect,useState} from 'react';
import {Plus,Pencil,Trash2,Wrench} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const emptyMechanic={mechanic_name:'',address:'',phone:'',type_id:''};
const field='w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500';
const primary='rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50';
const secondary='rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300';
export default function MechanicalServicesAdmin(){
  const {user,token}=useAuth();
  const canEdit=user?.role==='admin';
  const [data,setData]=useState({types:[],mechanics:[]});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');
  const [type,setType]=useState({type_name:''});
  const [mechanic,setMechanic]=useState(null);
  const [pendingDelete,setPendingDelete]=useState(null);
  const [search,setSearch]=useState('');
  const request=useCallback(async(path='',options={})=>{
    const response=await fetch(`/api/mechanical-services${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||'Request failed.');
    return result;
  },[token]);
  const load=useCallback(async()=>{
    setLoading(true);
    try{const result=await request();setData({types:result.types,mechanics:result.mechanics});setError('');}
    catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[request]);
  useEffect(()=>{load();},[load]);
  async function save(event,kind,record){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      await request(`/${kind}${record.id?`/${record.id}`:''}`,{method:record.id?'PUT':'POST',body:JSON.stringify(record)});
      if(kind==='types')setType({type_name:''});else setMechanic(null);
      await load();setNotice('Saved successfully.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function remove(){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{await request(`/${pendingDelete.kind}/${pendingDelete.id}`,{method:'DELETE'});setPendingDelete(null);setMechanic(null);setType({type_name:''});await load();setNotice('Deleted successfully.');}
    catch(e){setError(e.message);setPendingDelete(null);}finally{setBusy(false);}
  }
  const mechanics=data.mechanics.filter(m=>[m.mechanic_name,m.address,m.phone,m.type_name].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"><Wrench className="h-5 w-5 text-amber-500"/>Mechanical Service</h2><p className="mt-1 text-sm text-slate-500">Manage service types and the mechanic contacts displayed on the public website.</p></div><a href="/shop/mechanical-services" target="_blank" rel="noopener noreferrer" className={secondary}>View Public Page</a></div>
    {error&&<div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-600 dark:text-rose-300">{error}<button type="button" onClick={load} className="ml-3 underline">Retry</button></div>}
    {notice&&<p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <h3 className="font-bold text-slate-900 dark:text-white">Mechanical Types</h3>
      {canEdit&&<form onSubmit={e=>save(e,'types',type)} className="flex flex-wrap items-end gap-3"><label className="flex-1 min-w-[180px] text-sm text-slate-600 dark:text-slate-300">{type.id?'Edit Mechanical Type':'Add Mechanical Type'}<input required maxLength={100} value={type.type_name} onChange={e=>setType({...type,type_name:e.target.value})} placeholder="e.g. Engine Repair" className={`${field} mt-1`}/></label><button disabled={busy} className={primary}>{type.id?'Update Type':'Add Type'}</button>{type.id&&<button type="button" disabled={busy} className={secondary} onClick={()=>setType({type_name:''})}>Cancel</button>}</form>}
      <div className="flex flex-wrap gap-2">{data.types.map(item=><div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2"><span className="text-sm text-slate-700 dark:text-slate-200 break-words">{item.type_name}</span>{canEdit&&<><button disabled={busy} type="button" aria-label={`Edit ${item.type_name}`} onClick={()=>setType(item)} className="p-1 text-slate-500 hover:text-amber-600"><Pencil className="h-4 w-4"/></button><button disabled={busy} type="button" aria-label={`Delete ${item.type_name}`} onClick={()=>setPendingDelete({kind:'types',...item,name:item.type_name})} className="p-1 text-rose-500"><Trash2 className="h-4 w-4"/></button></>}</div>)}</div>
      {!loading&&!data.types.length&&<p className="text-sm text-slate-500">Add a mechanical type first, then select it when adding a mechanic.</p>}
    </section>
    {mechanic&&canEdit&&<form onSubmit={e=>save(e,'mechanics',mechanic)} className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <h3 className="font-bold text-slate-900 dark:text-white">{mechanic.id?'Edit Mechanic':'Add Mechanic'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-slate-600 dark:text-slate-300">Name *<input required maxLength={100} value={mechanic.mechanic_name} onChange={e=>setMechanic({...mechanic,mechanic_name:e.target.value})} className={`${field} mt-1`}/></label>
        <label className="text-sm text-slate-600 dark:text-slate-300">Phone Number *<input required type="tel" maxLength={30} value={mechanic.phone} onChange={e=>setMechanic({...mechanic,phone:e.target.value})} className={`${field} mt-1`}/></label>
        <label className="text-sm text-slate-600 dark:text-slate-300">Address *<input required maxLength={255} value={mechanic.address} onChange={e=>setMechanic({...mechanic,address:e.target.value})} className={`${field} mt-1`}/></label>
        <label className="text-sm text-slate-600 dark:text-slate-300">Mechanical Type *<select required value={mechanic.type_id} onChange={e=>setMechanic({...mechanic,type_id:e.target.value})} className={`${field} mt-1`}><option value="">Select mechanical type</option>{data.types.map(item=><option key={item.id} value={item.id}>{item.type_name}</option>)}</select></label>
      </div><div className="flex gap-3"><button disabled={busy} className={primary}>{busy?'Saving...':mechanic.id?'Update Mechanic':'Save Mechanic'}</button><button disabled={busy} type="button" onClick={()=>setMechanic(null)} className={secondary}>Close</button></div>
    </form>}
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><h3 className="font-bold text-slate-900 dark:text-white">Mechanic Details ({data.mechanics.length})</h3>{canEdit&&<button disabled={busy||!data.types.length} title={!data.types.length?'Add a mechanical type first':undefined} type="button" onClick={()=>setMechanic({...emptyMechanic})} className={`${primary} inline-flex items-center gap-2`}><Plus className="h-4 w-4"/>Add Mechanic</button>}</div>
      <input type="search" aria-label="Search mechanics" placeholder="Search name, address, phone or type..." value={search} onChange={e=>setSearch(e.target.value)} className={`${field} mb-4`}/>
      {loading?<p className="text-sm text-slate-500">Loading...</p>:<div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">{['Name','Mechanical Type','Address','Phone Number',...(canEdit?['Actions']:[])].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{mechanics.map(item=><tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"><td className="p-3 break-words max-w-48 font-semibold">{item.mechanic_name}</td><td className="p-3">{item.type_name}</td><td className="p-3 break-words max-w-64">{item.address}</td><td className="p-3 whitespace-nowrap">{item.phone}</td>{canEdit&&<td className="p-3"><div className="flex gap-2"><button disabled={busy} type="button" onClick={()=>setMechanic({...item})} aria-label={`Edit ${item.mechanic_name}`} className="p-2 text-amber-600"><Pencil className="h-4 w-4"/></button><button disabled={busy} type="button" onClick={()=>setPendingDelete({kind:'mechanics',...item,name:item.mechanic_name})} aria-label={`Delete ${item.mechanic_name}`} className="p-2 text-rose-500"><Trash2 className="h-4 w-4"/></button></div></td>}</tr>)}</tbody></table>{!mechanics.length&&<p className="py-6 text-center text-sm text-slate-500">No mechanics found.</p>}</div>}
    </section>
    <ConfirmModal isOpen={!!pendingDelete&&!busy} title="Delete record?" message={`Delete ${pendingDelete?.name||'this record'}? Mechanics using a type must be reassigned before that type can be deleted.`} onConfirm={remove} onCancel={()=>setPendingDelete(null)}/>
  </div>;
}
