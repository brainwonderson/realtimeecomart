import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import Link from 'next/link'
import SiteNav from '../components/SiteNav'
import CheckoutProgress from '../components/CheckoutProgress'
import OrderSummary from '../components/OrderSummary'
import PaymentMethodPicker from '../components/PaymentMethodPicker'
import { fetcher } from '../lib/api'
import { authJson } from '../lib/clientApi'
import { getStoredUserId } from '../lib/session'
import { SHIPPING_OPTIONS, calcShippingEstimate, formatAddress } from '../lib/checkout'

const STEP_ORDER = ['address', 'shipping', 'payment']

export default function Checkout() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [step, setStep] = useState('address')
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [manualAddress, setManualAddress] = useState('')
  const [shippingOption, setShippingOption] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('qris')
  const [submitting, setSubmitting] = useState(false)
  const [snapStatus, setSnapStatus] = useState(null) // null | 'opening' | 'pending'

  // Promo & Voucher state
  const [promoPreview, setPromoPreview] = useState(null)
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [appliedVoucherCode, setAppliedVoucherCode] = useState(null)
  const [voucherErrorMsg, setVoucherErrorMsg] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    setUserId(getStoredUserId())
  }, [])

  useEffect(() => {
    if (!router.isReady) return
    const requested = router.query.step
    if (!requested || !STEP_ORDER.includes(requested)) {
      router.replace({ pathname: '/checkout', query: { step: 'address' } }, undefined, { shallow: true })
      setStep('address')
      return
    }
    setStep(requested)
  }, [router.isReady, router.query.step])

  const { data: cartData } = useSWR(userId ? '/cart/' + userId : null, fetcher)
  const items = cartData || []

  // Load checkout preview with applied promos
  useEffect(() => {
    if (!userId || !items.length) return
    let active = true
    setLoadingPreview(true)
    authJson(`/orders/checkout-preview/${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        shippingOption,
        voucherCode: appliedVoucherCode
      })
    })
      .then(data => {
        if (!active) return
        setPromoPreview(data)
        if (data.voucherError) {
          setVoucherErrorMsg(data.voucherError)
        } else {
          setVoucherErrorMsg('')
        }
      })
      .catch(err => {
        if (!active) return
        console.error('Preview load error:', err)
      })
      .finally(() => {
        if (active) setLoadingPreview(false)
      })
    return () => { active = false }
  }, [userId, shippingOption, appliedVoucherCode, items.length])

  useEffect(() => {
    if (!userId) return
    let active = true
    authJson(`/account/addresses/${userId}`)
      .then(data => {
        if (!active) return
        const list = data || []
        setAddresses(list)
        const defaultAddress = list.find(address => address.is_default) || list[0]
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [userId])

  const selectedAddress = addresses.find(address => String(address.id) === String(selectedAddressId))
  const resolvedAddress = selectedAddress ? formatAddress(selectedAddress) : manualAddress.trim()
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
  const shippingEstimate = calcShippingEstimate(total, shippingOption, items.length > 0)

  function goToStep(nextStep) {
    setStep(nextStep)
    router.push({ pathname: '/checkout', query: { step: nextStep } }, undefined, { shallow: true })
  }

  function validateAddress() {
    if (!resolvedAddress) {
      alert('Pilih atau isi alamat pengiriman terlebih dahulu.')
      return false
    }
    return true
  }

  async function placeOrder() {
    if (!userId || !validateAddress()) return
    setSubmitting(true)
    setSnapStatus(null)

    try {
      const shippingLabel = SHIPPING_OPTIONS.find(option => option.id === shippingOption)?.label || shippingOption
      const fullAddress = selectedAddress
        ? `${selectedAddress.recipient_name} (${selectedAddress.phone})\n${resolvedAddress}`
        : resolvedAddress

      // 1. Buat order di backend → dapatkan snapToken
      const result = await authJson(`/orders/checkout/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          address: fullAddress,
          paymentMethod,
          shippingOption,
          voucherCode: appliedVoucherCode || null
        }),
      })

      if (!result?.orderId) {
        throw new Error('Nomor pesanan tidak diterima dari server')
      }

      const { orderId, snapToken } = result

      // 2. Jika ada snapToken, tampilkan popup Midtrans Snap
      if (snapToken && typeof window !== 'undefined' && window.snap) {
        setSnapStatus('opening')
        setSubmitting(false)

        window.snap.pay(snapToken, {
          // ✅ Pembayaran berhasil
          onSuccess(result) {
            console.log('[Snap] onSuccess:', result)
            // Update order status via backend (fallback jika webhook belum kena)
            authJson(`/orders/${orderId}/pay`, { method: 'POST' }).catch(() => {})
            // Redirect ke beranda dengan notifikasi sukses
            router.push('/?payment=success&orderId=' + orderId)
          },

          // ⏳ Menunggu pembayaran (transfer bank, dll)
          onPending(result) {
            console.log('[Snap] onPending:', result)
            setSnapStatus('pending')
            router.push(`/order/${orderId}?status=pending`)
          },

          // ❌ Pembayaran gagal
          onError(result) {
            console.error('[Snap] onError:', result)
            setSnapStatus(null)
            alert('Pembayaran gagal. Silakan coba lagi atau pilih metode lain.')
          },

          // 🚪 User menutup popup tanpa bayar
          onClose() {
            console.log('[Snap] onClose — user menutup popup')
            setSnapStatus(null)
            // Order sudah dibuat, arahkan ke halaman order agar user bisa bayar nanti
            router.push(`/order/${orderId}?status=unpaid`)
          },
        })
      } else {
        // Fallback: tidak ada Snap JS (mis. koneksi gagal), langsung ke order detail
        console.warn('[Snap] window.snap tidak tersedia, redirect langsung')
        router.push(`/order/${orderId}`)
      }
    } catch (err) {
      alert(err.message || 'Checkout gagal')
      setSubmitting(false)
      setSnapStatus(null)
    }
  }

  return (
    <div className="container">
      <SiteNav subtitle="Checkout" />

      <div className="section-title">
        <div>
          <h2>Checkout</h2>
          <p>Lengkapi alamat, pengiriman, dan pembayaran untuk menyelesaikan pesanan.</p>
        </div>
      </div>

      <CheckoutProgress currentStep={step} />

      {/* Overlay loading saat Snap sedang dibuka */}
      {snapStatus === 'opening' && (
        <div className="snap-loading-overlay">
          <div className="snap-loading-card">
            <div className="snap-spinner" />
            <p className="snap-loading-title">Membuka halaman pembayaran...</p>
            <p className="snap-loading-sub muted">Selesaikan pembayaran di popup Midtrans</p>
          </div>
        </div>
      )}

      <div className="detail-layout checkout-layout">
        <div className="panel stack checkout-main">
          {!userId ? (
            <div className="checkout-box">
              <h2>Silakan login dulu</h2>
              <p className="muted">Checkout membutuhkan akun yang sudah login.</p>
              <div className="stack">
                <Link className="button" href="/login">Login</Link>
                <Link className="ghost-button" href="/register">Register</Link>
              </div>
            </div>
          ) : !items.length ? (
            <div className="checkout-box">
              <h2>Cart masih kosong</h2>
              <p className="muted">Tambahkan produk ke cart sebelum checkout.</p>
              <Link className="button" href="/">Browse products</Link>
            </div>
          ) : step === 'address' ? (
            <section className="stack">
              <h3>Alamat pengiriman</h3>
              <p className="muted">Pilih alamat tersimpan atau isi alamat baru.</p>

              {addresses.length ? (
                <div className="address-picker">
                  {addresses.map(address => (
                    <label key={address.id} className={`address-card${String(selectedAddressId) === String(address.id) ? ' address-card--active' : ''}`}>
                      <input
                        type="radio"
                        name="address"
                        checked={String(selectedAddressId) === String(address.id)}
                        onChange={() => {
                          setSelectedAddressId(address.id)
                          setManualAddress('')
                        }}
                      />
                      <div>
                        <strong>{address.label}</strong>
                        <p className="muted">{address.recipient_name} · {address.phone}</p>
                        <p>{formatAddress(address)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada alamat tersimpan. Isi alamat manual di bawah.</p>
              )}

              <label className="stack">
                <span className="field-label">Atau isi alamat manual</span>
                <textarea
                  rows={4}
                  placeholder="Nama penerima, telepon, dan alamat lengkap"
                  value={manualAddress}
                  onChange={event => {
                    setManualAddress(event.target.value)
                    setSelectedAddressId(null)
                  }}
                />
              </label>

              <div className="checkout-actions">
                <Link className="ghost-button" href="/cart">Kembali ke cart</Link>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (validateAddress()) goToStep('shipping')
                  }}
                >
                  Lanjut ke pengiriman
                </button>
              </div>
            </section>
          ) : step === 'shipping' ? (
            <section className="stack">
              <h3>Metode pengiriman</h3>
              <p className="muted">Pilih kecepatan pengiriman yang Anda inginkan.</p>

              <div className="shipping-picker">
                {SHIPPING_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={`shipping-card${shippingOption === option.id ? ' shipping-card--active' : ''}`}
                    onClick={() => setShippingOption(option.id)}
                  >
                    <div>
                      <strong>{option.label}</strong>
                      <span className="muted">{option.eta}</span>
                    </div>
                    <strong>Rp {calcShippingEstimate(total, option.id, true).toLocaleString('id-ID')}</strong>
                  </button>
                ))}
              </div>

              <div className="checkout-actions">
                <button type="button" className="ghost-button" onClick={() => goToStep('address')}>Kembali</button>
                <button type="button" className="button" onClick={() => goToStep('payment')}>Lanjut ke pembayaran</button>
              </div>
            </section>
          ) : (
            <section className="stack">
              <h3>Metode pembayaran</h3>
              <p className="muted">Pilih cara pembayaran untuk pesanan ini.</p>

              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

              <div className="checkout-review panel stack">
                <h4>Ringkasan singkat</h4>
                <p className="muted">Alamat: {resolvedAddress}</p>
                <p className="muted">
                  Pengiriman: {SHIPPING_OPTIONS.find(option => option.id === shippingOption)?.label}
                </p>
              </div>

              <div className="checkout-actions">
                <button type="button" className="ghost-button" onClick={() => goToStep('shipping')}>Kembali</button>
                <button
                  type="button"
                  className="button"
                  disabled={submitting || paymentMethod === 'cod'}
                  onClick={placeOrder}
                  title={paymentMethod === 'cod' ? 'COD belum tersedia, pilih metode lain' : undefined}
                >
                  {submitting ? (
                    <span className="btn-loading">
                      <span className="btn-spinner" /> Memproses...
                    </span>
                  ) : (
                    'Konfirmasi & Bayar'
                  )}
                </button>
              </div>
            </section>
          )}
        </div>

        <OrderSummary
          items={items}
          shippingOption={shippingOption}
          onShippingChange={setShippingOption}
          showShippingOptions={step === 'shipping'}
          promoPreview={promoPreview}
        >
          <div className="promo-voucher-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700 }}>🎫 Punya Kode Voucher?</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Masukkan kode voucher"
                value={voucherCodeInput}
                onChange={e => setVoucherCodeInput(e.target.value.toUpperCase().trim())}
                disabled={!!appliedVoucherCode}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)'
                }}
              />
              {appliedVoucherCode ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setAppliedVoucherCode(null)
                    setVoucherCodeInput('')
                    setVoucherErrorMsg('')
                  }}
                  style={{ padding: '6px 12px', fontSize: 12, minWidth: 70 }}
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (voucherCodeInput) {
                      setAppliedVoucherCode(voucherCodeInput)
                    }
                  }}
                  style={{ padding: '6px 12px', fontSize: 12, minWidth: 70 }}
                >
                  Gunakan
                </button>
              )}
            </div>
            {voucherErrorMsg && (
              <p style={{ color: 'var(--red)', fontSize: 11, margin: '6px 0 0 0' }}>{voucherErrorMsg}</p>
            )}
            {appliedVoucherCode && !voucherErrorMsg && promoPreview?.appliedVoucher && (
              <p style={{ color: '#10b981', fontSize: 11, margin: '6px 0 0 0', fontWeight: 'bold' }}>
                ✓ Voucher "{promoPreview.appliedVoucher.name}" berhasil diterapkan!
              </p>
            )}
          </div>
        </OrderSummary>
      </div>
    </div>
  )
}
