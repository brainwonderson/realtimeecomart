import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Kolom 1: Brand & Sosial Media */}
        <div className="footer-brand">
          <div className="footer-logo">
            Eco<span>Mart</span>
          </div>
          <p className="footer-desc">
            EcoMart adalah platform e-commerce real-time terpercaya, menghadirkan produk berkualitas dengan pelayanan terbaik dan transaksi super cepat.
          </p>
          <div className="footer-socials">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-icon"
              aria-label="Facebook EcoMart"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-icon"
              aria-label="Instagram EcoMart"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.01 3.752.054 2.14.097 3.248 1.166 3.64 3.64.044.96.054 1.315.054 3.752 0 2.43-.01 2.784-.054 3.752-.097 2.14-1.166 3.248-3.64 3.64-.96.044-1.315.054-3.752.054-2.43 0-2.784-.01-3.752-.054-2.14-.097-3.248-1.166-3.64-3.64-.044-.96-.054-1.315-.054-3.752 0-2.43.01-2.784.054-3.752.097-2.14 1.166-3.248 3.64-3.64.96-.044 1.315-.054 3.752-.054zM12 6.865A5.135 5.135 0 1112 17.13 5.135 5.135 0 0112 6.865zm0 1.902a3.233 3.233 0 100 6.465 3.233 3.233 0 000-6.465zm5.39-1.055a1.155 1.155 0 11-2.31 0 1.155 1.155 0 012.31 0z" clipRule="evenodd" />
              </svg>
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-icon"
              aria-label="Twitter EcoMart"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a 
              href="https://youtube.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer-social-icon"
              aria-label="YouTube EcoMart"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C22 8.68 22 12 22 12s0 3.32-.42 4.814c-.23.861-.907 1.538-1.768 1.768C18.32 19 12 19 12 19s-6.32 0-7.812-.418c-.861-.23-1.538-.907-1.768-1.768C2 15.32 2 12 2 12s0-3.32.42-4.814c.23-.861.907-1.538 1.768-1.768C5.68 5 12 5 12 5s6.32 0 7.812.418zM9.75 15.022L15.5 12 9.75 8.978v6.044z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        {/* Kolom 2: Tautan Belanja */}
        <div className="footer-col">
          <h3>Beli di EcoMart</h3>
          <ul className="footer-links">
            <li>
              <Link href="/">Semua Produk</Link>
            </li>
            <li>
              <Link href="/category/Elektronik">Elektronik</Link>
            </li>
            <li>
              <Link href="/category/Fashion">Fashion & Pakaian</Link>
            </li>
            <li>
              <Link href="/#promo">Promo & Flash Sale</Link>
            </li>
            <li>
              <Link href="/#brand">Brand Pilihan</Link>
            </li>
          </ul>
        </div>

        {/* Kolom 3: Layanan Pelanggan */}
        <div className="footer-col">
          <h3>Bantuan & Panduan</h3>
          <ul className="footer-links">
            <li>
              <Link href="/dashboard/buyer">Pusat Resolusi Pembeli</Link>
            </li>
            <li>
              <Link href="/#faq">Pertanyaan Umum (FAQ)</Link>
            </li>
            <li>
              <Link href="/cart">Cara Berbelanja</Link>
            </li>
            <li>
              <a href="#rules">Syarat & Ketentuan</a>
            </li>
            <li>
              <a href="#privacy">Kebijakan Privasi</a>
            </li>
          </ul>
        </div>

        {/* Kolom 4: Hubungi Kami */}
        <div className="footer-col">
          <h3>Kantor Pusat</h3>
          <div className="footer-contact-info">
            <div className="footer-contact-item">
              <span className="icon">📍</span>
              <span>Menara EcoMart, Lantai 12-14. Jl. Jenderal Sudirman Kav. 21, Jakarta Selatan 12920</span>
            </div>
            <div className="footer-contact-item">
              <span className="icon">📞</span>
              <span>(021) 5555-9999</span>
            </div>
            <div className="footer-contact-item">
              <span className="icon">✉️</span>
              <span>support@ecomart.com</span>
            </div>
            <div className="footer-contact-item">
              <span className="icon">🕒</span>
              <span>Senin - Minggu: 08.00 - 22.00 WIB</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="footer-divider" />

      {/* Baris Bawah: Partner & Copyright */}
      <div className="footer-bottom">
        <div className="footer-payments-shipping">
          <div className="footer-payments">
            <span style={{ marginRight: 8, fontSize: '12px', color: '#64748b' }}>Metode Pembayaran:</span>
            <div className="footer-badge-group" style={{ display: 'inline-flex' }}>
              <span className="footer-badge">Midtrans</span>
              <span className="footer-badge">GoPay</span>
              <span className="footer-badge">OVO</span>
              <span className="footer-badge">ShopeePay</span>
              <span className="footer-badge">DANA</span>
            </div>
          </div>
          <div className="footer-shipping">
            <span style={{ marginRight: 8, fontSize: '12px', color: '#64748b' }}>Pengiriman:</span>
            <div className="footer-badge-group" style={{ display: 'inline-flex' }}>
              <span className="footer-badge">JNE Express</span>
              <span className="footer-badge">SiCepat</span>
              <span className="footer-badge">GoSend</span>
              <span className="footer-badge">GrabExpress</span>
            </div>
          </div>
        </div>
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} EcoMart. Hak Cipta Dilindungi Undang-Undang.
        </p>
      </div>
    </footer>
  )
}
