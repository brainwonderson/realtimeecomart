import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'

const GOOGLE_CLIENT_ID = '658151003144-hg2k7qc22vrsk8fbrba3fdq1h1eond34.apps.googleusercontent.com'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const router = useRouter()

  function handleAuthSuccess(data) {
    if (data.token) localStorage.setItem('token', data.token)
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
    const role = data.user?.role || 'BUYER'
    if (role === 'SELLER') router.push('/dashboard/seller')
    else if (role === 'ADMIN') router.push('/dashboard/admin')
    else router.push('/dashboard/buyer')
  }

  async function doLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('https://api.wonderson.site/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Login gagal')
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
      const res = await fetch('https://api.wonderson.site/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Login Google gagal')
        return
      }
      const data = await res.json()
      handleAuthSuccess(data)
    } catch {
      alert('Login Google gagal. Coba lagi.')
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
    // Render Google's official button into the ref div
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: googleBtnRef.current.offsetWidth || 360,
      logo_alignment: 'left',
    })
  }

  useEffect(() => {
    // If GSI already loaded (e.g. navigated back), init immediately
    if (window.google) {
      initGoogleButton()
      return
    }
    // Otherwise inject the script
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
        <title>Login – Toko Online</title>
      </Head>
      <div className="container login-wrap">
        <div className="login-card">
          <span className="chip">Secure checkout ready</span>
          <h2>Login ke akun Anda</h2>
          <p className="muted">Masuk dulu agar alur belanja, cart, dan order history bisa diaktifkan.</p>

          {/* Google renders its official button here */}
          <div className="google-btn-wrapper">
            {googleLoading && (
              <div className="google-loading-overlay">
                <span className="google-spinner" />
                <span>Memproses...</span>
              </div>
            )}
            <div ref={googleBtnRef} id="google-signin-btn" />
          </div>

          <div className="divider-or">
            <span>atau</span>
          </div>

          <form onSubmit={doLogin}>
            <input
              id="login-email"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              id="login-password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button id="btn-login-submit" className="button" disabled={loading}>
              {loading ? 'Masuk...' : 'Login'}
            </button>
          </form>

          <p className="footer-note">
            Belum punya akun? <Link href="/register">Register di sini</Link>
          </p>
        </div>
      </div>
    </>
  )
}
