import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ScanBarcode, UserPlus, Receipt, Printer, X, ShoppingBag, Layers } from 'lucide-react';
import POSCart from '../components/POSCart.jsx';
import BillingSummary from '../components/BillingSummary.jsx';
import AlertPopup from '../components/AlertPopup.jsx';
import { useShop } from '../context/ShopContext.jsx';

const receiptTranslations = {
  en: {
    shopName: "STN MOTORS",
    tagline: "Tractor Parts & Oils Shop",
    address: "Main Street, Sithankeny",
    phoneLabel: "Phone",
    billNo: "Bill No",
    date: "Date",
    customer: "Customer",
    method: "Method",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "TOTAL",
    paid: "Paid",
    balanceCredit: "Balance Credit",
    change: "Change",
    footerMsg: "Thank You! Visit Again.",
    poweredBy: "POS powered by STN Motors",
    walkIn: "Walk-in Customer"
  },
  ta: {
    shopName: "எஸ்.டி.என் மோட்டார்ஸ்",
    tagline: "டிராக்டர் பாகங்கள் & ஆயில்ஸ்",
    address: "பிரதான வீதி, சித்தன்கேணி",
    phoneLabel: "தொலைபேசி",
    billNo: "பில் எண்",
    date: "தேதி",
    customer: "வாடிக்கையாளர்",
    method: "பணம் செலுத்தும் முறை",
    subtotal: "கூட்டுத்தொகை",
    discount: "தள்ளுபடி",
    total: "மொத்தம்",
    paid: "செலுத்திய பணம்",
    balanceCredit: "மீதி கடன்",
    change: "மீதி பணம்",
    footerMsg: "நன்றி! மீண்டும் வருக.",
    poweredBy: "POS இயக்கம் எஸ்.டி.என் மோட்டார்ஸ்",
    walkIn: "வழக்கமான வாடிக்கையாளர்"
  },
  bilingual: {
    shopName: "STN MOTORS / எஸ்.டி.என்",
    tagline: "Parts & Oils / பாகங்கள் & ஆயில்ஸ்",
    address: "Sithankeny / சித்தன்கேணி",
    phoneLabel: "Phone / தொலைபேசி",
    billNo: "Bill No / பில் எண்",
    date: "Date / தேதி",
    customer: "Customer / வாடிக்கையாளர்",
    method: "Method / முறை",
    subtotal: "Subtotal / கூட்டுத்தொகை",
    discount: "Discount / தள்ளுபடி",
    total: "TOTAL / மொத்தம்",
    paid: "Paid / செலுத்தியது",
    balanceCredit: "Credit / கடன்",
    change: "Change / மீதி",
    footerMsg: "Thank You! / நன்றி! மீண்டும் வருக.",
    poweredBy: "POS powered by STN Motors / எஸ்.டி.என்",
    walkIn: "Walk-in / வாடிக்கையாளர்"
  }
};

const translateProduct = (name, lang) => {
  if (lang === 'en') return name;
  
  const dict = {
    'bearing': 'பேரிங்',
    'oil': 'ஆயில்',
    'grease': 'கிரீஸ்',
    'bolt': 'போல்ட்',
    'nut': 'நட்',
    'filter': 'பில்டர்',
    'steel': 'இரும்பு',
    'air': 'ஏர்',
    'chassis': 'சேசிஸ்'
  };
  
  let translated = name;
  Object.keys(dict).forEach(key => {
    const regex = new RegExp(key, 'gi');
    if (regex.test(translated)) {
      translated = translated.replace(regex, dict[key]);
    }
  });

  if (lang === 'ta') {
    return translated;
  }
  // Bilingual
  if (translated !== name) {
    return `${name} (${translated})`;
  }
  return name;
};

