import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Clock, ArrowRight, Wrench } from 'lucide-react';
import { usePublicSettings } from '../../hooks/usePublicSettings.js';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';
import {publicContent} from '../../utils/publicTranslations.mjs';

const PublicAbout = () => {
  const {t,language}=usePublicLanguage();
  const { settings } = usePublicSettings();
  const shopName = settings?.shop_name || 'STN MOTORS';

  return (
    <div className="max-w-4xl mx-auto px-5 py-16">
      <Reveal>
        <div className="public-page-intro text-center mb-10">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">{t('About {shop}',{shop:shopName})}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t(publicContent(settings,'shop_tagline',language)||'Tractors & Oils')}</p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(publicContent(settings,'about_text',language)||'We are committed to keeping your machines running strong with quality parts and honest service.')}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 text-amber-800 dark:text-amber-300">
            <Wrench className="h-5 w-5 shrink-0" aria-hidden="true"/>
            <p className="text-sm font-semibold leading-relaxed">{t('We also provide tractor repair services.')}</p>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        {[
          { icon: ShieldCheck, title: 'Trusted Quality', desc: 'Genuine parts sourced from reliable manufacturers.' },
          { icon: Users, title: 'Community Focused', desc: 'Serving farmers and workshops with honest advice.' },
          { icon: Clock, title: 'Always Ready', desc: 'Fast service so your machines stay in the field.' }
        ].map((v, i) => (
          <Reveal key={v.title} delay={i * 120}>
            <TiltCard className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center h-full shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto mb-3">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 dark:text-white mb-1">{t(v.title)}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(v.desc)}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <div className="text-center mt-12">
          <Link to="/shop/contact"
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105">
            {t('Get in Touch')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
};

export default PublicAbout;
