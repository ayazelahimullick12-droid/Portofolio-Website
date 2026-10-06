/* Portfolio demo: answers Kinba's API calls in the browser, using the data from
   backend/seed.js, so the real React client runs on GitHub Pages without MongoDB.
   Mirrors the Express routes: /categories/tree, /products(?categoryId), /products/trending. */
(function () {
  var API = 'http://localhost:5000/api';
  var cats = [
    { _id: 'c1', name: 'Electronics', parent: null },
    { _id: 'c2', name: 'Phones', parent: 'c1' },
    { _id: 'c3', name: 'Laptops', parent: 'c1' },
    { _id: 'c4', name: 'Accessories', parent: 'c1' }
  ];
  var products = [
    { _id: 'p1', name: 'Nothing Phone 3', description: 'A simple smartphone for calls, texts and light apps.', price: 649.99, category: 'c2',
      image: 'https://cdn.sanity.io/images/gtd4w1cq/production/4ef2af4fc4259cb398efe107002fca5355159f73-4096x2305.jpg?auto=format', salesCount: 50 },
    { _id: 'p2', name: 'Nothing Phone 2', description: 'A simple smartphone for calls, texts and light apps.', price: 649.99, category: 'c2',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaKRgY4VUMQ5l543ib3UHI-YHvkq_kcvWNSQ&s', salesCount: 45 },
    { _id: 'p3', name: 'HP Work Laptop', description: 'Lightweight laptop for study and office work.', price: 599.99, category: 'c3',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwfO1PaUILEwirYsl1wJK2l89Tfz0fSyDlfg&s', salesCount: 120 },
    { _id: 'p4', name: 'Asus ROG Laptop', description: 'Lightweight laptop for study and office work.', price: 599.99, category: 'c3',
      image: 'https://computermania.com.bd/wp-content/uploads/2025/01/Asus-ROG-Strix-6-7.jpg', salesCount: 120 },
    { _id: 'p5', name: 'UGREEN USB-C Cable', description: 'Fast charging cable.', price: 9.99, category: 'c4',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhCeqBp9rI29fQkM_MROiTJVirlCUNbhF0AQ&s', salesCount: 80 }
  ];
  function byId(id) { return cats.filter(function (c) { return c._id === id; })[0] || null; }
  function populate(p) { var o = Object.assign({}, p); o.category = byId(p.category); return o; }
  function tree() {
    var map = {}, roots = [];
    cats.forEach(function (c) { map[c._id] = Object.assign({}, c, { children: [] }); });
    cats.forEach(function (c) { (c.parent ? map[c.parent].children : roots).push(map[c._id]); });
    return roots;
  }
  function route(url) {
    var u = new URL(url);
    var path = u.pathname.replace(/^\/api/, '');
    if (path === '/categories/tree') return tree();
    if (path === '/products/trending') {
      return populate(products.slice().sort(function (a, b) { return b.salesCount - a.salesCount; })[0]);
    }
    if (path === '/products') {
      var id = u.searchParams.get('categoryId');
      // Newest first, like .sort({ createdAt: -1 }) after seeding in order
      return products.filter(function (p) { return !id || p.category === id; }).slice().reverse().map(populate);
    }
    return null;
  }
  // Some seed images are hot-linked from other sites and no longer load;
  // show a labelled placeholder instead of a broken image.
  function placeholder(img) {
    if (img.dataset.ph) return;
    img.dataset.ph = '1';
    var label = (img.alt || 'Product').replace(/[<&>"]/g, '');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2f45"/><stop offset="1" stop-color="#151827"/></linearGradient></defs>' +
      '<rect width="300" height="200" fill="url(#g)"/><text x="150" y="104" fill="#c9cde0" font-family="Arial" font-size="18" text-anchor="middle">' + label + '</text></svg>');
  }
  document.addEventListener('error', function (e) { if (e.target.tagName === 'IMG') placeholder(e.target); }, true);
  document.addEventListener('load', function (e) { if (e.target.tagName === 'IMG' && e.target.naturalWidth < 4) placeholder(e.target); }, true);

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    if (url.indexOf(API) === 0) {
      var body = route(url);
      var res = new Response(JSON.stringify(body), {
        status: body === null ? 404 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
      // A short delay so the client's loading states still show, as with a real server
      return new Promise(function (resolve) { setTimeout(function () { resolve(res); }, 250); });
    }
    return realFetch(input, init);
  };
})();
