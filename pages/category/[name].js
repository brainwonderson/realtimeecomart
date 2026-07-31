import { useRouter } from 'next/router'
import useSWR from 'swr'
import { fetcher } from '../../lib/api'
import { getStoredUserId } from '../../lib/session'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import SiteNav from '../../components/SiteNav'

const categories = ['Semua', 'Elektronik', 'Fashion', 'Kecantikan', 'Rumah Tangga', 'Olahraga', 'Makanan', 'Otomotif', 'Lainnya']

export default function CategoryPage() {
  const router = useRouter()
  const { name } = router.query

  const [priceLimit, setPriceLimit] = useState(1000000)
  const [sort, setSort] = useState('popular')

  // Fetch all products so we can do fast client-side filtering
  const { data: rawItems, error, isLoading } = useSWR('/products?limit=100', fetcher)

  const [wishlistIds, setWishlistIds] = useState([])

  useEffect(() => {
    try {
      const rawWishlist = localStorage.getItem('wishlist')
      const parsedWishlist = rawWishlist ? JSON.parse(rawWishlist) : []
      setWishlistIds(Array.isArray(parsedWishlist) ? parsedWishlist : [])
    } catch {
      setWishlistIds([])
    }
  }, [])

  // Filter products by category, price limit, and sorting
  const filteredItems = useMemo(() => {
    let items = Array.isArray(rawItems) ? rawItems : []

    // 1. Filter by category (from URL param 'name')
    if (name) {
      items = items.filter(
        p => (p.category || '').toLowerCase() === String(name).toLowerCase()
      )
    }

    // 2. Filter by price limit
    if (priceLimit < 1000000) {
      items = items.filter(p => Number(p.price || 0) <= priceLimit)
    }

    // 3. Sort products
    if (sort === 'newest') {
      items = [...items].sort((a, b) => b.id - a.id)
    } else if (sort === 'price_asc') {
      items = [...items].sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sort === 'price_desc') {
      items = [...items].sort((a, b) => Number(b.price) - Number(a.price))
    } else if (sort === 'popular') {
      items = [...items].sort((a, b) => Number(b.rating || 4.7) - Number(a.rating || 4.7))
    }

    return items
  }, [rawItems, name, priceLimit, sort])

  function getCardMeta(product, index) {
    const stock = Number(product.stock ?? 0)
    const isSoldOut = stock <= 0
    const isLowStock = stock > 0 && stock <= 3
    const discountPct = [60, 50, 40, 45, 65][index % 5]
    const badgeLabel = isSoldOut ? 'Habis' : isLowStock ? 'Baru' : `-${discountPct}%`
    const originalPrice = Math.round(Number(product.price || 0) * (1 + discountPct / 100))
    const rating = Number(product.rating || 4.7)
    const reviews = Number(product.review_count || 12)
    const sold = [432, 256, 371, 189, 312][index % 5]
    const progressPct = [88, 72, 65, 45, 90][index % 5]
    return { stock, isSoldOut, isLowStock, badgeLabel, originalPrice, rating, reviews, sold, progressPct, discountPct }
  }

  async function addToCart(product) {
    const userId = getStoredUserId()
    if (!userId) {
      alert('Silakan login atau register dulu agar cart tersimpan ke akun Anda.')
      return
    }
    const response = await fetch(`/api/cart/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: 1 })
    })
    if (!response.ok) { alert('Gagal menambahkan ke cart'); return }
    alert('Added to cart')
  }

  function toggleWishlist(productId) {
    setWishlistIds(prev => {
      const next = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
      try { localStorage.setItem('wishlist', JSON.stringify(next)) } catch { }
      return next
    })
  }

  function handleCategoryClick(catLabel) {
    if (catLabel === '') {
      router.push('/')
    } else {
      router.push(`/category/${encodeURIComponent(catLabel)}`)
    }
  }

  const productCountLabel = filteredItems.length
    ? `Menampilkan ${filteredItems.length} produk`
    : 'Tidak ada produk yang cocok'

  return (
    <div>
      <Head>
        <title>{name ? `${name} - Kategori Produk | EcoMart` : 'Kategori Produk | EcoMart'}</title>
        <meta name="description" content={name ? `Cari dan temukan berbagai produk berkualitas dalam kategori ${name} hanya di EcoMart.` : 'Cari berbagai produk berkualitas di EcoMart.'} />
      </Head>

      <SiteNav />

      <main style={{ minHeight: '85vh', padding: '12px 0' }}>
        <div className="search-layout container">
          {/* LEFT SIDEBAR: FILTERS */}
          <aside className="search-sidebar">
            <div className="filter-group">
              <h3>Semua Kategori</h3>
              <div className="category-filter-list">
                {categories.map(categoryName => {
                  const queryVal = categoryName === 'Semua' ? '' : categoryName
                  const isActive = (name || '').toLowerCase() === queryVal.toLowerCase()
                  return (
                    <button
                      key={categoryName}
                      type="button"
                      className={isActive ? 'filter-pill active' : 'filter-pill'}
                      onClick={() => handleCategoryClick(queryVal)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                    >
                      <span>{categoryName}</span>
                      {isActive && <span style={{ fontWeight: 'bold' }}>&rsaquo;</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="filter-group">
              <div className="price-filter-head">
                <h3>Batas Harga</h3>
                <span className="price-value-label">
                  {priceLimit >= 1000000 
                    ? '> Rp 1.000.000' 
                    : `Sampai Rp ${Number(priceLimit).toLocaleString('id-ID')}`
                  }
                </span>
              </div>
              <input
                className="price-range-slider"
                type="range"
                min="50000"
                max="1000000"
                step="50000"
                value={priceLimit}
                onChange={e => setPriceLimit(Number(e.target.value))}
                aria-label="Filter harga"
              />
            </div>

            <button 
              className="reset-filter-button" 
              onClick={() => {
                setPriceLimit(1000000)
                setSort('popular')
              }}
            >
              Reset Filter
            </button>
          </aside>

          {/* RIGHT CONTENT AREA */}
          <div className="search-results-content">
            <div className="search-result-header">
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                <Link href="/" style={{ color: 'var(--accent)' }}>Beranda</Link> &raquo; Kategori &raquo; {name}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Kategori: {name}
              </h2>

              <div className="search-tabs" style={{ marginTop: 12 }}>
                <button
                  className={`search-tab ${sort === 'popular' ? 'active' : ''}`}
                  onClick={() => setSort('popular')}
                >
                  Populer
                </button>
                <button
                  className={`search-tab ${sort === 'newest' ? 'active' : ''}`}
                  onClick={() => setSort('newest')}
                >
                  Terbaru
                </button>
                <button
                  className={`search-tab ${sort === 'price_asc' ? 'active' : ''}`}
                  onClick={() => setSort('price_asc')}
                >
                  Harga Termurah
                </button>
                <button
                  className={`search-tab ${sort === 'price_desc' ? 'active' : ''}`}
                  onClick={() => setSort('price_desc')}
                >
                  Harga Tertinggi
                </button>
              </div>

              <div className="search-meta-row" style={{ marginTop: 8 }}>
                <span className="result-count-label" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {productCountLabel}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="grid skeleton-grid" aria-label="Memuat produk">
                {Array.from({ length: 9 }).map((_, index) => (
                  <article key={index} className="product-card skeleton-card" aria-hidden="true">
                    <div className="skeleton-media" />
                    <div className="product-body">
                      <div className="skeleton-line skeleton-line--short" />
                      <div className="skeleton-line skeleton-line--medium" />
                      <div className="skeleton-line skeleton-line--long" />
                      <div className="skeleton-line skeleton-line--long" />
                      <div className="skeleton-line skeleton-line--button" />
                    </div>
                  </article>
                ))}
              </div>
            ) : error ? (
              <div className="panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p className="muted">Gagal memuat produk untuk kategori ini. Silakan coba kembali nanti.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Tidak Ada Produk</h3>
                <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
                  Belum ada produk yang memenuhi kriteria filter dalam kategori "{name}" saat ini.
                </p>
                <button className="button" onClick={() => { setPriceLimit(1000000); setSort('popular'); }}>Reset Filter</button>
              </div>
            ) : (
              <div className="grid">
                {filteredItems.map((p, index) => {
                  const meta = getCardMeta(p, index)
                  const wishlisted = wishlistIds.includes(p.id)
                  const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price)
                  const discountPct = hasDiscount ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100) : 0
                  return (
                    <article key={p.id} className="product-card">
                      <div className="product-media">
                        <img src={p.image || '/placeholder.png'} alt={p.title} loading="lazy" />
                        <button
                          type="button"
                          className={wishlisted ? 'wishlist-button active' : 'wishlist-button'}
                          onClick={() => toggleWishlist(p.id)}
                          aria-label={wishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
                        >♥</button>
                        <div className="product-badges">
                          {hasDiscount && <span className="product-sale-badge">-{discountPct}%</span>}
                          {meta.isSoldOut && <span className="product-stock-badge product-stock-badge--danger">Habis</span>}
                          {!meta.isSoldOut && meta.isLowStock && <span className="product-stock-badge product-stock-badge--warning">Sisa {meta.stock}!</span>}
                        </div>
                      </div>
                      <div className="product-body">
                        <span className="product-category-chip">{p.category || p.category_name || 'General'}</span>
                        <h3 className="product-title">
                          <Link href={`/product/${p.id}`}>{p.title}</Link>
                        </h3>
                        <div className="product-rating">
                          <span className="stars" aria-hidden="true">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <span key={si} className={si < Math.round(meta.rating) ? 'star filled' : 'star'}>★</span>
                            ))}
                          </span>
                          <span className="rating-value">{meta.rating.toFixed(1)}</span>
                          <span className="review-count">({meta.reviews} review)</span>
                        </div>
                        <div className="product-pricing">
                          {hasDiscount && (
                            <span className="price-old">Rp {Number(p.original_price).toLocaleString('id-ID')}</span>
                          )}
                          <p className="price">Rp {Number(p.price || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <button
                          type="button"
                          className="product-cart-button"
                          onClick={() => addToCart(p)}
                          disabled={meta.isSoldOut}
                          id={`product-cart-${p.id}`}
                        >
                          {meta.isSoldOut ? 'Habis' : '+ Keranjang'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
