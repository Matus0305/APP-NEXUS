// Este es el Service Worker básico que Chrome exige para mostrar el botón de "Instalar"
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Por ahora lo dejamos pasar todo, solo lo necesitamos para que el móvil reconozca la App
});