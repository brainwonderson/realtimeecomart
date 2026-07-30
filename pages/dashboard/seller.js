import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import SiteNav from '../../components/SiteNav'
import { authFetch, authJson } from '../../lib/clientApi'
import { getStoredUser } from '../../lib/session'

const SELLER_BANNER_TYPES = [
  { value: 'toko',            label: 'Banner Toko',            color: '#3b82f6', icon: '🏪' },
  { value: 'produk_baru',     label: 'Banner Produk Baru',     color: '#10b981', icon: '✨' },
  { value: 'diskon',          label: 'Banner Diskon',          color: '#ef4444', icon: '🔖' },
  { value: 'koleksi_terbaru', label: 'Banner Koleksi Terbaru', color: '#8b5cf6', icon: '🆕' },
]
const SELLER_TYPE_MAP = Object.fromEntries(SELLER_BANNER_TYPES.map(t => [t.value, t]))

function SellerTypeBadge({ type }) {
  const t = SELLER_TYPE_MAP[type] || { label: type, color: '#64748b', icon: '📌' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
      background: t.color + '22', color: t.color, border: `1px solid ${t.color}44`,
    }}>
      {t.icon} {t.label}
    </span>
  )
}

const emptyProduct = { title: '', description: '', price: '', original_price: '', stock: '', image: '', category: '', status: 'ACTIVE', colors: '', sizes: '', media: [] }
const emptyStore   = { name: '', description: '', logo: '', banner: '' }

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

