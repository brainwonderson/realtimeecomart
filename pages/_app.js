import '../styles.css'
import Script from 'next/script'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <title>EcoMart – Belanja Cerdas, Lebih Cepat</title>
      </Head>
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
