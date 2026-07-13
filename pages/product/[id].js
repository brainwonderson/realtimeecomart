import { useRouter } from 'next/router'
import useSWR from 'swr'
import { fetcher } from '../../lib/api'
import { getStoredToken, getStoredUserId } from '../../lib/session'
import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import SiteNav from '../../components/SiteNav'

const demoProduct = {
  id: 1,
  title: 'Wireless Headphone',
  price: 299000,
  image: 'https://picsum.photos/seed/headphone/600/600',
  description: 'Contoh halaman detail produk untuk menampilkan layout, gambar, deskripsi, dan tombol add to cart.',
  store_id: null,
  store_name: null,
  store_logo: null,
  store_is_open: null,
  seller_name: null,
  store_total_products: 0,
}

function StarRow({ rating = 5 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? '#f59e0b' : 'var(--text-muted)', fontSize: 14 }}>★</span>
      ))}
    </span>
  )
}

export default function ProductPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: product } = useSWR(id ? `/products/${id}` : null, fetcher)
  const [userId, setUserId] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [qty, setQty] = useState(1)
  const routeProductId = Number(id)

  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const { data: reviews, mutate: mutateReviews } = useSWR(id ? `/reviews/product/${id}` : null, fetcher)

  // Chat states
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef(null)

  // Variant states
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [activeMedia, setActiveMedia] = useState(null)

  useEffect(() => {
    setUserId(getStoredUserId())
  }, [])

  const item = product || demoProduct

  useEffect(() => {
    if (item?.image) {
      setActiveMedia({ url: item.image, type: 'image' })
    }
  }, [product])

  // Poll chat messages when chat box is open
  useEffect(() => {
    if (!chatOpen || !item.seller_id || !userId) return
    let active = true

    async function fetchMessages() {
      try {
        const token = getStoredToken()
        if (!token) return
        const response = await fetch(`/api/chats/messages/${item.seller_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) return
        const data = await response.json()
        if (active) {
          setChatMessages(data)
        }
      } catch (err) {
        console.error('Error fetching chat messages:', err)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [chatOpen, item.seller_id, userId])

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const handleOpenChat = () => {
    if (!getStoredUserId()) {
      alert('Silakan login terlebih dahulu untuk memulai chat dengan penjual.')
      router.push('/login')
      return
    }
    setChatOpen(true)
  }

  async function handleSendChatMessage(e) {
    e.preventDefault()
    if (!chatInput.trim() || !item.seller_id || isSending) return
    const token = getStoredToken()
    if (!token) {
      alert('Silakan login terlebih dahulu untuk mengirim pesan.')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: item.seller_id,
          message: chatInput.trim(),
          productId: item.id
        })
      })

      if (!response.ok) {
        throw new Error('Gagal mengirim pesan')
      }

      const newMessage = await response.json()
      setChatMessages(prev => [...prev, newMessage])
      setChatInput('')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const inStock = Number(item.stock ?? 1) > 0

  async function handleAddToCart() {
    const activeUserId = getStoredUserId() || userId
    if (!activeUserId) {
      alert('Silakan login atau register dulu agar cart tersimpan ke akun Anda.')
      return
    }
    if (!routeProductId) {
      alert('ID produk belum siap. Tunggu halaman selesai dimuat lalu coba lagi.')
      return
    }

    // Variant validation
    const colorOptions = item?.colors ? item.colors.split(',').map(c => c.trim()).filter(Boolean) : []
    const sizeOptions = item?.sizes ? item.sizes.split(',').map(s => s.trim()).filter(Boolean) : []

    if (colorOptions.length > 0 && !selectedColor) {
      alert('Silakan pilih varian Warna terlebih dahulu.')
      return
    }
    if (sizeOptions.length > 0 && !selectedSize) {
      alert('Silakan pilih varian Ukuran terlebih dahulu.')
      return
    }

    setAddingToCart(true)
    try {
      const response = await fetch('/api/cart/' + activeUserId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: routeProductId,
          quantity: qty,
          selectedColor,
          selectedSize
        })
      })
      if (!response.ok) { alert('Gagal menambahkan ke cart'); return }
      window.dispatchEvent(new Event('cart-updated'))
      alert('Produk ditambahkan ke keranjang!')
      router.push('/cart')
    } finally {
      setAddingToCart(false)
    }
  }

  async function submitReview() {
    const token = getStoredToken()
    const activeUserId = getStoredUserId() || userId
    if (!token || !activeUserId) { alert('Silakan login dulu'); return }
    const response = await fetch('/api/reviews/product/' + routeProductId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ rating, comment: reviewText })
    })
    if (!response.ok) { alert('Gagal kirim review'); return }
    setReviewText('')
    setRating(5)
    mutateReviews()
  }

  return (
    <div>
      <SiteNav subtitle="Detail Produk" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 64px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--accent)' }}>Beranda</Link>
          <span>›</span>
          {item.category && <><Link href={`/?category=${item.category}`} style={{ color: 'var(--accent)' }}>{item.category}</Link><span>›</span></>}
          <span style={{ color: 'var(--text-secondary)' }}>{item.title}</span>
        </div>

        <div className="detail-layout">
          {/* ── Gambar Produk ── */}
          <div>
            <div className="detail-image" style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center', aspectRatio: '1/1' }}>
              {activeMedia?.type === 'video' ? (
                <video src={activeMedia.url} controls autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <img src={activeMedia?.url || item.image || '/placeholder.png'} alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              )}
            </div>
            {/* Thumbnail strip */}
            {(() => {
              const mediaList = [];
              if (item?.image) mediaList.push({ url: item.image, type: 'image' });
              if (item?.media) {
                try {
                  const parsed = typeof item.media === 'string' ? JSON.parse(item.media) : item.media;
                  if (Array.isArray(parsed)) {
                    parsed.forEach(m => {
                      if (m && m.url) mediaList.push(m);
                    });
                  }
                } catch (e) {
                  console.error(e);
                }
              }
              if (mediaList.length <= 1) return null;
              return (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {mediaList.map((media, i) => {
                    const isActive = activeMedia?.url === media.url;
                    const isVideo = media.type === 'video';
                    return (
                      <div
                        key={i}
                        onMouseEnter={() => setActiveMedia(media)}
                        onClick={() => setActiveMedia(media)}
                        style={{
                          width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
                          border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: 'var(--bg-elevated)', cursor: 'pointer', flexShrink: 0,
                          position: 'relative'
                        }}
                      >
                        {isVideo ? (
                          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14 }}>
                              ▶
                            </div>
                          </div>
                        ) : (
                          <img src={media.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ── Info Produk ── */}
          <aside>
            {/* Status */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: inStock ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: inStock ? '#10b981' : 'var(--red)', borderColor: inStock ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                {inStock ? '✓ Stok Tersedia' : '✗ Habis'}
              </span>
              {item.category && <span className="chip">{item.category}</span>}
            </div>

            <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: '-0.03em' }}>
              {item.title}
            </h1>

            {/* Rating baris */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <StarRow rating={4.8} />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>4.8</span>
              <span style={{ color: 'var(--text-muted)' }}>({(reviews || []).length} ulasan)</span>
              {item.stock !== undefined && (
                <><span style={{ color: 'var(--border)' }}>|</span>
                  <span style={{ color: 'var(--text-muted)' }}>Stok: {item.stock}</span></>
              )}
            </div>

            {/* Harga */}
            <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
              {item.original_price && Number(item.original_price) > Number(item.price) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    Rp {Number(item.original_price).toLocaleString('id-ID')}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--red)', color: '#fff' }}>
                    -{Math.round(((Number(item.original_price) - Number(item.price)) / Number(item.original_price)) * 100)}%
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🔥 PROMO SELLER
                  </span>
                </div>
              )}
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange-light)', letterSpacing: '-0.04em' }}>
                Rp {Number(item.price || 0).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {item.original_price && Number(item.original_price) > Number(item.price) ? 'Harga promo toko khusus' : 'Harga sudah termasuk pajak'}
              </div>
            </div>

            {/* Deskripsi */}
            {item.description && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Deskripsi Produk</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.description}</p>
              </div>
            )}

            {/* Pilihan Varian */}
            {(() => {
              const colorOptions = item?.colors ? item.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
              const sizeOptions = item?.sizes ? item.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
              if (colorOptions.length === 0 && sizeOptions.length === 0) return null;
              return (
                <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {colorOptions.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Warna: <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{selectedColor || 'Pilih Warna'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {colorOptions.map(color => {
                          const isSelected = selectedColor === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSelectedColor(color)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: 8,
                                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: isSelected ? 'rgba(59,130,246,0.1)' : 'var(--bg-elevated)',
                                color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                fontWeight: isSelected ? 800 : 500,
                                fontSize: 12,
                                cursor: 'pointer',
                                transition: 'all 100ms'
                              }}
                            >
                              {color}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sizeOptions.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        Ukuran: <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{selectedSize || 'Pilih Ukuran'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sizeOptions.map(size => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(size)}
                              style={{
                                padding: '8px 14px',
                                borderRadius: 8,
                                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: isSelected ? 'rgba(59,130,246,0.1)' : 'var(--bg-elevated)',
                                color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                fontWeight: isSelected ? 800 : 500,
                                fontSize: 12,
                                cursor: 'pointer',
                                transition: 'all 100ms'
                              }}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Qty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Jumlah:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width: 36, height: 36, background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                  −
                </button>
                <span style={{ minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{qty}</span>
                <button type="button" onClick={() => setQty(q => q + 1)}
                  style={{ width: 36, height: 36, background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                  +
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button
                className="button"
                disabled={!routeProductId || !inStock || addingToCart}
                onClick={handleAddToCart}
                id="add-to-cart-btn"
                style={{ flex: 1, padding: '14px', fontSize: 14 }}
              >
                {addingToCart ? '⏳ Menambahkan...' : '🛒 Tambah ke Keranjang'}
              </button>
              <Link href="/cart" className="ghost-button" style={{ padding: '14px', textAlign: 'center', fontSize: 14 }}>
                Keranjang
              </Link>
            </div>

            {/* ── CARD INFO TOKO SELLER ── */}
            {item.store_id ? (
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                {/* Header toko */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dijual oleh
                  </span>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                  {/* Logo toko */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, background: 'var(--bg-primary)',
                    border: '1px solid var(--border)', overflow: 'hidden', display: 'grid', placeItems: 'center',
                    fontSize: 22, flexShrink: 0
                  }}>
                    {item.store_logo
                      ? <img src={item.store_logo} alt={item.store_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🏪'}
                  </div>
                  {/* Info toko */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{item.store_name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                        background: item.store_is_open ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                        color: item.store_is_open ? '#10b981' : '#64748b',
                        border: `1px solid ${item.store_is_open ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.2)'}`,
                      }}>
                        {item.store_is_open ? 'Buka' : 'Tutup'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.store_total_products > 0 && <span>{item.store_total_products} produk aktif</span>}
                      {item.seller_name && <span> · Penjual: {item.seller_name}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 16px 14px', display: 'flex', gap: 10 }}>
                  <Link
                    href={`/store/${item.store_id}`}
                    id="visit-store-btn"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
                      transition: 'border-color 150ms',
                    }}
                  >
                    🏪 Kunjungi Toko
                  </Link>
                  {(!userId || Number(userId) !== Number(item.seller_id)) && (
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      id="chat-seller-btn"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', transition: 'border-color 150ms',
                      }}
                    >
                      💬 Chat Penjual
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Produk tanpa toko (demo/admin) */
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                🏪 Dijual langsung oleh EcoMart
              </div>
            )}

            {/* Keunggulan belanja */}
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { icon: '🚚', text: 'Gratis ongkir min. pembelian Rp 50.000' },
                { icon: '🔒', text: 'Pembayaran aman & terenkripsi' },
                { icon: '↩️', text: 'Retur mudah dalam 30 hari' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ── Review & Rating ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28 }}>
          {/* Form review */}
          <div className="panel stack">
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Tulis Ulasan</h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rating:</span>
              {[5, 4, 3, 2, 1].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: n <= rating ? '#f59e0b' : 'var(--text-muted)', padding: '2px' }}>
                  ★
                </button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{rating} bintang</span>
            </div>
            <textarea
              rows={4}
              placeholder="Bagikan pengalaman Anda dengan produk ini..."
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, resize: 'vertical' }}
              id="review-textarea"
            />
            <button className="button" onClick={submitReview} disabled={!reviewText.trim()} id="submit-review-btn">
              Kirim Ulasan
            </button>
          </div>

          {/* Daftar review */}
          <div className="panel stack">
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Ulasan Pembeli ({(reviews || []).length})
            </h2>
            <div className="review-list">
              {(reviews || []).length ? reviews.map(r => (
                <div key={r.id} className="review-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.user_name || 'User'}</strong>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StarRow rating={r.rating} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.rating}/5</span>
                    </span>
                  </div>
                  {r.comment && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.comment}</p>}
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                  Belum ada ulasan. Jadilah yang pertama!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      {chatOpen && (
        <div className="chat-assistant-card" style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 360,
          height: 480,
          zIndex: 9999,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div className="chat-assistant-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>💬</div>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>{item.store_name || item.seller_name || 'Penjual'}</strong>
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Tanya Penjual</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 4
              }}
            >
              ✕
            </button>
          </div>

          {/* Context Product Card */}
          <div style={{
            display: 'flex',
            gap: 10,
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border)',
            alignItems: 'center'
          }}>
            <img src={item.image || '/placeholder.png'} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--orange-light)', fontWeight: 700 }}>Rp {Number(item.price || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>

          {/* Messages Body */}
          <div className="mobile-chat-body" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--bg-primary)'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40, padding: 20 }}>
                Belum ada percakapan. Kirim pesan untuk memulai chat!
              </div>
            ) : (
              chatMessages.map(msg => {
                const isMe = Number(msg.sender_id) === Number(userId)
                return (
                  <div key={msg.id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '14px 14px 0 14px' : '14px 14px 14px 0',
                      background: isMe ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isMe ? '#fff' : 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}>
                      {msg.message}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendChatMessage} className="mobile-chat-input" style={{
            padding: '10px 12px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8
          }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Tulis pertanyaan..."
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13
              }}
              disabled={isSending}
            />
            <button
              type="submit"
              className="button"
              style={{
                padding: '0 14px',
                borderRadius: 8,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={!chatInput.trim() || isSending}
            >
              {isSending ? '⏳' : 'Kirim'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
