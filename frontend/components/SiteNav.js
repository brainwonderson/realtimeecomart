import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { fetcher, API_BASE } from '../lib/api'
import { clearStoredSession, getStoredUser, getStoredUserId } from '../lib/session'
import { authJson } from '../lib/clientApi'

const navItems = [
  { label: 'Beranda', href: '/' },
  { label: 'Flash Sale', href: '/#flash-sale' },
  { label: 'Promo', href: '/#promo' },
  { label: 'Brand', href: '/#brand' },
  { label: 'Produk Terbaru', href: '/#products' },
  { label: 'Kategori ▾', href: '/#categories' },
]

export default function SiteNav({ title = 'EcoMart', subtitle = 'Belanja Cerdas, Lebih Cepat.' }) {
  const [user, setUser] = useState(null)
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSugLoading, setIsSugLoading] = useState(false)
  const [sugFetched, setSugFetched] = useState(false)
  const debounceRef = useRef(null)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const router = useRouter()
  const userId = getStoredUserId()
  const { data: cartItems, mutate: mutateCart } = useSWR(userId ? `/cart/${userId}` : null, fetcher)

  const [notifications, setNotifications] = useState([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    setUser(getStoredUser())
    if (typeof window !== 'undefined') {
      const onCartUpdated = () => mutateCart()
      const onSessionUpdated = () => setUser(getStoredUser())
      window.addEventListener('cart-updated', onCartUpdated)
      window.addEventListener('session-updated', onSessionUpdated)
      return () => {
        window.removeEventListener('cart-updated', onCartUpdated)
        window.removeEventListener('session-updated', onSessionUpdated)
      }
    }
  }, [mutateCart])

  // Fetch notifications
  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    async function fetchNotifs() {
      try {
        const data = await authJson('/account/notifications')
        if (Array.isArray(data)) {
          setNotifications(data)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifs()
    // Poll notifications every 8 seconds
    const interval = setInterval(fetchNotifs, 8000)
    return () => clearInterval(interval)
  }, [user])

  async function markAllNotificationsAsRead() {
    try {
      await authJson('/account/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }

  async function markNotificationAsRead(id) {
    try {
      await authJson(`/account/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
      if (
        notifRef.current && !notifRef.current.contains(e.target)
      ) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Live search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = q.trim()
    if (!trimmed) {
      setSuggestions([])
      setShowDropdown(false)
      setSugFetched(false)
      return
    }
    setIsSugLoading(true)
    setShowDropdown(true)
    setSugFetched(false)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/products?q=${encodeURIComponent(trimmed)}&limit=6`)
        if (!res.ok) throw new Error('fetch error')
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
        setSugFetched(true)
      } catch {
        setSuggestions([])
        setSugFetched(true)
      } finally {
        setIsSugLoading(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [q])

  const cartCount = useMemo(() => {
    return (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 1), 0)
  }, [cartItems])

  const role = user?.role || 'GUEST'
  const isBuyerSeller = role === 'BUYER' && !!user?.is_seller
  const profileHref = role === 'SELLER'
    ? '/dashboard/seller'
    : role === 'ADMIN'
      ? '/dashboard/admin'
      : '/dashboard/buyer'

  function logout() {
    clearStoredSession()
    window.location.href = '/'
  }

  function submitSearch(e) {
    e.preventDefault()
    setShowDropdown(false)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    router.push('/' + (params.toString() ? `?${params.toString()}` : ''))
  }

  function selectSuggestion(product) {
    setShowDropdown(false)
    setQ('')
    router.push(`/product/${product.id}`)
  }

  function searchAll() {
    setShowDropdown(false)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    router.push('/' + (params.toString() ? `?${params.toString()}` : ''))
  }

  return (
    <>
      {/* ── Announcement Bar ── */}
      <div className="topbar-info">
        <div className="topbar-info-left">
          <span className="topbar-info-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.58L19 8l-8 8z"/></svg>
            100% Aman
          </span>
          <span className="topbar-info-badge">🚚 Gratis Ongkir min. belanja 50K</span>
          <span className="topbar-info-badge">🔒 Pembayaran Terjamin</span>
        </div>
        <div className="topbar-info-right">
          <a href="#">Bantuan</a>
          <a href="#">Lacak Pesanan</a>
          <a href="#">ID ▾</a>
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <header className="topbar">
        <Link href="/" className="brand-link">
          <div className="brand-logo-wrap">E</div>
          <div className="brand-text">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </Link>

        {/* Search with Autocomplete */}
        <form className="topbar-search" onSubmit={submitSearch} role="search" style={{ position: 'relative' }}>
          <select className="topbar-search-category" aria-label="Kategori pencarian">
            <option>Semua Kategori</option>
            <option>Elektronik</option>
            <option>Fashion</option>
            <option>Kecantikan</option>
            <option>Olahraga</option>
          </select>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => { if (q.trim()) setShowDropdown(true) }}
            placeholder="Cari produk, brand, atau kategori..."
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            autoComplete="off"
          />
          <button type="submit" className="topbar-search-btn" aria-label="Cari">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>

          {/* ── Autocomplete Dropdown ── */}
          {showDropdown && (
            <div ref={dropdownRef} className="search-dropdown" role="listbox" aria-label="Hasil pencarian">
              {isSugLoading && (
                <div className="search-dropdown-loading">
                  <span className="search-loading-spinner" />
                  <span>Mencari produk...</span>
                </div>
              )}

              {!isSugLoading && sugFetched && suggestions.length === 0 && (
                <div className="search-dropdown-empty">
                  <div className="search-empty-icon">🔍</div>
                  <div className="search-empty-text">
                    <strong>Produk tidak ditemukan</strong>
                    <span>Tidak ada produk untuk &ldquo;<em>{q}</em>&rdquo;</span>
                  </div>
                </div>
              )}

              {!isSugLoading && suggestions.length > 0 && (
                <>
                  <div className="search-dropdown-label">Hasil untuk &ldquo;{q}&rdquo;</div>
                  {suggestions.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      className="search-suggestion-item"
                      onClick={() => selectSuggestion(product)}
                      role="option"
                    >
                      <div className="search-sug-img">
                        {product.image
                          ? <img src={product.image} alt={product.title} />
                          : <span>📦</span>
                        }
                      </div>
                      <div className="search-sug-info">
                        <span className="search-sug-title">{product.title}</span>
                        <span className="search-sug-price">
                          Rp {Number(product.price || 0).toLocaleString('id-ID')}
                          {product.category && <em className="search-sug-cat">&nbsp;· {product.category}</em>}
                        </span>
                      </div>
                      <svg className="search-sug-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="search-dropdown-show-all"
                    onClick={searchAll}
                  >
                    Lihat semua hasil untuk &ldquo;{q}&rdquo; →
                  </button>
                </>
              )}
            </div>
          )}
        </form>

        {/* Right side */}
        <div className="topbar-right">
          <Link href="/cart" className="cart-button" aria-label="Keranjang belanja">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge" aria-label={`${cartCount} item`}>{cartCount}</span>
          </Link>

          {user && (
            <div className="notif-wrapper" style={{ position: 'relative' }} ref={notifRef}>
              <button
                type="button"
                className="cart-button"
                style={{ position: 'relative', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                aria-label="Notifikasi"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Notifikasi
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="cart-badge" style={{ backgroundColor: 'var(--red)', right: 10, top: -2 }}>
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  className="search-dropdown"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    width: 320,
                    maxHeight: 400,
                    overflowY: 'auto',
                    zIndex: 1000,
                    display: 'block',
                    padding: '10px 0',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    marginTop: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Notifikasi</strong>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      Tidak ada notifikasi baru
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.type === 'seller_order') {
                              router.push('/dashboard/seller');
                            } else {
                              router.push('/dashboard/buyer');
                            }
                            setShowNotifDropdown(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                            {new Date(n.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {role === 'SELLER' && <Link href="/dashboard/seller" className="nav-link-btn">Seller</Link>}
          {role === 'ADMIN' && <Link href="/dashboard/admin" className="nav-link-btn">Admin</Link>}
          {isBuyerSeller && (
            <Link href="/dashboard/seller" className="nav-link-btn" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }}>
              🏪 Toko
            </Link>
          )}

          {!user ? (
            <>
              <Link href="/login" className="nav-link-btn" id="nav-login-btn">Login</Link>
              <Link href="/register" className="nav-register-btn" id="nav-register-btn">Daftar</Link>
            </>
          ) : (
            <>
              <Link href={profileHref} className="profile-button" title="Buka profil user">
                {user?.avatar ? (
                  <img className="nav-avatar" src={user.avatar} alt={user.name || 'avatar'} />
                ) : (
                  <span className="nav-avatar avatar-initial">{(user.name || 'U').charAt(0)}</span>
                )}
                <span className="profile-meta">
                  <strong>{user?.name || 'User'}</strong>
                  <span>{isBuyerSeller ? 'BUYER + SELLER' : role}</span>
                </span>
              </Link>
              <button className="nav-link-btn" type="button" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </header>

      {/* ── Category Nav ── */}
      <nav className="category-nav" aria-label="Navigasi kategori">
        <button className="category-nav-hamburger" type="button" aria-label="Menu semua kategori">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          Semua Kategori
        </button>
        <div className="category-nav-sep" />
        {navItems.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className={`category-nav-item${router.pathname === item.href ? ' category-nav-item--active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
