import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';

const POSCart = ({ cart, updateQuantity, updateDiscount, updateUnitPrice, removeFromCart }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Shopping Cart</h3>
        <p className="text-xs text-slate-400 mt-0.5">{cart.length} items added</p>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 mb-3 border border-amber-100/50 dark:border-amber-900/10">
              <Plus className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-350">Cart is Empty</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Scan a barcode or search for products to add them here.</p>
          </div>
        ) : (
          cart.map((item) => {
            const isLoose = item.unit_type !== 'Piece';
            
            return (
              <div 
                key={item.id}
                className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 hover:border-amber-500/20 dark:hover:border-amber-500/10 transition-all duration-200"
              >
                {/* Top Row: Product Name & Code and Delete Action */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200 truncate" title={item.product_name}>
                      {item.product_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase block mt-0.5">
                      Code: {item.product_code}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors duration-150 shrink-0"
                    title="Remove product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Bottom Row: Discount, Quantity Adjuster, Prices */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/30">
                  {/* Item Discount Input Box */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 w-fit">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Disc:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.discount || ''}
                      onChange={(e) => updateDiscount(item.id, parseFloat(e.target.value) || 0, item.discount_type || 'fixed')}
                      className="w-10 text-center font-bold text-[10px] bg-transparent focus:outline-none dark:text-white p-0 border-none"
                    />
                    <select
                      value={item.discount_type || 'fixed'}
                      onChange={(e) => updateDiscount(item.id, item.discount || 0, e.target.value)}
                      className="text-[9px] font-bold bg-transparent text-slate-600 dark:text-slate-350 focus:outline-none border-none p-0 cursor-pointer"
                    >
                      <option value="fixed">Rs.</option>
                      <option value="percent">%</option>
                    </select>
                  </div>

                  {/* Quantity Adjuster */}
                  <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-1.5 py-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, parseFloat(item.quantity) - (isLoose ? 0.25 : 1))}
                      disabled={item.quantity <= (isLoose ? 0.25 : 1)}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 rounded-lg"
                    >
                      <Minus className="h-3 w-3" />
                    </button>

                    <input
                      type="number"
                      value={item.quantity}
                      step={isLoose ? '0.001' : '1'}
                      min={isLoose ? '0.001' : '1'}
                      onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                      className="w-12 text-center font-bold font-mono text-xs bg-transparent focus:outline-none dark:text-white"
                    />

                    <button
                      onClick={() => updateQuantity(item.id, parseFloat(item.quantity) + (isLoose ? 0.25 : 1))}
                      className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-3 ml-auto flex-wrap">
                    {/* Item Price Input Box */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 w-fit">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Price:</span>
                      <span className="text-[9px] font-bold text-slate-450">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.selling_price || ''}
                        onChange={(e) => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-center font-bold text-[10px] bg-transparent focus:outline-none dark:text-white p-0 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="text-right shrink-0 min-w-[70px]">
                      <span className="block font-bold text-xs text-slate-850 dark:text-slate-200">
                        Rs. {parseFloat(item.total_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default POSCart;
