// Service worker do Partitura: deixa o app abrir sem internet (igreja, ensaio, lugar sem sinal).
//
// Estratégia:
// - Página (index.html): "rede primeiro". Com internet, sempre pega a versão nova; sem internet
//   (ou se a rede demorar mais de 4 s), usa a cópia guardada. Por isso não é preciso mudar o
//   CACHE a cada atualização do index.html.
// - Fontes, ícone e manifest: "cache primeiro" (quase nunca mudam).
//
// ATENÇÃO: o Repertório Palco está no MESMO origin (duhhdragon-arch.github.io) e o CacheStorage é
// por origin, não por pasta. Por isso cada app só apaga caches com o PRÓPRIO prefixo.
// Mudar CACHE quando a lista ARQUIVOS mudar (arquivo novo ou removido) e SEMPRE que algo em bp/ mudar:
// o leitor de notas (bp/) é guardado na primeira vez que a Melodia abre e depois vem só do cache
// ("cache primeiro", ignorando ?v=), então sem trocar CACHE o aparelho continua com a versão velha.
const PREFIXO = 'partitura-';
const CACHE = PREFIXO + 'v3';
const ARQUIVOS = [
  './', './manifest.json', './icon.svg', './fonts.css',
  './fonts/archivo-latin.woff2', './fonts/archivo-latin-ext.woff2',
  './fonts/inter-latin.woff2', './fonts/inter-latin-ext.woff2',
  './fonts/noto-music-music.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k.startsWith(PREFIXO) && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

const comPrazo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), ms))]);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Só cuida do que é deste app: GET, mesmo origin e dentro da pasta dele
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  const pagina = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);

  if (pagina) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const rede = fetch(req).then((r) => { if (r.ok) c.put('./', r.clone()); return r; });
      try { return await comPrazo(rede, 4000); } catch {
        return (await c.match('./')) || rede; // sem cópia guardada: espera a rede mesmo
      }
    })());
    return;
  }

  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  }));
});
