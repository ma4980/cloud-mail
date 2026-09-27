self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_MAIL_NOTIFICATION') return

  const {title, options} = event.data
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/inbox', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async (clients) => {
      for (const client of clients) {
        if ('navigate' in client) await client.navigate(targetUrl)
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined
    })
  )
})
