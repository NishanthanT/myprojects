import React from 'react';

// A bright yellow "bolt" sweeps across the letters, with an occasional
// double flicker — a lightning strike running through the wordmark.
const KEYFRAMES = `
@keyframes stn-bolt {
  0%   { background-position: 260% 0; }
  45%  { background-position: -60% 0; }
  100% { background-position: -60% 0; }
}
@keyframes stn-flash {
  0%, 66%, 100% { opacity: 0; }
  68%           { opacity: 0.85; }
  71%           { opacity: 0; }
  74%           { opacity: 1; }
  78%           { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .stn-wordmark, .stn-wordmark * { animation: none !important; }
  .stn-wordmark-flash { display: none !important; }
}
`;

const sweepStyle = {
  backgroundImage:
    'linear-gradient(100deg,' +
    '#f59e0b 0%, #f59e0b 34%,' +
    '#fbbf24 42%, #fde047 47%, #fffbeb 50%, #fde047 53%, #fbbf24 58%,' +
    '#f59e0b 66%, #f59e0b 100%)',
  backgroundSize: '260% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  animation: 'stn-bolt 3.6s cubic-bezier(0.7, 0, 0.3, 1) infinite'
};

const flashStyle = {
  color: '#fef9c3',
  textShadow: '0 0 12px rgba(253,224,71,0.9), 0 0 26px rgba(245,158,11,0.6)',
  animation: 'stn-flash 3.6s linear infinite'
};

const BrandWordmark = ({ name, className = '' }) => (
  <span className={`stn-wordmark relative inline-block ${className}`}>
    <style>{KEYFRAMES}</style>
    <span style={sweepStyle}>{name}</span>
    <span aria-hidden="true"
      className="stn-wordmark-flash pointer-events-none absolute inset-0 whitespace-nowrap"
      style={flashStyle}>
      {name}
    </span>
  </span>
);

export default BrandWordmark;
