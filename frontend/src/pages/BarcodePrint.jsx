import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Trash2,
  Printer,
  LayoutGrid,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AlertPopup from '../components/AlertPopup.jsx';

// ============================================================
// CODE 39 BARCODE GENERATOR
// ============================================================
const Barcode39 = ({
  value,
  height = 50,
  narrowWidth = 1.8,
  wideWidth = 4.2
}) => {
  const Code39Table = {
    '0': '000110100',
    '1': '100100001',
    '2': '001100001',
    '3': '101100000',
    '4': '000110001',
    '5': '100110000',
    '6': '001110000',
    '7': '000100101',
    '8': '100100100',
    '9': '001100100',
    'A': '100001001',
    'B': '001001001',
    'C': '101001000',
    'D': '000011001',
    'E': '100011000',
    'F': '001011000',
    'G': '000001101',
    'H': '100001100',
    'I': '001001100',
    'J': '000011100',
    'K': '100000011',
    'L': '001000011',
    'M': '101000010',
    'N': '000010011',
    'O': '100010010',
    'P': '001010010',
    'Q': '000000111',
    'R': '100000110',
    'S': '001000110',
    'T': '000010110',
    'U': '110000001',
    'V': '011000001',
    'W': '111000000',
    'X': '010010001',
    'Y': '110010000',
    'Z': '011010000',
    '-': '010000101',
    '.': '110000100',
    ' ': '011000100',
    '*': '010010100',
    '$': '010101000',
    '/': '010100010',
    '+': '010001010',
    '%': '000101010'
  };

  const cleanVal = `*${String(value || '').toUpperCase()}*`;

  const rects = [];
  let currentX = 0;

  for (let i = 0; i < cleanVal.length; i++) {
    const char = cleanVal[i];
    const pattern = Code39Table[char] || Code39Table[' '];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';

      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={width}
            height={height}
            fill="black"
          />
        );
      }

      currentX += width;
    }

    // Inter-character space
    currentX += narrowWidth;
  }

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${currentX} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {rects}
    </svg>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const BarcodePrint = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  // ==========================================================
  // AUTOCOMPLETE SEARCH
  // ==========================================================
  const [searchVal, setSearchVal] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // ==========================================================
  // PRINT SETTINGS
  // ==========================================================
  const [queue, setQueue] = useState([]);

  /*
    Existing:
    a4_3x8
    a4_4x10
    roll_50x30
    roll_38x25

    Added:
    roll_30x20
  */
  const [layoutType, setLayoutType] = useState('roll_30x20');

  const [showShopName, setShowShopName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCostCode, setShowCostCode] = useState(false);

  // ==========================================================
  // SECRET COST CODE
  // PLAYGROUND
  // P=0 L=1 A=2 Y=3 G=4 R=5 O=6 U=7 N=8 D=9
  // ==========================================================
  const getCostCode = (price) => {
    const cipherKey = 'PLAYGROUND';

    const intPrice = Math.floor(
      parseFloat(price) || 0
    ).toString();

    return intPrice
      .split('')
      .map((digit) => {
        const idx = parseInt(digit, 10);

        return idx >= 0 && idx <= 9
          ? cipherKey[idx]
          : digit;
      })
      .join('');
  };

  // ==========================================================
  // PRINTING STATE
  // ==========================================================
  const [isPrinting, setIsPrinting] = useState(false);
  const [printItems, setPrintItems] = useState([]);

  // ==========================================================
  // ALERT
  // ==========================================================
  const triggerAlert = (type, message) => {
    setAlert({
      show: true,
      type,
      message
    });
  };

  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setProducts(
          data.products.filter(
            (p) => p.status === 'active'
          )
        );
      } else {
        triggerAlert(
          'error',
          data.message || 'Failed to fetch products.'
        );
      }
    } catch (error) {
      triggerAlert(
        'error',
        'Server error. Failed to retrieve products.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // USE EFFECT
  // ==========================================================
  useEffect(() => {
    fetchProducts();

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  // ==========================================================
  // FILTER PRODUCTS
  // ==========================================================
  const filteredProducts = products.filter((p) =>
    p.product_name
      .toLowerCase()
      .includes(searchVal.toLowerCase()) ||
    p.product_code
      .toLowerCase()
      .includes(searchVal.toLowerCase()) ||
    (p.barcode &&
      p.barcode.includes(searchVal))
  );

  // ==========================================================
  // ADD PRODUCT TO QUEUE
  // ==========================================================
  const handleAddToQueue = (
    product,
    count = 1
  ) => {
    setQueue((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                printQty:
                  item.printQty + count
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          printQty: count
        }
      ];
    });

    setSearchVal('');
    setShowDropdown(false);

    triggerAlert(
      'success',
      `Added ${product.product_name} to printing queue.`
    );
  };

  // ==========================================================
  // ADD ALL PRODUCTS
  // ==========================================================
  const handleAddAll = (qty = 1) => {
    const updatedQueue = products.map((prod) => {
      const existing = queue.find(
        (q) => q.id === prod.id
      );

      const printQty =
        qty === 'stock'
          ? Math.max(
              1,
              Math.ceil(
                parseFloat(prod.stock_qty || 0)
              )
            )
          : qty;

      return {
        ...prod,
        printQty: existing
          ? existing.printQty + printQty
          : printQty
      };
    });

    setQueue(updatedQueue);

    triggerAlert(
      'success',
      'Loaded print queue for all active products.'
    );
  };

  // ==========================================================
  // UPDATE QUANTITY
  // ==========================================================
  const handleUpdateQty = (id, val) => {
    const qty = parseInt(val) || 0;

    if (qty <= 0) {
      setQueue((prev) =>
        prev.filter(
          (item) => item.id !== id
        )
      );
    } else {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                printQty: qty
              }
            : item
        )
      );
    }
  };

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================
  const handleRemoveFromQueue = (id) => {
    setQueue((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );
  };

  // ==========================================================
  // CLEAR QUEUE
  // ==========================================================
  const handleClearQueue = () => {
    setQueue([]);

    triggerAlert(
      'info',
      'Print queue cleared.'
    );
  };

  // ==========================================================
  // GENERATE MISSING BARCODES
  // ==========================================================
  const handleGenerateMissingBarcodes =
    async () => {
      let generatedCount = 0;

      const updatedQueue = [...queue];

      for (
        let i = 0;
        i < updatedQueue.length;
        i++
      ) {
        const item = updatedQueue[i];

        if (!item.barcode) {
          let newBarcode = '';
          let unique = false;
          let attempts = 0;

          while (
            !unique &&
            attempts < 100
          ) {
            attempts++;

            const randomPart = String(
              Math.floor(
                100000000 +
                  Math.random() *
                    900000000
              )
            );

            newBarcode =
              `200${randomPart}`;

            const duplicate =
              products.some(
                (p) =>
                  p.barcode ===
                  newBarcode
              ) ||
              updatedQueue.some(
                (q, idx) =>
                  idx !== i &&
                  q.barcode ===
                    newBarcode
              );

            if (!duplicate) {
              unique = true;
            }
          }

          if (unique) {
            item.barcode =
              newBarcode;

            generatedCount++;

            try {
              await fetch(
                `/api/products/${item.id}`,
                {
                  method: 'PUT',

                  headers: {
                    'Content-Type':
                      'application/json',

                    Authorization: `Bearer ${localStorage.getItem(
                      'token'
                    )}`
                  },

                  body: JSON.stringify({
                    product_name:
                      item.product_name,

                    product_code:
                      item.product_code,

                    barcode:
                      newBarcode,

                    category_id:
                      item.category_id,

                    brand: item.brand,

                    unit_type:
                      item.unit_type,

                    buying_price:
                      item.buying_price,

                    selling_price:
                      item.selling_price,

                    stock_qty:
                      item.stock_qty,

                    low_stock_limit:
                      item.low_stock_limit,

                    supplier_id:
                      item.supplier_id,

                    status:
                      item.status
                  })
                }
              );
            } catch (e) {
              console.error(
                'Failed to save generated barcode:',
                item.id
              );
            }
          }
        }
      }

      if (generatedCount > 0) {
        setQueue(updatedQueue);

        fetchProducts();

        triggerAlert(
          'success',
          `Generated and saved ${generatedCount} missing barcode(s).`
        );
      } else {
        triggerAlert(
          'info',
          'No missing barcodes to generate in queue.'
        );
      }
    };

  // ==========================================================
  // PRINT
  // ==========================================================
  const handlePrint = () => {
    if (queue.length === 0) {
      triggerAlert(
        'warning',
        'Please add products to the queue first.'
      );

      return;
    }

    // Flat print items
    const flatItems = [];

    queue.forEach((item) => {
      const code =
        item.barcode ||
        item.product_code;

      for (
        let c = 0;
        c < item.printQty;
        c++
      ) {
        flatItems.push({
          ...item,
          printBarcode: code
        });
      }
    });

    setPrintItems(flatItems);
    setIsPrinting(true);

    // ========================================================
    // DYNAMIC PRINT CSS
    // NOTE: .print-barcode-card now uses justify-content:center
    // with a small gap and NO flex-1 children, so however many
    // of the 4 optional blocks (Shop Name / Product / Barcode /
    // Price+Cost Code) are visible, they stack as one group and
    // stay centered inside the label - 2 selected or 3 selected,
    // same centered behaviour.
    // ========================================================
    let pageStyles = '';

    // --------------------------------------------------------
    // A4 3 x 8
    // --------------------------------------------------------
    if (layoutType === 'a4_3x8') {
      pageStyles = `
        @media print {

          @page {
            size: A4 portrait;
            margin: 10mm 5mm 10mm 5mm;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .print-only-barcode-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            column-gap: 5mm !important;
            row-gap: 4.5mm !important;
            width: 100% !important;
            background: white !important;
          }

          .print-barcode-card {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 1mm !important;

            border: 1px dashed #ccc !important;

            padding: 3mm !important;

            height: 33.9mm !important;

            box-sizing: border-box !important;

            background: white !important;
            color: black !important;

            text-align: center !important;

            page-break-inside: avoid !important;
          }
        }
      `;
    }

    // --------------------------------------------------------
    // A4 4 x 10
    // --------------------------------------------------------
    else if (
      layoutType === 'a4_4x10'
    ) {
      pageStyles = `
        @media print {

          @page {
            size: A4 portrait;
            margin: 8mm 4mm 8mm 4mm;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .print-only-barcode-sheet {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            column-gap: 3mm !important;
            row-gap: 3mm !important;
            width: 100% !important;
            background: white !important;
          }

          .print-barcode-card {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.8mm !important;

            border: 1px dashed #ccc !important;

            padding: 2mm !important;

            height: 25.4mm !important;

            box-sizing: border-box !important;

            background: white !important;
            color: black !important;

            text-align: center !important;

            page-break-inside: avoid !important;
          }
        }
      `;
    }

    // --------------------------------------------------------
    // 50 x 30 MM
    // --------------------------------------------------------
    else if (
      layoutType === 'roll_50x30'
    ) {
      pageStyles = `
        @media print {

          @page {
            size: 50mm 30mm;
            margin: 0;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .print-only-barcode-sheet {
            display: block !important;
            background: white !important;
          }

          .print-barcode-card {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.8mm !important;

            width: 50mm !important;
            height: 30mm !important;

            padding: 2mm !important;

            box-sizing: border-box !important;

            background: white !important;
            color: black !important;

            text-align: center !important;

            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          .print-barcode-card:last-child {
            page-break-after: avoid !important;
          }
        }
      `;
    }

    // --------------------------------------------------------
    // 38 x 25 MM
    // --------------------------------------------------------
    else if (
      layoutType === 'roll_38x25'
    ) {
      pageStyles = `
        @media print {

          @page {
            size: 38mm 25mm;
            margin: 0;
          }

          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .print-only-barcode-sheet {
            display: block !important;
            background: white !important;
          }

          .print-barcode-card {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 0.6mm !important;

            width: 38mm !important;
            height: 25mm !important;

            padding: 1.5mm !important;

            box-sizing: border-box !important;

            background: white !important;
            color: black !important;

            text-align: center !important;

            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          .print-barcode-card:last-child {
            page-break-after: avoid !important;
          }
        }
      `;
    }

    // ========================================================
    // 30 x 20 MM
    // ========================================================
    else if (
      layoutType === 'roll_30x20'
    ) {
      pageStyles = `
        @media print {

          @page {
            size: 30mm 20mm;
            margin: 0;
          }

          html,
          body {
            width: 30mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print-only-barcode-sheet {
            display: block !important;
            width: 30mm !important;
            background: white !important;
          }

          .print-barcode-card {
            display: flex !important;

            flex-direction: column !important;

            align-items: center !important;

            justify-content: center !important;

            gap: 0.5mm !important;

            width: 30mm !important;
            height: 20mm !important;

            padding: 1mm !important;

            margin: 0 !important;

            box-sizing: border-box !important;

            background: white !important;

            color: black !important;

            text-align: center !important;

            overflow: hidden !important;

            page-break-after: always !important;

            page-break-inside: avoid !important;
          }

          .print-barcode-card:last-child {
            page-break-after: avoid !important;
          }

          /* Dynamic font sizes are now handled via inline styles in renderLabelBody */
        }
      `;
    }

    // ========================================================
    // ADD DYNAMIC STYLE
    // ========================================================
    const styleEl =
      document.createElement('style');

    styleEl.id =
      'barcode-print-dynamic-style';

    styleEl.innerHTML =
      pageStyles +
      `
        @media screen {

          .print-only-barcode-sheet {
            display: none !important;
          }
        }
      `;

    document.head.appendChild(
      styleEl
    );

    // ========================================================
    // WAIT FOR RENDER THEN PRINT
    // ========================================================
    setTimeout(() => {
      window.print();

      document
        .getElementById(
          'barcode-print-dynamic-style'
        )
        ?.remove();

      setIsPrinting(false);
    }, 500);
  };

  // ==========================================================
  // PREVIEW GRID
  // ==========================================================
  const getPreviewGridColsClass =
    () => {
      if (
        layoutType === 'a4_3x8'
      ) {
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';
      }

      if (
        layoutType === 'a4_4x10'
      ) {
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3';
      }

      return 'grid-cols-2 sm:grid-cols-4 gap-2';
    };

  // ==========================================================
  // PREVIEW CARD HEIGHT
  // ==========================================================
  const getPreviewCardHeightStyle =
    () => {
      if (
        layoutType === 'a4_3x8'
      ) {
        return 'h-[120px]';
      }

      if (
        layoutType === 'a4_4x10'
      ) {
        return 'h-[95px]';
      }

      if (
        layoutType === 'roll_50x30'
      ) {
        return 'h-[110px] w-[180px] mx-auto';
      }

      if (
        layoutType === 'roll_38x25'
      ) {
        return 'h-[90px] w-[140px] mx-auto';
      }

      // 30 x 20
      return 'h-[72px] w-[108px] mx-auto';
    };

  // ==========================================================
  // PREVIEW ITEMS
  // ==========================================================
  const getPreviewItems = () => {
    const items = [];

    for (
      let i = 0;
      i < queue.length;
      i++
    ) {
      const item = queue[i];

      const code =
        item.barcode ||
        item.product_code;

      for (
        let c = 0;
        c < item.printQty;
        c++
      ) {
        items.push({
          ...item,
          printBarcode: code
        });

        if (
          items.length >= 40
        ) {
          return items;
        }
      }
    }

    return items;
  };

  // ==========================================================
  // TOTAL LABEL COUNT
  // ==========================================================
  const totalLabelsCount =
    queue.reduce(
      (sum, item) =>
        sum + item.printQty,
      0
    );

  // ==========================================================
  // SHARED LABEL BODY (used by both live preview and the
  // actual print portal so the two always match). Renders
  // ONLY the blocks that are toggled on. Now fully dynamic
  // in sizing so we can enlarge the fonts if fewer blocks
  // are visible.
  // ==========================================================
  const getDynamicSizes = () => {
    const isSmall = layoutType === 'roll_30x20';
    const count =
      (showShopName ? 1 : 0) +
      (showProductName ? 1 : 0) +
      (showBarcode ? 1 : 0) +
      ((showPrice || showCostCode) ? 1 : 0);

    let sizes = {};
    if (isSmall) {
      if (count === 1) sizes = { shop: 16, prod: 18, code: 14, barNum: 14, svgH: 30, margin: '2px 0', cost: 14, price: 16, narrow: 1.4, wide: 3.2 };
      else if (count === 2) sizes = { shop: 14, prod: 15, code: 12, barNum: 12, svgH: 26, margin: '2px 0', cost: 11, price: 13, narrow: 1.2, wide: 2.8 };
      else if (count === 3) sizes = { shop: 10, prod: 11, code: 9, barNum: 9, svgH: 22, margin: '1px 0', cost: 8, price: 10, narrow: 1.1, wide: 2.5 };
      else sizes = { shop: 8, prod: 9, code: 7.5, barNum: 7.5, svgH: 22, margin: '0px 0', cost: 7, price: 8, narrow: 1.0, wide: 2.3 };
    } else {
      if (count === 1) sizes = { shop: 22, prod: 24, code: 18, barNum: 18, svgH: 60, margin: '4px 0', cost: 18, price: 20, narrow: 2.5, wide: 5.5 };
      else if (count === 2) sizes = { shop: 18, prod: 20, code: 15, barNum: 15, svgH: 50, margin: '3px 0', cost: 15, price: 17, narrow: 2.0, wide: 4.5 };
      else if (count === 3) sizes = { shop: 14, prod: 16, code: 12, barNum: 12, svgH: 42, margin: '2px 0', cost: 12, price: 14, narrow: 1.7, wide: 3.8 };
      else sizes = { shop: 11, prod: 12, code: 10, barNum: 10, svgH: 35, margin: '2px 0', cost: 10, price: 11, narrow: 1.4, wide: 3.2 };
    }
    sizes.count = count;
    return sizes;
  };

  const renderLabelBody = (
    item,
    { forPrint }
  ) => {
    const { shop, prod, code, barNum, svgH, margin, cost, price, count, narrow, wide } = getDynamicSizes();

    const fontWeightStyle = count === 1 ? '900' : (count === 2 ? '800' : undefined);

    const shopNameClass = forPrint
      ? 'barcode-shop-name block font-bold tracking-wider uppercase border-b border-dotted border-black w-full'
      : 'block font-bold tracking-wider uppercase w-full';

    const productNameClass = forPrint
      ? 'barcode-product-name block font-bold truncate w-full'
      : 'block font-bold truncate w-full text-black';

    const productCodeClass = forPrint
      ? 'barcode-product-code block font-medium'
      : 'block text-slate-500 font-medium';

    const barcodeNumberClass = forPrint
      ? 'barcode-number block font-semibold'
      : 'block font-semibold text-black';

    const costCodeClass = forPrint
      ? 'barcode-cost-code font-bold text-slate-500'
      : 'font-bold text-slate-500';

    const priceClass = forPrint
      ? 'barcode-price font-bold'
      : 'font-bold text-black';

    return (
      <>
        {showShopName && (
          <span
            className={shopNameClass}
            style={{ fontSize: `${shop}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
          >
            STN MOTORS
          </span>
        )}

        {showProductName && (
          <div className="w-full">
            <span
              className={productNameClass}
              style={{ fontSize: `${prod}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
            >
              {item.product_name}
            </span>

            {/* Hide product code on 30x20 labels — too small, wastes barcode space */}
            {layoutType !== 'roll_30x20' && (
              <span
                className={productCodeClass}
                style={{ fontSize: `${code}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
              >
                Code: {item.product_code}
              </span>
            )}
          </div>
        )}

        {showBarcode && (
          <div className="w-full flex flex-col items-center gap-0.5">
            <div
              className={
                forPrint
                  ? 'barcode-svg-container flex items-center justify-center w-full overflow-hidden'
                  : 'flex items-center justify-center overflow-hidden w-full'
              }
              style={{ height: `${svgH}px`, margin: margin }}
            >
              <Barcode39
                value={item.printBarcode}
                height={svgH}
                narrowWidth={narrow}
                wideWidth={wide}
              />
            </div>

            <span
              className={barcodeNumberClass}
              style={{ fontSize: `${barNum}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
            >
              {item.printBarcode}
            </span>
          </div>
        )}

        {(showPrice || showCostCode) && (
          <div
            className={
              forPrint
                ? 'barcode-bottom flex items-center justify-center gap-2 w-full'
                : 'flex items-center justify-center gap-2 w-full'
            }
          >
            {showCostCode && (
              <span
                className={costCodeClass}
                style={{ fontSize: `${cost}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
              >
                ({getCostCode(item.buying_price)})
              </span>
            )}

            {showPrice && (
              <span
                className={priceClass}
                style={{ fontSize: `${price}px`, fontWeight: fontWeightStyle, lineHeight: 1 }}
              >
                Rs. {parseFloat(item.selling_price).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </>
    );
  };

  // ==========================================================
  // RETURN
  // ==========================================================
  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          Barcode Generator & Label Printer
        </h1>

        <p className="text-xs text-slate-500 mt-1">
          Generate unique Code 39 barcodes for tractor parts,
          build queues, and print onto A4 sticker label sheets
          or thermal rolls.
        </p>
      </div>

      {/* =====================================================
          LOADING
      ====================================================== */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* =================================================
              LEFT SIDE
          ================================================== */}
          <div className="lg:col-span-5 space-y-4">

            {/* =================================================
                SELECT PRODUCTS
            ================================================== */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4">

              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                1. Select Products
              </h3>

              {/* PRODUCT SEARCH */}
              <div
                ref={dropdownRef}
                className="relative space-y-1"
              >

                <div className="relative">

                  <input
                    type="text"
                    value={searchVal}
                    onChange={(e) => {
                      setSearchVal(
                        e.target.value
                      );

                      setShowDropdown(
                        true
                      );
                    }}
                    onFocus={() =>
                      setShowDropdown(
                        true
                      )
                    }
                    placeholder="Search by name, code or barcode..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />

                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                </div>

                {showDropdown && (
                  <div className="absolute left-0 right-0 top-[40px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1.5 space-y-0.5">

                    {filteredProducts.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 py-3">
                        No active products match query.
                      </p>
                    ) : (
                      filteredProducts.map(
                        (prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() =>
                              handleAddToQueue(
                                prod,
                                1
                              )
                            }
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-300 font-semibold flex justify-between items-center"
                          >

                            <div>

                              <span className="block font-bold">
                                {
                                  prod.product_name
                                }
                              </span>

                              <span className="text-[9px] text-slate-400 font-mono">
                                Code:{' '}
                                {
                                  prod.product_code
                                }{' '}
                                | Barcode:{' '}
                                {
                                  prod.barcode ||
                                  'None'
                                }
                              </span>

                            </div>

                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                              Stock:{' '}
                              {parseFloat(
                                prod.stock_qty
                              )}
                            </span>

                          </button>
                        )
                      )
                    )}

                  </div>
                )}

              </div>

              {/* BULK ACTIONS */}
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-850">

                <button
                  onClick={() =>
                    handleAddAll(1)
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-350 transition-all text-center"
                >
                  Load All Items (1 each)
                </button>

                <button
                  onClick={() =>
                    handleAddAll(
                      'stock'
                    )
                  }
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-350 transition-all text-center"
                >
                  Load Stock Quantities
                </button>

              </div>

            </div>

            {/* =================================================
                PRINT QUEUE
            ================================================== */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4">

              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">

                <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                  2. Print Queue ({queue.length} items)
                </h3>

                {queue.length > 0 && (
                  <button
                    onClick={
                      handleClearQueue
                    }
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />

                    <span>
                      Clear Queue
                    </span>
                  </button>
                )}

              </div>

              {queue.length === 0 ? (

                <div className="text-center py-10 text-slate-400">

                  <LayoutGrid className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />

                  <p className="text-[11px] font-semibold">
                    Print list is currently empty.
                  </p>

                  <p className="text-[10px] text-slate-400/80 mt-0.5">
                    Search and select items above to add them to queue.
                  </p>

                </div>

              ) : (

                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">

                  {queue.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20"
                      >

                        <div className="flex-1 min-w-0">

                          <span className="block font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {
                              item.product_name
                            }
                          </span>

                          <span className="block text-[9px] font-mono text-slate-400 mt-0.5">

                            Code:{' '}
                            {
                              item.product_code
                            }{' '}

                            | Barcode:{' '}

                            {item.barcode ? (
                              item.barcode
                            ) : (
                              <span className="text-amber-500 font-sans font-bold flex items-center gap-0.5">

                                <AlertTriangle className="h-2.5 w-2.5" />

                                No Barcode
                                (Auto Code39)

                              </span>
                            )}

                          </span>

                        </div>

                        {/* QUANTITY */}
                        <div className="flex items-center gap-2 shrink-0">

                          <div className="w-16">

                            <input
                              type="number"
                              min="0"
                              value={
                                item.printQty
                              }
                              onChange={(e) =>
                                handleUpdateQty(
                                  item.id,
                                  e.target.value
                                )
                              }
                              className="w-full text-center px-2 py-1 text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:text-white"
                            />

                          </div>

                          <button
                            onClick={() =>
                              handleRemoveFromQueue(
                                item.id
                              )
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>

                      </div>
                    )
                  )}

                  {/* MISSING BARCODE */}
                  {queue.some(
                    (item) =>
                      !item.barcode
                  ) && (

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] text-amber-600 dark:text-amber-400 font-semibold space-y-2 leading-relaxed">

                      <p>
                        ⚠️ Some products in your queue do not have a barcode.
                        They will fallback to printing their Product Code.
                        Alternatively, you can auto-generate and save permanent
                        barcodes for them.
                      </p>

                      <button
                        onClick={
                          handleGenerateMissingBarcodes
                        }
                        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-1.5 font-bold text-[10px] text-white transition-all text-center shadow-md shadow-amber-500/10"
                      >
                        Generate & Save Barcodes for Missing Items
                      </button>

                    </div>

                  )}

                </div>

              )}

            </div>

          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================== */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">

              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                3. Label Format & Print Preview
              </h3>

              {totalLabelsCount > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Total: {totalLabelsCount} Labels
                </span>
              )}

            </div>

            {/* =================================================
                SETTINGS
            ================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">

              {/* LAYOUT */}
              <div className="space-y-3">

                <div className="space-y-1">

                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">
                    Label Template Sheet
                  </label>

                  <select
                    value={
                      layoutType
                    }
                    onChange={(e) =>
                      setLayoutType(
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white appearance-none"
                  >

                    <option value="roll_30x20">
                      Thermal Roll - 30mm x 20mm
                    </option>

                    <option value="a4_3x8">
                      A4 Sheet - 24 Labels (3 Columns x 8 Rows)
                    </option>

                    <option value="a4_4x10">
                      A4 Sheet - 40 Labels (4 Columns x 10 Rows)
                    </option>

                    <option value="roll_50x30">
                      Thermal Roll - 50mm x 30mm Labels
                    </option>

                    <option value="roll_38x25">
                      Thermal Roll - 38mm x 25mm Labels
                    </option>

                  </select>

                </div>

              </div>

              {/* DETAILS */}
              <div className="space-y-1.5">

                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">
                  Visible Details on Label
                </label>

                <div className="flex flex-col gap-2">

                  {/* SHOP NAME */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        showShopName
                      }
                      onChange={(e) =>
                        setShowShopName(
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-500"
                    />

                    <span>
                      Show Shop Name (STN MOTORS)
                    </span>

                  </label>

                  {/* PRODUCT */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        showProductName
                      }
                      onChange={(e) =>
                        setShowProductName(
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-500"
                    />

                    <span>
                      Show Product Name & Code
                    </span>

                  </label>

                  {/* BARCODE */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        showBarcode
                      }
                      onChange={(e) =>
                        setShowBarcode(
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-500"
                    />

                    <span>
                      Show Barcode
                    </span>

                  </label>

                  {/* PRICE */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer">

                    <input
                      type="checkbox"
                      checked={
                        showPrice
                      }
                      onChange={(e) =>
                        setShowPrice(
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-500"
                    />

                    <span>
                      Show Retail Price (Rs.)
                    </span>

                  </label>

                  {/* COST CODE */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer text-amber-600 dark:text-amber-400">

                    <input
                      type="checkbox"
                      checked={
                        showCostCode
                      }
                      onChange={(e) =>
                        setShowCostCode(
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-500"
                    />

                    <span className="font-bold">
                      Show Secret Cost Code (PLAYGROUND)
                    </span>

                  </label>

                </div>

              </div>

            </div>

            {/* =================================================
                LIVE PREVIEW
            ================================================== */}
            <div className="space-y-2">

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">

                <span>
                  Layout Preview{' '}

                  {totalLabelsCount >
                    40 &&
                    '(Preview limited to first 40 labels for performance)'}
                </span>

                <span>
                  {layoutType ===
                  'roll_30x20'
                    ? '30mm x 20mm Thermal Label'
                    : layoutType.includes(
                        'a4'
                      )
                    ? 'A4 portrait (Sticker Page)'
                    : 'Thermal printer roll'}
                </span>

              </div>

              {totalLabelsCount === 0 ? (

                <div className="h-[250px] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">

                  <LayoutGrid className="h-6 w-6 text-slate-350 dark:text-slate-750 mb-1" />

                  <p className="text-[10px] font-semibold">
                    Add products to see layout preview.
                  </p>

                </div>

              ) : (

                <div className="border border-slate-250/60 dark:border-slate-850 p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/40 overflow-y-auto max-h-[40vh] no-print">

                  <div
                    className={`grid ${getPreviewGridColsClass()}`}
                  >

                    {getPreviewItems().map(
                      (item, idx) => (

                        <div
                          key={idx}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-white text-black border border-slate-200 text-center font-mono leading-none ${getPreviewCardHeightStyle()}`}
                        >

                          {renderLabelBody(item, {
                            forPrint: false
                          })}

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

            {/* =================================================
                PRINT BUTTON
            ================================================== */}
            <div className="flex gap-4">

              <button
                type="button"
                onClick={
                  handlePrint
                }
                disabled={
                  totalLabelsCount ===
                  0
                }
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-350 dark:disabled:bg-slate-800 disabled:cursor-not-allowed py-3 font-bold text-xs text-white shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all"
              >

                <Printer className="h-4.5 w-4.5" />

                <span>
                  Print Barcodes / Save as PDF
                </span>

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          ACTUAL PRINT PORTAL
      ====================================================== */}
      {isPrinting &&
        printItems.length > 0 &&
        createPortal(

          <div className="print-only-barcode-sheet">

            {printItems.map(
              (item, idx) => (

                <div
                  key={idx}
                  className="print-barcode-card font-mono text-black leading-none"
                  style={{
                    fontSize:
                      layoutType ===
                      'roll_30x20'
                        ? '6px'
                        : '10px'
                  }}
                >

                  {renderLabelBody(item, {
                    forPrint: true
                  })}

                </div>

              )
            )}

          </div>,

          document.body
        )}

      {/* =====================================================
          ALERT
      ====================================================== */}
      <AlertPopup
        isOpen={
          alert.show
        }
        type={
          alert.type
        }
        message={
          alert.message
        }
        onClose={() =>
          setAlert({
            ...alert,
            show: false
          })
        }
      />

    </div>
  );
};

export default BarcodePrint;
