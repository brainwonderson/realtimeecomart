import pool from '../lib/db';

const EXTERNAL_DATA_URL = 'https://wonderson.site';

function generateSiteMap(products) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Halaman Statis -->
  <url>
    <loc>${EXTERNAL_DATA_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${EXTERNAL_DATA_URL}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${EXTERNAL_DATA_URL}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${EXTERNAL_DATA_URL}/cart</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Halaman Dinamis Produk -->
  ${products
    .map(({ id, created_at }) => {
      const lastModDate = created_at ? new Date(created_at) : new Date();
      return `  <url>
    <loc>${EXTERNAL_DATA_URL}/product/${id}</loc>
    <lastmod>${lastModDate.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n')}
</urlset>`;
}

function SiteMap() {
  // getServerSideProps menangani response XML secara langsung
  return null;
}

export async function getServerSideProps({ res }) {
  try {
    // Ambil data produk aktif dari database
    const [products] = await pool.query(
      'SELECT id, created_at FROM products WHERE status = "ACTIVE" ORDER BY created_at DESC'
    );

    // Buat sitemap XML
    const sitemap = generateSiteMap(products);

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
  } catch (err) {
    console.error('Error generating sitemap:', err);
    res.statusCode = 500;
    res.end();
  }

  return {
    props: {},
  };
}

export default SiteMap;
