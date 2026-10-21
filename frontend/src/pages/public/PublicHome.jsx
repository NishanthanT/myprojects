import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wrench, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { usePublicSettings } from '../../hooks/usePublicSettings.js';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import LightningBeams from '../../components/LightningBeams.jsx';
import TractorParade from '../../components/TractorParade.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';

const DEFAULT_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f1f5f9"/>
  <path d="M60 130 L60 80 L100 55 L140 80 L140 130 L100 155 Z" fill="none" stroke="#cbd5e1" stroke-width="4"/>
  <path d="M60 80 L100 105 L140 80 M100 105 L100 155" fill="none" stroke="#cbd5e1" stroke-width="4"/>
</svg>`);

const PublicHome = () => {
  const {t}=usePublicLanguage();
  const { settings } = usePublicSettings();
  const [featured, setFeatured] = useState([]);
  const [offerCount, setOfferCount] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/api/public/products').then(r => r.json()).then(d => { if (d.success) setFeatured(d.products.slice(0, 6)); }).catch(() => {});
    fetch('/api/public/offers').then(r => r.json()).then(d => { if (d.success) setOfferCount(d.offers.length); }).catch(() => {});
  }, []);

  const shopName = settings?.shop_name || 'STN MOTORS';

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setParallax({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 30,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 30
    });
  };

  return (
    <div>
      {/* Hero */}
      <section onMouseMove={handleHeroMouseMove} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, #f59e0b 0, transparent 40%), radial-gradient(circle at 80% 60%, #f59e0b 0, transparent 35%)'
        }} />
        <div className="absolute -right-10 top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl animate-float transition-transform duration-500 ease-out"
          style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }} />
        <div className="absolute left-10 bottom-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl animate-float transition-transform duration-500 ease-out"
          style={{ animationDelay: '1.5s', transform: `translate(${-parallax.x}px, ${-parallax.y}px)` }} />
        <LightningBeams />
        <TractorParade />

        <div className="relative max-w-6xl mx-auto px-5 py-24 md:py-32 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" /> {t('Genuine Parts · Honest Service')}
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight [text-shadow:0_4px_30px_rgba(245,158,11,0.25)]">
              {t('Keep Your Tractor')} <span className="text-amber-400">{t('Running Strong')}</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 max-w-xl mx-auto text-slate-300 text-sm md:text-base">
              {t('{shop} supplies genuine spare parts, engine oils, and greases for every tractor and vehicle model — trusted by workshops and farmers alike.',{shop:shopName})}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/shop/products"
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105">
                {t('Browse Products')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shop/offers"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105">
                {t('View Offers')} {offerCount > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px]">{offerCount}</span>}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-5 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ShieldCheck, title: 'Genuine Parts', desc: 'Every part sourced from trusted manufacturers — no compromises on quality.' },
          { icon: Truck, title: 'Wide Compatibility', desc: 'Parts for every major tractor type and model, always in stock.' },
          { icon: Wrench, title: 'Expert Advice', desc: 'Our team helps you find the exact part your machine needs.' }
        ].map((f, i) => (
          <Reveal key={f.title} delay={i * 120}>
            <TiltCard className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-full shadow-sm hover:shadow-2xl transition-shadow duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white mb-1.5">{t(f.title)}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t(f.desc)}</p>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 py-16">
          <Reveal>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t('Featured Products')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("A sample of what's in our catalog")}</p>
              </div>
              <Link to="/shop/products" className="text-sm font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1">
                {t('View all')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <TiltCard className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-amber-400 hover:shadow-xl transition-all duration-300 h-full">
                  <div className="w-full aspect-square bg-slate-50 dark:bg-slate-950">
                    <img src={p.images?.[0] || DEFAULT_IMAGE} alt={p.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.product_name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{p.product_code}</p>
                    {p.selling_price != null && (
                      <p className="text-amber-600 dark:text-amber-400 font-bold text-sm mt-2">Rs. {parseFloat(p.selling_price).toFixed(2)}</p>
                    )}
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA strip */}
      <Reveal>
        <section className="max-w-6xl mx-auto px-5 pb-20">
          <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-12 text-center shadow-xl shadow-amber-500/20">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white">{t('Need a part today?')}</h2>
            <p className="text-amber-50 mt-2 text-sm">{t("Visit us or reach out — we're happy to help you find the right fit.")}</p>
            <Link to="/shop/contact"
              className="inline-flex items-center gap-2 mt-6 rounded-full bg-white text-amber-600 px-6 py-3 text-sm font-bold hover:scale-105 transition-transform">
              {t('Contact Us')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
};

export default PublicHome;
