import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { CreateCharacterRequest } from './api.js'
import { emptySheet } from './sheet.js'

describe('CreateCharacterRequest', () => {
  const isRequest = Schema.is(CreateCharacterRequest)

  test('accepts a sheet with a password', () => {
    expect(isRequest({ sheet: emptySheet, password: 'secret' })).toBe(true)
  })

  test('rejects an empty password', () => {
    expect(isRequest({ sheet: emptySheet, password: '' })).toBe(false)
  })
})
