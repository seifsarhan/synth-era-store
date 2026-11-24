import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import {
  CartItem,
  FitStyle,
  GarmentCategory,
  GarmentSize,
  Product,
  ProductColorway,
  SmartFitProfile,
} from './types';
import { PRODUCTS } from './data/products';
import { HeroSection } from './components/HeroSection';
import { CollectionRailSection } from './components/CollectionRailSection';
import { computeSmartFit, SmartLabSection } from './components/SmartLabSection';
import { OutfitBuilderSection } from './components/OutfitBuilderSection';
import { SuspendedInspectModal } from './components/SuspendedInspectModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingTryOnWidget } from './components/FloatingTryOnWidget';

interface RailCollectionMeta {
  id: string;
  category: GarmentCategory;
  indexLabel: string;
  shortLabel: string;
  eyebrow: string;
  titleLead: string;
  titleMuted: string;
  editorialNote: string;
}

const RAIL_COLLECTIONS: RailCollectionMeta[] = [
  {
    id: 'rail-hoodies',
    category: 'hoodies',
    indexLabel: '01 / HOODIES',
    shortLabel: 'Hoodies (10)',
    eyebrow: 'NEW COLLECTION · HEAVYWEIGHT STREETWEAR',
    titleLead: 'Layers that',
    titleMuted: 'hang right.',
    editorialNote: 'Crafted in 460–520 GSM sculpted loopback fleece. Cut oversized. Made to outlast.',
  },
  {
    id: 'rail-jackets',
    category: 'jackets',
    indexLabel: '02 / JACKETS',
    shortLabel: 'Jackets (10)',
    eyebrow: 'OUTER ARMOR · WEATHER-SEALED SHELLS',
    titleLead: 'Armor forged',
    titleMuted: 'for night.',
    editorialNote: 'Ballistic wet-sheen membranes & graphene thermal cores built for sub-zero city streets.',
  },
  {
    id: 'rail-pants',
    category: 'pants',
    indexLabel: '03 / PANTS',
    shortLabel: 'Pants (10)',
    eyebrow: 'LOWER ARCHITECTURE · ARTICULATED DRAPE',
    titleLead: 'Silhouettes',
    titleMuted: 'built to move.',
    editorialNote: '4-way kinetic cargo nylon, stacked selvedge denim & wide parachute volume cuts.',
  },
  {
    id: 'rail-tshirts',
    category: 'tshirts',
    indexLabel: '04 / T-SHIRTS',
    shortLabel: 'T-Shirts (10)',
    eyebrow: 'ESSENTIAL TEES · SHORT-SLEEVE DROPS',
    titleLead: 'Heavyweight cuts,',
    titleMuted: 'zero noise.',
    editorialNote: '300+ GSM drop-shoulder boxy tees with cyber-sigil graphics, chrome emblems & raw seams.',
  },
];

