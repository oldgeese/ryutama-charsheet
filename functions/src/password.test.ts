import { describe, expect, test } from 'vitest'

import { hashPassword, verifyPassword } from './password.js'

describe('password', () => {
  test('verifies the password it was hashed from', async () => {
    const secret = await hashPassword('ひみつ')
    expect(await verifyPassword('ひみつ', secret)).toBe(true)
  })

  test('rejects a different password', async () => {
    const secret = await hashPassword('ひみつ')
    expect(await verifyPassword('ひみつ2', secret)).toBe(false)
    expect(await verifyPassword('', secret)).toBe(false)
  })

  test('uses a different salt every time', async () => {
    const a = await hashPassword('ひみつ')
    const b = await hashPassword('ひみつ')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  test('does not store the password itself', async () => {
    const secret = await hashPassword('ひみつ')
    expect(JSON.stringify(secret)).not.toContain('ひみつ')
  })
})
