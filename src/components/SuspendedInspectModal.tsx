import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Sparkles, X } from 'lucide-react';
import { GarmentSize, Product, ProductColorway } from '../types';
import { SmartGarmentImage } from './SmartGarmentImage';

interface SuspendedInspectModalProps {
  collectionProducts: Product[];
  initialIndex: number;
  initialColorway: ProductColorway;
  recommendedSize: GarmentSize;
  onClose: () => void;
  onTryOn: (product: Product, colorway: ProductColorway) => void;
  onAddToCart: (product: Product, size: GarmentSize, colorway: ProductColorway) => void;
}

const SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL'];

export const SuspendedInspectModal: React.FC<SuspendedInspectModalProps> = ({
  collectionProducts,
  initialIndex,
  initialColorway,
  recommendedSize,
  onClose,
  onTryOn,
  onAddToCart,
}) => {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const product = collectionProducts[currentIdx] || collectionProducts[0];
  const [selectedColor, setSelectedColor] = useState<ProductColorway>(initialColorway);
  const [selectedSize, setSelectedSize] = useState<GarmentSize>(
    SIZES.includes(recommendedSize) ? recommendedSize : 'M'
  );
  const [viewTab, setViewTab] = useState<'front' | 'specs'>('front');

  const stepGarment = (dir: 1 | -1) => {
    const nextIdx = (currentIdx + dir + collectionProducts.length) % collectionProducts.length;
    setCurrentIdx(nextIdx);
    setSelectedColor(collectionProducts[nextIdx].colorways[0]);
    setViewTab('front');
  };

  const isPants = product.category === 'pants';

  return (
    <div className="suspended-backdrop" onClick={onClose}>
      <div className="suspended-stage" onClick={(e) => e.stopPropagation()}>
        {/* Top-Right Close Control matching Reel Frame 4 */}
        <button type="button" className="suspended-close" onClick={onClose}>
          <span>Close</span>
          <X size={16} />
        </button>

        {/* Left Column (~55%): Solo Garment Suspended on a Single Vertical Wire & Sculpted Hanger */}
        <div
          className="suspended-left"
          style={{
            background: `radial-gradient(circle at 50% 54%, ${selectedColor.glowHex}2a 0%, transparent 66%)`,
          }}
        >
          {/* Prev / Next Piece Controls */}
          <button
            type="button"
            className="suspended-nav left"
            onClick={() => stepGarment(-1)}
            aria-label="Previous piece"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="suspended-nav right"
            onClick={() => stepGarment(1)}
            aria-label="Next piece"
          >
            <ChevronRight size={18} />
          </button>

          {/* Suspended Pendulum Assembly */}
          <div className="suspended-pendulum">
            {/* Thin vertical steel wire dropping from ceiling */}
            <div className="suspended-wire" />

            {/* Designer Hanger Silhouette */}
            <svg className="suspended-hanger-svg" viewBox="0 0 180 56" fill="none">
              <path
                d="M90 0 L90 16"
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {isPants ? (
                <>
                  <rect x="26" y="18" width="128" height="7" rx="3.5" fill="#2d2622" stroke="#6b584d" strokeWidth="1.2" />
                  <rect x="34" y="21" width="12" height="18" rx="2" fill="#d4d4d8" />
                  <rect x="134" y="21" width="12" height="18" rx="2" fill="#d4d4d8" />
                </>
              ) : (
                <path
                  d="M90 15 C70 15 36 32 14 48 C11 50 13 54 17 54 L163 54 C167 54 169 50 166 48 C144 32 110 15 90 15 Z"
                  fill="url(#hanger-wood)"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1.2"
                />
              )}
              <defs>
                <linearGradient id="hanger-wood" x1="0" y1="0" x2="180" y2="56">
                  <stop offset="0%" stopColor="#4a372d" />
                  <stop offset="50%" stopColor="#271d18" />
                  <stop offset="100%" stopColor="#3e2d24" />
                </linearGradient>
              </defs>
            </svg>

            {/* Solo Floating Garment */}
            <div className="suspended-garment-box">
              <SmartGarmentImage
                src={product.image}
                category={product.category}
                designId={product.designId}
                colorway={selectedColor}
                alt={`${product.name} in ${selectedColor.name}`}
                className="suspended-garment-img"
              />

              {/* Subtle X-Ray Telemetry Overlay when user toggles "Smart Specs" */}
              {viewTab === 'specs' && (
                <div className="suspended-xray-hud">
                  <div className="xray-chip">WATERPROOF {product.telemetry.waterproof}%</div>
                  <div className="xray-chip">THERMAL {product.telemetry.thermal}%</div>
                  <div className="xray-chip">{product.telemetry.gsm} GSM · {product.telemetry.tempRange}</div>
                  <div className="xray-chip">{product.smartTech}</div>
                </div>
              )}
            </div>
          </div>

          <div className="suspended-floor-shadow" />
        </div>

        {/* Right Column (~45%): Minimal Editorial Buy Panel matching Reel Frame 4 */}
        <div className="suspended-right">
          <div className="suspended-counter">
            {currentIdx + 1} / {collectionProducts.length}
          </div>

          <h2 className="suspended-title">{product.name}</h2>
          <div className="suspended-price">
            ${(product.preorderPrice ?? product.price).toFixed(2)}
            {product.preorderPrice && (
              <span className="suspended-price-old">${product.price.toFixed(2)}</span>
            )}
          </div>

          {/* Front | Smart Specs underlined tabs (exact Frame 4 feel!) */}
          <div className="suspended-tabs">
            <button
              type="button"
              className={`suspended-tab ${viewTab === 'front' ? 'active' : ''}`}
              onClick={() => setViewTab('front')}
            >
              Front
            </button>
            <button
              type="button"
              className={`suspended-tab ${viewTab === 'specs' ? 'active' : ''}`}
              onClick={() => setViewTab('specs')}
            >
              Smart Specs
            </button>
          </div>

          <p className="suspended-desc">{product.description}</p>

          {/* Live Real Color Swatches */}
          <div className="suspended-field-lbl">
            COLOR — <span style={{ color: '#fff' }}>{selectedColor.name}</span>
          </div>
          <div className="swatch-row" style={{ marginBottom: 22 }}>
            {product.colorways.map((cw) => (
              <button
                key={cw.id}
                type="button"
                className={`swatch-btn ${cw.id === selectedColor.id ? 'active' : ''}`}
                style={{ backgroundColor: cw.hex, width: 24, height: 24 }}
                title={cw.name}
                onClick={() => setSelectedColor(cw)}
              />
            ))}
          </div>

          {/* Circular SIZE Pills (exact Frame 4 match!) */}
          <div className="suspended-field-lbl">
            SIZE{' '}
            <span style={{ color: '#c084fc', marginLeft: 6 }}>
              (SMART FIT: {recommendedSize})
            </span>
          </div>
          <div className="suspended-size-row">
            {SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                className={`suspended-size-circle ${selectedSize === sz ? 'active' : ''}`}
                onClick={() => setSelectedSize(sz)}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Wide Pill Add to Cart + Live AI Try-On */}
          <div className="suspended-cta-stack">
            <button
              type="button"
              className="suspended-add-pill"
              onClick={() => {
                onAddToCart(product, selectedSize, selectedColor);
                onClose();
              }}
            >
              <ShoppingBag size={16} />
              <span>Add to cart</span>
            </button>

            <button
              type="button"
              className="suspended-tryon-pill"
              onClick={() => {
                onClose();
                onTryOn(product, selectedColor);
              }}
            >
              <Sparkles size={15} />
              <span>AI Try-On This Piece</span>
            </button>
          </div>

          {/* Minimal Bottom Footer Row */}
          <div className="suspended-footer-row">
            <span>{product.subtitle}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
              {product.code} · {product.telemetry.gsm} GSM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
