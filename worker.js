// GAMİKA – ürün ve kategori sayfalarını sunucuda hazırlar.
// Google ve WhatsApp/Instagram önizlemeleri sayfayı açtığında ürün adı, fiyatı, resmi ve açıklaması
// sayfanın içinde hazır gelir. Diğer tüm dosyalar (ana sayfa, resimler, yönetim paneli) normal şekilde sunulur.

const SUPABASE_URL = 'https://yhgdnpomcfosobqluafi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GvrjJ4s2GB1wF7e8IYKM1Q_7gLslFhY'; // herkese açık okuma anahtarı (index.html'deki ile aynı)
const SITE = 'https://gamikatr.com';
const DEFAULT_IMG = SITE + '/logo.png';

const CATS = [
  { f: 'mousepad', slug: 'mousepad', t: 'Mousepad', h: 'Mousepad Modelleri', d: 'Kadın oyuncular için pastel renkli, geniş boy gaming mousepad modelleri.' },
  { f: 'figur', slug: 'figur', t: 'Figür', h: 'Masaüstü Figürler', d: 'Oyun masana sevimli bir dokunuş katan masaüstü figürler.' },
  { f: 'bilek', slug: 'bilek-destegi', t: 'Bilek Desteği', h: 'Klavye Bilek Destekleri', d: 'Yazarken ve oynarken rahat duruş için pastel klavye bilek destekleri.' },
  { f: 'switch', slug: 'klavye-switch', t: 'Switch', h: "Klavye Switch'leri", d: 'Mekanik klavyene yeni bir his katan linear ve tactile switch setleri.' }
];

// Mousepad serileri: her birinin kendi sayfası var (/seri/dark gibi)
const SERIES = [
  { k: 'dark', t: 'Dark', h: 'Dark Serisi – Siyah ve Koyu Gaming Mousepad', d: 'Gamika Dark serisi: siyah, mor ve koyu tonlarda, anime ve Japon temalı 90x40 gaming mousepad modelleri. Ücretsiz kargo, 2 iş gününde kargoda.' },
  { k: 'minimal', t: 'Minimal', h: 'Minimal Serisi – Beyaz ve Sade Gaming Mousepad', d: 'Gamika Minimal serisi: beyaz, mermer desenli ve sade gaming mousepad modelleri; beyaz ve açık renk masa düzenlerine uygun. Ücretsiz kargo.' },
  { k: 'candy', t: 'Candy', h: 'Candy Serisi – Pastel Pembe Kawaii Mousepad', d: 'Gamika Candy serisi: pastel pembe, sakura ve kawaii temalı tatlı gaming mousepad modelleri. Kadın oyunculara özel, ücretsiz kargo.' }
];
// Google ürün bilgisine kargo (ücretsiz, Türkiye, 0-2 gün hazırlık + 1-3 gün kargo) ve 14 gün iade bilgisi
const OFFER_EXTRA = {
  shippingDetails: { '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'TRY' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TR' },
    deliveryTime: { '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' } } },
  hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'TR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail' }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TL = n => Number(n).toLocaleString('tr-TR') + ' ₺';

