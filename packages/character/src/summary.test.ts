import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { emptySheet } from './sheet.js'
import { CharacterSummary, toSummary } from './summary.js'

describe('toSummary', () => {
  test('picks the fields shown in the character list', () => {
    expect(
      toSummary({
        ...emptySheet,
        characterName: 'ルル',
        playerName: 'たろう',
        level: 6,
        classes: ['ミンストレル', 'ヒーラー'],
        types: ['テクニックタイプ', 'マジックタイプ'],
        memo: '一覧には出ない',
      }),
    ).toEqual({
      characterName: 'ルル',
      playerName: 'たろう',
      level: 6,
      classes: ['ミンストレル', 'ヒーラー'],
      types: ['テクニックタイプ', 'マジックタイプ'],
    })
  })

  test('produces a valid CharacterSummary', () => {
    expect(Schema.is(CharacterSummary)(toSummary(emptySheet))).toBe(true)
  })
})
