import React from 'react';
import {usePublicLanguage} from '../context/PublicLanguageContext.jsx';

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.38A9.94 9.94 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.13c-1.6 0-3.15-.43-4.5-1.24l-.32-.19-3.11.82.83-3.03-.21-.31A8.1 8.1 0 0 1 3.9 12c0-4.5 3.66-8.16 8.14-8.16 4.48 0 8.14 3.66 8.14 8.16 0 4.5-3.66 8.13-8.14 8.13zm4.47-6.1c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z" />
  </svg>
);

const FloatingWhatsApp = ({ number }) => {
  const {t}=usePublicLanguage();
  if (!number) return null;
  const clean = number.replace(/\D/g, '');

  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      title={t('Chat with us on WhatsApp')}
      aria-label={t('Chat with us on WhatsApp')}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 hover:scale-110 hover:bg-emerald-600 transition-all duration-300"
    >
      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
      <WhatsAppIcon className="h-7 w-7 relative animate-blink" />
    </a>
  );
};

export default FloatingWhatsApp;
