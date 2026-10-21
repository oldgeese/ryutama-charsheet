import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { CharacterSheet, emptySheet } from './sheet.js'

const isSheet = Schema.is(CharacterSheet)

describe('CharacterSheet', () => {
  test('accepts the empty sheet', () => {
    expect(isSheet(emptySheet)).toBe(true)
  })

  test('accepts up to two classes and two types', () => {
    expect(
      isSheet({
        ...emptySheet,
        classes: ['ミンストレル', 'ヒーラー'],
        types: ['アタックタイプ', 'マジックタイプ'],
      }),
    ).toBe(true)
  })

  test('rejects more than two classes', () => {
    expect(
      isSheet({
        ...emptySheet,
        classes: ['ミンストレル', 'ヒーラー', 'ノーブル'],
      }),
    ).toBe(false)
  })

  test('rejects the same class twice', () => {
    expect(isSheet({ ...emptySheet, classes: ['ハンター', 'ハンター'] })).toBe(
      false,
    )
  })

  test('rejects a class that is not in the rulebook', () => {
    expect(isSheet({ ...emptySheet, classes: ['ウォーリア'] })).toBe(false)
  })

  test('accepts levels from 1 to 10 only', () => {
    expect(isSheet({ ...emptySheet, level: 1 })).toBe(true)
    expect(isSheet({ ...emptySheet, level: 10 })).toBe(true)
    expect(isSheet({ ...emptySheet, level: 0 })).toBe(false)
    expect(isSheet({ ...emptySheet, level: 11 })).toBe(false)
    expect(isSheet({ ...emptySheet, level: 1.5 })).toBe(false)
  })

  test('rejects negative EXP', () => {
    expect(isSheet({ ...emptySheet, exp: -1 })).toBe(false)
  })

  test('accepts only 4, 6, 8, 10 and 12 as ability values', () => {
    const withStrength = (strength: unknown) => ({
      ...emptySheet,
      abilities: { ...emptySheet.abilities, strength },
    })
    expect(isSheet(withStrength(12))).toBe(true)
    expect(isSheet(withStrength(7))).toBe(false)
    expect(isSheet(withStrength(20))).toBe(false)
  })

  test('requires every terrain and weather key', () => {
    const { 草原: _, ...terrainBonuses } = emptySheet.terrainBonuses
    expect(isSheet({ ...emptySheet, terrainBonuses })).toBe(false)
  })

  test('survives a JSON round trip', () => {
    const decode = Schema.decodeUnknownSync(CharacterSheet)
    expect(decode(JSON.parse(JSON.stringify(emptySheet)))).toEqual(emptySheet)
  })
})
