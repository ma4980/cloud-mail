export function isRemoteUrl(value, pageOrigin = window.location.origin) {
  if (!value) return false
  try {
    const url = new URL(value, pageOrigin)
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== pageOrigin
  } catch {
    return false
  }
}
