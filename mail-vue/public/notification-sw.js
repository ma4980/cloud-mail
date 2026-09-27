self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_MAIL_NOTIFICATION') return

  const {title, options} = event.data
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('push', (event) => {
  let payload = {
    title: '您有一封新郵件',
    body: '點選以開啟收件匣',
    url: '/inbox',
    tag: 'cloud-mail-new-message'
  }
  try {
    if (event.data) payload = {...payload, ...event.data.json()}
  } catch {
    // Use the privacy-preserving generic notification when parsing fails.
  }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/mail-pwa.png',
    badge: '/mail.png',
    tag: payload.tag,
    renotify: true,
    data: {url: payload.url || '/inbox'}
  }))
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
