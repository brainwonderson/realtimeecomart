import useSWR from 'swr'
import { API_BASE, fetcher } from '../lib/api'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { getStoredUserId } from '../lib/session'
import SiteNav from '../components/SiteNav'
import { authJson } from '../lib/clientApi'

const pageSize = 15

const popularCategories = [
  { icon: '💻', label: 'Elektronik' },
  { icon: '👕', label: 'Fashion' },
  { icon: '💄', label: 'Kecantikan' },
  { icon: '🏠', label: 'Rumah Tangga' },
  { icon: '⚽', label: 'Olahraga' },
  { icon: '🍔', label: 'Makanan' },
  { icon: '🚗', label: 'Otomotif' },
  { icon: '📦', label: 'Lainnya' },
]

const trustBadges = [
  { icon: '🚚', title: 'Promo Setiap Hari', sub: 'Diskon hingga 70%' },
  { icon: '🎁', title: 'Gratis Ongkir', sub: 'Min. belanja 50K' },
  { icon: '🔒', title: '100% Aman', sub: 'Pembayaran Terjamin' },
  { icon: '📦', title: 'Pengiriman Cepat', sub: 'Sampai ke tanganmu' },
]

const benefits = [
  { icon: '🚚', title: 'Pengiriman Cepat', desc: 'Pesanan sampai ke tanganmu dengan aman dan terpercaya' },
  { icon: '🔒', title: '100% Aman', desc: 'Pembayaran terenkripsi & terpercaya dengan teknologi terkini' },
  { icon: '🛡️', title: 'Garansi Produk', desc: 'Garansi resmi untuk semua produk yang kami jual' },
  { icon: '💬', title: 'Customer Support 24/7', desc: 'Kami siap membantu kapan saja kamu butuhkan' },
]

const paymentLogos = ['VISA', 'Mastercard', 'GoPay', 'OVO', 'DANA', 'ShopeePay']
const brandLogos = ['SAMSUNG', 'Xiaomi', 'ASUS', 'acer', 'OPPO', 'realme']