export function App() {
  const [scrolled, setScrolled] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [suspendedTarget, setSuspendedTarget] = useState<{
    category: GarmentCategory;
    index: number;
    colorway: ProductColorway;
  } | null>(null);
  const [tryOnTarget, setTryOnTarget] = useState<{
    product: Product;
    colorway: ProductColorway;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const productsByCategory = useMemo(
    () => ({
      hoodies: PRODUCTS.filter((p) => p.category === 'hoodies'),
      jackets: PRODUCTS.filter((p) => p.category === 'jackets'),
      pants: PRODUCTS.filter((p) => p.category === 'pants'),
      tshirts: PRODUCTS.filter((p) => p.category === 'tshirts'),
    }),
    []
  );

  const [fitProfile, setFitProfile] = useState<SmartFitProfile>(() => {
    const initial = computeSmartFit(178, 74, 'regular');
    return {
      heightCm: 178,
      weightKg: 74,
      fitStyle: 'regular',
      recommendedSize: initial.size,
      matchScore: initial.matchScore,
      locked: false,
    };
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3000);
  }, []);

  const handleUpdateFit = useCallback((heightCm: number, weightKg: number, fitStyle: FitStyle) => {
    const { size, matchScore } = computeSmartFit(heightCm, weightKg, fitStyle);
    setFitProfile({
      heightCm,
      weightKg,
      fitStyle,
      recommendedSize: size,
      matchScore,
      locked: false,
    });
  }, []);

  const handleLockFit = useCallback(() => {
    setFitProfile((prev) => ({ ...prev, locked: true }));
    showToast(`Smart Fit locked: Size ${fitProfile.recommendedSize} synced across SYNTH ERA`);
  }, [fitProfile.recommendedSize, showToast]);

  const handleAddToCart = useCallback(
    (product: Product, size: GarmentSize, colorway: ProductColorway) => {
      const key = `${product.id}-${size}-${colorway.id}`;
      setCart((prev) => {
        const existing = prev.find((i) => i.key === key);
        if (existing) {
          return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
        }
        return [...prev, { key, product, size, colorway, quantity: 1 }];
      });
      showToast(`Added ${product.name} (${size}) to Armor Bag`);
    },
    [showToast]
  );

  const handleAddKit = useCallback(
    (kitItems: Array<{ product: Product; size: GarmentSize; colorway: ProductColorway }>) => {
      setCart((prev) => {
        const next = [...prev];
        for (const entry of kitItems) {
          const key = `${entry.product.id}-${entry.size}-${entry.colorway.id}`;
          const existing = next.find((i) => i.key === key);
          if (existing) {
            existing.quantity += 1;
          } else {
            next.push({
              key,
              product: entry.product,
              size: entry.size,
              colorway: entry.colorway,
              quantity: 1,
            });
          }
        }
        return next;
      });
      setCartOpen(true);
      showToast('Complete 3-Piece Armor Kit added — 15% Bundle Discount unlocked!');
    },
    [showToast]
  );

  const handleUpdateQty = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemoveItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const totalBagCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div>
      {/* Floating Luxury Navbar */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <a href="#hero" className="nav-brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-word">SYNTH ERA</span>
        </a>

        <div className="nav-links">
          <a href="#rail-hoodies" className="nav-link">
            Hoodies
          </a>
          <a href="#rail-jackets" className="nav-link">
            Jackets
          </a>
          <a href="#rail-pants" className="nav-link">
            Pants
          </a>
          <a href="#rail-tshirts" className="nav-link">
            T-Shirts
          </a>
          <a href="#concept" className="nav-link">
            Smart Lab
          </a>
          <a href="#lookbook" className="nav-link">
            Lookbook
          </a>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="preorder-pill"
            onClick={() =>
              setSuspendedTarget({
                category: 'jackets',
                index: 0,
                colorway: productsByCategory.jackets[0].colorways[0],
              })
            }
          >
            Preorder
          </button>
          <button
            type="button"
            className="bag-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Open Armor Bag"
          >
            <ShoppingBag size={17} />
            {totalBagCount > 0 && <span className="bag-count">{totalBagCount}</span>}
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <HeroSection
        onInspectFlagship={(product) =>
          setSuspendedTarget({
            category: product.category,
            index: 0,
            colorway: product.colorways[0],
          })
        }
        onTryOnFlagship={(product) =>
          setTryOnTarget({ product, colorway: product.colorways[0] })
        }
      />

      {/* KINETIC EDITORIAL MARQUEE */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="marquee-item">
              <span>SYNTH ERA · SCENE RAIL 2027</span>
              <span className="marquee-dot" />
              <span>4 DEDICATED CURVED RAILS</span>
              <span className="marquee-dot" />
              <span>40 SMART STREETWEAR PIECES</span>
              <span className="marquee-dot" />
              <span>LIVE COLOR DYE &amp; AI TRY-ON</span>
              <span className="marquee-dot" />
              <span>LIMITED PRE-ORDERS LIVE</span>
              <span className="marquee-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* QUICK RAIL NAVIGATION PILLS */}
      <div id="collection" className="rail-jump-strip">
        {RAIL_COLLECTIONS.map((col) => (
          <a key={col.id} href={`#${col.id}`} className="rail-jump-pill">
            <span className="rail-jump-num">{col.indexLabel.split(' ')[0]}</span>
            <span>{col.shortLabel}</span>
          </a>
        ))}
      </div>

      {/* 4 SEPARATE INTERACTIVE CURVED HANGING RAILS (HOODIES, JACKETS, PANTS, T-SHIRTS) */}
      {RAIL_COLLECTIONS.map((col) => (
        <CollectionRailSection
          key={col.id}
          id={col.id}
          indexLabel={col.indexLabel}
          eyebrow={col.eyebrow}
          titleLead={col.titleLead}
          titleMuted={col.titleMuted}
          editorialNote={col.editorialNote}
          category={col.category}
          products={productsByCategory[col.category]}
          recommendedSize={fitProfile.recommendedSize}
          activeTryOnId={tryOnTarget?.product.id}
          onInspectSuspended={(_prod, cw, idx) =>
            setSuspendedTarget({ category: col.category, index: idx, colorway: cw })
          }
          onTryOn={(product, colorway) => setTryOnTarget({ product, colorway })}
          onAddToCart={handleAddToCart}
        />
      ))}

      {/* SMART FIT PREDICTOR & FABRIC X-RAY LAB */}
      <SmartLabSection
        fitProfile={fitProfile}
        onUpdateFit={handleUpdateFit}
        onLockFit={handleLockFit}
      />

      {/* INTERACTIVE OUTFIT ARCHITECT */}
      <OutfitBuilderSection
        recommendedSize={fitProfile.recommendedSize}
        onAddKit={handleAddKit}
      />

      {/* MINIMAL LUXURY FOOTER */}
      <footer className="site-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color: '#fff' }}>
            SYNTH ERA
          </span>
        </div>
        <div>MODERN ARMOR · SCENE RAIL ARCHITECTURE · DROP 01</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          NFC VERIFIED STUDIO EDITION
        </div>
      </footer>

      {/* SOLO SUSPENDED GARMENT INSPECTOR (MATCHING REEL FRAME 4!) */}
      {suspendedTarget && (
        <SuspendedInspectModal
          collectionProducts={productsByCategory[suspendedTarget.category]}
          initialIndex={suspendedTarget.index}
          initialColorway={suspendedTarget.colorway}
          recommendedSize={fitProfile.recommendedSize}
          onClose={() => setSuspendedTarget(null)}
          onTryOn={(product, colorway) => setTryOnTarget({ product, colorway })}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* FLOATING PICTURE-IN-PICTURE FREE AI TRY-ON + DECART LIVE */}
      {tryOnTarget && (
        <FloatingTryOnWidget
          product={tryOnTarget.product}
          colorway={tryOnTarget.colorway}
          recommendedSize={fitProfile.recommendedSize}
          onSelectProduct={(product, colorway) => setTryOnTarget({ product, colorway })}
          onAddToCart={handleAddToCart}
          onClose={() => setTryOnTarget(null)}
        />
      )}

      {/* SMART CART & PREORDER DRAWER */}
      {cartOpen && (
        <CartDrawer
          items={cart}
          recommendedSize={fitProfile.recommendedSize}
          onClose={() => setCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onQuickUpsell={handleAddToCart}
          onClearCart={() => setCart([])}
        />
      )}

      {/* FLOATING TOAST */}
      {toastMsg && (
        <div className="store-toast">
          <Check size={15} color="#c084fc" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default App;
