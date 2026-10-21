import React from 'react';

const DARK = '#0b1220';
const VB_W = 214;
const VB_H = 152;
const ASPECT = VB_W / VB_H;

// Angled lugs around a tyre, the way real agricultural tread bars sit.
const treadLugs = (cx, cy, r, count, w, h) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    return (
      <rect
        key={i}
        x={cx - w / 2}
        y={cy - r - h * 0.18}
        width={w}
        height={h}
        rx={w * 0.35}
        transform={`rotate(${angle} ${cx} ${cy}) rotate(18 ${cx} ${cy - r})`}
      />
    );
  });

// The whole tractor is mirrored so it faces its direction of travel, which flips
// the visual sense of rotation — so the wheels are run in reverse to compensate.
const Wheel = ({ cx, cy, r, lugs, spin }) => {
  const rim = r * 0.56;
  const hub = r * 0.2;
  return (
    <g style={{
      transformBox: 'view-box',
      transformOrigin: `${cx}px ${cy}px`,
      animation: `stn-wheel ${spin}s linear infinite reverse`
    }}>
      {treadLugs(cx, cy, r, lugs, r * 0.2, r * 0.34)}
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.78} fill={DARK} opacity="0.55" />
      <circle cx={cx} cy={cy} r={rim} />
      <circle cx={cx} cy={cy} r={rim * 0.82} fill={DARK} opacity="0.45" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={cx - r * 0.045} y={cy - rim} width={r * 0.09} height={rim * 2}
          transform={`rotate(${i * 30} ${cx} ${cy})`} opacity="0.85" />
      ))}
      <circle cx={cx} cy={cy} r={hub} />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx={cx} cy={cy - hub * 1.9} r={hub * 0.22} fill={DARK} opacity="0.7"
          transform={`rotate(${i * 72} ${cx} ${cy})`} />
      ))}
    </g>
  );
};

const Tractor = ({ brand, wheelSpin }) => (
  <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-full overflow-visible" fill="currentColor" aria-hidden="true">
    {/* Mirrored so the tractor points right — the way it travels. */}
    <g transform={`translate(${VB_W},0) scale(-1,1)`}>
      {/* Chassis rail + front axle pivot */}
      <rect x="42" y="96" width="92" height="11" rx="3" />
      <path d="M38 96 h16 v6 h-4 l-2 10 h-4 l-2 -10 h-4 z" />

      {/* Engine hood */}
      <path d="M20 66 q0 -6 6 -6 h64 v38 h-70 z" />
      <rect x="30" y="70" width="26" height="3" rx="1.5" fill={DARK} opacity="0.45" />
      <rect x="30" y="76" width="26" height="3" rx="1.5" fill={DARK} opacity="0.45" />

      {/* Radiator grille */}
      <path d="M13 70 q0 -6 6 -6 h4 v34 h-4 q-6 0 -6 -6 z" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x="15" y={70 + i * 5.4} width="7" height="2.4" rx="1" fill={DARK} opacity="0.5" />
      ))}

      {/* Headlight */}
      <circle cx="26" cy="66" r="4.6" />
      <circle cx="26" cy="66" r="2.2" fill={DARK} opacity="0.55" />

      {/* Exhaust stack */}
      <rect x="80" y="26" width="7" height="36" rx="2.5" />
      <path d="M77 26 h13 v5 h-13 z" />

      {/* Fuel tank / dash + steering */}
      <path d="M90 52 h26 v46 h-26 z" />
      <rect x="112" y="44" width="5" height="16" rx="2" transform="rotate(16 114 52)" />
      <ellipse cx="120" cy="42" rx="11" ry="3.4" transform="rotate(-16 120 42)" />

      {/* Operator seat */}
      <path d="M126 56 h22 q4 0 4 4 v4 h-26 z" />
      <path d="M146 34 h8 q4 0 4 4 v20 h-12 z" />

      {/* ROPS safety frame */}
      <rect x="132" y="12" width="7" height="46" rx="2.5" />
      <rect x="176" y="12" width="7" height="52" rx="2.5" />
      <rect x="130" y="8" width="55" height="7" rx="3" />

      {/* Rear fender + lamp */}
      <path d="M112 100 a44 44 0 0 1 88 0 h-11 a33 33 0 0 0 -66 0 z" />
      <circle cx="196" cy="72" r="4" />

      {/* Wheels */}
      <Wheel cx={156} cy={100} r={45} lugs={16} spin={wheelSpin} />
      <Wheel cx={46} cy={112} r={28} lugs={12} spin={+(wheelSpin * 0.6).toFixed(2)} />
    </g>

    {/* Brand plate kept outside the mirror so the text reads normally */}
    <text x={VB_W - 55} y="90" textAnchor="middle" fontSize="11" fontWeight="800"
      fill={DARK} opacity="0.65" fontFamily="Poppins, Inter, sans-serif" letterSpacing="0.6">
      {brand}
    </text>
  </svg>
);

// Each tractor gets its own horizontal lane, sized in px so the lanes can never
// overlap each other no matter how the hero is sized. Nearer = bigger + faster.
const LANES = [
  { brand: 'MF',       height: 138, bottom: 6,   duration: 26, delay: 0,  opacity: 0.20, wheelSpin: 2.4 },
  { brand: 'TAFE',     height: 106, bottom: 152, duration: 34, delay: 7,  opacity: 0.14, wheelSpin: 3.2 },
  { brand: 'MAHINDRA', height: 82,  bottom: 266, duration: 44, delay: 3,  opacity: 0.09, wheelSpin: 4.1 },
  { brand: 'MF',       height: 62,  bottom: 356, duration: 56, delay: 16, opacity: 0.06, wheelSpin: 5.0 }
];

// Keyframes live with the component so it needs no global CSS/Tailwind config.
const KEYFRAMES = `
@keyframes stn-drive { from { transform: translateX(-34vw); } to { transform: translateX(134vw); } }
@keyframes stn-wheel { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .stn-tractor, .stn-tractor * { animation: none !important; }
}
`;

const TractorParade = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <style>{KEYFRAMES}</style>
    {LANES.map((t, i) => (
      <div
        key={i}
        className="stn-tractor absolute left-0 text-amber-400"
        style={{
          bottom: t.bottom,
          height: t.height,
          width: Math.round(t.height * ASPECT),
          opacity: t.opacity,
          animation: `stn-drive ${t.duration}s linear infinite`,
          animationDelay: `-${t.delay}s`
        }}
      >
        <Tractor brand={t.brand} wheelSpin={t.wheelSpin} />
      </div>
    ))}
  </div>
);

export default TractorParade;
