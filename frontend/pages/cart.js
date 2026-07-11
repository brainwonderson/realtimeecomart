import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { fetcher } from '../lib/api'
import Link from 'next/link'
import SiteNav from '../components/SiteNav'
import OrderSummary from '../components/OrderSummary'
import { getStoredToken, getStoredUserId } from '../lib/session'

export default function Cart(){
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    setUserId(getStoredUserId());
  }, []);

  const { data, mutate } = useSWR(userId ? '/cart/' + userId : null, fetcher);
  const { data: products } = useSWR('/products', fetcher);
  const items = data || [];

  const cartProductIds = items.map(item => Number(item.product_id));
  const cartCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
  const similarProducts = (products || [])
    .filter(product => !cartProductIds.includes(Number(product.id)))
    .filter(product => cartCategories.length ? cartCategories.includes(product.category) : true)
    .slice(0, 4);

  async function updateQuantity(cartItemId, nextQuantity) {
    if (!userId) return;
    if (nextQuantity < 1) {
      await removeItem(cartItemId);
      return;
    }

    const token = getStoredToken();
    const res = await fetch(`http://localhost:4000/api/cart/item/${cartItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? 'Bearer ' + token : ''
      },
      body: JSON.stringify({ quantity: nextQuantity })
    });

    if (res.ok) {
      mutate();
    } else {
      alert('Gagal mengubah quantity');
    }
  }

  async function removeItem(cartItemId) {
    if (!userId) return;
    const token = getStoredToken();
    const res = await fetch(`http://localhost:4000/api/cart/item/${cartItemId}`, {
      method: 'DELETE',
      headers: { Authorization: token ? 'Bearer ' + token : '' }
    });

    if (res.ok) {
      mutate();
    } else {
      alert('Gagal menghapus item dari cart');
    }
  }

  return (
    <div className="container">
      <SiteNav subtitle="Your cart" />

      <div className="section-title">
        <div>
          <h2>Shopping Cart</h2>
          <p>Periksa item sebelum lanjut checkout.</p>
        </div>
      </div>

      <div className="detail-layout">
        <div className="panel stack">
          {!userId ? (
            <div className="checkout-box">
              <h2>Silakan login dulu</h2>
              <p className="muted">Agar cart tersimpan per akun, login atau register terlebih dahulu.</p>
              <div className="stack">
                <Link className="button" href="/login">Login</Link>
                <Link className="ghost-button" href="/register">Register</Link>
              </div>
            </div>
          ) : !items.length ? (
            <div className="checkout-box">
              <h2>Cart masih kosong</h2>
              <p className="muted">Tambahkan produk dari halaman detail untuk melihat proses checkout.</p>
              <a className="button" href="/">Browse products</a>
            </div>
          ) : (
            <>
              {items.map(item => {
                const subtotal = Number(item.price || 0) * Number(item.quantity || 1)

                return (
                  <div key={item.id} className="cart-item">
                    <img src={item.image || '/placeholder.png'} alt={item.title || `Product ${item.product_id}`} />
                    <div className="cart-item-body">
                      <div className="cart-item-head">
                        <div>
                          <h4 className="cart-title">{item.title || `Product #${item.product_id}`}</h4>
                          <div className="muted cart-meta">{item.category || 'General'} · Rp {Number(item.price || 0).toLocaleString('id-ID')}</div>
                          {(item.selected_color || item.selected_size) && (
                            <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                              {item.selected_color && <span>Warna: {item.selected_color}</span>}
                              {item.selected_color && item.selected_size && <span> | </span>}
                              {item.selected_size && <span>Ukuran: {item.selected_size}</span>}
                            </div>
                          )}
                        </div>
                        <button type="button" className="ghost-button cart-remove-button" onClick={() => removeItem(item.id)}>
                          Hapus
                        </button>
                      </div>

                      <div className="cart-item-actions">
                        <div className="qty qty-controls">
                          <button type="button" className="qty-button" onClick={() => updateQuantity(item.id, Number(item.quantity || 1) - 1)}>
                            −
                          </button>
                          <span>Qty {item.quantity}</span>
                          <button type="button" className="qty-button" onClick={() => updateQuantity(item.id, Number(item.quantity || 1) + 1)}>
                            +
                          </button>
                        </div>
                        <div className="item-subtotal">
                          <span className="muted">Subtotal item</span>
                          <strong>Rp {subtotal.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <section className="similar-products panel stack">
                <div className="section-title section-title--compact">
                  <div>
                    <h3>Produk serupa</h3>
                    <p>Rekomendasi berdasarkan kategori produk di cart.</p>
                  </div>
                </div>
                <div className="similar-products-grid">
                  {similarProducts.length ? similarProducts.map(product => (
                    <Link key={product.id} href={`/product/${product.id}`} className="similar-product-card">
                      <img src={product.image || '/placeholder.png'} alt={product.title} />
                      <div>
                        <strong>{product.title}</strong>
                        <div className="muted">Rp {Number(product.price || 0).toLocaleString('id-ID')}</div>
                      </div>
                    </Link>
                  )) : <p className="muted">Belum ada rekomendasi produk serupa.</p>}
                </div>
              </section>
            </>
          )}
        </div>

        <OrderSummary items={items} sticky>
          {items.length && userId ? (
            <Link className="button" href="/checkout?step=address">Lanjut checkout</Link>
          ) : null}
          <p className="footer-note">Checkout multi-langkah: alamat, pengiriman, dan pembayaran.</p>
        </OrderSummary>
      </div>
    </div>
  )
}
