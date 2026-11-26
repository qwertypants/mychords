// The waiting worker decides whether activation would affect another window.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'MYCHORDS_ACTIVATE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const scope = self.registration.scope;
    const others = windows.filter((client) => client.url.startsWith(scope) && client.id !== event.source?.id);
    if (others.length) {
      event.ports[0].postMessage('other-windows');
      return;
    }
    try {
      await self.skipWaiting();
      event.ports[0].postMessage('activating');
    } catch {
      event.ports[0].postMessage('failed');
    }
  })());
});
