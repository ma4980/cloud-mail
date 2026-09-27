import {pushConfig, pushSubscribe, pushUnsubscribe} from '@/request/setting.js'

const NOTIFICATION_SETTING_KEY = 'cloud-mail-notifications'
const BACKGROUND_PUSH_KEY = 'cloud-mail-background-push'

export function notificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationEnabled() {
  return notificationSupported()
    && Notification.permission === 'granted'
    && localStorage.getItem(NOTIFICATION_SETTING_KEY) === 'enabled'
}

export function backgroundPushEnabled() {
  return notificationEnabled() && localStorage.getItem(BACKGROUND_PUSH_KEY) === 'enabled'
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}

function sameApplicationServerKey(currentKey, expectedKey) {
  if (!currentKey) return false
  const current = new Uint8Array(currentKey)
  return current.length === expectedKey.length
    && current.every((value, index) => value === expectedKey[index])
}

async function enableBackgroundPush() {
  const config = await pushConfig()
  if (!config?.enabled || !config.publicKey) {
    localStorage.removeItem(BACKGROUND_PUSH_KEY)
    return false
  }
  const registration = await navigator.serviceWorker.ready
  const applicationServerKey = urlBase64ToUint8Array(config.publicKey)
  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameApplicationServerKey(subscription.options?.applicationServerKey, applicationServerKey)) {
    await pushUnsubscribe(subscription.endpoint).catch(() => null)
    await subscription.unsubscribe()
    subscription = null
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })
  }
  await pushSubscribe(subscription.toJSON())
  localStorage.setItem(BACKGROUND_PUSH_KEY, 'enabled')
  return true
}

export async function syncBackgroundPush() {
  if (!notificationEnabled()) return false
  try {
    return await enableBackgroundPush()
  } catch (error) {
    localStorage.removeItem(BACKGROUND_PUSH_KEY)
    console.warn('Unable to synchronize background push', error)
    return false
  }
}

export async function requestNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    localStorage.setItem(NOTIFICATION_SETTING_KEY, 'enabled')
    try {
      await enableBackgroundPush()
    } catch (error) {
      // Keep foreground notifications available when VAPID is not configured yet.
      console.warn('Unable to enable background push', error)
    }
  } else {
    localStorage.removeItem(NOTIFICATION_SETTING_KEY)
  }
  return permission
}

export async function disableNotifications() {
  localStorage.removeItem(NOTIFICATION_SETTING_KEY)
  localStorage.removeItem(BACKGROUND_PUSH_KEY)
  if (!notificationSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await pushUnsubscribe(subscription.endpoint)
    await subscription.unsubscribe()
  } catch (error) {
    console.warn('Unable to disable background push', error)
  }
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