export default function Home() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [priceLimit, setPriceLimit] = useState(1000000) // Default to max so no filtering by default
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(Date.now())
  const [wishlistIds, setWishlistIds] = useState([])
  const [urlQueryReady, setUrlQueryReady] = useState(false)
  const [promoBanners, setPromoBanners] = useState([])
  const [bannerSlide, setBannerSlide] = useState(0)
  const [flashSaleItems, setFlashSaleItems] = useState([])
  const [flashSaleEvent, setFlashSaleEvent] = useState(null)

  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatState, setChatState] = useState('idle')
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false)
  const chatEndRef = useRef(null)

  // New Search & Store states
  const [searchTab, setSearchTab] = useState('produk') // 'produk' | 'toko'
  const [stores, setStores] = useState([])
  const [isStoresLoading, setIsStoresLoading] = useState(false)

  const key = useMemo(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    const q = params.toString()
    return '/products' + (q ? `?${q}` : '')
  }, [query, category, sort])

  const isSearching = !!query.trim()

  const flashSaleEndsAt = useMemo(() => Date.now() + 6 * 60 * 60 * 1000, [])

  // Sync ?q= URL param to search query on load
  useEffect(() => {
    if (!router.isReady) return
    const urlQ = router.query.q || ''
    setQuery(urlQ)
    if (urlQ) {
      // Scroll to top or products section if searching
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setUrlQueryReady(true)
  }, [router.isReady, router.query.q])

  // Fetch stores for search
  useEffect(() => {
    const trimmedQ = query.trim()
    if (!trimmedQ) {
      setStores([])
      return
    }
    let active = true
    setIsStoresLoading(true)
    fetch(`${API_BASE}/stores?q=${encodeURIComponent(trimmedQ)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (active) {
          setStores(Array.isArray(data) ? data : [])
          setIsStoresLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setStores([])
          setIsStoresLoading(false)
        }
      })
    return () => { active = false }
  }, [query])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    try {
      const rawWishlist = localStorage.getItem('wishlist')
      const parsedWishlist = rawWishlist ? JSON.parse(rawWishlist) : []
      setWishlistIds(Array.isArray(parsedWishlist) ? parsedWishlist : [])
    } catch {
      setWishlistIds([])
    }
    return () => window.clearInterval(timer)
  }, [])

  // Fetch promo banners
  useEffect(() => {
    fetch(`${API_BASE}/admin/banners/public/all`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPromoBanners(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch(`${API_BASE}/products/flash-sale`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const flashProducts = Array.isArray(data) ? data : []
        setFlashSaleItems(flashProducts)
        const currentEvent = flashProducts.length ? flashProducts[0] : null
        if (currentEvent) {
          setFlashSaleEvent({
            title: currentEvent.event_title,
            start_at: currentEvent.start_at,
            end_at: currentEvent.end_at,
          })
        }
      })
      .catch(() => {})
  }, [])

  // Auto-rotate banner slider (including default static hero slide)
  useEffect(() => {
    const totalSlides = 1 + promoBanners.length
    if (totalSlides <= 1) return
    const t = setInterval(() => setBannerSlide(s => (s + 1) % totalSlides), 4000)
    return () => clearInterval(t)
  }, [promoBanners.length])

  const countdownEndAt = flashSaleEvent && flashSaleEvent.end_at ? new Date(flashSaleEvent.end_at).getTime() : flashSaleEndsAt
  const remaining = Math.max(0, countdownEndAt - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  const { data: products, error } = useSWR(key, fetcher)
  const items = products ?? []
  const flashItems = flashSaleItems ?? []
  const isLoading = !error && !products
  const categories = useMemo(() => {
    const base = ['Semua', 'Audio', 'Wearables', 'Bag']
    if (category && !base.includes(category)) {
      base.push(category)
    }
    return base
  }, [category])
  const ratingById = { 1: 4.8, 2: 4.9, 3: 4.7 }
  const reviewCountById = { 1: 124, 2: 208, 3: 89 }
  const stockById = { 1: 12, 2: 3, 3: 0 }

  const filteredItems = useMemo(() => {
    return (items || []).filter(product => {
      const productCategory = product.category || product.category_name || ''
      const matchesPrice = !isSearching || priceLimit >= 1000000 || Number(product.price || 0) <= Number(priceLimit)
      const matchesCategory = !isSearching || !category || productCategory === category
      return matchesPrice && matchesCategory
    })
  }, [items, priceLimit, category, isSearching])

  useEffect(() => { setPage(1) }, [query, category, sort, priceLimit])

  const totalProducts = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalProducts ? (safePage - 1) * pageSize : 0
  const endIndex = Math.min(startIndex + pageSize, totalProducts)
  const visibleItems = filteredItems.slice(startIndex, endIndex)
  const productCountLabel = totalProducts
    ? `Menampilkan ${visibleItems.length} dari ${totalProducts} produk`
    : 'Tidak ada produk yang cocok'

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  function getCardMeta(product, index) {
    const stock = Number(product.stock ?? stockById[product.id] ?? 0)
    const isSoldOut = stock <= 0
    const isLowStock = stock > 0 && stock <= 3
    const discountPct = [60, 50, 40, 45, 65][index % 5]
    const badgeLabel = isSoldOut ? 'Habis' : isLowStock ? 'Baru' : `-${discountPct}%`
    const originalPrice = Math.round(Number(product.price || 0) * (1 + discountPct / 100))
    const rating = Number(product.rating || ratingById[product.id] || 4.7)
    const reviews = Number(product.review_count || reviewCountById[product.id] || 0)
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
    setCategory(catLabel)
    // Scroll to products section
    const el = document.getElementById('products')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Chatbot helpers and effects
  useEffect(() => {
    if (chatOpen && chatMessages.length === 0) {
      setChatMessages([
        { id: 1, sender: 'bot', text: 'Halo! Saya EcoMart Assistant. Ada yang bisa saya bantu hari ini? Anda bisa memilih salah satu menu cepat di bawah atau mengetik langsung pertanyaan Anda.' }
      ])
    }
  }, [chatOpen, chatMessages.length])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const addBotMessage = (text, products = []) => {
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          sender: 'bot',
          text,
          products
        }
      ])
    }, 600)
  }

  const handleQuickAction = async (actionTitle) => {
    setChatOpen(true)
    
    // Add user message
    const userMsgId = Date.now()
    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'user', text: actionTitle }
    ])

    if (actionTitle === 'Cari Produk') {
      setChatState('awaiting_search')
      addBotMessage('Tentu! Silakan ketik nama produk, kategori, atau deskripsi yang sedang Anda cari (misal: "headphone", "samsung", "tas").')
    } else if (actionTitle === 'Lacak Pesanan') {
      const userId = getStoredUserId()
      if (!userId) {
        addBotMessage('Silakan masuk (login) ke akun Anda terlebih dahulu untuk melihat dan melacak pesanan Anda.')
        return
      }
      addBotMessage('Sedang mengambil data pesanan Anda...')
      try {
        const orders = await authJson(`/orders/${userId}`)
        if (orders && orders.length > 0) {
          const orderList = orders.map((o, idx) => {
            const dateStr = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            return `${idx + 1}. No. Pesanan #${o.id} (${dateStr})\n   Total: Rp ${Number(o.total_amount).toLocaleString('id-ID')}\n   Status: ${o.status.toUpperCase()} (${o.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'})\n   Resi: ${o.tracking_number || 'Belum tersedia'}`
          }).join('\n\n')
          addBotMessage(`Berikut adalah daftar pesanan terbaru Anda:\n\n${orderList}\n\nAda hal lain yang bisa saya bantu?`)
        } else {
          addBotMessage('Anda belum memiliki riwayat pesanan di EcoMart.')
        }
      } catch (err) {
        console.error(err)
        addBotMessage('Maaf, terjadi kesalahan saat mengambil data pesanan Anda.')
      }
    } else if (actionTitle === 'Promo Hari Ini') {
      addBotMessage('Sedang mencari promo terbaik hari ini...')
      try {
        const flashRes = await fetch(`${API_BASE}/products/flash-sale`)
        let flashSaleProducts = []
        if (flashRes.ok) {
          flashSaleProducts = await flashRes.json()
        }
        
        if (flashSaleProducts.length > 0) {
          addBotMessage('Berikut adalah produk Flash Sale yang sedang aktif saat ini! Jangan sampai kehabisan: 🔥', flashSaleProducts.slice(0, 3))
        } else {
          const prodRes = await fetch(`${API_BASE}/products?limit=3`)
          if (prodRes.ok) {
            const normalProducts = await prodRes.json()
            addBotMessage('Berikut adalah produk-produk unggulan terpopuler hari ini di EcoMart: ✨', normalProducts)
          } else {
            addBotMessage('Saat ini belum ada promo khusus yang tersedia. Silakan cek kembali beberapa saat lagi!')
          }
        }
      } catch (err) {
        console.error(err)
        addBotMessage('Maaf, gagal memuat data promo hari ini.')
      }
    } else if (actionTitle === 'Pengembalian & Refund') {
      addBotMessage('Kebijakan Pengembalian & Refund di EcoMart:\n\n1. Pengembalian barang dapat diajukan dalam waktu maksimal 7 hari sejak produk diterima.\n2. Produk harus dalam keadaan baru, lengkap dengan segel, label, serta kemasan aslinya.\n3. Proses refund akan selesai dalam 3-5 hari kerja setelah barang yang diretur lolos QC oleh tim kami.\n\nApakah Anda memerlukan bantuan spesifik mengenai produk tertentu?')
    } else {
      setChatState('idle')
      addBotMessage('Ada yang bisa saya bantu? Silakan ketik pertanyaan Anda (misal: cari nama barang, lacak pesanan, atau kebijakan pengembalian).')
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const trimmedInput = chatInput.trim()
    if (!trimmedInput) return

    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: trimmedInput }
    ])
    setChatInput('')

    const lowerInput = trimmedInput.toLowerCase()

    if (chatState === 'awaiting_search') {
      addBotMessage('Sedang mencari produk...')
      try {
        const res = await fetch(`${API_BASE}/products?q=${encodeURIComponent(trimmedInput)}&limit=3`)
        if (res.ok) {
          const productsList = await res.json()
          if (productsList && productsList.length > 0) {
            addBotMessage(`Saya menemukan ${productsList.length} produk untuk "${trimmedInput}". Berikut rekomendasinya:`, productsList)
          } else {
            addBotMessage(`Maaf, saya tidak menemukan produk yang cocok dengan pencarian "${trimmedInput}". Coba cari kata kunci lain.`)
          }
        } else {
          addBotMessage('Gagal melakukan pencarian produk.')
        }
      } catch (err) {
        console.error(err)
        addBotMessage('Terjadi kesalahan saat memproses pencarian.')
      }
      setChatState('idle')
    } else {
      if (lowerInput.includes('cari') || lowerInput.includes('beli') || lowerInput.includes('laptop') || lowerInput.includes('phone') || lowerInput.includes('samsung') || lowerInput.includes('tas') || lowerInput.includes('jaket') || lowerInput.includes('celana') || lowerInput.includes('headphone') || lowerInput.includes('produk')) {
        let searchKeyword = trimmedInput
        if (lowerInput.startsWith('cari ')) {
          searchKeyword = trimmedInput.substring(5)
        }
        addBotMessage('Sedang mencari rekomendasi produk...')
        try {
          const res = await fetch(`${API_BASE}/products?q=${encodeURIComponent(searchKeyword)}&limit=3`)
          if (res.ok) {
            const productsList = await res.json()
            if (productsList && productsList.length > 0) {
              addBotMessage(`Berikut produk yang saya temukan untuk "${searchKeyword}":`, productsList)
            } else {
              addBotMessage(`Saya tidak menemukan produk dengan kata kunci "${searchKeyword}". Silakan cari kata kunci lain.`)
            }
          } else {
            addBotMessage('Gagal memuat rekomendasi produk.')
          }
        } catch (err) {
          console.error(err)
          addBotMessage('Terjadi kesalahan saat mencari rekomendasi.')
        }
      } else if (lowerInput.includes('promo') || lowerInput.includes('diskon') || lowerInput.includes('flash sale')) {
        addBotMessage('Sedang mencari promo teraktif...')
        try {
          const flashRes = await fetch(`${API_BASE}/products/flash-sale`)
          let flashSaleProducts = []
          if (flashRes.ok) {
            flashSaleProducts = await flashRes.json()
          }
          if (flashSaleProducts.length > 0) {
            addBotMessage('Ini dia promo flash sale yang sedang berlangsung: 🔥', flashSaleProducts.slice(0, 3))
          } else {
            const prodRes = await fetch(`${API_BASE}/products?limit=3`)
            if (prodRes.ok) {
              const normalProducts = await prodRes.json()
              addBotMessage('Ini produk-produk pilihan kami hari ini: ✨', normalProducts)
            } else {
              addBotMessage('Maaf, tidak ada promo aktif saat ini.')
            }
          }
        } catch (err) {
          console.error(err)
          addBotMessage('Gagal memuat info promo.')
        }
      } else if (lowerInput.includes('lacak') || lowerInput.includes('pesan') || lowerInput.includes('order')) {
        const userId = getStoredUserId()
        if (!userId) {
          addBotMessage('Silakan masuk (login) terlebih dahulu untuk dapat melacak pesanan Anda.')
          return
        }
        addBotMessage('Mengambil pesanan Anda...')
        try {
          const orders = await authJson(`/orders/${userId}`)
          if (orders && orders.length > 0) {
            const orderList = orders.map((o, idx) => {
              const dateStr = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              return `${idx + 1}. No. Pesanan #${o.id} (${dateStr})\n   Total: Rp ${Number(o.total_amount).toLocaleString('id-ID')}\n   Status: ${o.status.toUpperCase()} (${o.payment_status === 'paid' ? 'Lunas' : 'Belum Lunas'})\n   Resi: ${o.tracking_number || 'Belum tersedia'}`
            }).join('\n\n')
            addBotMessage(`Berikut adalah pesanan terbaru Anda:\n\n${orderList}`)
          } else {
            addBotMessage('Anda belum memiliki riwayat pesanan.')
          }
        } catch (err) {
          console.error(err)
          addBotMessage('Gagal mengambil data pesanan.')
        }
      } else if (lowerInput.includes('refund') || lowerInput.includes('kembali') || lowerInput.includes('retur')) {
        addBotMessage('Pengembalian barang dapat diajukan dalam waktu maksimal 7 hari sejak produk diterima. Produk harus dalam keadaan baru, lengkap dengan segel, label, serta kemasan aslinya.')
      } else if (lowerInput.includes('halo') || lowerInput.includes('hai') || lowerInput.includes('p ') || lowerInput.trim() === 'p') {
        addBotMessage('Halo! Ada yang bisa saya bantu hari ini? Silakan pilih salah satu opsi di menu cepat atau ketik langsung pertanyaan Anda.')
      } else {
        addBotMessage('Terima kasih! Saya mengerti pesan Anda. Jika ada pertanyaan spesifik tentang produk, silakan sebutkan nama produk atau kategorinya.')
      }
    }
  }

  return (
    <div>
      <SiteNav />

      {isSearching ? (
        /* ── TOKOPEDIA-STYLE SEARCH RESULTS LAYOUT ── */
        <div className="search-layout container">
          {/* LEFT SIDEBAR: FILTERS */}
          <aside className="search-sidebar">
            <div className="filter-group">
              <h3>Kategori</h3>
              <div className="category-filter-list">
                {categories.map(categoryName => (
                  <button
                    key={categoryName}
                    type="button"
                    className={category === (categoryName === 'Semua' ? '' : categoryName) ? 'filter-pill active' : 'filter-pill'}
                    onClick={() => setCategory(categoryName === 'Semua' ? '' : categoryName)}
                  >
                    {categoryName}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Urutkan</h3>
              <select value={sort} onChange={e => setSort(e.target.value)} className="search-sort-select">
                <option value="newest">Terbaru</option>
                <option value="price_asc">Harga termurah</option>
                <option value="price_desc">Harga tertinggi</option>
                <option value="popular">Popular</option>
              </select>
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
              type="button"
              className="reset-filter-button"
              onClick={() => { setCategory(''); setSort('newest'); setPriceLimit(1000000); }}
            >
              Reset Filter
            </button>
          </aside>

          {/* RIGHT CONTENT AREA: TABS & RESULTS */}
          <div className="search-results-content">
            <div className="search-result-header">
              <h2>Hasil pencarian untuk &ldquo;{query}&rdquo;</h2>
              <div className="search-tabs">
                <button
                  className={searchTab === 'produk' ? 'search-tab active' : 'search-tab'}
                  onClick={() => setSearchTab('produk')}
                >
                  🛍️ Produk ({totalProducts})
                </button>
                <button
                  className={searchTab === 'toko' ? 'search-tab active' : 'search-tab'}
                  onClick={() => setSearchTab('toko')}
                >
                  🏪 Toko ({stores.length})
                </button>
              </div>
            </div>

            {searchTab === 'produk' ? (
              <>
                <div className="search-meta-row">
                  <span className="result-count-label">{productCountLabel}</span>
                </div>

                {isLoading ? (
                  <div className="grid skeleton-grid">
                    {Array.from({ length: pageSize }).map((_, index) => (
                      <article key={index} className="product-card skeleton-card">
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
                ) : totalProducts ? (
                  <>
                    <div className="grid">
                      {visibleItems.map((p, index) => {
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

                    {totalPages > 1 && (
                      <div className="pagination panel" aria-label="Pagination produk">
                        <div className="pagination-info">
                          <strong>Halaman {safePage} dari {totalPages}</strong>
                        </div>
                        <div className="pagination-controls">
                          <button
                            type="button"
                            className="ghost-button pagination-button"
                            onClick={() => setPage(c => Math.max(1, c - 1))}
                            disabled={safePage === 1}
                          >Sebelumnya</button>
                          <div className="pagination-pages">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                              <button
                                key={n}
                                type="button"
                                className={n === safePage ? 'button pagination-button active' : 'ghost-button pagination-button'}
                                onClick={() => setPage(n)}
                              >{n}</button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="ghost-button pagination-button"
                            onClick={() => setPage(c => Math.min(totalPages, c + 1))}
                            disabled={safePage === totalPages}
                          >Berikutnya</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state--large">
                    <div className="empty-state-icon">🔍</div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '18px' }}>
                      Produk &ldquo;{query}&rdquo; belum tersedia
                    </strong>
                    <p className="muted" style={{ marginTop: 8 }}>
                      Produk yang Anda cari belum ada di toko kami saat ini. Coba kata kunci lain atau hapus filter.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Tab Toko */
              <div className="stores-list-container">
                {isStoresLoading ? (
                  <div className="loading-state">Memuat daftar toko...</div>
                ) : stores.length > 0 ? (
                  <div className="stores-search-grid">
                    {stores.map(store => (
                      <article key={store.id} className="store-card panel">
                        <div className="store-card-left">
                          {store.logo ? (
                            <img src={store.logo} alt={store.name} className="store-logo-img" />
                          ) : (
                            <div className="store-logo-placeholder">🏪</div>
                          )}
                        </div>
                        <div className="store-card-middle">
                          <h3 className="store-name-title">{store.name}</h3>
                          <p className="store-description-text">{store.description || 'Tidak ada deskripsi toko.'}</p>
                          <div className="store-meta-info">
                            <span className={store.is_open ? 'store-status-badge open' : 'store-status-badge closed'}>
                              {store.is_open ? 'Buka' : 'Tutup'}
                            </span>
                            <span className="seller-name-label">Pemilik: {store.seller_name || 'Seller'}</span>
                          </div>
                        </div>
                        <div className="store-card-right">
                          <Link href={`/store/${store.id}`} className="button view-store-btn">
                            Kunjungi Toko
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state--large">
                    <div className="empty-state-icon">🏪</div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '18px' }}>
                      Toko &ldquo;{query}&rdquo; tidak ditemukan
                    </strong>
                    <p className="muted" style={{ marginTop: 8 }}>
                      Coba cari toko dengan kata kunci yang berbeda.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── NORMAL HOME LAYOUT ── */
        <div className="page-layout">
          {/* ── MAIN CONTENT ── */}
          <main className="page-main">

            {/* ── HERO ── */}
            <section className="hero-section" aria-label="Hero banner">
              <div className="hero-track" style={{ transform: `translateX(-${bannerSlide * 100}%)` }}>
                
                {/* Slide 0: Default Hero Content */}
                <div className="hero-slide-default">
                  <div className="hero-left">
                    {flashSaleEvent && (
                      <span className="hero-flash-badge">
                        ⚡ Flash sale aktif
                      </span>
                    )}
                    <h1 className="hero-title">
                      Belanja lebih cepat,<br />
                      <span className="hero-title-accent">promo lebih besar.</span>
                    </h1>
                    <p className="hero-subtitle">
                      Diskon hingga 70% untuk produk pilihan dengan pengalaman belanja yang fokus dan modern.
                    </p>
                    <div className="hero-actions">
                      <Link className="hero-cta" href="#products">
                        Belanja Sekarang →
                      </Link>
                      {flashSaleEvent && (
                        <div className="hero-countdown" aria-label="Countdown flash sale">
                          <span className="hero-countdown-label">Berakhir dalam</span>
                          <div className="hero-countdown-time">
                            <div className="countdown-block">
                              <span className="countdown-num">{hours}</span>
                              <span className="countdown-unit">JAM</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-block">
                              <span className="countdown-num">{minutes}</span>
                              <span className="countdown-unit">MENIT</span>
                            </div>
                            <span className="countdown-sep">:</span>
                            <div className="countdown-block">
                              <span className="countdown-num">{seconds}</span>
                              <span className="countdown-unit">DETIK</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="hero-right">
                    <div className="hero-promo-card">
                      <span className="hero-promo-badge">Hemat 50%</span>
                      <div className="hero-promo-label">Promo Hari Ini</div>
                      <h2 className="hero-promo-title">Bundle Hemat</h2>
                      <div className="hero-promo-from">Mulai dari</div>
                      <div>
                        <span className="hero-promo-price">Rp 99.000</span>
                        <span className="hero-promo-price-old">Rp 199.000</span>
                      </div>
                      <div className="hero-promo-products">
                        <div className="product-float product-float-1">🎧</div>
                        <div className="product-float product-float-2">⌚</div>
                        <div className="product-float product-float-3">💧</div>
                      </div>
                      <Link href="#products" className="hero-promo-btn">Lihat Promo</Link>
                    </div>
                  </div>
                </div>

                {/* Slide 1..N: Admin Uploaded Banners */}
                {promoBanners.map(b => (
                  <div key={b.id} className="hero-slide-banner">
                    {b.link_url ? (
                      <a href={b.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                        <img src={b.image} alt={b.title} />
                        <div className="hero-banner-caption">{b.title}</div>
                      </a>
                    ) : (
                      <div style={{ width: '100%', height: '100%' }}>
                        <img src={b.image} alt={b.title} />
                        <div className="hero-banner-caption">{b.title}</div>
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </section>

            {/* ── DOTS ── */}
            {(1 + promoBanners.length) > 1 && (
              <div className="hero-dots" aria-label="Slide indicators">
                {Array.from({ length: 1 + promoBanners.length }).map((_, i) => (
                  <button
                    key={i}
                    className={i === bannerSlide ? 'hero-dot hero-dot--active' : 'hero-dot'}
                    onClick={() => setBannerSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* ── TRUST BADGES ── */}
            <div className="trust-badges" aria-label="Keunggulan belanja">
              {trustBadges.map((b, i) => (
                <div key={i} className="trust-badge">
                  <div className="trust-badge-icon">{b.icon}</div>
                  <div className="trust-badge-text">
                    <strong>{b.title}</strong>
                    <span>{b.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── POPULAR CATEGORIES ── */}
            <div id="categories">
              <div className="section-hd">
                <div className="section-hd-left">
                  <span className="section-hd-icon">📂</span>
                  <h2>Kategori Populer</h2>
                </div>
                <Link href="#" className="section-hd-link">Lihat Semua</Link>
              </div>
              <div className="categories-grid" role="list" aria-label="Kategori produk">
                {popularCategories.map((cat, i) => (
                  <div
                    key={i}
                    className="category-card"
                    role="listitem"
                    onClick={() => handleCategoryClick(cat.label)}
                  >
                    <div className="category-card-icon">{cat.icon}</div>
                    <span>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FLASH SALE ── */}
            {flashSaleEvent && flashItems.length > 0 && (
              <div id="flash-sale">
                <div className="flash-sale-header">
                  <div className="flash-sale-title">
                    <span className="flash-sale-icon">⚡</span>
                    <h2>Flash Sale Hari Ini</h2>
                  </div>
                  <div className="flash-sale-countdown">
                    <span>Berakhir dalam</span>
                    <div className="flash-sale-time">
                      <span className="flash-time-box">{hours}</span>
                      <span className="flash-time-sep">:</span>
                      <span className="flash-time-box">{minutes}</span>
                      <span className="flash-time-sep">:</span>
                      <span className="flash-time-box">{seconds}</span>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flash-sale-grid skeleton-grid" aria-label="Memuat flash sale">
                    {Array.from({ length: 5 }).map((_, i) => (
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
                ) : (
                  <div className="flash-sale-grid">
                    {(flashItems.slice(0, 5)).map((p, index) => {
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
                            </div>
                          </div>
                          <div className="product-body">
                            <Link href={`/product/${p.id}`} className="product-title">
                              {p.title}
                            </Link>
                            <div className="product-rating">
                              <span className="stars" aria-hidden="true">
                                {Array.from({ length: 5 }).map((_, si) => (
                                  <span key={si} className={si < Math.round(meta.rating) ? 'star filled' : 'star'}>★</span>
                                ))}
                              </span>
                              <span className="rating-value">{meta.rating.toFixed(1)}</span>
                              <span className="review-count">({meta.reviews})</span>
                            </div>
                            <div className="product-pricing">
                              {p.original_price && p.original_price > p.price && (
                                <span className="price-old">Rp {Number(p.original_price).toLocaleString('id-ID')}</span>
                              )}
                              <p className="price">Rp {Number(p.price || 0).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="product-sold">
                              Terjual <span>{meta.sold}</span>
                            </div>
                            <div className="product-progress" aria-hidden="true">
                              <div className="product-progress-fill" style={{ width: `${meta.progressPct}%` }} />
                            </div>
                            <button
                              type="button"
                              className="product-cart-button"
                              onClick={() => addToCart(p)}
                              disabled={meta.isSoldOut}
                              id={`flash-cart-${p.id}`}
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
            )}

            {/* ── PAYMENT & BRAND ── */}
            <div id="brand" className="payment-brands-section">
              <div className="payment-methods-card">
                <div className="payment-section-title">
                  Metode Pembayaran
                  <Link href="#" className="section-hd-link">Lihat Semua</Link>
                </div>
                <div className="payment-logos">
                  {paymentLogos.map(logo => (
                    <span key={logo} className="payment-logo">{logo}</span>
                  ))}
                </div>
              </div>
              <div className="trusted-brands-card">
                <div className="payment-section-title">
                  Brand Terpercaya
                  <Link href="#" className="section-hd-link">Lihat Semua</Link>
                </div>
                <div className="brand-logos">
                  {brandLogos.map(brand => (
                    <span key={brand} className="brand-logo-item">{brand}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ALL PRODUCTS ── */}
            <div id="products">
              <div className="section-title">
                <div>
                  <h2>Produk Unggulan</h2>
                  <p>Browse semua produk tersedia</p>
                </div>
                <div className="section-title-actions">
                  <span className="chip result-chip">{productCountLabel}</span>
                  <Link className="ghost-button" href="/cart">Lihat cart</Link>
                </div>
              </div>

              {isLoading ? (
                <div className="grid skeleton-grid" aria-label="Memuat produk">
                  {Array.from({ length: pageSize }).map((_, index) => (
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
              ) : totalProducts ? (
                <>
                  <div className="grid">
                    {visibleItems.map((p, index) => {
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

                  {totalPages > 1 && (
                    <div className="pagination panel" aria-label="Pagination produk">
                      <div className="pagination-info">
                        <strong>Halaman {safePage} dari {totalPages}</strong>
                        <span className="muted">Gunakan pagination untuk menelusuri semua produk.</span>
                      </div>
                      <div className="pagination-controls">
                        <button
                          type="button"
                          className="ghost-button pagination-button"
                          onClick={() => setPage(c => Math.max(1, c - 1))}
                          disabled={safePage === 1}
                        >Sebelumnya</button>
                        <div className="pagination-pages">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                            <button
                              key={n}
                              type="button"
                              className={n === safePage ? 'button pagination-button active' : 'ghost-button pagination-button'}
                              onClick={() => setPage(n)}
                              id={`page-btn-${n}`}
                            >{n}</button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="ghost-button pagination-button"
                          onClick={() => setPage(c => Math.min(totalPages, c + 1))}
                          disabled={safePage === totalPages}
                        >Berikutnya</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                            <div className="empty-state--large">
                  <div className="empty-state-icon">🔍</div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '18px' }}>
                    Tidak ada produk ditemukan
                  </strong>
                  <p className="muted" style={{ marginTop: 8 }}>
                    Coba hubungi admin atau muat ulang halaman.
                  </p>
                </div>
              )}
            </div>

            {/* ── CUSTOMER REVIEWS ── */}
            <div className="reviews-section" aria-label="Ulasan pelanggan">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Ulasan Pelanggan</span>
                <Link href="#" className="section-hd-link">Lihat Semua</Link>
              </div>
              <div className="reviews-summary">
                <div className="reviews-score">
                  <div className="reviews-score-num">4.8</div>
                  <div className="reviews-score-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < 5 ? 'star filled' : 'star'}>★</span>
                    ))}
                  </div>
                  <div className="reviews-score-count">dari 25.000+ ulasan</div>
                </div>
                <div>
                  <div className="reviews-avatars" aria-label="Beberapa reviewer">
                    {['A','B','C','D','E'].map((l, i) => (
                      <div key={i} className="review-avatar" style={{ background: `hsl(${i*60+200}, 70%, 50%)` }}>{l}</div>
                    ))}
                  </div>
                  <p className="reviews-meta">Bergabung dengan 25.000+ pelanggan puas kami</p>
                </div>
              </div>
            </div>

          </main>
        </div>
      )}

      {/* ── FLOATING CHATBOT WIDGET (Shopee Style) ── */}
      <div className="floating-chat-container">
        {isChatWidgetOpen && (
          <div className="floating-chat-window">
            {chatOpen ? (
              <div className="chat-assistant-card">
                <div className="chat-assistant-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="chat-assistant-avatar">🤖</div>
                    <div className="chat-assistant-info">
                      <strong>EcoMart Assistant</strong>
                      <div className="chat-online-dot">Online</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setChatOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '4px 8px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px'
                      }}
                      title="Kembali ke Menu Utama"
                    >
                      ↩ Menu
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChatWidgetOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 20,
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label="Tutup Chat"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mobile-chat-body" style={{ overflowY: 'auto', maxHeight: '320px', display: 'flex', flexDirection: 'column' }}>
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-bubble chat-bubble--${msg.sender}`}>
                      {msg.sender === 'bot' && <div className="chat-bubble-avatar">🤖</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <div className="chat-bubble-msg" style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', whiteSpace: 'pre-line' }}>
                          {msg.text}
                        </div>
                        {msg.products && msg.products.length > 0 && (
                          <div className="chat-product-recs" style={{ marginTop: 4 }}>
                            {msg.products.map((p, idx) => (
                              <Link key={idx} href={`/product/${p.id}`} className="chat-product-rec" style={{ textDecoration: 'none' }}>
                                {p.image ? (
                                  <img src={p.image} alt={p.title} />
                                ) : (
                                  <div style={{ width: 60, height: 50, background: 'var(--bg-primary)', borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 20 }}>📦</div>
                                )}
                                <strong>{p.title}</strong>
                                {p.price && <span>Rp {Number(p.price).toLocaleString('id-ID')}</span>}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mobile-chat-input" style={{ borderTop: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ketik pesan..."
                    aria-label="Kirim pesan ke asisten"
                  />
                  <button className="mobile-chat-send" type="submit" aria-label="Kirim">➤</button>
                </form>
              </div>
            ) : (
              <div className="chat-assistant-card">
                <div className="chat-assistant-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="chat-assistant-avatar">🤖</div>
                    <div className="chat-assistant-info">
                      <strong>EcoMart Assistant</strong>
                      <div className="chat-online-dot">Online</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChatWidgetOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Tutup Chat"
                  >
                    ✕
                  </button>
                </div>

                <div className="chat-assistant-greeting">
                  Halo! 👋<br />
                  Saya siap membantu pengalaman belanja terbaik untukmu.
                </div>

                <div className="chat-quick-actions">
                  {[
                    { icon: '🔍', title: 'Cari Produk', sub: 'Temukan produk yang kamu butuhkan' },
                    { icon: '📦', title: 'Lacak Pesanan', sub: 'Cek status pesananmu dengan mudah' },
                    { icon: '🎁', title: 'Promo Hari Ini', sub: 'Dapatkan promo dan diskon terbaru' },
                    { icon: '↩️', title: 'Pengembalian & Refund', sub: 'Bantuan untuk retur dan refund' },
                    { icon: '💬', title: 'Tanya Lainnya', sub: 'Ada pertanyaan lain? Chat di sini' },
                  ].map((item, i) => (
                    <button key={i} className="chat-quick-btn" type="button" id={`chat-quick-${i}`} onClick={() => handleQuickAction(item.title)}>
                      <div className="chat-quick-icon">{item.icon}</div>
                      <div className="chat-quick-text">
                        <strong>{item.title}</strong>
                        <span>{item.sub}</span>
                      </div>
                      <span className="chat-quick-arrow">›</span>
                    </button>
                  ))}
                </div>

                <button className="chat-start-btn" type="button" id="chat-start-btn" onClick={() => handleQuickAction('Mulai Chat')}>
                  💬 Mulai Chat
                </button>
              </div>
            )}
          </div>
        )}
        <button
          className="floating-chat-trigger"
          onClick={() => setIsChatWidgetOpen(!isChatWidgetOpen)}
          aria-label="Tanya EcoMart Assistant"
        >
          <span className="chat-trigger-icon">💬</span>
          <span className="chat-trigger-text">Chat</span>
        </button>
      </div>
    </div>
  )
}