function StoreStatusBadge({ isOpen }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
      color: isOpen ? '#10b981' : '#64748b',
      border: `1px solid ${isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#10b981' : '#64748b', display: 'inline-block' }} />
      {isOpen ? 'Toko Buka' : 'Toko Tutup'}
    </span>
  )
}

export default function SellerDashboard() {
  const [user, setUser]             = useState(null)
  const [activeTab, setActiveTab]   = useState('store')   // 'store' | 'products' | 'orders' | 'banners'
  const [loading, setLoading]       = useState(true)

  // Chat states
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Store state
  const [store, setStore]           = useState(null)
  const [storeForm, setStoreForm]   = useState(emptyStore)
  const [storeMode, setStoreMode]   = useState('view')    // 'view' | 'create' | 'edit'
  const [logoInputKey, setLogoInputKey] = useState(0)
  const [bannerInputKey, setBannerInputKey] = useState(0)
  const [storeSaving, setStoreSaving] = useState(false)

  // Products state
  const [products, setProducts]     = useState([])
  const [orders, setOrders]         = useState([])
  const [form, setForm]             = useState(emptyProduct)
  const [editingId, setEditingId]   = useState(null)
  const [imageInputKey, setImageInputKey] = useState(0)

  // Seller Banners state
  const [sellerBanners, setSellerBanners]       = useState([])
  const [sBannerForm, setSBannerForm]           = useState({ title: '', link_url: '', is_active: 1, type: 'toko' })
  const [sBannerFile, setSBannerFile]           = useState(null)
  const [sBannerPreview, setSBannerPreview]     = useState(null)
  const [sBannerSaving, setSBannerSaving]       = useState(false)
  const [sBannerError, setSBannerError]         = useState(null)
  const [sBannerEdit, setSBannerEdit]           = useState(null)
  const [sBannerEditForm, setSBannerEditForm]   = useState({ title: '', link_url: '', is_active: 1, type: 'toko' })
  const [sBannerEditFile, setSBannerEditFile]   = useState(null)
  const [sBannerEditPreview, setSBannerEditPreview] = useState(null)
  const [sBannerEditSaving, setSBannerEditSaving]   = useState(false)
  const [sBannerEditError, setSBannerEditError]     = useState(null)
  const [flashSaleProposals, setFlashSaleProposals] = useState([])
  const [proposalSaving, setProposalSaving] = useState(false)
  const [proposalError, setProposalError] = useState(null)
  const [flashSaleForm, setFlashSaleForm] = useState({ product: null, original_price: '', flash_sale_price: '', message: '' })
  const [showFlashSaleForm, setShowFlashSaleForm] = useState(false)
  const sBannerEditFileRef = useRef(null)

  // Seller Promos states
  const emptyPromo = { name: '', discount_percentage: '', start_time: '', end_time: '', product_ids: [] }
  const [sellerPromos, setSellerPromos]         = useState([])
  const [promoForm, setPromoForm]               = useState(emptyPromo)
  const [editingPromoId, setEditingPromoId]     = useState(null)
  const [promoSaving, setPromoSaving]           = useState(false)
  const [promoError, setPromoError]             = useState(null)
  const [promoMode, setPromoMode]               = useState('list') // 'list' | 'create' | 'edit'
  const [promoProductSearch, setPromoProductSearch] = useState('')

  // Reject Order Modal State
  const [rejectOrderId, setRejectOrderId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSaving, setRejectSaving] = useState(false)

  const handleDeleteOrder = async (orderId) => {
    if (confirm(`Apakah Anda yakin ingin menghapus Pesanan #${orderId} secara PERMANEN dari database? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await authJson(`/orders/${orderId}`, { method: 'DELETE' })
        alert('Pesanan berhasil dihapus secara permanen!')
        await refresh()
      } catch (err) {
        alert('Gagal menghapus pesanan: ' + (err.message || err))
      }
    }
  }

  /* ─── load user ─── */
  useEffect(() => {
    const u = getStoredUser()
    setUser(u)
    if (!u) setLoading(false)
  }, [])

  /* ─── load data ─── */
  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function load() {
      try {
        const [storeData, sellerProducts, sellerOrders, sellBanners, sellerProposals, sellerPromosData] = await Promise.all([
          authJson('/seller/store').catch(() => null),
          authJson('/seller/products').catch(() => []),
          authJson('/seller/orders').catch(() => []),
          authJson('/seller/banners').catch(() => []),
          authJson('/seller/flash-sale/proposals').catch(() => []),
          authJson('/seller/promos').catch(() => [])
        ])
        if (!active) return
        setStore(storeData)
        setProducts(sellerProducts || [])
        setOrders(sellerOrders || [])
        setSellerBanners(Array.isArray(sellBanners) ? sellBanners : [])
        setFlashSaleProposals(Array.isArray(sellerProposals) ? sellerProposals : [])
        setSellerPromos(Array.isArray(sellerPromosData) ? sellerPromosData : [])
        // Jika belum punya toko, auto pindah ke tab store
        if (!storeData) setActiveTab('store')
      } catch (err) {
        if (active) console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()

    // Poll data every 8 seconds for real-time updates
    const interval = setInterval(() => {
      if (active) refresh()
    }, 8000)

    return () => { 
      active = false 
      clearInterval(interval)
    }
  }, [user])

  async function refresh() {
    const [storeData, sellerProducts, sellerOrders, sellBanners, sellerProposals, sellerPromosData] = await Promise.all([
      authJson('/seller/store').catch(() => null),
      authJson('/seller/products').catch(() => []),
      authJson('/seller/orders').catch(() => []),
      authJson('/seller/banners').catch(() => []),
      authJson('/seller/flash-sale/proposals').catch(() => []),
      authJson('/seller/promos').catch(() => [])
    ])
    setStore(storeData)
    setProducts(sellerProducts || [])
    setOrders(sellerOrders || [])
    setSellerBanners(Array.isArray(sellBanners) ? sellBanners : [])
    setFlashSaleProposals(Array.isArray(sellerProposals) ? sellerProposals : [])
    setSellerPromos(Array.isArray(sellerPromosData) ? sellerPromosData : [])
  }

  // Fetch chat rooms
  useEffect(() => {
    if (!user?.id || activeTab !== 'chat') return
    let active = true

    async function fetchRooms() {
      try {
        const data = await authJson('/chats/rooms')
        if (active) setChatRooms(data)
      } catch (err) {
        console.error('Error fetching chat rooms:', err)
      }
    }

    fetchRooms()
    const interval = setInterval(fetchRooms, 4000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [user, activeTab])

  // Fetch messages with selected room
  useEffect(() => {
    if (!user?.id || !selectedRoomId || activeTab !== 'chat') return
    let active = true

    async function fetchMessages() {
      try {
        const data = await authJson(`/chats/messages/${selectedRoomId}`)
        if (active) setChatMessages(data)
      } catch (err) {
        console.error('Error fetching messages:', err)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [user, selectedRoomId, activeTab])

  async function handleSendChatMessage(e) {
    e.preventDefault()
    if (!chatInput.trim() || !selectedRoomId || isSending) return
    setIsSending(true)
    try {
      const newMessage = await authJson('/chats', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedRoomId,
          message: chatInput.trim()
        })
      })
      setChatMessages(prev => [...prev, newMessage])
      setChatInput('')
      
      const updatedRooms = await authJson('/chats/rooms')
      setChatRooms(updatedRooms)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSending(false)
    }
  }

  /* ─── store actions ─── */
  async function saveStore() {
    setStoreSaving(true)
    try {
      if (store) {
        const updated = await authJson('/seller/store', { method: 'PATCH', body: JSON.stringify(storeForm) })
        setStore(updated)
        setStoreMode('view')
        alert('Toko berhasil diperbarui!')
      } else {
        const created = await authJson('/seller/store', { method: 'POST', body: JSON.stringify(storeForm) })
        setStore(created)
        setStoreMode('view')
        alert('Toko berhasil dibuka! Selamat berjualan 🎉')
      }
    } catch (err) {
      alert('Gagal menyimpan toko: ' + (err.message || 'Server error'))
    } finally {
      setStoreSaving(false)
    }
  }

  async function toggleStoreOpen() {
    const updated = await authJson('/seller/store', { method: 'PATCH', body: JSON.stringify({ is_open: store.is_open ? 0 : 1 }) })
    setStore(updated)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFileAsDataUrl(file)
    setStoreForm(f => ({ ...f, logo: url }))
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFileAsDataUrl(file)
    setStoreForm(f => ({ ...f, banner: url }))
  }

  function startEditStore() {
    setStoreForm({ name: store.name || '', description: store.description || '', logo: store.logo || '', banner: store.banner || '' })
    setStoreMode('edit')
  }

  function startCreateStore() {
    setStoreForm(emptyStore)
    setStoreMode('create')
  }

  /* ─── product actions ─── */
  async function saveProduct() {
    if (!store) { alert('Buka toko dulu sebelum menambahkan produk!'); return }
    try {
      if (editingId) {
        await authJson(`/seller/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) })
      } else {
        await authJson('/seller/products', { method: 'POST', body: JSON.stringify(form) })
      }
      setEditingId(null)
      setForm(emptyProduct)
      setImageInputKey(prev => prev + 1)
      await refresh()
      alert('Produk tersimpan!')
    } catch (err) {
      alert('Gagal simpan produk: ' + (err.message || ''))
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await readFileAsDataUrl(file)
    setForm(f => ({ ...f, image: url }))
  }

  async function handleMediaUpload(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const uploadedMedia = []
    for (const file of files) {
      try {
        const url = await readFileAsDataUrl(file)
        uploadedMedia.push(url)
      } catch (err) {
        console.error(err)
      }
    }
    setForm(f => ({ ...f, media: [...(f.media || []), ...uploadedMedia] }))
  }

  function removeMediaItem(index) {
    setForm(f => ({ ...f, media: (f.media || []).filter((_, i) => i !== index) }))
  }

  function clearImage() {
    setForm(f => ({ ...f, image: '' }))
    setImageInputKey(prev => prev + 1)
  }

  function editProduct(product) {
    setEditingId(product.id)
    setImageInputKey(prev => prev + 1)
    
    let mediaArray = []
    if (product.media) {
      try {
        mediaArray = typeof product.media === 'string' ? JSON.parse(product.media) : product.media
      } catch (e) {
        console.error(e)
      }
    }

    setForm({
      title: product.title || '',
      description: product.description || '',
      price: product.price || '',
      original_price: product.original_price || '',
      stock: product.stock || '',
      image: product.image || '',
      category: product.category || '',
      status: product.status || 'ACTIVE',
      colors: product.colors || '',
      sizes: product.sizes || '',
      media: mediaArray || []
    })
    setActiveTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(id) {
    if (!confirm('Hapus produk ini?')) return
    await authJson(`/seller/products/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function proposeFlashSale(product) {
    if (!product) return
    setFlashSaleForm({ product, original_price: product.price, flash_sale_price: '', message: '' })
    setShowFlashSaleForm(true)
  }

  async function submitFlashSaleProposal() {
    const { product, original_price, flash_sale_price, message } = flashSaleForm
    if (!original_price || !flash_sale_price) {
      alert('Harga normal dan harga flash sale wajib diisi')
      return
    }
    if (Number(flash_sale_price) >= Number(original_price)) {
      alert('Harga flash sale harus lebih rendah dari harga normal')
      return
    }
    try {
      setProposalSaving(true)
      setProposalError(null)
      await authJson(`/seller/products/${product.id}/flash-sale-proposal`, {
        method: 'POST',
        body: JSON.stringify({ original_price, flash_sale_price, message: message || null })
      })
      alert('Proposal Flash Sale berhasil dikirim. Tunggu persetujuan admin.')
      setShowFlashSaleForm(false)
      setFlashSaleForm({ product: null, original_price: '', flash_sale_price: '', message: '' })
      await refresh()
    } catch (err) {
      setProposalError(err.message || 'Gagal mengajukan flash sale')
      alert('Gagal mengajukan Flash Sale: ' + (err.message || ''))
    } finally {
      setProposalSaving(false)
    }
  }

  const [shippingInputs, setShippingInputs] = useState({})

  async function updateStatus(orderId, status, trackingNumber = null, note = null) {
    try {
      const body = { status }
      if (note) {
        body.note = note
      } else {
        body.note = `Status diubah menjadi ${status} oleh penjual`
      }
      if (trackingNumber) {
        body.tracking_number = trackingNumber
      }
      await authJson(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify(body) })
      await refresh()
    } catch (err) {
      alert(`Gagal memperbarui status: ${err.message || err}`)
    }
  }

  const totalRevenue = useMemo(() =>
    orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.unit_price * o.quantity), 0)
  , [orders])

  const proposalMap = useMemo(() => {
    return Object.fromEntries((flashSaleProposals || []).map(p => [p.product_id, p]))
  }, [flashSaleProposals])

  /* ─── seller promo actions ─── */
  function startCreatePromo() {
    setPromoForm({ name: '', discount_percentage: '', start_time: '', end_time: '', product_ids: [] })
    setEditingPromoId(null)
    setPromoError(null)
    setPromoMode('create')
  }

  function startEditPromo(promo) {
    const formatToLocalISO = (dateStr) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const tzOffset = d.getTimezoneOffset() * 60000
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
      return localISOTime
    }

    setPromoForm({
      name: promo.name || '',
      discount_percentage: promo.discount_percentage || '',
      start_time: formatToLocalISO(promo.start_time),
      end_time: formatToLocalISO(promo.end_time),
      product_ids: (promo.products || []).map(p => p.id)
    })
    setEditingPromoId(promo.id)
    setPromoError(null)
    setPromoMode('edit')
  }

  function cancelPromoEdit() {
    setPromoForm(emptyPromo)
    setEditingPromoId(null)
    setPromoError(null)
    setPromoMode('list')
  }

  async function savePromo() {
    const { name, discount_percentage, start_time, end_time, product_ids } = promoForm
    if (!name || !discount_percentage || !start_time || !end_time || !product_ids.length) {
      alert('Semua kolom wajib diisi dan minimal pilih 1 produk')
      return
    }

    setPromoSaving(true)
    setPromoError(null)

    try {
      if (editingPromoId) {
        await authJson(`/seller/promos/${editingPromoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, discount_percentage, start_time, end_time, product_ids })
        })
        alert('Promo berhasil diperbarui!')
      } else {
        await authJson('/seller/promos', {
          method: 'POST',
          body: JSON.stringify({ name, discount_percentage, start_time, end_time, product_ids })
        })
        alert('Promo baru berhasil dibuat!')
      }
      setPromoForm(emptyPromo)
      setEditingPromoId(null)
      setPromoMode('list')
      await refresh()
    } catch (err) {
      setPromoError(err.message || 'Gagal menyimpan promo')
      alert('Gagal menyimpan promo: ' + (err.message || ''))
    } finally {
      setPromoSaving(false)
    }
  }

  async function togglePromoActive(id, currentActive) {
    try {
      await authJson(`/seller/promos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: currentActive ? 0 : 1 })
      })
      await refresh()
    } catch (err) {
      alert('Gagal mengubah status aktif promo: ' + (err.message || ''))
    }
  }

  async function deletePromo(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus promo ini? Tindakan ini akan mengembalikan harga produk ke semula.')) return
    try {
      await authJson(`/seller/promos/${id}`, { method: 'DELETE' })
      alert('Promo berhasil dihapus.')
      await refresh()
    } catch (err) {
      alert('Gagal menghapus promo: ' + (err.message || ''))
    }
  }

  /* ─── seller banner actions ─── */
  async function saveSBanner() {
    if (!sBannerForm.title || !sBannerFile) return
    setSBannerSaving(true); setSBannerError(null)
    try {
      const fd = new FormData()
      fd.append('title', sBannerForm.title)
      fd.append('image', sBannerFile)
      fd.append('type', sBannerForm.type)
      if (sBannerForm.link_url) fd.append('link_url', sBannerForm.link_url)
      fd.append('is_active', String(sBannerForm.is_active))
      const res = await authFetch('/seller/banners', { method: 'POST', body: fd })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Gagal simpan') }
      setSBannerForm({ title: '', link_url: '', is_active: 1, type: 'toko' })
      setSBannerFile(null); setSBannerPreview(null)
      await refresh()
    } catch (err) { setSBannerError(err.message) }
    finally { setSBannerSaving(false) }
  }

  async function deleteSBanner(id) {
    if (!confirm('Hapus banner ini?')) return
    await authJson(`/seller/banners/${id}`, { method: 'DELETE' })
    await refresh()
  }

  function openSBannerEdit(b) {
    setSBannerEdit(b)
    setSBannerEditForm({ title: b.title, link_url: b.link_url || '', is_active: b.is_active, type: b.type || 'toko' })
    setSBannerEditFile(null); setSBannerEditPreview(null); setSBannerEditError(null)
  }

  function closeSBannerEdit() { setSBannerEdit(null); setSBannerEditFile(null); setSBannerEditPreview(null) }

  async function saveSBannerEdit() {
    if (!sBannerEditForm.title) return
    setSBannerEditSaving(true); setSBannerEditError(null)
    try {
      const fd = new FormData()
      fd.append('title', sBannerEditForm.title)
      fd.append('link_url', sBannerEditForm.link_url || '')
      fd.append('is_active', String(sBannerEditForm.is_active))
      fd.append('type', sBannerEditForm.type)
      if (sBannerEditFile) fd.append('image', sBannerEditFile)
      const res = await authFetch(`/seller/banners/${sBannerEdit.id}`, { method: 'PATCH', body: fd })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Gagal simpan') }
      closeSBannerEdit(); await refresh()
    } catch (err) { setSBannerEditError(err.message) }
    finally { setSBannerEditSaving(false) }
  }

  /* ════════════════ RENDER ════════════════ */
  return (
    <div>
      <SiteNav title="EcoMart Seller" subtitle="Dashboard Seller" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 64px' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Seller Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Kelola toko, produk, dan pesanan Anda
            </p>
          </div>
          {store && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StoreStatusBadge isOpen={store.is_open} />
              <Link
                href={`/store/${store.id}`}
                style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}
                target="_blank"
              >
                🏪 Lihat Toko
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="panel" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            Memuat dashboard...
          </div>
        ) : !user ? (
          <div className="panel stack" style={{ textAlign: 'center', padding: 48 }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Login dulu</h3>
            <p className="muted">Dashboard seller hanya tersedia setelah login sebagai SELLER.</p>
            <a className="button" href="/login" style={{ display: 'inline-block', maxWidth: 200, margin: '0 auto' }}>Login</a>
          </div>
        ) : (
          <>
            {/* ── Stats Bar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Produk Aktif', value: products.filter(p => p.status === 'ACTIVE').length, icon: '📦' },
                { label: 'Total Order', value: orders.length, icon: '🛒' },
                { label: 'Pendapatan', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, icon: '💰' },
                { label: 'Status Toko', value: store ? (store.is_open ? 'Buka' : 'Tutup') : 'Belum Ada', icon: '🏪' },
              ].map((stat, i) => (
                <div key={i} className="panel" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div className="tabs">
              {[
                { id: 'store',      label: '🏪 Toko Saya' },
                { id: 'products',   label: '📦 Produk' },
                { id: 'orders',     label: '🛒 Pesanan' },
                { id: 'banners',    label: '🎯 Banner' },
                { id: 'promotions', label: '🏷️ Promo Toko' },
                { id: 'chat',       label: '💬 Chat Pembeli' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  id={`tab-${tab.id}`}
                >
                  {tab.label}
                  {tab.id === 'orders' && orders.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--red)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                      {orders.length}
                    </span>
                  )}
                  {tab.id === 'banners' && sellerBanners.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                      {sellerBanners.length}
                    </span>
                  )}
                  {tab.id === 'promotions' && sellerPromos.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--orange-light)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                      {sellerPromos.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ══════════ TAB: CHAT ══════════ */}
            {activeTab === 'chat' && (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, minHeight: 550, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-card)', marginTop: 20 }}>
                {/* Left Panel: Conversation List */}
                <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Daftar Chat</h3>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {chatRooms.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40, padding: 10 }}>
                        Belum ada obrolan dari pembeli.
                      </div>
                    ) : (
                      chatRooms.map(room => {
                        const isSelected = room.other_user_id === selectedRoomId
                        return (
                          <button
                            key={room.other_user_id}
                            type="button"
                            onClick={() => setSelectedRoomId(room.other_user_id)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              padding: '14px 20px',
                              border: 'none',
                              borderBottom: '1px solid var(--border)',
                              background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 150ms'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <strong style={{ fontSize: 14, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                                {room.other_user_name}
                              </strong>
                              {room.unread_count > 0 && (
                                <span style={{
                                  background: 'var(--red)',
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  borderRadius: 999,
                                  padding: '2px 6px'
                                }}>
                                  {room.unread_count}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {room.last_message}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {new Date(room.last_message_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel: Active Chat Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
                  {selectedRoomId ? (
                    <>
                      {/* Header */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                          {chatRooms.find(r => r.other_user_id === selectedRoomId)?.other_user_name || 'Obrolan'}
                        </strong>
                      </div>

                      {/* Messages Body */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 400 }}>
                        {chatMessages.map(msg => {
                          const isMe = Number(msg.sender_id) === Number(user?.id)
                          return (
                            <div key={msg.id} style={{
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMe ? 'flex-end' : 'flex-start'
                            }}>
                              {/* Associated Product Card if any */}
                              {msg.product_id && (
                                <div style={{
                                  display: 'flex',
                                  gap: 8,
                                  padding: '8px 10px',
                                  background: isMe ? 'rgba(59,130,246,0.1)' : 'var(--bg-elevated)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 8,
                                  marginBottom: 6,
                                  width: 'fit-content',
                                  alignItems: 'center'
                                }}>
                                  {msg.product_image && <img src={msg.product_image} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4 }} />}
                                  <div style={{ fontSize: 11, minWidth: 80 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{msg.product_title}</div>
                                    <div style={{ color: 'var(--orange-light)', fontWeight: 600 }}>Rp {Number(msg.product_price).toLocaleString('id-ID')}</div>
                                  </div>
                                </div>
                              )}

                              <div style={{
                                padding: '10px 14px',
                                borderRadius: isMe ? '14px 14px 0 14px' : '14px 14px 14px 0',
                                background: isMe ? 'var(--accent)' : 'var(--bg-elevated)',
                                color: isMe ? '#fff' : 'var(--text-primary)',
                                fontSize: 13,
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}>
                                {msg.message}
                              </div>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                                {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Input Footer */}
                      <form onSubmit={handleSendChatMessage} style={{ padding: '14px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Ketik balasan Anda..."
                          style={{
                            flex: 1,
                            padding: '10px 14px',
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
                          style={{ padding: '0 20px', borderRadius: 8, fontSize: 13 }}
                          disabled={!chatInput.trim() || isSending}
                        >
                          {isSending ? 'Mengirim...' : 'Kirim'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                      Silakan pilih obrolan dari daftar di sebelah kiri untuk melihat pesan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ TAB: TOKO ══════════ */}
            {activeTab === 'store' && (
              <div>
                {/* Belum punya toko */}
                {!store && storeMode !== 'create' && (
                  <div className="panel" style={{ textAlign: 'center', padding: '56px 32px' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🏪</div>
                    <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 20, fontWeight: 800 }}>
                      Kamu belum punya toko
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                      Buka toko untuk mulai berjualan dan menampilkan produk ke pembeli
                    </p>
                    <button
                      className="button"
                      onClick={startCreateStore}
                      id="btn-open-store"
                      style={{ padding: '14px 28px', fontSize: 15 }}
                    >
                      🚀 Buka Toko Sekarang
                    </button>
                  </div>
                )}

                {/* Form buat / edit toko */}
                {(storeMode === 'create' || storeMode === 'edit') && (
                  <div className="panel stack" style={{ maxWidth: 680 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 800 }}>
                      {storeMode === 'create' ? '🚀 Buka Toko Baru' : '✏️ Edit Profil Toko'}
                    </h3>

                    <div>
                      <label className="field-label">Nama Toko *</label>
                      <input
                        value={storeForm.name}
                        onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Contoh: Toko Elektronik Jaya"
                        id="store-name-input"
                      />
                    </div>

                    <div>
                      <label className="field-label">Deskripsi Toko</label>
                      <textarea
                        rows={3}
                        value={storeForm.description}
                        onChange={e => setStoreForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Ceritakan tentang toko Anda..."
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, resize: 'vertical' }}
                        id="store-desc-input"
                      />
                    </div>

                    {/* Logo upload */}
                    <div>
                      <label className="field-label">Logo Toko</label>
                      <div className="product-upload-field">
                        <input key={logoInputKey} type="file" accept="image/*" onChange={handleLogoUpload} id="store-logo-input" />
                        {storeForm.logo && (
                          <div className="product-upload-preview">
                            <img src={storeForm.logo} alt="Logo preview" />
                            <div className="stack">
                              <strong style={{ color: 'var(--text-primary)' }}>Logo terpilih</strong>
                              <button className="ghost-button" type="button" onClick={() => { setStoreForm(f => ({ ...f, logo: '' })); setLogoInputKey(k => k + 1) }}>Ganti</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Banner upload */}
                    <div>
                      <label className="field-label">Banner Toko (opsional)</label>
                      <div className="product-upload-field">
                        <input key={bannerInputKey} type="file" accept="image/*" onChange={handleBannerUpload} id="store-banner-input" />
                        {storeForm.banner && (
                          <div className="product-upload-preview">
                            <img src={storeForm.banner} alt="Banner preview" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                            <div className="stack">
                              <strong style={{ color: 'var(--text-primary)' }}>Banner terpilih</strong>
                              <button className="ghost-button" type="button" onClick={() => { setStoreForm(f => ({ ...f, banner: '' })); setBannerInputKey(k => k + 1) }}>Ganti</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row-actions">
                      <button className="button" onClick={saveStore} disabled={storeSaving || !storeForm.name} id="btn-save-store">
                        {storeSaving ? '⏳ Menyimpan...' : storeMode === 'create' ? '🚀 Buka Toko' : '💾 Simpan Perubahan'}
                      </button>
                      {storeMode === 'edit' && (
                        <button className="ghost-button" onClick={() => setStoreMode('view')}>Batal</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Info toko yang sudah ada */}
                {store && storeMode === 'view' && (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {/* Banner */}
                    {store.banner && (
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', height: 160, position: 'relative' }}>
                        <img src={store.banner} alt="Banner toko" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}

                    <div className="panel" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Logo */}
                      <div style={{ width: 80, height: 80, borderRadius: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', display: 'grid', placeItems: 'center', fontSize: 32, flexShrink: 0 }}>
                        {store.logo
                          ? <img src={store.logo} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '🏪'}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{store.name}</h2>
                          <StoreStatusBadge isOpen={store.is_open} />
                        </div>
                        {store.description && (
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{store.description}</p>
                        )}
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, flexWrap: 'wrap' }}>
                          <span>📦 {products.filter(p => p.status === 'ACTIVE').length} produk aktif</span>
                          <span>📅 Bergabung {new Date(store.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}</span>
                          <span>🆔 ID Toko: #{store.id}</span>
                        </div>
                        <div className="row-actions">
                          <button className="button" onClick={startEditStore} id="btn-edit-store">✏️ Edit Toko</button>
                          <button className="ghost-button" onClick={toggleStoreOpen} id="btn-toggle-store">
                            {store.is_open ? '🔒 Tutup Toko' : '🔓 Buka Toko'}
                          </button>
                          <Link href={`/store/${store.id}`} className="ghost-button" target="_blank">🔗 Lihat Halaman Publik</Link>
                        </div>
                      </div>
                    </div>

                    {/* Quick action tambah produk */}
                    {products.length === 0 && (
                      <div className="panel" style={{ textAlign: 'center', padding: 32, border: '2px dashed var(--border)' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 14 }}>Toko kamu belum punya produk. Yuk tambahkan produk pertama!</p>
                        <button className="button" onClick={() => setActiveTab('products')} id="btn-goto-products">+ Tambah Produk Pertama</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ TAB: PRODUK ══════════ */}
            {activeTab === 'products' && (
              <div className="dashboard-grid seller-grid">
                {/* Form tambah/edit produk */}
                <section className="panel stack">
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                    {editingId ? '✏️ Edit Produk' : '➕ Tambah Produk'}
                  </h3>

                  {!store && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 13, color: 'var(--orange-light)' }}>
                      ⚠️ Buka toko dulu sebelum menambahkan produk.{' '}
                      <button type="button" onClick={() => setActiveTab('store')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                        Buka Toko →
                      </button>
                    </div>
                  )}

                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nama produk *" id="product-title-input" />
                  <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi produk"
                    style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, resize: 'vertical' }}
                    id="product-desc-input"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="field-label">Harga Sekarang (Rp) *</label>
                      <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Contoh: 150000" type="number" id="product-price-input" />
                    </div>
                    <div>
                      <label className="field-label">Harga Coret (Sebelum) (Rp)</label>
                      <input value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Contoh: 200000" type="number" id="product-original-price-input" />
                    </div>
                    <div>
                      <label className="field-label">Stok</label>
                      <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="Contoh: 50" type="number" id="product-stock-input" />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <label className="field-label">Foto Produk</label>
                    <div className="product-upload-field">
                      <input key={imageInputKey} type="file" accept="image/*" onChange={handleImageUpload} id="product-image-input" />
                      {form.image ? (
                        <div className="product-upload-preview">
                          <img src={form.image} alt="Preview" />
                          <div className="stack">
                            <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>Foto dipilih</strong>
                            <p className="muted" style={{ fontSize: 12 }}>Akan diunggah saat disimpan</p>
                            <button type="button" className="ghost-button" onClick={clearImage}>Ganti foto</button>
                          </div>
                        </div>
                      ) : (
                        <p className="muted upload-hint" style={{ fontSize: 12 }}>Pilih foto JPG, PNG, atau WebP (maks 10 MB)</p>
                      )}
                    </div>
                  </div>

                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="field-label">Kategori</label>
                      <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Contoh: Elektronik" id="product-category-input" />
                    </div>
                    <div>
                      <label className="field-label">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} id="product-status-select">
                        <option value="ACTIVE">ACTIVE (Tampil di toko)</option>
                        <option value="DRAFT">DRAFT (Disimpan dulu)</option>
                        <option value="ARCHIVED">ARCHIVED (Diarsip)</option>
                      </select>
                    </div>
                  </div>

                  {/* Warna & Ukuran */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="field-label">Pilihan Warna (Pisahkan dengan koma)</label>
                      <input
                        value={form.colors || ''}
                        onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}
                        placeholder="Contoh: Hitam, Abu-abu, Krem"
                        id="product-colors-input"
                      />
                    </div>
                    <div>
                      <label className="field-label">Pilihan Ukuran (Pisahkan dengan koma)</label>
                      <input
                        value={form.sizes || ''}
                        onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))}
                        placeholder="Contoh: 28, 29, 30 atau S, M, L"
                        id="product-sizes-input"
                      />
                    </div>
                  </div>

                  {/* Media Tambahan */}
                  <div>
                    <label className="field-label">Foto / Video Tambahan (Opsional)</label>
                    <div className="product-upload-field" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleMediaUpload}
                        id="product-media-input"
                      />
                      <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Pilih satu atau beberapa file foto/video untuk variasi produk Anda</p>
                      
                      {form.media && form.media.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10, marginTop: 12 }}>
                          {form.media.map((item, idx) => {
                            const isVideo = (typeof item === 'object' && item.type === 'video') ||
                                            (typeof item === 'string' && (item.startsWith('data:video/') || item.match(/\.(mp4|webm|ogg|mov)$/i)));
                            const srcUrl = typeof item === 'object' ? item.url : item;

                            return (
                              <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                {isVideo ? (
                                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <video src={srcUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 20 }}>
                                      ▶
                                    </div>
                                  </div>
                                ) : (
                                  <img src={srcUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeMediaItem(idx)}
                                  style={{
                                    position: 'absolute', top: 2, right: 2,
                                    width: 18, height: 18, borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.85)', color: '#fff',
                                    border: 'none', cursor: 'pointer',
                                    display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 'bold'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row-actions">
                    <button className="button" onClick={saveProduct} disabled={!store || !form.title || !form.price} id="btn-save-product">
                      {editingId ? '💾 Update Produk' : '➕ Tambah Produk'}
                    </button>
                    {editingId && (
                      <button className="ghost-button" onClick={() => { setEditingId(null); setForm(emptyProduct); setImageInputKey(k => k + 1) }}>
                        Batal
                      </button>
                    )}
                  </div>
                </section>

                {/* Daftar produk */}
                <section className="panel stack">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                      Produk Saya ({products.length})
                    </h3>
                    <Link href={store ? `/store/${store.id}` : '#'} style={{ fontSize: 12, color: 'var(--accent)' }} target="_blank">
                      Lihat di toko →
                    </Link>
                  </div>

                  {products.length === 0 ? (
                    <p className="muted" style={{ textAlign: 'center', padding: 24 }}>Belum ada produk. Tambahkan produk pertama Anda!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {products.map(product => {
                        const proposal = proposalMap[product.id]
                        const hasPending = proposal?.status === 'PENDING'
                        const hasApproved = proposal?.status === 'APPROVED'
                        const statusLabel = proposal ? (
                          proposal.status === 'PENDING' ? 'Menunggu persetujuan' :
                          proposal.status === 'APPROVED' ? 'Disetujui' :
                          proposal.status === 'EXPIRED' ? 'Flash Sale Selesai' :
                          'Ditolak'
                        ) : null
                        return (
                          <article key={product.id} className="table-card">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              {product.image && (
                                <img src={product.image} alt={product.title}
                                  style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }} />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="table-card-head">
                                  <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{product.title}</strong>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                                    background: product.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                                    color: product.status === 'ACTIVE' ? '#10b981' : '#64748b',
                                    border: `1px solid ${product.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.15)'}`,
                                  }}>
                                    {product.status}
                                  </span>
                                </div>
                                <p className="muted" style={{ fontSize: 12, margin: '3px 0 8px' }}>
                                  {product.original_price && Number(product.original_price) > Number(product.price) ? (
                                    <>
                                      <span style={{ textDecoration: 'line-through', marginRight: 6 }}>Rp {Number(product.original_price).toLocaleString('id-ID')}</span>
                                      <span style={{ color: 'var(--orange-light)', fontWeight: 'bold', marginRight: 6 }}>Rp {Number(product.price).toLocaleString('id-ID')}</span>
                                    </>
                                  ) : (
                                    <span>Rp {Number(product.price).toLocaleString('id-ID')}</span>
                                  )}
                                  · Stok: {product.stock} · {product.category || '—'}
                                </p>
                                {statusLabel && (
                                  <div style={{ marginBottom: 8 }}>
                                    <span className="chip" style={{ fontSize: 11, padding: '5px 10px', background: hasApproved ? 'rgba(16,185,129,0.12)' : hasPending ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)', color: hasApproved ? '#10b981' : hasPending ? '#2563eb' : '#dc2626' }}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                )}
                                <div className="row-actions">
                                  <button className="ghost-button" onClick={() => editProduct(product)} style={{ padding: '6px 10px', fontSize: 12 }}>✏️ Edit</button>
                                  <button className="ghost-button" onClick={() => deleteProduct(product.id)} style={{ padding: '6px 10px', fontSize: 12, color: 'var(--red)' }}>🗑️ Hapus</button>
                                  <button
                                    className="ghost-button"
                                    onClick={() => proposeFlashSale(product)}
                                    disabled={!store || product.status !== 'ACTIVE' || hasPending || proposalSaving}
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                  >
                                    {hasPending ? '⏳ Menunggu' : '⚡ Ajukan Flash Sale'}
                                  </button>
                                  <Link href={`/product/${product.id}`} className="ghost-button" target="_blank" style={{ padding: '6px 10px', fontSize: 12 }}>👁️ Lihat</Link>
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {flashSaleProposals.length > 0 && activeTab === 'products' && (
              <section className="panel stack">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>Status Proposal Flash Sale</h3>
                  <span className="chip">{flashSaleProposals.length} proposal</span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {flashSaleProposals.map(proposal => (
                    <article key={proposal.id} className="table-card">
                      <div className="table-card-head">
                        <strong>{proposal.product_title}</strong>
                        <span className="chip" style={{
                          fontSize: 11,
                          background: proposal.status === 'APPROVED' ? 'rgba(16,185,129,0.12)' :
                                      proposal.status === 'PENDING' ? 'rgba(59,130,246,0.12)' :
                                      proposal.status === 'EXPIRED' ? 'rgba(100,116,139,0.12)' :
                                      'rgba(239,68,68,0.12)',
                          color: proposal.status === 'APPROVED' ? '#10b981' :
                                 proposal.status === 'PENDING' ? '#2563eb' :
                                 proposal.status === 'EXPIRED' ? '#64748b' :
                                 '#dc2626'
                        }}>{proposal.status}</span>
                      </div>
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                        {proposal.message || 'Tidak ada pesan tambahan'}
                      </p>
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>Diajukan: {new Date(proposal.created_at).toLocaleString('id-ID')}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ══════════ TAB: PESANAN ══════════ */}
            {activeTab === 'orders' && (
              <section className="panel stack">
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                  Pesanan Masuk ({orders.length})
                </h3>
                {orders.length === 0 ? (
                  <p className="muted" style={{ textAlign: 'center', padding: 32 }}>Belum ada pesanan masuk.</p>
                ) : (
                  orders.map(order => {
                    const isNewOrder = order.status === 'pending' && order.payment_status === 'paid';
                    const isUnpaid = order.payment_status === 'pending' && !order.payment_receipt;
                    const orderInput = shippingInputs[order.order_id] || { courier: 'JNE', tracking: '' };
                    
                    return (
                      <article key={`${order.order_id}-${order.product_id}`} className="table-card" style={{ borderLeft: isNewOrder ? '4px solid var(--accent)' : '1px solid var(--border)' }}>
                        <div className="table-card-head">
                          <strong style={{ color: 'var(--text-primary)' }}>Order #{order.order_id}</strong>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="chip" style={{
                              fontSize: 11,
                              background: isNewOrder || (order.status === 'pending' && order.payment_receipt) ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)',
                              color: isNewOrder || (order.status === 'pending' && order.payment_receipt) ? '#2563eb' : 'var(--text-secondary)',
                              fontWeight: isNewOrder || (order.status === 'pending' && order.payment_receipt) ? 'bold' : 'normal'
                            }}>
                              {isNewOrder || (order.status === 'pending' && order.payment_receipt) ? 'Pesanan Baru (Menunggu Dikemas)' : order.status.toUpperCase()}
                            </span>
                            <span className="chip" style={{
                              fontSize: 11,
                              background: order.payment_status === 'paid'
                                ? 'rgba(16,185,129,0.1)'
                                : order.payment_receipt
                                  ? 'rgba(245,158,11,0.15)'
                                  : 'rgba(96,165,250,0.1)',
                              color: order.payment_status === 'paid'
                                ? '#10b981'
                                : order.payment_receipt
                                  ? '#d97706'
                                  : 'var(--orange-light)'
                            }}>
                              {order.payment_status === 'paid'
                                ? 'PAID (Sudah Bayar)'
                                : order.payment_receipt
                                  ? 'Menunggu Konfirmasi QRIS'
                                  : 'UNPAID (Belum Bayar)'}
                            </span>
                            <button
                              onClick={() => handleDeleteOrder(order.order_id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: 13,
                                padding: '2px 6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                marginLeft: 4,
                              }}
                              title="Hapus Pesanan Permanen"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>
                          Produk: <strong>{order.title}</strong>
                          {(order.selected_color || order.selected_size) && (
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                              {' '}(
                              {order.selected_color && <span>Warna: {order.selected_color}</span>}
                              {order.selected_color && order.selected_size && <span>, </span>}
                              {order.selected_size && <span>Ukuran: {order.selected_size}</span>}
                              )
                            </span>
                          )}
                          {' '}· Qty: {order.quantity} · Total: Rp {(order.unit_price * order.quantity).toLocaleString('id-ID')}
                        </p>
                        
                        {order.tracking_number && (
                          <div style={{ margin: '8px 0', fontSize: 12, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            📦 <strong>Informasi Pengiriman:</strong> {order.tracking_number}
                          </div>
                        )}

                        {order.payment_receipt && (
                          <div style={{ margin: '8px 0', fontSize: 12, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                            🖼️ <strong>Bukti Pembayaran QRIS:</strong>
                            <div style={{ marginTop: 6 }}>
                              <a href={order.payment_receipt} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={order.payment_receipt}
                                  alt="Bukti Transfer QRIS"
                                  style={{
                                    maxWidth: 150,
                                    maxHeight: 150,
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    cursor: 'zoom-in',
                                    objectFit: 'contain'
                                  }}
                                />
                              </a>
                            </div>
                          </div>
                        )}

                        <div className="row-actions" style={{ marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
                          {isUnpaid && (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏳ Menunggu pembayaran dari customer</span>
                              <button 
                                className="button" 
                                onClick={() => {
                                  setRejectOrderId(order.order_id)
                                  setRejectReason('')
                                }} 
                                style={{ fontSize: 11, padding: '6px 12px', background: 'var(--red)', borderColor: 'var(--red)' }}
                              >
                                ❌ Batalkan Pesanan
                              </button>
                            </div>
                          )}

                          {(isNewOrder || (order.status === 'pending' && order.payment_receipt)) && (
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button 
                                className="button" 
                                onClick={() => updateStatus(order.order_id, 'diproses')} 
                                style={{ fontSize: 12, padding: '8px 16px', background: '#10b981', borderColor: '#10b981' }}
                              >
                                ✓ Terima Pesanan
                              </button>
                              <button 
                                className="button" 
                                onClick={() => {
                                  setRejectOrderId(order.order_id)
                                  setRejectReason('')
                                }} 
                                style={{ fontSize: 12, padding: '8px 16px', background: 'var(--red)', borderColor: 'var(--red)' }}
                              >
                                ❌ Tolak Pesanan
                              </button>
                            </div>
                          )}

                          {order.status === 'diproses' && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', flexWrap: 'wrap', marginTop: 6 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <label style={{ fontSize: 12, fontWeight: 700 }}>Kurir:</label>
                                <select 
                                  value={orderInput.courier} 
                                  onChange={e => setShippingInputs({
                                    ...shippingInputs,
                                    [order.order_id]: { ...orderInput, courier: e.target.value }
                                  })}
                                  style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                                >
                                  <option value="JNE">JNE</option>
                                  <option value="J&T">J&T</option>
                                  <option value="Sicepat">Sicepat</option>
                                  <option value="Pos Indonesia">Pos Indonesia</option>
                                  <option value="TIKI">TIKI</option>
                                  <option value="GoSend">GoSend</option>
                                  <option value="GrabExpress">GrabExpress</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 150 }}>
                                <label style={{ fontSize: 12, fontWeight: 700 }}>No. Resi:</label>
                                <input 
                                  type="text" 
                                  placeholder="Masukkan nomor resi..."
                                  value={orderInput.tracking} 
                                  onChange={e => setShippingInputs({
                                    ...shippingInputs,
                                    [order.order_id]: { ...orderInput, tracking: e.target.value }
                                  })}
                                  style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', flex: 1 }}
                                />
                              </div>
                              <button 
                                className="button" 
                                onClick={() => {
                                  if (!orderInput.tracking.trim()) {
                                    alert('Nomor Resi wajib diisi!');
                                    return;
                                  }
                                  const combinedTracking = `${orderInput.courier} - ${orderInput.tracking.trim()}`;
                                  updateStatus(order.order_id, 'dikirim', combinedTracking);
                                }}
                                style={{ fontSize: 12, padding: '6px 14px' }}
                              >
                                🚀 Kirim
                              </button>
                            </div>
                          )}

                          {order.status === 'dikirim' && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🚚 Barang sedang dikirim. Menunggu konfirmasi dari pembeli.</span>
                          )}

                          {order.status === 'selesai' && (
                            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✓ Pesanan telah selesai diterima customer</span>
                          )}

                          {order.status === 'dibatalkan' && (
                            <span style={{ fontSize: 12, color: 'var(--red)' }}>❌ Pesanan dibatalkan</span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            )}
            {/* ══════════ TAB: BANNER ══════════ */}
            {activeTab === 'banners' && (
              <div className="dashboard-grid seller-grid">
                {/* Form tambah banner */}
                <section className="panel stack">
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                    🎯 Kelola Banner Toko
                  </h3>

                  {!store && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 13, color: 'var(--orange-light)' }}>
                      ⚠️ Buka toko dulu sebelum menambahkan banner.
                    </div>
                  )}

                  {/* Tipe legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SELLER_BANNER_TYPES.map(t => (
                      <span key={t.value} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                        background: t.color + '18', color: t.color, border: `1px solid ${t.color}33`
                      }}>
                        {t.icon} {t.label}
                      </span>
                    ))}
                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-elevated)' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>➕ Tambah Banner Baru</p>
                    <input value={sBannerForm.title} onChange={e => setSBannerForm({ ...sBannerForm, title: e.target.value })} placeholder="Judul banner *" />

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
                      Tipe Banner
                      <select value={sBannerForm.type} onChange={e => setSBannerForm({ ...sBannerForm, type: e.target.value })}>
                        {SELLER_BANNER_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="banner-upload-area" style={{ marginTop: 8 }}>
                      <label htmlFor="s-banner-img-input" className="banner-upload-label">
                        {sBannerPreview ? (
                          <img src={sBannerPreview} alt="Preview" className="banner-img-preview" />
                        ) : (
                          <div className="banner-upload-placeholder">
                            <span className="banner-upload-icon">🖼️</span>
                            <span>Klik untuk pilih gambar</span>
                            <span className="muted" style={{ fontSize: '0.78rem' }}>JPG, PNG, WEBP — maks. 10MB</span>
                          </div>
                        )}
                      </label>
                      <input id="s-banner-img-input" type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0]; if (!f) return
                          setSBannerFile(f)
                          const r = new FileReader(); r.onload = ev => setSBannerPreview(ev.target.result); r.readAsDataURL(f)
                        }} />
                      {sBannerPreview && (
                        <button className="ghost-button" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                          onClick={() => { setSBannerPreview(null); setSBannerFile(null) }}>Hapus gambar</button>
                      )}
                    </div>

                    <input value={sBannerForm.link_url} onChange={e => setSBannerForm({ ...sBannerForm, link_url: e.target.value })} placeholder="Link tujuan (opsional)" style={{ marginTop: 8 }} />
                    {sBannerError && <p style={{ color: 'var(--red)', margin: '4px 0 0', fontSize: '0.85rem' }}>{sBannerError}</p>}
                    <button className="button" onClick={saveSBanner} disabled={!store || !sBannerForm.title || !sBannerFile || sBannerSaving} style={{ marginTop: 10, width: '100%' }}>
                      {sBannerSaving ? 'Menyimpan...' : 'Simpan Banner'}
                    </button>
                  </div>
                </section>

                {/* Daftar banner */}
                <section className="panel stack">
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                    Banner Toko Saya ({sellerBanners.length})
                  </h3>

                  {sellerBanners.length === 0 ? (
                    <p className="muted" style={{ textAlign: 'center', padding: 24 }}>Belum ada banner. Tambahkan banner pertama toko Anda!</p>
                  ) : (
                    <div className="stack">
                      {sellerBanners.map(banner => (
                        <article key={banner.id} className="banner-list-card">
                          {banner.image && <img src={banner.image} alt={banner.title} className="banner-list-thumb" />}
                          <div className="banner-list-info">
                            <div className="banner-list-title-row">
                              <strong>{banner.title}</strong>
                              <SellerTypeBadge type={banner.type} />
                              <span className={banner.is_active ? 'chip chip--green' : 'chip chip--muted'}>
                                {banner.is_active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="muted banner-list-link">{banner.link_url || '—'}</p>
                          </div>
                          <div className="banner-list-actions">
                            <button className="ghost-button banner-action-btn" onClick={() => openSBannerEdit(banner)}>✏️ Edit</button>
                            <button className="banner-delete-btn" onClick={() => deleteSBanner(banner.id)}>🗑️ Hapus</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ══════════ TAB: PROMOSI ══════════ */}
            {activeTab === 'promotions' && (
              <div>
                {promoMode === 'list' ? (
                  <div className="panel stack">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 800 }}>
                        🏷️ Promo Toko Saya
                      </h3>
                      <button className="button" onClick={startCreatePromo} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        ➕ Buat Promo Baru
                      </button>
                    </div>

                    {sellerPromos.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
                        <p style={{ margin: '0 0 16px' }}>Belum ada promo toko yang dibuat.</p>
                        <button className="ghost-button" onClick={startCreatePromo}>Buat promo pertama Anda</button>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 16 }}>
                        {sellerPromos.map(promo => {
                          const startStr = new Date(promo.start_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          const endStr = new Date(promo.end_time).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          
                          let statusColor = '#64748b'
                          let statusBg = 'rgba(100,116,139,0.1)'
                          let statusLabel = promo.status
                          if (promo.status === 'ACTIVE') {
                            statusColor = '#10b981'
                            statusBg = 'rgba(16,185,129,0.15)'
                            statusLabel = '⚡ AKTIF'
                          } else if (promo.status === 'UPCOMING') {
                            statusColor = '#f59e0b'
                            statusBg = 'rgba(245,158,11,0.15)'
                            statusLabel = '⏳ MENDATANG'
                          } else if (promo.status === 'ENDED') {
                            statusColor = '#ef4444'
                            statusBg = 'rgba(239,68,68,0.1)'
                            statusLabel = '🛑 BERAKHIR'
                          }

                          return (
                            <div key={promo.id} className="panel" style={{ padding: 18, border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{promo.name}</h4>
                                    <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'var(--red)', color: '#fff' }}>
                                      Diskon {promo.discount_percentage}%
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: statusColor, background: statusBg, border: `1px solid ${statusColor}33` }}>
                                      {statusLabel}
                                    </span>
                                    {!promo.is_active && (
                                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        DITANGGUHKAN
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                                    📅 {startStr} — {endStr}
                                  </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button
                                    className="ghost-button"
                                    onClick={() => togglePromoActive(promo.id, promo.is_active)}
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                  >
                                    {promo.is_active ? '⏸️ Tangguhkan' : '▶️ Aktifkan'}
                                  </button>
                                  <button
                                    className="ghost-button"
                                    onClick={() => startEditPromo(promo)}
                                    style={{ fontSize: 12, padding: '6px 10px' }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="ghost-button"
                                    onClick={() => deletePromo(promo.id)}
                                    style={{ fontSize: 12, padding: '6px 10px', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}
                                  >
                                    🗑️ Hapus
                                  </button>
                                </div>
                              </div>

                              {/* Products List Thumbnails */}
                              <div style={{ background: 'var(--bg-primary)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Daftar Produk ({promo.products?.length || 0})
                                </p>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                  {promo.products && promo.products.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
                                      <img src={p.image || '/placeholder.png'} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="panel stack" style={{ maxWidth: 700 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 800 }}>
                      {promoMode === 'create' ? '➕ Buat Promo Baru' : '✏️ Edit Promo'}
                    </h3>

                    {promoError && (
                      <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', fontSize: 13 }}>
                        ⚠️ {promoError}
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 14 }}>
                      <div>
                        <label className="field-label">Nama Promo *</label>
                        <input
                          value={promoForm.name}
                          onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                          placeholder="Contoh: Promo Akhir Tahun, Gajian Sale"
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="field-label">Diskon Potongan (%) *</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={promoForm.discount_percentage}
                            onChange={e => setPromoForm({ ...promoForm, discount_percentage: e.target.value })}
                            placeholder="Contoh: 10, 25 (1 s.d. 99)"
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                          Potongan harga akan langsung memotong harga normal produk.
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="field-label">Waktu Mulai *</label>
                          <input
                            type="datetime-local"
                            value={promoForm.start_time}
                            onChange={e => setPromoForm({ ...promoForm, start_time: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="field-label">Waktu Selesai *</label>
                          <input
                            type="datetime-local"
                            value={promoForm.end_time}
                            onChange={e => setPromoForm({ ...promoForm, end_time: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Pilih Produk Toko *</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {promoForm.product_ids.length} terpilih
                          </span>
                        </label>
                        
                        {/* Product search filter */}
                        <input
                          value={promoProductSearch}
                          onChange={e => setPromoProductSearch(e.target.value)}
                          placeholder="🔍 Cari nama produk..."
                          style={{ marginBottom: 10, padding: '8px 12px', fontSize: 13 }}
                        />

                        <div style={{
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          maxHeight: 250,
                          overflowY: 'auto',
                          background: 'var(--bg-elevated)',
                          padding: '10px 14px'
                        }}>
                          {products.filter(p => p.status === 'ACTIVE' && p.title.toLowerCase().includes(promoProductSearch.toLowerCase())).length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '20px 0' }}>Tidak ada produk aktif yang cocok.</p>
                          ) : (
                            products
                              .filter(p => p.status === 'ACTIVE' && p.title.toLowerCase().includes(promoProductSearch.toLowerCase()))
                              .map(p => {
                                const isChecked = promoForm.product_ids.includes(p.id)
                                return (
                                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setPromoForm({ ...promoForm, product_ids: promoForm.product_ids.filter(id => id !== p.id) })
                                        } else {
                                          setPromoForm({ ...promoForm, product_ids: [...promoForm.product_ids, p.id] })
                                        }
                                      }}
                                    />
                                    <img src={p.image || '/placeholder.png'} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rp {Number(p.price).toLocaleString('id-ID')}</div>
                                    </div>
                                  </label>
                                )
                              })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row-actions" style={{ marginTop: 20 }}>
                      <button className="button" onClick={savePromo} disabled={promoSaving}>
                        {promoSaving ? '⏳ Menyimpan...' : '💾 Simpan Promo'}
                      </button>
                      <button className="ghost-button" onClick={cancelPromoEdit} disabled={promoSaving}>
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL EDIT BANNER SELLER ══ */}
      {sBannerEdit && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeSBannerEdit() }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Banner Toko</h3>
              <button className="modal-close" onClick={closeSBannerEdit}>✕</button>
            </div>
            <div className="modal-body stack">
              <label className="modal-label">
                Judul
                <input value={sBannerEditForm.title} onChange={e => setSBannerEditForm({ ...sBannerEditForm, title: e.target.value })} />
              </label>
              <label className="modal-label">
                Tipe Banner
                <select value={sBannerEditForm.type} onChange={e => setSBannerEditForm({ ...sBannerEditForm, type: e.target.value })}>
                  {SELLER_BANNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </label>
              <label className="modal-label">
                Link tujuan
                <input value={sBannerEditForm.link_url} onChange={e => setSBannerEditForm({ ...sBannerEditForm, link_url: e.target.value })} placeholder="https://..." />
              </label>
              <label className="modal-label">
                Status
                <select value={sBannerEditForm.is_active} onChange={e => setSBannerEditForm({ ...sBannerEditForm, is_active: Number(e.target.value) })}>
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
              </label>
              <div>
                <p className="modal-label-text">Gambar banner</p>
                <div className="banner-upload-area">
                  <label htmlFor="s-edit-banner-img" className="banner-upload-label">
                    {sBannerEditPreview ? (
                      <img src={sBannerEditPreview} alt="Preview" className="banner-img-preview" />
                    ) : (
                      <div className="banner-upload-placeholder" style={{ minHeight: 90 }}>
                        {sBannerEdit.image ? (
                          <img src={sBannerEdit.image} alt="" style={{ maxHeight: 80, objectFit: 'contain', borderRadius: 6 }} />
                        ) : <span className="banner-upload-icon">🖼️</span>}
                        <span style={{ fontSize: '0.8rem' }}>Klik untuk ganti gambar</span>
                      </div>
                    )}
                  </label>
                  <input ref={sBannerEditFileRef} id="s-edit-banner-img" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setSBannerEditFile(f)
                      const r = new FileReader(); r.onload = ev => setSBannerEditPreview(ev.target.result); r.readAsDataURL(f)
                    }} />
                  {sBannerEditPreview && (
                    <button className="ghost-button" style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                      onClick={() => { setSBannerEditPreview(null); setSBannerEditFile(null); if (sBannerEditFileRef.current) sBannerEditFileRef.current.value = '' }}>
                      Batal ganti
                    </button>
                  )}
                </div>
              </div>
              {sBannerEditError && <p style={{ color: 'var(--red)', margin: 0, fontSize: '0.85rem' }}>{sBannerEditError}</p>}
            </div>
            <div className="modal-footer">
              <button className="ghost-button" onClick={closeSBannerEdit} disabled={sBannerEditSaving}>Batal</button>
              <button className="button" onClick={saveSBannerEdit} disabled={!sBannerEditForm.title || sBannerEditSaving}>
                {sBannerEditSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flash Sale Proposal Modal */}
      {showFlashSaleForm && flashSaleForm.product && (
        <div className="modal-overlay" onClick={() => setShowFlashSaleForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajukan Flash Sale</h3>
              <button className="modal-close" onClick={() => setShowFlashSaleForm(false)}>✕</button>
            </div>
            <div className="modal-body stack">
              <p className="muted" style={{ fontSize: 13 }}>
                Produk: <strong>{flashSaleForm.product.title}</strong>
              </p>
              <label className="modal-label">
                Harga Normal (Rp)
                <input
                  type="number"
                  value={flashSaleForm.original_price}
                  onChange={e => setFlashSaleForm({ ...flashSaleForm, original_price: e.target.value })}
                  placeholder="Masukkan harga normal"
                />
              </label>
              <label className="modal-label">
                Harga Flash Sale (Rp)
                <input
                  type="number"
                  value={flashSaleForm.flash_sale_price}
                  onChange={e => setFlashSaleForm({ ...flashSaleForm, flash_sale_price: e.target.value })}
                  placeholder="Masukkan harga flash sale (harus lebih rendah)"
                />
              </label>
              <label className="modal-label">
                Pesan untuk Admin (opsional)
                <textarea
                  value={flashSaleForm.message}
                  onChange={e => setFlashSaleForm({ ...flashSaleForm, message: e.target.value })}
                  placeholder="Pesan tambahan untuk admin..."
                  rows={3}
                />
              </label>
              {proposalError && <p style={{ color: 'var(--red)', margin: 0, fontSize: '0.85rem' }}>{proposalError}</p>}
            </div>
            <div className="modal-footer">
              <button className="ghost-button" onClick={() => setShowFlashSaleForm(false)} disabled={proposalSaving}>Batal</button>
              <button className="button" onClick={submitFlashSaleProposal} disabled={proposalSaving}>
                {proposalSaving ? 'Mengirim...' : 'Kirim Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reject Order Modal */}
      {rejectOrderId && (
        <div className="modal-overlay" onClick={() => { if (!rejectSaving) { setRejectOrderId(null); setRejectReason('') } }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tolak Pesanan #{rejectOrderId}</h3>
              <button className="modal-close" onClick={() => { if (!rejectSaving) { setRejectOrderId(null); setRejectReason('') } }}>✕</button>
            </div>
            <div className="modal-body stack">
              <label className="modal-label">
                Alasan Penolakan *
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan pesanan ini (misal: Stok habis, dsb.)..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, resize: 'vertical', marginTop: 6 }}
                  required
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="ghost-button" onClick={() => { setRejectOrderId(null); setRejectReason('') }} disabled={rejectSaving}>Batal</button>
              <button 
                className="button" 
                style={{ backgroundColor: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    alert('Alasan penolakan wajib diisi!')
                    return
                  }
                  try {
                    setRejectSaving(true)
                    await updateStatus(rejectOrderId, 'dibatalkan', null, rejectReason.trim())
                    setRejectOrderId(null)
                    setRejectReason('')
                  } catch (err) {
                    alert('Gagal menolak pesanan: ' + err.message)
                  } finally {
                    setRejectSaving(false)
                  }
                }}
                disabled={rejectSaving || !rejectReason.trim()}
              >
                {rejectSaving ? '⏳ Memproses...' : '❌ Tolak Pesanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
