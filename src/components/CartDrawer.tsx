import React, { useState } from 'react';
import { CheckCircle2, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { CartItem, GarmentSize, Product, ProductColorway } from '../types';
import { PRODUCTS } from '../data/products';
import { SmartGarmentImage } from './SmartGarmentImage';

interface CartDrawerProps {
  items: CartItem[];
  recommendedSize: GarmentSize;
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onQuickUpsell: (product: Product, size: GarmentSize, colorway: ProductColorway) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  recommendedSize,
  onClose,
  onUpdateQty,
  onRemove,
  onQuickUpsell,
  onClearCart,
}) => {
  const [orderSerial, setOrderSerial] = useState<string | null>(null);

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.preorderPrice ?? item.product.price) * item.quantity,
    0
  );
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasBundleDiscount = totalCount >= 3;
  const discountAmount = hasBundleDiscount ? Math.round(subtotal * 0.15) : 0;
  const finalTotal = subtotal - discountAmount;

  // Smart Contextual Upsell: suggest a missing category piece
  const ownedIds = new Set(items.map((i) => i.product.id));
  const upsellCandidate = PRODUCTS.find((p) => !ownedIds.has(p.id));

  const handleCheckout = () => {
    const code = `SE01-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderSerial(code);
    onClearCart();
  };

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={18} color="#c084fc" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.06em' }}>
              ARMOR BAG ({totalCount})
            </span>
          </div>
          <button type="button" className="btn-ghost" style={{ padding: 8 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {orderSerial ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, padding: '20px 10px' }}>
            <CheckCircle2 size={54} color="#c084fc" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', letterSpacing: '0.04em' }}>
              PRE-ORDER RESERVED
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'rgba(228,228,236,0.68)', lineHeight: 1.6 }}>
              Your numbered Drop 01 allocation is locked in. Your garment&apos;s NFC passport will activate upon studio dispatch.
            </p>
            <div style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(132,41,239,0.16)', border: '1px solid rgba(168,85,247,0.45)', fontFamily: 'var(--font-mono)', fontSize: '0.96rem', color: '#f3e8ff', letterSpacing: '0.12em' }}>
              PASS #{orderSerial}
            </div>
            <button type="button" className="btn-primary" style={{ marginTop: 10, padding: '12px 24px' }} onClick={onClose}>
              Return to SYNTH ERA
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, color: 'rgba(228,228,236,0.55)' }}>
            <ShoppingBag size={36} strokeWidth={1.3} />
            <div style={{ fontSize: '0.92rem', color: '#fff' }}>Your armor bag is empty</div>
            <p style={{ fontSize: '0.8rem', maxWidth: 250 }}>
              Explore Drop 01 or build a 3-piece Armor Kit to unlock 15% off.
            </p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.key} className="cart-item">
                  <div className="cart-thumb">
                    <SmartGarmentImage
                      src={item.product.image}
                      category={item.product.category}
                      designId={item.product.designId}
                      alt={item.product.name}
                      colorway={item.colorway}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#fff' }}>
                        {item.product.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.key)}
                        style={{ background: 'none', border: 'none', color: 'rgba(228,228,236,0.45)', cursor: 'pointer' }}
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(228,228,236,0.58)', marginTop: 2 }}>
                      {item.colorway.name} · Size {item.size}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '2px 6px' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, -1)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.key, 1)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', fontWeight: 600 }}>
                        ${(item.product.preorderPrice ?? item.product.price) * item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Smart Complete-Your-Armor Upsell */}
              {upsellCandidate && (
                <div style={{ padding: 12, borderRadius: 14, background: 'rgba(132,41,239,0.09)', border: '1px dashed rgba(168,85,247,0.38)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.66rem', color: '#d8b4fe', marginBottom: 8 }}>
                    <Sparkles size={12} />
                    <span>SMART MATCH · COMPLETE YOUR ARMOR</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{upsellCandidate.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(228,228,236,0.58)' }}>
                        Size {recommendedSize} · ${upsellCandidate.preorderPrice ?? upsellCandidate.price}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: '6px 11px', fontSize: '0.74rem' }}
                      onClick={() =>
                        onQuickUpsell(upsellCandidate, recommendedSize, upsellCandidate.colorways[0])
                      }
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.09)' }}>
              {hasBundleDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#d8b4fe', marginBottom: 8 }}>
                  <span>Armor Kit Bundle (15% Off)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>-${discountAmount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <span style={{ fontSize: '0.86rem', color: 'rgba(228,228,236,0.7)' }}>Pre-Order Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 600 }}>
                  ${finalTotal}
                </span>
              </div>

              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '14px 20px', fontSize: '0.9rem' }}
                onClick={handleCheckout}
              >
                <ShieldCheck size={17} />
                <span>Lock Pre-Order Allocation</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};
