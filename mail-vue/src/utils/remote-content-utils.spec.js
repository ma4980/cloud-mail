import {describe, expect, it} from 'vitest'
import {isRemoteUrl} from './remote-content-utils.js'

describe('remote email resources', () => {
  const origin = 'https://mail.example.com'

  it('blocks cross-origin HTTP resources', () => {
    expect(isRemoteUrl('https://tracker.example.net/open.gif', origin)).toBe(true)
  })

  it('allows same-origin attachments and data images', () => {
    expect(isRemoteUrl('/api/oss/image.png', origin)).toBe(false)
    expect(isRemoteUrl('data:image/png;base64,AAAA', origin)).toBe(false)
  })
})
