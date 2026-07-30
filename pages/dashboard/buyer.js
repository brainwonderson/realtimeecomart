import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import SiteNav from '../../components/SiteNav'
import { authJson } from '../../lib/clientApi'
import { getStoredUser } from '../../lib/session'

/* ══════════════════════════════════════════════════════════════
   Komponen: Alur "Buka Toko" — 3 Langkah
   ══════════════════════════════════════════════════════════════ */
function BukaTokoFlow({ onSuccess, onCancel }) {
  const [step, setStep] = useState(1) // 1=intro, 2=form, 3=sukses
  const [storeName, setStoreName] = useState('')
  const [storeDesc, setStoreDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [storeId, setStoreId] = useState(null)

  async function submit() {
    if (!storeName.trim()) { setError('Nama toko wajib diisi'); return }
    setLoading(true); setError(null)
    try {
      const result = await authJson('/account/become-seller', {
        method: 'POST',
        body: JSON.stringify({ store_name: storeName.trim(), store_description: storeDesc.trim() })
      })
      setStoreId(result.store_id)
      setStep(3)
      onSuccess(result)
    } catch (err) {
      setError(err.message || 'Gagal membuka toko. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 1: Halaman Intro ── */
  if (step === 1) return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(59,130,246,0.25)',
      background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.07) 100%)',
    }}>
      {/* Hero gradient bar */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }} />
      <div style={{ padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🏪</div>
        <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: 'var(--text-primary)' }}>
          Buka Toko Sekarang
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Satu akun, dua peran.<br />
          Tetap belanja sebagai <strong style={{ color: '#10b981' }}>Buyer</strong> sekaligus berjualan sebagai{' '}
          <strong style={{ color: '#8b5cf6' }}>Seller</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 290, margin: '0 auto 20px' }}>
          {[
            { icon: '✅', color: '#10b981', text: 'Tetap bisa belanja seperti biasa' },
            { icon: '🚀', color: '#3b82f6', text: 'Jual produk & kelola toko sendiri' },
            { icon: '🎯', color: '#8b5cf6', text: 'Tambah banner promo toko' },
            { icon: '💰', color: '#f59e0b', text: 'Pantau pesanan & pendapatan' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderRadius: 10, textAlign: 'left',
              background: item.color + '12', border: `1px solid ${item.color}30`,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 290, margin: '0 auto' }}>
          <button
            className="button"
            style={{ padding: '13px', fontSize: 14, width: '100%' }}
            onClick={() => setStep(2)}
          >
            Lanjut — Isi Nama Toko →
          </button>
          {onCancel && (
            <button className="ghost-button" style={{ fontSize: 12 }} onClick={onCancel}>
              Nanti saja
            </button>
          )}
        </div>
      </div>
    </div>
  )

  /* ── Step 2: Form Nama Toko ── */
  if (step === 2) return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
      <div style={{ padding: '24px 22px' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
          {[
            { num: 1, label: 'Akun', done: true },
            { num: 2, label: 'Nama Toko', done: false, active: true },
            { num: 3, label: 'Selesai', done: false },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                background: s.done ? '#10b981' : s.active ? 'var(--accent)' : 'var(--bg-elevated)',
                color: (s.done || s.active) ? '#fff' : 'var(--text-muted)',
                border: (!s.done && !s.active) ? '2px dashed var(--border)' : 'none',
              }}>
                {s.done ? '✓' : s.num}
              </div>
              <span style={{ fontSize: 11, color: s.active ? 'var(--accent)' : s.done ? '#10b981' : 'var(--text-muted)', marginLeft: 5, fontWeight: s.active ? 700 : 400 }}>
                {s.label}
              </span>
              {i < 2 && (
                <div style={{ flex: 1, height: 2, margin: '0 8px', background: s.done ? '#10b981' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: 'var(--text-primary)' }}>
          Isi Nama Toko
        </h3>
        <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 13 }}>
          Nama ini akan ditampilkan ke seluruh pembeli di marketplace.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              NAMA TOKO *
            </label>
            <input
              value={storeName}
              onChange={e => { setStoreName(e.target.value); setError(null) }}
              placeholder="Contoh: Toko Elektronik Jaya"
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              DESKRIPSI TOKO <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opsional)</span>
            </label>
            <textarea
              value={storeDesc}
              onChange={e => setStoreDesc(e.target.value)}
              placeholder="Ceritakan sedikit tentang toko kamu..."
              rows={3}
              style={{
                width: '100%', padding: '11px 13px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-primary)', font: 'inherit', fontSize: 13, resize: 'vertical',
              }}
            />
          </div>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>⚠️ {error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="ghost-button" onClick={() => setStep(1)} disabled={loading} style={{ flexShrink: 0 }}>
            ← Kembali
          </button>
          <button
            className="button"
            onClick={submit}
            disabled={!storeName.trim() || loading}
            style={{ flex: 1 }}
          >
            {loading ? '⏳ Membuat toko...' : '🚀 Buka Toko Sekarang'}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Step 3: Sukses ── */
  return (
    <div style={{
      textAlign: 'center', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(16,185,129,0.3)',
      background: 'rgba(16,185,129,0.05)',
    }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #10b981, #3b82f6)' }} />
      <div style={{ padding: '28px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>🎉</div>
        <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: '#10b981' }}>
          Toko Berhasil Dibuka!
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Selamat! Akunmu kini menjadi<br />
          <strong style={{ color: '#3b82f6' }}>Buyer</strong>{' + '}
          <strong style={{ color: '#8b5cf6' }}>Seller</strong> sekaligus.
        </p>

        {/* Role badge visual */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
            🛒 BUYER
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 16 }}>+</div>
          <div style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>
            🏪 SELLER
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 260, margin: '0 auto' }}>
          <Link href="/dashboard/seller" className="button" style={{ textAlign: 'center', fontSize: 14 }}>
            🏪 Buka Seller Dashboard
          </Link>
          {storeId && (
            <Link href={`/store/${storeId}`} className="ghost-button" target="_blank" style={{ textAlign: 'center', fontSize: 13 }}>
              👁️ Lihat Halaman Toko
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   BUYER DASHBOARD — Main Component
   ══════════════════════════════════════════════════════════════ */
export default function BuyerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    if (router.isReady && router.query.tab) {
      setTab(router.query.tab)
    }
  }, [router.isReady, router.query.tab])

  // Tracking states
  const [expandedTracking, setExpandedTracking] = useState({}) // { [orderId]: historyData }
  const [loadingTracking, setLoadingTracking] = useState({}) // { [orderId]: boolean }

  // Chat states
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Dual-role state
  const [isSeller, setIsSeller] = useState(false)
  const [sellerStore, setSellerStore] = useState(null)
  const [showBukaToko, setShowBukaToko] = useState(false)

  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [addressForm, setAddressForm] = useState({
    label: 'Home', recipient_name: '', phone: '',
    address_line1: '', address_line2: '', city: '', province: '', postal_code: '', is_default: 1,
  })

  useEffect(() => {
    const stored = getStoredUser()
    setUser(stored)
    if (!stored) setLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function load() {
      try {
        const [profileData, addressData, orderData, meData] = await Promise.all([
          authJson(`/account/profile/${user.id}`),
          authJson(`/account/addresses/${user.id}`),
          authJson(`/orders/${user.id}`),
          authJson(`/account/me`).catch(() => null),
        ])
        if (!active) return
        setProfile(profileData)
        setAddresses(addressData || [])
        setOrders(orderData || [])
        setProfileForm({ name: profileData.name || '', email: profileData.email || '' })
        setAddressForm(prev => ({ ...prev, recipient_name: profileData.name || '' }))

        if (meData) {
          const hasSeller = !!meData.is_seller || meData.role === 'SELLER'
          setIsSeller(hasSeller)
          setSellerStore(meData.store || null)
        }
      } catch (err) {
        if (active) console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user])

  const latestOrder = useMemo(() => orders?.[0] || null, [orders])

  // Fetch chat rooms
  useEffect(() => {
    if (!user?.id || tab !== 'chat') return
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
  }, [user, tab])

  // Fetch messages with selected room
  useEffect(() => {
    if (!user?.id || !selectedRoomId || tab !== 'chat') return
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
  }, [user, selectedRoomId, tab])

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

  async function saveProfile() {
    await authJson(`/account/profile/${user.id}`, { method: 'PATCH', body: JSON.stringify(profileForm) })
    alert('Profil disimpan')
  }

  async function changePassword() {
    await authJson(`/account/password/${user.id}`, { method: 'PATCH', body: JSON.stringify(passwordForm) })
    setPasswordForm({ currentPassword: '', newPassword: '' })
    alert('Password diperbarui')
  }

  async function addAddress() {
    await authJson(`/account/addresses/${user.id}`, { method: 'POST', body: JSON.stringify(addressForm) })
    const refreshed = await authJson(`/account/addresses/${user.id}`)
    setAddresses(refreshed)
    alert('Alamat tersimpan')
  }

  async function cancelOrder(orderId) {
    await authJson(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from dashboard' }) })
    const refreshed = await authJson(`/orders/${user.id}`)
    setOrders(refreshed)
    alert('Order dibatalkan')
  }

  async function payOrder(orderId) {
    await authJson(`/orders/${orderId}/pay`, { method: 'POST', body: JSON.stringify({}) })
    const refreshed = await authJson(`/orders/${user.id}`)
    setOrders(refreshed)
    alert('Payment dummy berhasil')
  }

  async function receiveOrder(orderId) {
    if (!confirm('Apakah Anda yakin sudah menerima pesanan ini?')) return
    try {
      await authJson(`/orders/${orderId}/receive`, { method: 'POST', body: JSON.stringify({}) })
      const refreshed = await authJson(`/orders/${user.id}`)
      setOrders(refreshed)
      alert('Pesanan berhasil diterima! Terima kasih.')
    } catch (err) {
      alert('Gagal menyelesaikan pesanan: ' + (err.message || err))
    }
  }

  async function toggleTracking(orderId) {
    if (expandedTracking[orderId]) {
      setExpandedTracking(prev => ({ ...prev, [orderId]: null }));
      return;
    }

    setLoadingTracking(prev => ({ ...prev, [orderId]: true }));
    try {
      const history = await authJson(`/orders/${orderId}/history`);
      setExpandedTracking(prev => ({ ...prev, [orderId]: history || [] }));
    } catch (err) {
      console.error(err);
      alert('Gagal memuat pelacakan: ' + (err.message || err));
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  }

  // Dipanggil setelah toko berhasil dibuat
  function handleBecomeSeller(result) {
    // Update localStorage agar SiteNav langsung update
    try {
      const stored = getStoredUser()
      if (stored) localStorage.setItem('user', JSON.stringify({ ...stored, is_seller: 1 }))
    } catch { /* ignore */ }
    setIsSeller(true)
    setSellerStore({ id: result.store_id })
    setShowBukaToko(false)
    window.dispatchEvent(new Event('session-updated'))
  }

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div className="container">
      <SiteNav title="EcoMart Buyer" subtitle="Buyer dashboard" />

      <div className="section-title">
        <div>
          <h2>Buyer Dashboard</h2>
          <p>Kelola profil, alamat, riwayat pesanan, tracking, cancel order, dan payment dummy.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {latestOrder && (
            <span className="chip">Pesanan terakhir: #{latestOrder.id} — {latestOrder.status}</span>
          )}
          {isSeller && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px',
              borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)',
            }}>
              ✦ BUYER + SELLER
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['profile', 'orders', 'addresses', 'chat'].map(item => (
          <button
            key={item}
            className={tab === item ? 'tab active' : 'tab'}
            onClick={() => setTab(item)}
          >
            {item === 'profile' ? '👤 Profile' : item === 'orders' ? '🛒 Pesanan' : item === 'addresses' ? '📍 Alamat' : '💬 Chat Penjual'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          ⏳ Memuat dashboard...
        </div>
      ) : !user ? (
        <div className="panel stack" style={{ textAlign: 'center', padding: 48 }}>
          <h3>Login dulu</h3>
          <p className="muted">Dashboard buyer hanya tersedia setelah login.</p>
          <Link className="button" href="/login" style={{ display: 'inline-block', maxWidth: 200, margin: '0 auto' }}>Login</Link>
        </div>
      ) : tab === 'chat' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, minHeight: 550, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-card)', marginTop: 20 }}>
          {/* Left Panel: Conversation List */}
          <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Daftar Chat</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chatRooms.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40, padding: 10 }}>
                  Belum ada obrolan.
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
      ) : (
        <div className="dashboard-grid">

          {/* ── TAB: PROFILE ── */}
          {tab === 'profile' && (
            <section className="panel stack">
              <h3>Profile</h3>
              <input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Nama" />
              <input value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="Email" />
              <button className="button" onClick={saveProfile}>Simpan profile</button>

              <h3>Ganti password</h3>
              <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Password lama" />
              <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Password baru" />
              <button className="ghost-button" onClick={changePassword}>Update password</button>
            </section>
          )}

          {/* ── TAB: ORDERS ── */}
          {tab === 'orders' && (
            <section className="panel stack">
              <h3>Riwayat pesanan</h3>
              {orders.length === 0 && <p className="muted">Belum ada order.</p>}
              {orders.map(order => {
                const isNewPaid = order.status === 'pending' && order.payment_status === 'paid';
                const isUnpaid = order.status === 'pending' && order.payment_status === 'pending';
                
                return (
                  <article key={order.id} className="table-card">
                    <div className="table-card-head">
                      <strong>Order #{order.id}</strong>
                      <span className="chip" style={{
                        background: isNewPaid ? 'rgba(59,130,246,0.12)' : order.status === 'selesai' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.1)',
                        color: isNewPaid ? '#2563eb' : order.status === 'selesai' ? '#10b981' : 'var(--text-secondary)'
                      }}>
                        {isUnpaid ? 'Menunggu Pembayaran' :
                         isNewPaid ? 'Pesanan Baru (Sedang Dikemas)' :
                         order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="muted" style={{ fontSize: 13, margin: '4px 0' }}>Payment: {order.payment_status} | Method: {order.payment_method || 'dummy'}</p>
                    <p className="price" style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
                    
                    {/* Daftar item produk */}
                    {order.items && order.items.length > 0 && (
                      <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '14px 0', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        {order.items.map((item, idx) => (
                          <div key={item.id || idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <img
                              src={item.image || '/placeholder-product.png'}
                              alt={item.title}
                              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
                              <p className="muted" style={{ margin: '2px 0 0', fontSize: 11 }}>
                                {item.quantity} x Rp {Number(item.unit_price).toLocaleString('id-ID')}
                                {(item.selected_color || item.selected_size) && (
                                  <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 600 }}>
                                    (
                                    {item.selected_color && <span>Warna: {item.selected_color}</span>}
                                    {item.selected_color && item.selected_size && <span>, </span>}
                                    {item.selected_size && <span>Ukuran: {item.selected_size}</span>}
                                    )
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {order.tracking_number && (
                      <div style={{ margin: '8px 0', fontSize: 12, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        🚚 <strong>Resi Pengiriman:</strong> {order.tracking_number}
                      </div>
                    )}

                    {order.status === 'dibatalkan' ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: 'var(--red)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 12,
                        marginTop: 12
                      }}>
                        <span>❌</span>
                        <div>
                          <strong>Pesanan Dibatalkan</strong>
                          {order.cancel_reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Alasan: {order.cancel_reason}</p>}
                        </div>
                      </div>
                    ) : (
                      /* Stepper Progress */
                      <div className="order-stepper" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'relative',
                        margin: '20px 0 12px',
                        padding: '0 8px'
                      }}>
                        {/* Connecting line */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '24px',
                          right: '24px',
                          height: '3px',
                          background: 'var(--border)',
                          zIndex: 1
                        }} />
                        {/* Active line */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '24px',
                          height: '3px',
                          background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                          width: `${
                            order.status === 'selesai' ? '100%' :
                            order.status === 'dikirim' ? '66%' :
                            (order.status === 'diproses' || order.payment_status === 'paid') ? '33%' : '0%'
                          }`,
                          transition: 'width 0.3s ease',
                          zIndex: 2
                        }} />

                        {/* Steps */}
                        {[
                          { key: 'dipesan', label: order.payment_status === 'paid' ? 'Sudah Bayar' : 'Dipesan', icon: '📝', active: true },
                          { key: 'dikemas', label: 'Dikemas', icon: '📦', active: order.payment_status === 'paid' || ['diproses', 'dikirim', 'selesai'].includes(order.status) },
                          { key: 'dikirim', label: 'Dikirim', icon: '🚚', active: ['dikirim', 'selesai'].includes(order.status) },
                          { key: 'selesai', label: 'Selesai', icon: '✓', active: order.status === 'selesai' }
                        ].map((step, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 3,
                            width: '60px',
                            textAlign: 'center'
                          }}>
                            {/* Circle dot */}
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: step.active ? '#10b981' : 'var(--bg-elevated)',
                              border: step.active ? '2px solid #10b981' : '2px solid var(--border)',
                              color: step.active ? '#fff' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              transition: 'all 0.3s ease',
                              boxShadow: step.active ? '0 0 8px rgba(16,185,129,0.4)' : 'none'
                            }}>
                              {step.icon}
                            </div>
                            <span style={{
                              fontSize: '10px',
                              marginTop: '6px',
                              fontWeight: step.active ? 'bold' : 'normal',
                              color: step.active ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="stack" style={{ marginTop: 10 }}>
                      <button className="ghost-button" onClick={() => toggleTracking(order.id)} style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                        🧭 {expandedTracking[order.id] ? 'Tutup Detail Pelacakan' : 'Lacak Pesanan'}
                        {loadingTracking[order.id] && ' (⏳)'}
                      </button>
                      
                      {/* Detail Pelacakan (Timeline Vertikal) */}
                      {expandedTracking[order.id] && (
                        <div className="tracking-timeline-box" style={{
                          marginTop: '12px',
                          padding: '16px',
                          background: 'var(--bg-elevated)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          textAlign: 'left'
                        }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            📋 Detail Log Pelacakan
                          </h4>
                          
                          {expandedTracking[order.id].length === 0 ? (
                            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>Belum ada log pelacakan untuk pesanan ini.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: '14px', borderLeft: '2px dashed var(--border)' }}>
                              {expandedTracking[order.id].map((historyItem, idx) => {
                                const isLast = idx === expandedTracking[order.id].length - 1;
                                return (
                                  <div key={idx} style={{
                                    position: 'relative',
                                    paddingBottom: isLast ? '0' : '16px',
                                    fontSize: '12px'
                                  }}>
                                    {/* Dot indicator */}
                                    <div style={{
                                      position: 'absolute',
                                      left: '-20px',
                                      top: '4px',
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      background: isLast ? '#10b981' : 'var(--text-muted)',
                                      border: isLast ? '2px solid rgba(16,185,129,0.3)' : '2px solid var(--border)',
                                      boxShadow: isLast ? '0 0 6px #10b981' : 'none'
                                    }} />
                                    <div style={{ fontWeight: isLast ? 'bold' : 'normal', color: isLast ? '#10b981' : 'var(--text-primary)' }}>
                                      {historyItem.status.toUpperCase()}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                                      {historyItem.note}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>
                                      {new Date(historyItem.created_at).toLocaleString('id-ID', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="row-actions" style={{ marginTop: 8 }}>
                        {isUnpaid && (
                          <>
                            <button className="button" onClick={() => payOrder(order.id)} style={{ fontSize: 12 }}>Bayar dummy</button>
                            <button className="ghost-button" onClick={() => cancelOrder(order.id)} style={{ fontSize: 12 }}>Cancel</button>
                          </>
                        )}
                        {order.status === 'dikirim' && (
                          <button className="button" onClick={() => receiveOrder(order.id)} style={{ fontSize: 12, background: '#10b981', borderColor: '#10b981' }}>
                            ✓ Pesanan Diterima
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* ── TAB: ADDRESSES ── */}
          {tab === 'addresses' && (
            <section className="panel stack">
              <h3>Manage alamat</h3>
              <input value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Label alamat" />
              <input value={addressForm.recipient_name} onChange={e => setAddressForm({ ...addressForm, recipient_name: e.target.value })} placeholder="Nama penerima" />
              <input value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} placeholder="Telepon" />
              <input value={addressForm.address_line1} onChange={e => setAddressForm({ ...addressForm, address_line1: e.target.value })} placeholder="Alamat" />
              <input value={addressForm.address_line2} onChange={e => setAddressForm({ ...addressForm, address_line2: e.target.value })} placeholder="Detail alamat" />
              <div className="form-grid">
                <input value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="Kota" />
                <input value={addressForm.province} onChange={e => setAddressForm({ ...addressForm, province: e.target.value })} placeholder="Provinsi" />
                <input value={addressForm.postal_code} onChange={e => setAddressForm({ ...addressForm, postal_code: e.target.value })} placeholder="Kode pos" />
              </div>
              <button className="button" onClick={addAddress}>Tambah alamat</button>

              <div className="stack">
                {addresses.map(address => (
                  <article key={address.id} className="table-card">
                    <strong>{address.label}</strong>
                    <p className="muted">{address.recipient_name} — {address.phone}</p>
                    <p>{address.address_line1}, {address.city}, {address.province} {address.postal_code}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── SIDEBAR ── */}
          <aside className="panel stack">
            <h3>Quick actions</h3>
            <Link className="ghost-button" href="/">Browse produk</Link>
            <Link className="ghost-button" href="/cart">Lihat cart</Link>

            {/* ─── Seller Zone ─── */}
            {showBukaToko ? (
              <BukaTokoFlow onSuccess={handleBecomeSeller} onCancel={() => setShowBukaToko(false)} />
            ) : isSeller ? (
              /* Sudah jadi seller — tampilkan seller zone */
              <div style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid rgba(139,92,246,0.25)',
              }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                <div style={{ padding: '14px 16px', background: 'rgba(139,92,246,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🏪</span>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Mode Seller Aktif</strong>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                      background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)'
                    }}>AKTIF</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    Akunmu memiliki peran <strong>Buyer + Seller</strong> sekaligus.
                  </p>
                  <Link href="/dashboard/seller" className="button"
                    style={{ display: 'block', textAlign: 'center', fontSize: 13, marginBottom: 6 }}>
                    🚀 Seller Dashboard
                  </Link>
                  {sellerStore?.id && (
                    <Link href={`/store/${sellerStore.id}`} className="ghost-button" target="_blank"
                      style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
                      👁️ Lihat Toko
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* Belum jadi seller — tampilkan CTA Buka Toko */
              <div style={{
                borderRadius: 14, padding: '14px 16px',
                background: 'var(--bg-elevated)',
                border: '1px dashed var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>💡</span>
                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Ingin berjualan?</strong>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Buka toko dan jual produkmu — tanpa perlu bikin akun baru.
                </p>
                <button
                  className="button"
                  style={{ width: '100%', fontSize: 13 }}
                  onClick={() => setShowBukaToko(true)}
                >
                  🏪 Buka Toko
                </button>
              </div>
            )}

            <div className="summary">
              <h4>Progress</h4>
              <p className="muted">
                Profile, alamat, riwayat pesanan, cancel order, tracking, dan payment dummy sudah aktif.
              </p>
            </div>
          </aside>

        </div>
      )}
    </div>
  )
}
