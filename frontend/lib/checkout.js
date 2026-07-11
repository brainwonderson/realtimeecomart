export const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Reguler', eta: '3–5 hari' },
  { id: 'express', label: 'Express', eta: '1–2 hari' },
  { id: 'same-day', label: 'Same Day', eta: 'Hari ini' },
]

export const CHECKOUT_STEPS = [
  { id: 'address', label: 'Alamat' },
  { id: 'shipping', label: 'Pengiriman' },
  { id: 'payment', label: 'Pembayaran' },
  { id: 'complete', label: 'Selesai' },
]

export function calcShippingEstimate(total, shippingOption, hasItems) {
  if (!hasItems) return 0
  const shippingBase = shippingOption === 'express' ? 32000 : shippingOption === 'same-day' ? 48000 : 18000
  return shippingBase + Math.min(20000, Math.round(total * 0.02))
}

export function formatAddress(address) {
  if (!address) return ''
  const parts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.province,
    address.postal_code,
  ].filter(Boolean)
  return parts.join(', ')
}
