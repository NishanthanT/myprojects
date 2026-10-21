import React, { useRef, useState } from 'react';

// Wraps children in a card that tilts in 3D toward the cursor, with a soft light-glare sweep.
const TiltCard = ({ children, className = '', maxTilt = 10 }) => {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - py) * maxTilt * 2;
    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
    setGlare({ x: px * 100, y: py * 100, opacity: 0.15 });
  };

  const handleMouseLeave = () => {
    setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
    setGlare(g => ({ ...g, opacity: 0 }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, transition: 'transform 0.15s ease-out', transformStyle: 'preserve-3d', willChange: 'transform' }}
      className={`relative ${className}`}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-150"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, white, transparent 60%)`
        }}
      />
    </div>
  );
};

export default TiltCard;
