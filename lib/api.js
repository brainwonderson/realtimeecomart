export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export async function fetcher(url, opts) {
  const res = await fetch(API_BASE + url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
