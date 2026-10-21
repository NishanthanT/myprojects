import PublicPhotoViewer from '../../components/PublicPhotoViewer.jsx';
import PublicOverlay from '../../components/PublicOverlay.jsx';
import React, { useEffect, useState } from 'react';
import { Tag, Percent, Calendar, PlayCircle, X, ChevronLeft, ChevronRight, Sparkles, Flame } from 'lucide-react';
import Reveal from '../../components/Reveal.jsx';
import TiltCard from '../../components/TiltCard.jsx';
import {usePublicLanguage} from '../../context/PublicLanguageContext.jsx';

const toEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    return null; // Facebook/TikTok/Instagram links: shown as a "Watch Video" link instead of embed
  } catch {
    return null;
  }
};

const daysLeft = (endDate) => {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
};

const PublicOffers = () => {
  const {t,date}=usePublicLanguage();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // { images, index }

  useEffect(() => {
    fetch('/api/public/offers').then(r => r.json()).then(d => { if (d.success) setOffers(d.offers); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openLightbox = (images, index) => setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const showPrev = () => setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length }));
  const showNext = () => setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.images.length }));

  // One offer sits centred and larger; two or more flow into a 2-column grid
  // (so 4 offers read as 2 on top, 2 below).
  const isSingle = offers.length === 1;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <Reveal>
        <div className="public-page-intro text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> {t('Limited Time')}
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-4">{t('Current Offers')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('Special discounts and promotions running right now')}</p>
        </div>
      </Reveal>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">{t('Loading offers...')}</div>
      ) : offers.length === 0 ? (
        <Reveal>
          <div className="text-center py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700 mb-4">
              <Tag className="h-8 w-8" />
            </div>
            <p className="text-slate-400 text-sm">{t('No active offers right now — check back soon!')}</p>
          </div>
        </Reveal>
      ) : (
        <div className={isSingle ? 'max-w-2xl mx-auto' : 'grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8'}>
          {offers.map((off, i) => {
            const embed = toEmbedUrl(off.video_url);
            const images = off.images || [];
            const isPercent = off.offer_type === 'Percentage';
            const discountText = isPercent
              ? `${parseFloat(off.discount_value)}%`
              : `Rs. ${parseFloat(off.discount_value)}`;
            const remaining = daysLeft(off.end_date);

            return (
              <Reveal key={off.id} delay={i * 100}>
                <TiltCard maxTilt={4} className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden hover:shadow-2xl hover:border-amber-400/60 transition-all duration-300 h-full flex flex-col">

                  {/* Media: hero image, video embed, or a designed fallback */}
                  <div className="relative">
                    {images.length > 0 ? (
                      <button type="button" onClick={() => openLightbox(images, 0)}
                        className={`relative block w-full overflow-hidden cursor-zoom-in ${isSingle ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                        <img src={images[0]} alt={off.offer_name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                        {images.length > 1 && (
                          <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1">
                            +{t('{count} more',{count:images.length-1})}
                          </span>
                        )}
                      </button>
                    ) : !embed && (
                      <div className={`relative w-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center ${isSingle ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                        <div className="text-center text-white">
                          <span className="block font-display text-5xl font-extrabold drop-shadow-lg">{discountText}</span>
                          <span className="block text-sm font-bold uppercase tracking-[0.2em] mt-1 opacity-90">{t('Off')}</span>
                        </div>
                      </div>
                    )}

                    {embed && (
                      <div className="aspect-video w-full bg-slate-950">
                        <iframe src={embed} title={off.offer_name} className="w-full h-full" allowFullScreen />
                      </div>
                    )}

                    {/* Discount badge */}
                    {(images.length > 0 || embed) && (
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3.5 py-1.5 shadow-lg shadow-amber-500/30">
                        {isPercent ? <Percent className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
                        <span className="font-display font-extrabold text-sm">{discountText} {t('OFF')}</span>
                      </div>
                    )}

                    {/* Urgency pill */}
                    {remaining >= 0 && remaining <= 7 && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-rose-500 text-white px-2.5 py-1 shadow-lg shadow-rose-500/30">
                        <Flame className="h-3 w-3" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wide">
                          {remaining === 0 ? t('Last day') : t('{count} days left',{count:remaining})}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Video link fallback for non-embeddable platforms */}
                  {!embed && off.video_url && (
                    <a href={off.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 justify-center py-3 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
                      <PlayCircle className="h-4 w-4" /> {t('Watch Video')}
                    </a>
                  )}

                  {/* Body */}
                  <div className={`flex-1 flex flex-col ${isSingle ? 'p-7' : 'p-6'}`}>
                    <h3 className={`font-display font-extrabold text-slate-900 dark:text-white leading-tight ${isSingle ? 'text-2xl' : 'text-lg'}`}>
                      {off.offer_name}
                    </h3>

                    <span className={`inline-block w-fit mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-1 ${isSingle ? 'text-base' : 'text-sm'}`}>
                      {discountText} {t('Off')}
                    </span>

                    {off.description && (
                      <p className={`text-slate-500 dark:text-slate-400 mt-4 leading-relaxed ${isSingle ? 'text-base' : 'text-sm'}`}>
                        {off.description}
                      </p>
                    )}

                    {/* Thumbnail strip for extra photos */}
                    {images.length > 1 && (
                      <div className="flex gap-2 mt-4">
                        {images.slice(1, isSingle ? 5 : 4).map((img, idx) => (
                          <button key={idx} type="button" onClick={() => openLightbox(images, idx + 1)}
                            className="relative h-14 w-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-colors cursor-zoom-in">
                            <img src={img} alt={`${off.offer_name} ${idx + 2}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-5">
                      <div className="flex items-center gap-1.5 pt-4 text-xs text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-800/60">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t('Valid till')} {date(off.end_date)}</span>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox */}
      {lightbox && <PublicPhotoViewer images={lightbox.images} index={lightbox.index} onClose={closeLightbox} onPrevious={showPrev} onNext={showNext}/>}
    </div>
  );
};

export default PublicOffers;
