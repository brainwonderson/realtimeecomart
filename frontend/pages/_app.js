import '../styles.css'
import Script from 'next/script'

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Midtrans Snap JS — Sandbox */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'Mid-client-_KRZZmunqrO9fAEK'}
        strategy="beforeInteractive"
      />
      <Component {...pageProps} />
    </>
  )
}
