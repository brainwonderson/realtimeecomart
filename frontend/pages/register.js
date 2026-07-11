import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const GOOGLE_CLIENT_ID = '658151003144-hg2k7qc22vrsk8fbrba3fdq1h1eond34.apps.googleusercontent.com'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('BUYER')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const router = useRouter()

  function handleAuthSuccess(data) {
    if (data.token) localStorage.setItem('token', data.token)
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
    const targetRole = data.user?.role || 'BUYER'
    if (targetRole === 'SELLER') router.push('/dashboard/seller')
    else if (targetRole === 'ADMIN') router.push('/dashboard/admin')
    else router.push('/dashboard/buyer')
  }

  async function doRegister(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error')
        const err = (() => { try { return JSON.parse(errText) } catch { return { error: errText } } })()
        alert('Registrasi gagal: ' + (err.error || 'Unknown error'))
        return
      }
      const data = await res.json()
      handleAuthSuccess(data)
    } catch {
      alert('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleCredential(response) {
    setGoogleLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Daftar dengan Google gagal')
        return
      }
      const data = await res.json()
      handleAuthSuccess(data)
    } catch {
      alert('Daftar dengan Google gagal. Coba lagi.')
    } finally {
      setGoogleLoading(false)
    }
  }

  function initGoogleButton() {
    if (!window.google || !googleBtnRef.current) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    })
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signup_with',
      shape: 'rectangular',
      width: googleBtnRef.current.offsetWidth || 360,
      logo_alignment: 'left',
    })
  }

  useEffect(() => {
    if (window.google) {
      initGoogleButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogleButton()
    document.head.appendChild(script)
  }, [])

  return (
    <>
      <Head>
        <title>Register – Toko Online</title>
      </Head>
      <div className="container login-wrap">
        <div className="login-card">
          <span className="chip">Create account</span>
          <h2>Buat akun baru</h2>
          <p className="muted">Daftar untuk menyimpan keranjang dan melihat riwayat pesanan.</p>

          {/* Google renders its official button here */}
          <div className="google-btn-wrapper">
            {googleLoading && (
              <div className="google-loading-overlay">
                <span className="google-spinner" />
                <span>Memproses...</span>
              </div>
            )}
            <div ref={googleBtnRef} id="google-register-btn" />
          </div>

          <div className="divider-or">
            <span>atau daftar dengan email</span>
          </div>

          <form onSubmit={doRegister}>
            <input
              id="reg-name"
              placeholder="Nama"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <input
              id="reg-email"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              id="reg-password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label style={{ marginTop: 8, display: 'block' }}>- Daftar sebagai:</label>
            <select id="reg-role" value={role} onChange={e => setRole(e.target.value)}>
              <option value="BUYER">Buyer (Pembeli)</option>
              <option value="SELLER">Seller (Penjual)</option>
            </select>
            <button id="btn-register-submit" className="button" disabled={loading}>
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <p className="footer-note">Sudah punya akun? <a href="/login">Login</a></p>
          <p className="footer-note" style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
            * Daftar via Google otomatis masuk sebagai Pembeli (BUYER)
          </p>
        </div>
      </div>
    </>
  )
}
