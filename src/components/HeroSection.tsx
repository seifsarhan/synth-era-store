import React, { useState } from 'react';
import { ArrowRight, Camera, ScanEye } from 'lucide-react';
import { HERO_HOTSPOTS, PRODUCTS } from '../data/products';
import { Product } from '../types';
import { SmartGarmentImage } from './SmartGarmentImage';

interface HeroSectionProps {
  onInspectFlagship: (product: Product) => void;
  onTryOnFlagship: (product: Product) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onInspectFlagship, onTryOnFlagship }) => {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, tx: 0, ty: 0 });
  const [showXray, setShowXray] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  const flagship = PRODUCTS[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({
      rx: -ny * 9,
      ry: nx * 12,
      tx: nx * 16,
      ty: ny * 10,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, tx: 0, ty: 0 });
  };

  return (
    <section
      id="hero"
      className="hero-section"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hero-noise" />

      {/* Center Interactive Stage */}
      <div className="hero-stage">
        {/* Massive Background Display Wordmark */}
        <div
          className="hero-bg-word"
          style={{
            transform: `translate(calc(-50% + ${-tilt.tx * 0.9}px), calc(-50% + ${-tilt.ty * 0.6}px))`,
          }}
        >
          SYNTH ERA
        </div>

        {/* Expressive Electric-Purple Brush Layer ("Modern" ... "Armor" + "CREATED FOR YOU.") */}
        <div className="hero-brush-layer">
          <div
            className="brush-left"
            style={{
              transform: `translate(${tilt.tx * 0.45}px, calc(-4% + ${tilt.ty * 0.35}px))`,
            }}
          >
            <span className="brush-word">Modern</span>
            <span className="brush-sub">CREATED FOR YOU.</span>
          </div>

          <div
            className="brush-right"
            style={{
              transform: `translate(${tilt.tx * 0.55}px, calc(-2% + ${tilt.ty * 0.35}px))`,
            }}
          >
            <span className="brush-word">Armor</span>
          </div>
        </div>

        {/* Floating 3D-Tilt Smart Jacket (blends seamlessly with SYNTH ERA typography) */}
        <div
          className="hero-garment-wrap"
          style={{
            transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translate3d(${tilt.tx * 0.55}px, ${tilt.ty * 0.35}px, 0)`,
          }}
        >
          <div className="hero-garment-float">
            <div className="hero-garment-aura" />
            <SmartGarmentImage
              src={flagship.image}
              category={flagship.category}
              designId={flagship.designId}
              colorway={flagship.colorways[0]}
              alt="SYNTH ERA Aero-01 Liquid Armor Jacket"
              className="hero-garment-img"
            />
          </div>
        </div>

        {/* Interactive Smart Garment Hotspots (unblended sharp glass overlay) */}
        {showXray && (
          <div
            className="hero-garment-hotspots"
            style={{
              transform: `translate3d(${tilt.tx * 0.55}px, ${tilt.ty * 0.35}px, 0)`,
            }}
          >
            {HERO_HOTSPOTS.map((spot) => {
              const isOpen = activeHotspot === spot.id;
              return (
                <div
                  key={spot.id}
                  className={`hotspot-pin ${isOpen ? 'active' : ''}`}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  onMouseEnter={() => setActiveHotspot(spot.id)}
                  onMouseLeave={() => setActiveHotspot(null)}
                  onClick={() => setActiveHotspot(isOpen ? null : spot.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={spot.title}
                >
                  <span className="hotspot-pin-dot" />
                  {isOpen && (
                    <div className="hotspot-card">
                      <div className="hotspot-card-head">
                        <span className="hotspot-code">{spot.code}</span>
                        <span className="hotspot-metric">{spot.metric}</span>
                      </div>
                      <div className="hotspot-title">{spot.title}</div>
                      <div className="hotspot-desc">{spot.detail}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Editorial Row matching reference */}
      <div className="hero-bottom">
        <div className="hero-left-copy">
          <h2 className="hero-eyebrow">LIMITED PRE-ORDERS</h2>
          <p className="hero-desc">
            Own the next-generation jacket engineered for your comfort and bold individuality.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <button
              type="button"
              className={`xray-toggle-btn ${showXray ? 'active' : ''}`}
              style={{ marginTop: 0 }}
              onClick={() => setShowXray((v) => !v)}
            >
              <ScanEye size={14} />
              <span>{showXray ? 'SMART X-RAY: ON' : 'SMART X-RAY: OFF'}</span>
            </button>
            <button
              type="button"
              className="xray-toggle-btn active"
              style={{ marginTop: 0, borderColor: 'rgba(192, 132, 252, 0.8)' }}
              onClick={() => onTryOnFlagship(flagship)}
            >
              <Camera size={14} />
              <span>TRY ON LIVE</span>
            </button>
          </div>
        </div>

        <div className="exclusive-card">
          <div className="exclusive-title">
            THIS MONTH&apos;S
            <br />
            EXCLUSIVE
          </div>
          <p className="exclusive-body">
            Pre-order now and unlock exclusive pricing this month
          </p>
          <button
            type="button"
            className="exclusive-cta"
            onClick={() => onInspectFlagship(flagship)}
          >
            <span>See more info</span>
            <span className="exclusive-arrow">
              <ArrowRight size={13} />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
