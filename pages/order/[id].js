import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import SiteNav from '../../components/SiteNav'
import CheckoutProgress from '../../components/CheckoutProgress'
import { authJson } from '../../lib/clientApi'
import { getStoredUserId } from '../../lib/session'

const PAYMENT_LABELS = {
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  cod: 'COD',
  dummy: 'Dummy',
}

export default function OrderConfirmation() {
  const router = useRouter()
  const { id } = router.query
  const [userId, setUserId] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setUserId(getStoredUserId())
  }, [])

  useEffect(() => {
    if (!router.isReady) {
      setLoading(true)
      return
    }

    if (!userId) {
      setLoading(false)
      return
    }

    if (!id) {
      setLoading(true)
      return
    }

    let active = true
    setOrder(null)
    setError('')
    setLoading(true)

    authJson(`/orders/detail/${id}`)
      .then(data => {
        if (!active) return
        if (!data?.id) {
          setOrder(null)
          setError('Detail pesanan tidak ditemukan')
          return
        }
        setOrder(data)
        setError('')
      })
      .catch(err => {
        if (!active) return
        setOrder(null)
        setError(err.message || 'Gagal memuat pesanan')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [router.isReady, id, userId])

  const paymentLabel = PAYMENT_LABELS[order?.payment_method] || order?.payment_method
  const subtotal = order?.items?.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 1), 0) || 0

  return (
    <div className="container">
      <SiteNav subtitle="Konfirmasi pesanan" />

      <div className="section-title">
        <div>
          <h2>Pesanan berhasil</h2>
          <p>Terima kasih. Pesanan Anda sudah kami terima.</p>
        </div>
      </div>

      <CheckoutProgress currentStep="complete" />

      <div className="detail-layout checkout-layout">
        <div className="panel stack checkout-main">
          {!userId ? (
            <div className="checkout-box">
              <h2>Silakan login dulu</h2>
              <Link className="button" href="/login">Login</Link>
            </div>
          ) : loading ? (
            <p className="muted">Memuat detail pesanan...</p>
          ) : error || !order ? (
            <div className="checkout-box">
              <h2>Pesanan tidak ditemukan</h2>
              <p className="muted">{error || 'Detail pesanan belum tersedia.'}</p>
              {id ? <p className="muted">Referensi: #{id}</p> : null}
              <Link className="button" href="/dashboard/buyer?tab=orders">Lihat pesanan saya</Link>
            </div>
          ) : (
            <>
              <div className="order-success-hero">
                <div className="order-success-icon" aria-hidden="true">✓</div>
                <div>
                  <p className="muted">Nomor pesanan</p>
                  <h2 className="order-number">#{order.id}</h2>
                  <p>
                    Status: <strong style={{ textTransform: 'uppercase' }}>{order.status}</strong> · 
                    Pembayaran: <strong>
                      {order.payment_status === 'pending'
                        ? (order.payment_receipt ? 'Menunggu Konfirmasi Penjual' : 'Belum Dibayar')
                        : order.payment_status === 'paid' ? 'LUNAS' : order.payment_status.toUpperCase()}
                    </strong>
                  </p>
                </div>
              </div>

              <section className="checkout-review panel stack">
                <h3>Detail pesanan</h3>
                <div className="summary-row">
                  <span className="muted">Metode pembayaran</span>
                  <strong>{paymentLabel}</strong>
                </div>
                {order.payment_receipt && (
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <span className="muted">Bukti Pembayaran</span>
                    <a href={order.payment_receipt} target="_blank" rel="noopener noreferrer">
                      <img src={order.payment_receipt} alt="Bukti Transfer" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, border: '1px solid var(--border)', marginTop: 4, objectFit: 'contain' }} />
                    </a>
                  </div>
                )}
                <div className="summary-row">
                  <span className="muted">Subtotal Produk</span>
                  <strong>Rp {subtotal.toLocaleString('id-ID')}</strong>
                </div>
                {Number(order.discount_amount || 0) > 0 && (
                  <div className="summary-row" style={{ color: 'var(--accent)' }}>
                    <span>Diskon Promo {order.voucher_code ? `(${order.voucher_code})` : ''}</span>
                    <strong>-Rp {Number(order.discount_amount).toLocaleString('id-ID')}</strong>
                  </div>
                )}
                <div className="summary-row">
                  <span className="muted">Ongkos Kirim</span>
                  <strong>Rp {Number(order.shipping_cost || 0).toLocaleString('id-ID')}</strong>
                </div>
                <div className="summary-row">
                  <span className="muted">Total Bayar</span>
                  <strong>Rp {Number(order.total_amount || 0).toLocaleString('id-ID')}</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
                  <span className="muted">Alamat pengiriman</span>
                  <p style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{order.address}</p>
                </div>
              </section>

              {order.items?.length ? (
                <section className="panel stack">
                  <h3>Item pesanan</h3>
                  <div className="order-summary-items">
                    {order.items.map(item => (
                      <div key={item.id} className="order-summary-item">
                        <img src={item.image || '/placeholder.png'} alt={item.title || `Product ${item.product_id}`} />
                        <div>
                          <strong>{item.title || `Product #${item.product_id}`}</strong>
                          <div className="muted">Qty {item.quantity}</div>
                        </div>
                        <strong>Rp {(Number(item.unit_price || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="checkout-actions">
                <Link className="button" href="/dashboard/buyer?tab=orders">Lihat pesanan saya</Link>
                <Link className="ghost-button" href="/">Lanjut belanja</Link>
              </div>
            </>
          )}
        </div>

        <aside className="checkout-box order-summary-sidebar order-summary-sidebar--sticky">
          <h2>Ringkasan</h2>
          {order ? (
            <>
              <div className="summary-row">
                <span className="muted">Nomor pesanan</span>
                <strong>#{order.id}</strong>
              </div>
              <div className="summary-row">
                <span className="muted">Pembayaran</span>
                <strong>{paymentLabel}</strong>
              </div>
              <div className="summary-row">
                <span className="muted">Subtotal</span>
                <strong>Rp {subtotal.toLocaleString('id-ID')}</strong>
              </div>
              {Number(order.discount_amount || 0) > 0 && (
                <div className="summary-row" style={{ color: 'var(--accent)' }}>
                  <span>Diskon</span>
                  <strong>-Rp {Number(order.discount_amount).toLocaleString('id-ID')}</strong>
                </div>
              )}
              <div className="summary-row">
                <span className="muted">Ongkir</span>
                <strong>Rp {Number(order.shipping_cost || 0).toLocaleString('id-ID')}</strong>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>Rp {Number(order.total_amount || 0).toLocaleString('id-ID')}</strong>
              </div>
              <p className="footer-note">Simpan nomor pesanan untuk melacak status pengiriman.</p>
            </>
          ) : (
            <p className="muted">Detail ringkasan akan muncul setelah pesanan dimuat.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
