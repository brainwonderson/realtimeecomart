import { useEffect, useMemo, useRef, useState } from 'react'
import SiteNav from '../../components/SiteNav'
import { authFetch, authJson } from '../../lib/clientApi'
import { getStoredUser } from '../../lib/session'

const ADMIN_BANNER_TYPES = [
  { value: 'homepage', label: 'Banner Homepage', color: '#3b82f6', icon: '🏠' },
  { value: 'event', label: 'Banner Event', color: '#8b5cf6', icon: '🎉' },
  { value: 'flash_sale', label: 'Banner Flash Sale', color: '#ef4444', icon: '⚡' },
  { value: 'voucher', label: 'Banner Voucher', color: '#f59e0b', icon: '🎫' },
  { value: 'promo_nasional', label: 'Banner Promo Nasional', color: '#10b981', icon: '🇮🇩' },
]

const TYPE_MAP = Object.fromEntries(ADMIN_BANNER_TYPES.map(t => [t.value, t]))

const emptyBanner = { title: '', link_url: '', is_active: 1, type: 'homepage' }

function TypeBadge({ type }) {
  const t = TYPE_MAP[type] || { label: type, color: '#64748b', icon: '📌' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: t.color + '22', color: t.color,
      border: `1px solid ${t.color}44`,
    }}>
      {t.icon} {t.label}
    </span>
  )
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [banners, setBanners] = useState([])
  const [bannerForm, setBannerForm] = useState(emptyBanner)
  const [bannerImageFile, setBannerImageFile] = useState(null)
  const [bannerImagePreview, setBannerImagePreview] = useState(null)
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bannerError, setBannerError] = useState(null)
  const [bannerFilterType, setBannerFilterType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [flashSaleEvents, setFlashSaleEvents] = useState([])
  const [flashSaleEventForm, setFlashSaleEventForm] = useState({ title: '', description: '', start_at: '', end_at: '', is_active: 1 })
  const [flashSaleEventSaving, setFlashSaleEventSaving] = useState(false)
  const [flashSaleError, setFlashSaleError] = useState(null)
  const [flashSaleProposals, setFlashSaleProposals] = useState([])

  // Platform promos state
  const [promos, setPromos] = useState([])
  const [promoForm, setPromoForm] = useState({
    id: null,
    category: 'voucher',
    name: '',
    code: '',
    discount_type: 'fixed',
    discount_value: '',
    max_discount: '',
    min_spend: '',
    valid_until: '',
    quota: '',
    is_active: 1
  })
  const [promoSaving, setPromoSaving] = useState(false)
  const [promoError, setPromoError] = useState(null)

  // Edit modal state
  const [editBanner, setEditBanner] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', link_url: '', is_active: 1, type: 'homepage' })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)
  const editFileInputRef = useRef(null)

  useEffect(() => {
    setUser(getStoredUser())
    if (!getStoredUser()) setLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function load() {
      try {
        const [statsData, usersData, productsData, bannersData, eventsData, proposalsData, promosData] = await Promise.all([
          authJson('/admin/stats'),
          authJson('/admin/users'),
          authJson('/products'),
          authJson('/admin/banners'),
          authJson('/products/flash-sale/events'),
          authJson('/admin/flash-sale/proposals'),
          authJson('/admin/promos').catch(() => []),
        ])
        if (!active) return
        setStats(statsData)
        setUsers(usersData || [])
        setProducts(productsData || [])
        setBanners(bannersData || [])
        setFlashSaleEvents(Array.isArray(eventsData) ? eventsData : [])
        setFlashSaleProposals(Array.isArray(proposalsData) ? proposalsData : [])
        setPromos(Array.isArray(promosData) ? promosData : [])
      } catch (err) {
        if (active) console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user])

  async function refresh() {
    try {
      const [statsData, usersData, productsData, bannersData, eventsData, proposalsData, promosData] = await Promise.all([
        authJson('/admin/stats'),
        authJson('/admin/users'),
        authJson('/products'),
        authJson('/admin/banners'),
        authJson('/products/flash-sale/events'),
        authJson('/admin/flash-sale/proposals'),
        authJson('/admin/promos').catch(() => []),
      ])
      setStats(statsData)
      setUsers(usersData || [])
      setProducts(productsData || [])
      setBanners(bannersData || [])
      setFlashSaleEvents(Array.isArray(eventsData) ? eventsData : [])
      setFlashSaleProposals(Array.isArray(proposalsData) ? proposalsData : [])
      setPromos(Array.isArray(promosData) ? promosData : [])
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  async function toggleBan(id, isBanned) {
    await authJson(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ isBanned }) })
    await refresh()
  }

  async function verifySeller(id) {
    await authJson(`/admin/users/${id}/verify-seller`, { method: 'POST', body: JSON.stringify({}) })
    await refresh()
  }

  async function moderateProduct(id, status) {
    await authJson(`/admin/products/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status }) })
    await refresh()
  }

  async function deleteProduct(id) {
    await authJson(`/admin/products/${id}`, { method: 'DELETE' })
    await refresh()
  }

  /* ── Platform Promos ── */
  async function savePromo() {
    if (!promoForm.name || !promoForm.category) return
    setPromoSaving(true)
    setPromoError(null)
    try {
      const payload = { ...promoForm }
      
      // Clear non-applicable fields based on category
      if (payload.category !== 'voucher') {
        payload.code = null
        payload.quota = null
        payload.valid_until = null
      }
      if (payload.category === 'gratis_ongkir') {
        payload.discount_value = 0
        payload.discount_type = 'fixed'
      }

      if (payload.id) {
        // update
        await authJson(`/admin/promos/${payload.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
        alert('Promo platform berhasil diperbarui')
      } else {
        // create
        await authJson('/admin/promos', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        alert('Promo platform berhasil dibuat')
      }
      
      // reset form
      setPromoForm({
        id: null,
        category: 'voucher',
        name: '',
        code: '',
        discount_type: 'fixed',
        discount_value: '',
        max_discount: '',
        min_spend: '',
        valid_until: '',
        quota: '',
        is_active: 1
      })
      await refresh()
    } catch (err) {
      setPromoError(err.message || 'Gagal menyimpan promo')
    } finally {
      setPromoSaving(false)
    }
  }

  function editPromo(promo) {
    let validUntilFormatted = ''
    if (promo.valid_until) {
      const date = new Date(promo.valid_until)
      const offset = date.getTimezoneOffset()
      const localDate = new Date(date.getTime() - (offset*60*1000))
      validUntilFormatted = localDate.toISOString().slice(0, 16)
    }

    setPromoForm({
      id: promo.id,
      category: promo.category || 'voucher',
      name: promo.name || '',
      code: promo.code || '',
      discount_type: promo.discount_type || 'fixed',
      discount_value: promo.discount_value !== null ? String(promo.discount_value) : '',
      max_discount: promo.max_discount !== null ? String(promo.max_discount) : '',
      min_spend: promo.min_spend !== null ? String(promo.min_spend) : '',
      valid_until: validUntilFormatted,
      quota: promo.quota !== null ? String(promo.quota) : '',
      is_active: promo.is_active
    })
  }

  async function deletePromo(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus promo ini?')) return
    try {
      await authJson(`/admin/promos/${id}`, { method: 'DELETE' })
      alert('Promo dihapus')
      await refresh()
    } catch (err) {
      alert('Gagal menghapus promo: ' + (err.message || ''))
    }
  }

  async function togglePromoStatus(promo) {
    try {
      await authJson(`/admin/promos/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: promo.is_active ? 0 : 1 })
      })
      await refresh()
    } catch (err) {
      alert('Gagal mengubah status: ' + (err.message || ''))
    }
  }

  /* ── Banner: Tambah ── */
  async function saveBanner() {
    if (!bannerForm.title || !bannerImageFile) return
    setBannerSaving(true)
    setBannerError(null)
    try {
      const fd = new FormData()
      fd.append('title', bannerForm.title)
      fd.append('image', bannerImageFile)
      fd.append('type', bannerForm.type)
      if (bannerForm.link_url) fd.append('link_url', bannerForm.link_url)
      fd.append('is_active', String(bannerForm.is_active))
      const res = await authFetch('/admin/banners', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal menyimpan banner' }))
        throw new Error(err.error || 'Gagal menyimpan banner')
      }
      setBannerForm(emptyBanner)
      setBannerImageFile(null)
      setBannerImagePreview(null)
      await refresh()
    } catch (err) {
      setBannerError(err.message)
    } finally {
      setBannerSaving(false)
    }
  }

  async function saveFlashSaleEvent() {
    if (!flashSaleEventForm.title || !flashSaleEventForm.start_at || !flashSaleEventForm.end_at) return
    setFlashSaleEventSaving(true)
    setFlashSaleError(null)
    try {
      if (flashSaleEventForm.id) {
        // update
        await authJson(`/admin/flash-sale/events/${flashSaleEventForm.id}`, { method: 'PATCH', body: JSON.stringify({ title: flashSaleEventForm.title, description: flashSaleEventForm.description, start_at: flashSaleEventForm.start_at, end_at: flashSaleEventForm.end_at, is_active: flashSaleEventForm.is_active }) })
        alert('Flash Sale event berhasil diperbarui')
      } else {
        await authJson('/admin/flash-sale/events', { method: 'POST', body: JSON.stringify(flashSaleEventForm) })
        alert('Flash Sale event berhasil dibuat')
      }
      setFlashSaleEventForm({ title: '', description: '', start_at: '', end_at: '', is_active: 1 })
      await refresh()
    } catch (err) {
      setFlashSaleError(err.message || 'Gagal membuat flash sale event')
    } finally {
      setFlashSaleEventSaving(false)
    }
  }

  async function approveProposal(id, eventId) {
    await authJson(`/admin/flash-sale/proposals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED', event_id: eventId || null })
    })
    await refresh()
  }

  async function rejectProposal(id) {
    await authJson(`/admin/flash-sale/proposals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED' })
    })
    await refresh()
  }

  async function editFlashSaleEvent(event) {
    setFlashSaleEventForm({ id: event.id, title: event.title || '', description: event.description || '', start_at: event.start_at || '', end_at: event.end_at || '', is_active: event.is_active || 1 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteFlashSaleEvent(id) {
    if (!confirm('Hapus event ini?')) return
    try {
      await authJson(`/admin/flash-sale/events/${id}`, { method: 'DELETE' })
      await refresh()
      alert('Event dihapus')
    } catch (err) {
      alert('Gagal menghapus: ' + (err.message || ''))
    }
  }

  function handleBannerImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setBannerImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  /* ── Banner: Hapus ── */
  async function deleteBanner(id) {
    if (!confirm('Hapus banner ini?')) return
    try {
      await authJson(`/admin/banners/${id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  /* ── Banner: Edit Modal ── */
  function openEditBanner(banner) {
    setEditBanner(banner)
    setEditForm({ title: banner.title, link_url: banner.link_url || '', is_active: banner.is_active, type: banner.type || 'homepage' })
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditError(null)
  }

  function closeEditModal() {
    setEditBanner(null)
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditError(null)
  }

  function handleEditImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setEditImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function saveEditBanner() {
    if (!editForm.title) return
    setEditSaving(true)
    setEditError(null)
    try {
      const fd = new FormData()
      fd.append('title', editForm.title)
      fd.append('link_url', editForm.link_url || '')
      fd.append('is_active', String(editForm.is_active))
      fd.append('type', editForm.type)
      if (editImageFile) fd.append('image', editImageFile)
      const res = await authFetch(`/admin/banners/${editBanner.id}`, { method: 'PATCH', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal menyimpan' }))
        throw new Error(err.error || 'Gagal menyimpan')
      }
      closeEditModal()
      await refresh()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  const verifiedSellerCount = useMemo(() => users.filter(item => item.role === 'SELLER' && item.is_verified).length, [users])

  const filteredBanners = bannerFilterType === 'all'
    ? banners
    : banners.filter(b => b.type === bannerFilterType)

  return (
    <div className="container">
      <SiteNav title="EcoMart Admin" subtitle="Admin dashboard" />

      <div className="section-title">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Kelola user, verifikasi seller, moderasi produk, banner promo, dan monitoring sistem.</p>
        </div>
        <span className="chip">Verified sellers: {verifiedSellerCount}</span>
      </div>

      {loading ? (
        <div className="panel">Memuat dashboard admin...</div>
      ) : !user ? (
        <div className="panel stack">
          <h3>Login dulu</h3>
          <p className="muted">Dashboard admin hanya tersedia setelah login sebagai ADMIN.</p>
          <a className="button" href="/login">Login</a>
        </div>
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="tabs">
            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Ringkasan & User</button>
            <button className={`tab ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>🖼️ Banner & Flash Sale</button>
            <button className={`tab ${activeTab === 'promos' ? 'active' : ''}`} onClick={() => setActiveTab('promos')}>🎫 Promosi Platform</button>
          </div>

          {activeTab === 'overview' && (
            <div className="dashboard-grid admin-grid">
              <section className="stats-grid">
                <article className="mini-stat"><strong>{stats?.users ?? 0}</strong><span>Total user</span></article>
                <article className="mini-stat"><strong>{stats?.products ?? 0}</strong><span>Total produk</span></article>
                <article className="mini-stat"><strong>{stats?.orders ?? 0}</strong><span>Total transaksi</span></article>
                <article className="mini-stat"><strong>Rp {stats?.revenue ?? 0}</strong><span>Revenue</span></article>
              </section>

              <section className="panel stack full-span">
                <h3>User management</h3>
                {(users || []).map(item => (
                  <article key={item.id} className="table-card">
                    <div className="table-card-head">
                      <strong>{item.name}</strong>
                      <span className="chip">{item.role}</span>
                    </div>
                    <p className="muted">{item.email} | verified: {item.is_verified ? 'yes' : 'no'} | banned: {item.is_banned ? 'yes' : 'no'}</p>
                    <div className="row-actions">
                      <button className="ghost-button" onClick={() => toggleBan(item.id, !item.is_banned)}>{item.is_banned ? 'Unban' : 'Ban'}</button>
                      {item.role === 'SELLER' && !item.is_verified ? <button className="button" onClick={() => verifySeller(item.id)}>Verifikasi seller</button> : null}
                    </div>
                  </article>
                ))}
              </section>

              <section className="panel stack">
                <h3>Moderasi produk</h3>
                {(products || []).map(product => (
                  <article key={product.id} className="table-card">
                    <div className="table-card-head">
                      <strong>{product.title}</strong>
                      <span className="chip">{product.status || 'ACTIVE'}</span>
                    </div>
                    <p className="muted">Rp {product.price} | Stok {product.stock}</p>
                    <div className="row-actions wrap">
                      <button className="ghost-button" onClick={() => moderateProduct(product.id, 'ACTIVE')}>Aktif</button>
                      <button className="ghost-button" onClick={() => moderateProduct(product.id, 'FLAGGED')}>Flag</button>
                      <button className="ghost-button" onClick={() => moderateProduct(product.id, 'ARCHIVED')}>Archive</button>
                      <button className="button" onClick={() => deleteProduct(product.id)}>Hapus</button>
                    </div>
                  </article>
                ))}
              </section>

              <section className="panel stack">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <h3>Proposal Flash Sale</h3>
                  <span className="chip">{flashSaleProposals.length} proposal</span>
                </div>
                {flashSaleProposals.length === 0 ? (
                  <p className="muted">Belum ada proposal flash sale.</p>
                ) : (
                  flashSaleProposals.map(proposal => (
                    <article key={proposal.id} className="table-card">
                      <div className="table-card-head">
                        <strong>{proposal.product_title}</strong>
                        <span className="chip" style={{
                          background: proposal.status === 'APPROVED' ? 'rgba(16,185,129,0.1)' :
                                      proposal.status === 'PENDING' ? 'rgba(59,130,246,0.1)' :
                                      proposal.status === 'EXPIRED' ? 'rgba(100,116,139,0.1)' :
                                      'rgba(239,68,68,0.1)',
                          color: proposal.status === 'APPROVED' ? '#10b981' :
                                 proposal.status === 'PENDING' ? '#2563eb' :
                                 proposal.status === 'EXPIRED' ? '#64748b' :
                                 '#dc2626'
                        }}>{proposal.status}</span>
                      </div>
                      <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}><strong>Seller:</strong> {proposal.seller_name || '—'} ({proposal.seller_email || '—'})</p>
                      <p className="muted">{proposal.message || 'Tidak ada pesan tambahan'}</p>
                      <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>Diajukan: {new Date(proposal.created_at).toLocaleString('id-ID')}</p>
                      <div className="row-actions wrap">
                        {proposal.status === 'PENDING' ? (
                          <>
                            <select id={`event-select-${proposal.id}`} style={{ minWidth: 200, fontSize: 12, padding: '6px 10px' }} defaultValue="">
                              <option value="">Pilih event (opsional)</option>
                              {flashSaleEvents.map(event => (
                                <option key={event.id} value={event.id}>{event.title} — {new Date(event.start_at).toLocaleDateString('id-ID')}</option>
                              ))}
                            </select>
                            <button className="button" style={{ minWidth: 120 }} onClick={() => {
                              const select = document.getElementById(`event-select-${proposal.id}`)
                              approveProposal(proposal.id, select?.value || null)
                            }}>Setujui</button>
                            <button className="ghost-button" style={{ minWidth: 120 }} onClick={() => rejectProposal(proposal.id)}>Tolak</button>
                          </>
                        ) : (
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="muted" style={{ fontSize: 12 }}>Event: {proposal.event_title || 'Tanpa event'}</span>
                            {proposal.status === 'APPROVED' && proposal.event_title && <span className="chip chip--green">Telah dijadwalkan</span>}
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </section>

              <aside className="panel stack">
                <h3>System monitoring</h3>
                <div className="summary">
                  <p className="muted">Total transaksi, total user, aktivitas sistem, dan promo content sudah tersedia lewat backend stats.</p>
                </div>
                <a className="ghost-button" href="/">Back to storefront</a>
              </aside>
            </div>
          )}

          {activeTab === 'banners' && (
            <div className="dashboard-grid admin-grid">
              {/* ══ BANNER PROMO SECTION ══ */}
              <section className="panel stack">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0 }}>🎯 Banner Promo Admin</h3>
                  <span className="muted" style={{ fontSize: 12 }}>Global marketplace banners</span>
                </div>

                {/* Tipe legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ADMIN_BANNER_TYPES.map(t => (
                    <span key={t.value} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                      background: t.color + '18', color: t.color, border: `1px solid ${t.color}33`
                    }}>
                      {t.icon} {t.label}
                    </span>
                  ))}
                </div>

                {/* Form tambah banner */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px', background: 'var(--bg-elevated)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>➕ Tambah Banner Baru</p>
                  <input value={bannerForm.title} onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="Judul banner" />

                  <label className="modal-label" style={{ marginTop: 8 }}>
                    Tipe Banner
                    <select value={bannerForm.type} onChange={e => setBannerForm({ ...bannerForm, type: e.target.value })}>
                      {ADMIN_BANNER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="banner-upload-area" style={{ marginTop: 8 }}>
                    <label htmlFor="banner-img-input" className="banner-upload-label">
                      {bannerImagePreview ? (
                        <img src={bannerImagePreview} alt="Preview" className="banner-img-preview" />
                      ) : (
                        <div className="banner-upload-placeholder">
                          <span className="banner-upload-icon">🖼️</span>
                          <span>Klik untuk pilih gambar</span>
                          <span className="muted" style={{ fontSize: '0.78rem' }}>JPG, PNG, WEBP — maks. 10MB</span>
                        </div>
                      )}
                    </label>
                    <input id="banner-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerImageChange} />
                    {bannerImagePreview && (
                      <button className="ghost-button" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                        onClick={() => { setBannerImagePreview(null); setBannerImageFile(null) }}>
                        Hapus gambar
                      </button>
                    )}
                  </div>

                  <input value={bannerForm.link_url} onChange={e => setBannerForm({ ...bannerForm, link_url: e.target.value })} placeholder="Link tujuan (opsional)" style={{ marginTop: 8 }} />
                  {bannerError && <p style={{ color: 'var(--red)', margin: '4px 0 0', fontSize: '0.85rem' }}>{bannerError}</p>}
                  <button className="button" onClick={saveBanner} disabled={!bannerForm.title || !bannerImageFile || bannerSaving} style={{ marginTop: 10, width: '100%' }}>
                    {bannerSaving ? 'Menyimpan...' : 'Simpan Banner'}
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px', background: 'var(--bg-elevated)', marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>⚡ Buat Flash Sale Event</p>
                    <span className="chip">{flashSaleEvents.length} event aktif</span>
                  </div>
                  <input value={flashSaleEventForm.title} onChange={e => setFlashSaleEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul event *" />
                  <textarea rows={2} value={flashSaleEventForm.description} onChange={e => setFlashSaleEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi event" style={{ marginTop: 8, width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <div>
                      <label className="field-label">Mulai</label>
                      <input type="datetime-local" value={flashSaleEventForm.start_at} onChange={e => setFlashSaleEventForm(f => ({ ...f, start_at: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Berakhir</label>
                      <input type="datetime-local" value={flashSaleEventForm.end_at} onChange={e => setFlashSaleEventForm(f => ({ ...f, end_at: e.target.value }))} />
                    </div>
                  </div>
                  <label className="modal-label" style={{ marginTop: 8 }}>
                    Status
                    <select value={flashSaleEventForm.is_active} onChange={e => setFlashSaleEventForm(f => ({ ...f, is_active: Number(e.target.value) }))}>
                      <option value={1}>Aktif</option>
                      <option value={0}>Nonaktif</option>
                    </select>
                  </label>
                  {flashSaleError && <p style={{ color: 'var(--red)', margin: '4px 0 0', fontSize: '0.85rem' }}>{flashSaleError}</p>}
                  <button className="button" onClick={saveFlashSaleEvent} disabled={!flashSaleEventForm.title || !flashSaleEventForm.start_at || !flashSaleEventForm.end_at || flashSaleEventSaving} style={{ marginTop: 10, width: '100%' }}>
                    {flashSaleEventSaving ? 'Menyimpan event...' : 'Simpan Flash Sale Event'}
                  </button>

                  {/* Daftar event (edit/delete) */}
                  <div style={{ marginTop: 12 }}>
                    {flashSaleEvents.length === 0 ? (
                      <p className="muted" style={{ marginTop: 8 }}>Belum ada event flash sale.</p>
                    ) : (
                      flashSaleEvents.map(ev => (
                        <article key={ev.id} className="table-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <strong>{ev.title}</strong>
                            <div className="muted" style={{ fontSize: 12 }}>Mulai: {new Date(ev.start_at).toLocaleString('id-ID')} · Berakhir: {new Date(ev.end_at).toLocaleString('id-ID')}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="ghost-button" onClick={() => editFlashSaleEvent(ev)}>✏️ Edit</button>
                            <button className="banner-delete-btn" onClick={() => deleteFlashSaleEvent(ev.id)}>🗑️ Hapus</button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Filter & daftar banner */}
              <section className="panel stack">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button
                    className={bannerFilterType === 'all' ? 'button' : 'ghost-button'}
                    style={{ fontSize: 12, padding: '5px 10px' }}
                    onClick={() => setBannerFilterType('all')}
                  >Semua ({banners.length})</button>
                  {ADMIN_BANNER_TYPES.map(t => {
                    const count = banners.filter(b => b.type === t.value).length
                    if (!count) return null
                    return (
                      <button
                        key={t.value}
                        className={bannerFilterType === t.value ? 'button' : 'ghost-button'}
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => setBannerFilterType(t.value)}
                      >{t.icon} {t.label} ({count})</button>
                    )
                  })}
                </div>

                <div className="stack">
                  {filteredBanners.length === 0 && (
                    <p className="muted" style={{ textAlign: 'center', padding: '16px 0' }}>Belum ada banner {bannerFilterType !== 'all' ? `tipe ini` : ''}.</p>
                  )}
                  {filteredBanners.map(banner => (
                    <article key={banner.id} className="banner-list-card">
                      {banner.image && <img src={banner.image} alt={banner.title} className="banner-list-thumb" />}
                      <div className="banner-list-info">
                        <div className="banner-list-title-row">
                          <strong>{banner.title}</strong>
                          <TypeBadge type={banner.type} />
                          <span className={banner.is_active ? 'chip chip--green' : 'chip chip--muted'}>
                            {banner.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <p className="muted banner-list-link">{banner.link_url || '—'}</p>
                      </div>
                      <div className="banner-list-actions">
                        <button className="ghost-button banner-action-btn" onClick={() => openEditBanner(banner)}>✏️ Edit</button>
                        <button className="banner-delete-btn" onClick={() => deleteBanner(banner.id)}>🗑️ Hapus</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'promos' && (
            <div className="dashboard-grid admin-grid">
              {/* Left panel: Form tambah/edit promo */}
              <section className="panel stack">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3>{promoForm.id ? '✏️ Edit Promo Platform' : '➕ Buat Promo Baru'}</h3>
                  {promoForm.id && (
                    <button className="ghost-button" onClick={() => setPromoForm({
                      id: null, category: 'voucher', name: '', code: '', discount_type: 'fixed',
                      discount_value: '', max_discount: '', min_spend: '', valid_until: '', quota: '', is_active: 1
                    })} style={{ fontSize: 11 }}>Batal Edit</button>
                  )}
                </div>
                
                <div className="stack" style={{ gap: 12 }}>
                  <label className="modal-label">
                    Kategori Promo
                    <select value={promoForm.category} onChange={e => setPromoForm({ ...promoForm, category: e.target.value })}>
                      <option value="voucher">Voucher Diskon (Masukkan Kode)</option>
                      <option value="gratis_ongkir">Promo Gratis Ongkir (Syarat Belanja)</option>
                      <option value="checkout_discount">Promo Checkout (Potongan Otomatis)</option>
                    </select>
                  </label>

                  <label className="modal-label">
                    Nama Promo
                    <input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="Contoh: Diskon Merdeka, Gratis Ongkir Hemat" />
                  </label>

                  {promoForm.category === 'voucher' && (
                    <label className="modal-label">
                      Kode Voucher (Kapital, tanpa spasi)
                      <input value={promoForm.code} onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase().replace(/\s+/g, '') })} placeholder="Contoh: MERDEKA88" />
                    </label>
                  )}

                  {promoForm.category !== 'gratis_ongkir' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="modal-label">
                        Jenis Diskon
                        <select value={promoForm.discount_type} onChange={e => setPromoForm({ ...promoForm, discount_type: e.target.value })}>
                          <option value="fixed">Nominal Tetap (Rp)</option>
                          <option value="percentage">Persentase (%)</option>
                        </select>
                      </label>

                      <label className="modal-label">
                        Nilai Diskon
                        <input type="number" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })} placeholder={promoForm.discount_type === 'fixed' ? 'Nominal Rp' : 'Persentase %'} />
                      </label>
                    </div>
                  )}

                  {promoForm.category !== 'gratis_ongkir' && promoForm.discount_type === 'percentage' && (
                    <label className="modal-label">
                      Maksimal Potongan Diskon (Opsional)
                      <input type="number" value={promoForm.max_discount} onChange={e => setPromoForm({ ...promoForm, max_discount: e.target.value })} placeholder="Kosongkan jika tidak dibatasi" />
                    </label>
                  )}

                  <label className="modal-label">
                    Minimal Belanja (Rp)
                    <input type="number" value={promoForm.min_spend} onChange={e => setPromoForm({ ...promoForm, min_spend: e.target.value })} placeholder="Contoh: 100000" />
                  </label>

                  {promoForm.category === 'voucher' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label className="modal-label">
                        Kuota Pemakaian
                        <input type="number" value={promoForm.quota} onChange={e => setPromoForm({ ...promoForm, quota: e.target.value })} placeholder="Contoh: 100" />
                      </label>
                      
                      <label className="modal-label">
                        Berlaku Sampai
                        <input type="datetime-local" value={promoForm.valid_until} onChange={e => setPromoForm({ ...promoForm, valid_until: e.target.value })} />
                      </label>
                    </div>
                  )}

                  <label className="modal-label">
                    Status Aktif
                    <select value={promoForm.is_active} onChange={e => setPromoForm({ ...promoForm, is_active: Number(e.target.value) })}>
                      <option value={1}>Aktif</option>
                      <option value={0}>Nonaktif</option>
                    </select>
                  </label>

                  {promoError && <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: 0 }}>{promoError}</p>}

                  <button className="button" onClick={savePromo} disabled={promoSaving || !promoForm.name || (promoForm.category === 'voucher' && !promoForm.code)} style={{ marginTop: 8 }}>
                    {promoSaving ? 'Menyimpan...' : promoForm.id ? 'Simpan Perubahan' : 'Simpan Promo'}
                  </button>
                </div>
              </section>

              {/* Right panel: List promo platform */}
              <section className="panel stack">
                <h3>📋 Daftar Promo Platform</h3>
                {promos.length === 0 ? (
                  <p className="muted">Belum ada promo platform yang dibuat.</p>
                ) : (
                  <div className="stack" style={{ gap: 12 }}>
                    {promos.map(promo => {
                      const isVoucher = promo.category === 'voucher'
                      const isFreeShipping = promo.category === 'gratis_ongkir'
                      const isCheckout = promo.category === 'checkout_discount'
                      
                      let promoTypeLabel = 'Voucher Diskon'
                      let badgeColor = 'var(--accent)'
                      if (isFreeShipping) {
                        promoTypeLabel = 'Gratis Ongkir'
                        badgeColor = '#10b981'
                      } else if (isCheckout) {
                        promoTypeLabel = 'Promo Checkout'
                        badgeColor = '#8b5cf6'
                      }

                      return (
                        <article key={promo.id} className="table-card" style={{ borderLeft: `4px solid ${badgeColor}` }}>
                          <div className="table-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: 16 }}>{promo.name}</strong>
                              <div style={{ marginTop: 4 }}>
                                <span className="chip" style={{ background: badgeColor + '22', color: badgeColor, border: `1px solid ${badgeColor}33`, fontSize: 10 }}>
                                  {promoTypeLabel}
                                </span>
                                {isVoucher && (
                                  <span className="chip" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: 10, marginLeft: 6, fontFamily: 'monospace', fontWeight: 'bold' }}>
                                    {promo.code}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`chip ${promo.is_active ? 'chip--green' : 'chip--muted'}`}>
                              {promo.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>

                          <div className="muted" style={{ fontSize: 12, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {isFreeShipping ? (
                              <span>🚚 Gratis Ongkir untuk semua pengiriman</span>
                            ) : (
                              <span>
                                💰 Potongan: {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp ${Number(promo.discount_value).toLocaleString('id-ID')}`}
                                {promo.max_discount && ` (Maks. Rp ${Number(promo.max_discount).toLocaleString('id-ID')})`}
                              </span>
                            )}
                            <span>🛒 Min. Belanja: Rp {Number(promo.min_spend).toLocaleString('id-ID')}</span>
                            {isVoucher && (
                              <>
                                <span>📊 Penggunaan: <strong>{promo.used_count}</strong> {promo.quota !== null ? `dari ${promo.quota} kuota` : 'pemakaian'}</span>
                                {promo.valid_until && (
                                  <span>📅 Berlaku sampai: {new Date(promo.valid_until).toLocaleString('id-ID')}</span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="row-actions" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 6 }}>
                            <button className="ghost-button" onClick={() => togglePromoStatus(promo)} style={{ fontSize: 11, padding: '4px 8px' }}>
                              {promo.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button className="ghost-button" onClick={() => editPromo(promo)} style={{ fontSize: 11, padding: '4px 8px' }}>
                              ✏️ Edit
                            </button>
                            <button className="ghost-button" onClick={() => deletePromo(promo.id)} style={{ fontSize: 11, padding: '4px 8px', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}>
                              🗑️ Hapus
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL EDIT BANNER ══ */}
      {editBanner && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditModal() }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Banner</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <div className="modal-body stack">
              <label className="modal-label">
                Judul banner
                <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Judul banner" />
              </label>
              <label className="modal-label">
                Tipe Banner
                <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                  {ADMIN_BANNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </label>
              <label className="modal-label">
                Link tujuan
                <input value={editForm.link_url} onChange={e => setEditForm({ ...editForm, link_url: e.target.value })} placeholder="https://..." />
              </label>
              <label className="modal-label">
                Status
                <select value={editForm.is_active} onChange={e => setEditForm({ ...editForm, is_active: Number(e.target.value) })}>
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
              </label>
              <div>
                <p className="modal-label-text">Gambar banner</p>
                <div className="banner-upload-area">
                  <label htmlFor="edit-banner-img-input" className="banner-upload-label">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview baru" className="banner-img-preview" />
                    ) : (
                      <div className="banner-upload-placeholder" style={{ minHeight: '90px' }}>
                        {editBanner.image ? (
                          <img src={editBanner.image} alt={editBanner.title} style={{ maxHeight: '80px', objectFit: 'contain', borderRadius: '6px' }} />
                        ) : <span className="banner-upload-icon">🖼️</span>}
                        <span style={{ fontSize: '0.8rem' }}>Klik untuk ganti gambar</span>
                      </div>
                    )}
                  </label>
                  <input ref={editFileInputRef} id="edit-banner-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditImageChange} />
                  {editImagePreview && (
                    <button className="ghost-button" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                      onClick={() => { setEditImagePreview(null); setEditImageFile(null); if (editFileInputRef.current) editFileInputRef.current.value = '' }}>
                      Batal ganti gambar
                    </button>
                  )}
                </div>
              </div>
              {editError && <p style={{ color: 'var(--red)', margin: 0, fontSize: '0.85rem' }}>{editError}</p>}
            </div>
            <div className="modal-footer">
              <button className="ghost-button" onClick={closeEditModal} disabled={editSaving}>Batal</button>
              <button className="button" onClick={saveEditBanner} disabled={!editForm.title || editSaving}>
                {editSaving ? 'Menyimpan...' : 'Simpan perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
