import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { GarmentCategory, GarmentSize, Product, ProductColorway } from '../types';
import { SmartGarmentImage } from './SmartGarmentImage';

interface CollectionRailSectionProps {
  id: string;
  indexLabel: string;
  eyebrow: string;
  titleLead: string;
  titleMuted: string;
  editorialNote: string;
  category: GarmentCategory;
  products: Product[];
  recommendedSize: GarmentSize;
  activeTryOnId?: string;
  onInspectSuspended: (product: Product, colorway: ProductColorway, indexInCollection: number) => void;
  onTryOn: (product: Product, colorway: ProductColorway) => void;
  onAddToCart: (product: Product, size: GarmentSize, colorway: ProductColorway) => void;
}

export const CollectionRailSection: React.FC<CollectionRailSectionProps> = ({
  id,
  indexLabel,
  eyebrow,
  titleLead,
  titleMuted,
  editorialNote,
  category,
  products,
  activeTryOnId,
  onInspectSuspended,
  onTryOn,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(Math.min(4, Math.floor(products.length / 2)));
  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({});
  const [stageWidth, setStageWidth] = useState<number>(1240);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startIdx: number }>({
    active: false,
    startX: 0,
    startIdx: 0,
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth || 1240);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activeProduct = products[activeIndex] || products[0];
  const activeColorIdx = selectedColors[activeProduct.id] ?? 0;
  const activeColor = activeProduct.colorways[activeColorIdx] || activeProduct.colorways[0];

  // Catenary curve parameters matching the curved steel rail SVG (viewBox 0 0 1200 120)
  // SVG Quadratic curve: M 0 22 Q 600 102 1200 22
  // At xNorm in [0..1]: y(t) = (1-t)^2 * 22 + 2(1-t)t * 102 + t^2 * 22 = 22 + 160 * t * (1 - t)
  // So center sag = 40px at t=0.5 (total y = 62px at center, 22px at edges)
  const railHeight = 110;
  const getRailYAtX = (xPx: number): number => {
    const t = Math.max(0, Math.min(1, xPx / Math.max(stageWidth, 1)));
    const ySvg = 22 + 160 * t * (1 - t);
    return (ySvg / 120) * railHeight;
  };

  const getRailSlopeDegAtX = (xPx: number): number => {
    const t = Math.max(0, Math.min(1, xPx / Math.max(stageWidth, 1)));
    // Derivative of 160*t*(1-t) is 160*(1 - 2t)
    const dyDx = (160 * (1 - 2 * t)) / 1200;
    return Math.atan(dyDx) * (180 / Math.PI) * 0.85;
  };

  // Dynamic responsive spacing: tight sideways packing + wide breathing gap around active garment
  const isCompact = stageWidth < 760;
  const sideStep = isCompact ? 56 : Math.min(82, Math.max(62, stageWidth * 0.064));
  const activeGap = isCompact ? 116 : Math.min(176, Math.max(134, stageWidth * 0.135));

  // Compute each garment's horizontal position centered smoothly around the active garment
  const computeItemX = (idx: number): number => {
    const centerX = stageWidth * 0.5;
    // Slight natural drift so item 0 sits slightly left-of-center and item 9 slightly right-of-center like a real physical rack
    const naturalShift = ((activeIndex - (products.length - 1) / 2) / products.length) * (isCompact ? 30 : 95);
    const anchorCenter = centerX + naturalShift;

    const delta = idx - activeIndex;
    if (delta === 0) return anchorCenter;
    const sign = Math.sign(delta);
    const absD = Math.abs(delta);
    return anchorCenter + sign * (activeGap + (absD - 1) * sideStep);
  };

  // Drag / scrub across the rail smoothly
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { active: true, startX: e.clientX, startIdx: activeIndex };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const stepDelta = Math.round(-dx / 64);
    const nextIdx = Math.max(0, Math.min(products.length - 1, dragRef.current.startIdx + stepDelta));
    if (nextIdx !== activeIndex) {
      setActiveIndex(nextIdx);
    }
  };

  const handleStagePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (products.length - 1));
    setActiveIndex(idx);
  };

  const progressPct = products.length > 1 ? (activeIndex / (products.length - 1)) * 100 : 0;
  const isPants = category === 'pants';

  return (
    <section id={id} className="rail-section">
      {/* Minimalist Editorial Header matching the Reel */}
      <div className="rail-header">
        <div className="rail-eyebrow">
          <span className="rail-idx">{indexLabel}</span>
          <span className="rail-eyebrow-sep">|</span>
          <span>{eyebrow}</span>
        </div>
        <h2 className="rail-headline">
          <span className="rail-headline-lead">{titleLead}</span>{' '}
          <span className="rail-headline-muted">{titleMuted}</span>
        </h2>
      </div>

      {/* Interactive Curved Steel Hanging Rail Stage */}
      <div
        ref={stageRef}
        className="rail-stage"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerLeave={handleStagePointerUp}
      >
        {/* Subtle studio spotlight behind the currently unfolded garment */}
        <div
          className="rail-spotlight"
          style={{
            left: `${computeItemX(activeIndex)}px`,
            background: `radial-gradient(circle, ${activeColor.glowHex}32 0%, rgba(132, 41, 239, 0.12) 45%, transparent 72%)`,
          }}
        />

        {/* Curved Metallic Catenary Rail SVG */}
        <svg
          className="rail-bar-svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`steel-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#353642" />
              <stop offset="22%" stopColor="#8d90a4" />
              <stop offset="50%" stopColor="#d8daf0" />
              <stop offset="78%" stopColor="#8d90a4" />
              <stop offset="100%" stopColor="#353642" />
            </linearGradient>
            <filter id={`rail-shadow-${id}`} x="-5%" y="-20%" width="110%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>
          {/* Main brushed steel rod */}
          <path
            d="M 0 22 Q 600 102 1200 22"
            fill="none"
            stroke={`url(#steel-${id})`}
            strokeWidth="5.5"
            strokeLinecap="round"
            filter={`url(#rail-shadow-${id})`}
          />
          {/* Subtle top specular highlight */}
          <path
            d="M 0 20.5 Q 600 100.5 1200 20.5"
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.2"
          />
        </svg>

        {/* All 10 Hanging Garments Along the Catenary Curve */}
        <div className="rail-items-layer">
          {products.map((prod, idx) => {
            const x = computeItemX(idx);
            const y = getRailYAtX(x);
            const slope = getRailSlopeDegAtX(x);
            const isActive = idx === activeIndex;
            const dist = Math.abs(idx - activeIndex);
            const sideDir = idx < activeIndex ? 1 : -1;
            const cIdx = selectedColors[prod.id] ?? 0;
            const cw = prod.colorways[cIdx] || prod.colorways[0];
            const isWearingLive = activeTryOnId === prod.id;

            // Hide garments way outside the viewport horizontally for crisp edge aesthetics
            const outOfBounds = x < -140 || x > stageWidth + 140;

            return (
              <div
                key={prod.id}
                className={`rail-hanger-slot ${isActive ? 'is-active' : 'is-side'} ${isWearingLive ? 'is-wearing' : ''}`}
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  zIndex: isActive ? 30 : Math.max(2, 20 - dist),
                  opacity: outOfBounds ? 0 : Math.max(0.45, 1 - dist * 0.08),
                  pointerEvents: outOfBounds ? 'none' : 'auto',
                }}
                onMouseEnter={() => {
                  if (!dragRef.current.active && idx !== activeIndex) {
                    setActiveIndex(idx);
                  }
                }}
                onClick={() => {
                  if (idx !== activeIndex) {
                    setActiveIndex(idx);
                  } else {
                    onInspectSuspended(prod, cw, idx);
                  }
                }}
              >
                {/* Steel Hook Clipped Right Onto the Curved Bar */}
                <div className="rail-hook-wrap" style={{ transform: `rotate(${slope}deg)` }}>
                  <svg className="rail-hook-svg" viewBox="0 0 40 36" fill="none">
                    {/* Hook clasp wrapping bar */}
                    <path
                      d="M20 2 C25 2 26 9 20 12 L20 22"
                      stroke="#cfd3e6"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="4" r="2.2" fill="#e5e7f5" />
                    {/* Hanger shoulders / trouser clip bar */}
                    {isPants ? (
                      <>
                        <path d="M8 24 L32 24" stroke="#9ca3af" strokeWidth="2.4" strokeLinecap="round" />
                        <rect x="9" y="22" width="4" height="7" rx="1" fill="#e2e8f0" />
                        <rect x="27" y="22" width="4" height="7" rx="1" fill="#e2e8f0" />
                      </>
                    ) : (
                      <path
                        d="M20 19 L5 31 M20 19 L35 31"
                        stroke="#9499ad"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>

                  {/* Iconic Mini Price Tag Clipped at the Hanger Neck (exact Reel touch!) */}
                  <div className={`rail-price-tag ${isActive ? 'active' : ''}`}>
                    ${prod.preorderPrice ?? prod.price}
                  </div>
                </div>

                {/* Swinging / Unfolding 3D Garment Body */}
                <div
                  className="rail-garment-pivot"
                  style={{
                    transform: isActive
                      ? `perspective(950px) rotateY(0deg) scaleX(1) scale(1.06)`
                      : `perspective(950px) rotateY(${sideDir * 71}deg) scaleX(0.56) scale(0.86)`,
                  }}
                >
                  <div className={`rail-garment-sway ${isActive ? 'sway-active' : ''}`}>
                    <SmartGarmentImage
                      src={prod.image}
                      category={prod.category}
                      designId={prod.designId}
                      colorway={cw}
                      alt={`${prod.name} in ${cw.name}`}
                      className={`rail-garment-img ${isPants ? 'pants-img' : category === 'tshirts' ? 'tee-img' : ''}`}
                    />
                    {/* Subtle depth shadow on folded side items so they look physically stacked */}
                    {!isActive && <div className="rail-side-shade" />}
                  </div>

                  {/* Quick Hover Hint Pill on Active Unfolded Garment */}
                  {isActive && (
                    <div className="rail-click-hint">
                      <span>Click to Inspect</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Left / Right Subtle Stage Arrows */}
        <button
          type="button"
          className="rail-nav-arrow left"
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          disabled={activeIndex === 0}
          aria-label="Previous garment on rail"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="rail-nav-arrow right"
          onClick={() => setActiveIndex((i) => Math.min(products.length - 1, i + 1))}
          disabled={activeIndex === products.length - 1}
          aria-label="Next garment on rail"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Bottom 3-Column Minimalist Editorial HUD (Exact Reel Layout!) */}
      <div className="rail-bottom-hud">
        {/* Bottom-Left: Active Piece Title + Price + Live Color Swatches */}
        <div className="rail-hud-left">
          <div className="rail-active-title-row">
            <span className="rail-active-name">{activeProduct.name}</span>
            <span className="rail-active-code">{activeProduct.code}</span>
          </div>
          <div className="rail-active-price-row">
            <span className="rail-active-price">
              ${(activeProduct.preorderPrice ?? activeProduct.price).toFixed(2)}
            </span>
            <div className="swatch-row" style={{ marginLeft: 10 }}>
              {activeProduct.colorways.map((cw, cIdx) => (
                <button
                  key={cw.id}
                  type="button"
                  className={`swatch-btn ${cIdx === activeColorIdx ? 'active' : ''}`}
                  style={{ backgroundColor: cw.hex, width: 17, height: 17 }}
                  title={`Recolor to ${cw.name}`}
                  onClick={() => {
                    setSelectedColors((prev) => ({ ...prev, [activeProduct.id]: cIdx }));
                    if (activeTryOnId === activeProduct.id) {
                      onTryOn(activeProduct, cw);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-Center: Minimal Sliding Pill Position Track */}
        <div className="rail-hud-center">
          <div className="rail-scrubber-track" onClick={handleTrackClick} role="slider" aria-valuenow={activeIndex + 1} aria-valuemin={1} aria-valuemax={products.length}>
            <div
              className="rail-scrubber-pill"
              style={{
                width: `${100 / products.length}%`,
                left: `${progressPct * (1 - 1 / products.length)}%`,
              }}
            />
          </div>
          <div className="rail-counter-caption">
            {String(activeIndex + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')} · HOVER OR DRAG RAIL
          </div>
        </div>

        {/* Bottom-Right: Editorial Copy + AI Try-On + Inspect CTA */}
        <div className="rail-hud-right">
          <p className="rail-editorial-copy">{editorialNote}</p>
          <div className="rail-hud-ctas">
            <button
              type="button"
              className={`rail-tryon-link ${activeTryOnId === activeProduct.id ? 'active' : ''}`}
              onClick={() => onTryOn(activeProduct, activeColor)}
            >
              <Sparkles size={13} />
              <span>{activeTryOnId === activeProduct.id ? 'Wearing Live' : 'AI Try-On'}</span>
            </button>
            <button
              type="button"
              className="rail-inspect-link"
              onClick={() => onInspectSuspended(activeProduct, activeColor, activeIndex)}
            >
              <span>Inspect Piece</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