function slugify(t) {
  return String(t || '').replace(/[İI]/g, 'i').toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const productPath = p => '/urun/' + Number(p.id) + '-' + slugify(p.name);
const listPath = c => (c ? '/kategori/' + c.slug : '/urunler');
const okUrl = u => typeof u === 'string' && u.startsWith('https://');
// Sitede gösterilen fotoğraflar; beyaz Google görseli sadece başka fotoğraf yoksa gösterilir
const imgsOf = p => { const a = [...new Set([...(Array.isArray(p.images) ? p.images : []), p.image_url].filter(okUrl))]; return a.length ? a : [p.google_image].filter(okUrl); };
// Google için: beyaz arka planlı görsel önce gelir (Google Arama, Google Alışveriş)
const gImgsOf = p => [...new Set([p.google_image, ...imgsOf(p)].filter(okUrl))];
const imgOf = p => imgsOf(p)[0] || '';
const xml = s => esc(s).replace(/&#39;/g, '&apos;');
const STATIC_PAGES = ['/', '/iletisim.html', '/sss.html', '/kargo-iade.html', '/mesafeli-satis.html', '/on-bilgilendirme.html', '/gizlilik.html', '/uyelik-sozlesmesi.html'];

// Ürünlerin seçenekleri (renk, ölçü): { ürünId: [seçenek, ...] }
async function variantsBy(ids) {
  if (!ids.length) return {};
  const res = await fetch(SUPABASE_URL + '/rest/v1/product_variants?select=id,product_id,name,opt2,price,stock,images&is_active=eq.true&order=sort.asc,id.asc&product_id=in.(' + ids.map(Number).join(',') + ')', {
    headers: { apikey: SUPABASE_KEY }, cf: { cacheTtl: 60, cacheEverything: true }
  });
  const rows = res.ok ? await res.json() : [];
  const out = {};
  for (const v of rows) (out[v.product_id] = out[v.product_id] || []).push(v);
  return out;
}
const vLabel = v => v.name + (v.opt2 ? ' / ' + v.opt2 : '');
const vPrice = (p, v) => Number(v.price == null ? p.price : v.price);

async function sitemap() {
  const rows = await db('select=id,name,category,series,created_at&is_active=eq.true&order=id.asc');
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...STATIC_PAGES.map(u => ({ loc: SITE + u, pr: u === '/' ? '1.0' : '0.3' })),
    { loc: SITE + '/urunler', pr: '0.9' },
    ...CATS.filter(c => rows.some(p => p.category === c.f)).map(c => ({ loc: SITE + listPath(c), pr: '0.8' })),
    ...SERIES.filter(x => rows.some(p => p.series === x.k)).map(x => ({ loc: SITE + '/seri/' + x.k, pr: '0.8' })),
    ...rows.map(p => ({ loc: SITE + productPath(p), pr: '0.8' }))
  ];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${xml(u.loc)}</loc><lastmod>${today}</lastmod><priority>${u.pr}</priority></url>`).join('\n')
    + '\n</urlset>\n';
}

// Google Merchant Center ürün akışı (Google Alışveriş'te ücretsiz listeleme için)
async function merchantFeed() {
  const rows = await db('select=id,name,category,type_label,price,stock,image_url,images,google_image,series,description,option_label,option2_label&is_active=eq.true&order=id.asc');
  const vmap = await variantsBy(rows.map(p => p.id));
  // Seçenekli ürünlerde her seçenek Google'a ayrı ürün olarak gider (aynı grup numarasıyla)
  const flat = rows.flatMap(p => (vmap[p.id] || []).length
    ? vmap[p.id].map(v => ({ ...p, _v: v, images: [...(v.images || []), ...(p.images || [])], price: vPrice(p, v), stock: v.stock }))
    : [p]);
  const attr = (label, val) => {
    const l = String(label || '').toLocaleLowerCase('tr');
    if (!val) return '';
    if (/renk/.test(l)) return `      <g:color>${xml(val)}</g:color>\n`;
    if (/ölçü|olcu|boyut|ebat/.test(l)) return `      <g:size>${xml(val)}</g:size>\n`;
    if (/desen|model/.test(l)) return `      <g:pattern>${xml(val)}</g:pattern>\n`;
    return '';
  };
  const items = flat.filter(p => imgOf(p)).map(p => {
    const imgs = gImgsOf(p), c = CATS.find(x => x.f === p.category);
    const soldOut = p.stock != null && p.stock <= 0;
    const v = p._v;
    return `    <item>
      <g:id>${Number(p.id)}${v ? '-' + Number(v.id) : ''}</g:id>
${v ? `      <g:item_group_id>${Number(p.id)}</g:item_group_id>\n` + attr(p.option_label, v.name) + attr(p.option2_label, v.opt2) : ''}      <g:title>${xml(p.name + (v ? ' – ' + vLabel(v) : ''))}</g:title>
      <g:description>${xml((p.description || '').trim() || metaDesc(p))}</g:description>
      <g:link>${xml(SITE + productPath(p) + (v ? '?v=' + Number(v.id) : ''))}</g:link>
      <g:image_link>${xml(imgs[0])}</g:image_link>
${imgs.slice(1, 10).map(u => `      <g:additional_image_link>${xml(u)}</g:additional_image_link>`).join('\n')}
      <g:availability>${soldOut ? 'out_of_stock' : 'in_stock'}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} TRY</g:price>
      <g:brand>Gamika</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${xml(c ? c.t : p.type_label)}</g:product_type>
      <g:shipping><g:country>TR</g:country><g:price>0.00 TRY</g:price></g:shipping>
    </item>`;
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n'
    + '    <title>Gamika</title>\n    <link>' + SITE + '</link>\n    <description>Gamika ürünleri</description>\n'
    + items.join('\n') + '\n  </channel>\n</rss>\n';
}

async function db(query) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/products?' + query, {
    headers: { apikey: SUPABASE_KEY },
    cf: { cacheTtl: 60, cacheEverything: true }
  });
  if (!res.ok) throw new Error('Supabase ' + res.status);
  return res.json();
}

function metaDesc(p) {
  const d = (p.description || '').trim().replace(/\s+/g, ' ');
  return d ? d.slice(0, 155) : `${p.name} (${p.type_label}) Gamika'da ${TL(p.price)}. Kadın oyuncular için pastel gamer ekipmanları.`;
}

