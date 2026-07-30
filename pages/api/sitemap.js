export default async function handler(req, res) {
  const baseUrl = 'https://wonderson.site';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    
    <url>
      <loc>${baseUrl}</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>

    <url>
      <loc>${baseUrl}/login</loc>
      <changefreq>monthly</changefreq>
      <priority>0.5</priority>
    </url>

  </urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(sitemap);
}