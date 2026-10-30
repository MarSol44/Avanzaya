/* Brújula de Vida — service worker
   Su único trabajo: que la app abra sin conexión y que las
   actualizaciones lleguen sin que nadie tenga que vaciar la caché.

   Cuando cambies la app, sube VERSION un número. Eso basta. */

var VERSION = 'brujula-v30';
var SHELL   = VERSION + '-shell';
var FUENTES = VERSION + '-fuentes';

/* lo que se guarda de entrada, para que la primera visita ya sirva sin red */
var PRECACHE = [
  '/',
  '/index.html',
  '/app.css',
  '/js/compartido/util.js',
  '/js/compartido/fechas.js',
  '/js/compartido/eventos.js',
  '/js/dominio/tareas.js',
  '/js/dominio/metas.js',
  '/js/dominio/rutinas.js',
  '/js/dominio/areas.js',
  '/js/dominio/revision.js',
  '/js/dominio/identidad.js',
  '/js/dominio/bienvenida.js',
  '/js/infraestructura/seguridad.js',
  '/js/infraestructura/almacen.js',
  '/js/infraestructura/preferencias.js',
  '/js/infraestructura/nube.js',
  '/js/aplicacion/servicios.js',
  '/js/aplicacion/datos.js',
  '/js/aplicacion/cuentas.js',
  '/js/aplicacion/ajustes.js',
  '/js/aplicacion/objetivos.js',
  '/js/aplicacion/habitos.js',
  '/js/aplicacion/vision.js',
  '/js/aplicacion/progreso.js',
  '/js/aplicacion/chequeo.js',
  '/js/aplicacion/bienvenida.js',
  '/js/presentacion/frases.js',
  '/js/presentacion/iconos.js',
  '/js/presentacion/estado-ui.js',
  '/js/presentacion/formato.js',
  '/js/presentacion/pantalla.js',
  '/js/presentacion/pantallas.js',
  '/js/presentacion/vistas/entrada.js',
  '/js/presentacion/vistas/metas.js',
  '/js/presentacion/vistas/hoy.js',
  '/js/presentacion/vistas/vision.js',
  '/js/presentacion/vistas/perfil.js',
  '/js/presentacion/vistas/hojas.js',
  '/js/presentacion/vistas/bienvenida.js',
  '/js/presentacion/interfaz.js',
  '/js/presentacion/controladores/navegacion.js',
  '/js/presentacion/controladores/hoy.js',
  '/js/presentacion/controladores/metas.js',
  '/js/presentacion/controladores/vision.js',
  '/js/presentacion/controladores/progreso.js',
  '/js/presentacion/controladores/entrada.js',
  '/js/presentacion/controladores/perfil.js',
  '/js/presentacion/controladores/bienvenida.js',
  '/js/presentacion/pwa.js',
  '/js/arranque.js',
  '/js/infraestructura/nube-supabase.js',
  '/vendor/supabase.js',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) { return c.addAll(PRECACHE); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== FUENTES) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* la página pide tomar el control cuando la persona toca «Actualizar» */
self.addEventListener('message', function (e) {
  if (e.data === 'ya') self.skipWaiting();
});

/* ─────────────────────────────────────────── recordatorio diario (push) */
self.addEventListener('push', function (e) {
  var data = { title: 'Brújula de Vida', body: 'Un momento para revisar tu día.' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (err) { }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'brujula-recordatorio',
      renotify: true,
      data: { url: data.url || '/?ir=hoy&fuente=push' }
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

function esFuente(url) {
  return url.origin === 'https://fonts.googleapis.com' ||
         url.origin === 'https://fonts.gstatic.com';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* navegación: primero la red (así la actualización llega),
     y si no hay, la copia guardada */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(SHELL).then(function (c) { c.put('/index.html', copia); });
        return r;
      }).catch(function () {
        return caches.match('/index.html').then(function (r) {
          return r || caches.match('/');
        });
      })
    );
    return;
  }

  /* fuentes de Google: se sirve la copia y se refresca por detrás */
  if (esFuente(url)) {
    e.respondWith(
      caches.open(FUENTES).then(function (c) {
        return c.match(req).then(function (hit) {
          var red = fetch(req).then(function (r) {
            if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
            return r;
          }).catch(function () { return hit; });
          return hit || red;
        });
      })
    );
    return;
  }

  /* archivos propios: copia primero, y si no está, red */
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (r) {
          if (r && r.ok && r.type === 'basic') {
            var copia = r.clone();
            caches.open(SHELL).then(function (c) { c.put(req, copia); });
          }
          return r;
        });
      })
    );
  }
});
