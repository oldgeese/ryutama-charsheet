import { describe, expect, test } from 'vitest'

import { ping } from './ping.js'

describe('ping', () => {
  test('returns pong with the given time as ISO 8601', () => {
    expect(ping(new Date('2026-10-20T12:34:56.000Z'))).toEqual({
      message: 'pong',
      at: '2026-10-20T12:34:56.000Z',
    })
  })
})
