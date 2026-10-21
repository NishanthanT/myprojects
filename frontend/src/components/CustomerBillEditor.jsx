import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
const field='w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm disabled:opacity-60';
const cents=value=>Math.round(Number(value||0)*100);
export default function CustomerBillEditor({ sale,onClose,onSaved }) {
  const [items,setItems]=useState(()=>sale.items.map(item=>({...item,key:`saved-${item.id}`,line_discount:((Math.round(Number(item.quantity)*cents(item.unit_price))-cents(item.total_price))/100).toFixed(2)})));
  const [discount,setDiscount]=useState(String(sale.discount));
  const [paid,setPaid]=useState(String(sale.paid_amount));
  const [method,setMethod]=useState(sale.payment_method);
  const [products,setProducts]=useState([]);
  const [search,setSearch]=useState('');
  const [productId,setProductId]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [catalogLoading,setCatalogLoading]=useState(true);
  const [catalogRetry,setCatalogRetry]=useState(0);
  const saving=useRef(false);
  useEffect(()=>{
    const controller=new AbortController(); setCatalogLoading(true);
    fetch('/api/products',{signal:controller.signal,headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}})
      .then(async response=>{const result=await response.json();if(!response.ok||!result.success)throw new Error('Could not load products.');setProducts(result.products.filter(p=>p.status==='active'));})
      .catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setCatalogLoading(false);});
    return ()=>controller.abort();
  },[catalogRetry]);
  const subtotal=items.reduce((sum,item)=>sum+cents(item.total_price)-Math.round(Number(item.returned_quantity||0)*cents(item.unit_price)),0);
  const total=subtotal-cents(discount);
  const update=(key,name,value)=>setItems(previous=>previous.map(item=>{
    if(item.key!==key)return item;
    const next={...item,[name]:value};
    next.total_price=(Math.max(0,Math.round(Number(next.quantity||0)*cents(next.unit_price))-cents(next.line_discount))/100).toFixed(2);
    return next;
  }));
  function addProduct(){
    const product=products.find(p=>String(p.id)===productId);if(!product)return;
    if(items.some(item=>Number(item.product_id)===product.id)){setError('This product is already on the bill. Change its quantity instead.');return;}
    setItems(previous=>[...previous,{id:null,key:crypto.randomUUID(),product_id:product.id,product_name:product.product_name,product_code:product.product_code,quantity:'1',returned_quantity:0,unit_price:String(product.selling_price),total_price:String(product.selling_price),line_discount:'0'}]);
    setProductId('');setError('');
  }
  async function save(event){
    event.preventDefault();if(saving.current)return;
    saving.current=true;setBusy(true);setError('');
    try{
      const response=await fetch(`/api/sales/${sale.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`},body:JSON.stringify({version:sale.version,payment_method:method,discount,paid_amount:paid,items:items.map(item=>({id:item.id,product_id:item.product_id,quantity:item.quantity,unit_price:item.unit_price,total_price:item.total_price}))})});
      const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Could not save bill.');
      onSaved();
    }catch(e){setError(e.message);}finally{saving.current=false;setBusy(false);}
  }
  const matches=products.filter(p=>`${p.product_name} ${p.product_code}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div role="dialog" aria-modal="true" aria-label="Edit customer bill" className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-y-auto">
    <header className="sticky top-0 z-10 flex justify-between items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><h2 className="text-xl font-bold">Edit {sale.bill_no}</h2><button disabled={busy} onClick={onClose} className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2"><X className="h-4 w-4" />Close</button></header>
    <form onSubmit={save} className="max-w-6xl mx-auto p-4 sm:p-8 space-y-5">
      {error&&<p role="alert" className="rounded-xl bg-rose-500/10 text-rose-500 p-3">{error}</p>}
      <p className="text-sm text-slate-500">Bill number and date stay the same. Saving recalculates stock and customer credit. Lines with returns retain their original values.</p>
      <fieldset disabled={busy} className="space-y-5">
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{['Product','Quantity','Unit Price','Line Discount (Rs.)','Net Line Amount','Remove'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.key} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2"><p className="font-bold">{item.product_name}</p><p className="text-xs text-slate-500">{item.product_code}{Number(item.returned_quantity)>0?` · Returned: ${item.returned_quantity}`:''}</p></td><td className="p-2"><input aria-label={`Quantity ${item.product_name}`} type="number" required min="0.001" max="9999999" step="0.001" disabled={Number(item.returned_quantity)>0} value={item.quantity} onChange={e=>update(item.key,'quantity',e.target.value)} className={field}/></td><td className="p-2"><input aria-label={`Price ${item.product_name}`} type="number" required min="0" max="99999999.99" step="0.01" disabled={Number(item.returned_quantity)>0} value={item.unit_price} onChange={e=>update(item.key,'unit_price',e.target.value)} className={field}/></td><td className="p-2"><input aria-label={`Discount ${item.product_name}`} type="number" required min="0" step="0.01" max={(Math.round(Number(item.quantity)*cents(item.unit_price))/100).toFixed(2)} disabled={Number(item.returned_quantity)>0} value={item.line_discount} onChange={e=>update(item.key,'line_discount',e.target.value)} className={field}/></td><td className="p-2 whitespace-nowrap">Rs. {((cents(item.total_price)-Math.round(Number(item.returned_quantity||0)*cents(item.unit_price)))/100).toFixed(2)}</td><td className="p-2"><button type="button" disabled={Number(item.returned_quantity)>0} onClick={()=>setItems(previous=>previous.filter(row=>row.key!==item.key))} aria-label={`Remove ${item.product_name}`} className="p-2 text-rose-500 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></td></tr>)}</tbody></table></div>
        <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3"><input aria-label="Search products to add" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product name / code" className={field}/><select aria-label="Select product to add" value={productId} onChange={e=>setProductId(e.target.value)} className={field}><option value="">{catalogLoading?'Loading products...':'Select product to add'}</option>{matches.map(p=><option key={p.id} value={p.id}>{p.product_code} · {p.product_name}</option>)}</select><button type="button" disabled={!productId} onClick={addProduct} className="rounded-xl bg-amber-500 text-white px-4 py-2 font-bold disabled:opacity-40">Add Product</button></div>
        {!catalogLoading&&!products.length&&<button type="button" onClick={()=>setCatalogRetry(value=>value+1)} className="text-amber-600 underline">Reload products</button>}
        <div className="grid sm:grid-cols-3 gap-3"><label>Bill Discount (Rs.)<input required type="number" min="0" max={Math.max(0,subtotal/100)} step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} className={field}/></label><label>Payment Method<select value={method} onChange={e=>setMethod(e.target.value)} className={field}>{['Cash','Card','Bank Transfer','Credit'].map(value=><option key={value}>{value}</option>)}</select></label><label>Amount Paid (Rs.)<input required type="number" min="0" max="99999999.99" step="0.01" value={paid} onChange={e=>setPaid(e.target.value)} className={field}/></label></div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2"><p>Net Subtotal: Rs. {(subtotal/100).toFixed(2)}</p><p className="font-bold text-lg">Bill Total: Rs. {(total/100).toFixed(2)}</p><p>{method==='Credit'?'Credit Due':'Change'}: Rs. {((method==='Credit'?total-cents(paid):cents(paid)-total)/100).toFixed(2)}</p></div>
      </fieldset>
      <div className="flex gap-3"><button disabled={busy||!items.length} className="rounded-xl bg-amber-500 text-white px-5 py-2 font-bold disabled:opacity-40">{busy?'Saving...':'Update Bill'}</button><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2">Cancel Edit</button></div>
    </form>
  </div>;
}
