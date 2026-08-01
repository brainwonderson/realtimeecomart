"use strict";(()=>{var e={};e.id=290,e.ids=[290],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6249:(e,t)=>{Object.defineProperty(t,"l",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},2428:(e,t,r)=>{r.r(t),r.d(t,{config:()=>s,default:()=>l,routeModule:()=>p});var n={};r.r(n),r.d(n,{default:()=>u});var i=r(1802),o=r(7153),a=r(6249);async function u(e,t){let r="https://wonderson.site",n=`<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    
    <url>
      <loc>${r}</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>

    <url>
      <loc>${r}/login</loc>
      <changefreq>monthly</changefreq>
      <priority>0.5</priority>
    </url>

  </urlset>`;t.setHeader("Content-Type","text/xml"),t.status(200).send(n)}let l=(0,a.l)(n,"default"),s=(0,a.l)(n,"config"),p=new i.PagesAPIRouteModule({definition:{kind:o.x.PAGES_API,page:"/api/sitemap",pathname:"/api/sitemap",bundlePath:"",filename:""},userland:n})},7153:(e,t)=>{var r;Object.defineProperty(t,"x",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},1802:(e,t,r)=>{e.exports=r(145)}};var t=require("../../webpack-api-runtime.js");t.C(e);var r=t(t.s=2428);module.exports=r})();