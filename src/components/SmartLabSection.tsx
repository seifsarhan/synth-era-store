import React, { useState } from 'react';
import { Check, Cpu, Flame, Layers, Ruler, ShieldCheck, Thermometer } from 'lucide-react';
import { FitStyle, GarmentSize, SmartFitProfile } from '../types';
import { FABRIC_LAYERS } from '../data/products';

interface SmartLabSectionProps {
  fitProfile: SmartFitProfile;
  onUpdateFit: (heightCm: number, weightKg: number, fitStyle: FitStyle) => void;
  onLockFit: () => void;
}

export function computeSmartFit(
  heightCm: number,
  weightKg: number,
  fitStyle: FitStyle
): { size: GarmentSize; matchScore: number } {
  const score = (heightCm - 155) * 0.45 + (weightKg - 48) * 0.85;
  const styleOffset = fitStyle === 'sculpted' ? -6 : fitStyle === 'oversized' ? 9 : 0;
  const adjusted = score + styleOffset;

  let size: GarmentSize = 'M';
  if (adjusted < 14) size = 'XS';
  else if (adjusted < 26) size = 'S';
  else if (adjusted < 40) size = 'M';
  else if (adjusted < 55) size = 'L';
  else if (adjusted < 70) size = 'XL';
  else size = 'XXL';

  const matchScore = Math.min(99, Math.max(93, Math.round(96 + Math.sin(heightCm + weightKg) * 2.6)));
  return { size, matchScore };
}

