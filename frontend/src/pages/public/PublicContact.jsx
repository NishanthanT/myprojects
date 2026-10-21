import React from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { usePublicSettings } from '../../hooks/usePublicSettings.js';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';
import {publicContent} from '../../utils/publicTranslations.mjs';

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M16.6 5.82c-.7-.77-1.09-1.77-1.09-2.82h-3.09v13.44a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.78.12V10.9a5.68 5.68 0 0 0-.78-.06 5.69 5.69 0 1 0 5.69 5.69V9.4a8.36 8.36 0 0 0 4.89 1.57V7.88c-1.29 0-2.47-.44-3.41-1.18a4.98 4.98 0 0 1-.4-.88z" />
  </svg>
);

const PublicContact = () => {
  const {t,language}=usePublicLanguage();
  const { settings } = usePublicSettings();

  const contactCards = [
    settings?.shop_phone && { icon: Phone, label: 'Call Us', value: settings.shop_phone, href: `tel:${settings.shop_phone}`, color: 'text-emerald-500 bg-emerald-500/10' },
    settings?.whatsapp_number && { icon: MessageCircle, label: 'WhatsApp', value: settings.whatsapp_number, href: `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`, color: 'text-emerald-500 bg-emerald-500/10' },
    settings?.email && { icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}`, color: 'text-sky-500 bg-sky-500/10' },
    settings?.shop_address && { icon: MapPin, label: 'Visit Us', value: publicContent(settings,'shop_address',language), href: settings.google_maps_url || undefined, color: 'text-rose-500 bg-rose-500/10' }
  ].filter(Boolean);

  const socialLinks = [
    settings?.facebook_url && { icon: Facebook, label: 'Facebook', href: settings.facebook_url },
    settings?.instagram_url && { icon: Instagram, label: 'Instagram', href: settings.instagram_url },
    settings?.tiktok_url && { icon: TikTokIcon, label: 'TikTok', href: settings.tiktok_url }
  ].filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16 lg:py-20">
      <Reveal>
        <div className="public-page-intro max-w-3xl mx-auto text-center mb-8 sm:mb-12">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t('Contact Us')}</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 mt-3">{t("We'd love to hear from you — reach out any way that's convenient")}</p>
        </div>
      </Reveal>

      <div className={`grid gap-4 sm:gap-5 ${contactCards.length===1?'grid-cols-1 max-w-xl mx-auto':contactCards.length===3?'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3':'grid-cols-1 sm:grid-cols-2'}`}>
        {contactCards.map((c, i) => (
          <Reveal key={c.label} delay={i * 100} className={`h-full min-w-0 ${contactCards.length===3&&i===2?'sm:col-span-2 lg:col-span-1':''}`}>
            <TiltCard maxTilt={3} className="h-full">
              <a href={c.href} target={c.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 min-h-[140px] hover:border-amber-400 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-all duration-300 h-full">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs leading-relaxed font-bold text-slate-400 uppercase tracking-wide">{t(c.label)}</span>
                  <span className="block font-semibold text-slate-800 dark:text-slate-200 text-base leading-relaxed mt-1 break-words [overflow-wrap:anywhere]">{c.value}</span>
                </div>
              </a>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      {(socialLinks.length>0||settings?.google_maps_url)&&<div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6">
      {socialLinks.length > 0 && (
        <Reveal delay={200}>
          <div className="text-center sm:text-left">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('Follow Us')}</h3>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} aria-label={s.label} title={s.label} target="_blank" rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-white hover:bg-amber-500 transition-colors">
                  <s.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {settings?.google_maps_url && (
        <Reveal delay={300}>
          <div className="text-center">
            <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
              <MapPin className="h-4 w-4" /> {t('Get Directions')}
            </a>
          </div>
        </Reveal>
      )}
      </div>}
    </div>
  );
};

export default PublicContact;
