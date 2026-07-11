import { useState } from 'react'

const METHODS = [
  {
    id: 'qris',
    label: 'QRIS',
    description: 'Scan & bayar instan',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="6" width="14" height="14" rx="2" fill="currentColor" opacity="0.9" />
        <rect x="28" y="6" width="14" height="14" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="6" y="28" width="14" height="14" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="28" y="28" width="8" height="8" rx="1" fill="currentColor" />
        <rect x="38" y="28" width="4" height="8" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="28" y="38" width="14" height="4" rx="1" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'transfer',
    label: 'Transfer Bank',
    description: 'Virtual account / rekening',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 18h32v4H8z" fill="currentColor" opacity="0.7" />
        <path d="M10 22h28v16a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V22z" fill="currentColor" opacity="0.35" />
        <path d="M14 30h8v6h-8zM26 30h8v6h-8z" fill="currentColor" />
        <path d="M6 14l18-8 18 8v4H6z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'cod',
    label: 'COD',
    description: 'Bayar di tempat',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 16h28l-4 18H14L10 16z" fill="currentColor" opacity="0.35" />
        <path d="M8 12h32v6H8z" fill="currentColor" />
        <circle cx="18" cy="38" r="3" fill="currentColor" />
        <circle cx="32" cy="38" r="3" fill="currentColor" />
        <path d="M18 20h12v4H18z" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
]

export default function PaymentMethodPicker({ value = 'qris', onChange }) {
  return (
    <div>
      <div className="payment-method-grid" role="radiogroup" aria-label="Metode pembayaran">
        {METHODS.map(method => {
          const selected = value === method.id
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`payment-method-card${selected ? ' payment-method-card--active' : ''}`}
              onClick={() => onChange?.(method.id)}
            >
              <span className="payment-method-icon">{method.icon}</span>
              <span className="payment-method-copy">
                <strong>{method.label}</strong>
                <span className="muted">{method.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel detail sesuai metode yang dipilih */}
      {value === 'qris' && (
        <div className="payment-detail-panel payment-detail-qris">
          <div className="qris-header">
            <svg className="qris-check-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#16a34a" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="qris-title">Scan QRIS untuk membayar</p>
              <p className="qris-subtitle muted">Gunakan aplikasi mobile banking atau e-wallet apapun</p>
            </div>
          </div>
          <div className="qris-image-wrapper">
            <img
              src="/images/qris.png"
              alt="QRIS Sarah Fashion Anugra – NMID: ID1021138838268"
              className="qris-image"
            />
          </div>
          <div className="qris-steps">
            <div className="qris-step">
              <span className="qris-step-num">1</span>
              <span>Buka aplikasi bank / e-wallet</span>
            </div>
            <div className="qris-step">
              <span className="qris-step-num">2</span>
              <span>Pilih fitur Scan QR / QRIS</span>
            </div>
            <div className="qris-step">
              <span className="qris-step-num">3</span>
              <span>Arahkan kamera ke QR di atas</span>
            </div>
            <div className="qris-step">
              <span className="qris-step-num">4</span>
              <span>Konfirmasi nominal & bayar</span>
            </div>
          </div>
        </div>
      )}

      {value === 'cod' && (
        <div className="payment-detail-panel payment-detail-cod">
          <div className="cod-unavailable">
            <svg className="cod-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#f59e0b" />
              <path d="M12 7v5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.2" fill="#fff" />
            </svg>
            <div>
              <p className="cod-title">COD Belum Tersedia</p>
              <p className="cod-desc muted">
                Maaf, metode pembayaran <strong>Cash on Delivery (COD)</strong> saat ini belum bisa digunakan.
                Silakan pilih metode pembayaran lain seperti <strong>QRIS</strong> atau <strong>Transfer Bank</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