export const SmartLabSection: React.FC<SmartLabSectionProps> = ({
  fitProfile,
  onUpdateFit,
  onLockFit,
}) => {
  const [activeLayerId, setActiveLayerId] = useState(FABRIC_LAYERS[0].id);
  const [ambientTemp, setAmbientTemp] = useState(2);

  const activeLayer = FABRIC_LAYERS.find((l) => l.id === activeLayerId) || FABRIC_LAYERS[0];

  // Dynamic Smart Armor thermal response to ambient temperature slider
  const heatLevel =
    ambientTemp <= -6
      ? 'HIGH (ZONE 3 · 38°C)'
      : ambientTemp <= 6
        ? 'ADAPTIVE (ZONE 2 · 34°C)'
        : ambientTemp <= 15
          ? 'ECO STANDBY (ZONE 1)'
          : 'PASSIVE MICRO-VENT OPEN';

  const ventPct = Math.min(100, Math.max(18, Math.round(((ambientTemp + 15) / 40) * 100)));

  return (
    <section id="concept" className="section-wrap">
      <div className="section-header">
        <div>
          <div className="section-kicker">
            <Cpu size={13} />
            <span>SMART TEXTILE LAB · BIOMETRIC FIT</span>
          </div>
          <h2 className="section-title">
            CONCEPT &amp; TECH <span className="accent-brush">Intelligence</span>
          </h2>
        </div>
        <p className="section-sub">
          Calibrate your exact armor silhouette in seconds and simulate how our 3-layer graphene membrane responds to extreme weather shifts.
        </p>
      </div>

      <div className="lab-grid">
        {/* LEFT PANEL: AI SMART FIT FINDER */}
        <div className="lab-panel">
          <div className="section-kicker" style={{ marginBottom: 8 }}>
            <Ruler size={13} />
            <span>01 / SMART FIT PREDICTOR</span>
          </div>
          <h3 className="lab-panel-title">FIND YOUR EXACT ARMOR FIT</h3>
          <p className="lab-panel-sub">
            Dial in your build and preferred silhouette — we automatically sync your matched size across the entire store.
          </p>

          <div className="slider-field">
            <div className="slider-top">
              <span>Height</span>
              <span className="slider-val">{fitProfile.heightCm} cm</span>
            </div>
            <input
              type="range"
              className="synth-range"
              min={155}
              max={202}
              value={fitProfile.heightCm}
              onChange={(e) =>
                onUpdateFit(Number(e.target.value), fitProfile.weightKg, fitProfile.fitStyle)
              }
            />
          </div>

          <div className="slider-field">
            <div className="slider-top">
              <span>Weight</span>
              <span className="slider-val">{fitProfile.weightKg} kg</span>
            </div>
            <input
              type="range"
              className="synth-range"
              min={45}
              max={120}
              value={fitProfile.weightKg}
              onChange={(e) =>
                onUpdateFit(fitProfile.heightCm, Number(e.target.value), fitProfile.fitStyle)
              }
            />
          </div>

          <div className="slider-top" style={{ marginTop: 12 }}>
            <span>Silhouette Preference</span>
            <span className="slider-val" style={{ textTransform: 'uppercase', fontSize: '0.72rem', color: '#c084fc' }}>
              {fitProfile.fitStyle}
            </span>
          </div>
          <div className="fit-style-row">
            {(['sculpted', 'regular', 'oversized'] as FitStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                className={`fit-style-btn ${fitProfile.fitStyle === style ? 'active' : ''}`}
                onClick={() => onUpdateFit(fitProfile.heightCm, fitProfile.weightKg, style)}
              >
                {style}
              </button>
            ))}
          </div>

          <div className="fit-result-box">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(228,228,236,0.65)', marginBottom: 4 }}>
                RECOMMENDED SIZE
              </div>
              <div className="fit-size-big">{fitProfile.recommendedSize}</div>
              <div className="fit-match-badge">
                {fitProfile.matchScore}% BIOMETRIC SILHOUETTE MATCH
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(228,228,236,0.72)', lineHeight: 1.7 }}>
              <div>CHEST DRAPE: OPTIMAL</div>
              <div>SHOULDER DROP: {fitProfile.fitStyle === 'oversized' ? '+3.5 CM' : fitProfile.fitStyle === 'sculpted' ? '0.0 CM' : '+1.5 CM'}</div>
              <div>SLEEVE LOCK: PRECISION</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '13px 18px' }}
            onClick={onLockFit}
          >
            {fitProfile.locked ? <Check size={16} /> : <ShieldCheck size={16} />}
            <span>
              {fitProfile.locked
                ? `Size ${fitProfile.recommendedSize} Synced Across Store`
                : `Apply Size ${fitProfile.recommendedSize} Across Store`}
            </span>
          </button>
        </div>

        {/* RIGHT PANEL: 3-LAYER FABRIC X-RAY & CLIMATE SIMULATOR */}
        <div className="lab-panel">
          <div className="section-kicker" style={{ marginBottom: 8 }}>
            <Layers size={13} />
            <span>02 / SMART MEMBRANE X-RAY</span>
          </div>
          <h3 className="lab-panel-title">3-LAYER ARMOR ARCHITECTURE</h3>
          <p className="lab-panel-sub">
            Inspect each engineered layer and test live thermal regulation across city climates.
          </p>

          <div className="layer-tabs">
            {FABRIC_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={`layer-tab ${activeLayerId === layer.id ? 'active' : ''}`}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <span className="layer-tab-num">LAYER {layer.index}</span>
                <span className="layer-tab-name">{layer.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#fff', marginBottom: 5 }}>
              {activeLayer.name} <span style={{ color: '#c084fc', fontSize: '0.78rem', fontWeight: 500 }}>· {activeLayer.role}</span>
            </div>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'rgba(228,228,236,0.68)' }}>
              {activeLayer.desc}
            </p>
          </div>

          <div className="telemetry-bars">
            <div>
              <div className="tele-row-top">
                <span>Weather &amp; Abrasion Shield</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{activeLayer.stats.shield}%</span>
              </div>
              <div className="tele-track">
                <div className="tele-fill" style={{ width: `${activeLayer.stats.shield}%` }} />
              </div>
            </div>
            <div>
              <div className="tele-row-top">
                <span>Active Vapor Breathability</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{activeLayer.stats.breathability}%</span>
              </div>
              <div className="tele-track">
                <div className="tele-fill" style={{ width: `${activeLayer.stats.breathability}%` }} />
              </div>
            </div>
            <div>
              <div className="tele-row-top">
                <span>4-Way Kinetic Elasticity</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{activeLayer.stats.elasticity}%</span>
              </div>
              <div className="tele-track">
                <div className="tele-fill" style={{ width: `${activeLayer.stats.elasticity}%` }} />
              </div>
            </div>
          </div>

          {/* Live Ambient Climate Simulator */}
          <div className="climate-sim-box">
            <div className="slider-top" style={{ marginBottom: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontWeight: 500 }}>
                <Thermometer size={15} color="#c084fc" />
                Live Weather Simulator
              </span>
              <span className="slider-val" style={{ color: ambientTemp <= 0 ? '#93c5fd' : ambientTemp >= 16 ? '#fcd34d' : '#d8b4fe' }}>
                {ambientTemp > 0 ? `+${ambientTemp}°C` : `${ambientTemp}°C`}
              </span>
            </div>
            <input
              type="range"
              className="synth-range"
              min={-15}
              max={25}
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(Number(e.target.value))}
            />
            <div className="climate-readout">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Flame size={13} />
                {heatLevel}
              </span>
              <span>MICRO-VENT: {ventPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