function cardHTML(p) {
  const img = imgOf(p);
  return `<a href="${productPath(p)}" class="product-card pcard glass shadow-sm flex flex-col">
    <div class="pimg rounded-2xl aspect-square imgbg overflow-hidden">${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" class="w-full h-full object-contain">` : ''}</div>
    <span class="ptype text-berry">${esc(p.type_label)}</span>
    <h3 class="font-serif font-bold">${esc(p.name)}</h3>
    <div class="pfoot border-t border-rose/60"><p class="pprice font-serif font-bold">${TL(p.price)}</p></div></a>`;
}

async function buildPage(path) {
  const m = /^\/urun\/(\d+)/.exec(path);
  if (m) {
    const rows = await db('select=id,name,category,type_label,price,stock,image_url,images,google_image,series,description,option_label,option2_label&is_active=eq.true&id=eq.' + Number(m[1]));
    const p = rows[0];
    const vars = p ? ((await variantsBy([p.id]))[p.id] || []) : [];
    if (!p) return { status: 404, title: 'Ürün bulunamadı | Gamika', desc: 'Bu ürün satıştan kalkmış olabilir.', url: SITE + '/urunler', img: DEFAULT_IMG, noindex: true, body: '<h1 class="font-serif" style="font-size:26px;font-weight:700">Ürün bulunamadı</h1><p><a href="/urunler">Tüm ürünlere göz at</a></p>' };
    const canonical = productPath(p);
    if (path !== canonical) return { redirect: canonical }; // eski / yanlış isimli linkleri doğru adrese yönlendir
    const c = CATS.find(x => x.f === p.category), url = SITE + canonical, img = imgOf(p) || DEFAULT_IMG;
    const soldOut = p.stock != null && p.stock <= 0;
    const ld = {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: metaDesc(p), image: gImgsOf(p).length ? gImgsOf(p) : [img], url,
      brand: { '@type': 'Brand', name: 'Gamika' }, category: c ? c.t : p.type_label,
      offers: vars.length
        ? vars.map(v => ({ '@type': 'Offer', name: vLabel(v), sku: p.id + '-' + v.id, price: vPrice(p, v).toFixed(2), priceCurrency: 'TRY', url: url + '?v=' + v.id,
            availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition', ...OFFER_EXTRA }))
        : { '@type': 'Offer', price: Number(p.price).toFixed(2), priceCurrency: 'TRY', url,
        availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition', ...OFFER_EXTRA }
    };
    // Gerçek müşteri yorumları varsa Google'a puan bilgisi verilir
    const revs = await fetch(SUPABASE_URL + '/rest/v1/reviews?select=name,rating,comment,created_at&order=created_at.desc&limit=50&product_id=eq.' + Number(p.id), {
      headers: { apikey: SUPABASE_KEY }, cf: { cacheTtl: 300, cacheEverything: true } }).then(r => r.ok ? r.json() : []).catch(() => []);
    if (Array.isArray(revs) && revs.length) {
      ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: (revs.reduce((a, r) => a + Number(r.rating), 0) / revs.length).toFixed(1), reviewCount: revs.length, bestRating: 5, worstRating: 1 };
      ld.review = revs.slice(0, 10).map(r => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: String(r.created_at).slice(0, 10),
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }, ...(r.comment ? { reviewBody: r.comment } : {}) }));
    }
    const prices = (vars.some(v => v.stock > 0) ? vars.filter(v => v.stock > 0) : vars).map(v => vPrice(p, v));
    const priceText = vars.length && Math.min(...prices) !== Math.max(...prices) ? TL(Math.min(...prices)) + "'den başlayan" : TL(vars.length ? Math.min(...prices) : p.price);
    const others = await db('select=id,name,category&is_active=eq.true&id=neq.' + Number(p.id) + '&order=id.asc&limit=40');
    const similar = [...others.filter(x => x.category === p.category), ...others.filter(x => x.category !== p.category)].slice(0, 4);
    const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Ürünler', item: SITE + '/urunler' },
      ...(c ? [{ '@type': 'ListItem', position: 3, name: c.t, item: SITE + listPath(c) }] : []),
      { '@type': 'ListItem', position: c ? 4 : 3, name: p.name, item: url }
    ] };
    return {
      status: 200, title: p.name + ' | Gamika', desc: metaDesc(p), url, img, ogType: 'product', price: p.price, ld: [ld, crumbs],
      body: `<p class="text-xs text-mauve"><a href="/">Ana Sayfa</a> › <a href="/urunler">Ürünler</a>${c ? ` › <a href="${listPath(c)}">${esc(c.t)}</a>` : ''} › ${esc(p.name)}</p>
        <div style="display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:18px">
          <div><div class="rounded-3xl imgbg overflow-hidden" style="aspect-ratio:1/1">${imgOf(p) ? `<div class="fitbox"><img src="${esc(imgOf(p))}" alt="" aria-hidden="true" class="fit-bg"><img src="${esc(imgOf(p))}" alt="${esc(p.name)}" class="fit-fg"></div>` : ''}</div>
            ${imgsOf(p).length > 1 ? `<div class="pv-thumbs">${imgsOf(p).map(u => `<span class="pv-th"><img src="${esc(u)}" alt="${esc(p.name)}" loading="lazy"></span>`).join('')}</div>` : ''}</div>
          <div><span class="text-xs text-berry font-semibold">${esc(p.type_label)}</span>
            <h1 class="font-serif" style="font-size:32px;font-weight:700;margin:6px 0 14px">${esc(p.name)}</h1>
            <p class="font-serif" style="font-size:28px;font-weight:700">${priceText}</p>
            <p class="text-xs">${(vars.length ? vars.every(v => v.stock <= 0) : soldOut) ? 'Tükendi' : 'Stokta var'}</p>
            ${vars.length ? `<p class="text-xs">${esc(p.option_label || 'Seçenekler')}${p.option2_label ? ' / ' + esc(p.option2_label) : ''}: ${vars.map(v => esc(vLabel(v))).join(', ')}</p>` : ''}
            ${p.description ? `<p style="font-size:14px;line-height:1.7;margin-top:18px;white-space:pre-line">${esc(p.description)}</p>` : ''}
          </div></div>
        ${similar.length ? `<h2 class="font-serif" style="font-size:24px;font-weight:700;margin:48px 0 12px">Bunlar da hoşuna gidebilir</h2><ul>${similar.map(x => `<li><a href="${productPath(x)}">${esc(x.name)}</a></li>`).join('')}</ul>` : ''}`
    };
  }

  const k = /^\/kategori\/([a-z0-9-]+)$/.exec(path), sm = /^\/seri\/([a-z0-9-]+)$/.exec(path);
  if (path === '/urunler' || k || sm) {
    const c = k ? CATS.find(x => x.slug === k[1]) : null, se = sm ? SERIES.find(x => x.k === sm[1]) : null;
    if ((k && !c) || (sm && !se)) return { redirect: '/urunler' };
    const rows0 = await db('select=id,name,category,type_label,price,stock,image_url,images,google_image,series&is_active=eq.true&order=id.asc' + (c ? '&category=eq.' + encodeURIComponent(c.f) : '') + (se ? '&series=eq.' + se.k : ''));
    const vmap = await variantsBy(rows0.map(p => p.id));
    // Seçenekli ürünlerde kartta en düşük fiyat gösterilir
    const pick = vs => (vs.some(v => v.stock > 0) ? vs.filter(v => v.stock > 0) : vs);
    const rows = rows0.map(p => (vmap[p.id] || []).length ? { ...p, price: Math.min(...pick(vmap[p.id]).map(v => vPrice(p, v))) } : p);
    const title = se ? se.h : c ? c.h : 'Tüm Ürünler';
    const url = se ? SITE + '/seri/' + se.k : SITE + listPath(c);
    const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: title,
      itemListElement: rows.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + productPath(p), name: p.name })) };
    return {
      status: 200, noindex: !rows.length, title: title + ' | Gamika', desc: se ? se.d : c ? c.d : 'Gamika tüm ürünler: kadın oyunculara özel gaming mousepad modelleri; Dark, Minimal ve Candy serileri, ücretsiz kargo.',
      url, img: (rows.find(imgOf) && imgOf(rows.find(imgOf))) || DEFAULT_IMG, ld: [ld],
      body: `<p class="text-xs text-mauve"><a href="/">Ana Sayfa</a> › ${se ? `<a href="/urunler">Ürünler</a> › <a href="/kategori/mousepad">Mousepad</a> › ${esc(se.t)} Serisi` : c ? `<a href="/urunler">Ürünler</a> › ${esc(c.t)}` : 'Ürünler'}</p>
        <h1 class="font-serif" style="font-size:34px;font-weight:700;margin:8px 0 4px">${esc(title)}</h1>
        <p class="text-xs text-mauve" style="margin-bottom:28px">${rows.length} ürün</p>
        <div class="pgrid">${rows.map(cardHTML).join('')}</div>`
    };
  }
  return null;
}

class SetAttr {
  constructor(name, value) { this.name = name; this.value = value; }
  element(el) { el.setAttribute(this.name, this.value); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/sitemap.xml' || path === '/merchant-feed.xml') {
      try {
        const body = path === '/sitemap.xml' ? await sitemap() : await merchantFeed();
        return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
      } catch (err) {
        console.log('XML hazırlanamadı:', err && err.message);
        return env.ASSETS.fetch(request); // yedek: depodaki sabit sitemap.xml
      }
    }
    let page = null;
    try { page = await buildPage(decodeURIComponent(path)); }
    catch (err) { console.log('Sayfa hazırlanamadı:', err && err.message); }

    if (page && page.redirect) return Response.redirect(SITE + page.redirect + url.search, 301);

    // Sitenin kendisini (index.html) al
    const shell = await env.ASSETS.fetch(new Request(url.origin + '/'));
    if (!page) return shell; // Supabase'e ulaşılamazsa sayfa yine açılır, içerik tarayıcıda yüklenir

    const ldHtml = (page.ld || []).map(o => `<script type="application/ld+json" data-ssr="1">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
    const extraHead = ldHtml
      + (page.noindex ? '<meta name="robots" content="noindex">' : '')
      + (page.price != null ? `<meta property="product:price:amount" content="${Number(page.price).toFixed(2)}"><meta property="product:price:currency" content="TRY">` : '');

    const out = new HTMLRewriter()
      .on('html', { element(el) { el.setAttribute('class', ((el.getAttribute('class') || '') + ' page-mode').trim()); } })
      .on('title', { element(el) { el.setInnerContent(page.title); } })
      .on('meta[name="description"]', new SetAttr('content', page.desc))
      .on('link[rel="canonical"]', new SetAttr('href', page.url))
      .on('meta[property="og:type"]', new SetAttr('content', page.ogType || 'website'))
      .on('meta[property="og:title"]', new SetAttr('content', page.title))
      .on('meta[property="og:description"]', new SetAttr('content', page.desc))
      .on('meta[property="og:url"]', new SetAttr('content', page.url))
      .on('meta[property="og:image"]', new SetAttr('content', page.img))
      .on('meta[name="twitter:card"]', new SetAttr('content', page.img !== DEFAULT_IMG ? 'summary_large_image' : 'summary'))
      .on('head', { element(el) { el.append(extraHead, { html: true }); } })
      .on('main#product-view', { element(el) { el.removeAttribute('class'); } })
      .on('div#pv-body', { element(el) { el.setInnerContent(page.body, { html: true }); } })
      .transform(shell);

    const headers = new Headers(out.headers);
    headers.set('Cache-Control', 'public, max-age=60');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    headers.delete('ETag');
    return new Response(out.body, { status: page.status, headers });
  }
};
