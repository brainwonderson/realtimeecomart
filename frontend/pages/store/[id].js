import { useRouter } from 'next/router'
import useSWR from 'swr'
import { API_BASE, fetcher } from '../../lib/api'
import { getStoredUserId } from '../../lib/session'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SiteNav from '../../components/SiteNav'

function StarRow({ rating = 5, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < Math.round(rating) ? '#f59e0b' : 'var(--text-muted)', fontSize: size }}>★</span>
      ))}
    </span>
  )
}

export default function StorePage() {
  const router = useRouter()
  const { id } = router.query

  const { data: store, error: storeError } = useSWR(id ? `/stores/${id}` : null, fetcher)
  const { data: products } = useSWR(id ? `/stores/${id}/products` : null, fetcher)
  const [sort, setSort] = useState('newest')
  const [wishlistIds, setWishlistIds] = useState([])
  const [storeBanners, setStoreBanners] = useState([])
  const [bannerSlide, setBannerSlide] = useState(0)

  // Fetch seller banners for this store
  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/seller/banners/public/${id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setStoreBanners(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [id])

  // Auto-rotate banner
  useEffect(() => {
    if (storeBanners.length <= 1) return
    const t = setInterval(() => setBannerSlide(s => (s + 1) % storeBanners.length), 4000)
    return () => clearInterval(t)
  }, [storeBanners.length])

  const isLoading = !store && !storeError

  function toggleWishlist(productId) {
    setWishlistIds(prev => {
      const next = prev.includes(productId) ? prev.filter(i => i !== productId) : [...prev, productId]
      try { localStorage.setItem('wishlist', JSON.stringify(next)) } catch { }
      return next
    })
  }

  async function addToCart(product) {
    const userId = getStoredUserId()
    if (!userId) { alert('Silakan login dulu untuk menambahkan ke keranjang.'); return }
    const res = await fetch(`http://localhost:4000/api/cart/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: 1 })
    })
    if (!res.ok) { alert('Gagal menambahkan ke cart'); return }
    window.dispatchEvent(new Event('cart-updated'))
    alert('Ditambahkan ke keranjang!')
  }

  const sortedProducts = [...(products || [])].sort((a, b) => {
    if (sort === 'price_asc')  return Number(a.price) - Number(b.price)
    if (sort === 'price_desc') return Number(b.price) - Number(a.price)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const discounts = [40, 50, 30, 45, 60, 35, 55, 25]

  if (storeError) {
    return (
      <div>
        <SiteNav />
        <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏚️</div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Toko Tidak Ditemukan</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Toko ini mungkin sudah tutup atau tidak ada.</p>
          <Link href="/" className="button">← Kembali ke Beranda</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SiteNav subtitle={store ? `Toko: ${store.name}` : 'Profil Toko'} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 64px' }}>

        {/* ── Store Banner ── */}
        <div style={{ position: 'relative', height: store?.banner ? 240 : 160, background: 'linear-gradient(135deg, #0d1b3e 0%, #0a1628 100%)', overflow: 'hidden' }}>
          {store?.banner && (
            <img src={store.banner} alt="Banner toko"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.7 }} />
          )}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(13,17,23,0.9) 100%)' }} />
        </div>

        {/* ── Store Header ── */}
        <div style={{ padding: '0 24px', marginTop: -40, position: 'relative', zIndex: 1, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{
              width: 80, height: 80, borderRadius: 16, border: '3px solid var(--bg-primary)',
              background: 'var(--bg-card)', overflow: 'hidden', display: 'grid', placeItems: 'center',
              fontSize: 32, flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
              {store?.logo
                ? <img src={store.logo} alt={store?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (isLoading ? '⏳' : '🏪')}
            </div>

            {/* Info */}
            <div style={{ flex: 1, paddingBottom: 4 }}>
              {isLoading ? (
                <div style={{ height: 28, width: 200, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 8 }} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {store?.name}
                    </h1>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                      background: store?.is_open ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                      color: store?.is_open ? '#10b981' : '#64748b',
                      border: `1px solid ${store?.is_open ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                      {store?.is_open ? '● Toko Buka' : '● Toko Tutup'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {store?.seller_name && <span>👤 {store.seller_name}</span>}
                    <span>📦 {(products || []).length} produk</span>
                    {store?.created_at && (
                      <span>📅 Bergabung sejak {new Date(store.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}</span>
                    )}
                  </div>
                  {store?.description && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
                      {store.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0, paddingBottom: 4 }}>
              <Link href="/" style={{ color: 'var(--accent)' }}>Beranda</Link>
              <span>›</span>
              <span>Toko</span>
              <span>›</span>
              <span style={{ color: 'var(--text-secondary)' }}>{store?.name || '...'}</span>
            </div>
          </div>
        </div>

        {/* ── Seller Banner Slider ── */}
        {storeBanners.length > 0 && (
          <div style={{ padding: '0 24px', marginBottom: 20 }}>
            <div className="promo-banner-slider" aria-label="Banner promo toko">
              <div className="promo-banner-track" style={{ transform: `translateX(-${bannerSlide * 100}%)` }}>
                {storeBanners.map((b) => (
                  b.link_url ? (
                    <a key={b.id} href={b.link_url} className="promo-banner-slide" target="_blank" rel="noopener noreferrer">
                      <img src={b.image} alt={b.title} className="promo-banner-img" />
                      <div className="promo-banner-caption">{b.title}</div>
                    </a>
                  ) : (
                    <div key={b.id} className="promo-banner-slide">
                      <img src={b.image} alt={b.title} className="promo-banner-img" />
                      <div className="promo-banner-caption">{b.title}</div>
                    </div>
                  )
                ))}
              </div>
              {storeBanners.length > 1 && (
                <>
                  <button className="promo-banner-prev" onClick={() => setBannerSlide(s => (s - 1 + storeBanners.length) % storeBanners.length)} aria-label="Sebelumnya">‹</button>
                  <button className="promo-banner-next" onClick={() => setBannerSlide(s => (s + 1) % storeBanners.length)} aria-label="Berikutnya">›</button>
                  <div className="promo-banner-dots">
                    {storeBanners.map((_, i) => (
                      <button key={i} className={i === bannerSlide ? 'promo-banner-dot active' : 'promo-banner-dot'} onClick={() => setBannerSlide(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '0 24px' }}>
          {/* ── Products Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                Semua Produk
              </span>
              {products && (
                <span className="chip" style={{ fontSize: 12 }}>{products.length} produk</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Urutkan:</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                id="store-sort-select"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13 }}
              >
                <option value="newest">Terbaru</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
              </select>
            </div>
          </div>

          {/* ── Product Grid ── */}
          {isLoading ? (
            <div className="grid skeleton-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <article key={i} className="product-card skeleton-card" aria-hidden="true">
                  <div className="skeleton-media" />
                  <div className="product-body">
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line skeleton-line--long" />
                    <div className="skeleton-line skeleton-line--medium" />
                  </div>
                </article>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Belum ada produk</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: 14 }}>
                {store?.is_open ? 'Toko ini belum menambahkan produk.' : 'Toko ini sedang tutup.'}
              </p>
              <Link href="/" className="button">← Lihat Produk Lainnya</Link>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {sortedProducts.map((p, index) => {
                const hasRealDiscount = p.original_price && Number(p.original_price) > Number(p.price)
                const disc = hasRealDiscount 
                  ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100)
                  : discounts[index % discounts.length]
                const originalPrice = hasRealDiscount 
                  ? Number(p.original_price)
                  : Math.round(Number(p.price) * (1 + disc / 100))
                const wishlisted = wishlistIds.includes(p.id)
                const inStock = Number(p.stock || 0) > 0

                return (
                  <article key={p.id} className="product-card" id={`store-product-${p.id}`}>
                    <div className="product-media">
                      <Link href={`/product/${p.id}`}>
                        <img src={p.image || '/placeholder.png'} alt={p.title} loading="lazy" />
                      </Link>
                      <button
                        type="button"
                        className={wishlisted ? 'wishlist-button active' : 'wishlist-button'}
                        onClick={() => toggleWishlist(p.id)}
                        aria-label={wishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
                      >♥</button>
                      <div className="product-badges">
                        <span className="product-sale-badge">-{disc}%</span>
                        {!inStock && <span className="product-stock-badge product-stock-badge--danger">Habis</span>}
                      </div>
                    </div>
                    <div className="product-body">
                      <h3 className="product-title">
                        <Link href={`/product/${p.id}`}>{p.title}</Link>
                      </h3>
                      {p.category && (
                        <span className="product-category-chip">{p.category}</span>
                      )}
                      <div className="product-rating">
                        <StarRow rating={4.7} />
                        <span className="rating-value">4.7</span>
                        <span className="review-count">(+100 terjual)</span>
                      </div>
                      <div className="product-pricing">
                        <span className="price-old">Rp {originalPrice.toLocaleString('id-ID')}</span>
                        <p className="price">Rp {Number(p.price).toLocaleString('id-ID')}</p>
                      </div>
                      <button
                        type="button"
                        className="product-cart-button"
                        onClick={() => addToCart(p)}
                        disabled={!inStock}
                        id={`store-cart-${p.id}`}
                      >
                        {inStock ? '+ Keranjang' : 'Habis'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
