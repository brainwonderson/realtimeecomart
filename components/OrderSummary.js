import { SHIPPING_OPTIONS, calcShippingEstimate } from '../lib/checkout'

export default function OrderSummary({
  items = [],
  shippingOption = 'standard',
  onShippingChange,
  showShippingOptions = false,
  sticky = true,
  promoPreview = null,
  children,
}) {
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
  
  const shippingEstimate = promoPreview 
    ? promoPreview.originalShippingCost 
    : calcShippingEstimate(total, shippingOption, items.length > 0)
    
  const checkoutDiscount = promoPreview ? promoPreview.checkoutDiscountAmount : 0
  const voucherDiscount = promoPreview ? promoPreview.voucherDiscountAmount : 0
  const shippingDiscount = promoPreview ? promoPreview.shippingDiscount : 0
  
  const grandTotal = promoPreview 
    ? promoPreview.grandTotal 
    : total + shippingEstimate

  const shippingLabel = SHIPPING_OPTIONS.find(option => option.id === shippingOption)?.label || 'Reguler'

  return (
    <aside className={`checkout-box order-summary-sidebar${sticky ? ' order-summary-sidebar--sticky' : ''}`}>
      <h2>Ringkasan order</h2>

      {items.length ? (
        <div className="order-summary-items">
          {items.map(item => (
            <div key={item.id || item.product_id} className="order-summary-item">
              <img src={item.image || '/placeholder.png'} alt={item.title || `Product ${item.product_id}`} />
              <div>
                <strong>{item.title || `Product #${item.product_id}`}</strong>
                {(item.selected_color || item.selected_size) && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    {item.selected_color && <span>{item.selected_color}</span>}
                    {item.selected_color && item.selected_size && <span>, </span>}
                    {item.selected_size && <span>{item.selected_size}</span>}
                  </div>
                )}
                <div className="muted">Qty {item.quantity}</div>
              </div>
              <strong>Rp {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Belum ada item di ringkasan.</p>
      )}

      <div className="summary-row">
        <span className="muted">Item</span>
        <strong>{itemCount}</strong>
      </div>
      <div className="summary-row">
        <span className="muted">Subtotal</span>
        <strong>Rp {total.toLocaleString('id-ID')}</strong>
      </div>

      {checkoutDiscount > 0 && (
        <div className="summary-row" style={{ color: '#8b5cf6' }}>
          <span>✨ Promo Checkout</span>
          <strong>-Rp {checkoutDiscount.toLocaleString('id-ID')}</strong>
        </div>
      )}

      {voucherDiscount > 0 && (
        <div className="summary-row" style={{ color: 'var(--accent)' }}>
          <span>🎫 Diskon Voucher</span>
          <strong>-Rp {voucherDiscount.toLocaleString('id-ID')}</strong>
        </div>
      )}

      <div className="summary-row">
        <span className="muted">Ongkir ({shippingLabel})</span>
        <strong>Rp {shippingEstimate.toLocaleString('id-ID')}</strong>
      </div>

      {shippingDiscount > 0 && (
        <div className="summary-row" style={{ color: '#10b981' }}>
          <span>🚚 Subsidi Ongkir</span>
          <strong>-Rp {shippingDiscount.toLocaleString('id-ID')}</strong>
        </div>
      )}

      {showShippingOptions ? (
        <div className="shipping-options">
          {SHIPPING_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              className={shippingOption === option.id ? 'chip active-chip' : 'chip'}
              onClick={() => onShippingChange?.(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="summary-total">
        <span>Total</span>
        <strong>Rp {grandTotal.toLocaleString('id-ID')}</strong>
      </div>

      {children}
    </aside>
  )
}
