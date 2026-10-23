import { Result } from 'effect'
import { describe, expect, test } from 'vitest'

import { type CharacterSheet, emptySheet } from '@ryutama/character'

import { emptyDraft, fromSheet, toSheet } from './draft'

const lulu: CharacterSheet = { ...emptySheet, characterName: 'ルル', exp: 120 }

describe('draft', () => {
  test('round-trips a sheet', () => {
    expect(fromSheet(lulu).exp).toBe('120')
    expect(toSheet(fromSheet(lulu))).toEqual(Result.succeed(lulu))
  })

  test('starts from an empty sheet', () => {
    expect(toSheet(emptyDraft)).toEqual(Result.succeed(emptySheet))
  })

  test('accepts EXP with surrounding spaces and full-width digits', () => {
    expect(toSheet({ ...emptyDraft, exp: ' １２ ' })).toEqual(
      Result.succeed({ ...emptySheet, exp: 12 }),
    )
  })

  test('rejects EXP that is not a non-negative integer', () => {
    for (const exp of ['', 'abc', '-1', '1.5', '1e2']) {
      expect(toSheet({ ...emptyDraft, exp })).toEqual(
        Result.fail('EXP は 0 以上の整数で入力してください'),
      )
    }
  })
})
