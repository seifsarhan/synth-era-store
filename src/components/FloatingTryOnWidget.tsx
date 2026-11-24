import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  ImagePlus,
  KeyRound,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { createDecartClient, models, type RealTimeClient } from '@decartai/sdk';
import { GarmentSize, Product, ProductColorway } from '../types';
import { PRODUCTS } from '../data/products';
import { renderStudioGarment, renderVtonReferenceDataUrl } from '../utils/garmentStudio';

interface FloatingTryOnWidgetProps {
  product: Product;
  colorway: ProductColorway;
  recommendedSize: GarmentSize;
  onSelectProduct: (product: Product, colorway: ProductColorway) => void;
  onAddToCart: (product: Product, size: GarmentSize, colorway: ProductColorway) => void;
  onClose: () => void;
}

type EngineTab = 'free-ai' | 'decart-live';

const DECART_KEY_STORAGE = 'synth_era_decart_api_key';
const HF_TOKEN_STORAGE = 'synth_era_hf_token';

function buildVtonDescription(product: Product, colorway: ProductColorway): string {
  const categoryWord =
    product.category === 'hoodies'
      ? 'oversized heavyweight streetwear hoodie'
      : product.category === 'jackets'
        ? 'futuristic luxury techwear jacket'
        : product.category === 'pants'
          ? 'streetwear technical cargo trousers'
          : 'boxy oversized short-sleeve streetwear t-shirt';

  return `${colorway.name} ${product.name}, ${categoryWord}, ${product.subtitle}`;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const FloatingTryOnWidget: React.FC<FloatingTryOnWidgetProps> = ({
  product,
  colorway,
  recommendedSize,
  onSelectProduct,
  onAddToCart,
  onClose,
}) => {
  const envDecart = (import.meta.env.VITE_DECART_API_KEY as string | undefined)?.trim() || '';
  const [engineTab, setEngineTab] = useState<EngineTab>(() => (envDecart ? 'decart-live' : 'free-ai'));

  const [decartKey, setDecartKey] = useState<string>(
    () => envDecart || localStorage.getItem(DECART_KEY_STORAGE) || ''
  );
  const [hfToken, setHfToken] = useState<string>(() => localStorage.getItem(HF_TOKEN_STORAGE) || '');
  const [keyDraft, setKeyDraft] = useState<string>(decartKey);
  const [hfDraft, setHfDraft] = useState<string>(hfToken);
  const [showSettings, setShowSettings] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [snapNotice, setSnapNotice] = useState<string | null>(null);

  // Free AI Virtual Try-On state (Zero API Key Needed!)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [personPhoto, setPersonPhoto] = useState<string | null>(null);
  const [aiResultPhoto, setAiResultPhoto] = useState<string | null>(null);
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [comparePct, setComparePct] = useState(100);
  const [lastTriedKey, setLastTriedKey] = useState<string>('');

  // Decart Live Video state
  const [showRawCam, setShowRawCam] = useState(false);
  const [decartState, setDecartState] = useState<'idle' | 'connecting' | 'generating' | 'error'>('idle');
  const [decartError, setDecartError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rtClientRef = useRef<RealTimeClient | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const connectedRef = useRef(false);
  const lastDecartSwapRef = useRef('');

  const categoryProducts = useMemo(
    () => PRODUCTS.filter((p) => p.category === product.category),
    [product.category]
  );

  // Start clean mirrored webcam feed
  const startWebcam = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current && localStreamRef.current.active) {
      if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        await localVideoRef.current.play().catch(() => {});
      }
      return localStreamRef.current;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 1280 },
        },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch {
      return null;
    }
  }, []);

  const stopDecart = useCallback(() => {
    connectedRef.current = false;
    if (rtClientRef.current) {
      try {
        rtClientRef.current.disconnect();
      } catch {
        // ignore
      }
      rtClientRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setDecartState('idle');
  }, []);

  const stopAll = useCallback(() => {
    stopDecart();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, [stopDecart]);

  // Keep webcam active whenever widget is open and no static result is hiding it
  useEffect(() => {
    startWebcam();
    return () => {
      stopAll();
    };
  }, [startWebcam, stopAll]);

  // =========================================================================
  // REAL GENERATIVE AI VIRTUAL TRY-ON (FREE NVIDIA A10G GPU: LEFFA / IDM-VTON)
  // =========================================================================
  const runFreeAiTryOn = useCallback(
    async (sourcePersonDataUrl: string, targetProduct: Product, targetColorway: ProductColorway) => {
      setIsGenerating(true);
      setAiError(null);
      setAiResultPhoto(null);

      try {
        // Prepare crisp garment on clean light studio canvas for maximum VTON AI fidelity!
        const garmentDataUrl = await renderVtonReferenceDataUrl(
          targetProduct.image,
          targetProduct.category,
          targetProduct.designId,
          targetColorway
        );

        const res = await fetch('/api/tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personDataUrl: sourcePersonDataUrl,
            garmentDataUrl,
            garmentDescription: buildVtonDescription(targetProduct, targetColorway),
            category: targetProduct.category,
            hfToken: hfToken || undefined,
          }),
        });

        const payload = (await res.json()) as { imageDataUrl?: string; engine?: string; error?: string };
        if (!res.ok || !payload.imageDataUrl) {
          throw new Error(payload.error || 'AI server busy — please retry in a moment.');
        }

        setAiResultPhoto(payload.imageDataUrl);
        setAiEngineUsed(payload.engine || 'AI VTON GPU');
        setComparePct(100);
        setLastTriedKey(`${targetProduct.id}::${targetColorway.id}`);
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Virtual Try-On failed. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [hfToken]
  );

  // Capture crisp portrait frame from live mirrored webcam
  const captureWebcamFrame = useCallback((): string | null => {
    const v = localVideoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return null;

    const targetW = 768;
    const targetH = Math.round((v.videoHeight / v.videoWidth) * targetW);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    // Mirror horizontally so photo matches what user sees
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  // 3-2-1 Countdown Snapshot -> Immediate Real AI Try-On!
  const handleStartCountdownSnap = () => {
    if (isGenerating || countdown !== null) return;
    setAiError(null);
    setShowGuide(true);

    if (!localVideoRef.current?.videoWidth) {
      // No webcam detected -> prompt photo upload cleanly
      fileInputRef.current?.click();
      return;
    }

    setCountdown(3);
    window.setTimeout(() => setCountdown(2), 900);
    window.setTimeout(() => setCountdown(1), 1800);
    window.setTimeout(() => {
      setCountdown(null);
      const snap = captureWebcamFrame();
      if (snap) {
        setPersonPhoto(snap);
        setShowGuide(false);
        runFreeAiTryOn(snap, product, colorway);
      } else {
        setAiError('Could not read camera frame — try uploading a photo instead.');
      }
    }, 2650);
  };

  // Upload any portrait/full-body photo -> Immediate Real AI Try-On!
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.92);
        setPersonPhoto(dataUrl);
        setShowGuide(false);
        setEngineTab('free-ai');
        runFreeAiTryOn(dataUrl, product, colorway);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // =========================================================================
  // OPTIONAL TAB 2: DECART AI REAL-TIME LIVE VIDEO (`lucy-vton-latest`)
  // =========================================================================
  const connectDecartLive = useCallback(async () => {
    stopDecart();
    setDecartError(null);
    if (!decartKey.trim()) return;

    const stream = await startWebcam();
    if (!stream) {
      setDecartState('error');
      setDecartError('Camera permission denied.');
      return;
    }

    try {
      setDecartState('connecting');
      const vtonModel = models.realtime('lucy-vton-latest');
      const garmentDataUrl = await renderStudioGarment(
        product.image,
        product.category,
        product.designId,
        colorway
      );
      lastDecartSwapRef.current = `${product.id}::${colorway.id}`;

      const decart = createDecartClient({ apiKey: decartKey.trim() });
      const rt = await decart.realtime.connect(stream, {
        model: vtonModel,
        mirror: true,
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {});
          }
        },
        onConnectionChange: (state) => {
          if (state === 'generating' || state === 'connected') {
            connectedRef.current = true;
            setDecartState('generating');
            setShowGuide(false);
          } else if (state === 'connecting' || state === 'reconnecting') {
            setDecartState('connecting');
          }
        },
        initialState: {
          image: garmentDataUrl,
          prompt: {
            text: `A person realistically wearing ${buildVtonDescription(product, colorway)}`,
            enhance: true,
          },
        },
      });
      rtClientRef.current = rt;
      rt.on('generationTick', (t) => setElapsedSec(t.seconds));
      rt.on('error', (err) => {
        setDecartState('error');
        setDecartError(err.message);
      });
    } catch (err) {
      setDecartState('error');
      setDecartError(err instanceof Error ? err.message : 'Failed to connect to Decart Live AI.');
    }
  }, [decartKey, startWebcam, stopDecart, product, colorway]);

  useEffect(() => {
    if (engineTab === 'decart-live' && decartKey.trim()) {
      connectDecartLive();
    } else {
      stopDecart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineTab, decartKey]);

  // Swap garment live on Decart WebRTC when active
  useEffect(() => {
    const rt = rtClientRef.current;
    const key = `${product.id}::${colorway.id}`;
    if (engineTab !== 'decart-live' || !rt || !connectedRef.current || key === lastDecartSwapRef.current) return;
    lastDecartSwapRef.current = key;
    renderStudioGarment(product.image, product.category, product.designId, colorway)
      .then((img) =>
        rt.setImage(img, {
          prompt: `A person realistically wearing ${buildVtonDescription(product, colorway)}`,
          enhance: true,
        })
      )
      .catch(() => {});
  }, [engineTab, product, colorway]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHf = hfDraft.trim();
    const cleanDecart = keyDraft.trim();
    if (cleanHf) localStorage.setItem(HF_TOKEN_STORAGE, cleanHf);
    else localStorage.removeItem(HF_TOKEN_STORAGE);
    if (cleanDecart) localStorage.setItem(DECART_KEY_STORAGE, cleanDecart);
    else localStorage.removeItem(DECART_KEY_STORAGE);
    setHfToken(cleanHf);
    setDecartKey(cleanDecart);
    setShowSettings(false);
  };

  const handleSaveSnapshot = () => {
    const srcImg = aiResultPhoto || personPhoto;
    if (engineTab === 'free-ai' && srcImg) {
      const a = document.createElement('a');
      a.download = `synth-era-${product.code.toLowerCase()}-${colorway.id}.png`;
      a.href = srcImg;
      a.click();
      setSnapNotice('Photo saved!');
      window.setTimeout(() => setSnapNotice(null), 2200);
      return;
    }

    const v =
      decartState === 'generating' && !showRawCam && remoteVideoRef.current?.videoWidth
        ? remoteVideoRef.current
        : localVideoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const a = document.createElement('a');
    a.download = `synth-era-${product.code.toLowerCase()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    setSnapNotice('Photo saved!');
    window.setTimeout(() => setSnapNotice(null), 2200);
  };

  const currentIdx = categoryProducts.findIndex((p) => p.id === product.id);
  const stepPiece = (dir: 1 | -1) => {
    const next = categoryProducts[(currentIdx + dir + categoryProducts.length) % categoryProducts.length];
    onSelectProduct(next, next.colorways[0]);
  };

  const currentPairKey = `${product.id}::${colorway.id}`;
  const hasNewSelectionForPhoto = Boolean(personPhoto && lastTriedKey && lastTriedKey !== currentPairKey);
  const isDecartShowing = engineTab === 'decart-live' && decartState === 'generating' && !showRawCam;

  return (
    <aside className={`pip-widget ${expanded ? 'expanded' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUploadPhoto}
      />

      {/* Header */}
      <div className="pip-header">
        <div className="pip-title-group">
          <Sparkles size={14} color="#c084fc" />
          <span className="pip-title">AI Try-On</span>
          <span className="pip-sep">•</span>
          <span className="pip-brand">SYNTH ERA</span>
          <span
            className={`pip-live-dot ${
              isGenerating || decartState === 'connecting'
                ? 'busy'
                : aiResultPhoto || decartState === 'generating'
                  ? 'live'
                  : ''
            }`}
          />
        </div>

        <div className="pip-header-btns">
          <button
            type="button"
            className={`pip-icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings((s) => !s)}
            title="Optional Priority Tokens (HF / Decart)"
          >
            <KeyRound size={13} />
          </button>
          <button
            type="button"
            className="pip-icon-btn"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Compact PiP' : 'Expand Mirror'}
          >
            {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button type="button" className="pip-icon-btn" onClick={onClose} title="Close Try-On">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Mode Switcher: Free Real AI Try-On (No Key!) vs Decart Live Video */}
      <div className="pip-mode-bar">
        <button
          type="button"
          className={`pip-mode-tab ${engineTab === 'free-ai' ? 'active' : ''}`}
          onClick={() => setEngineTab('free-ai')}
        >
          <Sparkles size={12} />
          <span>Free AI Try-On (No Key)</span>
        </button>
        <button
          type="button"
          className={`pip-mode-tab ${engineTab === 'decart-live' ? 'active' : ''}`}
          onClick={() => setEngineTab('decart-live')}
        >
          <Video size={12} />
          <span>Live Video (Decart)</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="pip-viewport">
        {/* Live Mirrored Webcam (visible when ready to snap or in Decart mode) */}
        <video
          ref={localVideoRef}
          className="pip-video mirrored"
          playsInline
          muted
          style={{
            opacity:
              engineTab === 'free-ai'
                ? personPhoto
                  ? 0
                  : 1
                : isDecartShowing
                  ? 0
                  : 1,
          }}
        />

        {/* Decart Live AI Remote Video */}
        <video
          ref={remoteVideoRef}
          className="pip-video"
          playsInline
          muted
          style={{ opacity: isDecartShowing ? 1 : 0 }}
        />

        {/* Captured Person Photo + Photorealistic AI Result with Before/After Reveal */}
        {engineTab === 'free-ai' && personPhoto && (
          <div className="pip-result-stage">
            <img src={personPhoto} alt="Original" className="pip-result-img" />
            {aiResultPhoto && (
              <img
                src={aiResultPhoto}
                alt="AI Wearing Garment"
                className="pip-result-img"
                style={{ clipPath: `inset(0 ${100 - comparePct}% 0 0)` }}
              />
            )}
            {aiResultPhoto && (
              <div className="pip-compare-bar">
                <span>Before</span>
                <input
                  type="range"
                  className="synth-range"
                  min={0}
                  max={100}
                  value={comparePct}
                  onChange={(e) => setComparePct(Number(e.target.value))}
                />
                <span>AI Wear</span>
              </div>
            )}
          </div>
        )}

        {/* Top-Left Status Pill */}
        <div className="pip-timer-pill">
          <Clock size={12} />
          <span>
            {engineTab === 'free-ai'
              ? isGenerating
                ? 'AI Tailoring on NVIDIA GPU...'
                : aiResultPhoto
                  ? aiEngineUsed || 'AI Wearing Ready'
                  : 'Free GPU Ready · No Key'
              : decartState === 'generating'
                ? formatTimer(elapsedSec)
                : decartState === 'connecting'
                  ? 'Connecting Decart...'
                  : 'Decart Key Required'}
          </span>
        </div>

        {/* 3-2-1 Countdown Overlay */}
        {countdown !== null && (
          <div className="pip-countdown-overlay">
            <span className="pip-countdown-num">{countdown}</span>
            <span className="pip-countdown-hint">Stand back &amp; face camera</span>
          </div>
        )}

        {/* Futuristic AI Processing Scan Overlay */}
        {isGenerating && (
          <div className="pip-generating-overlay">
            <div className="ar-scanline" />
            <div className="pip-gen-badge">
              <Sparkles size={15} color="#c084fc" />
              <span>AI Wearing {product.name}...</span>
              <small>Replacing clothes with real folds &amp; lighting (~15s)</small>
            </div>
          </div>
        )}

        {/* Silhouette Framing Guide before capturing */}
        {engineTab === 'free-ai' && !personPhoto && showGuide && !showSettings && countdown === null && (
          <div className="pip-guide-overlay" onClick={() => setShowGuide(false)}>
            <svg className="pip-silhouette-svg" viewBox="0 0 300 380" fill="none">
              <defs>
                <mask id="human-cutout-mask-v2">
                  <rect width="300" height="380" fill="white" />
                  <ellipse cx="150" cy="96" rx="40" ry="50" fill="black" />
                  <path
                    d="M66 380 C66 238, 88 184, 150 184 C212 184, 234 238, 234 380 Z"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width="300" height="380" fill="rgba(8, 8, 14, 0.52)" mask="url(#human-cutout-mask-v2)" />
              <ellipse
                cx="150"
                cy="96"
                rx="40"
                ry="50"
                stroke="rgba(192, 132, 252, 0.72)"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
              <path
                d="M66 380 C66 238, 88 184, 150 184 C212 184, 234 238, 234 380"
                stroke="rgba(192, 132, 252, 0.72)"
                strokeWidth="1.5"
                strokeDasharray="6 5"
              />
            </svg>
          </div>
        )}

        {/* Primary Free AI Capture / Swap Action Overlay at Bottom of Viewport */}
        {engineTab === 'free-ai' && !isGenerating && countdown === null && !showSettings && (
          <div className="pip-center-cta-wrap">
            {!personPhoto ? (
              <>
                <button type="button" className="pip-snap-cta" onClick={handleStartCountdownSnap}>
                  <Camera size={15} />
                  <span>Wear This Now (3-2-1)</span>
                </button>
                <button
                  type="button"
                  className="pip-upload-pill"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload a photo of yourself"
                >
                  <ImagePlus size={14} />
                  <span>Photo</span>
                </button>
              </>
            ) : hasNewSelectionForPhoto || !aiResultPhoto ? (
              <button
                type="button"
                className="pip-snap-cta"
                onClick={() => runFreeAiTryOn(personPhoto, product, colorway)}
              >
                <Sparkles size={15} />
                <span>Wear {product.code} ({colorway.name})</span>
              </button>
            ) : null}
          </div>
        )}

        {/* Left-Side Floating Tools */}
        <div className="pip-float-tools">
          {engineTab === 'free-ai' && personPhoto ? (
            <button
              type="button"
              className="pip-tool-circle"
              onClick={() => {
                setPersonPhoto(null);
                setAiResultPhoto(null);
                setAiError(null);
                setShowGuide(true);
              }}
              title="Retake Camera Photo"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="pip-tool-circle"
              onClick={() => setShowGuide((g) => !g)}
              title="Toggle Framing Guide"
            >
              <UserCheck size={14} />
            </button>
          )}

          {engineTab === 'free-ai' && (
            <button
              type="button"
              className="pip-tool-circle"
              onClick={() => fileInputRef.current?.click()}
              title="Upload Different Photo"
            >
              <ImagePlus size={14} />
            </button>
          )}

          {engineTab === 'decart-live' && decartState === 'generating' && (
            <button
              type="button"
              className={`pip-tool-circle ${showRawCam ? 'active' : ''}`}
              onClick={() => setShowRawCam((r) => !r)}
              title="Peek Original Camera"
            >
              <Eye size={14} />
            </button>
          )}

          <button
            type="button"
            className="pip-tool-circle"
            onClick={handleSaveSnapshot}
            title="Download Photo"
          >
            <Download size={14} />
          </button>
        </div>

        {/* Error Banner */}
        {((engineTab === 'free-ai' && aiError) || (engineTab === 'decart-live' && decartError)) && !showSettings && (
          <div className="pip-error-banner">
            <span>{engineTab === 'free-ai' ? aiError : decartError}</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {engineTab === 'free-ai' && personPhoto && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                  onClick={() => runFreeAiTryOn(personPhoto, product, colorway)}
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                onClick={() => setShowSettings(true)}
              >
                <KeyRound size={12} />
                <span>Add Free HF Token</span>
              </button>
            </div>
          </div>
        )}

        {/* Decart Tab Prompt when no Decart Key */}
        {engineTab === 'decart-live' && !decartKey && !showSettings && (
          <div className="pip-setup-overlay">
            <div className="pip-setup-card" style={{ textAlign: 'center' }}>
              <Video size={26} color="#c084fc" style={{ marginBottom: 8 }} />
              <p className="pip-setup-desc">
                <strong>Decart Live Video</strong> requires a Decart API key (currently limited sign-ups). Use our <strong>Free AI Try-On</strong> tab right now with zero API key needed!
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, padding: '9px 10px', fontSize: '0.74rem' }}
                  onClick={() => setEngineTab('free-ai')}
                >
                  <Sparkles size={13} />
                  <span>Use Free AI Now</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '9px 10px', fontSize: '0.74rem' }}
                  onClick={() => setShowSettings(true)}
                >
                  <KeyRound size={13} />
                  <span>I Have Key</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Optional Settings / Priority Keys Overlay */}
        {showSettings && (
          <div className="pip-setup-overlay">
            <form className="pip-setup-card" onSubmit={handleSaveSettings}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#d8b4fe' }}>
                  OPTIONAL PRIORITY KEYS
                </span>
                <button type="button" className="pip-icon-btn" onClick={() => setShowSettings(false)}>
                  <X size={13} />
                </button>
              </div>

              <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(228,228,236,0.72)', marginBottom: 4 }}>
                Free Hugging Face Token (boosts Free AI Try-On quota)
              </label>
              <input
                type="password"
                className="pip-key-input"
                placeholder="hf_... (optional)"
                value={hfDraft}
                onChange={(e) => setHfDraft(e.target.value)}
                style={{ marginBottom: 10 }}
              />

              <label style={{ display: 'block', fontSize: '0.68rem', color: 'rgba(228,228,236,0.72)', marginBottom: 4 }}>
                Decart AI Key (for Live Video tab)
              </label>
              <input
                type="password"
                className="pip-key-input"
                placeholder="dk_... (optional)"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
              />

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 10, padding: '9px 12px', fontSize: '0.76rem' }}>
                Save Settings
              </button>

              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="pip-key-link"
              >
                <span>Get instant free Hugging Face token</span>
                <ExternalLink size={11} />
              </a>
            </form>
          </div>
        )}

        {snapNotice && <div className="pip-snap-badge">{snapNotice}</div>}
      </div>

      {/* Bottom Currently Selected Piece + Live Colors + Add to Bag */}
      <div className="pip-footer">
        <div className="pip-wearing-row">
          <button type="button" className="pip-step-btn" onClick={() => stepPiece(-1)} title="Previous piece">
            <ChevronLeft size={15} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pip-wearing-name">{product.name}</div>
            <div className="pip-wearing-sub">
              {colorway.name} · ${product.preorderPrice ?? product.price}
            </div>
          </div>

          <button type="button" className="pip-step-btn" onClick={() => stepPiece(1)} title="Next piece">
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="pip-bottom-actions">
          <div className="swatch-row">
            {product.colorways.map((cw) => (
              <button
                key={cw.id}
                type="button"
                className={`swatch-btn ${cw.id === colorway.id ? 'active' : ''}`}
                style={{ backgroundColor: cw.hex, width: 19, height: 19 }}
                title={`Switch color to ${cw.name}`}
                onClick={() => onSelectProduct(product, cw)}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ padding: '8px 13px', fontSize: '0.75rem' }}
            onClick={() => onAddToCart(product, recommendedSize, colorway)}
          >
            <ShoppingBag size={13} />
            <span>Add {recommendedSize}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
