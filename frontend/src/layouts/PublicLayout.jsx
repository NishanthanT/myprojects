import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu, X, Phone, Facebook, Instagram, MapPin, Mail, Sun, Moon } from 'lucide-react';
import {useTheme} from '../context/ThemeContext.jsx';
import { usePublicSettings } from '../hooks/usePublicSettings.js';
import FloatingWhatsApp from '../components/FloatingWhatsApp.jsx';
import BrandWordmark from '../components/BrandWordmark.jsx';
import {publicNavItems} from '../utils/publicNavigation.mjs';
import {PublicLanguageProvider,usePublicLanguage} from '../context/PublicLanguageContext.jsx';
import {publicContent} from '../utils/publicTranslations.mjs';
import PublicPhonePopup from '../components/PublicPhonePopup.jsx';
import '../styles/publicStore.css';

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 5.82c-.7-.77-1.09-1.77-1.09-2.82h-3.09v13.44a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.78.12V10.9a5.68 5.68 0 0 0-.78-.06 5.69 5.69 0 1 0 5.69 5.69V9.4a8.36 8.36 0 0 0 4.89 1.57V7.88c-1.29 0-2.47-.44-3.41-1.18a4.98 4.98 0 0 1-.4-.88z" />
  </svg>
);

const PublicLayout = () => {
  return <PublicLanguageProvider><PublicLayoutContent/></PublicLanguageProvider>;
};
const PublicLayoutContent = () => {
  const {language,setLanguage,t}=usePublicLanguage();
  const {theme,toggleTheme}=useTheme();
  const { settings } = usePublicSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPhone,setShowPhone]=useState(false);
  const [compactNav,setCompactNav]=useState(true);
  const barRef=useRef(null),brandRef=useRef(null),navRef=useRef(null),controlsRef=useRef(null),menuRef=useRef(null);

  const shopName = settings?.shop_name || 'STN MOTORS';
  const tagline = t(publicContent(settings,'shop_tagline',language)||'Tractors & Oils');

  const navItems = useMemo(() => publicNavItems(settings?.nav_config,language), [settings?.nav_config,language]);
  useLayoutEffect(()=>{
    const measure=()=>{
      const bar=barRef.current,nav=navRef.current,controls=controlsRef.current;
      if(!bar||!nav||!controls)return;
      const barStyle=getComputedStyle(bar),controlStyle=getComputedStyle(controls);
      const available=bar.clientWidth-parseFloat(barStyle.paddingLeft)-parseFloat(barStyle.paddingRight);
      const links=[...nav.children];
      const menuWidth=links.reduce((sum,link)=>sum+link.getBoundingClientRect().width,0)+Math.max(0,links.length-1)*4;
      const toggleWidth=menuRef.current?.getBoundingClientRect().width||0;
      const controlsWidth=controls.getBoundingClientRect().width-(toggleWidth?toggleWidth+parseFloat(controlStyle.columnGap||0):0);
      const needed=brandRef.current.getBoundingClientRect().width+menuWidth+controlsWidth+2*parseFloat(barStyle.columnGap||0)+12;
      setCompactNav(available<needed||window.innerWidth<1024);
    };
    const observer=new ResizeObserver(measure);
    [barRef.current,brandRef.current,navRef.current,controlsRef.current].forEach(el=>el&&observer.observe(el));
    let cancelled=false;
    document.fonts?.ready.then(()=>{if(!cancelled)measure();});
    measure();
    return ()=>{cancelled=true;observer.disconnect();};
  },[navItems,theme,compactNav]);

  const navLinkCls = ({ isActive }) =>
    `public-nav-link shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div lang={language} className="public-store min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top horizontal navbar */}
      <header className="public-navbar sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div ref={barRef} className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 lg:gap-4">
          <Link ref={brandRef} to="/shop" className="public-nav-brand flex items-center gap-2.5 shrink-0 max-w-[260px]">
            {settings?.logo ? (
              <img src={settings.logo} alt={shopName} className="h-10 w-10 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-md shadow-amber-500/25">
                {shopName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-xl md:text-2xl leading-tight tracking-tight">
                <BrandWordmark name={shopName} />
              </h1>
              <p title={tagline} className="truncate text-[11px] md:text-xs text-amber-500 font-bold uppercase tracking-wider">{tagline}</p>
            </div>
          </Link>

          <nav ref={navRef} aria-hidden={compactNav?true:undefined} inert={compactNav?'':undefined} className={`flex flex-nowrap justify-center items-center gap-1 ${compactNav?'absolute invisible pointer-events-none w-max max-w-full h-0 overflow-hidden':'flex-1 min-w-0'}`}>
            {navItems.map(item => item.external ? (
              <a key={item.key} href={item.to} target="_blank" rel="noopener noreferrer" className={navLinkCls({ isActive: false })}>
                {item.label}
              </a>
            ) : (
              <NavLink key={item.key || item.to} to={item.to} end={item.end} className={navLinkCls}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div ref={controlsRef} className="public-nav-controls ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
          <button type="button" onClick={toggleTheme} aria-label={t(theme==='dark'?'Light Mode':'Dark Mode')} title={t(theme==='dark'?'Light Mode':'Dark Mode')} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 hover:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            {theme==='dark'?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}
          </button>
          <div className="hidden lg:flex items-center">
            {settings?.shop_phone && (
              <button type="button" onClick={()=>setShowPhone(true)} aria-haspopup="dialog"
                className="flex items-center gap-2 rounded-full bg-slate-900 dark:bg-amber-500 text-white px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity">
                <Phone className="h-3.5 w-3.5" /> {settings.shop_phone}
              </button>
            )}
          </div>

          <label className="shrink-0"><span className="sr-only">{t('Website language')}</span><select aria-label={t('Website language')} value={language} onChange={event=>setLanguage(event.target.value)} className="rounded-full border border-amber-500/40 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"><option value="en" lang="en">English</option><option value="ta" lang="ta">தமிழ்</option><option value="si" lang="si">සිංහල</option></select></label>
          <button ref={menuRef} aria-label={t(mobileOpen?'Close menu':'Open menu')} aria-expanded={mobileOpen} aria-controls="public-mobile-menu" onClick={() => setMobileOpen(v => !v)}
            className={`${compactNav?'':'hidden'} p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && compactNav && (
          <nav id="public-mobile-menu" className="public-mobile-nav border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-col gap-1 bg-white dark:bg-slate-900">
            {navItems.map(item => item.external ? (
              <a key={item.key} href={item.to} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className={navLinkCls({ isActive: false })}>
                {item.label}
              </a>
            ) : (
              <NavLink key={item.key || item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={navLinkCls}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="public-content-stage relative flex-1">
        <div aria-hidden="true" className="public-content-backdrop"><span/><span/><span/><span/></div>
        <div className="public-content-pages relative"><Outlet /></div>
      </main>

      {/* Footer */}
      <footer className="public-footer relative overflow-hidden bg-slate-900 text-slate-300 mt-16">
        <div aria-hidden="true" className="public-footer-glow"><span/><span/><span/></div>
        <div className="relative max-w-6xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {settings?.logo && <img src={settings.logo} alt={shopName} className="h-8 w-8 rounded-lg object-cover" />}
              <h3 className="text-white font-display font-bold text-lg">{shopName}</h3>
            </div>
            <p className="text-sm text-slate-400">{tagline}</p>
            {settings?.shop_address && (
              <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {publicContent(settings,'shop_address',language)}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">{t('Quick Links')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              {navItems.map(item => item.external ? (
                <a key={item.key} href={item.to} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-400 transition-colors">
                  {item.label}
                </a>
              ) : (
                <Link key={item.key || item.to} to={item.to} className="text-slate-400 hover:text-amber-400 transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">{t('Get in Touch')}</h4>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              {settings?.shop_phone && (
                <a href={`tel:${settings.shop_phone}`} className="flex items-center gap-2 hover:text-amber-400 transition-colors">
                  <Phone className="h-3.5 w-3.5" /> {settings.shop_phone}
                </a>
              )}
              {settings?.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-amber-400 transition-colors">
                  <Mail className="h-3.5 w-3.5" /> {settings.email}
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mt-4">
              {settings?.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-amber-500 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings?.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-amber-500 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings?.tiktok_url && (
                <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-amber-500 transition-colors">
                  <TikTokIcon className="h-4 w-4" />
                </a>
              )}
              {settings?.whatsapp_number && (
                <a href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-emerald-500 transition-colors">
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="relative border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {shopName}. {t('All rights reserved.')}
        </div>
      </footer>

      <FloatingWhatsApp number={settings?.whatsapp_number} />
      {showPhone&&settings?.shop_phone&&<PublicPhonePopup number={settings.shop_phone} shopName={shopName} onClose={()=>setShowPhone(false)}/>}
    </div>
  );
};

export default PublicLayout;
