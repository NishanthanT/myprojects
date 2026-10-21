import React from 'react';

// A handful of thin amber light beams that streak vertically down a dark section, looping.
const BEAMS = [
  { left: '8%', delay: '0s', duration: '3.2s', width: '2px' },
  { left: '22%', delay: '1.1s', duration: '4s', width: '1px' },
  { left: '48%', delay: '2s', duration: '3.6s', width: '2px' },
  { left: '68%', delay: '0.6s', duration: '4.4s', width: '1px' },
  { left: '88%', delay: '1.7s', duration: '3s', width: '2px' }
];

const LightningBeams = ({ className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    {BEAMS.map((b, i) => (
      <span
        key={i}
        className="absolute top-0 h-full animate-lightning"
        style={{
          left: b.left,
          width: b.width,
          animationDelay: b.delay,
          animationDuration: b.duration,
          background: 'linear-gradient(to bottom, transparent, rgba(245,158,11,0.9), transparent)',
          boxShadow: '0 0 12px 1px rgba(245,158,11,0.6)'
        }}
      />
    ))}
  </div>
);

export default LightningBeams;
