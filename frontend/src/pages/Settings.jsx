import React, { useState, useEffect, useRef } from 'react';
import { Save, MessageSquare, Printer, Store, ImagePlus, Trash2, Camera } from 'lucide-react';
import { useShop } from '../context/ShopContext.jsx';
import AlertPopup from '../components/AlertPopup.jsx';

const Settings = () => {
  const { shopInfo, updateShopInfo, resetLogo } = useShop();
  const [shopName, setShopName] = useState(shopInfo.shopName || 'STN MOTORS');
  const [shopTagline, setShopTagline] = useState(shopInfo.shopTagline || 'Tractors & Oils');
  const [shopPhone, setShopPhone] = useState(shopInfo.shopPhone || '0771234567');
  const [shopAddress, setShopAddress] = useState(shopInfo.shopAddress || 'Main Street, Sithankeny');
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [logoPreview, setLogoPreview] = useState(shopInfo.logo || null);
  const [alert, setAlert] = useState({ show: false, type: 'success', message: '' });
  const fileInputRef = useRef(null);

  const triggerAlert = (type, message) => setAlert({ show: true, type, message });

  useEffect(() => {
    const fetchSms = async () => {
      try {
        const res = await fetch('/api/sms/settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          setSmsEnabled(data.settings.enabled);
        }
      } catch (e) {}
    };
    fetchSms();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      triggerAlert('error', 'Please upload a valid image file (JPG, PNG, SVG).');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      triggerAlert('error', 'Logo file must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    resetLogo();
    if (fileInputRef.current) fileInputRef.current.value = '';
    triggerAlert('success', 'Logo removed. Default icon will be used.');
  };

  const handleSave = async () => {
    // Save to ShopContext (persists in localStorage)
    updateShopInfo({
      shopName,
      shopTagline,
      shopPhone,
      shopAddress,
      logo: logoPreview
    });

    // Also try saving SMS settings to backend
    try {
      await fetch('/api/sms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ enabled: smsEnabled, shopName })
      });
    } catch (e) {}

    triggerAlert('success', 'All settings saved successfully! Logo and shop info updated.');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure shop logo, details, SMS alerts, and printing preferences.</p>
      </div>

      {/* Logo Upload Section */}
      <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Camera className="h-4 w-4 text-rose-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Shop Logo</h3>
        </div>

        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-all">
              {logoPreview ? (
                <img src={logoPreview} alt="Shop Logo" className="h-full w-full object-cover rounded-2xl" />
              ) : (
                <div className="text-center">
                  <ImagePlus className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <span className="text-[9px] text-slate-400 mt-1 block">No Logo</span>
                </div>
              )}
            </div>
            {logoPreview && (
              <button
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove Logo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload your shop logo. It will appear in the <strong className="text-slate-800 dark:text-white">sidebar</strong>, <strong className="text-slate-800 dark:text-white">login page</strong>, and <strong className="text-slate-800 dark:text-white">printed receipts</strong>.
            </p>
            <p className="text-[10px] text-slate-400">Accepted: JPG, PNG, SVG • Max size: 2MB • Best size: 200×200px</p>
            <div className="flex gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-[11px] font-bold text-white shadow-lg shadow-amber-500/20 transition-all"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
              </label>
              {logoPreview && (
                <button
                  onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/30 px-4 py-2 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shop Info */}
      <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Store className="h-4 w-4 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Shop Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Shop Name</label>
            <input value={shopName} onChange={e => setShopName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tagline / Subtitle</label>
            <input value={shopTagline} onChange={e => setShopTagline(e.target.value)} placeholder="e.g. Tractors & Oils"
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
          <input value={shopPhone} onChange={e => setShopPhone(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
          <textarea value={shopAddress} onChange={e => setShopAddress(e.target.value)} rows="2"
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-white" />
        </div>
      </div>

      {/* SMS Toggle */}
      <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <MessageSquare className="h-4 w-4 text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">SMS Notification System</h3>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Enable SMS Alerts</span>
            <span className="text-[10px] text-slate-400">Sends SMS for offers, bills, and low stock alerts. Extra cost applies.</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={smsEnabled} onChange={e => setSmsEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
        <div className={`rounded-xl p-3 text-xs font-semibold border ${smsEnabled ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          {smsEnabled ? '✅ SMS alerts are ACTIVE. Customers will receive messages.' : '⛔ SMS alerts are OFF. No messages will be sent.'}
        </div>
      </div>

      {/* Printing */}
      <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Printer className="h-4 w-4 text-emerald-500" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Thermal Printer Configuration</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          This POS system prints receipts using the browser's native print window. Make sure your thermal printer is configured as the default printer in Windows (80mm paper). Click "Print Receipt" in the POS billing screen to trigger printing.
        </p>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500 font-mono">
          Recommended: 80mm Thermal Printer | Paper: Continuous Roll
        </div>
      </div>

      <button onClick={handleSave}
        className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition-all">
        <Save className="h-4 w-4" />
        <span>Save All Settings</span>
      </button>

      <AlertPopup isOpen={alert.show} type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />
    </div>
  );
};

export default Settings;
