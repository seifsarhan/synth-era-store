import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, ShoppingBag, Sparkles } from 'lucide-react';
import { GarmentSize, Product, ProductColorway } from '../types';
import { PRODUCTS } from '../data/products';
import { SmartGarmentImage } from './SmartGarmentImage';

interface OutfitBuilderSectionProps {
  recommendedSize: GarmentSize;
  onAddKit: (items: Array<{ product: Product; size: GarmentSize; colorway: ProductColorway }>) => void;
}

export const OutfitBuilderSection: React.FC<OutfitBuilderSectionProps> = ({
  recommendedSize,
  onAddKit,
}) => {
  const jacketsList = PRODUCTS.filter((p) => p.category === 'jackets');
  const topsList = PRODUCTS.filter((p) => p.category === 'hoodies' || p.category === 'tshirts');
  const pantsList = PRODUCTS.filter((p) => p.category === 'pants');

  const [outerIdx, setOuterIdx] = useState(0);
  const [topIdx, setTopIdx] = useState(0);
  const [bottomIdx, setBottomIdx] = useState(0);

  const [outerColorIdx, setOuterColorIdx] = useState(0);
  const [topColorIdx, setTopColorIdx] = useState(0);
  const [bottomColorIdx, setBottomColorIdx] = useState(0);

  const selectedOuter = jacketsList[outerIdx];
  const selectedTop = topsList[topIdx];
  const selectedBottom = pantsList[bottomIdx];

  const outerColor = selectedOuter.colorways[outerColorIdx % selectedOuter.colorways.length];
  const topColor = selectedTop.colorways[topColorIdx % selectedTop.colorways.length];
  const bottomColor = selectedBottom.colorways[bottomColorIdx % selectedBottom.colorways.length];

  const baseSum =
    (selectedOuter.preorderPrice ?? selectedOuter.price) +
    (selectedTop.preorderPrice ?? selectedTop.price) +
    (selectedBottom.preorderPrice ?? selectedBottom.price);

  const bundlePrice = Math.round(baseSum * 0.85);
  const savings = baseSum - bundlePrice;

  const avgThermal = Math.round(
    (selectedOuter.telemetry.thermal + selectedTop.telemetry.thermal + selectedBottom.telemetry.thermal) / 3
  );
  const synergyScore = Math.min(99, 94 + ((outerIdx + topIdx + bottomIdx) % 6));

  const cycle = (current: number, len: number, dir: 1 | -1) => (current + dir + len) % len;

  const slots = [
    {
      label: '01 · OUTER JACKET',
      product: selectedOuter,
      colorway: outerColor,
      colorIdx: outerColorIdx % selectedOuter.colorways.length,
      onColor: setOuterColorIdx,
      onPrev: () => {
        setOuterIdx((i) => cycle(i, jacketsList.length, -1));
        setOuterColorIdx(0);
      },
      onNext: () => {
        setOuterIdx((i) => cycle(i, jacketsList.length, 1));
        setOuterColorIdx(0);
      },
    },
    {
      label: '02 · HOODIE / T-SHIRT',
      product: selectedTop,
      colorway: topColor,
      colorIdx: topColorIdx % selectedTop.colorways.length,
      onColor: setTopColorIdx,
      onPrev: () => {
        setTopIdx((i) => cycle(i, topsList.length, -1));
        setTopColorIdx(0);
      },
      onNext: () => {
        setTopIdx((i) => cycle(i, topsList.length, 1));
        setTopColorIdx(0);
      },
    },
    {
      label: '03 · PANTS',
      product: selectedBottom,
      colorway: bottomColor,
      colorIdx: bottomColorIdx % selectedBottom.colorways.length,
      onColor: setBottomColorIdx,
      onPrev: () => {
        setBottomIdx((i) => cycle(i, pantsList.length, -1));
        setBottomColorIdx(0);
      },
      onNext: () => {
        setBottomIdx((i) => cycle(i, pantsList.length, 1));
        setBottomColorIdx(0);
      },
    },
  ];

  const handleAddFullKit = () => {
    onAddKit([
      { product: selectedOuter, size: recommendedSize, colorway: outerColor },
      { product: selectedTop, size: recommendedSize, colorway: topColor },
      { product: selectedBottom, size: recommendedSize, colorway: bottomColor },
    ]);
  };

  return (
    <section id="lookbook" className="section-wrap" style={{ paddingTop: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-kicker">
            <Layers size={13} />
            <span>INTERACTIVE MIX &amp; MATCH STUDIO</span>
          </div>
          <h2 className="section-title">
            ARMOR ARCHITECT <span className="accent-brush">Lookbook</span>
          </h2>
        </div>
        <p className="section-sub">
          Cycle through all 10 Jackets, 20 Hoodies &amp; Tees, and 10 Pants — switch real garment colors live and unlock 15% off your full kit.
        </p>
      </div>

      <div className="outfit-studio">
        <div className="outfit-slots">
          {slots.map((slot) => (
            <div key={slot.label} className="outfit-slot-card">
              <div className="slot-label">{slot.label}</div>
              <div className="slot-img-stage">
                <SmartGarmentImage
                  src={slot.product.image}
                  category={slot.product.category}
                  designId={slot.product.designId}
                  alt={slot.product.name}
                  colorway={slot.colorway}
                />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.04em', marginBottom: 4 }}>
                {slot.product.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(228,228,236,0.58)', marginBottom: 10 }}>
                {slot.colorway.name} · ${slot.product.preorderPrice ?? slot.product.price}
              </div>

              <div className="swatch-row" style={{ justifyContent: 'center', marginBottom: 14 }}>
                {slot.product.colorways.map((cw, cIdx) => (
                  <button
                    key={cw.id}
                    type="button"
                    className={`swatch-btn ${cIdx === slot.colorIdx ? 'active' : ''}`}
                    style={{ backgroundColor: cw.hex, width: 17, height: 17 }}
                    title={cw.name}
                    onClick={() => slot.onColor(cIdx)}
                  />
                ))}
              </div>

              <div className="slot-controls">
                <button
                  type="button"
                  className="slot-arrow"
                  onClick={slot.onPrev}
                  aria-label="Previous piece"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#c084fc' }}>
                  {slot.product.code}
                </span>
                <button
                  type="button"
                  className="slot-arrow"
                  onClick={slot.onNext}
                  aria-label="Next piece"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="outfit-summary-bar">
          <div className="synergy-stats">
            <div>
              <div className="synergy-val" style={{ color: '#d8b4fe' }}>
                {synergyScore}%
              </div>
              <div className="synergy-lbl">Style Synergy</div>
            </div>
            <div>
              <div className="synergy-val">{avgThermal}/100</div>
              <div className="synergy-lbl">Thermal Armor Index</div>
            </div>
            <div>
              <div className="synergy-val">
                ${bundlePrice}{' '}
                <span style={{ fontSize: '0.9rem', color: 'rgba(228,228,236,0.45)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                  ${baseSum}
                </span>
              </div>
              <div className="synergy-lbl">Save ${savings} (15% Kit Drop)</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ padding: '14px 24px', fontSize: '0.88rem' }}
            onClick={handleAddFullKit}
          >
            <Sparkles size={16} />
            <ShoppingBag size={16} />
            <span>Add Full Kit (Size {recommendedSize})</span>
          </button>
        </div>
      </div>
    </section>
  );
};
