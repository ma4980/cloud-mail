const NOTIFICATION_SETTING_KEY = 'cloud-mail-notifications'

export function notificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationEnabled() {
  return notificationSupported()
    && Notification.permission === 'granted'
    && localStorage.getItem(NOTIFICATION_SETTING_KEY) === 'enabled'
}

export async function requestNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    localStorage.setItem(NOTIFICATION_SETTING_KEY, 'enabled')
  } else {
    localStorage.removeItem(NOTIFICATION_SETTING_KEY)
  }
  return permission
}

export function disableNotifications() {
  localStorage.removeItem(NOTIFICATION_SETTING_KEY)
}

export async function showMailNotification(email, title, noSubject) {
  if (!notificationEnabled()) return

  try {
    const sender = email.name || email.sendEmail || ''
    const subject = email.subject || noSubject
    const registration = await navigator.serviceWorker.ready
    const message = {
      type: 'SHOW_MAIL_NOTIFICATION',
      title,
      options: {
        body: sender ? `${sender}\n${subject}` : subject,
        icon: '/mail-pwa.png',
        badge: '/mail.png',
        tag: `cloud-mail-${email.emailId}`,
        renotify: true,
        data: {url: '/inbox'}
      }
    }

    if (registration.active) {
      registration.active.postMessage(message)
    } else {
      await registration.showNotification(title, message.options)
    }
  } catch (error) {
    // Notification failures must never interrupt inbox refresh.
    console.warn('Unable to show mail notification', error)
  }
}
