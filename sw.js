const CACHE_STATIC = 'vtm-static-v1';
const CACHE_DYNAMIC = 'vtm-dynamic-v1';

// Recursos que hacen que la app cargue (la "carcasa")
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;800;900&display=swap',
    'https://raw.githubusercontent.com/ChronosBVRX/directorio-fraccionamiento/main/images/Logo.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => cache.addAll(APP_SHELL))
    );
});

self.addEventListener('activate', event => {
    // Limpia cachés viejos si actualizamos la versión (v1 -> v2)
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Peticiones a Supabase (API) -> Prioridad: Red, Respaldo: Caché
    if (url.origin === 'https://vlnpefgqodnxcqeztcnh.supabase.co') {
        event.respondWith(
            fetch(event.request).then(networkRes => {
                return caches.open(CACHE_DYNAMIC).then(cache => {
                    // Clonamos la respuesta para guardarla y devolverla
                    cache.put(event.request, networkRes.clone());
                    return networkRes;
                });
            }).catch(() => {
                // Si falla el internet, devolvemos lo último que guardó
                return caches.match(event.request);
            })
        );
    } 
    // 2. Archivos estáticos e imágenes -> Prioridad: Caché, Respaldo: Red
    else if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(cachedRes => {
                return cachedRes || fetch(event.request).then(networkRes => {
                    return caches.open(CACHE_DYNAMIC).then(cache => {
                        cache.put(event.request, networkRes.clone());
                        return networkRes;
                    });
                });
            })
        );
    }
});