const POSBilling = () => {
  const { shopInfo } = useShop();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [barcodeScanVal, setBarcodeScanVal] = useState('');

  // Selected customer profile
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Quick Customer Add Modal
  const [showCustModal, setShowCustModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', phone: '', address: '' });

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [printLang, setPrintLang] = useState('en'); // 'en', 'ta', 'bilingual'

  // States
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });

  // Brand picker — one physical part can be stocked from several companies
  const [brandChoice, setBrandChoice] = useState(null);

  // Refs for scan box autofocus
  const scanInputRef = useRef(null);

  const triggerAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchPOSData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      // Products (active only)
      const prodRes = await fetch('/api/products', { headers });
      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(prodData.products.filter(p => p.status === 'active'));
      }

      // Categories
      const catRes = await fetch('/api/products/categories', { headers });
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);

      // Customers
      const custRes = await fetch('/api/customers', { headers });
      const custData = await custRes.json();
      if (custData.success) {
        setCustomers(custData.customers);
        // Default to Walk-in customer (usually ID 1)
        const walkIn = custData.customers.find(c => c.id === 1 || c.phone === '0000000000');
        if (walkIn) setSelectedCustomer(walkIn);
      }

    } catch (error) {
      triggerAlert('error', 'Error pulling inventory records.');
    }
  };

  useEffect(() => {
    fetchPOSData();
    // Focus barcode scan on load
    if (scanInputRef.current) scanInputRef.current.focus();
  }, []);

  // Filtered Products for quick select grid
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.part_group || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? p.category_id === parseInt(selectedCategory) : true;
    return matchesSearch && matchesCategory;
  });

  // Products sharing a part_group are the same physical part from different
  // companies — same fitment, own stock, own price. Staff pick the brand at
  // billing time instead of hunting through near-identical catalog entries.
  const brandsInGroup = (part_group) =>
    part_group ? products.filter(p => p.part_group === part_group) : [];

  // Clicking a catalog tile: straight to the cart, unless the customer has a
  // choice of companies for this part.
  const handleCatalogClick = (prod) => {
    const siblings = brandsInGroup(prod.part_group);
    if (siblings.length > 1) {
      setBrandChoice({ part_group: prod.part_group, product_name: prod.product_name });
      return;
    }
    addToCart(prod, 1);
  };

  // Calculate final item total price after item-level discount
  const calculateItemTotal = (quantity, selling_price, discount = 0, discount_type = 'fixed') => {
    const sub = parseFloat(quantity) * parseFloat(selling_price);
    if (discount_type === 'percent') {
      return Math.max(0, sub - (sub * parseFloat(discount) / 100));
    }
    return Math.max(0, sub - parseFloat(discount));
  };

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find(item => item.id === product.id);
      
      // Check stock limits
      const requestedQty = existing ? parseFloat(existing.quantity) + parseFloat(quantity) : parseFloat(quantity);
      if (requestedQty > parseFloat(product.stock_qty)) {
        triggerAlert('warning', `Insufficient stock. Only ${parseFloat(product.stock_qty)} ${product.unit_type} left for ${product.product_name}.`);
        return prevCart;
      }

      // Trigger standard scan noise (optional/mental beep)
      if (existing) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { 
                ...item, 
                quantity: requestedQty, 
                total_price: calculateItemTotal(requestedQty, parseFloat(product.selling_price), item.discount || 0, item.discount_type || 'fixed') 
              }
            : item
        );
      } else {
        return [...prevCart, {
          id: product.id,
          product_name: product.product_name,
          product_code: product.product_code,
          brand: product.brand,
          unit_type: product.unit_type,
          buying_price: parseFloat(product.buying_price),
          selling_price: parseFloat(product.selling_price),
          quantity: parseFloat(quantity),
          discount: 0,
          discount_type: 'fixed',
          total_price: parseFloat(quantity) * parseFloat(product.selling_price)
        }];
      }
    });
  };

  // Update item quantity in cart
  const updateQuantity = (id, quantity) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    if (quantity > parseFloat(product.stock_qty)) {
      triggerAlert('warning', `Insufficient stock. Max available: ${parseFloat(product.stock_qty)} ${product.unit_type}.`);
      return;
    }

    setCart(prevCart => 
      prevCart.map(item => 
        item.id === id 
          ? { 
              ...item, 
              quantity: parseFloat(quantity), 
              total_price: calculateItemTotal(parseFloat(quantity), item.selling_price, item.discount || 0, item.discount_type || 'fixed')
            }
          : item
      )
    );
  };

  // Update item discount in cart
  const updateDiscount = (id, discount, discount_type) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id
          ? {
              ...item,
              discount: parseFloat(discount) || 0,
              discount_type: discount_type,
              total_price: calculateItemTotal(item.quantity, item.selling_price, parseFloat(discount) || 0, discount_type)
            }
          : item
      )
    );
  };

  // Update item selling price (unit price) in cart
  const updateUnitPrice = (id, newPrice) => {
    const parsedPrice = parseFloat(newPrice) || 0;
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id
          ? {
              ...item,
              selling_price: parsedPrice,
              total_price: calculateItemTotal(item.quantity, parsedPrice, item.discount || 0, item.discount_type || 'fixed')
            }
          : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  // Barcode Scanning Input Handler
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeScanVal) return;

    const matchedProduct = products.find(p => p.barcode === barcodeScanVal && p.status === 'active');
    
    if (matchedProduct) {
      addToCart(matchedProduct, 1);
      setBarcodeScanVal('');
      triggerAlert('success', `Scanned: ${matchedProduct.product_name}`);
    } else {
      triggerAlert('error', `No active product found matching Barcode: ${barcodeScanVal}`);
      setBarcodeScanVal('');
    }
  };

  // Subtotal calculation
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);

  // Final Checkout Submission
  const handleCheckoutSubmit = async (billDetails) => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...billDetails,
          items: cart
        })
      });

      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        
        // Setup receipt layout details
        const saleDetails = {
          bill_no: data.bill_no,
          date: new Date().toLocaleString(),
          customer: selectedCustomer,
          items: cart,
          subtotal: billDetails.subtotal,
          discount: billDetails.discount,
          total_amount: billDetails.total_amount,
          paid_amount: billDetails.paid_amount,
          balance_amount: billDetails.balance_amount,
          payment_method: billDetails.payment_method
        };
        
        setReceiptData(saleDetails);
        setShowReceipt(true);

        // Clear cart
        setCart([]);
        
        // Re-fetch products to reflect reduced stocks
        fetchPOSData();
      } else {
        triggerAlert('error', data.message || 'Checkout failed.');
      }
    } catch (error) {
      triggerAlert('error', 'Server error. Failed to finalize checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Quick Customer Registration
  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!custForm.name || !custForm.phone) {
      triggerAlert('warning', 'Name and Phone are required.');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(custForm)
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', data.message);
        
        // Fetch fresh customers list
        const custRes = await fetch('/api/customers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const custData = await custRes.json();
        if (custData.success) {
          setCustomers(custData.customers);
          // Auto link newly registered customer
          const newCustObj = custData.customers.find(c => c.phone === custForm.phone);
          if (newCustObj) setSelectedCustomer(newCustObj);
        }

        setCustForm({ name: '', phone: '', address: '' });
        setShowCustModal(false);
      } else {
        triggerAlert('error', data.message);
      }
    } catch (error) {
      triggerAlert('error', 'Server error registering customer.');
    }
  };

  const handlePrintReceipt = () => {
    const t = receiptTranslations[printLang];
    const items = receiptData.items.map(item => `
      <div class="item">
        <div class="item-description">
          <div>${translateProduct(item.product_name, printLang)}</div>
          <div style="font-size:9px;">
            ${parseFloat(item.quantity)} ${item.unit_type} x Rs. ${parseFloat(item.selling_price).toFixed(2)}
            ${parseFloat(item.discount || 0) > 0 ? ` (Disc: -${item.discount_type === 'percent' ? `${item.discount}%` : `Rs. ${item.discount}`})` : ''}
          </div>
        </div>
        <span class="amount">Rs. ${parseFloat(item.total_price).toFixed(2)}</span>
      </div>
    `).join('');

    // HTML without @page size and without auto-print — we measure first, then print
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>STN Motors Bill</title>
  <style>
    @page { margin: 0mm; }
    html, body { margin: 0; padding: 0; width: 72mm; font-family: monospace; font-size: 12px; line-height: 1.35; color: black; background: white; overflow: visible; }
    * { box-sizing: border-box; }
    /* XP-80 receipt driver exposes a 72mm print area, even with a 79mm roll. */
    .receipt { width: 72mm; margin: 0; padding: 1mm 2mm 2mm; overflow-wrap: anywhere; }
    .item { display: flex; justify-content: space-between; gap: 2mm; margin-bottom: 6px; break-inside: avoid; }
    .item-description { flex: 1; min-width: 0; }
    .amount { flex-shrink: 0; white-space: nowrap; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed { border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; margin: 6px 0; }
    .dashed-top { border-top: 1px dashed black; padding-top: 5px; margin-top: 8px; }
    .row { display: flex; justify-content: space-between; gap: 2mm; margin-bottom: 3px; }
    .row > :first-child { min-width: 0; }
    .row > :last-child { flex-shrink: 0; white-space: nowrap; }
    .dotted-top { border-top: 1px dotted #888; padding-top: 4px; margin-top: 4px; }
    .footer { border-top: 1px dashed black; padding-top: 4px; margin-top: 6px; text-align: center; font-weight: bold; }
    .print-actions { padding: 8px; text-align: center; }
    .print-actions button { padding: 8px 20px; cursor: pointer; }
    @media print { .print-actions { display: none !important; } }
  </style>
</head>
<body style="overflow:visible;">
  <div class="print-actions"><button type="button" onclick="window.print()">Print Receipt</button></div>
  <div class="receipt">
    <div class="center bold">
      <div style="font-size:14px;font-weight:900;letter-spacing:1px;">${shopInfo.shopName}</div>
      <div style="font-size:10px;">${shopInfo.shopTagline}</div>
      <div style="font-size:9px;margin-bottom:6px;">${shopInfo.shopAddress}<br/>${t.phoneLabel}: ${shopInfo.shopPhone}</div>
    </div>

    <div class="dashed">
      <div>${t.billNo}: ${receiptData.bill_no}</div>
      <div>${t.date}: ${receiptData.date}</div>
      <div>${t.customer}: ${receiptData.customer?.id === 1 ? t.walkIn : receiptData.customer?.name}</div>
      <div>${t.method}: ${receiptData.payment_method}</div>
    </div>

    <div style="margin:6px 0;">${items}</div>

    <div class="dashed-top">
      <div class="row"><span>${t.subtotal}:</span><span>Rs. ${parseFloat(receiptData.subtotal).toFixed(2)}</span></div>
      <div class="row"><span>${t.discount}:</span><span>- Rs. ${parseFloat(receiptData.discount).toFixed(2)}</span></div>
      <div class="row bold dotted-top"><span>${t.total}:</span><span>Rs. ${parseFloat(receiptData.total_amount).toFixed(2)}</span></div>
      <div class="row"><span>${t.paid}:</span><span>Rs. ${parseFloat(receiptData.paid_amount).toFixed(2)}</span></div>
      <div class="row"><span>${receiptData.payment_method === 'Credit' ? `${t.balanceCredit}:` : `${t.change}:`}</span><span>Rs. ${parseFloat(receiptData.balance_amount).toFixed(2)}</span></div>
    </div>

    <div class="footer">${t.footerMsg}</div>
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=320,height=900,scrollbars=yes');
    if (!printWin) {
      triggerAlert('error', 'Please allow pop-ups to print the receipt.');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();

    // document.write may complete without a new window load event.
    const preparePrint = async () => {
      await printWin.document.fonts.ready;
      if (printWin.closed) return;
      await new Promise(resolve => printWin.requestAnimationFrame(resolve));
      const contentHeightPx = printWin.document.querySelector('.receipt').getBoundingClientRect().height;
      // Convert CSS pixels to mm; only a 1mm rounding allowance is needed.
      const contentHeightMm = Math.ceil(contentHeightPx * 25.4 / 96) + 1;

      // Inject exact @page size so no blank space is wasted
      const pageStyle = printWin.document.createElement('style');
      pageStyle.textContent = `@page { size: 72mm ${contentHeightMm}mm; margin: 0mm; }`;
      printWin.document.head.appendChild(pageStyle);

      // Small delay to ensure style is applied, then print
      setTimeout(() => {
        if (printWin.closed) return;
        printWin.onafterprint = () => printWin.close();
        printWin.focus();
        printWin.print();
      }, 150);
    };
    void preparePrint();
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)] font-sans">
      
      {/* LEFT PANEL: SCANNER & CATALOG SELECTOR (Col span 7) */}
      <div className="lg:col-span-7 flex flex-col h-full space-y-4">
        
        {/* 1. Barcode Scanning Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ScanBarcode className="h-5 w-5" />
          </div>
          
          <form onSubmit={handleBarcodeSubmit} className="flex-1">
            <input
              ref={scanInputRef}
              type="text"
              value={barcodeScanVal}
              onChange={(e) => setBarcodeScanVal(e.target.value)}
              placeholder="Barcode Scanner Box (Autofocused... Scan item barcode now)"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 py-2.5 px-4 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white rounded-xl"
            />
          </form>
        </div>

        {/* 2. Product Search & Categories Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by name or item code..."
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold py-2 px-3 focus:outline-none dark:text-white appearance-none min-w-[140px]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Catalog Products Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-1 bg-slate-100/50 dark:bg-slate-950/20 rounded-3xl border border-slate-200/40 dark:border-slate-900/30">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <ShoppingBag className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400 font-bold">No matching catalog items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map(prod => {
                const outOfStock = parseFloat(prod.stock_qty) <= 0;
                const groupSize = brandsInGroup(prod.part_group).length;

                return (
                  <button
                    key={prod.id}
                    disabled={outOfStock && groupSize <= 1}
                    onClick={() => handleCatalogClick(prod)}
                    className="flex flex-col justify-between text-left p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:border-amber-500 hover:ring-2 hover:ring-amber-500/10 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wide">
                          {prod.product_code}
                        </span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          outOfStock 
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500' 
                            : parseFloat(prod.stock_qty) <= parseFloat(prod.low_stock_limit)
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                        }`}>
                          {outOfStock 
                            ? 'Sold Out' 
                            : `${parseFloat(prod.stock_qty)} ${prod.unit_type}`}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-2 truncate w-full group-hover:text-amber-500">
                        {prod.product_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Brand: {prod.brand}</p>
                      {groupSize > 1 && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          <Layers className="h-2.5 w-2.5" />
                          {groupSize} companies
                        </span>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 dark:border-slate-850 pt-2 flex justify-between items-center w-full">
                      <span className="text-[10px] font-semibold text-slate-400">Retail Unit</span>
                      <span className="font-bold text-xs font-mono text-slate-800 dark:text-amber-400">Rs. {parseFloat(prod.selling_price).toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT BILL SUMMARY (Col span 5) */}
      <div className="lg:col-span-5 grid grid-rows-12 gap-4 h-full">
        {/* Cart List */}
        <div className="row-span-6 overflow-hidden">
          <POSCart 
            cart={cart}
            updateQuantity={updateQuantity}
            updateDiscount={updateDiscount}
            updateUnitPrice={updateUnitPrice}
            removeFromCart={removeFromCart}
          />
        </div>

        {/* Bill calculation details */}
        <div className="row-span-6 overflow-hidden">
          <BillingSummary
            subtotal={subtotal}
            onCheckout={handleCheckoutSubmit}
            customers={customers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            onQuickAddCustomer={() => setShowCustModal(true)}
            checkoutLoading={checkoutLoading}
            triggerAlert={triggerAlert}
          />
        </div>
      </div>

      {/* MODAL 1: QUICK REGISTER CUSTOMER */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-xs">
          <div className="fixed inset-0 bg-slate-950/30" onClick={() => setShowCustModal(false)} />
          <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10">
            <button 
              onClick={() => setShowCustModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Register New customer</h3>
            
            <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  placeholder="E.g. J. Loganathan"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  placeholder="E.g. 077XXXXXXXX"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Home Address</label>
                <textarea
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="Address details"
                  rows="2"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-3 font-bold text-xs text-white shadow-lg"
              >
                Register & Bind Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: THERMAL PRINT RECEIPT PREVIEW */}
      {showReceipt && receiptData && (() => {
        const t = receiptTranslations[printLang];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs print-modal-overlay">
            <div className="fixed inset-0 bg-slate-950/45 no-print" onClick={() => setShowReceipt(false)} />
            <div className="relative w-full max-w-sm transform rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto print-modal-content">
              
              {/* Action Bar */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3 no-print">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <span>Invoice Receipt Preview</span>
                </span>
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Language Selector Buttons */}
              <div className="flex gap-1.5 mb-4 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl no-print">
                <button
                  onClick={() => setPrintLang('en')}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${printLang === 'en' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setPrintLang('ta')}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${printLang === 'ta' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  தமிழ்
                </button>
                <button
                  onClick={() => setPrintLang('bilingual')}
                  className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-xl transition-all ${printLang === 'bilingual' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Bilingual
                </button>
              </div>

              {/* Print paper target content */}
              <div 
                id="thermal-receipt-preview" 
                className="bg-white p-4 border border-dashed border-slate-300 text-black font-sans leading-relaxed text-xs shadow-inner"
                style={{ fontFamily: 'monospace' }}
              >
                <div className="text-center font-bold">
                  <h3 className="text-sm uppercase font-extrabold tracking-wide">{shopInfo.shopName}</h3>
                  <p className="text-[10px] font-semibold mt-0.5">{shopInfo.shopTagline}</p>
                  <p className="text-[9px] font-normal leading-normal">{shopInfo.shopAddress}<br />{t.phoneLabel}: {shopInfo.shopPhone}</p>
                </div>
                
                <div className="border-t border-b border-dashed border-black py-2 my-2 text-[10px]">
                  <div className="flex justify-between">
                    <span>{t.billNo}: {receiptData.bill_no}</span>
                    <span>{t.date}: {receiptData.date}</span>
                  </div>
                  <div>{t.customer}: {receiptData.customer?.id === 1 ? t.walkIn : receiptData.customer?.name}</div>
                  <div>{t.method}: {receiptData.payment_method}</div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 text-[10px]">
                  {receiptData.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <div>{translateProduct(item.product_name, printLang)}</div>
                        <div className="text-[9px] text-slate-500">
                          {parseFloat(item.quantity)} {item.unit_type} x Rs. {parseFloat(item.selling_price).toFixed(2)}
                          {parseFloat(item.discount || 0) > 0 && ` (Disc: -${item.discount_type === 'percent' ? `${item.discount}%` : `Rs. ${item.discount}`})`}
                        </div>
                      </div>
                      <span className="font-mono">Rs. {parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-black mt-3 pt-2 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>{t.subtotal}:</span>
                    <span>Rs. {parseFloat(receiptData.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.discount}:</span>
                    <span>- Rs. {parseFloat(receiptData.discount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-slate-400">
                    <span>{t.total}:</span>
                    <span>Rs. {parseFloat(receiptData.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.paid}:</span>
                    <span>Rs. {parseFloat(receiptData.paid_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{receiptData.payment_method === 'Credit' ? `${t.balanceCredit}:` : `${t.change}:`}</span>
                    <span>Rs. {parseFloat(receiptData.balance_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center font-semibold text-[10px] mt-6 border-t border-dashed border-black pt-2">
                  {t.footerMsg}
                </div>
              </div>

              {/* Print Action Trigger */}
              <button
                onClick={handlePrintReceipt}
                className="w-full mt-4 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-1.5 no-print"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>Print Invoice Receipt</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Portal for printing only (attached directly to body, so #root display:none doesn't affect it) */}
      {showReceipt && receiptData && (() => {
        const t = receiptTranslations[printLang];
        return createPortal(
          <>
            <style>{`
              @media print {
                @page {
                  margin: 0;
                  size: 76mm auto;
                  orphans: 99999;
                  widows: 99999;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  width: 76mm;
                  height: auto;
                  overflow: visible;
                }
                * {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `}</style>
            <div className="print-only-receipt" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <div className="text-center font-bold">
                <h3 className="text-sm uppercase font-extrabold tracking-wide" style={{ fontSize: '14px', margin: '0 0 2px 0' }}>{shopInfo.shopName}</h3>
                <p className="text-[10px] font-semibold mt-0.5" style={{ margin: '0 0 2px 0' }}>{shopInfo.shopTagline}</p>
                <p className="text-[9px] font-normal leading-normal" style={{ margin: '0 0 8px 0' }}>{shopInfo.shopAddress}<br />{t.phoneLabel}: {shopInfo.shopPhone}</p>
              </div>
              
              <div className="border-t border-b border-dashed border-black py-2 my-2 text-[10px]" style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '6px 0', margin: '8px 0' }}>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.billNo}: {receiptData.bill_no}</span>
                  <span>{t.date}: {receiptData.date}</span>
                </div>
                <div>{t.customer}: {receiptData.customer?.id === 1 ? t.walkIn : receiptData.customer?.name}</div>
                <div>{t.method}: {receiptData.payment_method}</div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-[10px]">
                {receiptData.items.map(item => (
                  <div key={item.id} className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div>
                      <div>{translateProduct(item.product_name, printLang)}</div>
                      <div className="text-[9px] text-slate-600">
                        {parseFloat(item.quantity)} {item.unit_type} x Rs. {parseFloat(item.selling_price).toFixed(2)}
                        {parseFloat(item.discount || 0) > 0 && ` (Disc: -${item.discount_type === 'percent' ? `${item.discount}%` : `Rs. ${item.discount}`})`}
                      </div>
                    </div>
                    <span className="font-mono">Rs. {parseFloat(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-black mt-3 pt-2 text-[10px] space-y-1" style={{ borderTop: '1px dashed black', marginTop: '10px', paddingTop: '6px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.subtotal}:</span>
                  <span>Rs. {parseFloat(receiptData.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.discount}:</span>
                  <span>- Rs. {parseFloat(receiptData.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-slate-400" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #ccc', paddingTop: '4px', fontWeight: 'bold' }}>
                  <span>{t.total}:</span>
                  <span>Rs. {parseFloat(receiptData.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.paid}:</span>
                  <span>Rs. {parseFloat(receiptData.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{receiptData.payment_method === 'Credit' ? `${t.balanceCredit}:` : `${t.change}:`}</span>
                  <span>Rs. {parseFloat(receiptData.balance_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center font-semibold text-[10px] mt-6 border-t border-dashed border-black pt-2" style={{ borderTop: '1px dashed black', paddingTop: '8px', marginTop: '24px', textAlign: 'center' }}>
                {t.footerMsg}
              </div>
            </div>
          </>,
          document.body
        );
      })()}

      {/* Brand picker — same part, different companies */}
      {brandChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setBrandChoice(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
            <button onClick={() => setBrandChoice(null)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Layers className="h-4 w-4 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-white">{brandChoice.product_name}</h3>
                <p className="text-[10px] font-semibold text-slate-400 font-mono">{brandChoice.part_group}</p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-500 mt-3 mb-2">Which company does the customer want?</p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {brandsInGroup(brandChoice.part_group)
                .slice()
                .sort((a, b) => parseFloat(a.selling_price) - parseFloat(b.selling_price))
                .map(alt => {
                  const altOut = parseFloat(alt.stock_qty) <= 0;
                  return (
                    <button
                      key={alt.id}
                      disabled={altOut}
                      onClick={() => { addToCart(alt, 1); setBrandChoice(null); }}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-left hover:border-amber-500 hover:ring-2 hover:ring-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alt.brand}</p>
                        <p className="text-[10px] font-mono font-semibold text-slate-400 truncate">{alt.product_code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-slate-800 dark:text-amber-400">Rs. {parseFloat(alt.selling_price).toFixed(2)}</p>
                        <p className={`text-[10px] font-bold ${altOut ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {altOut ? 'Sold Out' : `${parseFloat(alt.stock_qty)} ${alt.unit_type} left`}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Floating notification alert toast */}
      <AlertPopup 
        isOpen={alert.show}
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default POSBilling;
