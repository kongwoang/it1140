const CACHE_NAME = "it1140-static-v26";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/css/app.css?v=19",
  "./assets/js/question-content.js?v=2",
  "./assets/js/quiz-app.js?v=10",
  "./assets/js/python-lab.js?v=14",
  "./assets/js/python-practice.js?v=1",
  "./assets/js/python-worker.js?v=6",
  "./assets/js/python-errors.js?v=1",
  "./assets/js/python-errors.js",
  "./assets/js/python-editor.js?v=1",
  "./data/manifest.json",
  "./data/python-exercises.json",
  "./data/subjects/it1140.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        }),
    ),
  );
});
