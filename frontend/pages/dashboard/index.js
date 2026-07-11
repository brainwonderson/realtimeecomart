import Link from 'next/link'
import { useEffect, useState } from 'react'
import SiteNav from '../../components/SiteNav'
import { getStoredUser } from '../../lib/session'

export default function DashboardHome() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const role = user?.role || 'BUYER'

  return (
    <div className="container">
      <SiteNav title="EcoMart Dashboard" subtitle="Role hub" />

      <div className="section-title">
        <div>
          <h2>Dashboard Hub</h2>
          <p>Pilih area sesuai role Anda.</p>
        </div>
      </div>

      <div className="grid">
        <article className="panel stack">
          <span className="chip">Buyer</span>
          <h3>Fitur pembeli</h3>
          <p className="muted">Profile, alamat, riwayat pesanan, tracking, cancel order, payment dummy, dan review produk.</p>
          <Link className="button" href="/dashboard/buyer">Buka buyer dashboard</Link>
        </article>
        <article className="panel stack">
          <span className="chip">Seller</span>
          <h3>Fitur penjual</h3>
          <p className="muted">Tambah, edit, hapus produk, upload gambar, set harga/stok, dan order masuk.</p>
          <Link className="button" href="/dashboard/seller">Buka seller dashboard</Link>
        </article>
        <article className="panel stack">
          <span className="chip">Admin</span>
          <h3>Fitur admin</h3>
          <p className="muted">Kelola user, verifikasi seller, moderasi produk, banner promo, dan monitoring sistem.</p>
          <Link className="button" href="/dashboard/admin">Buka admin dashboard</Link>
        </article>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <strong>Role aktif: {role}</strong>
      </div>
    </div>
  )
}
