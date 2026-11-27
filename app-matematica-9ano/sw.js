// Service worker: cache offline de todos os arquivos estaticos.
// Arquivos de codigo: cache primeiro (atualize VERSAO a cada publicacao).
// Pagina e conteudo (js/data/*.json): rede primeiro com limite de 3 s, depois cache.

const VERSAO = 'mat9-v1.1.2';

const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icone.svg',
  'icons/icone-192.png',
  'icons/icone-512.png',
  'icons/icone-maskable-512.png',
  'vendor/dexie.min.js',
  'css/tokens.css',
  'css/base.css',
  'css/componentes.css',
  'js/app.js',
  'js/router.js',
  'js/util/datas.js',
  'js/util/ids.js',
  'js/db/schema.js',
  'js/db/seed.js',
  'js/db/progress-repo.js',
  'js/motor/session-builder.js',
  'js/motor/session-runner.js',
  'js/motor/adaptive.js',
  'js/motor/gamification.js',
  'js/motor/streak.js',
  'js/motor/cadastro.js',
  'js/motor/resumos.js',
  'js/ui/comum.js',
  'js/ui/onboarding.js',
  'js/ui/home.js',
  'js/ui/trilha.js',
  'js/ui/licao.js',
  'js/ui/pratica.js',
  'js/ui/resultado.js',
  'js/ui/perfil.js',
  'js/export/snapshot.js',
  'js/data/blocos.json',
  'js/data/licoes-lote1.json',
  'js/data/questoes-lote1.json',
  'js/data/licoes-lote2.json',
  'js/data/questoes-lote2.json',
  'js/data/licoes-lote3.json',
  'js/data/questoes-lote3.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ARQUIVOS.map((a) => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

function comLimite(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('tempo esgotado')), ms);
    promessa.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function redePrimeiro(request) {
  const cache = await caches.open(VERSAO);
  try {
    const resposta = await comLimite(fetch(request), 3000);
    if (resposta && resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch (e) {
    const salvo = await cache.match(request, { ignoreSearch: true });
    if (salvo) return salvo;
    if (request.mode === 'navigate') return cache.match('index.html');
    throw e;
  }
}

async function cachePrimeiro(request) {
  const salvo = await caches.match(request, { ignoreSearch: true });
  if (salvo) return salvo;
  const resposta = await fetch(request);
  if (resposta && resposta.ok && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(VERSAO);
    cache.put(request, resposta.clone());
  }
  return resposta;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const ehConteudo = url.pathname.includes('/js/data/') || request.mode === 'navigate';
  event.respondWith(ehConteudo ? redePrimeiro(request) : cachePrimeiro(request));
});
